import { Types } from "mongoose";
import { Contact, Conversation, Lead, Ticket } from "@/lib/models";
import { connectToDatabase } from "@/lib/mongodb";

export function normalizePhone(value?: string | null) {
  const digits = String(value || "").replace(/[^\d+]/g, "");
  if (!digits) return "";
  const plus = digits.startsWith("+") ? "+" : "";
  return plus + digits.replace(/\+/g, "").replace(/^00/, "");
}

function extractPhoneFromText(...values: Array<string | undefined | null>) {
  const text = values.filter(Boolean).join("\n");
  const match = /(?:\+|00)?\d[\d\s\-()]{7,}\d/.exec(text);
  return normalizePhone(match?.[0] || "");
}

function extractEmailFromText(...values: Array<string | undefined | null>) {
  const text = values.filter(Boolean).join("\n");
  return /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.exec(text)?.[0] || "";
}

export async function syncLeadFromTicket(input: { tenantId: string; ticketId: string }) {
  await connectToDatabase();

  if (!Types.ObjectId.isValid(input.tenantId) || !Types.ObjectId.isValid(input.ticketId)) return null;

  const ticket = await Ticket.findOne({ _id: input.ticketId, tenantId: input.tenantId }).lean();
  if (!ticket) return null;

  const [contact, conversation] = await Promise.all([
    ticket.contactId ? Contact.findOne({ _id: ticket.contactId, tenantId: input.tenantId }).lean() : null,
    ticket.conversationId ? Conversation.findOne({ _id: ticket.conversationId, tenantId: input.tenantId }).lean() : null,
  ]);

  const customFields = ticket.customFields && typeof ticket.customFields === "object" ? ticket.customFields as Record<string, any> : {};
  const metadata = ticket.metadata && typeof ticket.metadata === "object" ? ticket.metadata as Record<string, any> : {};
  const requester = ticket.requesterExternalId || conversation?.externalUserId || "";
  const textPool = [ticket.title, ticket.subject, ticket.description, ticket.aiSummary, ticket.triggerReason, requester];

  const phone = normalizePhone(customFields.phone || metadata.phone || metadata.customerPhone || contact?.phone || extractPhoneFromText(...textPool));
  const email = customFields.email || metadata.email || contact?.email || extractEmailFromText(...textPool);
  const name = customFields.name || metadata.name || metadata.customerName || contact?.name || requester || (phone ? `Lead ${phone.slice(-4)}` : "Potential customer");
  const interest = customFields.interest || metadata.interest || ticket.subject || ticket.title || ticket.category || "";
  const sourceChannel = ticket.channel || conversation?.provider || conversation?.channel || "";
  const normalizedPhone = normalizePhone(phone);

  const orFilters = [
    normalizedPhone ? { normalizedPhone } : null,
    email ? { email } : null,
    ticket.contactId ? { contactId: ticket.contactId } : null,
  ].filter(Boolean);

  const filter: Record<string, any> = orFilters.length
    ? { tenantId: input.tenantId, $or: orFilters }
    : { tenantId: input.tenantId, conversationId: ticket.conversationId || undefined };

  const update = {
    $set: {
      tenantId: ticket.tenantId,
      contactId: ticket.contactId || undefined,
      conversationId: ticket.conversationId || undefined,
      sourceChannel,
      name,
      phone,
      normalizedPhone,
      email,
      company: contact?.company || customFields.company || "",
      interest,
      notes: [ticket.description, ticket.aiSummary, ticket.triggerReason].filter(Boolean).join("\n\n").slice(0, 3000),
      score: ticket.category === "sales_request" || ticket.category === "booking_request" ? 85 : ticket.priority === "urgent" || ticket.priority === "high" ? 70 : 45,
      customFields: {
        ...customFields,
        lastTicketId: ticket._id.toString(),
        lastTicketNumber: ticket.number || null,
        lastTicketCategory: ticket.category || "general",
        lastTicketStatus: ticket.status || "open",
      },
    },
    $addToSet: {
      tags: { $each: ["ticket-source", ticket.category || "general"].filter(Boolean) },
    },
    $setOnInsert: {
      stage: "new",
      currency: "USD",
      value: 0,
    },
  };

  return Lead.findOneAndUpdate(filter, update, { new: true, upsert: true, setDefaultsOnInsert: true });
}

export async function syncLeadsFromTickets(input: { tenantId: string; limit?: number }) {
  await connectToDatabase();
  if (!Types.ObjectId.isValid(input.tenantId)) return { scanned: 0, synced: 0 };
  const tickets = await Ticket.find({ tenantId: input.tenantId })
    .sort({ updatedAt: -1 })
    .limit(Math.min(5000, Math.max(1, Number(input.limit || 1000))))
    .select("_id")
    .lean();
  let synced = 0;
  for (const ticket of tickets) {
    const lead = await syncLeadFromTicket({ tenantId: input.tenantId, ticketId: ticket._id.toString() }).catch(() => null);
    if (lead) synced += 1;
  }
  return { scanned: tickets.length, synced };
}
