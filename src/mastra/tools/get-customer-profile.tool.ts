import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { Types } from "mongoose";
import { ChannelIdentity, Contact, Conversation, Lead, Ticket } from "@/lib/models";
import { connectToDatabase } from "@/lib/mongodb";

const inputSchema = z.object({
  tenantId: z.string().min(1),
  conversationId: z.string().min(1),
});

const outputSchema = z.object({
  contactId: z.string().optional(),
  name: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  channel: z.string().optional(),
  openTickets: z.number(),
  openLeads: z.number(),
  lastSeenAt: z.string().optional(),
});

export const getCustomerProfileTool = createTool({
  id: "get-customer-profile",
  description: "Read a tenant-isolated CRM customer profile, open ticket count, and lead count for the active conversation.",
  inputSchema,
  outputSchema,
  execute: async (input) => {
    await connectToDatabase();
    if (!Types.ObjectId.isValid(input.tenantId) || !Types.ObjectId.isValid(input.conversationId)) {
      throw new Error("Invalid tenant or conversation identifier.");
    }

    const conversation = await Conversation.findOne({ _id: input.conversationId, tenantId: input.tenantId }).lean();
    if (!conversation) throw new Error("Conversation not found.");

    const [contact, identity, openTickets, openLeads] = await Promise.all([
      conversation.contactId ? Contact.findOne({ _id: conversation.contactId, tenantId: input.tenantId }).lean() : null,
      conversation.channelIdentityId ? ChannelIdentity.findOne({ _id: conversation.channelIdentityId, tenantId: input.tenantId }).lean() : null,
      Ticket.countDocuments({ tenantId: input.tenantId, conversationId: input.conversationId, status: { $in: ["open", "pending", "in_progress"] } }),
      Lead.countDocuments({ tenantId: input.tenantId, conversationId: input.conversationId, stage: { $nin: ["won", "lost"] } }),
    ]);

    return {
      contactId: contact?._id?.toString?.() || undefined,
      name: contact?.name || identity?.displayName || undefined,
      email: contact?.email || undefined,
      phone: contact?.phone || undefined,
      channel: conversation.channel || conversation.provider || undefined,
      openTickets,
      openLeads,
      lastSeenAt: identity?.lastSeenAt?.toISOString?.() || contact?.lastSeenAt?.toISOString?.() || undefined,
    };
  },
});
