import { eq, desc, sql, and, gte, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users, conversations, sampleComplaints, 
  InsertConversation, analyticsEvents, InsertAnalyticsEvent,
  auditFindings, InsertAuditFinding, legislativeDocuments, 
  InsertLegislativeDocument, demoTrends, InsertDemoTrend,
  statusHistory, InsertStatusHistory, weeklyReports, InsertWeeklyReport
} from "../drizzle/schema";
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

export async function getAllUsers() {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get users: database not available");
    return [];
  }

  try {
    const result = await db.select().from(users).orderBy(desc(users.lastSignedIn));
    return result;
  } catch (error) {
    console.error("[Database] Failed to get users:", error);
    return [];
  }
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

export async function getAllConversations(limit = 100) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get conversations: database not available");
    return [];
  }

  try {
    const result = await db
      .select({
        id: conversations.id,
        userId: conversations.userId,
        messages: conversations.messages,
        feature: conversations.feature,
        language: conversations.language,
        riskScore: conversations.riskScore,
        category: conversations.category,
        createdAt: conversations.createdAt,
        userName: users.name,
        userEmail: users.email
      })
      .from(conversations)
      .leftJoin(users, eq(conversations.userId, users.id))
      .orderBy(desc(conversations.createdAt))
      .limit(limit);
    return result;
  } catch (error) {
    console.error("[Database] Failed to get all conversations:", error);
    return [];
  }
}

// Analytics functions
export async function logAnalyticsEvent(data: Omit<InsertAnalyticsEvent, 'id' | 'createdAt'>): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot log analytics event: database not available");
    return;
  }

  try {
    await db.insert(analyticsEvents).values(data);
  } catch (error) {
    console.error("[Database] Failed to log analytics event:", error);
  }
}

