# Chatzi CRM Hardcoded Replies, Speed, Tickets, Leads, and Channel Status Update

## Summary
This build turns the project into a cleaner root-level CRM SaaS package and removes customer-facing hardcoded AI fallback replies from the main AI/Mastra paths. Customer replies are now generated through the configured AI path using a unified multilingual CRM prompt, with business identity, workspace/bot name, user custom prompt, Knowledge Entities, and Knowledge Chunks.

## Main changes

### 1. No customer-facing hardcoded AI replies
- Removed fixed Arabic fallback replies from the Mastra workflow.
- Removed fixed Arabic fallback replies from the legacy AI fallback path.
- Removed fixed default fallback message from AI settings.
- Added `buildSafeCustomerReply` so fallback replies are AI-generated in the customer language.
- Added `buildUnifiedSystemPrompt` as the internal multilingual CRM prompt for all business types.

### 2. Marketing CRM prompt
- Added a global CRM prompt that tells the assistant to behave as Chatzi, the smart CRM assistant for the configured business/workspace.
- The prompt is multilingual and does not force Arabic.
- Greetings and identity replies are generated dynamically using business/bot/workspace context.

### 3. Knowledge Entities + Chunks
- Added `KnowledgeEntity` model.
- Added entity extraction from trained knowledge documents.
- Added entity search before chunk search for direct business intents such as services, products, prices, offers, contact, hours, booking, doctors, and FAQs.
- Mastra now receives Entities + Chunks as knowledge context.

### 4. Ticket cards and deletion
- Rebuilt the tickets page as modern CRM cards instead of a table.
- Added pagination with 10 tickets per page.
- Added a delete button for each ticket.
- Ticket deletion publishes a realtime event.

### 5. Leads from tickets
- Added normalized phone deduplication.
- Added `syncLeadsFromTickets` to scan tickets and create/update leads without duplicating phone numbers.
- Added `scripts/sync-leads-from-tickets.ts` and package script `leads:sync`.

### 6. Speed and widget reply delivery
- Added widget message polling endpoint `/api/widget/messages`.
- The widget now polls for the async AI reply instead of showing a fixed fallback when `/api/widget/message` returns `queued`.
- Existing workers still use concurrency settings in `ecosystem.config.js`.
- Outbound worker concurrency is enabled via `OUTBOUND_WORKER_CONCURRENCY`.

### 7. Channel connected status in conversation
- Conversation details now include `channelConnection`.
- The inbox header and channel panel show Connected / Not connected based on active channel lookup.

## Important after deployment
1. Retrain knowledge documents to extract Knowledge Entities.
2. Run `npm install` and `npm run build` on the server.
3. Start through PM2 only: `pm2 start ecosystem.config.js`.
4. Run lead sync when needed:
   `TENANT_ID=<tenantId> npm run leads:sync`

## Expected behavior
- “السلام عليكم” replies in Arabic, dynamically generated, with Chatzi/business identity.
- “Hello” replies in English, dynamically generated, with Chatzi/business identity.
- “من أنت” identifies the assistant using the business/bot/workspace context.
- “ماهي الخدمات التي تقدمها؟” uses Knowledge Entities/Chunks and does not ask “ما المنتج أو الخدمة التي تقصدها؟” when knowledge exists.
- Ticket cards display modern CRM cards with delete action.
- Leads are created/updated from tickets without duplicate phone numbers.
