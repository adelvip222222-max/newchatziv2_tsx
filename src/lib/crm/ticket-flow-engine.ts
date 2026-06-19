import { Conversation } from "@/lib/models";
import type { TicketCategory, TicketIntentClassification, TicketPriority } from "@/lib/tickets";

export type TicketRequiredField = "name" | "phone" | "issueDescription";

export type TicketFlowAction =
  | "none"
  | "ask_missing_fields"
  | "answer_current_message"
  | "create_ticket";

export type TicketFlowState = {
  version: 1;
  status: "collecting_required_fields" | "paused_for_context" | "ready_to_create" | "created";
  category: TicketCategory;
  priority: TicketPriority;
  reason: string;
  requiredFields: TicketRequiredField[];
  missingFields: TicketRequiredField[];
  collectedFields: Partial<Record<TicketRequiredField, string>>;
  startedAt: string;
  updatedAt: string;
  lastCustomerMessage?: string;
  lastInterruptReason?: string;
  ticketId?: string;
  ticketNumber?: number;
};

export type TicketFlowResult = {
  action: TicketFlowAction;
  state?: TicketFlowState;
  category?: TicketCategory;
  priority?: TicketPriority;
  reason?: string;
  missingFields?: TicketRequiredField[];
  collectedFields?: Partial<Record<TicketRequiredField, string>>;
  interrupted?: boolean;
  readyToCreate?: boolean;
};

const REQUIRED_FIELDS: TicketRequiredField[] = ["name", "phone", "issueDescription"];
const GENERIC_TICKET_STARTERS = [
  /^(اريد|عايز|ابغي|احتاج|محتاج|ممكن)?\s*(دعم\s*فني|الدعم\s*الفني|مساعده|مساعدة|support|technical\s*support)\s*$/i,
  /^(اريد|عايز|ابغي|احتاج|محتاج)?\s*(اشتري|شراء|الشراء|buy|purchase|order)\s*$/i,
  /^(اريد|عايز|ابغي|احتاج|محتاج)?\s*(احجز|حجز|موعد|booking|appointment)\s*$/i,
  /^(اكلم|اتكلم|تحدث|تواصل|حولني|وصلني)\s*(موظف|مندوب|انسان|بشري|agent|human|representative)\s*$/i,
];

