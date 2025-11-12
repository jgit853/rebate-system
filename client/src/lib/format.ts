/**
 * 格式化金额(从分转换为元)
 */
export function formatMoney(cents: number): string {
  return (cents / 100).toFixed(2);
}

/**
 * 格式化基数(从0.01单位转换为实际值)
 */
export function formatBaseUnit(value: number): string {
  return (value / 100).toFixed(2);
}

/**
 * 格式化比例(从万分之一转换为百分比)
 */
export function formatRate(value: number): string {
  return (value / 100).toFixed(2) + '%';
}

/**
 * 格式化日期
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('zh-CN');
}

/**
 * 将元转换为分
 */
export function yuanToCents(yuan: number): number {
  return Math.round(yuan * 100);
}

/**
 * 将实际基数转换为存储值
 */
export function baseUnitToStorage(value: number): number {
  return Math.round(value * 100);
}

/**
 * 将百分比转换为存储值
 */
export function percentToStorage(percent: number): number {
  return Math.round(percent * 100);
}
