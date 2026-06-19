"use client";

import { useEffect, useState } from "react";
import { Bot, Globe, Mail, MessageCircle, Send, Smartphone } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";

type SidebarCounts = {
  conversations: {
    active: number;
    byChannel: Array<{ channel: string; count: number }>;
  };
  tickets: {
    open: number;
    new: number;
  };
};

const initialCounts: SidebarCounts = {
  conversations: { active: 0, byChannel: [] },
  tickets: { open: 0, new: 0 },
};

function ProviderIcon({ provider, size = 13 }: { provider: string; size?: number }) {
  const normalized = provider.toLowerCase();
  const props = { size, className: "shrink-0" };
  if (normalized === "telegram") return <Send {...props} />;
  if (normalized === "whatsapp") return <Smartphone {...props} />;
  if (normalized === "facebook" || normalized === "instagram") return <MessageCircle {...props} />;
  if (normalized === "email") return <Mail {...props} />;
  if (normalized === "api" || normalized === "webhook") return <Bot {...props} />;
  return <Globe {...props} />;
}

export function SidebarCountsPanel({ collapsed }: { collapsed: boolean }) {
  const { locale } = useI18n();
  const isAr = locale === "ar";
  const [counts, setCounts] = useState<SidebarCounts>(initialCounts);

  async function loadCounts() {
    try {
      const response = await fetch("/api/dashboard/sidebar-counts", { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as SidebarCounts;
      setCounts(data);
    } catch {
      // keep existing values
    }
  }

  useEffect(() => {
    loadCounts();
    const onRealtime = () => loadCounts();
    window.addEventListener("chatzi:realtime-event", onRealtime);
    const interval = window.setInterval(loadCounts, 30_000);
    return () => {
      window.removeEventListener("chatzi:realtime-event", onRealtime);
      window.clearInterval(interval);
    };
  }, []);

  if (collapsed) {
    return null;
  }

  const topChannels = counts.conversations.byChannel.slice(0, 5);

  return (
    <div className="mt-1 space-y-2 px-2 pb-2">
      {topChannels.length ? (
        <div className="grid grid-cols-3 gap-2 rounded-2xl border border-white/5 bg-white/[0.035] p-2">
          {topChannels.map((item) => (
            <div key={item.channel} className="relative flex flex-col items-center rounded-xl bg-white/[0.04] px-2 py-2 text-center text-slate-300">
              <span className="absolute -top-1.5 rounded-full bg-indigo-500 px-1.5 text-[10px] font-black leading-4 text-white shadow-sm">
                {item.count}
              </span>
              <span className="mt-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-indigo-200">
                <ProviderIcon provider={item.channel} />
              </span>
              <span className="mt-1 max-w-full truncate text-[10px] font-semibold capitalize text-slate-400">
                {item.channel}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2 rounded-2xl border border-amber-400/10 bg-amber-400/[0.07] p-2 text-[11px] font-bold">
        <div className="rounded-xl bg-white/[0.05] px-2 py-2 text-center text-amber-100">
          <span className="block text-[10px] text-amber-200/70">{isAr ? "تذاكر مفتوحة" : "Open"}</span>
          <span className="mt-1 block text-lg leading-none">{counts.tickets.open}</span>
        </div>
        <div className="rounded-xl bg-white/[0.05] px-2 py-2 text-center text-rose-100">
          <span className="block text-[10px] text-rose-200/70">{isAr ? "جديدة اليوم" : "New"}</span>
          <span className="mt-1 block text-lg leading-none">{counts.tickets.new}</span>
        </div>
      </div>
    </div>
  );
}
