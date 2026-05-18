import { useEffect, useRef, useState, type ReactNode } from "react";
import { Bell, Crown, Download, FileText, Gift, Moon, Shield, Sparkles, Sun, Trash2 } from "lucide-react";
import { api, TIMEZONES } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/Modal";
import { PremiumBadge } from "@/components/PremiumBadge";
import { useToast } from "@/components/Toast";
import { openStarsInvoice } from "@/lib/telegram";
import { cn } from "@/lib/utils";

interface Props {
  isPremium: boolean;
  timezone: string;
  proactiveEnabled?: boolean;
  referralCode?: string;
  referralsCount?: number;
  onTheme: () => void;
  theme?: "dark" | "light";
  scrollTo?: "premium" | "privacy" | null;
  onRefresh?: () => void;
}

function Section({ title, icon: Icon, children }: { title: string; icon: typeof Crown; children: ReactNode }) {
  return (
    <Card>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-primary">
        <Icon className="h-4 w-4 text-mint" />
        {title}
      </h2>
      {children}
    </Card>
  );
}

const BOT_USERNAME = "NavigAI_bot";

export function SettingsPage({
  isPremium,
  timezone,
  proactiveEnabled = true,
  referralCode = "",
  referralsCount = 0,
  onTheme,
  theme = "dark",
  scrollTo,
  onRefresh,
}: Props) {
  const { showToast } = useToast();
  const premiumRef = useRef<HTMLElement>(null);
  const privacyRef = useRef<HTMLElement>(null);
  const [privacy, setPrivacy] = useState<{ stored_items: string[]; retention_policy: string; encryption: string } | null>(
    null
  );
  const [tz, setTz] = useState(timezone);
  const [proactive, setProactive] = useState(proactiveEnabled);
  const [payBusy, setPayBusy] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const referralLink = referralCode ? `https://t.me/${BOT_USERNAME}?start=ref_${referralCode}` : "";

  useEffect(() => {
    setTz(timezone);
  }, [timezone]);

  useEffect(() => {
    setProactive(proactiveEnabled);
  }, [proactiveEnabled]);

  useEffect(() => {
    api.privacy().then(setPrivacy).catch(() => null);
  }, []);

  useEffect(() => {
    if (scrollTo === "premium") premiumRef.current?.scrollIntoView({ behavior: "smooth" });
    if (scrollTo === "privacy") privacyRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [scrollTo]);

  useEffect(() => {
    const pending = sessionStorage.getItem("yk_payment");
    if (!pending) return;
    try {
      const { tier, payment_id } = JSON.parse(pending) as { tier: string; payment_id: string };
      api
        .confirmYookassa(tier, payment_id)
        .then(() => {
          sessionStorage.removeItem("yk_payment");
          showToast("Premium активирован", "success");
          onRefresh?.();
        })
        .catch(() => {
          /* webhook may have activated */
          sessionStorage.removeItem("yk_payment");
          onRefresh?.();
        });
    } catch {
      sessionStorage.removeItem("yk_payment");
    }
  }, [onRefresh, showToast]);

  const saveTz = async (value: string) => {
    setTz(value);
    try {
      await api.updateSettings({ timezone: value });
      showToast("Часовой пояс сохранён", "success");
      onRefresh?.();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Ошибка", "error");
    }
  };

  const saveProactive = async (value: boolean) => {
    setProactive(value);
    try {
      await api.updateSettings({ proactive_enabled: value });
      showToast(value ? "Дайджесты включены" : "Дайджесты выключены", "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Ошибка", "error");
    }
  };

  const payStars = async (tier: "basic" | "premium") => {
    if (payBusy) return;
    setPayBusy(tier);
    try {
      const { invoice_url } = await api.starsInvoice(tier);
      const status = await openStarsInvoice(invoice_url);
      if (status === "paid") {
        showToast("Premium активирован", "success");
        onRefresh?.();
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
      sessionStorage.setItem("yk_payment", JSON.stringify({ tier, payment_id: data.payment_id }));
      window.open(data.confirmation_url, "_blank");
      showToast("После оплаты вернитесь в Mini App", "info");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "YooKassa недоступна", "error");
    } finally {
      setPayBusy(null);
    }
  };

  const shareReferral = () => {
    if (!referralLink) return;
    const text = `НавигаторAI — AI для задач и расходов. ${referralLink}`;
    if (navigator.share) {
      navigator.share({ title: "НавигаторAI", text, url: referralLink }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(referralLink);
      showToast("Ссылка скопирована", "success");
    }
  };

  return (
    <div className="space-y-4 pb-8">
      <h2 className="heading-display">Настройки</h2>

      <section id="premium-section" ref={premiumRef} className={cn("premium-card", !isPremium && "!border-mint/20")}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="flex items-center gap-2 text-base font-bold text-primary">
              <Crown className={cn("h-5 w-5", isPremium ? "text-gold" : "text-mint")} />
              Premium
            </h2>
            <p className="mt-1.5 text-xs text-muted">
              {isPremium ? "До 50 AI/день · голос · фото · PDF" : "10 AI/день бесплатно · до 50 с Premium"}
            </p>
          </div>
          {isPremium && <PremiumBadge size="md" />}
        </div>
        {!isPremium && (
          <ul className="mt-3 space-y-1.5 text-xs text-secondary">
            <li className="flex items-center gap-2">
              <Sparkles className="h-3 w-3 text-mint" /> Голос и фото
            </li>
            <li className="flex items-center gap-2">
              <FileText className="h-3 w-3 text-mint" /> PDF-экспорт
            </li>
            <li className="flex items-center gap-2">
              <Shield className="h-3 w-3 text-mint" /> Приоритетный AI-разбор
            </li>
          </ul>
        )}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" className="btn-premium text-xs" disabled={!!payBusy} onClick={() => payStars("premium")}>
            ⭐ 399 Stars
          </button>
          <button type="button" className="glass-btn text-xs" disabled={!!payBusy} onClick={() => payYookassa("premium")}>
            💳 Карта
          </button>
        </div>
      </section>

      {referralCode && (
        <Section title="Пригласить друга" icon={Gift}>
          <p className="text-xs text-secondary">
            Вы +14 дн. Premium · друг +7 дн. · приглашено: <b>{referralsCount}</b>
          </p>
          <button type="button" className="btn-primary mt-3 w-full text-xs" onClick={shareReferral}>
            Поделиться ссылкой
          </button>
          <p className="mt-2 break-all font-mono text-[10px] text-muted">{referralLink}</p>
        </Section>
      )}

      <Section title="Уведомления" icon={Bell}>
        <label className="flex cursor-pointer items-center justify-between gap-3">
          <span className="text-sm text-primary">Утренний и вечерний дайджест</span>
          <input
            type="checkbox"
            checked={proactive}
            onChange={(e) => saveProactive(e.target.checked)}
            className="h-5 w-5 rounded accent-mint"
          />
        </label>
        <p className="mt-2 text-[11px] text-muted">По вашему часовому поясу · только при важных задачах</p>
      </Section>

      <Section title="Часовой пояс" icon={Sun}>
        <select className="input-field w-full" value={tz} onChange={(e) => saveTz(e.target.value)}>
          {TIMEZONES.map((z) => (
            <option key={z} value={z}>
              {z}
            </option>
          ))}
        </select>
      </Section>

      <Section title="Экспорт" icon={Download}>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="glass-btn text-xs"
            onClick={() =>
              api.downloadExport("/export/ical", "navigai.ics").catch((e) =>
                showToast(e instanceof Error ? e.message : "Ошибка", "error")
              )
            }
          >
            Календарь (iCal)
          </button>
          <button
            type="button"
            className={cn("glass-btn text-xs", !isPremium && "opacity-60")}
            onClick={() =>
              isPremium
                ? api.downloadExport("/export/pdf", "navigai.pdf").catch(() => showToast("Ошибка", "error"))
                : showToast("PDF только для Premium", "info")
            }
          >
            PDF {isPremium ? "" : "(Premium)"}
          </button>
        </div>
      </Section>

      <section ref={privacyRef}>
        <Section title="Приватность" icon={Shield}>
          {privacy && (
            <>
              <ul className="space-y-1 text-xs text-muted">
                {privacy.stored_items.map((s) => (
                  <li key={s}>· {s}</li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-secondary">{privacy.retention_policy}</p>
            </>
          )}
          <button
            type="button"
            className="mt-4 w-full rounded-xl border border-red-500/30 bg-red-500/10 py-2.5 text-sm text-red-400"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="mr-2 inline h-4 w-4" />
            Удалить все данные
          </button>
        </Section>
      </section>

      <button type="button" className="glass-btn flex w-full items-center justify-center gap-2" onClick={onTheme}>
        {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        {theme === "dark" ? "Светлая тема" : "Тёмная тема"}
      </button>

      <Modal
        open={deleteOpen}
        title="Удалить все данные?"
        message="Задачи, расходы и напоминания будут удалены безвозвратно."
        confirmLabel="Удалить"
        danger
        onConfirm={async () => {
          try {
            await api.deleteAll();
            window.location.reload();
          } catch (e) {
            showToast(e instanceof Error ? e.message : "Ошибка", "error");
          }
        }}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  );
}
