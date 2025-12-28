import { eq, desc, sql, and, gte, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users, conversations, sampleComplaints, 
  InsertConversation, analyticsEvents, InsertAnalyticsEvent,
  auditFindings, InsertAuditFinding, legislativeDocuments, 
  InsertLegislativeDocument, demoTrends, InsertDemoTrend,
  statusHistory, InsertStatusHistory, weeklyReports, InsertWeeklyReport,
  historicalStats, InsertHistoricalStat, historicalComplaintsByEntity,
  InsertHistoricalComplaintsByEntity, historicalComplaintsByCategory,
  InsertHistoricalComplaintsByCategory, historicalConvictions, InsertHistoricalConviction,
  caseLaw, InsertCaseLaw
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
    { id: 43, textArabic: "استفسار عن إجراءات تقديم شكوى رسمية", textEnglish: "Inquiry about procedures for filing an official complaint", category: "general", expectedRiskScore: 15, ministry: "جهاز الرقابة المالية" },
    { id: 44, textArabic: "ملاحظات عامة حول تحسين الخدمات الحكومية", textEnglish: "General observations about improving government services", category: "general", expectedRiskScore: 10, ministry: "عام" },
    { id: 45, textArabic: "طلب معلومات عن صلاحيات جهاز الرقابة المالية", textEnglish: "Request for information about State Audit Institution powers", category: "general", expectedRiskScore: 5, ministry: "جهاز الرقابة المالية" },
    { id: 46, textArabic: "اقتراح لتطوير آلية استقبال الشكاوى", textEnglish: "Suggestion to improve the complaint reception mechanism", category: "general", expectedRiskScore: 8, ministry: "جهاز الرقابة المالية" },
    { id: 47, textArabic: "استفسار عن نتيجة شكوى سابقة", textEnglish: "Inquiry about the result of a previous complaint", category: "general", expectedRiskScore: 12, ministry: "جهاز الرقابة المالية" },
    { id: 48, textArabic: "طلب نسخة من تقرير الرقابة السنوي", textEnglish: "Request for a copy of the annual audit report", category: "general", expectedRiskScore: 5, ministry: "جهاز الرقابة المالية" },
    { id: 49, textArabic: "شكر وتقدير لجهود جهاز الرقابة المالية", textEnglish: "Thanks and appreciation for the State Audit Institution's efforts", category: "general", expectedRiskScore: 0, ministry: "جهاز الرقابة المالية" },
    { id: 50, textArabic: "استفسار عن التعاون مع المنظمات الدولية للرقابة", textEnglish: "Inquiry about cooperation with international audit organizations", category: "general", expectedRiskScore: 5, ministry: "جهاز الرقابة المالية" }
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
    { id: 1, titleArabic: "قانون الرقابة المالية والإدارية للدولة", titleEnglish: "State Financial and Administrative Audit Law", documentType: "royal_decree" as const, documentNumber: "111/2011", year: 2011, summaryArabic: "ينظم عمل جهاز الرقابة المالية والإدارية للدولة وصلاحياته", summaryEnglish: "Regulates the work and powers of the State Audit Institution", keyProvisions: ["صلاحيات الرقابة", "استقلالية الديوان", "التقارير السنوية"] },
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


// ============================================
// HISTORICAL DATA FUNCTIONS FOR COMPARATIVE ANALYSIS
// ============================================

// Get historical statistics for year-over-year comparison
export async function getHistoricalStats(years?: number[], metrics?: string[]) {
  const db = await getDb();
  if (!db) {
    return getHardcodedHistoricalStats(years, metrics);
  }

  try {
    let query = db.select().from(historicalStats);
    const conditions = [];
    
    if (years && years.length > 0) {
      conditions.push(sql`${historicalStats.year} IN (${sql.join(years.map(y => sql`${y}`), sql`, `)})`);
    }
    if (metrics && metrics.length > 0) {
      conditions.push(sql`${historicalStats.metric} IN (${sql.join(metrics.map(m => sql`${m}`), sql`, `)})`);
    }
    
    const result = await query
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(historicalStats.year, historicalStats.metric);
    
    if (result.length === 0) {
      return getHardcodedHistoricalStats(years, metrics);
    }
    
    return result;
  } catch (error) {
    console.error("[Database] Failed to get historical stats:", error);
    return getHardcodedHistoricalStats(years, metrics);
  }
}

// Get complaints by entity for comparison
export async function getHistoricalComplaintsByEntityData(years?: number[]) {
  const db = await getDb();
  if (!db) {
    return getHardcodedComplaintsByEntity(years);
  }

  try {
    const conditions = [];
    if (years && years.length > 0) {
      conditions.push(sql`${historicalComplaintsByEntity.year} IN (${sql.join(years.map(y => sql`${y}`), sql`, `)})`);
    }
    
    const result = await db.select().from(historicalComplaintsByEntity)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(historicalComplaintsByEntity.year, desc(historicalComplaintsByEntity.complaintCount));
    
    if (result.length === 0) {
      return getHardcodedComplaintsByEntity(years);
    }
    
    return result;
  } catch (error) {
    console.error("[Database] Failed to get complaints by entity:", error);
    return getHardcodedComplaintsByEntity(years);
  }
}

// Get complaints by category for comparison
export async function getHistoricalComplaintsByCategoryData(years?: number[]) {
  const db = await getDb();
  if (!db) {
    return getHardcodedComplaintsByCategory(years);
  }

  try {
    const conditions = [];
    if (years && years.length > 0) {
      conditions.push(sql`${historicalComplaintsByCategory.year} IN (${sql.join(years.map(y => sql`${y}`), sql`, `)})`);
    }
    
    const result = await db.select().from(historicalComplaintsByCategory)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(historicalComplaintsByCategory.year, desc(historicalComplaintsByCategory.complaintCount));
    
    if (result.length === 0) {
      return getHardcodedComplaintsByCategory(years);
    }
    
    return result;
  } catch (error) {
    console.error("[Database] Failed to get complaints by category:", error);
    return getHardcodedComplaintsByCategory(years);
  }
}

// Get conviction examples for case studies
export async function getHistoricalConvictionsData(years?: number[]) {
  const db = await getDb();
  if (!db) {
    return getHardcodedConvictions(years);
  }

  try {
    const conditions = [];
    if (years && years.length > 0) {
      conditions.push(sql`${historicalConvictions.year} IN (${sql.join(years.map(y => sql`${y}`), sql`, `)})`);
    }
    
    const result = await db.select().from(historicalConvictions)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(historicalConvictions.year), desc(historicalConvictions.fineOMR));
    
    if (result.length === 0) {
      return getHardcodedConvictions(years);
    }
    
    return result;
  } catch (error) {
    console.error("[Database] Failed to get convictions:", error);
    return getHardcodedConvictions(years);
  }
}