export async function getAnalyticsSummary(startDate?: Date, endDate?: Date) {
  const db = await getDb();
  
  // Return demo data if database is not available
  if (!db) {
    return getDemoAnalytics();
  }

  try {
    // Get real data from database
    const conditions = [];
    if (startDate) {
      conditions.push(gte(analyticsEvents.createdAt, startDate));
    }
    if (endDate) {
      conditions.push(lte(analyticsEvents.createdAt, endDate));
    }

    const events = await db
      .select()
      .from(analyticsEvents)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    if (events.length === 0) {
      return getDemoAnalytics();
    }

    // Calculate summary
    const totalComplaints = events.filter(e => e.eventType === 'complaint_analyzed').length;
    const avgRiskScore = events
      .filter(e => e.riskScore !== null)
      .reduce((sum, e) => sum + (e.riskScore || 0), 0) / (events.filter(e => e.riskScore !== null).length || 1);

    const categoryDistribution = events
      .filter(e => e.category)
      .reduce((acc, e) => {
        acc[e.category!] = (acc[e.category!] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    const riskDistribution = {
      high: events.filter(e => (e.riskScore || 0) >= 70).length,
      medium: events.filter(e => (e.riskScore || 0) >= 40 && (e.riskScore || 0) < 70).length,
      low: events.filter(e => (e.riskScore || 0) < 40).length
    };

    return {
      totalComplaints,
      avgRiskScore: Math.round(avgRiskScore),
      categoryDistribution,
      riskDistribution,
      totalUsers: new Set(events.map(e => e.userId)).size,
      totalPdfExports: events.filter(e => e.eventType === 'pdf_export').length,
      totalVoiceInputs: events.filter(e => e.eventType === 'voice_input').length
    };
  } catch (error) {
    console.error("[Database] Failed to get analytics summary:", error);
    return getDemoAnalytics();
  }
}

// Demo analytics data for presentation
function getDemoAnalytics() {
  return {
    totalComplaints: 1378,
    avgRiskScore: 62,
    categoryDistribution: {
      financial_corruption: 312,
      conflict_of_interest: 198,
      abuse_of_power: 156,
      tender_violation: 287,
      administrative_negligence: 245,
      general: 180
    },
    riskDistribution: {
      high: 423,
      medium: 567,
      low: 388
    },
    totalUsers: 47,
    totalPdfExports: 89,
    totalVoiceInputs: 34,
    trends: [
      { month: "يناير", complaints: 98, avgRisk: 58 },
      { month: "فبراير", complaints: 112, avgRisk: 61 },
      { month: "مارس", complaints: 125, avgRisk: 64 },
      { month: "أبريل", complaints: 108, avgRisk: 59 },
      { month: "مايو", complaints: 134, avgRisk: 67 },
      { month: "يونيو", complaints: 142, avgRisk: 65 },
      { month: "يوليو", complaints: 118, avgRisk: 62 },
      { month: "أغسطس", complaints: 127, avgRisk: 60 },
      { month: "سبتمبر", complaints: 136, avgRisk: 63 },
      { month: "أكتوبر", complaints: 145, avgRisk: 66 },
      { month: "نوفمبر", complaints: 128, avgRisk: 61 },
      { month: "ديسمبر", complaints: 105, avgRisk: 58 }
    ]
  };
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
    const result = await query.limit(50);
    
    if (result.length === 0) {
      return getHardcodedSamples(language, category);
    }
    
    return result.map(s => ({
      id: s.id,
      text: language === 'english' ? s.textEnglish : s.textArabic,
      category: s.category,
      expectedRiskScore: s.expectedRiskScore,
      ministry: s.ministry
    }));
  } catch (error) {
    console.error("[Database] Failed to get sample complaints:", error);
    return getHardcodedSamples(language, category);
  }
}

// Audit findings functions
export async function getAuditFindings(language?: string, severity?: string, ministry?: string) {
  const db = await getDb();
  if (!db) {
    return getHardcodedAuditFindings(language);
  }

  try {
    const conditions = [];
    if (severity) {
      conditions.push(eq(auditFindings.severity, severity as any));
    }
    if (ministry) {
      conditions.push(eq(auditFindings.ministry, ministry));
    }

    const result = await db
      .select()
      .from(auditFindings)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(auditFindings.year))
      .limit(50);

    if (result.length === 0) {
      return getHardcodedAuditFindings(language);
    }

    return result.map(f => ({
      id: f.id,
      title: language === 'english' ? f.titleEnglish : f.titleArabic,
      description: language === 'english' ? f.descriptionEnglish : f.descriptionArabic,
      category: f.category,
      severity: f.severity,
      ministry: f.ministry,
      year: f.year,
      amountOMR: f.amountOMR,
      status: f.status
    }));
  } catch (error) {
    console.error("[Database] Failed to get audit findings:", error);
    return getHardcodedAuditFindings(language);
  }
}

// Legislative documents functions
export async function getLegislativeDocuments(language?: string, documentType?: string) {
  const db = await getDb();
  if (!db) {
    return getHardcodedLegislativeDocuments(language);
  }

  try {
    const conditions = [eq(legislativeDocuments.isActive, 1)];
    if (documentType) {
      conditions.push(eq(legislativeDocuments.documentType, documentType as any));
    }

    const result = await db
      .select()
      .from(legislativeDocuments)
      .where(and(...conditions))
      .orderBy(desc(legislativeDocuments.year))
      .limit(50);

    if (result.length === 0) {
      return getHardcodedLegislativeDocuments(language);
    }

    return result.map(d => ({
      id: d.id,
      title: language === 'english' ? d.titleEnglish : d.titleArabic,
      documentType: d.documentType,
      documentNumber: d.documentNumber,
      year: d.year,
      summary: language === 'english' ? d.summaryEnglish : d.summaryArabic,
      keyProvisions: d.keyProvisions ? JSON.parse(d.keyProvisions) : []
    }));
  } catch (error) {
    console.error("[Database] Failed to get legislative documents:", error);
    return getHardcodedLegislativeDocuments(language);
  }
}

// Hardcoded sample complaints for demo (expanded to 50+)
function getHardcodedSamples(language?: string, category?: string) {
  const samples = [
    // Financial Corruption (10 samples)
    { id: 1, textArabic: "تم اكتشاف مخالفات مالية في عقود الصيانة بالوزارة، حيث تم صرف مبالغ لشركات وهمية", textEnglish: "Financial irregularities discovered in ministry maintenance contracts, with payments made to fictitious companies", category: "financial_corruption", expectedRiskScore: 85, ministry: "وزارة الإسكان" },
    { id: 2, textArabic: "اختلاس مبالغ من صندوق المشاريع الصغيرة بقيمة 50 ألف ريال", textEnglish: "Embezzlement of 50,000 OMR from the small projects fund", category: "financial_corruption", expectedRiskScore: 90, ministry: "وزارة التجارة" },
    { id: 3, textArabic: "تزوير فواتير مشتريات حكومية وصرف مبالغ مضاعفة", textEnglish: "Forged government purchase invoices with duplicate payments processed", category: "financial_corruption", expectedRiskScore: 88, ministry: "وزارة الصحة" },
    { id: 4, textArabic: "صرف بدلات سفر وهمية لموظفين لم يسافروا فعلياً", textEnglish: "Disbursement of fake travel allowances for employees who never traveled", category: "financial_corruption", expectedRiskScore: 82, ministry: "وزارة التربية" },
    { id: 5, textArabic: "تلاعب في سجلات المخزون وبيع مواد حكومية بشكل غير قانوني", textEnglish: "Manipulation of inventory records and illegal sale of government materials", category: "financial_corruption", expectedRiskScore: 87, ministry: "وزارة الدفاع" },
    { id: 6, textArabic: "استخدام ميزانية التدريب لأغراض شخصية", textEnglish: "Using training budget for personal purposes", category: "financial_corruption", expectedRiskScore: 75, ministry: "وزارة العمل" },
    { id: 7, textArabic: "تضخيم أسعار المشتريات والحصول على عمولات سرية", textEnglish: "Inflating purchase prices and receiving secret commissions", category: "financial_corruption", expectedRiskScore: 89, ministry: "وزارة النقل" },
    { id: 8, textArabic: "صرف رواتب لموظفين وهميين غير موجودين", textEnglish: "Paying salaries to ghost employees who don't exist", category: "financial_corruption", expectedRiskScore: 92, ministry: "وزارة الداخلية" },
    { id: 9, textArabic: "تحويل أموال مشاريع حكومية لحسابات شخصية", textEnglish: "Transferring government project funds to personal accounts", category: "financial_corruption", expectedRiskScore: 95, ministry: "وزارة المالية" },
    { id: 10, textArabic: "التلاعب في عدادات الوقود وسرقة المحروقات الحكومية", textEnglish: "Tampering with fuel meters and stealing government fuel", category: "financial_corruption", expectedRiskScore: 78, ministry: "شرطة عمان السلطانية" },

    // Conflict of Interest (10 samples)
    { id: 11, textArabic: "موظف يمنح عقودًا لشركة يملكها قريبه بدون منافسة", textEnglish: "Employee awarding contracts to a company owned by his relative without competition", category: "conflict_of_interest", expectedRiskScore: 75, ministry: "وزارة الإسكان" },
    { id: 12, textArabic: "مدير إدارة يعيّن زوجته في منصب قيادي بالوزارة", textEnglish: "Department director appointed his wife to a leadership position in the ministry", category: "conflict_of_interest", expectedRiskScore: 70, ministry: "وزارة التربية" },
    { id: 13, textArabic: "تفضيل شركة معينة في جميع المناقصات بسبب علاقة شخصية", textEnglish: "Favoritism towards a specific company in all tenders due to personal relationship", category: "conflict_of_interest", expectedRiskScore: 72, ministry: "وزارة النقل" },
    { id: 14, textArabic: "مسؤول يملك أسهم في شركة يتعامل معها بحكم منصبه", textEnglish: "Official owns shares in a company he deals with by virtue of his position", category: "conflict_of_interest", expectedRiskScore: 80, ministry: "وزارة التجارة" },
    { id: 15, textArabic: "توظيف أبناء المسؤولين بدون إعلان وظيفي", textEnglish: "Hiring officials' children without job advertisements", category: "conflict_of_interest", expectedRiskScore: 65, ministry: "وزارة الخدمة المدنية" },
    { id: 16, textArabic: "مدير يحول مشاريع لشركة شقيقه بشكل متكرر", textEnglish: "Director repeatedly redirecting projects to his brother's company", category: "conflict_of_interest", expectedRiskScore: 77, ministry: "وزارة البلديات" },
    { id: 17, textArabic: "عضو لجنة مناقصات يصوت لصالح شركة يملك فيها حصة", textEnglish: "Tender committee member voting for a company in which he owns a stake", category: "conflict_of_interest", expectedRiskScore: 82, ministry: "مجلس المناقصات" },
    { id: 18, textArabic: "مسؤول يستخدم معلومات سرية لمصلحة شركته الخاصة", textEnglish: "Official using confidential information for his private company's benefit", category: "conflict_of_interest", expectedRiskScore: 85, ministry: "وزارة الاقتصاد" },

    // Abuse of Power (10 samples)
    { id: 19, textArabic: "مسؤول يستخدم سيارات الحكومة لأغراض شخصية", textEnglish: "Official using government vehicles for personal purposes", category: "abuse_of_power", expectedRiskScore: 55, ministry: "وزارة الداخلية" },
    { id: 20, textArabic: "إجبار الموظفين على العمل في مشاريع خاصة بالمدير", textEnglish: "Forcing employees to work on the director's private projects", category: "abuse_of_power", expectedRiskScore: 65, ministry: "وزارة الصحة" },
    { id: 21, textArabic: "قرارات تعسفية بنقل موظفين بسبب خلافات شخصية", textEnglish: "Arbitrary decisions to transfer employees due to personal disputes", category: "abuse_of_power", expectedRiskScore: 60, ministry: "وزارة التربية" },
    { id: 22, textArabic: "استخدام صلاحيات المنصب للضغط على المواطنين", textEnglish: "Using position powers to pressure citizens", category: "abuse_of_power", expectedRiskScore: 70, ministry: "شرطة عمان السلطانية" },
    { id: 23, textArabic: "حرمان موظفين من الترقية بسبب رفضهم طلبات شخصية", textEnglish: "Denying employees promotions for refusing personal requests", category: "abuse_of_power", expectedRiskScore: 62, ministry: "وزارة العمل" },
    { id: 24, textArabic: "استخدام موارد الوزارة لحملات انتخابية شخصية", textEnglish: "Using ministry resources for personal election campaigns", category: "abuse_of_power", expectedRiskScore: 75, ministry: "وزارة الداخلية" },
    { id: 25, textArabic: "إجبار المرؤوسين على التوقيع على وثائق مخالفة", textEnglish: "Forcing subordinates to sign irregular documents", category: "abuse_of_power", expectedRiskScore: 68, ministry: "وزارة المالية" },
    { id: 26, textArabic: "التدخل في عمل الجهات الرقابية لحماية مخالفين", textEnglish: "Interfering with oversight bodies to protect violators", category: "abuse_of_power", expectedRiskScore: 80, ministry: "ديوان البلاط السلطاني" },

    // Tender Law Violation (10 samples)
    { id: 27, textArabic: "تجاوز إجراءات الطرح والترسية المباشرة لمقاول محدد", textEnglish: "Bypassing tender procedures with direct award to a specific contractor", category: "tender_violation", expectedRiskScore: 80, ministry: "وزارة الإسكان" },
    { id: 28, textArabic: "تقسيم العقد لتجنب الحد الأعلى للمناقصات", textEnglish: "Splitting contracts to avoid tender threshold requirements", category: "tender_violation", expectedRiskScore: 78, ministry: "وزارة الصحة" },
    { id: 29, textArabic: "تسريب معلومات المناقصة لشركة معينة قبل الإعلان", textEnglish: "Leaking tender information to a specific company before announcement", category: "tender_violation", expectedRiskScore: 82, ministry: "مجلس المناقصات" },
    { id: 30, textArabic: "تعديل شروط المناقصة بعد فتح العطاءات", textEnglish: "Modifying tender conditions after opening bids", category: "tender_violation", expectedRiskScore: 85, ministry: "وزارة النقل" },
    { id: 31, textArabic: "استبعاد عطاءات مؤهلة بدون مبرر قانوني", textEnglish: "Excluding qualified bids without legal justification", category: "tender_violation", expectedRiskScore: 77, ministry: "وزارة الدفاع" },
    { id: 32, textArabic: "منح أوامر تغييرية تتجاوز النسبة المسموح بها", textEnglish: "Issuing change orders exceeding the allowed percentage", category: "tender_violation", expectedRiskScore: 72, ministry: "وزارة البلديات" },
    { id: 33, textArabic: "عدم الإعلان عن المناقصات في الجريدة الرسمية", textEnglish: "Not advertising tenders in the official gazette", category: "tender_violation", expectedRiskScore: 65, ministry: "وزارة الإعلام" },
    { id: 34, textArabic: "تمديد العقود بدون موافقة مجلس المناقصات", textEnglish: "Extending contracts without Tender Board approval", category: "tender_violation", expectedRiskScore: 70, ministry: "وزارة التربية" },

    // Administrative Negligence (8 samples)
    { id: 35, textArabic: "تأخر صرف مستحقات المقاولين لأكثر من سنة", textEnglish: "Contractor payments delayed for over a year", category: "administrative_negligence", expectedRiskScore: 45, ministry: "وزارة المالية" },
    { id: 36, textArabic: "عدم متابعة تنفيذ المشاريع وتأخرها عن الجدول الزمني", textEnglish: "Lack of project monitoring leading to schedule delays", category: "administrative_negligence", expectedRiskScore: 40, ministry: "وزارة الإسكان" },
    { id: 37, textArabic: "إهمال صيانة المباني الحكومية وتدهور حالتها", textEnglish: "Neglecting government building maintenance leading to deterioration", category: "administrative_negligence", expectedRiskScore: 35, ministry: "وزارة البلديات" },
    { id: 38, textArabic: "عدم تحديث السجلات والأنظمة الإلكترونية", textEnglish: "Failure to update records and electronic systems", category: "administrative_negligence", expectedRiskScore: 30, ministry: "وزارة التقنية" },
    { id: 39, textArabic: "تراكم المعاملات وتأخر الرد على المراجعين", textEnglish: "Accumulation of transactions and delayed responses to visitors", category: "administrative_negligence", expectedRiskScore: 38, ministry: "وزارة الخدمة المدنية" },
    { id: 40, textArabic: "عدم تطبيق إجراءات السلامة في مواقع العمل", textEnglish: "Failure to implement safety procedures at work sites", category: "administrative_negligence", expectedRiskScore: 50, ministry: "وزارة العمل" },
    { id: 41, textArabic: "إهمال متابعة الضمانات البنكية وانتهاء صلاحيتها", textEnglish: "Neglecting to follow up on bank guarantees and their expiration", category: "administrative_negligence", expectedRiskScore: 55, ministry: "وزارة المالية" },
    { id: 42, textArabic: "عدم توثيق القرارات الإدارية بشكل صحيح", textEnglish: "Failure to properly document administrative decisions", category: "administrative_negligence", expectedRiskScore: 42, ministry: "وزارة العدل" },

    // General Complaints (8 samples)
    { id: 43, textArabic: "استفسار عن إجراءات تقديم شكوى رسمية", textEnglish: "Inquiry about procedures for filing an official complaint", category: "general", expectedRiskScore: 15, ministry: "ديوان الرقابة" },
    { id: 44, textArabic: "ملاحظات عامة حول تحسين الخدمات الحكومية", textEnglish: "General observations about improving government services", category: "general", expectedRiskScore: 10, ministry: "عام" },
    { id: 45, textArabic: "طلب معلومات عن صلاحيات ديوان الرقابة", textEnglish: "Request for information about State Audit Institution powers", category: "general", expectedRiskScore: 5, ministry: "ديوان الرقابة" },
    { id: 46, textArabic: "اقتراح لتطوير آلية استقبال الشكاوى", textEnglish: "Suggestion to improve the complaint reception mechanism", category: "general", expectedRiskScore: 8, ministry: "ديوان الرقابة" },
    { id: 47, textArabic: "استفسار عن نتيجة شكوى سابقة", textEnglish: "Inquiry about the result of a previous complaint", category: "general", expectedRiskScore: 12, ministry: "ديوان الرقابة" },
    { id: 48, textArabic: "طلب نسخة من تقرير الرقابة السنوي", textEnglish: "Request for a copy of the annual audit report", category: "general", expectedRiskScore: 5, ministry: "ديوان الرقابة" },
    { id: 49, textArabic: "شكر وتقدير لجهود ديوان الرقابة", textEnglish: "Thanks and appreciation for the State Audit Institution's efforts", category: "general", expectedRiskScore: 0, ministry: "ديوان الرقابة" },
    { id: 50, textArabic: "استفسار عن التعاون مع المنظمات الدولية للرقابة", textEnglish: "Inquiry about cooperation with international audit organizations", category: "general", expectedRiskScore: 5, ministry: "ديوان الرقابة" }
  ];

  let filtered = samples;
  if (category) {
    filtered = samples.filter(s => s.category === category);
  }

  return filtered.map(s => ({
    id: s.id,
    text: language === 'english' ? s.textEnglish : s.textArabic,
    category: s.category,
    expectedRiskScore: s.expectedRiskScore,
    ministry: s.ministry
  }));
}

// Hardcoded audit findings for demo
function getHardcodedAuditFindings(language?: string) {
  const findings = [
    { id: 1, titleArabic: "مخالفات في إجراءات المناقصات", titleEnglish: "Tender Procedure Violations", descriptionArabic: "عدم الالتزام بإجراءات قانون المناقصات في 15 عقد", descriptionEnglish: "Non-compliance with Tender Law procedures in 15 contracts", category: "tender_violation", severity: "high" as const, ministry: "وزارة الإسكان", year: 2024, amountOMR: 2500000, status: "open" as const },
    { id: 2, titleArabic: "ضعف الرقابة على المشاريع", titleEnglish: "Weak Project Oversight", descriptionArabic: "تأخر 8 مشاريع عن الجدول الزمني بنسبة تتجاوز 50%", descriptionEnglish: "8 projects delayed beyond 50% of schedule", category: "administrative_negligence", severity: "medium" as const, ministry: "وزارة النقل", year: 2024, amountOMR: 5000000, status: "in_progress" as const },
    { id: 3, titleArabic: "اختلاسات مالية", titleEnglish: "Financial Embezzlement", descriptionArabic: "اكتشاف اختلاس بقيمة 120 ألف ريال من صندوق الموظفين", descriptionEnglish: "Discovery of 120,000 OMR embezzlement from employee fund", category: "financial_corruption", severity: "critical" as const, ministry: "وزارة الصحة", year: 2024, amountOMR: 120000, status: "open" as const },
    { id: 4, titleArabic: "تضارب مصالح في التوظيف", titleEnglish: "Conflict of Interest in Hiring", descriptionArabic: "توظيف 12 شخص من أقارب المسؤولين بدون إعلان", descriptionEnglish: "Hiring 12 relatives of officials without advertisement", category: "conflict_of_interest", severity: "medium" as const, ministry: "وزارة التربية", year: 2023, amountOMR: null, status: "resolved" as const },
    { id: 5, titleArabic: "سوء استخدام الموارد", titleEnglish: "Resource Misuse", descriptionArabic: "استخدام معدات الوزارة لأغراض شخصية", descriptionEnglish: "Using ministry equipment for personal purposes", category: "abuse_of_power", severity: "low" as const, ministry: "وزارة الزراعة", year: 2023, amountOMR: 35000, status: "closed" as const }
  ];

  return findings.map(f => ({
    id: f.id,
    title: language === 'english' ? f.titleEnglish : f.titleArabic,
    description: language === 'english' ? f.descriptionEnglish : f.descriptionArabic,
    category: f.category,
    severity: f.severity,
    ministry: f.ministry,
    year: f.year,
    amountOMR: f.amountOMR,
    status: f.status
  }));
}

// Hardcoded legislative documents for demo
function getHardcodedLegislativeDocuments(language?: string) {
  const documents = [
    { id: 1, titleArabic: "قانون الرقابة المالية والإدارية للدولة", titleEnglish: "State Financial and Administrative Audit Law", documentType: "royal_decree" as const, documentNumber: "111/2011", year: 2011, summaryArabic: "ينظم عمل ديوان الرقابة المالية والإدارية للدولة وصلاحياته", summaryEnglish: "Regulates the work and powers of the State Audit Institution", keyProvisions: ["صلاحيات الرقابة", "استقلالية الديوان", "التقارير السنوية"] },
    { id: 2, titleArabic: "قانون المناقصات", titleEnglish: "Tender Law", documentType: "royal_decree" as const, documentNumber: "36/2008", year: 2008, summaryArabic: "ينظم إجراءات المناقصات والمشتريات الحكومية", summaryEnglish: "Regulates government tender and procurement procedures", keyProvisions: ["إجراءات الطرح", "لجان المناقصات", "الاستثناءات"] },
    { id: 3, titleArabic: "قانون حماية المال العام", titleEnglish: "Public Funds Protection Law", documentType: "royal_decree" as const, documentNumber: "112/2011", year: 2011, summaryArabic: "يحدد العقوبات على جرائم المال العام", summaryEnglish: "Defines penalties for public fund crimes", keyProvisions: ["تعريف المال العام", "العقوبات", "الإجراءات"] },
    { id: 4, titleArabic: "لائحة تنظيم العمل الإداري", titleEnglish: "Administrative Work Regulation", documentType: "ministerial_decision" as const, documentNumber: "45/2020", year: 2020, summaryArabic: "تنظم الإجراءات الإدارية في الجهات الحكومية", summaryEnglish: "Regulates administrative procedures in government entities", keyProvisions: ["التفويض", "التوثيق", "المتابعة"] },
    { id: 5, titleArabic: "قانون الخدمة المدنية", titleEnglish: "Civil Service Law", documentType: "royal_decree" as const, documentNumber: "120/2004", year: 2004, summaryArabic: "ينظم شؤون الموظفين في الجهاز الإداري للدولة", summaryEnglish: "Regulates employee affairs in the state administrative apparatus", keyProvisions: ["التوظيف", "الترقيات", "المخالفات"] },
    { id: 6, titleArabic: "قانون مكافحة الفساد", titleEnglish: "Anti-Corruption Law", documentType: "royal_decree" as const, documentNumber: "64/2022", year: 2022, summaryArabic: "يحدد آليات مكافحة الفساد والوقاية منه", summaryEnglish: "Defines mechanisms for combating and preventing corruption", keyProvisions: ["الإفصاح عن الذمة المالية", "حماية المبلغين", "العقوبات"] }
  ];

  return documents.map(d => ({
    id: d.id,
    title: language === 'english' ? d.titleEnglish : d.titleArabic,
    documentType: d.documentType,
    documentNumber: d.documentNumber,
    year: d.year,
    summary: language === 'english' ? d.summaryEnglish : d.summaryArabic,
    keyProvisions: d.keyProvisions
  }));
}


// Status tracking functions
export async function updateConversationStatus(
  conversationId: number, 
  newStatus: 'new' | 'under_review' | 'investigating' | 'resolved',
  changedByUserId: number,
  changedByUserName: string,
  notes?: string
) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update status: database not available");
    return null;
  }

  try {
    // Get current status
    const current = await db
      .select({ status: conversations.status })
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1);
    
    const previousStatus = current[0]?.status || 'new';

    // Update conversation status
    await db
      .update(conversations)
      .set({ status: newStatus })
      .where(eq(conversations.id, conversationId));

    // Log status change in history
    await db.insert(statusHistory).values({
      conversationId,
      previousStatus: previousStatus as any,
      newStatus,
      changedByUserId,
      changedByUserName,
      notes
    });

    return { success: true, previousStatus, newStatus };
  } catch (error) {
    console.error("[Database] Failed to update conversation status:", error);
    throw error;
  }
}

