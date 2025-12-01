import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { getDb } from "./db";
import { 
  dealers, 
  products, 
  orders, 
  orderItems, 
  payments,
  settlementPeriods,
  annualSettlements,
  marketFunds,
  subCommissions,
} from "../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { generateAnnualSettlement } from "./settlement";
import * as db from "./db";
import { hashPassword, verifyPassword, generateDealerToken, verifyDealerToken } from "./auth";
import { filterSettlementData, filterSettlementList, isAdmin } from "./dataFilter";
import { generatePurchasePlans, findOptimalPlan } from "./purchaseCalculator";

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // 经销商认证
  dealerAuth: router({
    // 经销商登录
    login: publicProcedure
      .input(
        z.object({
          username: z.string(),
          password: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        const database = await getDb();
        if (!database) throw new Error("数据库连接失败");

        const dealer = await database
          .select()
          .from(dealers)
          .where(eq(dealers.username, input.username))
          .limit(1);

        if (dealer.length === 0) {
          throw new Error("用户名或密码错误");
        }

        if (!dealer[0].passwordHash) {
          throw new Error("请先设置密码");
        }

        const isValid = await verifyPassword(input.password, dealer[0].passwordHash);
        if (!isValid) {
          throw new Error("用户名或密码错误");
        }

        // 更新最后登录时间
        await database
          .update(dealers)
          .set({ lastLoginAt: new Date() })
          .where(eq(dealers.id, dealer[0].id));

        const token = generateDealerToken(dealer[0].id, dealer[0].username!);

        return {
          success: true,
          token,
          dealer: {
            id: dealer[0].id,
            code: dealer[0].code,
            name: dealer[0].name,
            type: dealer[0].type,
          },
        };
      }),

    // 设置密码(首次或重置)
    setPassword: publicProcedure
      .input(
        z.object({
          username: z.string(),
          newPassword: z.string().min(6),
        })
      )
      .mutation(async ({ input }) => {
        const database = await getDb();
        if (!database) throw new Error("数据库连接失败");

        const dealer = await database
          .select()
          .from(dealers)
          .where(eq(dealers.username, input.username))
          .limit(1);

        if (dealer.length === 0) {
          throw new Error("用户名不存在");
        }

        const passwordHash = await hashPassword(input.newPassword);

        await database
          .update(dealers)
          .set({
            passwordHash,
            passwordSetAt: new Date(),
          })
          .where(eq(dealers.id, dealer[0].id));

        return { success: true };
      }),

    // 修改密码(需要旧密码)
    changePassword: publicProcedure
      .input(
        z.object({
          username: z.string(),
          oldPassword: z.string(),
          newPassword: z.string().min(6),
        })
      )
      .mutation(async ({ input }) => {
        const database = await getDb();
        if (!database) throw new Error("数据库连接失败");

        const dealer = await database
          .select()
          .from(dealers)
          .where(eq(dealers.username, input.username))
          .limit(1);

        if (dealer.length === 0 || !dealer[0].passwordHash) {
          throw new Error("用户不存在或未设置密码");
        }

        const isValid = await verifyPassword(input.oldPassword, dealer[0].passwordHash);
        if (!isValid) {
          throw new Error("原密码错误");
        }

        const passwordHash = await hashPassword(input.newPassword);

        await database
          .update(dealers)
          .set({
            passwordHash,
            passwordSetAt: new Date(),
          })
          .where(eq(dealers.id, dealer[0].id));

        return { success: true };
      }),

    // 验证token并获取经销商信息
    verifyToken: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const decoded = verifyDealerToken(input.token);
        if (!decoded) {
          throw new Error("无效的token");
        }

        const dealer = await db.getDealerById(decoded.dealerId);
        if (!dealer) {
          throw new Error("经销商不存在");
        }

        return {
          dealer: {
            id: dealer.id,
            code: dealer.code,
            name: dealer.name,
            type: dealer.type,
            username: dealer.username,
          },
        };
      }),
  }),

  // 经销商专用API（不需要OAuth认证）
  dealerApi: router({
    // 获取当前活跃周期
    getActivePeriod: publicProcedure.query(async () => {
      return await db.getActivePeriod();
    }),

    // 获取所有周期列表（用于历史查询）
    getAllPeriods: publicProcedure.query(async () => {
      const database = await getDb();
      if (!database) return [];

      return await database
        .select()
        .from(settlementPeriods)
        .orderBy(desc(settlementPeriods.startDate));
    }),

    // 获取经销商的结算数据
    getMySettlement: publicProcedure
      .input(
        z.object({
          dealerId: z.number(),
          periodId: z.number(),
        })
      )
      .query(async ({ input }) => {
        const settlement = await db.getSettlementByDealerAndPeriod(
          input.dealerId,
          input.periodId
        );
        // 经销商只能看到自己的数据，不过滤敏感字段
        // 确保总是返回一个值，即使没有找到结算记录
        return settlement || null;
      }),

    // 获取经销商的市场基金记录
    getMyMarketFunds: publicProcedure
      .input(
        z.object({
          dealerId: z.number(),
          periodId: z.number(),
        })
      )
      .query(async ({ input }) => {
        const database = await getDb();
        if (!database) return [];

        return await database
          .select()
          .from(marketFunds)
          .where(
            and(
              eq(marketFunds.dealerId, input.dealerId),
              eq(marketFunds.periodId, input.periodId)
            )
          )
          .orderBy(desc(marketFunds.recordDate));
      }),

    // 保存进货核算历史记录
    saveCalculationHistory: publicProcedure
      .input(
        z.object({
          dealerId: z.number(),
          currentPayment: z.number(),
          maxBudget: z.number().optional(),
          customAmounts: z.string().optional(),
          optimalTargetAmount: z.number().optional(),
          optimalRebateAmount: z.number().optional(),
          optimalMarketFund: z.number().optional(),
          optimalTotalBenefit: z.number().optional(),
          optimalTierName: z.string().optional(),
          plansData: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const id = await db.saveCalculationHistory(input);
        return { id, success: true };
      }),

    // 获取历史记录列表
    getCalculationHistory: publicProcedure
      .input(
        z.object({
          dealerId: z.number(),
          limit: z.number().optional().default(20),
        })
      )
      .query(async ({ input }) => {
        return await db.getCalculationHistoryByDealer(input.dealerId, input.limit);
      }),

    // 获取单条历史记录详情
    getCalculationHistoryDetail: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getCalculationHistoryById(input.id);
      }),

    // 删除历史记录
    deleteCalculationHistory: publicProcedure
      .input(
        z.object({
          id: z.number(),
          dealerId: z.number(),
        })
      )
      .mutation(async ({ input }) => {
        const success = await db.deleteCalculationHistory(input.id, input.dealerId);
        return { success };
      }),

    // 获取政策参数（经销商可见）
    getPolicySettings: publicProcedure.query(async () => {
      const settings = await db.getPolicySettings();
      
      if (!settings) {
        // 返回默认值
        return {
          id: 0,
          rebateTiers: JSON.stringify([
            { threshold: 0, rate: 500 },
            { threshold: 50000000, rate: 800 },
            { threshold: 100000000, rate: 1200 },
            { threshold: 200000000, rate: 1500 },
          ]),
          overdueDeductions: JSON.stringify([
            { overdueRatio: 0, deduction: 0 },
            { overdueRatio: 500, deduction: 100 },
            { overdueRatio: 1000, deduction: 200 },
          ]),
          benefitRedline: 1800,
          marketFundRate: 300,
          firstYearCommissionRate: 1500,
          renewalCommissionRate: 500,
          updatedAt: new Date(),
          updatedBy: null,
        };
      }
      
      return settings;
    }),
  }),

  // 经销商管理
  dealers: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const dealers = await db.getAllDealers();
      // 经销商基本信息对所有用户可见,不需过滤
      return dealers;
    }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const dealer = await db.getDealerById(input.id);
        // 经销商详情对所有用户可见
        return dealer;
      }),

    getByType: protectedProcedure
      .input(z.object({ type: z.enum(["core", "sub_dealer", "terminal"]) }))
      .query(async ({ input }) => {
        return await db.getDealersByType(input.type);
      }),

    getSubDealers: protectedProcedure
      .input(z.object({ parentDealerId: z.number() }))
      .query(async ({ input }) => {
        return await db.getSubDealers(input.parentDealerId);
      }),

    create: protectedProcedure
      .input(
        z.object({
          code: z.string(),
          name: z.string(),
          type: z.enum(["core", "sub_dealer", "terminal"]),
          parentDealerId: z.number().optional(),
          username: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const database = await getDb();
        if (!database) throw new Error("数据库连接失败");

        await database.insert(dealers).values({
          code: input.code,
          name: input.name,
          type: input.type,
          parentDealerId: input.parentDealerId,
          username: input.username,
          status: "active",
        });

        return { success: true };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          code: z.string().optional(),
          name: z.string().optional(),
          type: z.enum(["core", "sub_dealer", "terminal"]).optional(),
          parentDealerId: z.number().optional().nullable(),
          username: z.string().optional(),
          status: z.enum(["active", "inactive"]).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const database = await getDb();
        if (!database) throw new Error("数据库连接失败");

        const updateData: any = {};
        if (input.code !== undefined) updateData.code = input.code;
        if (input.name !== undefined) updateData.name = input.name;
        if (input.type !== undefined) updateData.type = input.type;
        if (input.parentDealerId !== undefined) updateData.parentDealerId = input.parentDealerId;
        if (input.username !== undefined) updateData.username = input.username;
        if (input.status !== undefined) updateData.status = input.status;

        await database
          .update(dealers)
          .set(updateData)
          .where(eq(dealers.id, input.id));

        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const database = await getDb();
        if (!database) throw new Error("数据库连接失败");

        await database.delete(dealers).where(eq(dealers.id, input.id));

        return { success: true };
      }),
  }),

  // 产品管理
  products: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllProducts();
    }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getProductById(input.id);
      }),

    create: protectedProcedure
      .input(
        z.object({
          sku: z.string(),
          name: z.string(),
          spec: z.string(),
          wholesalePrice: z.number(), // 前端传入分为单位
          baseUnit: z.number(), // 前端传入0.01为单位
        })
      )
      .mutation(async ({ input }) => {
        const database = await getDb();
        if (!database) throw new Error("数据库连接失败");

        await database.insert(products).values({
          sku: input.sku,
          name: input.name,
          spec: input.spec,
          wholesalePrice: input.wholesalePrice,
          baseUnit: input.baseUnit,
        });

        return { success: true };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          sku: z.string().optional(),
          name: z.string().optional(),
          spec: z.string().optional(),
          wholesalePrice: z.number().optional(),
          baseUnit: z.number().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const database = await getDb();
        if (!database) throw new Error("数据库连接失败");

        const updateData: any = {};
        if (input.sku !== undefined) updateData.sku = input.sku;
        if (input.name !== undefined) updateData.name = input.name;
        if (input.spec !== undefined) updateData.spec = input.spec;
        if (input.wholesalePrice !== undefined) updateData.wholesalePrice = input.wholesalePrice;
        if (input.baseUnit !== undefined) updateData.baseUnit = input.baseUnit;

        await database
          .update(products)
          .set(updateData)
          .where(eq(products.id, input.id));

        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const database = await getDb();
        if (!database) throw new Error("数据库连接失败");

        await database.delete(products).where(eq(products.id, input.id));

        return { success: true };
      }),
  }),

  // 结算周期管理
  periods: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllPeriods();
    }),

    getActive: protectedProcedure.query(async () => {
      return await db.getActivePeriod();
    }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getPeriodById(input.id);
      }),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string(),
          startDate: z.string(),
          endDate: z.string(),
          type: z.enum(["annual", "quarterly", "custom"]),
          isActive: z.boolean().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const database = await getDb();
        if (!database) throw new Error("数据库连接失败");

        await database.insert(settlementPeriods).values({
          name: input.name,
          startDate: new Date(input.startDate),
          endDate: new Date(input.endDate),
          type: input.type,
          isActive: input.isActive || false,
        });

        return { success: true };
      }),

    setActive: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const database = await getDb();
        if (!database) throw new Error("数据库连接失败");

        // 先将所有周期设为非活跃
        await database
          .update(settlementPeriods)
          .set({ isActive: false });

        // 再将指定周期设为活跃
        await database
          .update(settlementPeriods)
          .set({ isActive: true })
          .where(eq(settlementPeriods.id, input.id));

        return { success: true };
      }),
  }),

  // 订单和回款管理
  orders: router({
    list: protectedProcedure
      .input(
        z.object({
          dealerId: z.number().optional(),
          status: z.enum(["pending", "paid", "cancelled"]).optional(),
          type: z.enum(["normal", "gift", "special"]).optional(),
        })
      )
      .query(async ({ input }) => {
        return await db.getAllOrders(input.dealerId, input.status, input.type);
      }),

    getByDealer: protectedProcedure
      .input(
        z.object({
          dealerId: z.number(),
          periodId: z.number().optional(),
        })
      )
      .query(async ({ input }) => {
        return await db.getOrdersByDealer(input.dealerId, input.periodId);
      }),

    create: protectedProcedure
      .input(
        z.object({
          orderNumber: z.string(),
          dealerId: z.number(),
          orderDate: z.string(),
          dueDate: z.string(),
          type: z.enum(["normal", "gift", "special"]),
          items: z.array(
            z.object({
              productId: z.number(),
              quantity: z.number(),
              price: z.number(), // 分为单位
            })
          ),
        })
      )
      .mutation(async ({ input }) => {
        const database = await getDb();
        if (!database) throw new Error("数据库连接失败");

        // 计算订单总额
        const totalAmount = input.items.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0
        );

        // 插入订单
        const orderResult = await database.insert(orders).values({
          orderNumber: input.orderNumber,
          dealerId: input.dealerId,
          orderDate: new Date(input.orderDate),
          dueDate: new Date(input.dueDate),
          totalAmount,
          type: input.type,
          status: "pending",
        });

        // 获取插入的订单ID
        const newOrders = await database
          .select()
          .from(orders)
          .where(eq(orders.orderNumber, input.orderNumber))
          .limit(1);

        if (newOrders.length === 0) {
          throw new Error("订单创建失败");
        }

        const orderId = newOrders[0].id;

        // 插入订单明细
        for (const item of input.items) {
          await database.insert(orderItems).values({
            orderId,
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
            itemAmount: item.price * item.quantity,
          });
        }

        return { success: true, orderId };
      }),

    addPayment: protectedProcedure
      .input(
        z.object({
          orderId: z.number(),
          amount: z.number(), // 分为单位
          paymentDate: z.string(),
          method: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const database = await getDb();
        if (!database) throw new Error("数据库连接失败");

        await database.insert(payments).values({
          orderId: input.orderId,
          amount: input.amount,
          paymentDate: new Date(input.paymentDate),
          method: input.method,
        });

        // 更新订单状态
        const order = await database
          .select()
          .from(orders)
          .where(eq(orders.id, input.orderId))
          .limit(1);

        if (order.length > 0) {
          const allPayments = await database
            .select()
            .from(payments)
            .where(eq(payments.orderId, input.orderId));

          const totalPaid = allPayments.reduce((sum, p) => sum + p.amount, 0);

          if (totalPaid >= order[0].totalAmount) {
            await database
              .update(orders)
              .set({ status: "paid" })
              .where(eq(orders.id, input.orderId));
          }
        }

        return { success: true };
      }),

    getPayments: protectedProcedure
      .input(z.object({ orderId: z.number() }))
      .query(async ({ input }) => {
        return await db.getPaymentsByOrder(input.orderId);
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          orderNumber: z.string().optional(),
          dealerId: z.number().optional(),
          orderDate: z.string().optional(),
          dueDate: z.string().optional(),
          type: z.enum(["normal", "gift", "special"]).optional(),
          status: z.enum(["pending", "paid", "cancelled"]).optional(),
          items: z.array(
            z.object({
              productId: z.number(),
              quantity: z.number(),
              price: z.number(),
            })
          ).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const database = await getDb();
        if (!database) throw new Error("数据库连接失败");

        const updateData: any = {};
        if (input.orderNumber) updateData.orderNumber = input.orderNumber;
        if (input.dealerId) updateData.dealerId = input.dealerId;
        if (input.orderDate) updateData.orderDate = new Date(input.orderDate);
        if (input.dueDate) updateData.dueDate = new Date(input.dueDate);
        if (input.type) updateData.type = input.type;
        if (input.status) updateData.status = input.status;

        // 如果有订单明细更新,先删除旧明细再插入新明细
        if (input.items && input.items.length > 0) {
          const totalAmount = input.items.reduce(
            (sum, item) => sum + item.price * item.quantity,
            0
          );
          updateData.totalAmount = totalAmount;

          // 删除旧订单明细
          await database.delete(orderItems).where(eq(orderItems.orderId, input.id));

          // 插入新订单明细
          for (const item of input.items) {
            await database.insert(orderItems).values({
              orderId: input.id,
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
              itemAmount: item.price * item.quantity,
            });
          }
        }

        if (Object.keys(updateData).length > 0) {
          await database.update(orders).set(updateData).where(eq(orders.id, input.id));
        }

        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const database = await getDb();
        if (!database) throw new Error("数据库连接失败");

        // 先删除订单明细
        await database.delete(orderItems).where(eq(orderItems.orderId, input.id));

        // 删除回款记录
        await database.delete(payments).where(eq(payments.orderId, input.id));

        // 删除订单
        await database.delete(orders).where(eq(orders.id, input.id));

        return { success: true };
      }),
  }),

  // 结算管理
  settlements: router({
    list: protectedProcedure
      .input(z.object({ periodId: z.number().optional() }))
      .query(async ({ input, ctx }) => {
        const settlements = await db.getAllSettlements(input.periodId);
        // 仅管理员可见敏感字段
        return isAdmin(ctx.user) ? settlements : filterSettlementList(settlements, ctx.user);
      }),

    getByDealerAndPeriod: protectedProcedure
      .input(
        z.object({
          dealerId: z.number(),
          periodId: z.number(),
        })
      )
      .query(async ({ input, ctx }) => {
        const settlement = await db.getSettlementByDealerAndPeriod(
          input.dealerId,
          input.periodId
        );
        // 根据用户角色过滤敏感字段
        return settlement ? filterSettlementData(settlement, ctx.user) : null;
      }),

    generate: protectedProcedure
      .input(
        z.object({
          dealerId: z.number(),
          periodId: z.number(),
        })
      )
      .mutation(async ({ input }) => {
        const settlementId = await generateAnnualSettlement(
          input.dealerId,
          input.periodId
        );
        return { success: true, settlementId };
      }),

    updateStatus: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          status: z.enum(["draft", "pending_approval", "approved", "paid"]),
        })
      )
      .mutation(async ({ input }) => {
        const database = await getDb();
        if (!database) throw new Error("数据库连接失败");

        // 检查是否超过18%红线
        const settlement = await database
          .select()
          .from(annualSettlements)
          .where(eq(annualSettlements.id, input.id))
          .limit(1);

        if (settlement.length === 0) {
          throw new Error("结算单不存在");
        }

        // 如果要审批通过,检查是否超限
        if (input.status === "approved" && settlement[0].benefitRatio > 1800) {
          throw new Error("综合让利超过18%红线,无法审批通过");
        }

        await database
          .update(annualSettlements)
          .set({ status: input.status })
          .where(eq(annualSettlements.id, input.id));

        return { success: true };
      }),

    getByStatus: protectedProcedure
      .input(
        z.object({
          status: z.enum(["draft", "pending_approval", "approved", "paid"]),
        })
      )
      .query(async ({ input }) => {
        return await db.getSettlementsByStatus(input.status);
      }),

    // 获取结算单详细信息(包含下级佣金明细)
    getDetails: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const database = await getDb();
        if (!database) throw new Error("数据库连接失败");

        const settlement = await database
          .select()
          .from(annualSettlements)
          .where(eq(annualSettlements.id, input.id))
          .limit(1);

        if (settlement.length === 0) {
          return null;
        }

        // 获取下级佣金明细
        const commissions = await database
          .select()
          .from(subCommissions)
          .where(
            and(
              eq(subCommissions.coreDealerId, settlement[0].dealerId),
              eq(subCommissions.periodId, settlement[0].periodId)
            )
          );

        // 获取市场基金流水
        const funds = await database
          .select()
          .from(marketFunds)
          .where(
            and(
              eq(marketFunds.dealerId, settlement[0].dealerId),
              eq(marketFunds.periodId, settlement[0].periodId)
            )
          )
          .orderBy(desc(marketFunds.recordDate));

        return {
          settlement: settlement[0],
          commissions,
          funds,
        };
      }),
  }),

  // 市场基金管理
  marketFunds: router({
    addUsage: protectedProcedure
      .input(
        z.object({
          dealerId: z.number(),
          periodId: z.number(),
          amount: z.number(), // 正数,表示使用金额
          description: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        const database = await getDb();
        if (!database) throw new Error("数据库连接失败");

        await database.insert(marketFunds).values({
          dealerId: input.dealerId,
          periodId: input.periodId,
          type: "usage",
          amount: -Math.abs(input.amount), // 存储为负数
          description: input.description,
          recordDate: new Date(),
        });

        return { success: true };
      }),

    getByDealer: protectedProcedure
      .input(
        z.object({
          dealerId: z.number(),
          periodId: z.number(),
        })
      )
      .query(async ({ input }) => {
        const database = await getDb();
        if (!database) return [];

        return await database
          .select()
          .from(marketFunds)
          .where(
            and(
              eq(marketFunds.dealerId, input.dealerId),
              eq(marketFunds.periodId, input.periodId)
            )
          )
          .orderBy(desc(marketFunds.recordDate));
      }),
  }),

  // 进货核算推演工具
  purchaseCalculator: router({    
    // 生成多个进货方案对比
    generatePlans: publicProcedure
      .input(
        z.object({
          currentPayment: z.number(), // 当前已回款金额(分)
          additionalAmounts: z.array(z.number()), // 追加进货金额列表(分)
          hasSubDealers: z.boolean().optional(),
          subTotalPayment: z.number().optional(),
        })
      )
      .query(async ({ input }) => {
        return await generatePurchasePlans(
          input.currentPayment,
          input.additionalAmounts,
          input.hasSubDealers || false,
          input.subTotalPayment || 0
        );
      }),

    // 找到最优进货方案
    findOptimal: publicProcedure
      .input(
        z.object({
          currentPayment: z.number(),
          maxBudget: z.number(), // 最大追加预算(分)
          hasSubDealers: z.boolean().optional(),
          subTotalPayment: z.number().optional(),
        })
      )
      .query(async ({ input }) => {
        return await findOptimalPlan(
          input.currentPayment,
          input.maxBudget,
          input.hasSubDealers || false,
          input.subTotalPayment || 0
        );
      }),
  }),

  // 政策参数设置
  policySettings: router({
    // 获取当前政策参数
    get: protectedProcedure.query(async () => {
      const settings = await db.getPolicySettings();
      
      if (!settings) {
        // 返回默认值
        return {
          id: 0,
          rebateTiers: JSON.stringify([
            { threshold: 0, rate: 600 },
            { threshold: 100000, rate: 700 },
            { threshold: 200000, rate: 800 },
            { threshold: 300000, rate: 900 },
          ]),
          overdueDeductions: JSON.stringify([
            { overdueRatio: 0, deduction: 0 },
            { overdueRatio: 500, deduction: 100 },
            { overdueRatio: 1000, deduction: 200 },
          ]),
          benefitRedline: 1800,
          marketFundRate: 300,
          firstYearCommissionRate: 1500,
          renewalCommissionRate: 500,
          updatedAt: new Date(),
          updatedBy: null,
        };
      }
      
      return settings;
    }),

    // 更新政策参数(仅管理员)
    update: protectedProcedure
      .input(
        z.object({
          rebateTiers: z.string(),
          overdueDeductions: z.string(),
          benefitRedline: z.number(),
          marketFundRate: z.number(),
          firstYearCommissionRate: z.number(),
          renewalCommissionRate: z.number(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('仅管理员可以修改政策参数');
        }

        // 验证JSON格式
        try {
          JSON.parse(input.rebateTiers);
          JSON.parse(input.overdueDeductions);
        } catch (e) {
          throw new Error('返利阶梯或超期扣减参数格式错误');
        }

        await db.updatePolicySettings({
          ...input,
          updatedBy: ctx.user.id,
        });

        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