// Hardcoded historical stats from OSAI Annual Reports 2021-2024
function getHardcodedHistoricalStats(years?: number[], metrics?: string[]) {
  const allStats = [
    // Direct Added Value (Collection & Recovery) - OMR Million
    { year: 2021, metric: "directAddedValue", value: null, valueDecimal: "76.5", unit: "OMR Million", category: "financial", source: "OSAI Annual Report 2021" },
    { year: 2022, metric: "directAddedValue", value: null, valueDecimal: "97.8", unit: "OMR Million", category: "financial", source: "OSAI Annual Report 2022" },
    { year: 2023, metric: "directAddedValue", value: null, valueDecimal: "177.7", unit: "OMR Million", category: "financial", source: "OSAI Annual Report 2023" },
    { year: 2024, metric: "directAddedValue", value: null, valueDecimal: "25.0", unit: "OMR Million", category: "financial", source: "OSAI Annual Report 2024" },
    
    // Legal Cases Addressed
    { year: 2021, metric: "legalCases", value: 101, valueDecimal: null, unit: "Cases", category: "legal", source: "OSAI Annual Report 2021" },
    { year: 2022, metric: "legalCases", value: 113, valueDecimal: null, unit: "Cases", category: "legal", source: "OSAI Annual Report 2022" },
    { year: 2023, metric: "legalCases", value: 115, valueDecimal: null, unit: "Cases", category: "legal", source: "OSAI Annual Report 2023" },
    { year: 2024, metric: "legalCases", value: 72, valueDecimal: null, unit: "Cases", category: "legal", source: "OSAI Annual Report 2024" },
    
    // Referred to Public Prosecution
    { year: 2022, metric: "referredToProsecution", value: 14, valueDecimal: null, unit: "Cases", category: "legal", source: "OSAI Annual Report 2022" },
    { year: 2023, metric: "referredToProsecution", value: 28, valueDecimal: null, unit: "Cases", category: "legal", source: "OSAI Annual Report 2023" },
    
    // Total Audits Completed
    { year: 2021, metric: "auditsCompleted", value: 192, valueDecimal: null, unit: "Audits", category: "operations", source: "OSAI Annual Report 2021" },
    { year: 2022, metric: "auditsCompleted", value: 181, valueDecimal: null, unit: "Audits", category: "operations", source: "OSAI Annual Report 2022" },
    
    // Audit Reports Issued
    { year: 2021, metric: "reportsIssued", value: 208, valueDecimal: null, unit: "Reports", category: "operations", source: "OSAI Annual Report 2021" },
    { year: 2022, metric: "reportsIssued", value: 147, valueDecimal: null, unit: "Reports", category: "operations", source: "OSAI Annual Report 2022" },
    
    // Total Complaints Received
    { year: 2021, metric: "complaints", value: 505, valueDecimal: null, unit: "Complaints", category: "complaints", source: "OSAI Annual Report 2021" },
    { year: 2022, metric: "complaints", value: 587, valueDecimal: null, unit: "Complaints", category: "complaints", source: "OSAI Annual Report 2022" },
    
    // Maximum Imprisonment Sentence (Years)
    { year: 2021, metric: "maxImprisonment", value: 3, valueDecimal: null, unit: "Years", category: "penalties", source: "OSAI Annual Report 2021" },
    { year: 2022, metric: "maxImprisonment", value: 10, valueDecimal: null, unit: "Years", category: "penalties", source: "OSAI Annual Report 2022" },
    { year: 2023, metric: "maxImprisonment", value: 10, valueDecimal: null, unit: "Years", category: "penalties", source: "OSAI Annual Report 2023" },
    
    // Maximum Fine Imposed (OMR)
    { year: 2021, metric: "maxFine", value: 21000, valueDecimal: null, unit: "OMR", category: "penalties", source: "OSAI Annual Report 2021" },
    { year: 2022, metric: "maxFine", value: 78000, valueDecimal: null, unit: "OMR", category: "penalties", source: "OSAI Annual Report 2022" },
    { year: 2023, metric: "maxFine", value: 63000, valueDecimal: null, unit: "OMR", category: "penalties", source: "OSAI Annual Report 2023" },
  ];
  
  let filtered = allStats;
  if (years && years.length > 0) {
    filtered = filtered.filter(s => years.includes(s.year));
  }
  if (metrics && metrics.length > 0) {
    filtered = filtered.filter(s => metrics.includes(s.metric));
  }
  
  return filtered;
}

