import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, TrendingUp, DollarSign, Users } from "lucide-react";
import { useRoute, Link } from "wouter";
import { formatMoney, formatBaseUnit, formatRate, formatDate } from "@/lib/format";

export default function DealerDetail() {
  const [, params] = useRoute("/admin/dealers/:id");
  const dealerId = params?.id ? parseInt(params.id) : 0;

  const { data: dealer } = trpc.dealers.getById.useQuery({ id: dealerId });
  const { data: activePeriod } = trpc.periods.getActive.useQuery();
  const { data: settlement } = trpc.settlements.getByDealerAndPeriod.useQuery(
    { dealerId, periodId: activePeriod?.id || 0 },
    { enabled: !!activePeriod }
  );
  const { data: subDealers } = trpc.dealers.getSubDealers.useQuery({ parentDealerId: dealerId });
  const { data: orders } = trpc.orders.getByDealer.useQuery(
    { dealerId, periodId: activePeriod?.id },
    { enabled: !!activePeriod }
  );

  const generateMutation = trpc.settlements.generate.useMutation();
  const utils = trpc.useUtils();

  const handleGenerate = async () => {
    if (!activePeriod) return;
    try {
      await generateMutation.mutateAsync({ dealerId, periodId: activePeriod.id });
      utils.settlements.getByDealerAndPeriod.invalidate();
    } catch (error) {
      console.error(error);
    }
  };

  if (!dealer) {
    return (
      <AdminLayout>
        <div className="p-6">
          <p>加载中...</p>
        </div>
      </AdminLayout>
    );
  }

  const typeLabels = {
    core: "核心经销商",
    sub_dealer: "下级经销商",
    terminal: "终端客户",
  };

  // 综合让利比例仅供管理员内部参考,不对经销商展示

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/dealers">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{dealer.name}</h1>
            <p className="text-muted-foreground mt-1">
              {dealer.code} · {typeLabels[dealer.type]}
            </p>
          </div>
        </div>

        {/* 当前周期统计 */}
        {settlement && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  年度回款
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ¥{formatMoney(settlement.totalPaymentAmount)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  基数: {formatBaseUnit(settlement.totalBaseUnit)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  返利金额
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  ¥{formatMoney(settlement.rebateAmount)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  比例: {formatRate(settlement.adjustedRebateRate)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  下级抽佣
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  ¥{formatMoney(settlement.paidCommissionAmount)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  总计: ¥{formatMoney(settlement.totalCommissionAmount)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  综合让利
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {formatRate(settlement.benefitRatio)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  综合让利比例
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {!settlement && activePeriod && (
          <Card>
            <CardHeader>
              <CardTitle>尚未生成结算单</CardTitle>
              <CardDescription>
                当前周期: {activePeriod.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleGenerate} disabled={generateMutation.isPending}>
                {generateMutation.isPending ? "生成中..." : "生成结算单"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* 详细信息标签页 */}
        <Tabs defaultValue="orders" className="space-y-4">
          <TabsList>
            <TabsTrigger value="orders">订单列表</TabsTrigger>
            {dealer.type === "core" && <TabsTrigger value="subs">下级客户</TabsTrigger>}
            {settlement && <TabsTrigger value="settlement">结算详情</TabsTrigger>}
          </TabsList>

          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <CardTitle>订单列表</CardTitle>
                <CardDescription>当前周期的所有订单</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>订单号</TableHead>
                        <TableHead>订单日期</TableHead>
                        <TableHead>订单金额</TableHead>
                        <TableHead>状态</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders && orders.length > 0 ? (
                        orders.map((order) => (
                          <TableRow key={order.id}>
                            <TableCell className="font-mono">{order.orderNumber}</TableCell>
                            <TableCell>{formatDate(order.orderDate)}</TableCell>
                            <TableCell>¥{formatMoney(order.totalAmount)}</TableCell>
                            <TableCell>
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  order.status === "paid"
                                    ? "bg-green-100 text-green-800"
                                    : order.status === "pending"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {order.status === "paid"
                                  ? "已付款"
                                  : order.status === "pending"
                                  ? "待付款"
                                  : "已取消"}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground">
                            暂无订单
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {dealer.type === "core" && (
            <TabsContent value="subs">
              <Card>
                <CardHeader>
                  <CardTitle>下级客户</CardTitle>
                  <CardDescription>该核心经销商的所有下级</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>编码</TableHead>
                          <TableHead>名称</TableHead>
                          <TableHead>类型</TableHead>
                          <TableHead>状态</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {subDealers && subDealers.length > 0 ? (
                          subDealers.map((sub) => (
                            <TableRow key={sub.id}>
                              <TableCell className="font-mono">{sub.code}</TableCell>
                              <TableCell>{sub.name}</TableCell>
                              <TableCell>
                                {sub.type === "sub_dealer" ? "下级经销商" : "终端客户"}
                              </TableCell>
                              <TableCell>
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    sub.status === "active"
                                      ? "bg-green-100 text-green-800"
                                      : "bg-gray-100 text-gray-800"
                                  }`}
                                >
                                  {sub.status === "active" ? "活跃" : "停用"}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground">
                              暂无下级客户
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {settlement && (
            <TabsContent value="settlement">
              <div className="grid gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>返利计算详情</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">年度总基数:</span>
                      <span className="font-medium">{formatBaseUnit(settlement.totalBaseUnit)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">基础返利比例:</span>
                      <span className="font-medium">{formatRate(settlement.baseRebateRate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">超期金额:</span>
                      <span className="font-medium">¥{formatMoney(settlement.overdueAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">超期比例:</span>
                      <span className="font-medium">{formatRate(settlement.overdueRatio)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-3">
                      <span className="text-muted-foreground">调整后返利比例:</span>
                      <span className="font-medium text-green-600">
                        {formatRate(settlement.adjustedRebateRate)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">返利金额:</span>
                      <span className="font-bold text-green-600">
                        ¥{formatMoney(settlement.rebateAmount)}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>综合让利汇总</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">阶梯返利:</span>
                      <span className="font-medium">¥{formatMoney(settlement.rebateAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">下级抽佣(已付):</span>
                      <span className="font-medium">
                        ¥{formatMoney(settlement.paidCommissionAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">市场基金:</span>
                      <span className="font-medium">
                        ¥{formatMoney(settlement.marketFundAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between border-t pt-3">
                      <span className="text-muted-foreground">总让利金额:</span>
                      <span className="font-bold">
                        ¥{formatMoney(settlement.totalBenefitAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">综合让利比例:</span>
                      <span className="font-bold text-lg text-purple-600">
                        {formatRate(settlement.benefitRatio)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </AdminLayout>
  );
}