function normalizeArabic(value: string) {
  return String(value || "")
    .toLowerCase()
    .replace(/[إأآا]/g, "ا")
    .replace(/[ىي]/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[\u064B-\u065F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizePhone(value?: string | null) {
  if (!value) return "";
  const cleaned = String(value).replace(/[^\d+]/g, "");
  if (cleaned.replace(/\D/g, "").length < 7) return "";
  return cleaned;
}

function extractPhone(message: string) {
  const match = String(message || "").match(/(?:\+?\d[\d\s().-]{6,}\d)/);
  return normalizePhone(match?.[0]);
}

function extractName(message: string) {
  const text = String(message || "").trim();
  const patterns = [
    /(?:اسمي|انا اسمي|الاسم|إسمي)\s*[:：-]?\s*([\p{L}][\p{L}\s'.-]{1,60})/iu,
    /(?:انا|أنا)\s+([\p{L}][\p{L}\s'.-]{1,40})(?:\s+(?:ورقمي|رقمي|وهاتفي|هاتفي|وموبايل|موبايل|and|phone|my phone)\b|$)/iu,
    /(?:my name is|name is|i am|i'm)\s+([a-z][a-z\s'.-]{1,60})/iu,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    const candidate = match?.[1]?.trim().replace(/[،,.].*$/, "").trim();
    if (candidate && candidate.length >= 2 && candidate.length <= 80) return candidate;
  }
  return "";
}

function isGenericTicketStarter(message: string) {
  const normalized = normalizeArabic(message);
  return GENERIC_TICKET_STARTERS.some((pattern) => pattern.test(normalized));
}

function isContextSwitch(message: string) {
  const normalized = normalizeArabic(message);
  return /(ارني|اعرض|هات|ماهي|ما هى|ايه|ما هو|ماهو|اشرح|تفاصيل|منتجات|المنتجات|الخدمات|خدمات|العروض|اسعار|الاسعار|السعر|باقات|كتالوج|catalog|products?|services?|offers?|prices?|pricing|plans?|show me|tell me about|first|اولا|قبل|خليني|let me see|browse)/i.test(normalized);
}

function extractIssueDescription(message: string, category?: TicketCategory) {
  const text = String(message || "").trim();
  if (!text || text.length < 6) return "";
  if (isContextSwitch(text)) return "";
  if (isGenericTicketStarter(text)) return "";

  const explicit = text.match(/(?:المشكله|المشكلة|الموضوع|الوصف|تفاصيل|issue|problem|description)\s*[:：-]?\s*(.{6,500})/iu);
  if (explicit?.[1]?.trim()) return explicit[1].trim();

  if (category === "sales_request" || category === "booking_request" || category === "complaint" || category === "human_request") {
    return text.slice(0, 500);
  }

  if (/(لا يعمل|مش شغال|عطل|خطا|خطأ|error|bug|not working|failed|مشكله|مشكلة)/i.test(normalizeArabic(text))) {
    return text.slice(0, 500);
  }

  return "";
}

export function extractTicketFieldsFromMessage(message: string, category?: TicketCategory) {
  const phone = extractPhone(message);
  const name = extractName(message);
  const issueDescription = extractIssueDescription(message, category);
  return {
    ...(name ? { name } : {}),
    ...(phone ? { phone } : {}),
    ...(issueDescription ? { issueDescription } : {}),
  } as Partial<Record<TicketRequiredField, string>>;
}

function asTicketFlowState(value: unknown): TicketFlowState | null {
  if (!value || typeof value !== "object") return null;
  const state = value as TicketFlowState;
  if (state.version !== 1) return null;
  if (!state.category || !Array.isArray(state.requiredFields)) return null;
  if (state.status === "created") return null;
  return state;
}

function mergeFields(
  previous: Partial<Record<TicketRequiredField, string>> | undefined,
  next: Partial<Record<TicketRequiredField, string>>
) {
  return REQUIRED_FIELDS.reduce((acc, field) => {
    const value = (next[field] || previous?.[field] || "").trim();
    if (value) acc[field] = value;
    return acc;
  }, {} as Partial<Record<TicketRequiredField, string>>);
}

function missingFields(fields: Partial<Record<TicketRequiredField, string>>) {
  return REQUIRED_FIELDS.filter((field) => !fields[field]?.trim());
}

async function saveState(input: {
  tenantId: string;
  botId: string;
  conversationId: string;
  state: TicketFlowState;
}) {
  await Conversation.updateOne(
    { _id: input.conversationId, tenantId: input.tenantId, botId: input.botId },
    { $set: { "metadata.crmTicketFlow": input.state } }
  );
}

export async function clearTicketFlow(input: {
  tenantId: string;
  botId: string;
  conversationId: string;
  ticketId?: string;
  ticketNumber?: number;
}) {
  const now = new Date().toISOString();
  await Conversation.updateOne(
    { _id: input.conversationId, tenantId: input.tenantId, botId: input.botId },
    {
      $set: {
        "metadata.crmTicketFlow.status": "created",
        "metadata.crmTicketFlow.ticketId": input.ticketId || "",
        "metadata.crmTicketFlow.ticketNumber": input.ticketNumber || 0,
        "metadata.crmTicketFlow.updatedAt": now,
      },
    }
  );
}

export async function processTicketFlow(input: {
  tenantId: string;
  botId: string;
  conversationId: string;
  message: string;
  conversationMetadata?: Record<string, unknown> | null;
  detectedIntent?: TicketIntentClassification | null;
}) : Promise<TicketFlowResult> {
  const now = new Date().toISOString();
  const metadata = input.conversationMetadata || {};
  const activeState = asTicketFlowState((metadata as any).crmTicketFlow);

  if (activeState && isContextSwitch(input.message)) {
    const state: TicketFlowState = {
      ...activeState,
      status: "paused_for_context",
      updatedAt: now,
      lastCustomerMessage: input.message,
      lastInterruptReason: "customer_asked_contextual_question",
    };
    await saveState({ ...input, state });
    return {
      action: "answer_current_message",
      state,
      category: state.category,
      priority: state.priority,
      reason: "ticket_flow_context_switch",
      missingFields: state.missingFields,
      collectedFields: state.collectedFields,
      interrupted: true,
    };
  }

  if (activeState) {
    const fields = mergeFields(
      activeState.collectedFields,
      extractTicketFieldsFromMessage(input.message, activeState.category)
    );
    const missing = missingFields(fields);
    const state: TicketFlowState = {
      ...activeState,
      status: missing.length ? "collecting_required_fields" : "ready_to_create",
      collectedFields: fields,
      missingFields: missing,
      updatedAt: now,
      lastCustomerMessage: input.message,
    };
    await saveState({ ...input, state });
    return {
      action: missing.length ? "ask_missing_fields" : "create_ticket",
      state,
      category: state.category,
      priority: state.priority,
      reason: missing.length ? "ticket_required_fields_missing" : "ticket_required_fields_complete",
      missingFields: missing,
      collectedFields: fields,
      readyToCreate: missing.length === 0,
    };
  }

  if (!input.detectedIntent?.shouldCreate) {
    return { action: "none" };
  }

  const fields = extractTicketFieldsFromMessage(input.message, input.detectedIntent.category);
  const missing = missingFields(fields);
  const state: TicketFlowState = {
    version: 1,
    status: missing.length ? "collecting_required_fields" : "ready_to_create",
    category: input.detectedIntent.category,
    priority: input.detectedIntent.priority,
    reason: input.detectedIntent.reason,
    requiredFields: REQUIRED_FIELDS,
    missingFields: missing,
    collectedFields: fields,
    startedAt: now,
    updatedAt: now,
    lastCustomerMessage: input.message,
  };
  await saveState({ ...input, state });

  return {
    action: missing.length ? "ask_missing_fields" : "create_ticket",
    state,
    category: state.category,
    priority: state.priority,
    reason: missing.length ? "ticket_required_fields_missing" : "ticket_required_fields_complete",
    missingFields: missing,
    collectedFields: fields,
    readyToCreate: missing.length === 0,
  };
}

export function buildTicketFlowContext(flow?: TicketFlowResult) {
  if (!flow || flow.action === "none" || !flow.state) return "";
  const fields = flow.state.collectedFields || {};
  const parts = [
    `crmTicketFlow.action=${flow.action}`,
    `crmTicketFlow.status=${flow.state.status}`,
    `crmTicketFlow.category=${flow.state.category}`,
    `crmTicketFlow.requiredFields=${flow.state.requiredFields.join(",")}`,
    `crmTicketFlow.missingFields=${flow.state.missingFields.join(",") || "none"}`,
    `crmTicketFlow.hasName=${Boolean(fields.name)}`,
    `crmTicketFlow.hasPhone=${Boolean(fields.phone)}`,
    `crmTicketFlow.hasIssueDescription=${Boolean(fields.issueDescription)}`,
  ];

  if (flow.action === "ask_missing_fields") {
    parts.push(
      "crmTicketFlow.replyGoal=Ask naturally for the missing required fields only. Do not say a ticket is created yet. Keep the reply in the customer's language and follow the configured tone/emoji settings."
    );
  }

  if (flow.action === "answer_current_message") {
    parts.push(
      "crmTicketFlow.replyGoal=The customer temporarily switched topics. Answer the current question from the business knowledge first. Keep the pending ticket flow open without pressuring the customer for fields in this reply."
    );
  }

  if (flow.action === "create_ticket") {
    parts.push(
      "crmTicketFlow.replyGoal=The required ticket fields are complete. A CRM ticket will be created by the system. Acknowledge the successful registration naturally after creation context is available."
    );
  }

  return parts.join("; ");
}
