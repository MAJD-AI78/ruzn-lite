import { eq, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, conversations, sampleComplaints, InsertConversation } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Conversation functions
export async function saveConversation(data: Omit<InsertConversation, 'id' | 'createdAt'>): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot save conversation: database not available");
    return;
  }

  try {
    await db.insert(conversations).values(data);
  } catch (error) {
    console.error("[Database] Failed to save conversation:", error);
    throw error;
  }
}

export async function getConversationsByUser(userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get conversations: database not available");
    return [];
  }

  try {
    const result = await db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.createdAt))
      .limit(50);
    return result;
  } catch (error) {
    console.error("[Database] Failed to get conversations:", error);
    return [];
  }
}

// Sample complaints functions
export async function getSampleComplaints(language?: string, category?: string) {
  const db = await getDb();
  if (!db) {
    // Return hardcoded samples if database is not available
    return getHardcodedSamples(language, category);
  }

  try {
    let query = db.select().from(sampleComplaints);
    if (category) {
      query = query.where(eq(sampleComplaints.category, category)) as typeof query;
    }
    const result = await query.limit(20);
    
    if (result.length === 0) {
      return getHardcodedSamples(language, category);
    }
    
    return result.map(s => ({
      id: s.id,
      text: language === 'english' ? s.textEnglish : s.textArabic,
      category: s.category,
      expectedRiskScore: s.expectedRiskScore
    }));
  } catch (error) {
    console.error("[Database] Failed to get sample complaints:", error);
    return getHardcodedSamples(language, category);
  }
}

// Hardcoded sample complaints for demo (fallback)
function getHardcodedSamples(language?: string, category?: string) {
  const samples = [
    // Financial Corruption
    {
      id: 1,
      textArabic: "تم اكتشاف مخالفات مالية في عقود الصيانة بالوزارة، حيث تم صرف مبالغ لشركات وهمية",
      textEnglish: "Financial irregularities discovered in ministry maintenance contracts, with payments made to fictitious companies",
      category: "financial_corruption",
      expectedRiskScore: 85
    },
    {
      id: 2,
      textArabic: "اختلاس مبالغ من صندوق المشاريع الصغيرة بقيمة 50 ألف ريال",
      textEnglish: "Embezzlement of 50,000 OMR from the small projects fund",
      category: "financial_corruption",
      expectedRiskScore: 90
    },
    {
      id: 3,
      textArabic: "تزوير فواتير مشتريات حكومية وصرف مبالغ مضاعفة",
      textEnglish: "Forged government purchase invoices with duplicate payments processed",
      category: "financial_corruption",
      expectedRiskScore: 88
    },
    // Conflict of Interest
    {
      id: 4,
      textArabic: "موظف يمنح عقودًا لشركة يملكها قريبه بدون منافسة",
      textEnglish: "Employee awarding contracts to a company owned by his relative without competition",
      category: "conflict_of_interest",
      expectedRiskScore: 75
    },
    {
      id: 5,
      textArabic: "مدير إدارة يعيّن زوجته في منصب قيادي بالوزارة",
      textEnglish: "Department director appointed his wife to a leadership position in the ministry",
      category: "conflict_of_interest",
      expectedRiskScore: 70
    },
    {
      id: 6,
      textArabic: "تفضيل شركة معينة في جميع المناقصات بسبب علاقة شخصية",
      textEnglish: "Favoritism towards a specific company in all tenders due to personal relationship",
      category: "conflict_of_interest",
      expectedRiskScore: 72
    },
    // Abuse of Power
    {
      id: 7,
      textArabic: "مسؤول يستخدم سيارات الحكومة لأغراض شخصية",
      textEnglish: "Official using government vehicles for personal purposes",
      category: "abuse_of_power",
      expectedRiskScore: 55
    },
    {
      id: 8,
      textArabic: "إجبار الموظفين على العمل في مشاريع خاصة بالمدير",
      textEnglish: "Forcing employees to work on the director's private projects",
      category: "abuse_of_power",
      expectedRiskScore: 65
    },
    {
      id: 9,
      textArabic: "قرارات تعسفية بنقل موظفين بسبب خلافات شخصية",
      textEnglish: "Arbitrary decisions to transfer employees due to personal disputes",
      category: "abuse_of_power",
      expectedRiskScore: 60
    },
    // Tender Law Violation
    {
      id: 10,
      textArabic: "تجاوز إجراءات الطرح والترسية المباشرة لمقاول محدد",
      textEnglish: "Bypassing tender procedures with direct award to a specific contractor",
      category: "tender_violation",
      expectedRiskScore: 80
    },
    {
      id: 11,
      textArabic: "تقسيم العقد لتجنب الحد الأعلى للمناقصات",
      textEnglish: "Splitting contracts to avoid tender threshold requirements",
      category: "tender_violation",
      expectedRiskScore: 78
    },
    {
      id: 12,
      textArabic: "تسريب معلومات المناقصة لشركة معينة قبل الإعلان",
      textEnglish: "Leaking tender information to a specific company before announcement",
      category: "tender_violation",
      expectedRiskScore: 82
    },
    // Administrative Negligence
    {
      id: 13,
      textArabic: "تأخر صرف مستحقات المقاولين لأكثر من سنة",
      textEnglish: "Contractor payments delayed for over a year",
      category: "administrative_negligence",
      expectedRiskScore: 45
    },
    {
      id: 14,
      textArabic: "عدم متابعة تنفيذ المشاريع وتأخرها عن الجدول الزمني",
      textEnglish: "Lack of project monitoring leading to schedule delays",
      category: "administrative_negligence",
      expectedRiskScore: 40
    },
    {
      id: 15,
      textArabic: "إهمال صيانة المباني الحكومية وتدهور حالتها",
      textEnglish: "Neglecting government building maintenance leading to deterioration",
      category: "administrative_negligence",
      expectedRiskScore: 35
    },
    // General Complaints
    {
      id: 16,
      textArabic: "استفسار عن إجراءات تقديم شكوى رسمية",
      textEnglish: "Inquiry about procedures for filing an official complaint",
      category: "general",
      expectedRiskScore: 15
    },
    {
      id: 17,
      textArabic: "ملاحظات عامة حول تحسين الخدمات الحكومية",
      textEnglish: "General observations about improving government services",
      category: "general",
      expectedRiskScore: 10
    },
    {
      id: 18,
      textArabic: "طلب معلومات عن صلاحيات ديوان الرقابة",
      textEnglish: "Request for information about State Audit Institution powers",
      category: "general",
      expectedRiskScore: 5
    }
  ];

  let filtered = samples;
  if (category) {
    filtered = samples.filter(s => s.category === category);
  }

  return filtered.map(s => ({
    id: s.id,
    text: language === 'english' ? s.textEnglish : s.textArabic,
    category: s.category,
    expectedRiskScore: s.expectedRiskScore
  }));
}
