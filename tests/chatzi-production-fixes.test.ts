import { isExplicitHumanHandoffRequest } from "../src/lib/ai/handoff";
import { buildMessageDedupeKey } from "../src/lib/messages/dedupe";

describe("Chatzi production conversation fixes", () => {
  it("detects explicit human handoff requests only", () => {
    expect(isExplicitHumanHandoffRequest("عاوز اكلم موظف")).toBe(true);
    expect(isExplicitHumanHandoffRequest("please connect me with a real person")).toBe(true);
    expect(isExplicitHumanHandoffRequest("احتاج دعم فني في المنتج")).toBe(false);
    expect(isExplicitHumanHandoffRequest("support pricing question")).toBe(false);
  });

  it("builds stable dedupe keys from external ids", () => {
    const key1 = buildMessageDedupeKey({ tenantId: "t1", provider: "telegram", externalMessageId: "m1" });
    const key2 = buildMessageDedupeKey({ tenantId: "t1", provider: "telegram", externalMessageId: "m1", text: "different" });
    expect(key1).toEqual(key2);
  });

  it("builds stable fallback dedupe keys for near duplicate messages", () => {
    const key1 = buildMessageDedupeKey({ tenantId: "t1", provider: "telegram", externalUserId: "u1", text: "السلام عليكم", timestamp: new Date("2026-06-16T18:00:01Z") });
    const key2 = buildMessageDedupeKey({ tenantId: "t1", provider: "telegram", externalUserId: "u1", text: "السلام عليكم", timestamp: new Date("2026-06-16T18:00:04Z") });
    expect(key1).toEqual(key2);
  });
});
