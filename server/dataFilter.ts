/**
 * 数据过滤工具 - 根据用户角色过滤敏感字段
 * 确保敏感控制信息仅对管理员可见
 */

import type { User } from "../drizzle/schema";

/**
 * 敏感字段列表 - 这些字段仅对admin角色可见
 */
const SENSITIVE_FIELDS = [
  'benefitRatio',        // 综合让利比例
  'totalBenefitAmount',  // 总让利金额
  'overLimitWarning',    // 超限预警标识
] as const;

/**
 * 判断用户是否为管理员
 */
export function isAdmin(user: User | null | undefined): boolean {
  return user?.role === 'admin';
}

/**
 * 过滤结算单敏感字段
 * 非管理员用户将看不到benefitRatio等敏感信息
 */
export function filterSettlementData<T extends Record<string, any>>(
  data: T,
  user: User | null | undefined
): T {
  if (isAdmin(user)) {
    return data; // 管理员可见所有字段
  }

  // 非管理员:移除敏感字段
  const filtered = { ...data };
  SENSITIVE_FIELDS.forEach(field => {
    if (field in filtered) {
      delete filtered[field];
    }
  });

  return filtered as T;
}

/**
 * 批量过滤结算单数组
 */
export function filterSettlementList<T extends Record<string, any>>(
  list: T[],
  user: User | null | undefined
): T[] {
  return list.map(item => filterSettlementData(item, user));
}

/**
 * 过滤经销商数据中的敏感统计信息
 */
export function filterDealerData<T extends Record<string, any>>(
  data: T,
  user: User | null | undefined
): T {
  if (isAdmin(user)) {
    return data;
  }

  // 非管理员:移除敏感统计字段
  const filtered = { ...data };
  const dealerSensitiveFields = ['totalBenefitRatio', 'overLimitCount'];
  dealerSensitiveFields.forEach(field => {
    if (field in filtered) {
      delete filtered[field];
    }
  });

  return filtered as T;
}
