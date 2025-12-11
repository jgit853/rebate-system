import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, 
  users,
  dealers,
  products,
  orders,
  orderItems,
  payments,
  settlementPeriods,
  annualSettlements,
  subCommissions,
  marketFunds,
  policySettings,
  calculationHistory,
  loginLogs,
  announcements,
  helpDocs,
  notifications,
  systemSettings,
  type Dealer,
  type Product,
  type Order,
  type Payment,
  type SettlementPeriod,
  type AnnualSettlement,
  type PolicySetting,
  type InsertPolicySetting,
  type CalculationHistory,
  type InsertCalculationHistory,
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

// ==================== 经销商相关查询 ====================

export async function getAllDealers(): Promise<Dealer[]> {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(dealers).orderBy(desc(dealers.createdAt));
}

export async function getDealerById(id: number): Promise<Dealer | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(dealers).where(eq(dealers.id, id)).limit(1);
  return result[0];
}

export async function getDealersByType(type: "core" | "sub_dealer" | "terminal"): Promise<Dealer[]> {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(dealers).where(eq(dealers.type, type));
}

export async function getSubDealers(parentDealerId: number): Promise<Dealer[]> {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(dealers).where(eq(dealers.parentDealerId, parentDealerId));
}

// ==================== 产品相关查询 ====================

export async function getAllProducts(): Promise<Product[]> {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(products).orderBy(desc(products.createdAt));
}

export async function getProductById(id: number): Promise<Product | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(products).where(eq(products.id, id)).limit(1);
  return result[0];
}

// ==================== 订单相关查询 ====================

export async function getAllOrders(dealerId?: number, status?: "pending" | "paid" | "cancelled", type?: "normal" | "gift" | "special"): Promise<Order[]> {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];
  if (dealerId) conditions.push(eq(orders.dealerId, dealerId));
  if (status) conditions.push(eq(orders.status, status));
  if (type) conditions.push(eq(orders.type, type));

  if (conditions.length > 0) {
    return await db.select().from(orders).where(and(...conditions)).orderBy(desc(orders.orderDate));
  }

  return await db.select().from(orders).orderBy(desc(orders.orderDate));
}

export async function getOrdersByDealer(dealerId: number, periodId?: number): Promise<Order[]> {
  const db = await getDb();
  if (!db) return [];

  if (periodId) {
    const period = await db.select().from(settlementPeriods).where(eq(settlementPeriods.id, periodId)).limit(1);
    if (period.length === 0) return [];

    const { startDate, endDate } = period[0];
    return await db.select().from(orders).where(
      and(
        eq(orders.dealerId, dealerId),
        gte(orders.orderDate, startDate),
        lte(orders.orderDate, endDate)
      )
    ).orderBy(desc(orders.orderDate));
  }

  return await db.select().from(orders).where(eq(orders.dealerId, dealerId)).orderBy(desc(orders.orderDate));
}

export async function getPaymentsByOrder(orderId: number): Promise<Payment[]> {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(payments).where(eq(payments.orderId, orderId)).orderBy(desc(payments.paymentDate));
}

// ==================== 结算周期相关查询 ====================

export async function getAllPeriods(): Promise<SettlementPeriod[]> {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(settlementPeriods).orderBy(desc(settlementPeriods.startDate));
}

export async function getActivePeriod(): Promise<SettlementPeriod | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(settlementPeriods).where(eq(settlementPeriods.isActive, true)).limit(1);
  return result[0] || null;
}

export async function getPeriodById(id: number): Promise<SettlementPeriod | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(settlementPeriods).where(eq(settlementPeriods.id, id)).limit(1);
  return result[0];
}

// ==================== 结算相关查询 ====================

export async function getSettlementByDealerAndPeriod(
  dealerId: number,
  periodId: number
): Promise<AnnualSettlement | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(annualSettlements)
    .where(
      and(
        eq(annualSettlements.dealerId, dealerId),
        eq(annualSettlements.periodId, periodId)
      )
    )
    .limit(1);
  return result[0];
}

export async function getAllSettlements(periodId?: number): Promise<AnnualSettlement[]> {
  const db = await getDb();
  if (!db) return [];

  if (periodId) {
    return await db
      .select()
      .from(annualSettlements)
      .where(eq(annualSettlements.periodId, periodId))
      .orderBy(desc(annualSettlements.benefitRatio));
  }

  return await db.select().from(annualSettlements).orderBy(desc(annualSettlements.createdAt));
}

export async function getSettlementsByStatus(
  status: "draft" | "pending_approval" | "approved" | "paid"
): Promise<AnnualSettlement[]> {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(annualSettlements)
    .where(eq(annualSettlements.status, status))
    .orderBy(desc(annualSettlements.createdAt));
}

// ==================== 政策参数相关 ====================

/**
 * 获取当前政策参数设置
 */
export async function getPolicySettings(): Promise<PolicySetting | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const results = await db.select().from(policySettings).limit(1);
  return results[0];
}

/**
 * 更新政策参数设置
 */
