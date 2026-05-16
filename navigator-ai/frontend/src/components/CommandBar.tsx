import { Loader2, Mic, Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  busy?: boolean;
  placeholder?: string;
}

/** Raycast-style command input */
export function CommandBar({ value, onChange, onSubmit, busy, placeholder }: Props) {
  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="command-bar group">
      <div className="command-bar-inner">
        <span className="command-kbd">⌘</span>
        <textarea
          className="command-input"
          rows={2}
          placeholder={placeholder ?? "Спроси AI или добавь задачу…"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKey}
          disabled={busy}
        />
        <Mic className="command-icon pointer-events-none text-muted/40" aria-hidden />
      </div>
      <button
        type="button"
        className={cn("command-submit", busy && "opacity-70")}
        disabled={busy || !value.trim()}
        onClick={onSubmit}
        aria-label="Отправить"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
      </button>
    </div>
  );
}
