import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { formatMoney } from "@/lib/format";
import { Calculator, TrendingUp, Lightbulb, Target } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function PurchaseCalculator() {
  const [currentPayment, setCurrentPayment] = useState("");
  const [maxBudget, setMaxBudget] = useState("");
  const [customAmounts, setCustomAmounts] = useState<string[]>(["", "", ""]);

  const [showResults, setShowResults] = useState(false);

  // 生成方案对比
  const { data: plans, refetch: refetchPlans } = trpc.purchaseCalculator.generatePlans.useQuery(
    {
      currentPayment: Math.round(parseFloat(currentPayment || "0") * 100),
      additionalAmounts: customAmounts
        .filter((a) => a && parseFloat(a) > 0)
        .map((a) => Math.round(parseFloat(a) * 100)),
    },
    { enabled: false }
  );

  // 找到最优方案
  const { data: optimalPlan, refetch: refetchOptimal } =
    trpc.purchaseCalculator.findOptimal.useQuery(
      {
        currentPayment: Math.round(parseFloat(currentPayment || "0") * 100),
        maxBudget: Math.round(parseFloat(maxBudget || "0") * 100),
      },
      { enabled: false }
    );

  const handleCalculate = async () => {
    if (!currentPayment || parseFloat(currentPayment) <= 0) {
      toast.error("请输入当前已回款金额");
      return;
    }

    const validCustomAmounts = customAmounts.filter((a) => a && parseFloat(a) > 0);
    if (validCustomAmounts.length === 0 && (!maxBudget || parseFloat(maxBudget) <= 0)) {
      toast.error("请输入追加进货金额或最大预算");
      return;
    }

    setShowResults(true);

    // 如果有自定义金额,生成对比方案
    if (validCustomAmounts.length > 0) {
      await refetchPlans();
    }

    // 如果有最大预算,找到最优方案
    if (maxBudget && parseFloat(maxBudget) > 0) {
      await refetchOptimal();
    }

    toast.success("核算完成");
  };

  const handleReset = () => {
    setCurrentPayment("");
    setMaxBudget("");
    setCustomAmounts(["", "", ""]);
    setShowResults(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* 页头 */}
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
            <Calculator className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              进货核算推演
            </h1>
            <p className="text-muted-foreground mt-1">
              智能计算最优进货方案,帮助您获得最大返利收益
            </p>
          </div>
        </div>

        {/* 输入表单 */}
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-600" />
              输入参数
            </CardTitle>
            <CardDescription>填写当前回款和计划追加的进货金额</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="currentPayment" className="text-base font-semibold">
                  当前已回款金额 (元) *
                </Label>
                <Input
                  id="currentPayment"
                  type="number"
                  placeholder="例如: 450000"
                  value={currentPayment}
                  onChange={(e) => setCurrentPayment(e.target.value)}
                  className="mt-2 text-lg"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  本年度已累计回款金额
                </p>
              </div>

              <div>
                <Label htmlFor="maxBudget" className="text-base font-semibold">
                  最大追加预算 (元)
                </Label>
                <Input
                  id="maxBudget"
                  type="number"
                  placeholder="例如: 300000"
                  value={maxBudget}
                  onChange={(e) => setMaxBudget(e.target.value)}
                  className="mt-2 text-lg"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  系统将自动计算最优进货方案
                </p>
              </div>
            </div>

            <div className="border-t pt-6">
              <Label className="text-base font-semibold mb-3 block">
                自定义进货金额对比 (元)
              </Label>
              <div className="grid md:grid-cols-3 gap-4">
                {customAmounts.map((amount, index) => (
                  <Input
                    key={index}
                    type="number"
                    placeholder={`方案${index + 1}`}
                    value={amount}
                    onChange={(e) => {
                      const newAmounts = [...customAmounts];
                      newAmounts[index] = e.target.value;
                      setCustomAmounts(newAmounts);
                    }}
                    className="text-lg"
                  />
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                填写您想对比的追加进货金额,最多3个方案
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button onClick={handleCalculate} size="lg" className="flex-1">
                <Calculator className="w-4 h-4 mr-2" />
                开始核算
              </Button>
              <Button onClick={handleReset} variant="outline" size="lg">
                重置
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 最优方案推荐 */}
        {showResults && optimalPlan && (
          <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700">
                <Lightbulb className="w-6 h-6" />
                最优方案推荐
              </CardTitle>
              <CardDescription>在您的预算范围内,这是收益率最高的进货方案</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-4 gap-6">
                <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                  <p className="text-sm text-muted-foreground mb-1">目标进货金额</p>
                  <p className="text-2xl font-bold text-green-600">
                    ¥{formatMoney(optimalPlan.targetAmount)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{optimalPlan.tierName}</p>
                </div>

                <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                  <p className="text-sm text-muted-foreground mb-1">阶梯返利</p>
                  <p className="text-2xl font-bold text-blue-600">
                    ¥{formatMoney(optimalPlan.rebateAmount)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {(optimalPlan.rebateRate * 100).toFixed(2)}%
                  </p>
                </div>

                <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                  <p className="text-sm text-muted-foreground mb-1">市场基金</p>
                  <p className="text-2xl font-bold text-purple-600">
                    ¥{formatMoney(optimalPlan.marketFund)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">3%计提</p>
                </div>

                <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                  <p className="text-sm text-muted-foreground mb-1">总收益</p>
                  <p className="text-2xl font-bold text-green-600">
                    ¥{formatMoney(optimalPlan.totalBenefit)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    综合收益率 {(optimalPlan.benefitRate * 100).toFixed(2)}%
                  </p>
                </div>
              </div>

              {optimalPlan.recommendation && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm font-medium text-yellow-800 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    {optimalPlan.recommendation}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 方案对比表格 */}
        {showResults && plans && plans.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>方案对比</CardTitle>
              <CardDescription>不同进货金额下的收益明细对比</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>目标金额</TableHead>
                      <TableHead>所在阶梯</TableHead>
                      <TableHead>阶梯返利</TableHead>
                      <TableHead>返利率</TableHead>
                      <TableHead>市场基金</TableHead>
                      <TableHead>总收益</TableHead>
                      <TableHead>综合收益率</TableHead>
                      <TableHead>净成本</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plans.map((plan, index) => (
                      <TableRow key={index} className={plan.recommendation ? "bg-green-50" : ""}>
                        <TableCell className="font-medium">
                          ¥{formatMoney(plan.targetAmount)}
                        </TableCell>
                        <TableCell>{plan.tierName}</TableCell>
                        <TableCell className="text-blue-600 font-semibold">
                          ¥{formatMoney(plan.rebateAmount)}
                        </TableCell>
                        <TableCell>{(plan.rebateRate * 100).toFixed(2)}%</TableCell>
                        <TableCell className="text-purple-600">
                          ¥{formatMoney(plan.marketFund)}
                        </TableCell>
                        <TableCell className="text-green-600 font-semibold">
                          ¥{formatMoney(plan.totalBenefit)}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {(plan.benefitRate * 100).toFixed(2)}%
                        </TableCell>
                        <TableCell>¥{formatMoney(plan.netCost)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 说明卡片 */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-900">使用说明</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-blue-800">
            <p>
              <strong>1. 阶梯返利规则:</strong> 0-50万(5%), 50-100万(8%), 100-200万(12%),
              200万以上(15%)
            </p>
            <p>
              <strong>2. 市场基金:</strong> 按回款金额的3%计提,可用于市场推广活动
            </p>
            <p>
              <strong>3. 综合收益率:</strong> (阶梯返利 + 市场基金) / 目标进货金额
            </p>
            <p>
              <strong>4. 建议:</strong>{" "}
              优先考虑能够升档的进货金额,返利率提升明显,综合收益更高
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