export async function updatePolicySettings(settings: Partial<InsertPolicySetting> & { updatedBy: number }): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await getPolicySettings();
  
  if (existing) {
    await db.update(policySettings)
      .set({
        ...settings,
        updatedAt: new Date(),
      })
      .where(eq(policySettings.id, existing.id));
  } else {
    // 如果不存在,创建默认配置
    await db.insert(policySettings).values({
      rebateTiers: settings.rebateTiers || JSON.stringify([
        { threshold: 0, rate: 600 },
        { threshold: 100000, rate: 700 },
        { threshold: 200000, rate: 800 },
        { threshold: 300000, rate: 900 },
      ]),
      overdueDeductions: settings.overdueDeductions || JSON.stringify([
        { overdueRatio: 0, deduction: 0 },
        { overdueRatio: 500, deduction: 100 },
        { overdueRatio: 1000, deduction: 200 },
      ]),
      benefitRedline: settings.benefitRedline || 1800,
      marketFundRate: settings.marketFundRate || 300,
      firstYearCommissionRate: settings.firstYearCommissionRate || 1500,
      renewalCommissionRate: settings.renewalCommissionRate || 500,
      updatedBy: settings.updatedBy,
    });
  }
}

/**
 * 初始化默认政策参数(如果不存在)
 */
export async function initDefaultPolicySettings(): Promise<void> {
  const existing = await getPolicySettings();
  if (!existing) {
    await updatePolicySettings({ updatedBy: 0 });
  }
}


// ==================== 进货核算历史记录 ====================

/**
 * 保存进货核算历史记录
 */
export async function saveCalculationHistory(data: InsertCalculationHistory): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(calculationHistory).values(data);
  return result[0].insertId;
}

/**
 * 获取经销商的历史核算记录列表
 */
export async function getCalculationHistoryByDealer(dealerId: number, limit: number = 20): Promise<CalculationHistory[]> {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(calculationHistory)
    .where(eq(calculationHistory.dealerId, dealerId))
    .orderBy(desc(calculationHistory.createdAt))
    .limit(limit);
}

/**
 * 获取单条历史记录详情
 */
export async function getCalculationHistoryById(id: number): Promise<CalculationHistory | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(calculationHistory)
    .where(eq(calculationHistory.id, id))
    .limit(1);

  return result[0];
}

/**
 * 删除历史记录
 */
export async function deleteCalculationHistory(id: number, dealerId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const result = await db
    .delete(calculationHistory)
    .where(and(
      eq(calculationHistory.id, id),
      eq(calculationHistory.dealerId, dealerId)
    ));

  return result[0].affectedRows > 0;
}

// ==========================================
// 用户管理功能
// ==========================================

/**
 * 获取所有用户列表(管理员功能)
 */
export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(users)
    .orderBy(desc(users.createdAt));
}

/**
 * 更新用户角色
 */
export async function updateUserRole(userId: number, role: "user" | "admin"): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const result = await db
    .update(users)
    .set({ role, updatedAt: new Date() })
    .where(eq(users.id, userId));

  return result[0].affectedRows > 0;
}

/**
 * 更新用户状态(启用/禁用)
 */
export async function updateUserStatus(userId: number, status: "active" | "disabled"): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const result = await db
    .update(users)
    .set({ status, updatedAt: new Date() })
    .where(eq(users.id, userId));

  return result[0].affectedRows > 0;
}

/**
 * 删除用户
 */
export async function deleteUser(userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const result = await db
    .delete(users)
    .where(eq(users.id, userId));

  return result[0].affectedRows > 0;
}

/**
 * 记录登录日志
 */
export async function createLoginLog(log: {
  userId?: number;
  dealerId?: number;
  loginType: "oauth" | "dealer";
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  failReason?: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.insert(loginLogs).values({
    ...log,
    loginTime: new Date(),
  });
}

/**
 * 获取用户登录历史
 */
export async function getUserLoginLogs(userId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(loginLogs)
    .where(eq(loginLogs.userId, userId))
    .orderBy(desc(loginLogs.loginTime))
    .limit(limit);
}

/**
 * 获取经销商登录历史
 */
export async function getDealerLoginLogs(dealerId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(loginLogs)
    .where(eq(loginLogs.dealerId, dealerId))
    .orderBy(desc(loginLogs.loginTime))
    .limit(limit);
}

/**
 * 获取所有登录日志(管理员功能)
 */
export async function getAllLoginLogs(limit: number = 100) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(loginLogs)
    .orderBy(desc(loginLogs.loginTime))
    .limit(limit);
}

// ==========================================
// 内容管理系统(CMS)功能
// ==========================================

/**
 * 公告管理
 */
export async function getAllAnnouncements(status?: "draft" | "published" | "archived") {
  const db = await getDb();
  if (!db) return [];

  if (status) {
    return await db
      .select()
      .from(announcements)
      .where(eq(announcements.status, status))
      .orderBy(desc(announcements.createdAt));
  }

  return await db
    .select()
    .from(announcements)
    .orderBy(desc(announcements.createdAt));
}

export async function getPublishedAnnouncements() {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(announcements)
    .where(eq(announcements.status, "published"))
    .orderBy(desc(announcements.publishedAt));
}

