import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_TITLE } from "@/const";
import { trpc } from "@/lib/trpc";
import { formatMoney, formatBaseUnit, formatRate, formatDate } from "@/lib/format";
import { LogOut, DollarSign, Calendar, AlertTriangle, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

interface DealerInfo {
  id: number;
  code: string;
  name: string;
  type: string;
}

export default function DealerDashboard() {
  const [, setLocation] = useLocation();
  const [dealerInfo, setDealerInfo] = useState<DealerInfo | null>(null);
  const [token, setToken] = useState<string>("");

  useEffect(() => {
    const storedToken = localStorage.getItem("dealerToken");
    const storedInfo = localStorage.getItem("dealerInfo");

    if (!storedToken || !storedInfo) {
      setLocation("/dealer/login");
      return;
    }

    setToken(storedToken);
    setDealerInfo(JSON.parse(storedInfo));
  }, [setLocation]);

  const { data: activePeriod } = trpc.periods.getActive.useQuery();
  const { data: settlement } = trpc.settlements.getByDealerAndPeriod.useQuery(
    { dealerId: dealerInfo?.id || 0, periodId: activePeriod?.id || 0 },
    { enabled: !!dealerInfo && !!activePeriod }
  );

  const handleLogout = () => {
    localStorage.removeItem("dealerToken");
    localStorage.removeItem("dealerInfo");
    toast.success("已退出登录");
    setLocation("/dealer/login");
  };

  const handleChangePassword = () => {
    setLocation("/dealer/change-password");
  };

  if (!dealerInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">加载中...</p>
        </div>
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
              <p className="text-sm font-medium">{dealerInfo.name}</p>
              <p className="text-xs text-muted-foreground">{dealerInfo.code}</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleChangePassword}>
              <Settings className="w-4 h-4 mr-2" />
              修改密码
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              退出
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
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
      </main>
    </div>
  );
}
