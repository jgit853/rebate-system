import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
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
 * CMS路由 - 内容管理系统
 */
export const cmsRouter = router({
  // ==========================================
  // 公告管理
  // ==========================================
  announcements: router({
    /**
     * 获取所有公告(管理员)
     */
    list: adminProcedure
      .input(
        z
          .object({
            status: z.enum(["draft", "published", "archived"]).optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return await db.getAllAnnouncements(input?.status);
      }),

    /**
     * 获取已发布公告(公开)
     */
    listPublished: publicProcedure.query(async () => {
      return await db.getPublishedAnnouncements();
    }),

    /**
     * 获取单个公告
     */
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getAnnouncementById(input.id);
      }),

    /**
     * 创建公告
     */
    create: adminProcedure
      .input(
        z.object({
          title: z.string().min(1).max(255),
          content: z.string().min(1),
          type: z.enum(["info", "warning", "urgent"]),
          status: z.enum(["draft", "published", "archived"]),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const id = await db.createAnnouncement({
          ...input,
          createdBy: ctx.user.id,
        });
        return { id, success: true };
      }),

    /**
     * 更新公告
     */
    update: adminProcedure
      .input(
        z.object({
          id: z.number(),
          title: z.string().min(1).max(255).optional(),
          content: z.string().min(1).optional(),
          type: z.enum(["info", "warning", "urgent"]).optional(),
          status: z.enum(["draft", "published", "archived"]).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        const success = await db.updateAnnouncement(id, data);
        if (!success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "更新公告失败",
          });
        }
        return { success: true };
      }),

    /**
     * 删除公告
     */
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const success = await db.deleteAnnouncement(input.id);
        if (!success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "删除公告失败",
          });
        }
        return { success: true };
      }),
  }),

  // ==========================================
  // 帮助文档管理
  // ==========================================
  helpDocs: router({
    /**
     * 获取所有帮助文档(管理员)
     */
    list: adminProcedure
      .input(
        z
          .object({
            status: z.enum(["draft", "published"]).optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return await db.getAllHelpDocs(input?.status);
      }),

    /**
     * 按分类获取帮助文档(公开)
     */
    listByCategory: publicProcedure
      .input(z.object({ category: z.string() }))
      .query(async ({ input }) => {
        return await db.getHelpDocsByCategory(input.category);
      }),

    /**
     * 获取单个帮助文档
     */
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getHelpDocById(input.id);
      }),

    /**
     * 创建帮助文档
     */
    create: adminProcedure
      .input(
        z.object({
          title: z.string().min(1).max(255),
          content: z.string().min(1),
          category: z.string().min(1).max(100),
          order: z.number().default(0),
          status: z.enum(["draft", "published"]),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const id = await db.createHelpDoc({
          ...input,
          createdBy: ctx.user.id,
        });
        return { id, success: true };
      }),

    /**
     * 更新帮助文档
     */
    update: adminProcedure
      .input(
        z.object({
          id: z.number(),
          title: z.string().min(1).max(255).optional(),
          content: z.string().min(1).optional(),
          category: z.string().min(1).max(100).optional(),
          order: z.number().optional(),
          status: z.enum(["draft", "published"]).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        const success = await db.updateHelpDoc(id, data);
        if (!success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "更新帮助文档失败",
          });
        }
        return { success: true };
      }),

    /**
     * 删除帮助文档
     */
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const success = await db.deleteHelpDoc(input.id);
        if (!success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "删除帮助文档失败",
          });
        }
        return { success: true };
      }),
  }),

  // ==========================================
  // 通知消息管理
  // ==========================================
  notifications: router({
    /**
     * 获取所有通知(管理员)
     */
    list: adminProcedure.query(async () => {
      return await db.getAllNotifications();
    }),

    /**
     * 获取用户通知
     */
    listMy: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserNotifications(ctx.user.id);
    }),

    /**
     * 创建通知
     */
    create: adminProcedure
      .input(
        z.object({
          title: z.string().min(1).max(255),
          content: z.string().min(1),
          type: z.enum(["system", "settlement", "order", "custom"]),
          targetType: z.enum(["all", "role", "user", "dealer"]),
          targetId: z.number().optional(),
          targetRole: z.enum(["admin", "user"]).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const id = await db.createNotification({
          ...input,
          createdBy: ctx.user.id,
        });
        return { id, success: true };
      }),

    /**
     * 标记通知为已读
     */
    markAsRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const success = await db.markNotificationAsRead(input.id);
        return { success };
      }),

    /**
     * 删除通知
     */
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const success = await db.deleteNotification(input.id);
        if (!success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "删除通知失败",
          });
        }
        return { success: true };
      }),
  }),
});
