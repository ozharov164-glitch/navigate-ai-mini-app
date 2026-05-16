import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { motion } from "framer-motion";
import { apiBase } from "@/lib/api";
import { getInitData } from "@/lib/telegram";

function previewFetchPath(staticMapUrl: string): string | null {
  if (!staticMapUrl) return null;
  const marker = "/dashboard/map-preview";
  try {
    const u = new URL(staticMapUrl);
    if (!u.pathname.includes(marker)) return null;
    return `${marker}${u.search}`;
  } catch {
    const i = staticMapUrl.indexOf(marker);
    return i >= 0 ? staticMapUrl.slice(i) : null;
  }
}

export function RouteMapPreview({ url, className }: { url: string; className?: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const path = previewFetchPath(url);
    if (!path) {
      setFailed(true);
      return;
    }

    let objectUrl: string | null = null;
    let cancelled = false;

    const initData = getInitData();
    if (!initData) {
      setFailed(true);
      return;
    }

    fetch(`${apiBase()}${path}`, {
      headers: { "X-Telegram-Init-Data": initData },
    })
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
        setFailed(false);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);

  if (failed) {
    return (
      <div
        className={`relative flex h-44 items-center justify-center bg-gradient-to-br from-cyan-500/15 via-indigo-500/10 to-navy-900 ${className ?? ""}`}
      >
        <MapPin className="h-10 w-10 text-accent/40" />
      </div>
    );
  }

  if (!src) {
    return (
      <motion.div
        className={`h-44 w-full animate-pulse bg-white/5 ${className ?? ""}`}
        initial={{ opacity: 0.4 }}
        animate={{ opacity: 0.7 }}
        transition={{ repeat: Infinity, duration: 1.2, repeatType: "reverse" }}
      />
    );
  }

  return (
    <img src={src} alt="" className={className ?? "h-44 w-full object-cover"} loading="lazy" />
  );
}
