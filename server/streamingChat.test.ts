import { describe, it, expect, vi } from "vitest";
import { handleStreamingChat, StreamChatRequest } from "./streamingChat";
import { Request, Response } from "express";

// Mock the LLM stream module
vi.mock("./_core/llm", () => ({
  invokeLLMStream: vi.fn().mockImplementation(async function* () {
    // Simulate streaming chunks
    yield {
      id: "chunk-1",
      choices: [{
        index: 0,
        delta: { content: "**التصنيف الرئيسي**: " },
        finish_reason: null
      }]
    };
    yield {
      id: "chunk-2",
      choices: [{
        index: 0,
        delta: { content: "فساد مالي\n" },
        finish_reason: null
      }]
    };
    yield {
      id: "chunk-3",
      choices: [{
        index: 0,
        delta: { content: "**درجة الخطورة**: 85/100" },
        finish_reason: null
      }]
    };
    yield {
      id: "chunk-4",
      choices: [{
        index: 0,
        delta: { content: "" },
        finish_reason: "stop"
      }]
    };
  })
}));

// Mock db module
vi.mock("./db", () => ({
  logAnalyticsEvent: vi.fn().mockResolvedValue(undefined)
}));

// Mock notification module
vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true)
}));

function createMockRequest(body: StreamChatRequest): Partial<Request> {
  return {
    body
  };
}

function createMockResponse(): { res: Partial<Response>; chunks: string[]; headers: Record<string, string> } {
  const chunks: string[] = [];
  const headers: Record<string, string> = {};
  
  const res: Partial<Response> = {
    setHeader: vi.fn((name: string, value: string) => {
      headers[name] = value;
      return res as Response;
    }),
    write: vi.fn((data: string) => {
      chunks.push(data);
      return true;
    }),
    end: vi.fn(),
    headersSent: false,
    status: vi.fn().mockReturnThis(),
    json: vi.fn()
  };
  
  return { res, chunks, headers };
}

describe("handleStreamingChat", () => {
  it("sets correct SSE headers", async () => {
    const req = createMockRequest({
      message: "Test complaint",
      feature: "complaints",
      language: "arabic"
    });
    const { res, headers } = createMockResponse();

    await handleStreamingChat(req as Request, res as Response);

    expect(headers["Content-Type"]).toBe("text/event-stream");
    expect(headers["Cache-Control"]).toBe("no-cache");
    expect(headers["Connection"]).toBe("keep-alive");
  });

  it("streams Arabic complaint response in chunks", async () => {
    const req = createMockRequest({
      message: "تم اكتشاف مخالفات مالية في عقود الصيانة",
      feature: "complaints",
      language: "arabic"
    });
    const { res, chunks } = createMockResponse();

    await handleStreamingChat(req as Request, res as Response);

    // Should have multiple chunks plus done event
    expect(chunks.length).toBeGreaterThan(1);
    
    // Parse chunks to verify content
    const parsedChunks = chunks
      .filter(c => c.startsWith("data: "))
      .map(c => JSON.parse(c.slice(6).trim()));
    
    // Should have chunk type messages
    const contentChunks = parsedChunks.filter(c => c.type === "chunk");
    expect(contentChunks.length).toBeGreaterThan(0);
    
    // Should have a done message at the end
    const doneChunk = parsedChunks.find(c => c.type === "done");
    expect(doneChunk).toBeDefined();
    // Risk score is extracted from the full response text
    expect(typeof doneChunk.riskScore).toBe("number");
  });

  it("streams English complaint response", async () => {
    const req = createMockRequest({
      message: "Financial irregularities discovered",
      feature: "complaints",
      language: "english"
    });
    const { res, chunks } = createMockResponse();

    await handleStreamingChat(req as Request, res as Response);

    expect(chunks.length).toBeGreaterThan(0);
    expect(res.end).toHaveBeenCalled();
  });

  it("handles legislative mode queries", async () => {
    const req = createMockRequest({
      message: "What are the powers of OSAI?",
      feature: "legislative",
      language: "english"
    });
    const { res, chunks } = createMockResponse();

    await handleStreamingChat(req as Request, res as Response);

    expect(chunks.length).toBeGreaterThan(0);
    expect(res.end).toHaveBeenCalled();
  });

  it("returns error for missing required fields", async () => {
    const req = createMockRequest({
      message: "",
      feature: "complaints",
      language: "arabic"
    });
    const { res } = createMockResponse();

    await handleStreamingChat(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Missing required fields" });
  });

  it("includes conversation history in context", async () => {
    const req = createMockRequest({
      message: "Follow up question",
      feature: "complaints",
      language: "arabic",
      history: [
        { role: "user", content: "Previous question" },
        { role: "assistant", content: "Previous answer" }
      ]
    });
    const { res, chunks } = createMockResponse();

    await handleStreamingChat(req as Request, res as Response);

    expect(chunks.length).toBeGreaterThan(0);
    expect(res.end).toHaveBeenCalled();
  });
});
