import Link from "next/link";
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Eye, MessageCircle, PlusCircle, TicketCheck } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { getTicketsPage } from "@/lib/dashboard-data";
import { PageHeader } from "@/components/dashboard/page-header";
import { TicketDeleteButton } from "@/components/dashboard/ticket-delete-button";

const statusLabels: Record<string, string> = {
  open: "Open",
  in_progress: "In progress",
  pending: "Pending",
  resolved: "Resolved",
  closed: "Closed",
};

const priorityLabels: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

const categoryLabels: Record<string, string> = {
  technical_support: "Technical support",
  complaint: "Complaint",
  human_request: "Human request",
  booking_request: "Booking request",
  sales_request: "Sales request",
  ai_failed: "AI follow-up",
  general: "General",
};

function statusClass(status: string) {
  if (status === "open") return "bg-blue-50 text-blue-700 ring-blue-100";
  if (status === "in_progress") return "bg-indigo-50 text-indigo-700 ring-indigo-100";
  if (status === "pending") return "bg-amber-50 text-amber-700 ring-amber-100";
  if (status === "resolved") return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function priorityClass(priority: string) {
  if (priority === "urgent") return "bg-red-50 text-red-700 ring-red-100";
  if (priority === "high") return "bg-orange-50 text-orange-700 ring-orange-100";
  if (priority === "medium") return "bg-violet-50 text-violet-700 ring-violet-100";
  return "bg-slate-100 text-slate-600 ring-slate-200";
}

function pageHref(page: number, searchParams: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  if (searchParams.status) params.set("status", searchParams.status);
  if (searchParams.category) params.set("category", searchParams.category);
  if (searchParams.q) params.set("q", searchParams.q);
  return `/dashboard/tickets?${params.toString()}`;
}

export default async function TicketsPage({ searchParams }: { searchParams: Promise<{ page?: string; status?: string; category?: string; q?: string }> }) {
  const session = await requireSession();
  const params = await searchParams;
  const page = Math.max(1, Number(params.page || "1"));
  const data = await getTicketsPage(session.user.tenantId, {
    page,
    limit: 10,
    status: params.status,
    category: params.category,
    q: params.q,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tickets"
        description="A modern CRM card view for bookings, sales opportunities, support cases, complaints, and human handoff requests."
      />

      <section className="grid gap-4 md:grid-cols-4">
        <article className="panel bg-gradient-to-br from-blue-50 to-white p-5">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-100 text-blue-700"><TicketCheck size={20} /></div>
          <p className="text-sm text-slate-500">Open tickets</p>
          <p className="mt-1 text-3xl font-bold text-ink">{data.stats.openCount}</p>
        </article>
        <article className="panel bg-gradient-to-br from-rose-50 to-white p-5">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-100 text-rose-700"><PlusCircle size={20} /></div>
          <p className="text-sm text-slate-500">New today</p>
          <p className="mt-1 text-3xl font-bold text-ink">{data.stats.newCount}</p>
        </article>
        <article className="panel bg-gradient-to-br from-amber-50 to-white p-5">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-700"><Clock3 size={20} /></div>
          <p className="text-sm text-slate-500">Pending</p>
          <p className="mt-1 text-3xl font-bold text-ink">{data.stats.pendingCount}</p>
        </article>
        <article className="panel bg-gradient-to-br from-emerald-50 to-white p-5">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700"><CheckCircle2 size={20} /></div>
          <p className="text-sm text-slate-500">Resolved</p>
          <p className="mt-1 text-3xl font-bold text-ink">{data.stats.resolvedCount}</p>
        </article>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.tickets.length ? data.tickets.map((ticket) => (
          <article key={ticket.id} className="group rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Ticket #{ticket.number || "-"}</p>
                <Link href={`/dashboard/tickets/${ticket.id}`} className="mt-1 block text-lg font-black text-slate-950 group-hover:text-blue-700">
                  {ticket.subject || "Untitled ticket"}
                </Link>
              </div>
              <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ring-1 ${statusClass(ticket.status)}`}>
                {statusLabels[ticket.status] || ticket.status}
              </span>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${priorityClass(ticket.priority)}`}>{priorityLabels[ticket.priority] || ticket.priority}</span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{categoryLabels[ticket.category] || ticket.category}</span>
              <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-bold text-cyan-700">{ticket.channel || "channel"}</span>
            </div>

            <div className="space-y-2 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
              <p><span className="font-bold text-slate-900">Customer:</span> {ticket.requesterExternalId || "-"}</p>
              <p><span className="font-bold text-slate-900">Bot:</span> {ticket.botName || "-"}</p>
              <p className="flex gap-2"><AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-500" /> <span>{ticket.triggerReason || "CRM follow-up required"}</span></p>
              <p className="text-xs text-slate-400">Updated: {ticket.updatedAt ? new Date(ticket.updatedAt).toLocaleString() : "-"}</p>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <Link className="btn-secondary px-3 py-2 text-xs" href={`/dashboard/tickets/${ticket.id}`}><Eye size={15} /> View</Link>
              {ticket.conversationId ? (
                <Link className="btn-secondary px-3 py-2 text-xs" href={`/dashboard/conversations/${ticket.conversationId}`}><MessageCircle size={15} /> Conversation</Link>
              ) : null}
              <TicketDeleteButton ticketId={ticket.id} />
            </div>
          </article>
        )) : (
          <div className="panel col-span-full p-8 text-center text-sm text-slate-500">No tickets yet.</div>
        )}
      </section>

      <div className="panel flex items-center justify-between px-4 py-3 text-sm">
        <p className="text-slate-500">Page {data.page} of {data.totalPages} · Total {data.total}</p>
        <div className="flex gap-2">
          <Link className={`btn-secondary px-3 py-2 ${data.page <= 1 ? "pointer-events-none opacity-50" : ""}`} href={pageHref(Math.max(1, data.page - 1), params)}><ChevronRight size={16} /> Previous</Link>
          <Link className={`btn-secondary px-3 py-2 ${data.page >= data.totalPages ? "pointer-events-none opacity-50" : ""}`} href={pageHref(Math.min(data.totalPages, data.page + 1), params)}>Next <ChevronLeft size={16} /></Link>
        </div>
      </div>
    </div>
  );
}
