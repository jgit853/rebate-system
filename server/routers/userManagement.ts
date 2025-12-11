import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  getAllUsers,
  updateUserRole,
  updateUserStatus,
  deleteUser,
  getUserLoginLogs,
  getDealerLoginLogs,
  getAllLoginLogs,
} from "../db";

/**
 * 用户管理路由 - 仅管理员可访问
 */
export const userManagementRouter = router({
  /**
   * 获取所有用户列表
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    // 仅管理员可访问
    if (ctx.user.role !== "admin") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "仅管理员可访问此功能",
      });
    }

    const users = await getAllUsers();
    return users;
  }),

  /**
   * 更新用户角色
   */
  updateRole: protectedProcedure
    .input(
      z.object({
        userId: z.number(),
        role: z.enum(["user", "admin"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 仅管理员可访问
      if (ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "仅管理员可访问此功能",
        });
      }

      // 不能修改自己的角色
      if (ctx.user.id === input.userId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "不能修改自己的角色",
        });
      }

      const success = await updateUserRole(input.userId, input.role);
      if (!success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "更新用户角色失败",
        });
      }

      return { success: true };
    }),

  /**
   * 更新用户状态(启用/禁用)
   */
  updateStatus: protectedProcedure
    .input(
      z.object({
        userId: z.number(),
        status: z.enum(["active", "disabled"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 仅管理员可访问
      if (ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "仅管理员可访问此功能",
        });
      }

      // 不能禁用自己
      if (ctx.user.id === input.userId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "不能禁用自己的账号",
        });
      }

      const success = await updateUserStatus(input.userId, input.status);
      if (!success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "更新用户状态失败",
        });
      }

      return { success: true };
    }),

  /**
   * 删除用户
   */
  delete: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // 仅管理员可访问
      if (ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "仅管理员可访问此功能",
        });
      }

      // 不能删除自己
      if (ctx.user.id === input.userId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "不能删除自己的账号",
        });
      }

      const success = await deleteUser(input.userId);
      if (!success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "删除用户失败",
        });
      }

      return { success: true };
    }),

  /**
   * 获取用户登录历史
   */
  getLoginHistory: protectedProcedure
    .input(
      z.object({
        userId: z.number().optional(),
        dealerId: z.number().optional(),
        limit: z.number().default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      // 仅管理员可访问
      if (ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "仅管理员可访问此功能",
        });
      }

      if (input.userId) {
        return await getUserLoginLogs(input.userId, input.limit);
      } else if (input.dealerId) {
        return await getDealerLoginLogs(input.dealerId, input.limit);
      } else {
        return await getAllLoginLogs(input.limit);
      }
    }),
});
