import fs from "fs";
import path from "path";
import { shouldFallbackToLegacy } from "../src/lib/ai/orchestrator-flags";
import { validateCustomerReply } from "../src/lib/ai/reply-validators";

function readSource(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("Chatzi AI reply behavior smoke tests", () => {
  const forbiddenReplyFragments = ["<think", "[SENTIMENT:", "RAG", "confidence score"];

  beforeEach(() => {
    delete process.env.MASTRA_FALLBACK_TO_LEGACY;
  });

  it("keeps orchestrator to direct fallback enabled by default", () => {
    expect(shouldFallbackToLegacy()).toBe(true);
  });

  it("rejects internal markers that must not reach customers", () => {
    for (const fragment of forbiddenReplyFragments) {
      expect(validateCustomerReply(`hello ${fragment} hidden details`).valid).toBe(false);
    }
  });

  it("keeps knowledge similarity score separate from ranking score", () => {
    const source = readSource("src/lib/knowledge.ts");

    expect(source).toContain("rankScore");
    expect(source).toContain("const score = Math.round(semanticScore * 100);");
    expect(source).toContain("(b.rankScore ?? b.score) - (a.rankScore ?? a.score)");
    expect(source).not.toContain("const score = Math.round((semanticScore * 0.72 + keywordScore * 0.28) * 100);");
  });

  it("does not expose scores or chain-of-thought tags in knowledge prompts", () => {
    const source = readSource("src/lib/knowledge.ts");

    expect(source).not.toContain("score=${result.score}");
    expect(source).not.toContain("Confidence: ${input.confidence}/100");
    expect(source).not.toContain("<think>");
    expect(source).not.toContain("[SENTIMENT:");
  });

  it("does not turn support or complaint tickets into automatic handoff", () => {
    const source = readSource("src/mastra/workflows/ai-reply.workflow.ts");

    expect(source).toContain('inputData.reason === "explicit_human_request"');
    expect(source).not.toContain('"complaint",\n        "technical_support"');
  });
});
