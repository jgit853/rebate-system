import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Users, Package, FileText, AlertTriangle } from "lucide-react";
import { formatMoney, formatRate } from "@/lib/format";

export default function Dashboard() {
  const { data: dealers } = trpc.dealers.list.useQuery();
  const { data: products } = trpc.products.list.useQuery();
  const { data: activePeriod } = trpc.periods.getActive.useQuery();
  const { data: settlements } = trpc.settlements.list.useQuery(
    { periodId: activePeriod?.id },
    { enabled: !!activePeriod }
  );

  const coreDealers = dealers?.filter((d) => d.type === "core") || [];
  const overLimitCount = settlements?.filter((s) => s.benefitRatio > 1800).length || 0;

  const stats = [
    {
      title: "核心经销商",
      value: coreDealers.length,
      icon: <Users className="w-8 h-8 text-blue-500" />,
      description: `共 ${dealers?.length || 0} 个经销商`,
    },
    {
      title: "产品种类",
      value: products?.length || 0,
      icon: <Package className="w-8 h-8 text-green-500" />,
      description: "在售产品",
    },
    {
      title: "本期结算单",
      value: settlements?.length || 0,
      icon: <FileText className="w-8 h-8 text-purple-500" />,
      description: activePeriod?.name || "暂无活跃周期",
    },
    {
      title: "超限预警",
      value: overLimitCount,
      icon: <AlertTriangle className="w-8 h-8 text-red-500" />,
      description: "超过18%红线",
    },
  ];

  const topSettlements = settlements
    ?.sort((a, b) => b.benefitRatio - a.benefitRatio)
    .slice(0, 5);

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">系统概览</h1>
          <p className="text-muted-foreground mt-1">经销商返利对账系统数据总览</p>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                {stat.icon}
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 综合让利排行 */}
        {topSettlements && topSettlements.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>综合让利排行 TOP 5</CardTitle>
              <CardDescription>
                当前周期让利比例最高的经销商(红线:18%)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topSettlements.map((settlement, index) => {
                  const dealer = dealers?.find((d) => d.id === settlement.dealerId);
                  const isOverLimit = settlement.benefitRatio > 1800;

                  return (
                    <div
                      key={settlement.id}
                      className="flex items-center justify-between p-4 rounded-lg border"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                            index === 0
                              ? "bg-yellow-500 text-white"
                              : index === 1
                              ? "bg-gray-400 text-white"
                              : index === 2
                              ? "bg-orange-600 text-white"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{dealer?.name || "未知经销商"}</p>
                          <p className="text-sm text-muted-foreground">
                            回款: ¥{formatMoney(settlement.totalPaymentAmount)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className={`text-lg font-bold ${
                            isOverLimit ? "text-red-500" : "text-green-600"
                          }`}
                        >
                          {formatRate(settlement.benefitRatio)}
                        </p>
                        {isOverLimit && (
                          <p className="text-xs text-red-500 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            超限
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
