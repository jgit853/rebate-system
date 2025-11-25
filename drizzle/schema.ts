import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean, date, index, unique } from "drizzle-orm/mysql-core";

/**
 * 核心用户表,支持认证流程
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * 经销商表 - 管理核心经销商、下级经销商和终端客户
 */
export const dealers = mysqlTable("dealers", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  parentDealerId: int("parentDealerId"),
  type: mysqlEnum("type", ["core", "sub_dealer", "terminal"]).notNull(),
  status: mysqlEnum("status", ["active", "inactive"]).default("active").notNull(),
  firstPaymentDate: date("firstPaymentDate"),
  userId: int("userId"),
  // 经销商登录凭证
  username: varchar("username", { length: 100 }).unique(),
  passwordHash: varchar("passwordHash", { length: 255 }),
  passwordSetAt: timestamp("passwordSetAt"),
  lastLoginAt: timestamp("lastLoginAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  nameIdx: index("name_idx").on(table.name),
  typeIdx: index("type_idx").on(table.type),
  parentIdx: index("parent_idx").on(table.parentDealerId),
}));

export type Dealer = typeof dealers.$inferSelect;
export type InsertDealer = typeof dealers.$inferInsert;

/**
 * 产品表 - 定义产品规格、价格和结算基数
 */
export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  sku: varchar("sku", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  spec: varchar("spec", { length: 100 }).notNull(),
  wholesalePrice: int("wholesalePrice").notNull(), // 以分为单位存储
  baseUnit: int("baseUnit").notNull(), // 以0.01为单位,如1.0存为100, 0.5存为50
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

/**
 * 结算周期表 - 定义不同的结算年度或季度
 */
export const settlementPeriods = mysqlTable("settlement_periods", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  startDate: date("startDate").notNull(),
  endDate: date("endDate").notNull(),
  type: mysqlEnum("type", ["annual", "quarterly", "custom"]).notNull(),
  isActive: boolean("isActive").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  typeIdx: index("type_idx").on(table.type),
  activeIdx: index("active_idx").on(table.isActive),
}));

export type SettlementPeriod = typeof settlementPeriods.$inferSelect;
export type InsertSettlementPeriod = typeof settlementPeriods.$inferInsert;

/**
 * 订单主表 - 记录所有销售订单的头信息
 */
export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  orderNumber: varchar("orderNumber", { length: 100 }).notNull().unique(),
  dealerId: int("dealerId").notNull(),
  orderDate: date("orderDate").notNull(),
  totalAmount: int("totalAmount").notNull(), // 以分为单位
  status: mysqlEnum("status", ["pending", "paid", "cancelled"]).default("pending").notNull(),
  type: mysqlEnum("type", ["normal", "gift", "special"]).default("normal").notNull(),
  dueDate: date("dueDate").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  dealerIdx: index("dealer_idx").on(table.dealerId),
  dateIdx: index("date_idx").on(table.orderDate),
  statusIdx: index("status_idx").on(table.status),
  typeIdx: index("type_idx").on(table.type),
}));

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

/**
 * 订单明细表 - 记录每个订单包含的具体产品和数量
 */
export const orderItems = mysqlTable("order_items", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  productId: int("productId").notNull(),
  quantity: int("quantity").notNull(),
  price: int("price").notNull(), // 以分为单位
  itemAmount: int("itemAmount").notNull(), // 以分为单位
}, (table) => ({
  orderIdx: index("order_idx").on(table.orderId),
  productIdx: index("product_idx").on(table.productId),
}));

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = typeof orderItems.$inferInsert;

/**
 * 回款记录表 - 记录与订单关联的每一笔回款
 */
export const payments = mysqlTable("payments", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  amount: int("amount").notNull(), // 以分为单位
  paymentDate: date("paymentDate").notNull(),
  method: varchar("method", { length: 50 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  orderIdx: index("order_idx").on(table.orderId),
  dateIdx: index("date_idx").on(table.paymentDate),
}));

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;

/**
 * 年度结算汇总表 - 存储每个经销商在每个年度的各项核心结算结果
 */