// Hardcoded complaints by entity
function getHardcodedComplaintsByEntity(years?: number[]) {
  const allData = [
    // 2021 data
    { year: 2021, entityNameEnglish: "Ministry of Housing & Urban Planning", entityNameArabic: "وزارة الإسكان والتخطيط العمراني", complaintCount: 111 },
    { year: 2021, entityNameEnglish: "Municipalities Sector", entityNameArabic: "قطاع البلديات", complaintCount: 110 },
    { year: 2021, entityNameEnglish: "Ministry of Health", entityNameArabic: "وزارة الصحة", complaintCount: 37 },
    { year: 2021, entityNameEnglish: "Ministry of Education", entityNameArabic: "وزارة التربية والتعليم", complaintCount: 34 },
    { year: 2021, entityNameEnglish: "Ministry of Labour", entityNameArabic: "وزارة العمل", complaintCount: 24 },
    { year: 2021, entityNameEnglish: "Nama Holding Company", entityNameArabic: "شركة نماء القابضة", complaintCount: 16 },
    { year: 2021, entityNameEnglish: "Ministry of Endowments", entityNameArabic: "وزارة الأوقاف", complaintCount: 11 },
    { year: 2021, entityNameEnglish: "Civil Aviation Authority", entityNameArabic: "هيئة الطيران المدني", complaintCount: 10 },
    { year: 2021, entityNameEnglish: "Oman Air", entityNameArabic: "الطيران العماني", complaintCount: 9 },
    { year: 2021, entityNameEnglish: "Petroleum Development Oman", entityNameArabic: "تنمية نفط عمان", complaintCount: 6 },
    
    // 2022 data
    { year: 2022, entityNameEnglish: "Ministry of Housing & Urban Planning", entityNameArabic: "وزارة الإسكان والتخطيط العمراني", complaintCount: 119 },
    { year: 2022, entityNameEnglish: "Municipalities Sector", entityNameArabic: "قطاع البلديات", complaintCount: 93 },
    { year: 2022, entityNameEnglish: "Ministry of Health", entityNameArabic: "وزارة الصحة", complaintCount: 31 },
    { year: 2022, entityNameEnglish: "Nama Holding Company", entityNameArabic: "شركة نماء القابضة", complaintCount: 25 },
    { year: 2022, entityNameEnglish: "Ministry of Education", entityNameArabic: "وزارة التربية والتعليم", complaintCount: 20 },
    { year: 2022, entityNameEnglish: "Ministry of Endowments", entityNameArabic: "وزارة الأوقاف", complaintCount: 18 },
    { year: 2022, entityNameEnglish: "Ministry of Labour", entityNameArabic: "وزارة العمل", complaintCount: 15 },
    { year: 2022, entityNameEnglish: "Oman Air", entityNameArabic: "الطيران العماني", complaintCount: 11 },
    { year: 2022, entityNameEnglish: "Oman Water & Wastewater", entityNameArabic: "عمان للمياه والصرف الصحي", complaintCount: 10 },
    { year: 2022, entityNameEnglish: "Civil Aviation Authority", entityNameArabic: "هيئة الطيران المدني", complaintCount: 9 },
  ];
  
  if (years && years.length > 0) {
    return allData.filter(d => years.includes(d.year));
  }
  return allData;
}

// Hardcoded complaints by category
function getHardcodedComplaintsByCategory(years?: number[]) {
  const allData = [
    // 2021 data
    { year: 2021, categoryEnglish: "Financial & Administrative Irregularities", categoryArabic: "مخالفات مالية وإدارية", complaintCount: 405, percentageOfTotal: 80 },
    { year: 2021, categoryEnglish: "Disruption of Citizens Interests", categoryArabic: "الإضرار بمصالح المواطنين", complaintCount: 35, percentageOfTotal: 7 },
    { year: 2021, categoryEnglish: "Abuse of Power", categoryArabic: "إساءة استخدام السلطة", complaintCount: 24, percentageOfTotal: 5 },
    { year: 2021, categoryEnglish: "Improper Tendering Process", categoryArabic: "مخالفات في إجراءات المناقصات", complaintCount: 22, percentageOfTotal: 4 },
    { year: 2021, categoryEnglish: "Employee Grievances", categoryArabic: "تظلمات الموظفين", complaintCount: 19, percentageOfTotal: 4 },
    
    // 2022 data
    { year: 2022, categoryEnglish: "Financial & Administrative Irregularities", categoryArabic: "مخالفات مالية وإدارية", complaintCount: 459, percentageOfTotal: 78 },
    { year: 2022, categoryEnglish: "Disruption of Citizens Interests", categoryArabic: "الإضرار بمصالح المواطنين", complaintCount: 74, percentageOfTotal: 13 },
    { year: 2022, categoryEnglish: "Employee Grievances", categoryArabic: "تظلمات الموظفين", complaintCount: 28, percentageOfTotal: 5 },
    { year: 2022, categoryEnglish: "Improper Tendering Process", categoryArabic: "مخالفات في إجراءات المناقصات", complaintCount: 21, percentageOfTotal: 4 },
    { year: 2022, categoryEnglish: "Abuse of Power", categoryArabic: "إساءة استخدام السلطة", complaintCount: 5, percentageOfTotal: 1 },
  ];
  
  if (years && years.length > 0) {
    return allData.filter(d => years.includes(d.year));
  }
  return allData;
}

