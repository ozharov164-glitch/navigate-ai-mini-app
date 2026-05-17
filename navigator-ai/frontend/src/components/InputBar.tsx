import { ImagePlus, Loader2, Send } from "lucide-react";
import { useRef, useState } from "react";
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

export function InputBar({ onDone, isPremium, busy, onBusy }: Props) {
  const { showToast } = useToast();
  const [text, setText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const submit = async () => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    hapticLight();
    onBusy?.(true);
    try {
      const result = await api.analyze(trimmed);
      showToast(result.summary?.slice(0, 120) || "Готово", "success");
      setText("");
      await onDone();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Ошибка", "error");
    } finally {
      onBusy?.(false);
    }
  };

  const onPhoto = async (file: File) => {
    if (!isPremium) {
      showToast("Фото — в Premium. Отправьте чек боту @NavigAI_bot", "info");
      return;
    }
    onBusy?.(true);
    try {
      const result = await api.analyzePhoto(file, text.trim() || undefined);
      showToast(result.summary?.slice(0, 120) || "Готово", "success");
      setText("");
      await onDone();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Ошибка", "error");
    } finally {
      onBusy?.(false);
    }
  };

  return (
    <div className="glass-card space-y-3 rounded-2.5xl p-4">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Задача, расход, напоминание…"
        rows={3}
        className="w-full resize-none bg-transparent text-sm text-primary placeholder:text-muted focus:outline-none"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
      />
      <div className="flex items-center gap-2">
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
          className="glass-btn flex h-10 w-10 items-center justify-center !p-0"
          onClick={() => fileRef.current?.click()}
          aria-label="Загрузить фото"
        >
          <ImagePlus className="h-4 w-4" />
        </button>
        <button
          type="button"
          disabled={busy || !text.trim()}
          onClick={submit}
          className={cn("btn-primary ml-auto flex-1", busy && "opacity-60")}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Разобрать
        </button>
      </div>
    </div>
  );
}
