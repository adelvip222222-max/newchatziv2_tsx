import Link from "next/link";
import { Activity } from "lucide-react";
import { requirePermission } from "@/server/auth/guards";
import { permissions } from "@/server/permissions/permissions";
import { getKnowledgeDashboardData } from "@/lib/knowledge";
import { getLocale } from "@/lib/i18n";
import { PageHeader } from "@/components/dashboard/page-header";
import { KnowledgeManager } from "@/components/dashboard/knowledge-manager";

export const dynamic = "force-dynamic";

export default async function KnowledgePage() {
  const session = await requirePermission(permissions.knowledgeManage);
  const [data, locale] = await Promise.all([getKnowledgeDashboardData(session.user.tenantId), getLocale()]);
  const isAr = locale === "ar";

  return (
    <>
      <PageHeader
        title={isAr ? "قاعدة المعرفة" : "Knowledge base"}
        description={
          isAr
            ? "اكتب أو ارفع معرفة النشاط دفعة واحدة، وسيتم استخراج النص وتصنيفه وتدريبه تلقائيًا."
            : "Write or upload business knowledge in bulk. Text is extracted, classified, and trained automatically."
        }
        action={
          <Link href="/dashboard/knowledge/health" className="btn-secondary">
            <Activity size={18} />
            {isAr ? "صحة المعرفة" : "Knowledge health"}
          </Link>
        }
      />
      <KnowledgeManager {...data} />
    </>
  );
}