export async function getStatusHistory(conversationId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get status history: database not available");
    return [];
  }

  try {
    const result = await db
      .select()
      .from(statusHistory)
      .where(eq(statusHistory.conversationId, conversationId))
      .orderBy(desc(statusHistory.createdAt));
    return result;
  } catch (error) {
    console.error("[Database] Failed to get status history:", error);
    return [];
  }
}

export async function getConversationsByStatus(status?: string, limit = 100) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get conversations: database not available");
    return [];
  }

  try {
    let query = db
      .select({
        id: conversations.id,
        userId: conversations.userId,
        messages: conversations.messages,
        feature: conversations.feature,
        language: conversations.language,
        riskScore: conversations.riskScore,
        category: conversations.category,
        status: conversations.status,
        createdAt: conversations.createdAt,
        updatedAt: conversations.updatedAt,
        userName: users.name,
        userEmail: users.email
      })
      .from(conversations)
      .leftJoin(users, eq(conversations.userId, users.id));
    
    if (status && status !== 'all') {
      query = query.where(eq(conversations.status, status as any)) as typeof query;
    }
    
    const result = await query.orderBy(desc(conversations.createdAt)).limit(limit);
    return result;
  } catch (error) {
    console.error("[Database] Failed to get conversations by status:", error);
    return [];
  }
}

