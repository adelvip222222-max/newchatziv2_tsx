import Link from "next/link";
import { LifeBuoy, Mail, MessageSquareWarning } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";

export default function ComplaintsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="الشكاوي والدعم"
        description="صفحة مخصصة لتوجيه الشكاوي والمشكلات للفريق المسؤول، مع روابط سريعة للتذاكر والمحادثات."
      />

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="panel p-6">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
            <MessageSquareWarning size={22} />
          </span>
          <h2 className="mt-4 text-lg font-bold text-ink">متابعة الشكاوي</h2>
          <p className="mt-2 text-sm leading-7 text-slate-500">راجع التذاكر المصنفة كشكاوى وتابع حالتها حتى الإغلاق.</p>
          <Link href="/dashboard/tickets?category=complaint" className="btn-primary mt-5 w-full justify-center rounded-2xl">
            فتح تذاكر الشكاوي
          </Link>
        </article>

        <article className="panel p-6">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <LifeBuoy size={22} />
          </span>
          <h2 className="mt-4 text-lg font-bold text-ink">الدعم الفني</h2>
          <p className="mt-2 text-sm leading-7 text-slate-500">تابع المشكلات الفنية والطلبات التي تحتاج تدخل فريق الدعم.</p>
          <Link href="/dashboard/tickets?category=technical_support" className="btn-secondary mt-5 w-full justify-center rounded-2xl">
            فتح الدعم الفني
          </Link>
        </article>

        <article className="panel p-6">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <Mail size={22} />
          </span>
          <h2 className="mt-4 text-lg font-bold text-ink">تواصل مباشر</h2>
          <p className="mt-2 text-sm leading-7 text-slate-500">يمكنك إضافة بريد الدعم الرسمي من الإعدادات ليظهر هنا لاحقًا.</p>
          <Link href="/dashboard/settings" className="btn-secondary mt-5 w-full justify-center rounded-2xl">
            إعدادات التواصل
          </Link>
        </article>
      </section>
    </div>
  );
}
