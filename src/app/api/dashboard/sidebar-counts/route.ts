import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { requireSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { Conversation, Ticket } from "@/lib/models";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requireSession();
    await connectToDatabase();

    const tenantId = session.user.tenantId;
    const tenantObjectId = Types.ObjectId.isValid(tenantId) ? new Types.ObjectId(tenantId) : tenantId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [conversationChannels, activeConversations, openTickets, newTickets] = await Promise.all([
      Conversation.aggregate([
        { $match: { tenantId: tenantObjectId } },
        { $group: { _id: "$channel", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Conversation.countDocuments({ tenantId, status: { $in: ["open", "pending", "snoozed"] } }),
      Ticket.countDocuments({ tenantId, status: { $in: ["open", "in_progress", "pending"] } }),
      Ticket.countDocuments({ tenantId, status: { $in: ["open", "in_progress", "pending"] }, createdAt: { $gte: today } }),
    ]);

    return NextResponse.json({
      conversations: {
        active: activeConversations,
        byChannel: conversationChannels.map((item: any) => ({
          channel: item._id || "website",
          count: item.count || 0,
        })),
      },
      tickets: {
        open: openTickets,
        new: newTickets,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load sidebar counts" },
      { status: 500 },
    );
  }
}
