import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { History, ArrowLeft, Trash2, Eye } from "lucide-react";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function CalculationHistory() {
  const [, setLocation] = useLocation();
  const [dealerInfo, setDealerInfo] = useState<{ id: number; code: string; name: string } | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  useEffect(() => {
    const storedInfo = localStorage.getItem("dealerInfo");
    if (storedInfo) {
      setDealerInfo(JSON.parse(storedInfo));
    } else {
      setLocation("/dealer/login");
    }
  }, [setLocation]);

  // 获取历史记录列表
  const { data: historyList, refetch } = trpc.dealerApi.getCalculationHistory.useQuery(
    { dealerId: dealerInfo?.id || 0 },
    { enabled: !!dealerInfo }
  );

  // 删除历史记录
  const deleteMutation = trpc.dealerApi.deleteCalculationHistory.useMutation({
    onSuccess: () => {
      toast.success("删除成功");
      refetch();
      setDeleteId(null);
    },
    onError: () => {
      toast.error("删除失败");
    },
  });

  const handleDelete = (id: number) => {
    if (!dealerInfo) return;
    deleteMutation.mutate({ id, dealerId: dealerInfo.id });
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 页头 */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLocation("/dealer/dashboard")}
            className="p-2 hover:bg-white/80 rounded-lg transition-colors"
            title="返回仪表盘"
          >
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
            <History className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">历史核算记录</h1>
            <p className="text-gray-600">查看和管理您的进货核算历史</p>
          </div>
        </div>

        {/* 历史记录列表 */}
        <Card>
          <CardHeader>
            <CardTitle>核算记录</CardTitle>
            <CardDescription>
              {historyList && historyList.length > 0
                ? `共 ${historyList.length} 条记录`
                : "暂无历史记录"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!historyList || historyList.length === 0 ? (
              <div className="text-center py-12">
                <History className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg mb-2">暂无历史记录</p>
                <p className="text-gray-400 text-sm mb-6">
                  使用进货核算工具后,记录将自动保存在这里
                </p>
                <Button onClick={() => setLocation("/dealer/calculator")}>
                  开始核算
                </Button>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>核算时间</TableHead>
                      <TableHead>当前回款</TableHead>
                      <TableHead>追加预算</TableHead>
                      <TableHead>最优目标金额</TableHead>
                      <TableHead>预计总收益</TableHead>
                      <TableHead>所在阶梯</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historyList.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">
                          {formatDate(record.createdAt)}
                        </TableCell>
                        <TableCell>¥{formatMoney(record.currentPayment)}</TableCell>
                        <TableCell>
                          {record.maxBudget ? `¥${formatMoney(record.maxBudget)}` : "-"}
                        </TableCell>
                        <TableCell>
                          {record.optimalTargetAmount && record.optimalTargetAmount > 0
                            ? `¥${formatMoney(record.optimalTargetAmount)}`
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {record.optimalTotalBenefit && record.optimalTotalBenefit > 0
                            ? `¥${formatMoney(record.optimalTotalBenefit)}`
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                            {record.optimalTierName || "-"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setLocation(`/dealer/calculator`)}
                              title="查看详情"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteId(record.id)}
                              title="删除记录"
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除这条历史记录吗?此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              className="bg-red-500 hover:bg-red-600"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
