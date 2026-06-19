# NewChatwot AI-First CRM Roadmap

## Purpose

This roadmap extends the existing NewChatwot codebase into a production AI-first CRM, customer support desk, omnichannel inbox, and SaaS platform. It assumes the current stack stays in place: Next.js 15 App Router, TypeScript, MongoDB, Mongoose, NextAuth, TailwindCSS, Stripe Billing, tenant-aware models, AI bots, knowledge bases, conversations, messages, and channels.

## Current Foundation To Preserve

- Dashboard routes live under `src/app/dashboard`.
- Tenant-owned records already exist for tenants, users, bots, AI settings, knowledge bases, channels, conversations, messages, subscriptions, billing plans, and webhook logs.
- Current roles are `owner`, `admin`, and `agent`.
- Current channels are `website`, `telegram`, `whatsapp`, `facebook`, and `webhook`.
- The dashboard shell, sidebar, theme provider, billing provider, i18n provider, and theme token files already exist.

## Core Architecture Rules

- Do not rebuild from scratch.
- Every tenant-owned model must include `tenantId`.
- Never accept `tenantId` from dashboard client payloads. Resolve it from the authenticated session.
- Webhooks must resolve tenant ownership from signed channel credentials.
- Every list API must include pagination, filtering allowlists, and tenant-scoped indexes.
- Every write path must include Zod validation, permission checks, and audit/event logging.
- Every dashboard page must include loading, empty, error, and mobile states.
- Billing entitlements must be enforced server-side.

## Target Navigation

Primary dashboard modules:

- Home
- Inbox
- Contacts
- Companies
- Sales
- Tasks
- Automations
- AI
- Knowledge Base
- Reports
- Channels
- Billing
- Settings

Workspace utilities:

- Global search
- Command palette
- Quick actions
- Notifications center
- Tenant switcher
- User menu
- Light/dark mode switcher

Recommended feature structure:

```text
src/features/crm
src/features/inbox
src/features/support
src/features/sales
src/features/ai
src/features/automation
src/features/reports
src/features/saas
src/components/ui
src/components/layout
src/server/actions
src/server/permissions
src/server/validators
```

## Phase 0 - Enterprise Design System

Business requirements:

- Create a clean, dense, enterprise SaaS interface inspired by Chatwoot, Intercom, Linear, Vercel, and Notion.
- Preserve the existing theme token architecture in `src/lib/theme`.
- Support light mode, dark mode, responsive layouts, Arabic/English UI, and WCAG AA contrast.

Design tokens:

- Color roles: `background`, `surface`, `surfaceRaised`, `border`, `text`, `muted`, `accent`, `accentForeground`, `success`, `warning`, `danger`, `info`.
- Typography roles: `display`, `heading`, `body`, `label`, `mono`.
- Spacing: 4px base scale; 16px mobile shell padding, 24px tablet shell padding, 32px desktop shell padding.
- Radius: 6px controls, 8px repeated cards, 12px dialogs and drawers.
- Shadows: border-first UI; use shadows only for popovers, menus, drawers, dialogs, and command palette.
- Icons: lucide-react for standard actions, with accessible labels and tooltips for icon-only buttons.

Reusable components:

- `DataTable`
- `DataToolbar`
- `FilterBar`
- `SearchInput`
- `SegmentedControl`
- `MetricCard`
- `KpiBlock`
- `EmptyState`
- `ErrorState`
- `LoadingState`
- `ConfirmDialog`
- `SideDrawer`
- `CommandPalette`
- `NotificationPopover`
- `ActivityTimeline`
- `ChatBubble`
- `ContactCard`
- `UserAvatar`
- `StatusBadge`
- `PriorityBadge`
- `TagPicker`
- `AssigneePicker`

Component standards:

- Tables support sorting, selection, pagination, sticky headers, row actions, empty states, and bulk actions.
- Forms use Zod schemas, field-level errors, disabled states, optimistic save states, and dirty-state warnings.
- Modals are reserved for confirmation and focused short tasks.
- Drawers are preferred for create/edit flows inside CRM and inbox contexts.
- Cards are used for repeated records and metrics only.
- Empty states include one primary action and one secondary action at most.
- Error states preserve user filters and include retry.

## Phase 1 - Dashboard UX

Business requirements:

- Build a workspace shell for daily support, sales, AI, and admin operations.
- Make search, quick creation, notifications, tenant switching, and user settings available globally.

Desktop wireframe:

```text
+----------------+--------------------------------------------------+
| Sidebar        | Header: search, quick actions, alerts, tenant    |
| Home           +--------------------------------------------------+
| Inbox          | Page header: title, tabs, primary action         |
| Contacts       +--------------------------------------------------+
| Sales          | Toolbar: filters, saved views, bulk actions      |
| AI             +--------------------------------------------------+
| Reports        | Page content                                     |
| Settings       |                                                  |
+----------------+--------------------------------------------------+
```

Mobile wireframe:

```text
+--------------------------------+
| Header: menu, title, search     |
+--------------------------------+
| Tabs or primary page actions    |
+--------------------------------+
| Content                         |
+--------------------------------+
| Optional bottom action bar      |
+--------------------------------+
```

Backend:

- `GET /api/search`
- `GET /api/notifications`
- `PATCH /api/notifications/:id/read`
- `GET /api/quick-actions/context`

Permissions:

- Authenticated users can search permitted records.
- Owners and admins manage tenant, billing, and settings.
- Agents see assigned or team-visible records unless policy grants all inbox access.

Scalability:

- Start with MongoDB text indexes.
- Move to a normalized tenant-scoped search collection before adding an external search service.

## Phase 2 - CRM Foundation

Business requirements:

- Add contacts and companies as first-class tenant records.
- Connect contacts to conversations, notes, tags, imports, exports, sales, tasks, and activity.

Database schema:

```text
Contact
- tenantId
- ownerId
- primaryEmail
- primaryPhone
- name
- avatarUrl
- lifecycleStage
- status
- tags
- source
- companyId
- customFields
- lastSeenAt
- lastContactedAt
- createdById
- updatedById

Company
- tenantId
- ownerId
- name
- domain
- industry
- size
- lifecycleStage
- tags
- customFields
- createdById
- updatedById

ContactNote
- tenantId
- contactId
- authorId
- body
- visibility

ContactSegment
- tenantId
- name
- description
- rules
- createdById

ContactImport
- tenantId
- status
- fileName
- totalRows
- processedRows
- errorRows
- mapping
- createdById
```

MongoDB indexes:

- `Contact`: `{ tenantId: 1, primaryEmail: 1 }`
- `Contact`: `{ tenantId: 1, primaryPhone: 1 }`
- `Contact`: `{ tenantId: 1, name: "text", primaryEmail: "text", primaryPhone: "text" }`
- `Company`: `{ tenantId: 1, domain: 1 }`
- `Company`: `{ tenantId: 1, name: "text" }`

API routes and server actions:

- `GET/POST /api/contacts`
- `GET/PATCH/DELETE /api/contacts/:id`
- `POST /api/contacts/import`
- `GET /api/contacts/export`
- `POST /api/contacts/bulk`
- `GET/POST /api/companies`
- `GET/PATCH/DELETE /api/companies/:id`
- `createContact`, `updateContact`, `mergeContacts`, `bulkTagContacts`
- `createCompany`, `updateCompany`, `linkContactToCompany`

Permissions:

- `crm.contact.read`
- `crm.contact.write`
- `crm.contact.delete`
- `crm.contact.import`
- `crm.company.read`
- `crm.company.write`
- `crm.company.delete`

Pages:

- `/dashboard/contacts`: searchable table, filters, segments, import/export, bulk actions.
- `/dashboard/contacts/new`: create contact drawer or page.
- `/dashboard/contacts/[id]`: profile, timeline, conversations, notes, deals, tasks, custom fields.
- `/dashboard/contacts/[id]/edit`: edit form.
- `/dashboard/companies`: company table.
- `/dashboard/companies/[id]`: company profile, contacts, notes, deals, activity.

Contact details wireframe:

```text
+----------------------+-----------------------------+----------------+
| Identity card        | Timeline tabs               | Context panel  |
| Name, channels, tags | Activity, conversations     | Company        |
| Owner, lifecycle     | Notes, deals, tasks         | Custom fields  |
+----------------------+-----------------------------+----------------+
```

States:

- Empty: create contact, import CSV/XLSX, connect channels.
- Loading: table skeleton and profile skeleton.
- Error: retry while preserving filters.
- Mobile: card list, sticky search, profile sections as tabs.

