/**
 * 核心结算算法逻辑模块
 * 实现所有返利、抽佣、基金计算的核心业务规则
 */

import { getDb } from "./db";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import {
  orders,
  orderItems,
  payments,
  products,
  dealers,
  settlementPeriods,
  subCommissions,
  marketFunds,
  annualSettlements,
} from "../drizzle/schema";

/**
 * 计算年度回款金额
 * 仅统计正常订单且在约定账期内结清的实际回款
 */
export async function calculateAnnualPaymentAmount(
  dealerId: number,
  periodId: number
): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const period = await db
    .select()
    .from(settlementPeriods)
    .where(eq(settlementPeriods.id, periodId))
    .limit(1);

  if (period.length === 0) return 0;

  const { startDate, endDate } = period[0];

  // 获取周期内的所有正常订单
  const dealerOrders = await db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.dealerId, dealerId),
        eq(orders.type, "normal"),
        gte(orders.orderDate, startDate),
        lte(orders.orderDate, endDate)
      )
    );

  let totalAmount = 0;

  for (const order of dealerOrders) {
    // 获取该订单的所有回款记录
    const orderPayments = await db
      .select()
      .from(payments)
      .where(eq(payments.orderId, order.id));

    for (const payment of orderPayments) {
      // 检查回款是否在约定账期内
      if (payment.paymentDate <= order.dueDate) {
        totalAmount += payment.amount;
      }
    }
  }

  return totalAmount;
}

/**
 * 计算年度总基数
 */
export async function calculateAnnualBaseUnit(
  dealerId: number,
  periodId: number
): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const period = await db
    .select()
    .from(settlementPeriods)
    .where(eq(settlementPeriods.id, periodId))
    .limit(1);

  if (period.length === 0) return 0;

  const { startDate, endDate } = period[0];

  const dealerOrders = await db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.dealerId, dealerId),
        eq(orders.type, "normal"),
        gte(orders.orderDate, startDate),
        lte(orders.orderDate, endDate)
      )
    );

  let totalBaseUnit = 0;

  for (const order of dealerOrders) {
    const items = await db
      .select()
      .from(orderItems)
      .innerJoin(products, eq(orderItems.productId, products.id))
      .where(eq(orderItems.orderId, order.id));

    for (const item of items) {
      totalBaseUnit += item.order_items.quantity * item.products.baseUnit;
    }
  }

  return totalBaseUnit;
}

/**
 * 计算超期金额和超期比例
 */
export async function calculateOverdueMetrics(
  dealerId: number,
  periodId: number,
  annualAmount: number
): Promise<{ overdueAmount: number; overdueRatio: number }> {
  const db = await getDb();
  if (!db) return { overdueAmount: 0, overdueRatio: 0 };

  const period = await db
    .select()
    .from(settlementPeriods)
    .where(eq(settlementPeriods.id, periodId))
    .limit(1);

  if (period.length === 0) return { overdueAmount: 0, overdueRatio: 0 };

  const { startDate, endDate } = period[0];
  const today = new Date();

  const dealerOrders = await db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.dealerId, dealerId),
        eq(orders.type, "normal"),
        gte(orders.orderDate, startDate),
        lte(orders.orderDate, endDate)
      )
    );

  let overdueAmount = 0;

  for (const order of dealerOrders) {
    const orderPayments = await db
      .select()
      .from(payments)
      .where(eq(payments.orderId, order.id));

    const totalPaid = orderPayments.reduce((sum, p) => sum + p.amount, 0);
    const remainingAmount = order.totalAmount - totalPaid;

    // 如果订单未结清,且当前日期已超过约定账期30天
    const dueDate = new Date(order.dueDate);
    const overdueThreshold = new Date(dueDate);
    overdueThreshold.setDate(overdueThreshold.getDate() + 30);

    if (remainingAmount > 0 && today > overdueThreshold) {
      overdueAmount += remainingAmount;
    }
  }

  const overdueRatio =
    annualAmount > 0 ? Math.round((overdueAmount / annualAmount) * 10000) : 0;

  return { overdueAmount, overdueRatio };
}