export async function getAnnouncementById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(announcements)
    .where(eq(announcements.id, id))
    .limit(1);

  return result[0];
}

export async function createAnnouncement(data: {
  title: string;
  content: string;
  type: "info" | "warning" | "urgent";
  status: "draft" | "published" | "archived";
  createdBy: number;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(announcements).values({
    ...data,
    publishedAt: data.status === "published" ? new Date() : null,
  });

  return result[0].insertId;
}

export async function updateAnnouncement(
  id: number,
  data: Partial<{
    title: string;
    content: string;
    type: "info" | "warning" | "urgent";
    status: "draft" | "published" | "archived";
  }>
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const updateData: any = { ...data };
  
  // 如果状态变为published且之前没有发布时间,设置发布时间
  if (data.status === "published") {
    const current = await getAnnouncementById(id);
    if (current && !current.publishedAt) {
      updateData.publishedAt = new Date();
    }
  }

  const result = await db
    .update(announcements)
    .set(updateData)
    .where(eq(announcements.id, id));

  return result[0].affectedRows > 0;
}

export async function deleteAnnouncement(id: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const result = await db
    .delete(announcements)
    .where(eq(announcements.id, id));

  return result[0].affectedRows > 0;
}

/**
 * 帮助文档管理
 */
export async function getAllHelpDocs(status?: "draft" | "published") {
  const db = await getDb();
  if (!db) return [];

  if (status) {
    return await db
      .select()
      .from(helpDocs)
      .where(eq(helpDocs.status, status))
      .orderBy(helpDocs.order, desc(helpDocs.createdAt));
  }

  return await db
    .select()
    .from(helpDocs)
    .orderBy(helpDocs.order, desc(helpDocs.createdAt));
}

export async function getHelpDocsByCategory(category: string) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(helpDocs)
    .where(and(eq(helpDocs.category, category), eq(helpDocs.status, "published")))
    .orderBy(helpDocs.order);
}

export async function getHelpDocById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(helpDocs)
    .where(eq(helpDocs.id, id))
    .limit(1);

  return result[0];
}

export async function createHelpDoc(data: {
  title: string;
  content: string;
  category: string;
  order?: number;
  status: "draft" | "published";
  createdBy: number;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(helpDocs).values(data);

  return result[0].insertId;
}

export async function updateHelpDoc(
  id: number,
  data: Partial<{
    title: string;
    content: string;
    category: string;
    order: number;
    status: "draft" | "published";
  }>
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const result = await db
    .update(helpDocs)
    .set(data)
    .where(eq(helpDocs.id, id));

  return result[0].affectedRows > 0;
}

export async function deleteHelpDoc(id: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const result = await db
    .delete(helpDocs)
    .where(eq(helpDocs.id, id));

  return result[0].affectedRows > 0;
}

/**
 * 通知消息管理
 */
export async function getAllNotifications() {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(notifications)
    .orderBy(desc(notifications.createdAt));
}

export async function getUserNotifications(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(notifications)
    .where(
      and(
        eq(notifications.targetType, "user"),
        eq(notifications.targetId, userId)
      )
    )
    .orderBy(desc(notifications.createdAt));
}

export async function createNotification(data: {
  title: string;
  content: string;
  type: "system" | "settlement" | "order" | "custom";
  targetType: "all" | "role" | "user" | "dealer";
  targetId?: number;
  targetRole?: "admin" | "user";
  createdBy: number;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(notifications).values(data);

  return result[0].insertId;
}

export async function markNotificationAsRead(id: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const result = await db
    .update(notifications)
    .set({ isRead: true })
    .where(eq(notifications.id, id));

  return result[0].affectedRows > 0;
}

export async function deleteNotification(id: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const result = await db
    .delete(notifications)
    .where(eq(notifications.id, id));

  return result[0].affectedRows > 0;
}

// ==========================================
// 系统设置功能
// ==========================================

/**
 * 获取系统设置(始终返回第一条记录)
 */
export async function getSystemSettings() {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(systemSettings)
    .limit(1);

  return result[0];
}

/**
 * 更新或创建系统设置
 */
export async function upsertSystemSettings(
  data: Partial<{
    systemName: string;
    systemDescription: string;
    systemLogo: string;
    primaryColor: string;
    theme: "light" | "dark" | "auto";
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    smtpPassword: string;
    smtpFrom: string;
    passwordMinLength: number;
    sessionTimeout: number;
    enableTwoFactor: boolean;
    autoBackup: boolean;
    backupFrequency: number;
    backupRetentionDays: number;
  }>,
  updatedBy: number
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const existing = await getSystemSettings();

  if (existing) {
    // 更新现有设置
    const result = await db
      .update(systemSettings)
      .set({ ...data, updatedBy })
      .where(eq(systemSettings.id, existing.id));

    return result[0].affectedRows > 0;
  } else {
    // 创建新设置
    await db.insert(systemSettings).values({
      systemName: data.systemName || "经销商返利对账系统",
      ...data,
      updatedBy,
    });

    return true;
  }
}
