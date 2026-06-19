import { Schema, models, model, type InferSchemaType, type Model } from "mongoose";

const knowledgeEntitySchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
    botId: { type: Schema.Types.ObjectId, ref: "Bot", required: false, index: true },
    documentId: { type: Schema.Types.ObjectId, ref: "KnowledgeDocument", required: false, index: true },
    chunkId: { type: Schema.Types.ObjectId, ref: "KnowledgeChunk", required: false, index: true },
    type: {
      type: String,
      required: true,
      index: true,
      enum: [
        "service",
        "product",
        "price",
        "offer",
        "doctor",
        "branch",
        "contact",
        "faq",
        "policy",
        "appointment_rule",
        "business_info",
        "payment",
        "delivery",
        "support",
      ],
    },
    name: { type: String, required: true, trim: true, index: true },
    description: { type: String, default: "" },
    category: { type: String, default: "", index: true },
    price: { type: String, default: "" },
    availability: { type: String, default: "" },
    url: { type: String, default: "" },
    aliases: [{ type: String, trim: true }],
    keywords: [{ type: String, trim: true }],
    normalizedName: { type: String, default: "", index: true },
    normalizedSearchText: { type: String, default: "", index: true },
    sourceText: { type: String, default: "" },
    confidence: { type: Number, default: 0.7 },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

knowledgeEntitySchema.index({ tenantId: 1, botId: 1, type: 1 });
knowledgeEntitySchema.index({ tenantId: 1, type: 1, normalizedName: 1 });
knowledgeEntitySchema.index({ tenantId: 1, documentId: 1 });
knowledgeEntitySchema.index({ tenantId: 1, botId: 1, type: 1, normalizedSearchText: "text" as any }, { name: "knowledge_entity_text" });

export type KnowledgeEntityDocument = InferSchemaType<typeof knowledgeEntitySchema>;
export const KnowledgeEntity =
  (models.KnowledgeEntity as Model<KnowledgeEntityDocument>) ||
  model("KnowledgeEntity", knowledgeEntitySchema);