// Hardcoded conviction examples
function getHardcodedConvictions(years?: number[]) {
  const allData = [
    {
      year: 2022,
      entityNameEnglish: "Government Company",
      entityNameArabic: "شركة حكومية",
      position: "Director",
      violationType: "Money Laundering",
      sentenceYears: 10,
      sentenceMonths: 0,
      fineOMR: 51700,
      amountInvolved: null,
      additionalPenalties: JSON.stringify(["Deportation"]),
      summaryEnglish: "Director at government company convicted of money laundering",
      summaryArabic: "إدانة مدير في شركة حكومية بتهمة غسيل الأموال"
    },
    {
      year: 2022,
      entityNameEnglish: "Ministry",
      entityNameArabic: "وزارة",
      position: "Employee",
      violationType: "Embezzlement",
      sentenceYears: 5,
      sentenceMonths: 0,
      fineOMR: 50000,
      amountInvolved: 8299,
      additionalPenalties: null,
      summaryEnglish: "Ministry employee convicted of embezzling OMR 8,299",
      summaryArabic: "إدانة موظف وزارة باختلاس 8,299 ريال عماني"
    },
    {
      year: 2022,
      entityNameEnglish: "Ministry",
      entityNameArabic: "وزارة",
      position: "Female Employee",
      violationType: "Forgery",
      sentenceYears: 3,
      sentenceMonths: 0,
      fineOMR: null,
      amountInvolved: 4146,
      additionalPenalties: JSON.stringify(["Removal from office", "Deportation"]),
      summaryEnglish: "Female employee convicted of forgery, embezzled OMR 4,146",
      summaryArabic: "إدانة موظفة بالتزوير واختلاس 4,146 ريال عماني"
    },
    {
      year: 2023,
      entityNameEnglish: "Oman Fisheries Company",
      entityNameArabic: "شركة عمان للأسماك",
      position: "Marketing and Sales Manager",
      violationType: "Money Laundering, Bribery, Misuse of Position",
      sentenceYears: 10,
      sentenceMonths: 0,
      fineOMR: 51700,
      amountInvolved: 19503, // USD amounts converted
      additionalPenalties: JSON.stringify(["Permanent deportation", "Removal from office", "Confiscation of funds"]),
      summaryEnglish: "Manager convicted of accepting bribes (USD 5,400 + USD 794), money laundering (USD 6,194), and misuse of position",
      summaryArabic: "إدانة مدير بقبول رشاوى وغسيل أموال وإساءة استخدام المنصب"
    },
    {
      year: 2024,
      entityNameEnglish: "Environment Authority",
      entityNameArabic: "هيئة البيئة",
      position: "Director",
      violationType: "Embezzlement",
      sentenceYears: 7,
      sentenceMonths: 0,
      fineOMR: 150000,
      amountInvolved: 2300000,
      additionalPenalties: JSON.stringify(["Removal from office"]),
      summaryEnglish: "Director convicted of embezzling OMR 2.3 million from Environment Authority",
      summaryArabic: "إدانة مدير باختلاس 2.3 مليون ريال من هيئة البيئة"
    },
    {
      year: 2024,
      entityNameEnglish: "Oman Investment Authority",
      entityNameArabic: "جهاز الاستثمار العماني",
      position: "Investment Manager",
      violationType: "Conflict of Interest",
      sentenceYears: 3,
      sentenceMonths: 0,
      fineOMR: 75000,
      amountInvolved: null,
      additionalPenalties: JSON.stringify(["Removal from office"]),
      summaryEnglish: "Investment manager convicted of conflict of interest in investment decisions",
      summaryArabic: "إدانة مدير استثمار بتعارض المصالح في قرارات الاستثمار"
    }
  ];
  
  if (years && years.length > 0) {
    return allData.filter(d => years.includes(d.year));
  }
  return allData;
}

// Get all available metrics for the comparison dashboard
export function getAvailableMetrics() {
  return [
    { id: "directAddedValue", label: "Direct Added Value (Recovery)", labelArabic: "القيمة المضافة المباشرة (الاسترداد)", unit: "OMR Million", category: "financial" },
    { id: "legalCases", label: "Legal Cases Addressed", labelArabic: "القضايا القانونية المعالجة", unit: "Cases", category: "legal" },
    { id: "referredToProsecution", label: "Referred to Prosecution", labelArabic: "المحالة للادعاء العام", unit: "Cases", category: "legal" },
    { id: "auditsCompleted", label: "Audits Completed", labelArabic: "عمليات التدقيق المنجزة", unit: "Audits", category: "operations" },
    { id: "reportsIssued", label: "Reports Issued", labelArabic: "التقارير الصادرة", unit: "Reports", category: "operations" },
    { id: "complaints", label: "Complaints Received", labelArabic: "الشكاوى المستلمة", unit: "Complaints", category: "complaints" },
    { id: "maxImprisonment", label: "Max Imprisonment", labelArabic: "أقصى عقوبة سجن", unit: "Years", category: "penalties" },
    { id: "maxFine", label: "Max Fine Imposed", labelArabic: "أقصى غرامة مفروضة", unit: "OMR", category: "penalties" },
  ];
}

// Get available years for comparison
export function getAvailableYears() {
  return [2021, 2022, 2023, 2024];
}


// ============================================
// CASE LAW DATABASE FUNCTIONS
// ============================================

// Search case law by various criteria
export async function searchCaseLaw(params: {
  query?: string;
  year?: number;
  violationType?: string;
  entityType?: string;
  outcome?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot search case law: database not available");
    return { cases: [], total: 0 };
  }
  
  try {
    const conditions = [];
    
    if (params.year) {
      conditions.push(eq(caseLaw.year, params.year));
    }
    
    if (params.violationType) {
      conditions.push(eq(caseLaw.violationType, params.violationType as any));
    }
    
    if (params.entityType) {
      conditions.push(eq(caseLaw.entityType, params.entityType as any));
    }
    
    if (params.outcome) {
      conditions.push(eq(caseLaw.outcome, params.outcome as any));
    }
    
    // For text search, we'll use LIKE on multiple fields
    if (params.query) {
      const searchPattern = `%${params.query}%`;
      conditions.push(
        sql`(${caseLaw.entityNameEnglish} LIKE ${searchPattern} 
          OR ${caseLaw.entityNameArabic} LIKE ${searchPattern}
          OR ${caseLaw.summaryEnglish} LIKE ${searchPattern}
          OR ${caseLaw.summaryArabic} LIKE ${searchPattern}
          OR ${caseLaw.accusedPosition} LIKE ${searchPattern}
          OR ${caseLaw.violationTypeEnglish} LIKE ${searchPattern}
          OR ${caseLaw.violationTypeArabic} LIKE ${searchPattern})`
      );
    }
    
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(caseLaw)
      .where(whereClause);
    
    const total = Number(countResult[0]?.count || 0);
    
    // Get paginated results
    const limit = params.limit || 20;
    const offset = params.offset || 0;
    
    let query = db
      .select()
      .from(caseLaw)
      .where(whereClause)
      .orderBy(desc(caseLaw.year), desc(caseLaw.amountInvolved))
      .limit(limit)
      .offset(offset);
    
    const cases = await query;
    
    return { cases, total };
  } catch (error) {
    console.error("[Database] Error searching case law:", error);
    return { cases: [], total: 0 };
  }
}

