import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import * as db from "../db";

/**
 * 管理员权限检查
 */
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "仅管理员可访问此功能",
    });
  }
  return next({ ctx });
});

/**
 * 系统设置路由
 */
export const systemSettingsRouter = router({
  /**
   * 获取系统设置
   */
  get: protectedProcedure.query(async () => {
    const settings = await db.getSystemSettings();
    
    // 如果没有设置,返回默认值
    if (!settings) {
      return {
        id: 0,
        systemName: "经销商返利对账系统",
        systemDescription: "管理经销商返利和对账的专业系统",
        systemLogo: "/logo.png",
        primaryColor: "#3b82f6",
        theme: "light" as const,
        smtpHost: "",
        smtpPort: 587,
        smtpUser: "",
        smtpPassword: "",
        smtpFrom: "",
        passwordMinLength: 6,
        sessionTimeout: 86400,
        enableTwoFactor: false,
        autoBackup: false,
        backupFrequency: 86400,
        backupRetentionDays: 7,
        updatedAt: new Date(),
        updatedBy: null,
      };
    }

    return settings;
  }),

  /**
   * 更新系统设置
   */
  update: adminProcedure
    .input(
      z.object({
        systemName: z.string().min(1).max(255).optional(),
        systemDescription: z.string().optional(),
        systemLogo: z.string().max(500).optional(),
        primaryColor: z.string().max(50).optional(),
        theme: z.enum(["light", "dark", "auto"]).optional(),
        smtpHost: z.string().max(255).optional(),
        smtpPort: z.number().optional(),
        smtpUser: z.string().max(255).optional(),
        smtpPassword: z.string().max(255).optional(),
        smtpFrom: z.string().max(255).optional(),
        passwordMinLength: z.number().min(4).max(20).optional(),
        sessionTimeout: z.number().min(300).optional(),
        enableTwoFactor: z.boolean().optional(),
        autoBackup: z.boolean().optional(),
        backupFrequency: z.number().optional(),
        backupRetentionDays: z.number().min(1).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const success = await db.upsertSystemSettings(input, ctx.user.id);
      
      if (!success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "更新系统设置失败",
        });
      }

      return { success: true };
    }),
});
