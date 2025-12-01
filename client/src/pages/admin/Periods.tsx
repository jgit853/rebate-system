import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Calendar, Plus, CheckCircle, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Periods() {
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: periods, refetch } = trpc.periods.list.useQuery();
  const createMutation = trpc.periods.create.useMutation();
  const setActiveMutation = trpc.periods.setActive.useMutation();
  const setInactiveMutation = trpc.periods.setInactive.useMutation();

  const [formData, setFormData] = useState({
    name: "",
    startDate: "",
    endDate: "",
    type: "annual" as "annual" | "quarterly" | "custom",
  });

  const handleCreate = async () => {
    if (!formData.name || !formData.startDate || !formData.endDate) {
      toast.error("请填写所有必填字段");
      return;
    }

    if (new Date(formData.startDate) >= new Date(formData.endDate)) {
      toast.error("结束日期必须晚于开始日期");
      return;
    }

    try {
      await createMutation.mutateAsync({
        name: formData.name,
        startDate: formData.startDate,
        endDate: formData.endDate,
        type: formData.type,
      });
      toast.success("结算周期创建成功");
      setDialogOpen(false);
      setFormData({
        name: "",
        startDate: "",
        endDate: "",
        type: "annual",
      });
      refetch();
    } catch (error) {
      toast.error("创建失败: " + (error as Error).message);
    }
  };

  const handleToggleActive = async (id: number, currentStatus: boolean) => {
    try {
      if (currentStatus) {
        // 当前是激活状态,点击停用
        await setInactiveMutation.mutateAsync({ id });
        toast.success("周期已停用");
      } else {
        // 当前是停用状态,点击激活
        await setActiveMutation.mutateAsync({ id });
        toast.success("周期已激活");
      }
      refetch();
    } catch (error) {
      toast.error("操作失败: " + (error as Error).message);
    }
  };

  const getTypeBadge = (type: string) => {
    const labels = {
      annual: "年度",
      quarterly: "季度",
      custom: "自定义",
    };
    return labels[type as keyof typeof labels] || type;
  };

  const stats = {
    total: periods?.length || 0,
    active: periods?.filter((p: any) => p.isActive).length || 0,
    annual: periods?.filter((p: any) => p.type === "annual").length || 0,
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">结算周期管理</h1>
            <p className="text-muted-foreground mt-1">管理年度和季度结算周期</p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            新建周期
          </Button>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                周期总数
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                激活中
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{stats.active}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                年度周期
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.annual}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>周期列表</CardTitle>
            <CardDescription>查看和管理所有结算周期</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>周期名称</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead>开始日期</TableHead>
                    <TableHead>结束日期</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {periods && periods.length > 0 ? (
                    periods.map((period: any) => (
                      <TableRow key={period.id}>
                        <TableCell className="font-medium">{period.name}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {getTypeBadge(period.type)}
                          </span>
                        </TableCell>
                        <TableCell>{new Date(period.startDate).toLocaleDateString('zh-CN')}</TableCell>
                        <TableCell>{new Date(period.endDate).toLocaleDateString('zh-CN')}</TableCell>
                        <TableCell>
                          {period.isActive ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              激活中
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              <XCircle className="w-3 h-3 mr-1" />
                              已停用
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleActive(period.id, period.isActive)}
                          >
                            {period.isActive ? "停用" : "激活"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        暂无结算周期
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* 创建周期对话框 */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>新建结算周期</DialogTitle>
              <DialogDescription>添加新的结算周期到系统</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">周期名称 *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="如: 2024年度"
                />
              </div>
              <div>
                <Label htmlFor="type">周期类型</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: any) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="annual">年度</SelectItem>
                    <SelectItem value="quarterly">季度</SelectItem>
                    <SelectItem value="custom">自定义</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="startDate">开始日期 *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="endDate">结束日期 *</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending ? "创建中..." : "创建"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
