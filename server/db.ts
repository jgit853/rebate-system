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
