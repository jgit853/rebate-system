/**
 * 进货核算推演工具
 * 帮助经销商计算不同进货金额下的返利收益,找到最优进货方案
 */

import { Dealer } from "../drizzle/schema";
import * as db from "./db";

/**
 * 阶梯返利配置接口
 */
interface RebateTier {
  threshold: number;
  rate: number;
}

/**
 * 从数据库获取阶梯返利配置
 */
async function getRebateTiers(): Promise<RebateTier[]> {
  const settings = await db.getPolicySettings();
  
  if (!settings) {
    // 返回默认值
    return [
      { threshold: 0, rate: 500 },
      { threshold: 50000000, rate: 800 },
      { threshold: 100000000, rate: 1200 },
      { threshold: 200000000, rate: 1500 },
    ].map(t => ({ threshold: t.threshold, rate: t.rate / 10000 }));
  }
  
  const tiers = JSON.parse(settings.rebateTiers) as Array<{ threshold: number; rate: number }>;
  // 将万分之一转换为小数
  return tiers.map(t => ({ threshold: t.threshold, rate: t.rate / 10000 }));
}

/**
 * 从数据库获取市场基金比例
 */
async function getMarketFundRate(): Promise<number> {
  const settings = await db.getPolicySettings();
  
  if (!settings) {
    return 300 / 10000; // 默认3%
  }
  
  return settings.marketFundRate / 10000;
}

/**
 * 计算指定回款金额对应的阶梯返利
 */
export async function calculateTieredRebate(paymentAmount: number): Promise<{
  rebateAmount: number;
  effectiveRate: number;
  tier: number;
}> {
  const REBATE_TIERS = await getRebateTiers();
  
  let rebateAmount = 0;
  let remainingAmount = paymentAmount;
  let currentTier = 0;

  for (let i = 0; i < REBATE_TIERS.length; i++) {
    const tier = REBATE_TIERS[i];
    const nextThreshold = i < REBATE_TIERS.length - 1 ? REBATE_TIERS[i + 1].threshold : Infinity;
    const tierAmount = Math.min(remainingAmount, nextThreshold - tier.threshold);

    if (tierAmount > 0) {
      rebateAmount += Math.floor(tierAmount * tier.rate);
      remainingAmount -= tierAmount;
      currentTier = i;
    }

    if (remainingAmount <= 0) break;
  }

  const effectiveRate = paymentAmount > 0 ? rebateAmount / paymentAmount : 0;

  return {
    rebateAmount,
    effectiveRate,
    tier: currentTier,
  };
}

/**
 * 计算下级抽佣收益
 */
export function calculateSubCommission(
  subPaymentAmount: number,
  isFirstYear: boolean,
  baseUnit: number
): number {
  const rate = isFirstYear ? 0.20 : 0.10; // 首年20%,续期10%
  const maxCommission = baseUnit * 10000_00; // 上限 = 基数 * 1万(分)
  const commission = Math.floor(subPaymentAmount * rate);
  return Math.min(commission, maxCommission);
}

/**
 * 计算市场基金
 */
export async function calculateMarketFund(paymentAmount: number): Promise<number> {
  const rate = await getMarketFundRate();
  return Math.floor(paymentAmount * rate);
}

/**
 * 进货方案推演结果
 */
export interface PurchasePlan {
  targetAmount: number; // 目标进货金额(分)
  rebateAmount: number; // 阶梯返利(分)
  rebateRate: number; // 实际返利率
  tier: number; // 所在阶梯
  tierName: string; // 阶梯名称
  marketFund: number; // 市场基金(分)
  totalBenefit: number; // 总收益(分)
  benefitRate: number; // 综合收益率
  netCost: number; // 净成本(分)
  recommendation: string; // 推荐说明
}

/**
 * 生成进货方案推演
 * @param currentPayment 当前已回款金额(分)
 * @param additionalAmounts 要测试的追加进货金额列表(分)
 * @param hasSubDealers 是否有下级经销商
 * @param subTotalPayment 下级总回款(分,可选)
 */
export async function generatePurchasePlans(
  currentPayment: number,
  additionalAmounts: number[],
  hasSubDealers: boolean = false,
  subTotalPayment: number = 0
): Promise<PurchasePlan[]> {
  const REBATE_TIERS = await getRebateTiers();
  const plans: PurchasePlan[] = [];

  // 根据实际配置生成阶梯名称
  const tierNames = REBATE_TIERS.map((tier, idx, arr) => {
    const start = (tier.threshold / 100).toFixed(0);
    const end = arr[idx + 1] ? (arr[idx + 1].threshold / 100).toFixed(0) : "";
    return end ? `第${idx + 1}档(${start}-${end}万)` : `第${idx + 1}档(${start}万以上)`;
  });

  for (const additional of additionalAmounts) {
    const targetAmount = currentPayment + additional;
    const rebateResult = await calculateTieredRebate(targetAmount);
    const marketFund = await calculateMarketFund(targetAmount);

    // 下级抽佣收益(简化计算,实际应根据具体下级数据)
    let subCommission = 0;
    if (hasSubDealers && subTotalPayment > 0) {
      // 假设下级按比例增长
      const growthRatio = targetAmount / Math.max(currentPayment, 1);
      const projectedSubPayment = Math.floor(subTotalPayment * growthRatio);
      subCommission = calculateSubCommission(projectedSubPayment, false, 100); // 简化:假设基数100,续期
    }

    const totalBenefit = rebateResult.rebateAmount + marketFund + subCommission;
    const benefitRate = targetAmount > 0 ? totalBenefit / targetAmount : 0;
    const netCost = targetAmount - totalBenefit;

    // 生成推荐说明
    let recommendation = "";
    if (rebateResult.tier < REBATE_TIERS.length - 1) {
      const nextTier = REBATE_TIERS[rebateResult.tier + 1];
      const toNextTier = nextTier.threshold - targetAmount;
      if (toNextTier > 0 && toNextTier <= 200000_00) {
        // 距离下一档不到20万
        recommendation = `距离${tierNames[rebateResult.tier + 1]}还差${(toNextTier / 100).toFixed(
          2
        )}元,建议追加进货升档`;
      }
    }

    if (rebateResult.effectiveRate >= 0.12) {
      recommendation = recommendation || "已达到较高返利率,收益可观";
    }

    plans.push({
      targetAmount,
      rebateAmount: rebateResult.rebateAmount,
      rebateRate: rebateResult.effectiveRate,
      tier: rebateResult.tier,
      tierName: tierNames[rebateResult.tier],
      marketFund,
      totalBenefit,
      benefitRate,
      netCost,
      recommendation,
    });
  }

  return plans;
}

/**
 * 找到最优进货方案
 * 在给定预算范围内,找到收益率最高的方案
 */
export async function findOptimalPlan(
  currentPayment: number,
  maxBudget: number,
  hasSubDealers: boolean = false,
  subTotalPayment: number = 0
): Promise<PurchasePlan> {
  // 生成候选方案:当前金额 + 10万、20万...直到预算上限
  const candidates: number[] = [];
  for (let add = 100000_00; add <= maxBudget; add += 100000_00) {
    candidates.push(add);
  }
  // 添加预算上限
  if (maxBudget % 100000_00 !== 0) {
    candidates.push(maxBudget);
  }

  const plans = await generatePurchasePlans(currentPayment, candidates, hasSubDealers, subTotalPayment);

  // 找到综合收益率最高的方案
  let optimalPlan = plans[0];
  for (const plan of plans) {
    if (plan.benefitRate > optimalPlan.benefitRate) {
      optimalPlan = plan;
    }
  }

  return optimalPlan;
}
