import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { formatMoney, formatRate, formatDate } from "@/lib/format";
import { AlertTriangle, CheckCircle, Clock, DollarSign } from "lucide-react";
import { toast } from "sonner";

export default function Settlements() {
  const [selectedPeriodId, setSelectedPeriodId] = useState<number | undefined>();

  const { data: periods } = trpc.periods.list.useQuery();
  const { data: settlements, refetch } = trpc.settlements.list.useQuery(
    { periodId: selectedPeriodId || undefined },
    { enabled: true }
  );
  const { data: dealers } = trpc.dealers.list.useQuery();

  const updateStatusMutation = trpc.settlements.updateStatus.useMutation();

  const handleStatusChange = async (id: number, status: "draft" | "pending_approval" | "approved" | "paid") => {
    try {
      await updateStatusMutation.mutateAsync({ id, status });
      toast.success("状态更新成功");
      refetch();
    } catch (error) {
      toast.error("状态更新失败: " + (error as Error).message);
    }
  };

  const statusLabels = {
    draft: "草稿",
    pending_approval: "待审批",
    approved: "已审批",
    paid: "已支付",
  };

  const statusIcons = {
    draft: <Clock className="w-4 h-4" />,
    pending_approval: <AlertTriangle className="w-4 h-4" />,
    approved: <CheckCircle className="w-4 h-4" />,
    paid: <DollarSign className="w-4 h-4" />,
  };

  const statusColors = {
    draft: "bg-gray-100 text-gray-800",
    pending_approval: "bg-yellow-100 text-yellow-800",
    approved: "bg-green-100 text-green-800",
    paid: "bg-blue-100 text-blue-800",
  };

  const overLimitCount = settlements?.filter((s) => s.benefitRatio > 1800).length || 0;
  const totalBenefit = settlements?.reduce((sum, s) => sum + s.totalBenefitAmount, 0) || 0;

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">结算管理</h1>
          <p className="text-muted-foreground mt-1">管理所有结算单和审批流程</p>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                结算单总数
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{settlements?.length || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                总让利金额
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                ¥{formatMoney(totalBenefit)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                超限预警
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-500">{overLimitCount}</div>
              <p className="text-xs text-muted-foreground mt-1">超过18%红线</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>结算单列表</CardTitle>
                <CardDescription>查看和管理所有结算单</CardDescription>
              </div>
              <Select
                value={selectedPeriodId?.toString() || "all"}
                onValueChange={(value) =>
                  setSelectedPeriodId(value === "all" ? undefined : parseInt(value))
                }
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="选择周期" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部周期</SelectItem>
                  {periods?.map((period) => (
                    <SelectItem key={period.id} value={period.id.toString()}>
                      {period.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>经销商</TableHead>
                    <TableHead>回款金额</TableHead>
                    <TableHead>返利金额</TableHead>
                    <TableHead>总让利</TableHead>
                    <TableHead>让利比例</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {settlements && settlements.length > 0 ? (
                    settlements.map((settlement) => {
                      const dealer = dealers?.find((d) => d.id === settlement.dealerId);
                      const isOverLimit = settlement.benefitRatio > 1800;

                      return (
                        <TableRow key={settlement.id}>
                          <TableCell className="font-medium">
                            {dealer?.name || "未知"}
                          </TableCell>
                          <TableCell>¥{formatMoney(settlement.totalPaymentAmount)}</TableCell>
                          <TableCell className="text-green-600">
                            ¥{formatMoney(settlement.rebateAmount)}
                          </TableCell>
                          <TableCell className="font-medium">
                            ¥{formatMoney(settlement.totalBenefitAmount)}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`font-bold ${
                                isOverLimit ? "text-red-500" : "text-purple-600"
                              }`}
                            >
                              {formatRate(settlement.benefitRatio)}
                              {isOverLimit && (
                                <AlertTriangle className="inline w-4 h-4 ml-1" />
                              )}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                statusColors[settlement.status]
                              }`}
                            >
                              {statusIcons[settlement.status]}
                              {statusLabels[settlement.status]}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={settlement.status}
                              onValueChange={(value: any) =>
                                handleStatusChange(settlement.id, value)
                              }
                              disabled={updateStatusMutation.isPending}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="draft">草稿</SelectItem>
                                <SelectItem value="pending_approval">待审批</SelectItem>
                                <SelectItem value="approved">已审批</SelectItem>
                                <SelectItem value="paid">已支付</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        暂无结算单
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
