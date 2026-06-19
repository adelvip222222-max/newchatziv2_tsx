"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ClipboardCheck, MessageSquare, X } from "lucide-react";
import type { Socket } from "socket.io-client";
import { useI18n } from "@/components/i18n-provider";

type LiveToast = {
  id: string;
  conversationId: string;
  content: string;
  createdAt: string;
  provider: string;
  kind: "message" | "ticket" | "billing";
  contact: { name: string };
  ticket?: { id?: string; number?: number; subject?: string; priority?: string; category?: string };
};

type RealtimeMessagePayload = {
  message?: { id?: string; conversationId?: string; content?: string; createdAt?: string; direction?: string; provider?: string };
  conversation?: { id?: string };
  contact?: { name?: string; email?: string; phone?: string };
};

type RealtimeTicketPayload = {
  ticket?: { id?: string; number?: number; subject?: string; priority?: string; category?: string; createdAt?: string; updatedAt?: string };
  conversation?: { id?: string };
};

type RealtimeBillingPayload = { usage?: { percent?: number; remaining?: number; graceRemaining?: number; level?: string } };

type RealtimeEnvelope = { id?: string; type?: string; payload?: unknown; ts?: string };

const realtimeEventTypes = [
  "message.created",
  "notification.created",
  "ticket.created",
  "ticket.updated",
  "billing.usage.updated",
  "billing.usage.warning",
  "billing.usage.exceeded",
  "message.updated",
  "conversation.updated",
  "conversation.assigned",
  "conversation.deleted",
  "delivery.updated",
  "inbox.snapshot",
  "sync.required",
  "ready",
  "heartbeat",
  "error",
];

function parseLiveMessageFromPayload(rawPayload: unknown): LiveToast | null {
  const payload = rawPayload as RealtimeMessagePayload | null;
  if (!payload || typeof payload !== "object") return null;

  const message = payload.message || {};
  const conversationId = message.conversationId || payload.conversation?.id || "";
  const id = message.id || `${conversationId}-${message.createdAt || Date.now()}`;
  const direction = message.direction || "incoming";
  if (!conversationId || direction !== "incoming") return null;

  return {
    id,
    conversationId,
    content: message.content || "",
    createdAt: message.createdAt || new Date().toISOString(),
    provider: message.provider || "website",
    kind: "message",
    contact: { name: payload.contact?.name || payload.contact?.email || payload.contact?.phone || "Customer" },
  };
}

function parseLiveTicketFromPayload(rawPayload: unknown): LiveToast | null {
  const payload = rawPayload as RealtimeTicketPayload | null;
  if (!payload || typeof payload !== "object" || !payload.ticket?.id) return null;
  const ticket = payload.ticket;
  return {
    id: `ticket-${ticket.id}-${ticket.updatedAt || ticket.createdAt || Date.now()}`,
    conversationId: payload.conversation?.id || "",
    content: ticket.subject || "Ticket update",
    createdAt: ticket.updatedAt || ticket.createdAt || new Date().toISOString(),
    provider: "ticket",
    kind: "ticket",
    contact: { name: `#${ticket.number || ""}`.trim() || "Ticket" },
    ticket,
  };
}

function parseLiveBillingFromPayload(rawPayload: unknown): LiveToast | null {
  const payload = rawPayload as RealtimeBillingPayload | null;
  if (!payload || typeof payload !== "object" || !payload.usage) return null;
  const percent = payload.usage.percent ?? 0;
  const remaining = payload.usage.remaining ?? 0;
  return {
    id: `billing-${percent}-${remaining}-${Date.now()}`,
    conversationId: "",
    content: `usage:${percent}:${remaining}:${payload.usage.graceRemaining ?? 0}:${payload.usage.level || "warning"}`,
    createdAt: new Date().toISOString(),
    provider: "billing",
    kind: "billing",
    contact: { name: "Billing" },
  };
}

function parseSsePayload(event: MessageEvent) {
  try { return JSON.parse(event.data) as unknown; } catch { return event.data; }
}

