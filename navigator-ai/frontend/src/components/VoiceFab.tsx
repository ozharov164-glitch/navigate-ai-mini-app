import { Mic, Square } from "lucide-react";
import { useRef, useState } from "react";
import { api } from "@/lib/api";
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
      setStatus("Отправьте голосовое боту @NavigAI_bot");
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
          setStatus(result.summary?.slice(0, 80) || "Готово!");
          await onDone();
        } catch (err) {
          setStatus(err instanceof Error ? err.message : "Ошибка");
        } finally {
          setRecording(false);
          setTimeout(() => setStatus(null), 3500);
        }
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setStatus("Запись… Нажмите ещё раз, чтобы отправить");
    } catch {
      stopStream();
      setStatus("Нет доступа к микрофону. Голосовое — боту @NavigAI_bot");
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
        <div className="fixed bottom-24 left-1/2 z-40 max-w-[90%] -translate-x-1/2 rounded-xl bg-slate-800/95 px-4 py-2 text-center text-xs shadow-lg">
          {status}
        </div>
      )}
      <button
        type="button"
        onClick={handleClick}
        className={`fixed bottom-20 left-1/2 z-40 flex h-16 w-16 -translate-x-1/2 items-center justify-center rounded-full border border-indigo-400/40 bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/40 transition ${recording ? "scale-110 animate-pulse ring-2 ring-red-400" : "hover:scale-105"}`}
        aria-label={recording ? "Остановить запись" : "Голосовой ввод"}
      >
        {recording ? <Square className="h-6 w-6 text-white" /> : <Mic className="h-7 w-7 text-white" />}
      </button>
    </>
  );
}