// Get case law by ID
export async function getCaseLawById(id: number) {
  const db = await getDb();
  if (!db) return null;
  
  try {
    const result = await db.select().from(caseLaw).where(eq(caseLaw.id, id)).limit(1);
    return result[0] || null;
  } catch (error) {
    console.error("[Database] Error getting case law by ID:", error);
    return null;
  }
}

// Get case law statistics
export async function getCaseLawStats() {
  const db = await getDb();
  if (!db) {
    return {
      totalCases: 0,
      totalAmountInvolved: 0,
      totalAmountRecovered: 0,
      totalFines: 0,
      avgSentenceYears: 0,
      byViolationType: [],
      byYear: [],
      byOutcome: []
    };
  }
  
  try {
    // Total cases
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(caseLaw);
    const totalCases = Number(totalResult[0]?.count || 0);
    
    // Aggregate amounts
    const amountsResult = await db
      .select({
        totalInvolved: sql<number>`COALESCE(SUM(amountInvolved), 0)`,
        totalRecovered: sql<number>`COALESCE(SUM(amountRecovered), 0)`,
        totalFines: sql<number>`COALESCE(SUM(fineOMR), 0)`,
        avgSentence: sql<number>`COALESCE(AVG(sentenceYears + sentenceMonths/12), 0)`
      })
      .from(caseLaw);
    
    // By violation type
    const byViolationType = await db
      .select({
        type: caseLaw.violationType,
        count: sql<number>`count(*)`
      })
      .from(caseLaw)
      .groupBy(caseLaw.violationType);
    
    // By year
    const byYear = await db
      .select({
        year: caseLaw.year,
        count: sql<number>`count(*)`
      })
      .from(caseLaw)
      .groupBy(caseLaw.year)
      .orderBy(caseLaw.year);
    
    // By outcome
    const byOutcome = await db
      .select({
        outcome: caseLaw.outcome,
        count: sql<number>`count(*)`
      })
      .from(caseLaw)
      .groupBy(caseLaw.outcome);
    
    return {
      totalCases,
      totalAmountInvolved: Number(amountsResult[0]?.totalInvolved || 0),
      totalAmountRecovered: Number(amountsResult[0]?.totalRecovered || 0),
      totalFines: Number(amountsResult[0]?.totalFines || 0),
      avgSentenceYears: Number(amountsResult[0]?.avgSentence || 0),
      byViolationType: byViolationType.map(v => ({ type: v.type, count: Number(v.count) })),
      byYear: byYear.map(y => ({ year: y.year, count: Number(y.count) })),
      byOutcome: byOutcome.map(o => ({ outcome: o.outcome, count: Number(o.count) }))
    };
  } catch (error) {
    console.error("[Database] Error getting case law stats:", error);
    return {
      totalCases: 0,
      totalAmountInvolved: 0,
      totalAmountRecovered: 0,
      totalFines: 0,
      avgSentenceYears: 0,
      byViolationType: [],
      byYear: [],
      byOutcome: []
    };
  }
}

// Add new case law entry
export async function addCaseLaw(data: InsertCaseLaw) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot add case law: database not available");
    return null;
  }
  
  try {
    const result = await db.insert(caseLaw).values(data);
    return result;
  } catch (error) {
    console.error("[Database] Error adding case law:", error);
    return null;
  }
}

