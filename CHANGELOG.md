# ChatZi Changelog

All notable changes to this project are documented here.
Changes are grouped by phase and date.

---

## [Phase 3] — Enterprise Readiness — 24 June 2026

### Added
- **System Prompt Cache** (`src/lib/ai/prompt-cache.ts`) — Redis-backed prompt caching with stable content-hash key. Prevents repeated DB lookups and prompt reconstruction on every AI reply. TTL configurable via `AI_PROMPT_CACHE_TTL_SECONDS` (default 300s).
- **Search Abstraction** (`src/lib/search/provider.ts`) — `SearchProvider` interface + `MongoSearchProvider` implementation. Future migration to Elasticsearch/Typesense requires only a new provider class and a one-line change in `getSearchProvider()`.
- **Observability Metrics** (`src/lib/metrics.ts`) — Structured JSON log events for queue depth, job completions/failures, AI latency, webhook rate limit hits, realtime connections, quota usage (warns at 90%), and slow DB queries (>200ms). Scrape-ready for Datadog/Loki/CloudWatch.
- **Tests** (`tests/`) — Unit tests for Redis rate limiter, quota reservation, and tenant isolation integration tests.

---

## [Phase 2] — Performance & Scaling — 24 June 2026

### Changed
- **Inbox analytics** — Redis cache (90s TTL) for `getInboxAnalytics()`. Saves 3–5 DB queries per inbox open.
- **AI query parallelization** — Bot/AiSetting/Tenant queries now run via `Promise.all()` in `ai.ts`. Saves ~15ms per AI message.
- **Mastra workflow quota** — Replaced `assertCanSendAiMessage` + `recordAiMessageUsage` with a single atomic `assertAndReserveQuota()`. Eliminates double-counting.
- **Message page size** — Default reduced from 120 → 60 (configurable via `INBOX_MESSAGE_PAGE_SIZE`).
- **ConversationEvent queries** — Added `.limit()` and `.select()` projection to prevent unbounded fetches.

### Added
- **Compound indexes** — Bot `{ _id, tenantId, isActive }`, Conversation `{ tenantId, botId, channel, externalUserId }`, Message `{ tenantId, conversationId, direction, createdAt }`.

---

## [Phase 1] — Critical Production Fixes — 24 June 2026

### Fixed
- **Socket.io multi-process** — Added Redis adapter (`@socket.io/redis-adapter`). Events now broadcast correctly across horizontally-scaled socket-server processes. Previously events were silently dropped for users on a different process.
- **Rate limiting** — Replaced in-memory `Map` rate limiter (process-local, resets on restart) with Redis `INCR + PEXPIRE` (distributed, survives restarts). All callers updated to `await`.
- **Login rate limiting** — Added missing `await` before `checkRateLimit()` in `auth.ts`. Rate limit was not being enforced.
- **AI worker stuck jobs** — Added `lockDuration: 90s` and `stalledInterval: 45s` to BullMQ AI worker. Jobs that hang on a slow provider call no longer block the worker indefinitely.
- **Inbox hot path** — Removed `ensureInboxDefaults()` (6 upserts per request) from `getInboxConversations()` hot path. Moved to explicit `POST /api/inbox/setup` endpoint. Saves ~15–30ms per request.

### Added
- **Webhook rate limiting** — 600 req/min per IP on WhatsApp, Telegram, Facebook webhook routes. Configurable via `WEBHOOK_RATE_LIMIT`.
- **MongoDB connection pool** — `maxPoolSize` (default 20), `minPoolSize` (2), `serverSelectionTimeoutMS` (10s), `socketTimeoutMS` (45s), `maxIdleTimeMS` (60s). All configurable via env vars.
- **TTL indexes** — Auto-expiry on `ConversationEvent` (90d), `WebhookLog` (30d), `WebhookEvent` (60d), `FailedJob` (90d).
- **`POST /api/inbox/setup`** — Explicit onboarding endpoint for inbox initialization (replaces hot-path init).
- **`SOCKET_BRIDGE_ENABLED`** env var — Set to `false` on non-leader socket-server instances to prevent PubSub event duplication when scaling.

---

## [Migration] — Replit Environment Setup

### Infrastructure
- Configured `.replit` with `Start application` workflow (`npm run dev -- --no-turbopack`).
- Set `waitForPort: 3000` for webview detection.
- Reviewed and documented all required env vars and secrets.
