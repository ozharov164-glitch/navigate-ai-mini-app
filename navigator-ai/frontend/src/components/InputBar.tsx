/**
 * Главное поле ввода: фото слева, текст по центру, микрофон и «Разобрать» справа.
 * Голосовая запись встроена (без отдельного FAB по центру экрана).
 */
import { ImagePlus, Loader2, Mic, Send, Square } from "lucide-react";
import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { useToast } from "@/components/Toast";
import { hapticLight } from "@/lib/telegram";
import { cn } from "@/lib/utils";

interface Props {
  onDone: () => void;
  isPremium: boolean;
  busy?: boolean;
  onBusy?: (v: boolean) => void;
}

function pickMimeType(): string {
  const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
  for (const t of types) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) return t;
  }
  return "";
}

export function InputBar({ onDone, isPremium, busy, onBusy }: Props) {
  const { showToast } = useToast();
  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);
  const [recording, setRecording] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const wrapBusy = async (fn: () => Promise<void>) => {
    onBusy?.(true);
    try {
      await fn();
    } finally {
      onBusy?.(false);
    }
  };

  const submitText = async () => {
    const trimmed = text.trim();
    if (!trimmed || busy || recording) return;
    hapticLight();
    await wrapBusy(async () => {
      const result = await api.analyze(trimmed);
      showToast(result.summary?.slice(0, 120) || "Готово", "success");
      setText("");
      await onDone();
    });
  };

  const onPhoto = async (file: File) => {
    if (!isPremium) {
      showToast("Фото — в Premium. Отправьте чек боту @NavigAI_bot", "info");
      return;
    }
    await wrapBusy(async () => {
      const result = await api.analyzePhoto(file, text.trim() || undefined);
      showToast(result.summary?.slice(0, 120) || "Готово", "success");
      setText("");
      await onDone();
    });
  };

  const stopRecording = () => {
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
    recorderRef.current = null;
  };

  const toggleVoice = async () => {
    hapticLight();
    if (recording) {
      stopRecording();
      return;
    }
    if (!isPremium) {
      showToast("Голос — в Premium", "info");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      showToast("Голосовое — отправьте боту @NavigAI_bot", "info");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = pickMimeType();
      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stopStream();
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const ext = blob.type.includes("mp4") ? "m4a" : "webm";
        setVoiceStatus("Анализирую…");
        await wrapBusy(async () => {
          const result = await api.analyzeVoice(blob, `voice.${ext}`);
          showToast(result.summary?.slice(0, 100) || "Готово", "success");
          setText("");
          await onDone();
        });
        setRecording(false);
        setVoiceStatus(null);
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setVoiceStatus("Говорите…");
    } catch {
      stopStream();
      showToast("Нет доступа к микрофону", "error");
    }
  };

  return (
    <motion.div
      className="space-y-2"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {voiceStatus && (
        <p className="text-center text-xs font-medium text-mint animate-fade-in">{voiceStatus}</p>
      )}

      <div
        className={cn("input-bar", focused && "input-bar-focused", recording && "input-bar-recording")}
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onPhoto(f);
            e.target.value = "";
          }}
        />

        {/* Фото */}
        <button
          type="button"
          className="input-bar-icon"
          onClick={() => fileRef.current?.click()}
          disabled={busy || recording}
          aria-label="Загрузить фото"
        >
          <ImagePlus className="h-5 w-5" strokeWidth={1.75} />
        </button>

        {/* Текст */}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Задача, расход, напоминание..."
          rows={2}
          disabled={recording}
          className="input-bar-text"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submitText();
            }
          }}
        />

        {/* Микрофон */}
        <button
          type="button"
          className={cn("input-bar-icon", recording && "input-bar-icon-recording")}
          onClick={toggleVoice}
          disabled={busy && !recording}
          aria-label={recording ? "Остановить запись" : "Голосовой ввод"}
        >
          {recording ? (
            <Square className="h-4 w-4 fill-current" />
          ) : (
            <Mic className="h-5 w-5" strokeWidth={1.75} />
          )}
        </button>

        {/* Отправить */}
        <button
          type="button"
          className="input-bar-submit"
          disabled={busy || recording || !text.trim()}
          onClick={submitText}
          aria-label="Разобрать"
        >
          {busy && !recording ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" strokeWidth={2} />
          )}
        </button>
      </div>

      <p className="text-center text-[10px] text-muted">
        Enter — отправить · Shift+Enter — новая строка
      </p>
    </motion.div>
  );
}
