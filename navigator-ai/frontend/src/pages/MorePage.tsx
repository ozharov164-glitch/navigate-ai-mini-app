import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Crown,
  Download,
  FileText,
  History,
  MapPinned,
  Moon,
  Shield,
  Sparkles,
  Sun,
  Trash2,
} from "lucide-react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/Modal";
import { PremiumBadge } from "@/components/PremiumBadge";
import { useToast } from "@/components/Toast";
import { burstConfetti } from "@/lib/confetti";
import { openStarsInvoice } from "@/lib/telegram";
import { cn } from "@/lib/utils";

interface Props {
  isPremium: boolean;
  onTheme: () => void;
  theme?: "dark" | "light";
  scrollTo?: "premium" | "privacy" | null;
  onRefresh?: () => void;
}

function SettingsSection({
  title,
  icon: Icon,
  children,
  className,
}: {
  title: string;
  icon: typeof Crown;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-primary">
        <Icon className="h-4 w-4 text-accent" />
        {title}
      </h2>
      {children}
    </Card>
  );
}

export function MorePage({
  isPremium,
  onTheme,
  theme = "dark",
  scrollTo,
  onRefresh,
}: Props) {
  const { showToast } = useToast();
  const premiumRef = useRef<HTMLElement>(null);
  const privacyRef = useRef<HTMLElement>(null);
  const [privacy, setPrivacy] = useState<{ stored_items: string[]; retention_policy: string; encryption: string } | null>(null);
  const [places, setPlaces] = useState<{ id: number; name: string; address: string }[]>([]);
  const [digests, setDigests] = useState<{ id: number; type: string; content: string; date: string }[]>([]);
  const [docs, setDocs] = useState<{ id: number; title: string; doc_type: string }[]>([]);
  const [placeName, setPlaceName] = useState("");
  const [placeAddr, setPlaceAddr] = useState("");
  const [payBusy, setPayBusy] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    api.privacy().then(setPrivacy).catch(() => showToast("Не удалось загрузить приватность", "error"));
    api.places().then(setPlaces).catch(() => showToast("Не удалось загрузить места", "error"));
    api.digests().then(setDigests).catch(() => null);
    api.documents().then(setDocs).catch(() => null);
  }, [showToast]);

  useEffect(() => {
    if (scrollTo === "premium") premiumRef.current?.scrollIntoView({ behavior: "smooth" });
    if (scrollTo === "privacy") privacyRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [scrollTo]);

  const payStars = async (tier: "basic" | "premium") => {
    if (payBusy) return;
    setPayBusy(tier);
    try {
      const { invoice_url } = await api.starsInvoice(tier);
      const status = await openStarsInvoice(invoice_url);
      if (status === "paid") {
        burstConfetti();
        showToast("Добро пожаловать в Premium! 🎉", "success");
        onRefresh?.();
      } else if (status === "cancelled") {
        showToast("Оплата отменена", "info");
      } else {
        showToast("Оплата недоступна. Используйте /premium в боте.", "error");
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Ошибка оплаты", "error");
    } finally {
      setPayBusy(null);
    }
  };

  const payYookassa = async (tier: "basic" | "premium") => {
    if (payBusy) return;
    setPayBusy(`yk_${tier}`);
    try {
      const data = await api.yookassa(tier);
      const opened = window.open(data.confirmation_url, "_blank");
      if (!opened) showToast("Разрешите всплывающие окна для оплаты", "error");
      else showToast("После оплаты премиум активируется автоматически", "info");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "YooKassa недоступна", "error");
    } finally {
      setPayBusy(null);
    }
  };

  const exportIcal = async () => {
    try {
      await api.downloadExport("/export/ical", "navigai.ics");
      showToast("iCal скачан", "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Ошибка экспорта", "error");
    }
  };

  const exportPdf = async () => {
    if (!isPremium) {
      showToast("PDF только для Premium", "error");
      return;
    }
    try {
      await api.downloadExport("/export/pdf", "navigai-report.pdf");
      showToast("PDF скачан", "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Ошибка экспорта", "error");
    }
  };

  const deleteAll = async () => {
    try {
      await api.deleteAll();
      showToast("Данные удалены", "success");
      window.location.reload();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Ошибка удаления", "error");
    }
    setDeleteOpen(false);
  };

  const addPlace = async () => {
    if (!placeName || !placeAddr) {
      showToast("Укажите название и адрес", "error");
      return;
    }
    try {
      await api.addPlace(placeName, placeAddr);
      setPlaces(await api.places());
      setPlaceName("");
      setPlaceAddr("");
      showToast("Место добавлено", "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Ошибка", "error");
    }
  };

  return (
    <div className="stagger-children space-y-4 pb-8">
      <h2 className="heading-display">Настройки</h2>

      <section
        id="premium-section"
        ref={premiumRef}
        className={cn(
          "overflow-hidden rounded-2xl border p-4 shadow-card backdrop-blur-xl",
          isPremium
            ? "border-premium/40 bg-gradient-to-br from-amber-500/20 via-navy-900/90 to-navy-950"
            : "border-cyan-400/20 bg-gradient-to-br from-cyan-500/10 via-navy-900/90 to-navy-950"
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="flex items-center gap-2 text-base font-bold text-primary">
              <Crown className={cn("h-5 w-5", isPremium ? "text-premium" : "text-accent")} />
              Premium
            </h2>
            <p className="mt-1 text-xs text-muted">
              {isPremium ? "Безлимит AI · PDF-отчёты · приоритет" : "199–399 Stars или ₽ · безлимит действий"}
            </p>
          </div>
          {isPremium && <PremiumBadge size="md" />}
        </div>
        {!isPremium && (
          <ul className="mt-3 space-y-1.5 text-xs text-secondary">
            <li className="flex items-center gap-2">
              <Sparkles className="h-3 w-3 text-accent" /> Безлимит AI-действий
            </li>
            <li className="flex items-center gap-2">
              <FileText className="h-3 w-3 text-accent" /> PDF-отчёты
            </li>
            <li className="flex items-center gap-2">
              <Shield className="h-3 w-3 text-accent" /> Больше попыток при разборе
            </li>
          </ul>
        )}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" className="btn-premium text-xs disabled:opacity-50" disabled={!!payBusy} onClick={() => payStars("basic")}>
            {payBusy === "basic" ? "…" : "⭐ 199 Stars"}
          </button>
          <button type="button" className="btn-premium text-xs disabled:opacity-50" disabled={!!payBusy} onClick={() => payStars("premium")}>
            {payBusy === "premium" ? "…" : "⭐ 399 Stars"}
          </button>
          <button type="button" className="glass-btn col-span-2 text-xs disabled:opacity-50" disabled={!!payBusy} onClick={() => payYookassa("basic")}>
            💳 Оплата картой 199–399 ₽
          </button>
        </div>
      </section>


      <SettingsSection title="Мои места" icon={MapPinned}>
        <p className="mb-3 text-xs text-muted">Дом, работа, дача — для быстрых маршрутов</p>
        <input className="input-field mb-2" placeholder="Название" value={placeName} onChange={(e) => setPlaceName(e.target.value)} />
        <input className="input-field mb-2" placeholder="Адрес" value={placeAddr} onChange={(e) => setPlaceAddr(e.target.value)} />
        <button type="button" className="btn-primary w-full text-xs" onClick={addPlace}>
          Добавить место
        </button>
        <ul className="mt-3 divide-y divide-white/5">
          {places.map((p) => (
            <li key={p.id} className="py-2 text-sm">
              <span className="font-medium text-primary">{p.name}</span>
              <p className="text-xs text-muted">{p.address}</p>
            </li>
          ))}
        </ul>
      </SettingsSection>

      <SettingsSection title="Document Vault" icon={FileText}>
        {docs.length === 0 ? (
          <p className="text-xs text-muted">Фото документов из чата появятся здесь</p>
        ) : (
          <ul className="space-y-2">
            {docs.map((d) => (
              <li key={d.id} className="flex items-center gap-2 rounded-lg bg-white/[0.03] p-2 text-sm text-secondary">
                <FileText className="h-4 w-4 shrink-0 text-accent" />
                {d.title} <span className="text-muted">({d.doc_type})</span>
              </li>
            ))}
          </ul>
        )}
      </SettingsSection>

      <SettingsSection title="AI Digest" icon={History}>
        {digests.length === 0 ? (
          <p className="text-xs text-muted">История дайджестов появится здесь</p>
        ) : (
          digests.slice(0, 5).map((d) => (
            <div key={d.id} className="mb-3 border-b border-white/5 pb-3 last:mb-0 last:border-0">
              <span className="text-[10px] font-semibold uppercase text-accent">{d.type}</span>
              <span className="text-[10px] text-muted"> · {d.date}</span>
              <p className="mt-1 text-xs leading-relaxed text-secondary">{d.content.slice(0, 140)}…</p>
            </div>
          ))
        )}
      </SettingsSection>

      <SettingsSection title="Экспорт" icon={Download}>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="glass-btn flex items-center gap-1.5 text-xs" onClick={exportIcal}>
            <Download className="h-3.5 w-3.5" /> iCal
          </button>
          <button type="button" className={cn("glass-btn flex items-center gap-1.5 text-xs", !isPremium && "opacity-70")} onClick={exportPdf}>
            <FileText className="h-3.5 w-3.5" /> PDF {!isPremium && "(Premium)"}
          </button>
        </div>
      </SettingsSection>

      <section ref={privacyRef}>
        <SettingsSection title="Приватность" icon={Shield}>
          {privacy && (
            <>
              <ul className="space-y-1 text-xs text-muted">
                {privacy.stored_items.map((s) => (
                  <li key={s} className="flex items-start gap-2">
                    <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-emerald-400" />
                    {s}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs leading-relaxed text-secondary">{privacy.retention_policy}</p>
              <p className="mt-1 text-xs text-muted">Шифрование: {privacy.encryption}</p>
            </>
          )}
          <button
            type="button"
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 py-2.5 text-sm font-medium text-red-400 transition hover:bg-red-500/15"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
            Удалить все данные
          </button>
        </SettingsSection>
      </section>

      <button type="button" className="glass-btn flex w-full items-center justify-center gap-2 text-sm" onClick={onTheme}>
        {theme === "dark" ? (
          <>
            <Sun className="h-4 w-4 text-amber-400" /> Светлая тема
          </>
        ) : (
          <>
            <Moon className="h-4 w-4 text-accent" /> Тёмная тема
          </>
        )}
      </button>

      <Modal
        open={deleteOpen}
        title="Удалить все данные?"
        message="Это действие необратимо. Все задачи, расходы, маршруты и настройки будут удалены."
        confirmLabel="Удалить"
        cancelLabel="Отмена"
        danger
        onConfirm={deleteAll}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  );
}