/**
 * 获取基础返利档位
 */
export function getBaseRebateRate(totalBaseUnit: number): number {
  if (totalBaseUnit >= 2400000) {
    // 24000 * 100
    return 900; // 9%
  } else if (totalBaseUnit >= 1800000) {
    // 18000 * 100
    return 600; // 6%
  } else if (totalBaseUnit >= 1200000) {
    // 12000 * 100
    return 400; // 4%
  } else {
    return 0;
  }
}

/**
 * 调整返利比例(根据超期比例)
 */
export function adjustRebateRate(
  baseRate: number,
  overdueRatio: number
): number {
  if (overdueRatio > 1000) {
    // > 10%
    return 0;
  } else if (overdueRatio > 500) {
    // > 5%
    return Math.max(0, baseRate - 100); // 下调1%
  } else {
    return baseRate;
  }
}

/**
 * 计算年度返利金额
 */
export function calculateRebateAmount(
  annualAmount: number,
  adjustedRate: number
): number {
  return Math.round((annualAmount * adjustedRate) / 10000);
}

/**
 * 获取下级客户首年周期
 */
export async function getSubDealerFirstYearPeriod(
  subDealerId: number
): Promise<{ startDate: Date; endDate: Date } | null> {
  const db = await getDb();
  if (!db) return null;

  const dealer = await db
    .select()
    .from(dealers)
    .where(eq(dealers.id, subDealerId))
    .limit(1);

  if (dealer.length === 0 || !dealer[0].firstPaymentDate) {
    return null;
  }

  const startDate = new Date(dealer[0].firstPaymentDate);
  const endDate = new Date(startDate);
  endDate.setFullYear(endDate.getFullYear() + 1);

  return { startDate, endDate };
}

/**
 * 计算首年开发奖励
 */
export async function calculateFirstYearCommission(
  subDealerId: number
): Promise<{ amount: number; rate: number; baseUnit: number; paymentAmount: number }> {
  const period = await getSubDealerFirstYearPeriod(subDealerId);
  if (!period) {
    return { amount: 0, rate: 0, baseUnit: 0, paymentAmount: 0 };
  }

  const db = await getDb();
  if (!db) return { amount: 0, rate: 0, baseUnit: 0, paymentAmount: 0 };

  // 获取首年周期内的订单
  const dealerOrders = await db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.dealerId, subDealerId),
        eq(orders.type, "normal"),
        gte(orders.orderDate, period.startDate),
        lte(orders.orderDate, period.endDate)
      )
    );

  let paymentAmount = 0;
  let baseUnit = 0;

  for (const order of dealerOrders) {
    const orderPayments = await db
      .select()
      .from(payments)
      .where(eq(payments.orderId, order.id));

    for (const payment of orderPayments) {
      if (payment.paymentDate <= order.dueDate) {
        paymentAmount += payment.amount;
      }
    }

    const items = await db
      .select()
      .from(orderItems)
      .innerJoin(products, eq(orderItems.productId, products.id))
      .where(eq(orderItems.orderId, order.id));

    for (const item of items) {
      baseUnit += item.order_items.quantity * item.products.baseUnit;
    }
  }

  let rate = 0;
  if (baseUnit >= 1200000) {
    // >= 12000 * 100
    rate = 500; // 5%
  } else if (baseUnit >= 600000) {
    // >= 6000 * 100
    rate = 300; // 3%
  }

  const amount = Math.round((paymentAmount * rate) / 10000);

  return { amount, rate, baseUnit, paymentAmount };
}

/**
 * 计算续期管理佣金
 */
