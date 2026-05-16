import { useEffect, useState } from "react";
import { api, apiBase } from "@/lib/api";
import { getInitData } from "@/lib/telegram";

interface Props {
  isPremium: boolean;
  onTheme: () => void;
  theme?: "dark" | "light";
}

export function MorePage({ isPremium, onTheme, theme = "dark" }: Props) {
  const [privacy, setPrivacy] = useState<{ stored_items: string[]; retention_policy: string; encryption: string } | null>(null);
  const [places, setPlaces] = useState<{ id: number; name: string; address: string }[]>([]);
  const [digests, setDigests] = useState<{ id: number; type: string; content: string; date: string }[]>([]);
  const [docs, setDocs] = useState<{ id: number; title: string; doc_type: string }[]>([]);
  const [placeName, setPlaceName] = useState("");
  const [placeAddr, setPlaceAddr] = useState("");

  useEffect(() => {
    api.privacy().then(setPrivacy).catch(() => null);
    api.places().then(setPlaces).catch(() => []);
    api.digests().then(setDigests).catch(() => []);
    api.documents().then(setDocs).catch(() => []);
  }, []);

  const exportIcal = () => {
    window.open(`${apiBase()}/export/ical?init=${encodeURIComponent(getInitData())}`, "_blank");
  };

  const exportPdf = () => {
    if (!isPremium) {
      alert("PDF только для премиум");
      return;
    }
    window.open(`${apiBase()}/export/pdf`, "_blank");
  };

  const deleteAll = async () => {
    if (!confirm("Удалить ВСЕ данные безвозвратно?")) return;
    await api.deleteAll();
    window.location.reload();
  };

  const addPlace = async () => {
    if (!placeName || !placeAddr) return;
    await api.addPlace(placeName, placeAddr);
    setPlaces(await api.places());
    setPlaceName("");
    setPlaceAddr("");
  };

  return (
    <div className="space-y-4 animate-slide-up pb-8">
      <section className="glass-card p-4">
        <h2 className="font-medium">Премиум</h2>
        <p className="mt-1 text-xs text-slate-400">{isPremium ? "Активен ✓" : "199–399 ₽/мес"}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="glass-btn text-xs" onClick={() => api.starsInvoice("basic")}>
            ⭐ 199 Stars
          </button>
          <button className="glass-btn text-xs" onClick={() => api.yookassa("basic").then((r) => window.open(r.confirmation_url))}>
            💳 199 ₽ YooKassa
          </button>
        </div>
      </section>

      <section className="glass-card p-4">
        <h2 className="mb-2 font-medium">Мои места</h2>
        <p className="mb-2 text-xs text-slate-400">Добавляйте дом, работу, дачу — когда удобно</p>
        <input className="mb-2 w-full rounded-lg bg-white/5 p-2 text-sm" placeholder="Название" value={placeName} onChange={(e) => setPlaceName(e.target.value)} />
        <input className="mb-2 w-full rounded-lg bg-white/5 p-2 text-sm" placeholder="Адрес" value={placeAddr} onChange={(e) => setPlaceAddr(e.target.value)} />
        <button className="glass-btn text-xs" onClick={addPlace}>
          Добавить
        </button>
        <ul className="mt-3 space-y-1 text-sm">
          {places.map((p) => (
            <li key={p.id}>
              <b>{p.name}</b>: {p.address}
            </li>
          ))}
        </ul>
      </section>

      <section className="glass-card p-4">
        <h2 className="mb-2 font-medium">Document Vault</h2>
        {docs.length === 0 ? (
          <p className="text-xs text-slate-500">Фото документов из чата появятся здесь</p>
        ) : (
          <ul className="text-sm">
            {docs.map((d) => (
              <li key={d.id}>
                {d.title} ({d.doc_type})
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="glass-card p-4">
        <h2 className="mb-2 font-medium">История / AI Digest</h2>
        {digests.slice(0, 5).map((d) => (
          <div key={d.id} className="mb-2 border-b border-white/5 pb-2 text-xs">
            <span className="text-indigo-400">{d.type}</span> · {d.date}
            <p className="mt-1 text-slate-300">{d.content.slice(0, 120)}…</p>
          </div>
        ))}
      </section>

      <section className="glass-card p-4">
        <h2 className="mb-2 font-medium">Экспорт</h2>
        <div className="flex gap-2">
          <button className="glass-btn text-xs" onClick={exportIcal}>
            iCal
          </button>
          <button className="glass-btn text-xs" onClick={exportPdf}>
            PDF {isPremium ? "" : "(premium)"}
          </button>
        </div>
      </section>

      <section className="glass-card p-4">
        <h2 className="mb-2 font-medium text-emerald-400">Приватность</h2>
        {privacy && (
          <>
            <ul className="list-inside list-disc text-xs text-slate-400">
              {privacy.stored_items.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
            <p className="mt-2 text-xs">{privacy.retention_policy}</p>
            <p className="text-xs">Шифрование: {privacy.encryption}</p>
          </>
        )}
        <button className="mt-3 w-full rounded-xl border border-red-500/40 bg-red-500/10 py-2 text-sm text-red-300" onClick={deleteAll}>
          Удалить все мои данные
        </button>
      </section>

      <button type="button" className="glass-btn w-full text-sm" onClick={onTheme}>
        {theme === "dark" ? "☀️ Светлая тема" : "🌙 Тёмная тема"}
      </button>
    </div>
  );
}
