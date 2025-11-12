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
  type Dealer,
  type Product,
  type Order,
  type Payment,
  type SettlementPeriod,
  type AnnualSettlement,
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

export async function getActivePeriod(): Promise<SettlementPeriod | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(settlementPeriods).where(eq(settlementPeriods.isActive, true)).limit(1);
  return result[0];
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