export async function calculateRenewalCommission(
  subDealerId: number,
  periodId: number
): Promise<{ amount: number; rate: number; baseUnit: number; paymentAmount: number }> {
  const paymentAmount = await calculateAnnualPaymentAmount(
    subDealerId,
    periodId
  );
  const baseUnit = await calculateAnnualBaseUnit(subDealerId, periodId);

  let rate = 0;
  if (baseUnit >= 2400000) {
    // >= 24000 * 100
    rate = 200; // 2%
  } else if (baseUnit >= 1200000) {
    // >= 12000 * 100
    rate = 150; // 1.5%
  } else if (baseUnit >= 600000) {
    // >= 6000 * 100
    rate = 100; // 1%
  }

  const amount = Math.round((paymentAmount * rate) / 10000);

  return { amount, rate, baseUnit, paymentAmount };
}

/**
 * 计算抽佣上限控制
 */
export async function calculatePaidCommission(
  coreDealerId: number,
  periodId: number
): Promise<{
  paidAmount: number;
  totalAmount: number;
  maxAmount: number;
}> {
  const db = await getDb();
  if (!db)
    return { paidAmount: 0, totalAmount: 0, maxAmount: 0 };

  // 计算自身回款
  const corePaymentAmount = await calculateAnnualPaymentAmount(
    coreDealerId,
    periodId
  );

  // 获取名下所有下级
  const subDealers = await db
    .select()
    .from(dealers)
    .where(eq(dealers.parentDealerId, coreDealerId));

  let totalCommission = 0;

  for (const subDealer of subDealers) {
    // 判断是否在首年周期
    const firstYearPeriod = await getSubDealerFirstYearPeriod(subDealer.id);
    const period = await db
      .select()
      .from(settlementPeriods)
      .where(eq(settlementPeriods.id, periodId))
      .limit(1);

    if (period.length === 0) continue;

    const { startDate, endDate } = period[0];

    let isFirstYear = false;
    if (firstYearPeriod) {
      isFirstYear =
        startDate >= firstYearPeriod.startDate &&
        endDate <= firstYearPeriod.endDate;
    }

    if (isFirstYear) {
      const { amount } = await calculateFirstYearCommission(subDealer.id);
      totalCommission += amount;
    } else {
      const { amount } = await calculateRenewalCommission(
        subDealer.id,
        periodId
      );
      totalCommission += amount;
    }
  }

  const maxCommission = Math.round((corePaymentAmount * 600) / 10000); // 6%
  const paidCommission = Math.min(totalCommission, maxCommission);

  return {
    paidAmount: paidCommission,
    totalAmount: totalCommission,
    maxAmount: maxCommission,
  };
}

/**
 * 计算市场基金
 */
export async function calculateMarketFund(
  dealerId: number,
  periodId: number
): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const period = await db
    .select()
    .from(settlementPeriods)
    .where(eq(settlementPeriods.id, periodId))
    .limit(1);

  if (period.length === 0 || period[0].type !== "annual") return 0;

  // 获取该年度的所有季度周期
  const { startDate, endDate } = period[0];
  const quarterlyPeriods = await db
    .select()
    .from(settlementPeriods)
    .where(
      and(
        eq(settlementPeriods.type, "quarterly"),
        gte(settlementPeriods.startDate, startDate),
        lte(settlementPeriods.endDate, endDate)
      )
    );

  let totalFundAccrual = 0;

  for (const qPeriod of quarterlyPeriods) {
    const quarterlyAmount = await calculateAnnualPaymentAmount(
      dealerId,
      qPeriod.id
    );
    const fundQ = Math.round((quarterlyAmount * 100) / 10000); // 1%
    totalFundAccrual += fundQ;

    // 记录计提
    await db.insert(marketFunds).values({
      dealerId,
      periodId: qPeriod.id,
      type: "accrual",
      amount: fundQ,
      description: `${qPeriod.name} 市场基金计提`,
      recordDate: new Date(),
    });
  }

  return totalFundAccrual;
}

/**
 * 获取市场基金余额
 */
