import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the LLM module
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{
      message: {
        content: "**التصنيف الرئيسي**: فساد مالي\n**درجة الخطورة**: 85/100\n**الكلمات المفتاحية**: مخالفات، عقود، صيانة\n**التوصية الأولية**: إجراء تحقيق فوري"
      }
    }]
  })
}));

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("chat.send", () => {
  it("processes Arabic complaint and returns structured response", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.chat.send({
      message: "تم اكتشاف مخالفات مالية في عقود الصيانة بالوزارة",
      language: "arabic",
      feature: "complaints",
      history: []
    });

    expect(result.status).toBe("success");
    expect(result.response).toContain("التصنيف الرئيسي");
    expect(result.response).toContain("85/100");
  });

  it("processes English complaint correctly", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.chat.send({
      message: "Financial irregularities in maintenance contracts",
      language: "english",
      feature: "complaints",
      history: []
    });

    expect(result.status).toBe("success");
    expect(typeof result.response).toBe("string");
  });

  it("handles legislative mode queries", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.chat.send({
      message: "What are the powers of the State Audit Institution?",
      language: "english",
      feature: "legislative",
      history: []
    });

    expect(result.status).toBe("success");
  });

  it("includes conversation history in context", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.chat.send({
      message: "Follow up question",
      language: "arabic",
      feature: "complaints",
      history: [
        { role: "user", content: "Previous question" },
        { role: "assistant", content: "Previous answer" }
      ]
    });

    expect(result.status).toBe("success");
  });
});

describe("chat.health", () => {
  it("returns healthy status", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.chat.health();

    expect(result.status).toBe("healthy");
    expect(result.service).toBe("Ruzn-Lite");
    expect(result.version).toBe("1.0");
  });
});