Scalability:

- Use cursor pagination for contacts.
- Run imports and exports as background jobs.
- Avoid unbounded regex search.

## Phase 3 - Support Desk

Business requirements:

- Make conversations assignable, searchable, prioritized, and team-routable.
- Support internal notes, mentions, canned responses, labels, statuses, SLAs, and saved views.

Conversation model extensions:

```text
Conversation
- contactId
- companyId
- assigneeId
- teamId
- priority
- labels
- lastMessageAt
- lastCustomerMessageAt
- lastAgentMessageAt
- unreadCount
- slaPolicyId
- firstResponseDueAt
- resolutionDueAt
```

New models:

```text
Team
- tenantId
- name
- description
- memberIds

ConversationNote
- tenantId
- conversationId
- authorId
- body
- mentionUserIds

CannedResponse
- tenantId
- title
- shortcut
- body
- tags
- visibility

SavedView
- tenantId
- ownerId
- name
- scope
- filters
- sort

SlaPolicy
- tenantId
- name
- rules
- businessHours
```

API routes:

- `GET /api/inbox/conversations`
- `PATCH /api/conversations/:id/assignment`
- `PATCH /api/conversations/:id/priority`
- `PATCH /api/conversations/:id/labels`
- `POST /api/conversations/:id/notes`
- `GET/POST /api/canned-responses`
- `GET/POST /api/saved-views`
- `GET/POST /api/teams`

Permissions:

- `inbox.read`
- `inbox.reply`
- `inbox.assign`
- `inbox.note`
- `inbox.manage_views`
- `settings.teams.manage`

Inbox wireframe:

```text
+----------------+----------------------+---------------------+
| Views/filters  | Conversation list    | Conversation panel  |
| Open           | Search, sort, counts | Header, messages    |
| Assigned to me | Customer, preview    | Composer, notes     |
| Team queues    | SLA, priority        | Right sidebar       |
+----------------+----------------------+---------------------+
```

Search and filtering:

- Status, assignee, team, channel, label, priority, SLA breach, unread, sentiment, date range.
- Saved views support personal and shared scopes.

Production readiness:

- Event-log assignment, status, priority, label, and note changes.
- Use optimistic UI for low-risk state changes.
- Rate-limit message sends and note creation.

## Phase 4 - Omnichannel Inbox

Business requirements:

- Normalize website, WhatsApp, Telegram, Facebook, Instagram, email, and API messages into one inbox.
- Preserve provider-specific metadata without leaking it into the core domain model.

Channel model changes:

- Add channel types: `instagram`, `email`, `api`.
- Add encrypted credentials, webhook secret, health status, last sync time, and sync errors.
- Standardize external ids in message metadata.

New models:

```text
ChannelIdentity
- tenantId
- channelId
- contactId
- externalUserId
- displayName
- profileUrl

ConversationMerge
- tenantId
- sourceConversationId
- targetConversationId
- performedById
- reason

ContactMerge
- tenantId
- sourceContactId
- targetContactId
- performedById
- reason
```

API routes:

- `POST /api/channels/:type/connect`
- `POST /api/channels/:type/disconnect`
- `POST /api/channels/:type/test`
- `POST /api/channels/:type/webhook`
- `POST /api/conversations/:id/merge`
- `POST /api/contacts/:id/merge`

UX:

- Channel indicators in the inbox list and message timeline.
- Typing indicators, online status, delivery states, read states, and unread counters.
- Contact merge drawer with field-by-field comparison.
- Conversation merge preview before commit.

Scalability:

- Deduplicate webhooks by tenant, channel, and external message id.
- Queue outbound sends and retries.
- Use a realtime abstraction that can start with polling and later move to SSE, WebSocket, Pusher, or Ably.

## Phase 5 - Sales CRM

Business requirements:

- Add leads, deals, pipelines, stages, tasks, meetings, and sales activity.
- Connect sales records to contacts, companies, conversations, and AI qualification.

Database schema:

