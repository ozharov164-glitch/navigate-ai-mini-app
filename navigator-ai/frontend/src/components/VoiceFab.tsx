import { Mic } from "lucide-react";
import { useState } from "react";
import { api } from "@/lib/api";
import { hapticLight } from "@/lib/telegram";

interface Props {
  onDone: () => void;
}

export function VoiceFab({ onDone }: Props) {
  const [recording, setRecording] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const handleVoice = async () => {
    hapticLight();
    type SpeechRecognitionType = {
      lang: string;
      interimResults: boolean;
      onresult: ((e: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => void) | null;
      onerror: (() => void) | null;
      start: () => void;
    };
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionType;
      webkitSpeechRecognition?: new () => SpeechRecognitionType;
    };
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) {
      setStatus("Голосовой ввод: отправьте голосовое боту @NavigAI_bot");
      return;
    }
    const rec = new SR();
    rec.lang = "ru-RU";
    rec.interimResults = false;
    setRecording(true);
    setStatus("Слушаю…");
    rec.onresult = async (e) => {
      const text = e.results[0][0].transcript;
      setStatus("Анализирую…");
      try {
        await api.analyze(text);
        onDone();
        setStatus("Готово!");
      } catch (err) {
        setStatus(err instanceof Error ? err.message : "Ошибка");
      } finally {
        setRecording(false);
      }
    };
    rec.onerror = () => {
      setRecording(false);
      setStatus("Не удалось распознать");
    };
    rec.start();
  };

  return (
    <>
      {status && (
        <div className="fixed bottom-24 left-1/2 z-40 -translate-x-1/2 rounded-xl bg-slate-800/95 px-4 py-2 text-xs shadow-lg">
          {status}
        </div>
      )}
      <button
        onClick={handleVoice}
        className={`fixed bottom-20 left-1/2 z-40 flex h-16 w-16 -translate-x-1/2 items-center justify-center rounded-full border border-indigo-400/40 bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/40 transition ${recording ? "scale-110 animate-pulse" : "hover:scale-105"}`}
        aria-label="Голосовой ввод"
      >
        <Mic className="h-7 w-7 text-white" />
      </button>
    </>
  );
}