// Seed case law database with historical data
export async function seedCaseLawDatabase() {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot seed case law: database not available");
    return { success: false, count: 0 };
  }
  
  const caseLawData: InsertCaseLaw[] = [
    // 2021 Cases
    {
      year: 2021,
      entityNameEnglish: "Oman Telecommunications Company",
      entityNameArabic: "شركة عمان للاتصالات",
      entityType: "government_company",
      violationType: "embezzlement",
      violationTypeEnglish: "Embezzlement of Public Funds",
      violationTypeArabic: "اختلاس أموال عامة",
      accusedPosition: "Finance Manager",
      accusedPositionArabic: "مدير مالي",
      legalArticles: JSON.stringify(["Article 7 - RD 112/2011", "Article 4 - RD 111/2011"]),
      sentenceYears: 5,
      sentenceMonths: 0,
      fineOMR: 50000,
      amountInvolved: 320000,
      amountRecovered: 280000,
      additionalPenalties: JSON.stringify(["Removal from office", "Travel ban"]),
      summaryEnglish: "Finance manager convicted of embezzling OMR 320,000 through fraudulent invoices",
      summaryArabic: "إدانة مدير مالي باختلاس 320,000 ريال عماني عبر فواتير مزورة",
      outcome: "convicted",
      sourceReport: "Annual Report 2021"
    },
    {
      year: 2021,
      entityNameEnglish: "Ministry of Health",
      entityNameArabic: "وزارة الصحة",
      entityType: "ministry",
      violationType: "tender_violation",
      violationTypeEnglish: "Tender Law Violation",
      violationTypeArabic: "مخالفة قانون المناقصات",
      accusedPosition: "Procurement Director",
      accusedPositionArabic: "مدير المشتريات",
      legalArticles: JSON.stringify(["Article 12 - Tender Law", "Article 5 - RD 112/2011"]),
      sentenceYears: 3,
      sentenceMonths: 6,
      fineOMR: 25000,
      amountInvolved: 150000,
      amountRecovered: 150000,
      additionalPenalties: JSON.stringify(["Removal from office"]),
      summaryEnglish: "Procurement director convicted of awarding contracts to family-owned company",
      summaryArabic: "إدانة مدير مشتريات بمنح عقود لشركة مملوكة لعائلته",
      outcome: "convicted",
      sourceReport: "Annual Report 2021"
    },
    // 2022 Cases
    {
      year: 2022,
      entityNameEnglish: "Government Company",
      entityNameArabic: "شركة حكومية",
      entityType: "government_company",
      violationType: "bribery",
      violationTypeEnglish: "Money Laundering and Bribery",
      violationTypeArabic: "غسيل أموال ورشوة",
      accusedPosition: "Director",
      accusedPositionArabic: "مدير",
      legalArticles: JSON.stringify(["Article 7 - RD 112/2011", "Anti-Money Laundering Law"]),
      sentenceYears: 12,
      sentenceMonths: 0,
      fineOMR: 100000,
      amountInvolved: 500000,
      amountRecovered: 350000,
      additionalPenalties: JSON.stringify(["Permanent deportation", "Asset confiscation"]),
      summaryEnglish: "Director convicted of money laundering involving OMR 500,000",
      summaryArabic: "إدانة مدير بغسيل أموال بقيمة 500,000 ريال عماني",
      outcome: "convicted",
      sourceReport: "Annual Report 2022"
    },
    {
      year: 2022,
      entityNameEnglish: "Ministry",
      entityNameArabic: "وزارة",
      entityType: "ministry",
      violationType: "embezzlement",
      violationTypeEnglish: "Embezzlement",
      violationTypeArabic: "اختلاس",
      accusedPosition: "Employee",
      accusedPositionArabic: "موظف",
      legalArticles: JSON.stringify(["Article 7 - RD 112/2011"]),
      sentenceYears: 5,
      sentenceMonths: 0,
      fineOMR: 50000,
      amountInvolved: 8299,
      amountRecovered: 8299,
      additionalPenalties: JSON.stringify(["Removal from office"]),
      summaryEnglish: "Ministry employee convicted of embezzling OMR 8,299",
      summaryArabic: "إدانة موظف وزارة باختلاس 8,299 ريال عماني",
      outcome: "convicted",
      sourceReport: "Annual Report 2022"
    },
    {
      year: 2022,
      entityNameEnglish: "Ministry",
      entityNameArabic: "وزارة",
      entityType: "ministry",
      violationType: "forgery",
      violationTypeEnglish: "Forgery and Embezzlement",
      violationTypeArabic: "تزوير واختلاس",
      accusedPosition: "Female Employee",
      accusedPositionArabic: "موظفة",
      legalArticles: JSON.stringify(["Article 7 - RD 112/2011", "Forgery Articles"]),
      sentenceYears: 3,
      sentenceMonths: 0,
      fineOMR: 0,
      amountInvolved: 4146,
      amountRecovered: 4146,
      additionalPenalties: JSON.stringify(["Removal from office", "Deportation"]),
      summaryEnglish: "Female employee convicted of forgery, embezzled OMR 4,146",
      summaryArabic: "إدانة موظفة بالتزوير واختلاس 4,146 ريال عماني",
      outcome: "convicted",
      sourceReport: "Annual Report 2022"
    },
    // 2023 Cases
    {
      year: 2023,
      entityNameEnglish: "Oman Fisheries Company",
      entityNameArabic: "شركة عمان للأسماك",
      entityType: "government_company",
      violationType: "bribery",
      violationTypeEnglish: "Money Laundering, Bribery, Misuse of Position",
      violationTypeArabic: "غسيل أموال، رشوة، إساءة استخدام المنصب",
      accusedPosition: "Marketing and Sales Manager",
      accusedPositionArabic: "مدير التسويق والمبيعات",
      legalArticles: JSON.stringify(["Article 7 - RD 112/2011", "Article 4 - RD 111/2011", "Anti-Money Laundering Law"]),
      sentenceYears: 10,
      sentenceMonths: 0,
      fineOMR: 51700,
      amountInvolved: 19503,
      amountRecovered: 15000,
      additionalPenalties: JSON.stringify(["Permanent deportation", "Removal from office", "Confiscation of funds"]),
      summaryEnglish: "Manager convicted of accepting bribes (USD 5,400 + USD 794), money laundering (USD 6,194), and misuse of position",
      summaryArabic: "إدانة مدير بقبول رشاوى وغسيل أموال وإساءة استخدام المنصب",
      outcome: "convicted",
      sourceReport: "Annual Report 2023"
    },
    {
      year: 2023,
      entityNameEnglish: "Muscat Municipality",
      entityNameArabic: "بلدية مسقط",
      entityType: "municipality",
      violationType: "abuse_of_power",
      violationTypeEnglish: "Abuse of Power",
      violationTypeArabic: "إساءة استخدام السلطة",
      accusedPosition: "Department Head",
      accusedPositionArabic: "رئيس قسم",
      legalArticles: JSON.stringify(["Article 4 - RD 111/2011"]),
      sentenceYears: 2,
      sentenceMonths: 0,
      fineOMR: 15000,
      amountInvolved: 0,
      amountRecovered: 0,
      additionalPenalties: JSON.stringify(["Removal from office"]),
      summaryEnglish: "Department head convicted of abuse of power in permit approvals",
      summaryArabic: "إدانة رئيس قسم بإساءة استخدام السلطة في منح التصاريح",
      outcome: "convicted",
      sourceReport: "Annual Report 2023"
    },
    // 2024 Cases
    {
      year: 2024,
      entityNameEnglish: "Environment Authority",
      entityNameArabic: "هيئة البيئة",
      entityType: "public_authority",
      violationType: "embezzlement",
      violationTypeEnglish: "Embezzlement of Public Funds",
      violationTypeArabic: "اختلاس أموال عامة",
      accusedPosition: "Director",
      accusedPositionArabic: "مدير",
      legalArticles: JSON.stringify(["Article 7 - RD 112/2011", "Article 4 - RD 111/2011"]),
      sentenceYears: 7,
      sentenceMonths: 0,
      fineOMR: 150000,
      amountInvolved: 2300000,
      amountRecovered: 1800000,
      additionalPenalties: JSON.stringify(["Removal from office", "Asset confiscation"]),
      summaryEnglish: "Director convicted of embezzling OMR 2.3 million from Environment Authority",
      summaryArabic: "إدانة مدير باختلاس 2.3 مليون ريال من هيئة البيئة",
      outcome: "convicted",
      sourceReport: "Annual Report 2024"
    },
    {
      year: 2024,
      entityNameEnglish: "Oman Investment Authority",
      entityNameArabic: "جهاز الاستثمار العماني",
      entityType: "public_authority",
      violationType: "conflict_of_interest",
      violationTypeEnglish: "Conflict of Interest",
      violationTypeArabic: "تعارض المصالح",
      accusedPosition: "Investment Manager",
      accusedPositionArabic: "مدير استثمار",
      legalArticles: JSON.stringify(["Article 5 - RD 112/2011"]),
      sentenceYears: 3,
      sentenceMonths: 0,
      fineOMR: 75000,
      amountInvolved: 0,
      amountRecovered: 0,
      additionalPenalties: JSON.stringify(["Removal from office"]),
      summaryEnglish: "Investment manager convicted of conflict of interest in investment decisions",
      summaryArabic: "إدانة مدير استثمار بتعارض المصالح في قرارات الاستثمار",
      outcome: "convicted",
      sourceReport: "Annual Report 2024"
    },
    {
      year: 2024,
      entityNameEnglish: "Sohar Municipality",
      entityNameArabic: "بلدية صحار",
      entityType: "municipality",
      violationType: "tender_violation",
      violationTypeEnglish: "Tender Law Violation",
      violationTypeArabic: "مخالفة قانون المناقصات",
      accusedPosition: "Contracts Officer",
      accusedPositionArabic: "مسؤول العقود",
      legalArticles: JSON.stringify(["Article 12 - Tender Law"]),
      sentenceYears: 4,
      sentenceMonths: 0,
      fineOMR: 30000,
      amountInvolved: 450000,
      amountRecovered: 450000,
      additionalPenalties: JSON.stringify(["Removal from office"]),
      summaryEnglish: "Contracts officer convicted of manipulating tender process worth OMR 450,000",
      summaryArabic: "إدانة مسؤول عقود بالتلاعب في مناقصة بقيمة 450,000 ريال",
      outcome: "convicted",
      sourceReport: "Annual Report 2024"
    }
  ];
  
  try {
    // Clear existing data first
    await db.delete(caseLaw);
    
    // Insert all case law entries
    for (const entry of caseLawData) {
      await db.insert(caseLaw).values(entry);
    }
    
    return { success: true, count: caseLawData.length };
  } catch (error) {
    console.error("[Database] Error seeding case law:", error);
    return { success: false, count: 0 };
  }
}


