import Link from "next/link";
import { ArrowLeft, BadgeDollarSign, Mail, Phone, Search, Sparkles, UserRound } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { Lead } from "@/lib/models";
import { PageHeader } from "@/components/dashboard/page-header";

export const dynamic = "force-dynamic";

function stageLabel(stage: string) {
  const labels: Record<string, string> = {
    new: "جديد",
    qualified: "مؤهل",
    proposal: "عرض سعر",
    negotiation: "تفاوض",
    won: "مكتسب",
    lost: "مفقود",
  };
  return labels[stage] || stage;
}

function stageClass(stage: string) {
  if (stage === "won") return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  if (stage === "qualified" || stage === "proposal") return "bg-indigo-50 text-indigo-700 ring-indigo-100";
  if (stage === "negotiation") return "bg-amber-50 text-amber-700 ring-amber-100";
  if (stage === "lost") return "bg-slate-100 text-slate-600 ring-slate-200";
  return "bg-blue-50 text-blue-700 ring-blue-100";
}

function pageHref(page: number, q?: string) {
  const params = new URLSearchParams({ page: String(page) });
  if (q) params.set("q", q);
  return `/dashboard/leads?${params.toString()}`;
}

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ page?: string; q?: string }> }) {
  const session = await requireSession();
  const params = await searchParams;
  const tenantId = session.user.tenantId;
  const page = Math.max(1, Number(params.page || "1"));
  const limit = 20;
  const skip = (page - 1) * limit;
  const q = (params.q || "").trim();

  await connectToDatabase();

  const filter: Record<string, any> = { tenantId };
  if (q) {
    filter.$or = [
      { name: { $regex: q, $options: "i" } },
      { email: { $regex: q, $options: "i" } },
      { phone: { $regex: q, $options: "i" } },
      { interest: { $regex: q, $options: "i" } },
      { company: { $regex: q, $options: "i" } },
    ];
  }

  const [leads, total, newCount, qualifiedCount, wonCount] = await Promise.all([
    Lead.find(filter).sort({ updatedAt: -1, createdAt: -1 }).skip(skip).limit(limit).lean(),
    Lead.countDocuments(filter),
    Lead.countDocuments({ tenantId, stage: "new" }),
    Lead.countDocuments({ tenantId, stage: { $in: ["qualified", "proposal", "negotiation"] } }),
    Lead.countDocuments({ tenantId, stage: "won" }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-6">
      <PageHeader
        title="العملاء المحتملون"
        description="يتم إنشاء هذه البيانات تلقائيًا من التذاكر عند حفظ طلب حجز أو مبيعات أو دعم مع بيانات تواصل."
      />

      <section className="grid gap-4 md:grid-cols-3">
        <article className="panel bg-gradient-to-br from-blue-50 to-white p-5">
          <UserRound className="text-blue-600" size={24} />
          <p className="mt-4 text-sm text-slate-500">جدد</p>
          <p className="mt-1 text-3xl font-black text-ink">{newCount}</p>
        </article>
        <article className="panel bg-gradient-to-br from-indigo-50 to-white p-5">
          <Sparkles className="text-indigo-600" size={24} />
          <p className="mt-4 text-sm text-slate-500">مؤهلون / قيد البيع</p>
          <p className="mt-1 text-3xl font-black text-ink">{qualifiedCount}</p>
        </article>
        <article className="panel bg-gradient-to-br from-emerald-50 to-white p-5">
          <BadgeDollarSign className="text-emerald-600" size={24} />
          <p className="mt-4 text-sm text-slate-500">مكتسبون</p>
          <p className="mt-1 text-3xl font-black text-ink">{wonCount}</p>
        </article>
      </section>

      <form className="panel flex flex-col gap-3 p-4 sm:flex-row">
        <label className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            name="q"
            defaultValue={q}
            className="w-full rounded-2xl border border-slate-200 bg-white py-3 pr-10 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
            placeholder="ابحث بالاسم، الهاتف، البريد، أو الاهتمام"
          />
        </label>
        <button className="btn-primary rounded-2xl px-5 py-3" type="submit">بحث</button>
      </form>

      <section className="grid gap-4 xl:grid-cols-2">
        {leads.map((lead: any) => (
          <article key={lead._id.toString()} className="panel p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="truncate text-lg font-bold text-ink">{lead.name || lead.phone || lead.email || "عميل محتمل"}</h2>
                <p className="mt-1 text-sm text-slate-500">{lead.interest || "تم إنشاؤه من تذكرة"}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${stageClass(lead.stage)}`}>{stageLabel(lead.stage)}</span>
            </div>

            <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
              <p className="flex items-center gap-2 text-slate-600"><Phone size={15} /> {lead.phone || "لا يوجد هاتف"}</p>
              <p className="flex items-center gap-2 text-slate-600"><Mail size={15} /> {lead.email || "لا يوجد بريد"}</p>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-500">
              <span>{lead.sourceChannel || "unknown"} · Score {lead.score || 0}</span>
              {lead.conversationId ? (
                <Link className="inline-flex items-center gap-1 font-bold text-indigo-600" href={`/dashboard/conversations/${lead.conversationId.toString()}`}>
                  فتح المحادثة <ArrowLeft size={14} />
                </Link>
              ) : null}
            </div>
          </article>
        ))}
      </section>

      {!leads.length ? <p className="panel p-8 text-center text-sm text-slate-500">لا يوجد عملاء محتملون بعد.</p> : null}

      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>الصفحة {page} من {totalPages} · إجمالي {total}</span>
        <div className="flex gap-2">
          <Link className={`btn-secondary px-4 py-2 ${page <= 1 ? "pointer-events-none opacity-50" : ""}`} href={pageHref(Math.max(1, page - 1), q)}>السابق</Link>
          <Link className={`btn-secondary px-4 py-2 ${page >= totalPages ? "pointer-events-none opacity-50" : ""}`} href={pageHref(Math.min(totalPages, page + 1), q)}>التالي</Link>
        </div>
      </div>
    </div>
  );
}