```text
Lead
- tenantId
- contactId
- companyId
- ownerId
- source
- status
- score
- qualification

Pipeline
- tenantId
- name
- isDefault

PipelineStage
- tenantId
- pipelineId
- name
- order
- probability

Deal
- tenantId
- pipelineId
- stageId
- contactId
- companyId
- ownerId
- title
- value
- currency
- status
- expectedCloseDate

Task
- tenantId
- ownerId
- relatedType
- relatedId
- title
- dueAt
- status
- priority

Meeting
- tenantId
- ownerId
- contactId
- companyId
- title
- startsAt
- endsAt
- location

Activity
- tenantId
- actorId
- subjectType
- subjectId
- type
- body
- metadata
```

API routes:

- `GET/POST /api/leads`
- `GET/POST /api/deals`
- `PATCH /api/deals/:id/stage`
- `GET/POST /api/pipelines`
- `GET/POST /api/tasks`
- `GET/POST /api/meetings`
- `GET /api/activities`

Pages:

- `/dashboard/sales`: sales dashboard.
- `/dashboard/sales/pipeline`: Kanban pipeline board.
- `/dashboard/sales/deals/[id]`: deal workspace.
- `/dashboard/tasks`: task list and calendar-style views.

Pipeline wireframe:

```text
+------------+------------+------------+------------+
| New        | Qualified  | Proposal   | Won/Lost   |
| Deal card  | Deal card  | Deal card  | Deal card  |
| Deal card  | Deal card  | Deal card  | Deal card  |
+------------+------------+------------+------------+
```

Permissions:

- `sales.read`
- `sales.write`
- `sales.pipeline_manage`
- `tasks.read`
- `tasks.write`

Production readiness:

- Drag/drop stage changes must be transactional and event logged.
- Deal values need tenant currency defaults.
- Activities should become the shared timeline model across CRM, sales, support, and AI.

## Phase 6 - AI Platform

Business requirements:

- Turn existing AI bot and knowledge functionality into a supervised copilot platform.
- Track cost, latency, quality, confidence, usage, and failures.

Existing models to reuse:

- `Bot`
- `AiSetting`
- `KnowledgeCollection`
- `KnowledgeDocument`
- `KnowledgeChunk`
- `AiModel`

New models:

```text
AiPromptTemplate
- tenantId
- name
- type
- systemPrompt
- userPrompt
- variables
- version

AiRun
- tenantId
- botId
- userId
- conversationId
- type
- provider
- model
- inputTokens
- outputTokens
- latencyMs
- status
- error

AiInsight
- tenantId
- subjectType
- subjectId
- type
- value
- confidence

BotPersonality
- tenantId
- botId
- name
- tone
- rules
- examples
```

Capabilities:

- AI copilot in the inbox composer.
- Suggested replies.
- Conversation summaries.
- Auto classification for intent, sentiment, priority, topic, and language.
- Lead qualification and scoring.
- Knowledge base RAG with citation controls.
- Bot personality configuration.
- Prompt builder with version history.
- AI analytics for usage, cost, latency, deflection, and quality.

API routes:

- `POST /api/ai/copilot/reply`
- `POST /api/ai/conversations/:id/summary`
- `POST /api/ai/classify`
- `POST /api/ai/leads/:id/qualify`
- `GET/POST /api/ai/prompts`
- `GET /api/ai/runs`
- `GET /api/ai/analytics`

Pages:

- `/dashboard/ai`: AI overview.
- `/dashboard/ai/settings`: provider, model, safety, language, fallback.
- `/dashboard/ai/prompts`: prompt templates and versions.
- `/dashboard/ai/bots`: bot configuration and personality.
- `/dashboard/ai/analytics`: usage, cost, latency, quality.
- `/dashboard/knowledge`: expanded knowledge manager, health, retraining, gaps, sources.

Production readiness:

- Encrypt API keys.
- Do not expose sensitive prompt contents in broad admin analytics.
- Add moderation and policy checks before automated replies.
- Require human confirmation for high-risk AI actions.

## Phase 7 - Automation Builder

Business requirements:

- Give tenants a visual workflow builder for routing, tagging, follow-up, tasks, and webhooks.
- Keep execution visible and auditable.

Database schema:

```text
Workflow
- tenantId
- name
- description
- status
- trigger
- nodes
- edges
- version
- createdById

WorkflowRun
- tenantId
- workflowId
- subjectType
- subjectId
- status
- startedAt
- finishedAt
- error

WorkflowRunStep
- tenantId
- workflowRunId
- nodeId
- action
- status
- input
- output
- error
```

