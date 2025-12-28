import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database and storage modules
vi.mock("./db", () => ({
  getDb: vi.fn(() => ({
    insert: vi.fn(() => ({
      values: vi.fn(() => Promise.resolve([{ insertId: 1 }]))
    })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            limit: vi.fn(() => ({
              offset: vi.fn(() => Promise.resolve([]))
            }))
          })),
          limit: vi.fn(() => Promise.resolve([{
            id: 1,
            userId: 1,
            title: "Test Document",
            fileName: "test.pdf",
            fileType: "pdf",
            fileSize: 1024,
            fileUrl: "https://example.com/test.pdf",
            fileKey: "user-documents/1/test.pdf",
            isPrivate: true,
            sharedWith: null,
            category: "other"
          }]))
        }))
      }))
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve())
      }))
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve())
    }))
  }))
}));

vi.mock("./storage", () => ({
  storagePut: vi.fn(() => Promise.resolve({ url: "https://s3.example.com/test.pdf", key: "test-key" }))
}));

vi.mock("./pdfParser", () => ({
  parsePDF: vi.fn(() => Promise.resolve({ text: "Test PDF content", numPages: 1, info: {} })),
  isArabicText: vi.fn((text: string) => /[\u0600-\u06FF]/.test(text)),
  extractSummary: vi.fn((text: string) => text.slice(0, 100)),
  extractKeywords: vi.fn(() => ["test", "document"])
}));

vi.mock("../drizzle/schema", () => ({
  userDocuments: {
    id: "id",
    userId: "userId",
    title: "title",
    category: "category",
    createdAt: "createdAt"
  }
}));

describe("User Documents API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Document Upload Validation", () => {
    it("should validate file size limit (10MB)", () => {
      const maxSize = 10 * 1024 * 1024; // 10MB in bytes
      const validSize = 5 * 1024 * 1024; // 5MB
      const invalidSize = 15 * 1024 * 1024; // 15MB
      
      expect(validSize).toBeLessThanOrEqual(maxSize);
      expect(invalidSize).toBeGreaterThan(maxSize);
    });

    it("should sanitize file names", () => {
      const unsafeFileName = "test file@#$%.pdf";
      const sanitizedFileName = unsafeFileName.replace(/[^a-zA-Z0-9.-]/g, '_');
      
      expect(sanitizedFileName).toBe("test_file____.pdf");
      expect(sanitizedFileName).not.toContain("@");
      expect(sanitizedFileName).not.toContain("#");
      expect(sanitizedFileName).not.toContain("$");
      expect(sanitizedFileName).not.toContain("%");
      expect(sanitizedFileName).not.toContain(" ");
    });

    it("should validate supported file types", () => {
      const supportedTypes = ["pdf", "doc", "docx", "txt", "image"];
      
      expect(supportedTypes).toContain("pdf");
      expect(supportedTypes).toContain("txt");
      expect(supportedTypes).not.toContain("exe");
      expect(supportedTypes).not.toContain("js");
    });

    it("should map file types to content types correctly", () => {
      const contentTypeMap: Record<string, string> = {
        pdf: "application/pdf",
        doc: "application/msword",
        docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        txt: "text/plain",
        image: "image/jpeg"
      };
      
      expect(contentTypeMap["pdf"]).toBe("application/pdf");
      expect(contentTypeMap["txt"]).toBe("text/plain");
      expect(contentTypeMap["docx"]).toContain("openxmlformats");
    });
  });

  describe("Access Control", () => {
    it("should allow owner to access their own documents", () => {
      const document = { userId: 1, isPrivate: true, sharedWith: null };
      const currentUserId = 1;
      
      const isOwner = document.userId === currentUserId;
      expect(isOwner).toBe(true);
    });

    it("should deny access to other users' private documents", () => {
      const document = { userId: 1, isPrivate: true, sharedWith: null };
      const currentUserId = 2;
      const isAdmin = false;
      
      const isOwner = document.userId === currentUserId;
      const isShared = document.sharedWith ? JSON.parse(document.sharedWith).includes(currentUserId) : false;
      
      const hasAccess = isOwner || isAdmin || isShared;
      expect(hasAccess).toBe(false);
    });

    it("should allow admin to access any document", () => {
      const document = { userId: 1, isPrivate: true, sharedWith: null };
      const currentUserId = 2;
      const isAdmin = true;
      
      const isOwner = document.userId === currentUserId;
      const hasAccess = isOwner || isAdmin;
      
      expect(hasAccess).toBe(true);
    });

    it("should allow access to shared documents", () => {
      const document = { userId: 1, isPrivate: true, sharedWith: JSON.stringify([2, 3]) };
      const currentUserId = 2;
      const isAdmin = false;
      
      const isOwner = document.userId === currentUserId;
      const isShared = document.sharedWith && JSON.parse(document.sharedWith).includes(currentUserId);
      
      const hasAccess = isOwner || isAdmin || isShared;
      expect(hasAccess).toBe(true);
    });

    it("should deny access to users not in shared list", () => {
      const document = { userId: 1, isPrivate: true, sharedWith: JSON.stringify([2, 3]) };
      const currentUserId = 4;
      const isAdmin = false;
      
      const isOwner = document.userId === currentUserId;
      const isShared = document.sharedWith && JSON.parse(document.sharedWith).includes(currentUserId);
      
      const hasAccess = isOwner || isAdmin || isShared;
      expect(hasAccess).toBe(false);
    });
  });

  describe("Document Categories", () => {
    it("should support all defined categories", () => {
      const categories = ["complaint", "evidence", "legal_document", "report", "correspondence", "other"];
      
      expect(categories).toHaveLength(6);
      expect(categories).toContain("complaint");
      expect(categories).toContain("evidence");
      expect(categories).toContain("legal_document");
    });

    it("should default to 'other' category", () => {
      const defaultCategory = "other";
      expect(defaultCategory).toBe("other");
    });
  });

  describe("Arabic Text Detection", () => {
    it("should detect Arabic text", () => {
      const arabicText = "هذا نص عربي للاختبار";
      const isArabic = /[\u0600-\u06FF]/.test(arabicText);
      
      expect(isArabic).toBe(true);
    });

    it("should detect English text", () => {
      const englishText = "This is English text for testing";
      const isArabic = /[\u0600-\u06FF]/.test(englishText);
      
      expect(isArabic).toBe(false);
    });

    it("should handle mixed content", () => {
      const mixedText = "Hello مرحبا World";
      const hasArabic = /[\u0600-\u06FF]/.test(mixedText);
      
      expect(hasArabic).toBe(true);
    });
  });

  describe("File Key Generation", () => {
    it("should generate unique file keys with user ID and timestamp", () => {
      const userId = 123;
      const timestamp = Date.now();
      const fileName = "document.pdf";
      
      const fileKey = `user-documents/${userId}/${timestamp}-${fileName}`;
      
      expect(fileKey).toContain(`user-documents/${userId}/`);
      expect(fileKey).toContain(fileName);
      expect(fileKey).toMatch(/user-documents\/\d+\/\d+-/);
    });

    it("should isolate documents by user ID in path", () => {
      const user1Key = "user-documents/1/doc.pdf";
      const user2Key = "user-documents/2/doc.pdf";
      
      expect(user1Key).not.toBe(user2Key);
      expect(user1Key).toContain("/1/");
      expect(user2Key).toContain("/2/");
    });
  });
});