export function RealtimeBridge() {
  const { locale } = useI18n();
  const [toast, setToast] = useState<LiveToast | null>(null);
  const seenIds = useRef<Set<string>>(new Set());
  const audioContextRef = useRef<AudioContext | null>(null);

  const playTone = (kind: "message" | "ticket") => {
    if (typeof window === "undefined") return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = audioContextRef.current || new AudioContextClass();
      audioContextRef.current = ctx;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(kind === "ticket" ? 0.22 : 0.16, ctx.currentTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + (kind === "ticket" ? 0.42 : 0.18));
      gain.connect(ctx.destination);

      const frequencies = kind === "ticket" ? [660, 990, 1320] : [880];
      frequencies.forEach((freq, index) => {
        const oscillator = ctx.createOscillator();
        oscillator.type = kind === "ticket" ? "triangle" : "sine";
        oscillator.frequency.value = freq;
        oscillator.connect(gain);
        const start = ctx.currentTime + index * 0.11;
        oscillator.start(start);
        oscillator.stop(start + (kind === "ticket" ? 0.11 : 0.18));
      });
    } catch {
      // Browser may block audio before first user interaction.
    }
  };

  useEffect(() => {
    let socket: Socket | null = null;
    let eventSource: EventSource | null = null;
    let fallbackStarted = false;
    let cancelled = false;
    let socketFallbackTimer: number | undefined;

    const handleRealtimePayload = (type: string, payload: unknown) => {
      window.dispatchEvent(new CustomEvent("chatzi:realtime-event", { detail: { type, payload } }));

      let item: LiveToast | null = null;
      if (type === "ticket.created" || type === "ticket.updated") item = parseLiveTicketFromPayload(payload);
      if (type === "billing.usage.updated" || type === "billing.usage.warning" || type === "billing.usage.exceeded") item = parseLiveBillingFromPayload(payload);
      if (type === "message.created" || type === "notification.created") item = parseLiveMessageFromPayload(payload);
      if (!item || seenIds.current.has(item.id)) return;

      seenIds.current.add(item.id);
      setToast(item);
      playTone(item.kind === "billing" ? "ticket" : item.kind);
      if (item.kind === "message") window.dispatchEvent(new CustomEvent("chatzi:incoming-message", { detail: item }));
    };

    const startSseFallback = () => {
      if (fallbackStarted || cancelled) return;
      fallbackStarted = true;
      eventSource = new EventSource("/api/realtime/stream");
      const forwardSse = (event: MessageEvent) => handleRealtimePayload(event.type, parseSsePayload(event));
      realtimeEventTypes.forEach((type) => eventSource?.addEventListener(type, forwardSse));
      eventSource.addEventListener("error", () => undefined);
    };

    const startSocket = async () => {
      try {
        const { io } = await import("socket.io-client");
        if (cancelled) return;
        socket = io({
          path: "/socket.io",
          withCredentials: true,
          transports: ["websocket", "polling"],
          timeout: 5000,
          reconnection: true,
          reconnectionAttempts: Infinity,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 8000,
        });
        socketFallbackTimer = window.setTimeout(() => { if (!socket?.connected) startSseFallback(); }, 3000);
        socket.on("connect", () => {
          if (socketFallbackTimer) window.clearTimeout(socketFallbackTimer);
          if (eventSource) { eventSource.close(); eventSource = null; fallbackStarted = false; }
        });
        socket.on("connect_error", () => startSseFallback());
        socket.on("realtime:event", (event: RealtimeEnvelope) => { if (event?.type) handleRealtimePayload(event.type, event.payload); });
        realtimeEventTypes.forEach((type) => socket?.on(type, (payload: unknown) => handleRealtimePayload(type, payload)));
      } catch { startSseFallback(); }
    };

    void startSocket();
    return () => {
      cancelled = true;
      if (socketFallbackTimer) window.clearTimeout(socketFallbackTimer);
      eventSource?.close();
      socket?.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), toast.kind === "ticket" || toast.kind === "billing" ? 8000 : 6000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  if (!toast) return null;

  const isTicket = toast.kind === "ticket";
  const isBilling = toast.kind === "billing";
  const billingParts = isBilling ? toast.content.split(":") : [];
  const billingPercent = billingParts[1] || "";
  const billingRemaining = billingParts[2] || "0";
  const href = isTicket && toast.ticket?.id
    ? `/dashboard/tickets/${toast.ticket.id}`
    : isBilling
    ? "/dashboard/billing"
    : toast.conversationId
    ? `/dashboard/conversations?conversationId=${toast.conversationId}`
    : "/dashboard/conversations";

  return (
    <div className="safe-bottom fixed inset-x-4 z-[70] bottom-[calc(6.5rem+env(safe-area-inset-bottom))] lg:bottom-4">
      <div className={`mx-auto flex max-w-md items-start gap-3 rounded-3xl border p-4 shadow-soft backdrop-blur ${isBilling ? "border-red-300 bg-red-50/95 dark:border-red-800 dark:bg-red-950/90" : isTicket ? "border-amber-200 bg-amber-50/95 dark:border-amber-800 dark:bg-amber-950/90" : "border-slate-200 bg-white/95 dark:border-slate-800 dark:bg-slate-950/95"}`}>
        <span className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${isBilling ? "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300" : isTicket ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" : "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300"}`}>
          {isTicket || isBilling ? <ClipboardCheck size={18} /> : <MessageSquare size={18} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">
            {isBilling ? (locale === "ar" ? "تنبيه رصيد رسائل AI" : "AI message usage warning") : isTicket ? (locale === "ar" ? "تذكرة جديدة أو محدثة" : "Ticket update") : `${locale === "ar" ? "رسالة جديدة من" : "New message from"} ${toast.contact.name}`}
          </p>
          <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">{isBilling ? (locale === "ar" ? `تم استخدام ${billingPercent}% من رسائل الباقة. المتبقي ${billingRemaining} رسالة قبل السماح.` : `${billingPercent}% of plan messages used. ${billingRemaining} messages left before grace.`) : toast.content}</p>
          <p className="mt-1 text-[11px] text-slate-400">{new Date(toast.createdAt).toLocaleString(locale === "ar" ? "ar-EG" : "en-US")}</p>
          <Link href={href} className="mt-3 inline-flex text-sm font-semibold text-indigo-600 dark:text-indigo-300">
            {isBilling ? (locale === "ar" ? "فتح صفحة الباقات" : "Open billing") : isTicket ? (locale === "ar" ? "فتح التذكرة" : "Open ticket") : (locale === "ar" ? "فتح المحادثة" : "Open conversation")}
          </Link>
        </div>
        <button type="button" onClick={() => setToast(null)} className="touch-target rounded-2xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200" aria-label={locale === "ar" ? "إغلاق" : "Dismiss"}>
          <X size={16} className="mx-auto" />
        </button>
      </div>
    </div>
  );
}