// Seed historical data into the database
export async function seedHistoricalData() {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot seed historical data: database not available");
    return { success: false, message: "Database not available" };
  }

  try {
    // Seed historical stats
    const statsData = getHardcodedHistoricalStats();
    await db.delete(historicalStats);
    for (const stat of statsData) {
      await db.insert(historicalStats).values({
        year: stat.year,
        metric: stat.metric,
        value: stat.value,
        valueDecimal: stat.valueDecimal,
        unit: stat.unit,
        category: stat.category,
        source: stat.source
      });
    }

    // Seed complaints by entity
    const entityData = getHardcodedComplaintsByEntity();
    await db.delete(historicalComplaintsByEntity);
    for (const entity of entityData) {
      await db.insert(historicalComplaintsByEntity).values({
        year: entity.year,
        entityNameEnglish: entity.entityNameEnglish,
        entityNameArabic: entity.entityNameArabic,
        complaintCount: entity.complaintCount
      });
    }

    // Seed complaints by category
    const categoryData = getHardcodedComplaintsByCategory();
    await db.delete(historicalComplaintsByCategory);
    for (const category of categoryData) {
      await db.insert(historicalComplaintsByCategory).values({
        year: category.year,
        categoryEnglish: category.categoryEnglish,
        categoryArabic: category.categoryArabic,
        complaintCount: category.complaintCount,
        percentageOfTotal: category.percentageOfTotal
      });
    }

    // Seed convictions
    const convictionsData = getHardcodedConvictions();
    await db.delete(historicalConvictions);
    for (const conviction of convictionsData) {
      await db.insert(historicalConvictions).values({
        year: conviction.year,
        entityNameEnglish: conviction.entityNameEnglish,
        entityNameArabic: conviction.entityNameArabic,
        position: conviction.position,
        violationType: conviction.violationType,
        sentenceYears: conviction.sentenceYears,
        sentenceMonths: conviction.sentenceMonths,
        fineOMR: conviction.fineOMR,
        amountInvolved: conviction.amountInvolved,
        additionalPenalties: conviction.additionalPenalties,
        summaryEnglish: conviction.summaryEnglish,
        summaryArabic: conviction.summaryArabic
      });
    }

    return { 
      success: true, 
      message: "Historical data seeded successfully",
      counts: {
        stats: statsData.length,
        entities: entityData.length,
        categories: categoryData.length,
        convictions: convictionsData.length
      }
    };
  } catch (error) {
    console.error("[Database] Error seeding historical data:", error);
    return { success: false, message: String(error) };
  }
}


// Complaint Registry functions - for connecting to main database

export interface RegistryComplaint {
  id?: number;
  externalId: string; // OSAI-XXXXXX format
  channel: string;
  complainantType: string;
  entity: string;
  governorate: string;
  topic: string | null;
  amountOmr: number | null;
  text: string;
  classification: string;
  riskScore: number;
  riskLevel: 'low' | 'med' | 'high';
  routing: string;
  flags: string[];
  rationale: string;
  status: 'new' | 'under_review' | 'investigating' | 'resolved';
  slaTargetDays: number;
  assignedTo?: number | null;
  createdAt?: Date;
}