// Dashboard stats functions
export async function getDashboardStats() {
  const db = await getDb();
  
  // Return demo data if database is not available
  if (!db) {
    return getDemoDashboardStats();
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Get today's complaints
    const todayComplaints = await db
      .select({ count: sql<number>`count(*)` })
      .from(conversations)
      .where(gte(conversations.createdAt, today));

    // Get pending reviews (status = new or under_review)
    const pendingReviews = await db
      .select({ count: sql<number>`count(*)` })
      .from(conversations)
      .where(
        sql`${conversations.status} IN ('new', 'under_review')`
      );

    // Get high-risk awaiting action
    const highRiskAwaiting = await db
      .select({ count: sql<number>`count(*)` })
      .from(conversations)
      .where(
        and(
          gte(conversations.riskScore, 70),
          sql`${conversations.status} IN ('new', 'under_review')`
        )
      );

    // Get 7-day trend - use raw SQL to avoid GROUP BY issues
    const weekTrend = await db.execute(
      sql`SELECT DATE(createdAt) as date, COUNT(*) as count 
          FROM conversations 
          WHERE createdAt >= ${sevenDaysAgo} 
          GROUP BY DATE(createdAt) 
          ORDER BY DATE(createdAt)`
    ) as unknown as Array<{ date: string; count: number }[]>;
    
    const trendData = Array.isArray(weekTrend[0]) ? weekTrend[0] : [];

    return {
      todayComplaints: todayComplaints[0]?.count || 0,
      pendingReviews: pendingReviews[0]?.count || 0,
      highRiskAwaiting: highRiskAwaiting[0]?.count || 0,
      avgResponseTime: 4.2, // Demo value - would need actual calculation
      weekTrend: trendData.map((t: { date: string; count: number }) => ({
        date: t.date,
        count: Number(t.count)
      }))
    };
  } catch (error) {
    console.error("[Database] Failed to get dashboard stats:", error);
    return getDemoDashboardStats();
  }
}