Triggers:

- Message received.
- Conversation created.
- Tag added.
- Lead created.
- Status changed.
- Deal stage changed.
- AI classification completed.

Actions:

- Assign agent.
- Assign team.
- Send message.
- Add tag.
- Create task.
- Call webhook.
- Update field.
- Notify user.

Pages:

- `/dashboard/automations`: workflow list.
- `/dashboard/automations/new`: workflow editor.
- `/dashboard/automations/[id]`: canvas, inspector, validation, publish controls.
- `/dashboard/automations/[id]/runs`: execution logs.

API routes:

- `GET/POST /api/workflows`
- `GET/PATCH/DELETE /api/workflows/:id`
- `POST /api/workflows/:id/test`
- `GET /api/workflows/:id/runs`

Production readiness:

- Run workflows in background jobs.
- Enforce loop protection and action rate limits.
- Version workflows so historical runs stay immutable.

## Phase 8 - Reports And Analytics

Business requirements:

- Report on support quality, sales performance, AI impact, usage, satisfaction, and revenue.

Dashboards:

- Conversations: volume, first response, resolution, reopen rate.
- Agents: workload, response time, resolution time, CSAT.
- Teams: backlog, SLA, routing, queue health.
- Channels: volume, conversion, response quality.
- AI usage: deflection, suggested reply acceptance, token cost, latency.
- Customer satisfaction: CSAT, sentiment trend, survey responses.
- Sales: pipeline value, win rate, conversion, forecast.
- Revenue: MRR, usage, plan distribution, churn indicators.

Database schema:

```text
MetricSnapshot
- tenantId
- scope
- period
- values

CsatSurvey
- tenantId
- conversationId
- contactId
- score
- comment

ReportExport
- tenantId
- reportType
- filters
- status
- fileUrl
- createdById
```

API routes:

- `GET /api/reports/conversations`
- `GET /api/reports/agents`
- `GET /api/reports/channels`
- `GET /api/reports/ai`
- `GET /api/reports/sales`
- `GET /api/reports/revenue`
- `POST /api/reports/export`

Pages:

- `/dashboard/reports`: executive overview.
- `/dashboard/reports/conversations`
- `/dashboard/reports/agents`
- `/dashboard/reports/channels`
- `/dashboard/reports/ai`
- `/dashboard/reports/sales`
- `/dashboard/reports/revenue`

UX:

- Date range picker.
- Team, agent, channel, tag, bot, and plan filters.
- KPI row, charts, detail table, CSV/XLSX export.

Scalability:

- Use hourly and daily snapshots for expensive metrics.
- Keep raw analytics append-only.
- Cache common dashboard queries per tenant and filter set.

## Phase 9 - SaaS Management

Business requirements:

- Complete billing, usage limits, tenant branding, white label controls, and custom domains.

Existing models to reuse:

- `BillingPlan`
- `MessagePack`
- `TenantSubscription`
- `PaymentEvent`

New models:

```text
TenantSettings
- tenantId
- brandName
- logoUrl
- accentColor
- supportEmail
- locale
- timezone

UsageLedger
- tenantId
- metric
- quantity
- source
- period
- metadata

CustomDomain
- tenantId
- hostname
- status
- verificationToken
- verifiedAt

PlanEntitlement
- planId
- feature
- limit
- behavior
```

API routes:

- `GET /api/billing/usage`
- `GET /api/billing/entitlements`
- `PATCH /api/settings/branding`
- `GET/POST /api/settings/domains`
- `POST /api/settings/domains/:id/verify`

Pages:

- `/dashboard/billing`: plan, invoices, payment method, usage.
- `/dashboard/billing/plans`: plan comparison.
- `/dashboard/settings/branding`: logo, color, widget brand.
- `/dashboard/settings/domains`: custom domain setup and verification.
- `/dashboard/settings/usage`: limits and usage history.

Production readiness:

- Enforce entitlements before feature execution.
- Keep usage ledger append-only.
- Verify DNS before custom domain activation.

## Cross-Cutting Architecture

Permission model:

```text
Role
- tenantId
- name
- permissions
- isSystem

UserRoleAssignment
- tenantId
- userId
- roleId
- teamId
```

Default roles:

