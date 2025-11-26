import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { formatMoney, formatRate, formatDate } from "@/lib/format";
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  Gift,
  Calendar,
  Award,
  Sparkles,
  AlertTriangle
} from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

export default function DealerStatement() {
  const [, setLocation] = useLocation();
  const [dealerInfo, setDealerInfo] = useState<{ id: number; name: string } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("dealerToken");
    const storedInfo = localStorage.getItem("dealerInfo");
    
    if (!token || !storedInfo) {
      setLocation("/dealer/login");
      return;
    }

    try {
      setDealerInfo(JSON.parse(storedInfo));
    } catch (error) {
      console.error("经销商信息解析失败:", error);
      setLocation("/dealer/login");
    }
  }, [setLocation]);

  const { data: activePeriod, isLoading: isPeriodLoading } = trpc.dealerApi.getActivePeriod.useQuery();
  const { data: settlement } = trpc.dealerApi.getMySettlement.useQuery(
    {
      dealerId: dealerInfo?.id || 0,
      periodId: activePeriod?.id || 0,
    },
    { enabled: !!dealerInfo && !!activePeriod }
  );

  // 暂时不显示下级佣金,因为API尚未实现
  const subCommissions: any[] = [];

  const { data: marketFunds } = trpc.dealerApi.getMyMarketFunds.useQuery(
    { dealerId: dealerInfo?.id || 0, periodId: activePeriod?.id || 0 },
    { enabled: !!dealerInfo && !!activePeriod }
  );

  // 正在加载经销商信息或周期数据
  if (!dealerInfo || isPeriodLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  // 没有活跃周期
  if (!activePeriod) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
        <div className="container max-w-4xl mx-auto">
          <Card className="border-2 border-blue-200 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
              <CardTitle className="text-2xl font-bold flex items-center gap-2">
                <Calendar className="h-6 w-6" />
                当前结算周期
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="text-center py-8">
                <AlertTriangle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
                <p className="text-gray-600 text-lg">暂无活跃周期</p>
                <p className="text-gray-500 mt-2">当前没有进行中的结算周期，请联系管理员创建。</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // 有周期但没有结算数据
  if (!settlement) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
        <div className="container max-w-4xl mx-auto">
          <Card className="border-2 border-blue-200 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
              <CardTitle className="text-2xl">欢迎,{dealerInfo.name}</CardTitle>
              <CardDescription className="text-blue-100">
                当前结算周期: {activePeriod.name}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8 text-center">
              <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">本周期暂无结算数据</p>
              <p className="text-gray-500 mt-2">请联系管理员生成结算单</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const totalSubCommission = subCommissions?.reduce((sum: number, c: any) => sum + c.commissionAmount, 0) || 0;
  const marketFundBalance = marketFunds?.reduce((sum: number, f: any) => sum + (f.type === "accrual" ? f.amount : -f.amount), 0) || 0;

  const benefitCards = [
    {
      title: "阶梯返利",
      amount: settlement.rebateAmount,
      icon: <TrendingUp className="w-8 h-8" />,
      color: "from-green-500 to-emerald-500",
      description: `${formatRate(settlement.adjustedRebateRate)} 返利比例`,
    },
    {
      title: "下级客户佣金",
      amount: totalSubCommission,
      icon: <Users className="w-8 h-8" />,
      color: "from-blue-500 to-cyan-500",
      description: `${subCommissions?.length || 0} 个下级客户`,
    },
    {
      title: "市场支持基金",
      amount: marketFundBalance,
      icon: <Gift className="w-8 h-8" />,
      color: "from-purple-500 to-pink-500",
      description: "可用余额",
    },
    {
      title: "总收益",
      amount: settlement.rebateAmount + totalSubCommission,
      icon: <Award className="w-8 h-8" />,
      color: "from-orange-500 to-red-500",
      description: "本期合计",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="container max-w-6xl mx-auto space-y-6">
        {/* 头部欢迎卡片 */}
        <Card className="border-2 border-blue-200 shadow-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-3xl font-bold flex items-center gap-2">
                  <Sparkles className="w-8 h-8" />
                  {dealerInfo.name} 的收益报告
                </CardTitle>
                <CardDescription className="text-blue-100 text-lg mt-2">
                  {activePeriod.name} ({formatDate(activePeriod.startDate)} - {formatDate(activePeriod.endDate)})
                </CardDescription>
              </div>
              <div className="text-right">
                <div className="text-sm text-blue-200">结算状态</div>
                <div className="text-2xl font-bold">
                  {settlement.status === "approved" ? "✓ 已审批" : settlement.status === "paid" ? "✓ 已支付" : "处理中"}
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* 收益卡片网格 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {benefitCards.map((card, index) => (
            <Card key={index} className="border-2 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className={`bg-gradient-to-r ${card.color} text-white rounded-t-lg`}>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{card.title}</CardTitle>
                  {card.icon}
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="text-3xl font-bold text-gray-800 mb-2">
                  {formatMoney(card.amount)}
                </div>
                <div className="text-sm text-gray-600">{card.description}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 阶梯返利明细 */}
        <Card className="border-2 border-green-200 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
            <CardTitle className="text-xl flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-green-600" />
              阶梯返利明细
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">年度回款</div>
                <div className="text-2xl font-bold text-blue-600">{formatMoney(settlement.totalPaymentAmount)}</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">年度基数</div>
                <div className="text-2xl font-bold text-purple-600">{(settlement.totalBaseUnit / 100).toFixed(2)}</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">基础返利比例</div>
                <div className="text-2xl font-bold text-green-600">{formatRate(settlement.baseRebateRate)}</div>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">最终返利比例</div>
                <div className="text-2xl font-bold text-orange-600">{formatRate(settlement.adjustedRebateRate)}</div>
              </div>
            </div>
            
            {settlement.overdueRatio > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 text-yellow-800">
                  <span className="font-semibold">超期比例:</span>
                  <span>{formatRate(settlement.overdueRatio)}</span>
                  <span className="text-sm">({formatMoney(settlement.overdueAmount)} 超期款项)</span>
                </div>
              </div>
            )}

            <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg p-6 text-center">
              <div className="text-lg mb-2">本期返利收益</div>
              <div className="text-4xl font-bold">{formatMoney(settlement.rebateAmount)}</div>
            </div>
          </CardContent>
        </Card>

        {/* 下级客户佣金明细 */}
        {subCommissions && subCommissions.length > 0 && (
          <Card className="border-2 border-blue-200 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50">
              <CardTitle className="text-xl flex items-center gap-2">
                <Users className="w-6 h-6 text-blue-600" />
                下级客户佣金明细
              </CardTitle>
              <CardDescription>
                共 {subCommissions.length} 个下级客户,累计佣金 {formatMoney(totalSubCommission)}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                {subCommissions.map((comm: any) => (
                  <div key={comm.id} className="flex items-center justify-between bg-gray-50 p-4 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-800">下级客户 #{comm.subDealerId}</div>
                        <div className="text-sm text-gray-600">
                          {comm.isFirstYear ? "首年开发奖励" : "续期管理佣金"} - {formatRate(comm.commissionRate)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-blue-600">{formatMoney(comm.commissionAmount)}</div>
                      <div className="text-sm text-gray-500">基于 {formatMoney(comm.subPayment)} 回款</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 市场支持基金 */}
        {marketFunds && marketFunds.length > 0 && (
          <Card className="border-2 border-purple-200 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
              <CardTitle className="text-xl flex items-center gap-2">
                <Gift className="w-6 h-6 text-purple-600" />
                市场支持基金
              </CardTitle>
              <CardDescription>
                当前余额: {formatMoney(marketFundBalance)}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-2">
                {marketFunds.map((fund: any) => (
                  <div key={fund.id} className="flex items-center justify-between p-3 border-b last:border-b-0">
                    <div>
                      <div className="font-medium">{fund.type === "accrual" ? "计提" : "使用"}</div>
                      <div className="text-sm text-gray-600">{formatDate(fund.date)}</div>
                      {fund.description && <div className="text-sm text-gray-500">{fund.description}</div>}
                    </div>
                    <div className={`text-lg font-bold ${fund.type === "accrual" ? "text-green-600" : "text-orange-600"}`}>
                      {fund.type === "accrual" ? "+" : "-"}{formatMoney(fund.amount)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
