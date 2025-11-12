import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_LOGO, APP_TITLE, getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { formatMoney, formatBaseUnit, formatRate, formatDate } from "@/lib/format";
import { LogOut, TrendingUp, DollarSign, Calendar, AlertTriangle } from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const logoutMutation = trpc.auth.logout.useMutation();

  const { data: dealers } = trpc.dealers.list.useQuery(undefined, { enabled: isAuthenticated });
  const { data: activePeriod } = trpc.periods.getActive.useQuery(undefined, { enabled: isAuthenticated });

  // 假设当前用户关联的经销商(实际应该通过userId关联)
  const myDealer = dealers?.find((d) => d.userId === user?.id) || dealers?.[0];

  const { data: settlement } = trpc.settlements.getByDealerAndPeriod.useQuery(
    { dealerId: myDealer?.id || 0, periodId: activePeriod?.id || 0 },
    { enabled: !!myDealer && !!activePeriod }
  );

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
    window.location.href = "/";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <DollarSign className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">{APP_TITLE}</CardTitle>
            <CardDescription>经销商返利对账查询系统</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-muted-foreground">
              请登录查看您的返利信息和结算详情
            </p>
            <Button asChild className="w-full" size="lg">
              <a href={getLoginUrl()}>立即登录</a>
            </Button>
            <div className="text-center">
              <Link href="/admin">
                <a className="text-sm text-muted-foreground hover:text-foreground">
                  管理员入口 →
                </a>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isOverLimit = settlement && settlement.benefitRatio > 1800;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">{APP_TITLE}</h1>
              <p className="text-xs text-muted-foreground">经销商端</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium">{user?.name || "用户"}</p>
              <p className="text-xs text-muted-foreground">{myDealer?.name || "未关联经销商"}</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              退出
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {!myDealer && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>提示</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                您的账号尚未关联经销商信息,请联系管理员进行配置。
              </p>
              <Link href="/admin">
                <Button className="mt-4">前往管理后台</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {myDealer && (
          <div className="space-y-6">
            {/* 当前周期信息 */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  <CardTitle>当前结算周期</CardTitle>
                </div>
                <CardDescription>
                  {activePeriod
                    ? `${activePeriod.name} (${formatDate(activePeriod.startDate)} - ${formatDate(activePeriod.endDate)})`
                    : "暂无活跃周期"}
                </CardDescription>
              </CardHeader>
            </Card>

            {/* 结算数据 */}
            {settlement ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                        阶梯返利
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
                        市场基金: ¥{formatMoney(settlement.marketFundAmount)}
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
                      <div
                        className={`text-2xl font-bold ${
                          isOverLimit ? "text-red-500" : "text-purple-600"
                        }`}
                      >
                        {formatRate(settlement.benefitRatio)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {isOverLimit ? "⚠️ 超过18%红线" : "✓ 未超限"}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* 详细信息 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>返利计算详情</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">年度总基数:</span>
                        <span className="font-medium">
                          {formatBaseUnit(settlement.totalBaseUnit)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">基础返利比例:</span>
                        <span className="font-medium">
                          {formatRate(settlement.baseRebateRate)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">超期金额:</span>
                        <span className="font-medium">
                          ¥{formatMoney(settlement.overdueAmount)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">超期比例:</span>
                        <span className="font-medium">
                          {formatRate(settlement.overdueRatio)}
                        </span>
                      </div>
                      <div className="flex justify-between border-t pt-3">
                        <span className="text-muted-foreground">调整后返利比例:</span>
                        <span className="font-medium text-green-600">
                          {formatRate(settlement.adjustedRebateRate)}
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
                        <span className="font-medium">
                          ¥{formatMoney(settlement.rebateAmount)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">下级抽佣:</span>
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
                        <span
                          className={`font-bold text-lg ${
                            isOverLimit ? "text-red-500" : "text-purple-600"
                          }`}
                        >
                          {formatRate(settlement.benefitRatio)}
                        </span>
                      </div>
                      {isOverLimit && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <AlertTriangle className="w-5 h-5 text-red-500" />
                          <p className="text-sm text-red-700">
                            综合让利已超过18%红线,请联系管理员
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* 结算状态 */}
                <Card>
                  <CardHeader>
                    <CardTitle>结算状态</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">当前状态:</span>
                      <span
                        className={`px-4 py-2 rounded-full text-sm font-medium ${
                          settlement.status === "paid"
                            ? "bg-blue-100 text-blue-800"
                            : settlement.status === "approved"
                            ? "bg-green-100 text-green-800"
                            : settlement.status === "pending_approval"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {settlement.status === "paid"
                          ? "已支付"
                          : settlement.status === "approved"
                          ? "已审批"
                          : settlement.status === "pending_approval"
                          ? "待审批"
                          : "草稿"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>暂无结算数据</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    当前周期尚未生成结算单,请等待管理员生成。
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