function getDemoDashboardStats() {
  return {
    todayComplaints: 12,
    pendingReviews: 47,
    highRiskAwaiting: 8,
    avgResponseTime: 4.2,
    weekTrend: [
      { date: '2024-12-22', count: 8 },
      { date: '2024-12-23', count: 15 },
      { date: '2024-12-24', count: 11 },
      { date: '2024-12-25', count: 6 },
      { date: '2024-12-26', count: 14 },
      { date: '2024-12-27', count: 18 },
      { date: '2024-12-28', count: 12 }
    ]
  };
}

// Weekly report functions
export async function generateWeeklyReport() {
  const db = await getDb();
  
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 7);

  // Get demo data if database is not available
  if (!db) {
    return getDemoWeeklyReport(startDate, endDate);
  }

  try {
    // Get all conversations from the past week
    const weekConversations = await db
      .select()
      .from(conversations)
      .where(
        and(
          gte(conversations.createdAt, startDate),
          lte(conversations.createdAt, endDate)
        )
      );

    const totalComplaints = weekConversations.length;
    const highRiskCount = weekConversations.filter(c => (c.riskScore || 0) >= 70).length;
    const resolvedCount = weekConversations.filter(c => c.status === 'resolved').length;
    const avgRiskScore = totalComplaints > 0 
      ? Math.round(weekConversations.reduce((sum, c) => sum + (c.riskScore || 0), 0) / totalComplaints)
      : 0;

    // Category breakdown
    const categoryBreakdown: Record<string, number> = {};
    weekConversations.forEach(c => {
      if (c.category) {
        categoryBreakdown[c.category] = (categoryBreakdown[c.category] || 0) + 1;
      }
    });

    // Top entities (placeholder - would need entity field)
    const topEntities = [
      { entity: "وزارة المالية", count: 23, highRisk: 8 },
      { entity: "وزارة الصحة", count: 18, highRisk: 5 },
      { entity: "وزارة التربية", count: 15, highRisk: 3 }
    ];

    const recommendations = [
      "زيادة الرقابة على عمليات المناقصات في وزارة المالية",
      "مراجعة إجراءات الشراء في القطاع الصحي",
      "تعزيز آليات الإبلاغ عن تضارب المصالح"
    ];

    const report = {
      weekStartDate: startDate,
      weekEndDate: endDate,
      totalComplaints,
      highRiskCount,
      resolvedCount,
      avgRiskScore,
      categoryBreakdown: JSON.stringify(categoryBreakdown),
      topEntities: JSON.stringify(topEntities),
      recommendations: JSON.stringify(recommendations)
    };

    // Save report to database
    await db.insert(weeklyReports).values(report);

    return {
      ...report,
      categoryBreakdown,
      topEntities,
      recommendations
    };
  } catch (error) {
    console.error("[Database] Failed to generate weekly report:", error);
    return getDemoWeeklyReport(startDate, endDate);
  }
}

