import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { Types } from "mongoose";
import { Conversation, Lead } from "@/lib/models";
import { connectToDatabase } from "@/lib/mongodb";

const leadToolInputSchema = z.object({
  tenantId: z.string().min(1),
  conversationId: z.string().min(1),
  contactId: z.string().optional(),
  name: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  interest: z.string().optional(),
  notes: z.string().optional(),
  sourceChannel: z.string().optional(),
  score: z.number().min(0).max(100).default(50),
  tags: z.array(z.string()).default([]),
});

const leadToolOutputSchema = z.object({
  leadId: z.string(),
  stage: z.string(),
  score: z.number(),
});

export const createOrUpdateLeadTool = createTool({
  id: "create-or-update-lead",
  description:
    "Create or update a tenant-isolated CRM lead when a customer shows confirmed sales, booking, or subscription intent. Never guess identifiers.",
  inputSchema: leadToolInputSchema,
  outputSchema: leadToolOutputSchema,
  execute: async (input) => {
    await connectToDatabase();
    if (!Types.ObjectId.isValid(input.tenantId) || !Types.ObjectId.isValid(input.conversationId)) {
      throw new Error("Invalid tenant or conversation identifier.");
    }

    const conversation = await Conversation.findOne({ _id: input.conversationId, tenantId: input.tenantId }).lean();
    if (!conversation) throw new Error("Conversation not found.");

    const contactId = input.contactId && Types.ObjectId.isValid(input.contactId)
      ? input.contactId
      : conversation.contactId?.toString?.();

    const filter: Record<string, unknown> = {
      tenantId: input.tenantId,
      conversationId: input.conversationId,
    };

    const lead = await Lead.findOneAndUpdate(
      filter,
      {
        $set: {
          tenantId: input.tenantId,
          conversationId: input.conversationId,
          contactId,
          name: input.name || "",
          email: input.email || "",
          phone: input.phone || "",
          interest: input.interest || "",
          notes: input.notes || "",
          sourceChannel: input.sourceChannel || conversation.channel || conversation.provider || "",
          score: input.score,
          tags: input.tags,
          stage: "qualified",
        },
      },
      { new: true, upsert: true }
    );

    return {
      leadId: lead._id.toString(),
      stage: String(lead.stage || "qualified"),
      score: Number(lead.score || input.score),
    };
  },
});
