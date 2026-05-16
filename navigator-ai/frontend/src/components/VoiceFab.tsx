import { Mic, Square } from "lucide-react";
import { useRef, useState } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/components/Toast";
import { cn } from "@/lib/utils";
import { hapticLight } from "@/lib/telegram";

interface Props {
  onDone: () => void;
}

function pickMimeType(): string {
  const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
  for (const t of types) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) return t;
  }
  return "";
}

export function VoiceFab({ onDone }: Props) {
  const { showToast } = useToast();
  const [recording, setRecording] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const startRecording = async () => {
    hapticLight();
    if (!navigator.mediaDevices?.getUserMedia) {
      showToast("Отправьте голосовое боту @NavigAI_bot", "info");
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
        setStatus("Анализирую…");
        try {
          const result = await api.analyzeVoice(blob, `voice.${ext}`);
          showToast(result.summary?.slice(0, 100) || "Готово!", "success");
          await onDone();
        } catch (err) {
          showToast(err instanceof Error ? err.message : "Ошибка распознавания", "error");
        } finally {
          setRecording(false);
          setStatus(null);
        }
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setStatus("Говорите… Нажмите ещё раз, чтобы отправить");
    } catch {
      stopStream();
      showToast("Нет доступа к микрофону. Голосовое — боту @NavigAI_bot", "error");
    }
  };

  const stopRecording = () => {
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
    recorderRef.current = null;
  };

  const handleClick = () => {
    if (recording) stopRecording();
    else startRecording();
  };

  return (
    <>
      {status && (
        <div className="voice-status fixed bottom-[5.75rem] left-1/2 z-40 max-w-[88%] -translate-x-1/2 rounded-2xl px-4 py-2.5 text-center text-xs font-medium animate-scale-in">
          {status}
        </div>
      )}
      <div className="fixed bottom-[4.75rem] left-1/2 z-40 -translate-x-1/2">
        {!recording && (
          <span
            className="pointer-events-none absolute inset-0 animate-pulse-ring rounded-full bg-accent/30"
            aria-hidden
          />
        )}
        <button
          type="button"
          onClick={handleClick}
          className={cn(
            "relative flex h-[3.75rem] w-[3.75rem] items-center justify-center rounded-full",
            "bg-gradient-to-br from-cyan-400 to-cyan-600 text-navy-950 shadow-glow",
            "transition-all duration-200 hover:scale-105 active:scale-95",
            recording && "scale-110 ring-2 ring-red-400/80 ring-offset-2 ring-offset-navy-950 animate-pulse-soft"
          )}
          aria-label={recording ? "Остановить запись" : "Голосовой ввод"}
        >
          {recording ? <Square className="h-5 w-5 fill-current" /> : <Mic className="h-6 w-6" strokeWidth={2.25} />}
        </button>
      </div>
    </>
  );
}