function getDemoWeeklyReport(startDate: Date, endDate: Date) {
  return {
    weekStartDate: startDate,
    weekEndDate: endDate,
    totalComplaints: 87,
    highRiskCount: 24,
    resolvedCount: 31,
    avgRiskScore: 58,
    categoryBreakdown: {
      financial_corruption: 22,
      conflict_of_interest: 14,
      abuse_of_power: 11,
      tender_violation: 19,
      administrative_negligence: 12,
      general: 9
    },
    topEntities: [
      { entity: "وزارة المالية", count: 23, highRisk: 8 },
      { entity: "وزارة الصحة", count: 18, highRisk: 5 },
      { entity: "وزارة التربية", count: 15, highRisk: 3 }
    ],
    recommendations: [
      "زيادة الرقابة على عمليات المناقصات في وزارة المالية",
      "مراجعة إجراءات الشراء في القطاع الصحي",
      "تعزيز آليات الإبلاغ عن تضارب المصالح"
    ]
  };
}

export async function getWeeklyReports(limit = 10) {
  const db = await getDb();
  if (!db) {
    return [];
  }

  try {
    const result = await db
      .select()
      .from(weeklyReports)
      .orderBy(desc(weeklyReports.generatedAt))
      .limit(limit);
    return result;
  } catch (error) {
    console.error("[Database] Failed to get weekly reports:", error);
    return [];
  }
}