// Save a complaint from the registry to the conversations table
export async function saveRegistryComplaint(complaint: RegistryComplaint, userId: number): Promise<number | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot save registry complaint: database not available");
    return null;
  }

  try {
    // Create a message structure similar to chat conversations
    const messages = JSON.stringify([
      {
        role: 'user',
        content: `[Registry Complaint ${complaint.externalId}]\nChannel: ${complaint.channel}\nComplainant: ${complaint.complainantType}\nEntity: ${complaint.entity}\nGovernorate: ${complaint.governorate}\nTopic: ${complaint.topic || 'N/A'}\nAmount: ${complaint.amountOmr ? `OMR ${complaint.amountOmr}` : 'N/A'}\n\n${complaint.text}`
      },
      {
        role: 'assistant',
        content: `**Classification:** ${complaint.classification}\n**Risk Score:** ${complaint.riskScore}/100 (${complaint.riskLevel.toUpperCase()})\n**Routing:** ${complaint.routing}\n**Evidence Flags:** ${complaint.flags.join(', ')}\n**Rationale:** ${complaint.rationale}`
      }
    ]);

    // Map registry status to conversation status
    const statusMap: Record<string, 'new' | 'under_review' | 'investigating' | 'resolved'> = {
      'New': 'new',
      'Investigating': 'investigating',
      'Closed': 'resolved'
    };

    const result = await db.insert(conversations).values({
      userId,
      messages,
      feature: 'complaints',
      language: 'arabic',
      riskScore: complaint.riskScore,
      category: complaint.classification,
      status: statusMap[complaint.status] || 'new',
      assignedTo: complaint.assignedTo || null
    });

    // Log analytics event
    await logAnalyticsEvent({
      eventType: 'complaint_submitted',
      userId,
      feature: 'complaints',
      language: 'arabic',
      metadata: JSON.stringify({
        externalId: complaint.externalId,
        entity: complaint.entity,
        riskScore: complaint.riskScore,
        classification: complaint.classification
      })
    });

    // Get the inserted ID
    const insertedId = (result as unknown as { insertId: number }).insertId;
    return insertedId ? Number(insertedId) : null;
  } catch (error) {
    console.error("[Database] Failed to save registry complaint:", error);
    throw error;
  }
}

// Get all complaints for the registry view
export async function getRegistryComplaints(filters?: {
  status?: string;
  riskLevel?: string;
  entity?: string;
  dateFrom?: Date;
  dateTo?: Date;
}) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get registry complaints: database not available");
    return [];
  }

  try {
    // Build conditions array
    const conditions = [eq(conversations.feature, 'complaints')];
    
    if (filters?.status) {
      const statusMap: Record<string, 'new' | 'under_review' | 'investigating' | 'resolved'> = {
        'New': 'new',
        'Investigating': 'investigating',
        'Closed': 'resolved'
      };
      conditions.push(eq(conversations.status, statusMap[filters.status] || 'new'));
    }

    const results = await db.select().from(conversations)
      .where(and(...conditions))
      .orderBy(desc(conversations.createdAt));
    
    // Transform to registry format
    return results.map(conv => {
      let parsedMessages: Array<{role: string; content: string}> = [];
      try {
        parsedMessages = JSON.parse(conv.messages);
      } catch {
        parsedMessages = [];
      }
      
      // Extract entity from first message if available
      const userMessage = parsedMessages.find(m => m.role === 'user')?.content || '';
      const entityMatch = userMessage.match(/Entity: ([^\n]+)/);
      const entity = entityMatch ? entityMatch[1] : 'Unknown';
      
      return {
        id: conv.id,
        entity,
        classification: conv.category || 'Unknown',
        riskScore: conv.riskScore || 0,
        status: conv.status,
        assignedTo: conv.assignedTo,
        createdAt: conv.createdAt,
        messages: parsedMessages
      };
    });
  } catch (error) {
    console.error("[Database] Failed to get registry complaints:", error);
    return [];
  }
}

// Assign a complaint to a user
export async function assignComplaint(conversationId: number, assigneeId: number, assignedByUserId: number, assignedByUserName: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot assign complaint: database not available");
    return { success: false };
  }

  try {
    await db.update(conversations)
      .set({ assignedTo: assigneeId })
      .where(eq(conversations.id, conversationId));

    // Log the assignment in status history
    await db.insert(statusHistory).values({
      conversationId,
      previousStatus: null,
      newStatus: 'under_review',
      changedByUserId: assignedByUserId,
      changedByUserName: assignedByUserName,
      notes: `Assigned to user ID: ${assigneeId}`
    });

    return { success: true };
  } catch (error) {
    console.error("[Database] Failed to assign complaint:", error);
    return { success: false };
  }
}

// Get complaints assigned to a specific user
export async function getAssignedComplaints(userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get assigned complaints: database not available");
    return [];
  }

  try {
    const results = await db.select()
      .from(conversations)
      .where(eq(conversations.assignedTo, userId))
      .orderBy(desc(conversations.createdAt));
    
    return results;
  } catch (error) {
    console.error("[Database] Failed to get assigned complaints:", error);
    return [];
  }
}

// Get assignment statistics
export async function getAssignmentStats() {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get assignment stats: database not available");
    return { unassigned: 0, assigned: 0, byUser: [] };
  }

  try {
    const allComplaints = await db.select().from(conversations).where(eq(conversations.feature, 'complaints'));
    
    const unassigned = allComplaints.filter(c => !c.assignedTo).length;
    const assigned = allComplaints.filter(c => c.assignedTo).length;
    
    // Group by assignee
    const byUserMap = new Map<number, number>();
    allComplaints.forEach(c => {
      if (c.assignedTo) {
        byUserMap.set(c.assignedTo, (byUserMap.get(c.assignedTo) || 0) + 1);
      }
    });
    
    const byUser = Array.from(byUserMap.entries()).map(([userId, count]) => ({ userId, count }));
    
    return { unassigned, assigned, byUser };
  } catch (error) {
    console.error("[Database] Failed to get assignment stats:", error);
    return { unassigned: 0, assigned: 0, byUser: [] };
  }
}
