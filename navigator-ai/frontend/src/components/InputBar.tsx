/**
 * Поле ввода: фото · текст · микрофон · отправка + индикатор анализа.
 */
import { ImagePlus, Loader2, Lock, Mic, Send, Square } from "lucide-react";
import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { AnalyzeResult } from "@/lib/api";
import { api } from "@/lib/api";
import { AnalyzeStatus, type AnalyzeKind } from "@/components/AnalyzeStatus";
import { useToast } from "@/components/Toast";
import { hapticLight } from "@/lib/telegram";
import { cn } from "@/lib/utils";

interface Props {
  onDone: () => void;
  onResult?: (result: AnalyzeResult) => void;
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

export function InputBar({ onDone, onResult, isPremium, busy, onBusy }: Props) {
  const { showToast } = useToast();
  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);
  const [recording, setRecording] = useState(false);
  const [analyzing, setAnalyzing] = useState<AnalyzeKind | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const handleError = (e: unknown) => {
    const msg = e instanceof Error ? e.message : "Ошибка";
    if (msg.includes("429") || msg.toLowerCase().includes("лимит")) showToast(msg, "error");
    else if (msg.includes("403") || msg.toLowerCase().includes("premium")) showToast(msg, "info");
    else showToast(msg, "error");
  };

  const runAnalyze = async (kind: AnalyzeKind, fn: () => Promise<AnalyzeResult>) => {
    onBusy?.(true);
    setAnalyzing(kind);
    try {
      const result = await fn();
      onResult?.(result);
      showToast(result.summary?.slice(0, 80) || "Готово", "success");
      await onDone();
    } catch (e) {
      handleError(e);
    } finally {
      setAnalyzing(null);
      onBusy?.(false);
    }
  };

  const submitText = async () => {
    const trimmed = text.trim();
    if (!trimmed || busy || recording || analyzing) return;
    hapticLight();
    setText("");
    await runAnalyze("text", () => api.analyze(trimmed));
  };

  const onPhoto = async (file: File) => {
    if (!isPremium) {
      showToast("Фото — в Premium. Оформите в Настройках", "info");
      return;
    }
    if (busy || analyzing) return;
    await runAnalyze("photo", () => api.analyzePhoto(file, text.trim() || undefined));
    setText("");
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
      showToast("Голос — в Premium или отправьте боту @NavigAI_bot", "info");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      showToast("Запись недоступна — используйте бота @NavigAI_bot", "info");
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
        setRecording(false);
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const ext = blob.type.includes("mp4") ? "m4a" : "webm";
        await runAnalyze("voice", () => api.analyzeVoice(blob, `voice.${ext}`));
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      stopStream();
      showToast("Нет доступа к микрофону", "error");
    }
  };

  const canSend = Boolean(text.trim()) && !busy && !recording && !analyzing;

  return (
    <motion.div className="space-y-2" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <AnimatePresence>{analyzing && <AnalyzeStatus kind={analyzing} />}</AnimatePresence>
      {recording && !analyzing && (
        <p className="text-center text-xs font-medium text-mint">Говорите… нажмите микрофон, чтобы остановить</p>
      )}

      <div
        className={cn(
          "input-bar",
          focused && "input-bar-focused",
          recording && "input-bar-recording",
          analyzing && "input-bar-analyzing"
        )}
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

        <button
          type="button"
          className={cn("input-bar-icon", !isPremium && "input-bar-icon-locked")}
          onClick={() => (isPremium ? fileRef.current?.click() : showToast("Фото — Premium", "info"))}
          disabled={busy || recording || !!analyzing}
          aria-label="Фото"
        >
          {!isPremium ? <Lock className="h-4 w-4" /> : <ImagePlus className="h-5 w-5" strokeWidth={1.75} />}
        </button>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Задача, расход, напоминание..."
          rows={2}
          disabled={recording || !!analyzing}
          className="input-bar-text"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submitText();
            }
          }}
        />

        <button
          type="button"
          className={cn("input-bar-icon", recording && "input-bar-icon-recording", !isPremium && "input-bar-icon-locked")}
          onClick={toggleVoice}
          disabled={(busy && !recording) || !!analyzing}
          aria-label="Голос"
        >
          {recording ? (
            <Square className="h-4 w-4 fill-current" />
          ) : !isPremium ? (
            <Lock className="h-4 w-4" />
          ) : (
            <Mic className="h-5 w-5" strokeWidth={1.75} />
          )}
        </button>

        <button
          type="button"
          className={cn("input-bar-submit", canSend && "input-bar-submit-ready")}
          disabled={!canSend}
          onClick={submitText}
          aria-label="Разобрать"
        >
          {analyzing ? (
            <Loader2 className="h-5 w-5 animate-spin text-midnight" />
          ) : (
            <Send className="h-5 w-5 text-midnight" strokeWidth={2.25} />
          )}
        </button>
      </div>

      <p className="text-center text-[10px] text-muted">
        Enter — отправить · {!isPremium && "Голос и фото — Premium · "}
        Shift+Enter — новая строка
      </p>
    </motion.div>
  );
}
