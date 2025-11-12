/**
 * 经销商认证模块
 * 处理密码加密、验证和会话管理
 */

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { ENV } from "./_core/env";

const SALT_ROUNDS = 10;
const JWT_EXPIRES_IN = "7d"; // 7天有效期

/**
 * 加密密码
 */
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * 验证密码
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

/**
 * 生成JWT token
 */
export function generateDealerToken(dealerId: number, username: string): string {
  return jwt.sign(
    {
      dealerId,
      username,
      type: "dealer",
    },
    process.env.JWT_SECRET || "fallback-secret",
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * 验证JWT token
 */
export function verifyDealerToken(token: string): {
  dealerId: number;
  username: string;
  type: string;
} | null {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback-secret") as any;
    if (decoded.type !== "dealer") {
      return null;
    }
    return {
      dealerId: decoded.dealerId,
      username: decoded.username,
      type: decoded.type,
    };
  } catch (error) {
    return null;
  }
}
