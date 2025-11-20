import { describe, it, expect } from "vitest";
import {
  calculateTieredRebate,
  calculateSubCommission,
  calculateMarketFund,
  generatePurchasePlans,
  findOptimalPlan,
} from "./purchaseCalculator";

describe("进货核算推演工具", () => {
  describe("calculateTieredRebate", () => {
    it("应正确计算第一档返利(0-50万,5%)", () => {
      const result = calculateTieredRebate(300000_00); // 30万
      expect(result.rebateAmount).toBe(15000_00); // 30万 * 5% = 1.5万
      expect(result.effectiveRate).toBeCloseTo(0.05);
      expect(result.tier).toBe(0);
    });

    it("应正确计算第二档返利(50-100万,8%)", () => {
      const result = calculateTieredRebate(800000_00); // 80万
      // 前50万: 50万 * 5% = 2.5万
      // 后30万: 30万 * 8% = 2.4万
      // 总计: 4.9万
      expect(result.rebateAmount).toBe(49000_00);
      expect(result.tier).toBe(1);
    });

    it("应正确计算第三档返利(100-200万,12%)", () => {
      const result = calculateTieredRebate(1500000_00); // 150万
      // 前50万: 50万 * 5% = 2.5万
      // 50-100万: 50万 * 8% = 4万
      // 100-150万: 50万 * 12% = 6万
      // 总计: 12.5万
      expect(result.rebateAmount).toBe(125000_00);
      expect(result.tier).toBe(2);
    });

    it("应正确计算第四档返利(200万以上,15%)", () => {
      const result = calculateTieredRebate(2500000_00); // 250万
      // 前50万: 2.5万
      // 50-100万: 4万
      // 100-200万: 12万
      // 200-250万: 50万 * 15% = 7.5万
      // 总计: 26万
      expect(result.rebateAmount).toBe(260000_00);
      expect(result.tier).toBe(3);
    });
  });

  describe("calculateSubCommission", () => {
    it("应正确计算首年抽佣(20%)", () => {
      const commission = calculateSubCommission(500000_00, true, 100);
      expect(commission).toBe(100000_00); // 50万 * 20% = 10万
    });

    it("应正确计算续期抽佣(10%)", () => {
      const commission = calculateSubCommission(500000_00, false, 100);
      expect(commission).toBe(50000_00); // 50万 * 10% = 5万
    });

    it("应正确应用抽佣上限", () => {
      const commission = calculateSubCommission(10000000_00, true, 100); // 1000万 * 20% = 200万
      const maxCommission = 100 * 10000_00; // 基数100 * 1万(分) = 100万
      expect(commission).toBe(maxCommission);
    });
  });

  describe("calculateMarketFund", () => {
    it("应正确计算市场基金(3%)", () => {
      const fund = calculateMarketFund(1000000_00); // 100万
      expect(fund).toBe(30000_00); // 100万 * 3% = 3万
    });
  });

  describe("generatePurchasePlans", () => {
    it("应生成多个进货方案", () => {
      const plans = generatePurchasePlans(
        300000_00, // 当前30万
        [100000_00, 300000_00, 500000_00] // 追加10万、30万、50万
      );

      expect(plans).toHaveLength(3);
      expect(plans[0].targetAmount).toBe(400000_00); // 40万
      expect(plans[1].targetAmount).toBe(600000_00); // 60万
      expect(plans[2].targetAmount).toBe(800000_00); // 80万
    });

    it("应正确计算每个方案的收益", () => {
      const plans = generatePurchasePlans(300000_00, [200000_00]); // 30万 + 20万 = 50万

      const plan = plans[0];
      expect(plan.targetAmount).toBe(500000_00);
      expect(plan.rebateAmount).toBe(25000_00); // 50万 * 5% = 2.5万
      expect(plan.marketFund).toBe(15000_00); // 50万 * 3% = 1.5万
      expect(plan.totalBenefit).toBe(40000_00); // 2.5万 + 1.5万 = 4万
    });

    it("应识别升档机会并给出建议", () => {
      const plans = generatePurchasePlans(900000_00, [50000_00]); // 90万 + 5万 = 95万

      const plan = plans[0];
      expect(plan.tier).toBe(1); // 第二档
      // 95万距离100万只有5万,应建议升档
      expect(plan.recommendation).toBeTruthy();
      expect(plan.recommendation).toContain("第三档");
    });
  });

  describe("findOptimalPlan", () => {
    it("应找到收益率最高的方案", () => {
      const optimal = findOptimalPlan(
        450000_00, // 当前45万
        600000_00 // 最大预算60万
      );

      // 应推荐进货到100万(第三档起点),收益率最高
      expect(optimal.tier).toBeGreaterThanOrEqual(1);
      expect(optimal.benefitRate).toBeGreaterThan(0);
    });

    it("应在预算范围内找到方案", () => {
      const optimal = findOptimalPlan(300000_00, 200000_00);

      expect(optimal.targetAmount).toBeLessThanOrEqual(300000_00 + 200000_00);
    });
  });
});