export const annualSettlements = mysqlTable("annual_settlements", {
  id: int("id").autoincrement().primaryKey(),
  dealerId: int("dealerId").notNull(),
  periodId: int("periodId").notNull(),
  totalBaseUnit: int("totalBaseUnit").notNull(), // 以0.01为单位
  totalPaymentAmount: int("totalPaymentAmount").notNull(), // 以分为单位
  overdueAmount: int("overdueAmount").notNull(), // 以分为单位
  overdueRatio: int("overdueRatio").notNull(), // 以万分之一为单位,如5%存为500
  baseRebateRate: int("baseRebateRate").notNull(), // 以万分之一为单位,如9%存为900
  adjustedRebateRate: int("adjustedRebateRate").notNull(), // 以万分之一为单位
  rebateAmount: int("rebateAmount").notNull(), // 以分为单位
  totalCommissionAmount: int("totalCommissionAmount").notNull(), // 以分为单位
  paidCommissionAmount: int("paidCommissionAmount").notNull(), // 以分为单位
  marketFundAmount: int("marketFundAmount").notNull(), // 以分为单位
  totalBenefitAmount: int("totalBenefitAmount").notNull(), // 以分为单位
  benefitRatio: int("benefitRatio").notNull(), // 以万分之一为单位
  status: mysqlEnum("status", ["draft", "pending_approval", "approved", "paid"]).default("draft").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  dealerPeriodUnique: unique("dealer_period_unique").on(table.dealerId, table.periodId),
  dealerIdx: index("dealer_idx").on(table.dealerId),
  periodIdx: index("period_idx").on(table.periodId),
  statusIdx: index("status_idx").on(table.status),
}));

export type AnnualSettlement = typeof annualSettlements.$inferSelect;
export type InsertAnnualSettlement = typeof annualSettlements.$inferInsert;

/**
 * 下级客户佣金明细表 - 记录核心经销商从其下级获得的每一笔佣金
 */
export const subCommissions = mysqlTable("sub_commissions", {
  id: int("id").autoincrement().primaryKey(),
  coreDealerId: int("coreDealerId").notNull(),
  subDealerId: int("subDealerId").notNull(),
  periodId: int("periodId").notNull(),
  commissionType: mysqlEnum("commissionType", ["first_year", "renewal"]).notNull(),
  paymentAmount: int("paymentAmount").notNull(), // 以分为单位
  baseUnit: int("baseUnit").notNull(), // 以0.01为单位
  commissionRate: int("commissionRate").notNull(), // 以万分之一为单位
  commissionAmount: int("commissionAmount").notNull(), // 以分为单位
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  coreSubPeriodUnique: unique("core_sub_period_unique").on(table.coreDealerId, table.subDealerId, table.periodId),
  coreIdx: index("core_idx").on(table.coreDealerId),
  subIdx: index("sub_idx").on(table.subDealerId),
  periodIdx: index("period_idx").on(table.periodId),
}));

export type SubCommission = typeof subCommissions.$inferSelect;
export type InsertSubCommission = typeof subCommissions.$inferInsert;

/**
 * 市场支持基金表 - 记录基金的计提与使用情况
 */
export const marketFunds = mysqlTable("market_funds", {
  id: int("id").autoincrement().primaryKey(),
  dealerId: int("dealerId").notNull(),
  periodId: int("periodId").notNull(),
  type: mysqlEnum("type", ["accrual", "usage"]).notNull(),
  amount: int("amount").notNull(), // 以分为单位,计提为正,使用为负
  description: text("description"),
  recordDate: date("recordDate").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  dealerIdx: index("dealer_idx").on(table.dealerId),
  periodIdx: index("period_idx").on(table.periodId),
  typeIdx: index("type_idx").on(table.type),
  dateIdx: index("date_idx").on(table.recordDate),
}));

export type MarketFund = typeof marketFunds.$inferSelect;
export type InsertMarketFund = typeof marketFunds.$inferInsert;

/**
 * 政策参数设置表 - 存储系统的各项返利政策参数
 */
export const policySettings = mysqlTable("policy_settings", {
  id: int("id").autoincrement().primaryKey(),
  // 返利阶梯参数 - 存储为JSON字符串,格式: [{threshold: 1000, rate: 900}, ...]
  rebateTiers: text("rebateTiers").notNull(),
  // 超期扣减参数 - 存储为JSON字符串,格式: [{overdueRatio: 500, deduction: 100}, ...]
  overdueDeductions: text("overdueDeductions").notNull(),
  // 综合让利红线 - 以万分之一为单位,如18%存为1800
  benefitRedline: int("benefitRedline").notNull(),
  // 市场基金比例 - 以万分之一为单位
  marketFundRate: int("marketFundRate").notNull(),
  // 首年抽佣比例 - 以万分之一为单位
  firstYearCommissionRate: int("firstYearCommissionRate").notNull(),
  // 续约抽佣比例 - 以万分之一为单位
  renewalCommissionRate: int("renewalCommissionRate").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  updatedBy: int("updatedBy"), // 更新人的userId
});

export type PolicySetting = typeof policySettings.$inferSelect;
export type InsertPolicySetting = typeof policySettings.$inferInsert;
