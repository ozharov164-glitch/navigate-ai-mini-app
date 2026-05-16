import { useMemo, useState } from "react";
import { MapPin } from "lucide-react";
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
  const [failed, setFailed] = useState(false);

  const src = useMemo(() => {
    const path = previewFetchPath(url);
    const initData = getInitData();
    if (!path || !initData) return null;
    const sep = path.includes("?") ? "&" : "?";
    return `${apiBase()}${path}${sep}init=${encodeURIComponent(initData)}`;
  }, [url]);

  if (failed || !src) {
    return (
      <div
        className={`relative flex h-44 items-center justify-center bg-gradient-to-br from-cyan-500/15 via-indigo-500/10 to-navy-900 ${className ?? ""}`}
      >
        <MapPin className="h-10 w-10 text-accent/40" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt=""
      className={className ?? "h-44 w-full object-cover"}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