export async function getMarketFundBalance(
  dealerId: number,
  periodId: number
): Promise<{ accrual: number; usage: number; balance: number }> {
  const db = await getDb();
  if (!db) return { accrual: 0, usage: 0, balance: 0 };

  const funds = await db
    .select()
    .from(marketFunds)
    .where(
      and(eq(marketFunds.dealerId, dealerId), eq(marketFunds.periodId, periodId))
    );

  let accrual = 0;
  let usage = 0;

  for (const fund of funds) {
    if (fund.type === "accrual") {
      accrual += fund.amount;
    } else {
      usage += Math.abs(fund.amount);
    }
  }

  return { accrual, usage, balance: accrual - usage };
}

/**
 * 计算综合让利
 */
export function calculateTotalBenefit(
  rebateAmount: number,
  commissionAmount: number,
  marketFundAmount: number,
  activityRewards: number = 0
): { totalBenefit: number; benefitRatio: number; isOverLimit: boolean } {
  const totalBenefit =
    rebateAmount + commissionAmount + marketFundAmount + activityRewards;

  return {
    totalBenefit,
    benefitRatio: 0, // 需要在外部计算
    isOverLimit: false, // 需要在外部判断
  };
}

/**
 * 生成年度结算单
 */
export async function generateAnnualSettlement(
  dealerId: number,
  periodId: number
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("数据库连接失败");

  // 1. 计算年度回款
  const totalPaymentAmount = await calculateAnnualPaymentAmount(
    dealerId,
    periodId
  );

  // 2. 计算年度总基数
  const totalBaseUnit = await calculateAnnualBaseUnit(dealerId, periodId);

  // 3. 计算超期指标
  const { overdueAmount, overdueRatio } = await calculateOverdueMetrics(
    dealerId,
    periodId,
    totalPaymentAmount
  );

  // 4. 计算返利
  const baseRebateRate = getBaseRebateRate(totalBaseUnit);
  const adjustedRebateRate = adjustRebateRate(baseRebateRate, overdueRatio);
  const rebateAmount = calculateRebateAmount(
    totalPaymentAmount,
    adjustedRebateRate
  );

  // 5. 计算抽佣
  const { paidAmount: paidCommissionAmount, totalAmount: totalCommissionAmount } =
    await calculatePaidCommission(dealerId, periodId);

  // 6. 计算市场基金
  const marketFundAmount = await calculateMarketFund(dealerId, periodId);

  // 7. 计算综合让利
  const totalBenefitAmount =
    rebateAmount + paidCommissionAmount + marketFundAmount;
  const benefitRatio =
    totalPaymentAmount > 0
      ? Math.round((totalBenefitAmount / totalPaymentAmount) * 10000)
      : 0;

  // 8. 插入或更新结算记录
  const existing = await db
    .select()
    .from(annualSettlements)
    .where(
      and(
        eq(annualSettlements.dealerId, dealerId),
        eq(annualSettlements.periodId, periodId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(annualSettlements)
      .set({
        totalBaseUnit,
        totalPaymentAmount,
        overdueAmount,
        overdueRatio,
        baseRebateRate,
        adjustedRebateRate,
        rebateAmount,
        totalCommissionAmount,
        paidCommissionAmount,
        marketFundAmount,
        totalBenefitAmount,
        benefitRatio,
        updatedAt: new Date(),
      })
      .where(eq(annualSettlements.id, existing[0].id));

    return existing[0].id;
  } else {
    const result = await db.insert(annualSettlements).values({
      dealerId,
      periodId,
      totalBaseUnit,
      totalPaymentAmount,
      overdueAmount,
      overdueRatio,
      baseRebateRate,
      adjustedRebateRate,
      rebateAmount,
      totalCommissionAmount,
      paidCommissionAmount,
      marketFundAmount,
      totalBenefitAmount,
      benefitRatio,
      status: "draft",
    });

    // 查询刚插入的记录
    const newRecord = await db
      .select()
      .from(annualSettlements)
      .where(
        and(
          eq(annualSettlements.dealerId, dealerId),
          eq(annualSettlements.periodId, periodId)
        )
      )
      .limit(1);

    return newRecord[0]?.id || 0;
  }
}