- Owner: all tenant permissions.
- Admin: all tenant permissions except ownership transfer and tenant deletion.
- Agent: inbox, contacts read, own tasks, limited reports.
- Sales: contacts, companies, leads, deals, tasks.
- Analyst: reports read-only.

Audit events:

```text
AuditEvent
- tenantId
- actorId
- action
- subjectType
- subjectId
- before
- after
- ip
- userAgent
```

Use audit events for permissions, billing, assignment, automation, AI settings, merges, exports, and deletion.

Validation rules:

- Use one Zod schema per route or server action.
- Reject unknown fields on writes.
- Normalize email, phone, tags, dates, and ObjectIds before persistence.
- Validate custom fields against tenant-defined schemas.

Background jobs:

- Required for imports, exports, AI batch classification, workflow execution, report snapshots, channel retries, and billing aggregation.
- Start with a simple adapter, then move to BullMQ, Inngest, Trigger.dev, or another managed queue.

Migration strategy:

- Add optional fields first.
- Backfill existing conversations and messages.
- Create indexes in background.
- Switch UI to new fields after backfill.
- Enforce required fields only after data is clean.

## Final Implementation Order

Development order:

1. Design system primitives and dashboard shell.
2. Permission registry, validation helpers, and tenant guards.
3. Contacts and companies.
4. Activity timeline and audit events.
5. Support desk assignment, teams, notes, canned responses, saved views.
6. Omnichannel identity normalization and merge flows.
7. Sales CRM pipelines, deals, tasks, meetings.
8. AI copilot, AI runs, insights, prompt templates.
9. Automation builder and execution engine.
10. Reports snapshots and exports.
11. SaaS entitlements, branding, custom domains, and usage ledger.

UI design order:

1. Shell, navigation, command palette, notifications.
2. Shared UI components and page states.
3. Contacts list, detail, create, edit.
4. Inbox list and conversation workspace.
5. Sales pipeline and deal detail.
6. AI settings, prompt builder, knowledge base.
7. Automation canvas.
8. Reports dashboards.
9. Billing and settings.

Backend order:

1. Permission and validation infrastructure.
2. CRM models and APIs.
3. Activity and audit events.
4. Inbox model extensions and APIs.
5. Channel normalization.
6. Sales models and APIs.
7. AI run tracking and copilot APIs.
8. Workflow engine.
9. Analytics snapshots.
10. Usage ledger and entitlements.

Database migration order:

1. Add CRM collections.
2. Extend conversation and message metadata.
3. Add team, saved view, note, canned response collections.
4. Add activity and audit collections.
5. Add sales collections.
6. Add AI run and insight collections.
7. Add workflow collections.
8. Add analytics and usage collections.
9. Add tenant settings and custom domain collections.

## Immediate Sprint Plan

Sprint 1:

- Add permission registry and helper checks.
- Add shared UI primitives for table, empty/error/loading states, badges, and drawers.
- Add contact and company models.
- Add contacts list/detail/create/edit pages.

Sprint 2:

- Add contact notes, tags, segments, import/export shell.
- Add activity timeline.
- Link conversations to contacts.
- Add global search skeleton.

Sprint 3:

- Extend conversations with assignment, status, priority, labels, and SLA fields.
- Add teams, internal notes, canned responses, saved views.
- Replace conversations page with a three-pane inbox.

Sprint 4:

- Add normalized channel identity.
- Add contact merge and conversation merge.
- Add notifications center and command palette.

Sprint 5:

- Add pipelines, stages, deals, and tasks.
- Add sales dashboard and pipeline Kanban.

Sprint 6:

- Add AI run tracking, prompt templates, suggested replies, and conversation summaries.
- Add AI analytics.

Sprint 7:

- Add workflow models, editor shell, first triggers/actions, and execution logs.

Sprint 8:

- Add report snapshots, exports, usage ledger, entitlements, branding settings, and custom domain setup.

## Production Readiness Checklist

- Tenant isolation is enforced on every query.
- Writes are validated with Zod.
- Routes check permissions.
- List endpoints paginate.
- Long-running work is asynchronous.
- Sensitive credentials are encrypted.
- Webhooks are signed and deduplicated.
- Billing limits are enforced server-side.
- Audit logs avoid leaking secrets.
- Dashboard pages include responsive, loading, empty, and error states.
- Tests cover permissions, tenant isolation, validation, billing limits, and critical workflows.
