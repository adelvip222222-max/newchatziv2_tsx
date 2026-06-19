import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Conversation, Message } from "@/lib/models";
import { connectToDatabase } from "@/lib/mongodb";

const querySchema = z.object({
  botId: z.string().min(1),
  conversationId: z.string().min(1),
  visitorId: z.string().min(1),
  after: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const query = querySchema.parse(Object.fromEntries(request.nextUrl.searchParams.entries()));
    await connectToDatabase();
    const conversation = await Conversation.findOne({
      _id: query.conversationId,
      botId: query.botId,
      externalUserId: query.visitorId,
      status: { $in: ["open", "pending", "snoozed", "resolved"] },
    }).select("_id tenantId").lean();
    if (!conversation) return NextResponse.json({ messages: [] });

    const afterDate = query.after ? new Date(query.after) : new Date(Date.now() - 60_000);
    const messages = await Message.find({
      tenantId: conversation.tenantId,
      conversationId: conversation._id,
      direction: "outgoing",
      senderType: { $in: ["assistant", "agent", "system"] },
      createdAt: { $gte: Number.isNaN(afterDate.getTime()) ? new Date(Date.now() - 60_000) : afterDate },
    })
      .sort({ createdAt: 1 })
      .limit(10)
      .lean();

    return NextResponse.json({
      messages: messages.map((message) => ({
        id: message._id.toString(),
        content: message.content,
        createdAt: message.createdAt?.toISOString?.() || new Date().toISOString(),
        deliveryStatus: message.deliveryStatus || "queued",
      })),
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load messages" }, { status: 400 });
  }
}
