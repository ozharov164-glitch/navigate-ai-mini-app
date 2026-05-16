import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { Modal } from "@/components/Modal";
import { useToast } from "@/components/Toast";
import { openStarsInvoice } from "@/lib/telegram";

interface Props {
  isPremium: boolean;
  onTheme: () => void;
  theme?: "dark" | "light";
  scrollTo?: "premium" | "privacy" | null;
  onRefresh?: () => void;
}

export function MorePage({ isPremium, onTheme, theme = "dark", scrollTo, onRefresh }: Props) {
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
        showToast("Оплата прошла! Премиум активируется в течение минуты.", "success");
        onRefresh?.();
      } else if (status === "cancelled") {
        showToast("Оплата отменена", "info");
      } else {
        showToast("Оплата недоступна в этом клиенте. Используйте /premium в боте.", "error");
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
      showToast("PDF только для премиум", "error");
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
    <div className="space-y-4 animate-slide-up pb-8">
      <section ref={premiumRef} className="glass-card p-4">
        <h2 className="font-medium text-primary">Премиум</h2>
        <p className="mt-1 text-xs text-muted">{isPremium ? "Активен ✓" : "199–399 Stars / ₽ в месяц"}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            className="glass-btn text-xs disabled:opacity-50"
            disabled={!!payBusy}
            onClick={() => payStars("basic")}
          >
            {payBusy === "basic" ? "⏳…" : "⭐ 199 Stars"}
          </button>
          <button
            className="glass-btn text-xs disabled:opacity-50"
            onClick={() => payStars("premium")}
            disabled={!!payBusy}
          >
            {payBusy === "premium" ? "⏳…" : "⭐ 399 Stars"}
          </button>
          <button
            className="glass-btn text-xs disabled:opacity-50"
            onClick={() => payYookassa("basic")}
            disabled={!!payBusy}
          >
            💳 199 ₽
          </button>
        </div>
      </section>

      <section className="glass-card p-4">
        <h2 className="mb-2 font-medium text-primary">Мои места</h2>
        <p className="mb-2 text-xs text-muted">Дом, работа, дача — для маршрутов</p>
        <input className="input-field mb-2" placeholder="Название" value={placeName} onChange={(e) => setPlaceName(e.target.value)} />
        <input className="input-field mb-2" placeholder="Адрес" value={placeAddr} onChange={(e) => setPlaceAddr(e.target.value)} />
        <button type="button" className="glass-btn text-xs" onClick={addPlace}>
          Добавить
        </button>
        <ul className="mt-3 space-y-1 text-sm text-secondary">
          {places.map((p) => (
            <li key={p.id}>
              <b className="text-primary">{p.name}</b>: {p.address}
            </li>
          ))}
        </ul>
      </section>

      <section className="glass-card p-4">
        <h2 className="mb-2 font-medium text-primary">Document Vault</h2>
        {docs.length === 0 ? (
          <p className="text-xs text-muted">Фото документов из чата появятся здесь</p>
        ) : (
          <ul className="text-sm text-secondary">
            {docs.map((d) => (
              <li key={d.id}>
                {d.title} ({d.doc_type})
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="glass-card p-4">
        <h2 className="mb-2 font-medium text-primary">История / AI Digest</h2>
        {digests.slice(0, 5).map((d) => (
          <div key={d.id} className="mb-2 border-b border-white/5 pb-2 text-xs">
            <span className="text-accent">{d.type}</span> · {d.date}
            <p className="mt-1 text-secondary">{d.content.slice(0, 120)}…</p>
          </div>
        ))}
      </section>

      <section className="glass-card p-4">
        <h2 className="mb-2 font-medium text-primary">Экспорт</h2>
        <div className="flex gap-2">
          <button type="button" className="glass-btn text-xs" onClick={exportIcal}>
            iCal
          </button>
          <button type="button" className="glass-btn text-xs" onClick={exportPdf}>
            PDF {isPremium ? "" : "(premium)"}
          </button>
        </div>
      </section>

      <section ref={privacyRef} className="glass-card p-4">
        <h2 className="mb-2 font-medium text-emerald-500">Приватность</h2>
        {privacy && (
          <>
            <ul className="list-inside list-disc text-xs text-muted">
              {privacy.stored_items.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-secondary">{privacy.retention_policy}</p>
            <p className="text-xs text-muted">Шифрование: {privacy.encryption}</p>
          </>
        )}
        <button
          type="button"
          className="mt-3 w-full rounded-xl border border-red-500/40 bg-red-500/10 py-2 text-sm text-red-400"
          onClick={() => setDeleteOpen(true)}
        >
          Удалить все мои данные
        </button>
      </section>

      <button type="button" className="glass-btn w-full text-sm" onClick={onTheme}>
        {theme === "dark" ? "☀️ Светлая тема" : "🌙 Тёмная тема"}
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
