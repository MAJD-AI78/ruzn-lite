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

// Mock the db module
vi.mock("./db", () => ({
  saveConversation: vi.fn().mockResolvedValue(undefined),
  getConversationsByUser: vi.fn().mockResolvedValue([]),
  getSampleComplaints: vi.fn().mockResolvedValue([
    { id: 1, text: "تم اكتشاف مخالفات مالية", category: "financial_corruption", expectedRiskScore: 85 },
    { id: 2, text: "موظف يمنح عقودًا لشركة يملكها قريبه", category: "conflict_of_interest", expectedRiskScore: 75 }
  ]),
  logAnalyticsEvent: vi.fn().mockResolvedValue(undefined),
  getAnalyticsStats: vi.fn().mockResolvedValue({
    totalComplaints: 100,
    avgRiskScore: 65,
    categoryDistribution: { financial_corruption: 30, conflict_of_interest: 20 },
    riskDistribution: { high: 20, medium: 50, low: 30 }
  }),
  getAllConversations: vi.fn().mockResolvedValue([]),
  getAllUsers: vi.fn().mockResolvedValue([])
}));

type CookieCall = {
  name: string;
  options: Record<string, unknown>;
};

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

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

function createAuthContext(): { ctx: TrpcContext; clearedCookies: CookieCall[] } {
  const clearedCookies: CookieCall[] = [];

  const user: AuthenticatedUser = {
    id: 1,
    openId: "sample-user",
    email: "sample@example.com",
    name: "Staff Member",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };

  return { ctx, clearedCookies };
}

describe("chat.send", () => {
  it("processes Arabic complaint and returns structured response", async () => {
    const { ctx } = createAuthContext();
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
    const { ctx } = createAuthContext();
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
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.chat.send({
      message: "What are the powers of the regulatory authority?",
      language: "english",
      feature: "legislative",
      history: []
    });

    expect(result.status).toBe("success");
  });

  it("includes conversation history in context", async () => {
    const { ctx } = createAuthContext();
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
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.chat.health();

    expect(result.status).toBe("healthy");
    expect(result.service).toBe("Ruzn-Lite");
    expect(result.version).toBe("2.0");
  });
});

describe("chat.getSamples", () => {
  it("returns sample complaints for Arabic", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.chat.getSamples({ language: "arabic" });

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty("text");
    expect(result[0]).toHaveProperty("category");
    expect(result[0]).toHaveProperty("expectedRiskScore");
  });

  it("returns sample complaints for English", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.chat.getSamples({ language: "english" });

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("chat.exportPdf (protected)", () => {
  it("generates PDF export data for authenticated user", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.chat.exportPdf({
      messages: [
        { role: "user", content: "Test complaint" },
        { role: "assistant", content: "Test response with 75/100 risk score" }
      ],
      feature: "complaints",
      language: "arabic"
    });

    expect(result.userName).toBe("Staff Member");
    expect(result.feature).toBe("complaints");
    expect(result.language).toBe("arabic");
    expect(result.title).toBe("تقرير محادثة رُزن");
    expect(result.messages).toHaveLength(2);
  });

  it("generates English PDF export data", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.chat.exportPdf({
      messages: [
        { role: "user", content: "Test query" },
        { role: "assistant", content: "Test response" }
      ],
      feature: "legislative",
      language: "english"
    });

    expect(result.title).toBe("Ruzn Conversation Report");
    expect(result.subtitle).toBe("Governance, Integrity, and Compliance");
  });
});

describe("chat.saveConversation (protected)", () => {
  it("saves conversation for authenticated user", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.chat.saveConversation({
      messages: [
        { role: "user", content: "Test message" },
        { role: "assistant", content: "Test response" }
      ],
      feature: "complaints",
      language: "arabic"
    });

    expect(result.success).toBe(true);
  });
});

describe("chat.getHistory (protected)", () => {
  it("returns conversation history for authenticated user", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.chat.getHistory();

    expect(Array.isArray(result)).toBe(true);
  });
});


// Phase 5 Tests: Status Tracking, Dashboard Stats, Weekly Reports

function createAdminContext(): { ctx: TrpcContext; clearedCookies: CookieCall[] } {
  const clearedCookies: CookieCall[] = [];

  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@ruzn.ai",
    name: "Ruzn Admin",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };

  return { ctx, clearedCookies };
}

describe("admin.getAllConversations", () => {
  it("returns conversations for admin users", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.getAllConversations({ limit: 10 });

    expect(result).toHaveProperty("conversations");
    expect(Array.isArray(result.conversations)).toBe(true);
  });

  it("returns unauthorized error for non-admin users", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.getAllConversations({ limit: 10 });

    expect(result).toHaveProperty("error");
    expect(result.error).toBe("Unauthorized");
  });
});

describe("admin.getAllUsers", () => {
  it("returns users for admin", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.getAllUsers();

    expect(result).toHaveProperty("users");
    expect(Array.isArray(result.users)).toBe(true);
  });
});
