import mongoose from "mongoose";
import { connectToDatabase } from "../src/lib/mongodb";
import { Conversation, Message, Bot, AiSetting } from "../src/lib/models";

describe("Tenant Isolation", () => {
  const tenantA = new mongoose.Types.ObjectId().toString();
  const tenantB = new mongoose.Types.ObjectId().toString();

  beforeAll(async () => {
    await connectToDatabase();
  });

  afterAll(async () => {
    // Clean up test data
    await Conversation.deleteMany({ tenantId: { $in: [tenantA, tenantB] } });
    await Message.deleteMany({ tenantId: { $in: [tenantA, tenantB] } });
    await mongoose.disconnect();
  });

  it("should not return conversations from another tenant", async () => {
    const conv = await Conversation.create({
      tenantId: tenantA,
      channel: "website",
      provider: "website",
      externalUserId: "user-isolation-test",
      status: "open",
      mode: "ai",
      aiStatus: "active",
    });

    // Querying with tenantB should return nothing
    const found = await Conversation.findOne({
      _id: conv._id,
      tenantId: tenantB,
    }).lean();

    expect(found).toBeNull();

    // Querying with tenantA should return the document
    const ownFound = await Conversation.findOne({
      _id: conv._id,
      tenantId: tenantA,
    }).lean();

    expect(ownFound).not.toBeNull();
  });

  it("should not return messages from another tenant", async () => {
    const conv = await Conversation.create({
      tenantId: tenantA,
      channel: "website",
      provider: "website",
      externalUserId: "user-msg-isolation",
      status: "open",
      mode: "ai",
      aiStatus: "active",
    });

    const msg = await Message.create({
      tenantId: tenantA,
      conversationId: conv._id,
      provider: "website",
      direction: "incoming",
      sender: "user",
      senderType: "customer",
      content: "Hello from tenant A",
      deliveryStatus: "delivered",
    });

    // Cross-tenant query should return nothing
    const leaked = await Message.find({
      tenantId: tenantB,
      _id: msg._id,
    }).lean();

    expect(leaked).toHaveLength(0);
  });
});
