# Chatzi AI Speed, Mastra CRM, and SaaS Isolation Report

## الهدف
تحسين زمن رد الذكاء الاصطناعي وزمن وصول الرسالة للعميل، وتقوية استخدام Mastra كمنطق CRM، ومراجعة عزل المستأجرين SaaS بدون كسر البنية الحالية.

## أهم الاختناقات التي تم علاجها

1. **توازي ضعيف للـ AI والـ Outbound**
   - تم رفع القيم الافتراضية في `ecosystem.config.js`:
     - `AI_WORKER_CONCURRENCY=4`
     - `INGRESS_WORKER_CONCURRENCY=8`
     - `CORE_ROUTING_WORKER_CONCURRENCY=8`
     - `EGRESS_WORKER_CONCURRENCY=8`
     - `OUTBOUND_WORKER_CONCURRENCY=8`
   - أضفنا `OUTBOUND_WORKER_CONCURRENCY` فعليًا داخل `src/server/channels/outboundWorker.ts`.

2. **كل الرسائل كانت تمر بمسار ثقيل**
   - أضيف Fast Reply داخل `src/mastra/workflows/ai-reply.workflow.ts` قبل moderation/knowledge/model:
     - التحية البسيطة.
     - الشكر البسيط.
     - الأسئلة الواضحة خارج نطاق النشاط مثل الطقس والبرمجة.
   - هذه الحالات لا تستدعي RAG ولا الموديل، وبالتالي زمنها يجب أن يكون سريعًا جدًا.

3. **تأخير الإرسال بعد حفظ رد AI**
   - أصبح رد الـ AI يُحفظ بحالة `queued` بدل `sent`.
   - `egress-worker` يحول الرسالة إلى `sending` ثم `outbound-worker` يحولها إلى `sent` بعد نجاح القناة.
   - تم نشر `message.created` فور حفظ رد AI حتى يظهر في الواجهة فورًا.
   - تم نشر `delivery.updated` بعد إرسال الرسالة للقناة.

4. **صعوبة معرفة أين التأخير**
   - أضيف trace metadata داخل الرسائل مثل:
     - `aiStartedAt`
     - `aiPersistedAt`
     - `egressStartedAt`
     - `egressCompletedAt`
     - `outboundSentAt`
     - `outboundLatencyMs`

5. **Build problems مع ExcelJS/Recharts**
   - أضيفت dependencies ناقصة:
     - `@reduxjs/toolkit`
     - `util`
     - `bluebird`
     - `unzipper`
   - تم تحويل `exceljs` و `mammoth` إلى dynamic imports داخل `src/lib/knowledge.ts` حتى لا يتم تحميل parser ثقيل في كل API route أثناء build/runtime.
   - تم تحديث `next.config.ts` لإخراج مكتبات parsing الثقيلة من bundle server قدر الإمكان.

6. **Mastra كـ CRM حقيقي**
   - أضيفت tools جديدة:
     - `create-or-update-ticket`
     - `create-or-update-lead`
     - `get-customer-profile`
     - `summarize-conversation`
   - تم ربطها بـ `customer-support-agent`.
   - تم توسيع Working Memory لتخزين:
     - نية الحجز أو الشراء.
     - التذاكر أو العملاء المحتملين المفتوحة.
     - ملخص مفيد للفريق.

7. **SaaS isolation**
   - تم تعديل unique index في `WebhookEvent` ليصبح معزولًا بالمستأجر:
     - من: `{ provider, externalEventId }`
     - إلى: `{ tenantId, provider, externalEventId }`

## الملفات الرئيسية المعدلة

- `ecosystem.config.js`
- `package.json`
- `package-lock.json`
- `next.config.ts`
- `src/lib/knowledge.ts`
- `src/lib/queues/index.ts`
- `src/lib/models/webhook-event.ts`
- `src/server/channels/outboundQueue.ts`
- `src/server/channels/outboundWorker.ts`
- `workers/core-routing-worker.ts`
- `workers/ai-worker.ts`
- `workers/egress-worker.ts`
- `src/mastra/workflows/ai-reply.workflow.ts`
- `src/mastra/agents/customer-support.agent.ts`
- `src/mastra/tools/create-or-update-ticket.tool.ts`
- `src/mastra/tools/create-or-update-lead.tool.ts`
- `src/mastra/tools/get-customer-profile.tool.ts`
- `src/mastra/tools/summarize-conversation.tool.ts`

## أوامر التشغيل المقترحة

```bash
cd /opt/chatzi/app/newchatziv1_tsx_prod

rm -rf node_modules .next next.config.compiled.js
npm install
npm run typecheck
npm run build

mkdir -p logs
pm2 delete all 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save
pm2 status
```

## ملاحظات مهمة

- النسخة المضغوطة لا تحتوي على `.env` أو `.env.production` لحماية الأسرار. انسخ ملفات البيئة يدويًا إلى السيرفر.
- إذا كان لديك index قديم في MongoDB باسم `provider_1_externalEventId_1` على `webhookevents`، احذفه بعد أخذ backup ثم شغل التطبيق ليبني الفهرس الجديد.
- لا تستخدم `pm2 start npm -- start`؛ استخدم دائمًا `pm2 start ecosystem.config.js` لأن المشروع يعتمد على workers.

