import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { Plus, Search, Edit, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";
import { formatDate } from "@/lib/format";

export default function Dealers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDealer, setEditingDealer] = useState<any>(null);

  const { data: dealers, refetch } = trpc.dealers.list.useQuery();
  const createMutation = trpc.dealers.create.useMutation();
  const updateMutation = trpc.dealers.update.useMutation();
  const deleteMutation = trpc.dealers.delete.useMutation();

  const [formData, setFormData] = useState({
    code: "",
    name: "",
    type: "core" as "core" | "sub_dealer" | "terminal",
    parentDealerId: undefined as number | undefined,
    username: "",
  });

  const filteredDealers = dealers?.filter((dealer) => {
    const matchesSearch =
      dealer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dealer.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || dealer.type === filterType;
    return matchesSearch && matchesType;
  });

  const handleOpenDialog = (dealer?: any) => {
    if (dealer) {
      setEditingDealer(dealer);
      setFormData({
        code: dealer.code,
        name: dealer.name,
        type: dealer.type,
        parentDealerId: dealer.parentDealerId,
        username: dealer.username || "",
      });
    } else {
      setEditingDealer(null);
      setFormData({
        code: "",
        name: "",
        type: "core",
        parentDealerId: undefined,
        username: "",
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      if (editingDealer) {
        await updateMutation.mutateAsync({
          id: editingDealer.id,
          ...formData,
        });
        toast.success("经销商更新成功");
      } else {
        await createMutation.mutateAsync(formData);
        toast.success("经销商创建成功");
      }
      setDialogOpen(false);
      setEditingDealer(null);
      setFormData({
        code: "",
        name: "",
        type: "core",
        parentDealerId: undefined,
        username: "",
      });
      refetch();
    } catch (error) {
      toast.error("操作失败: " + (error as Error).message);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`确定要删除经销商「${name}」吗?此操作不可恢复。`)) {
      return;
    }

    try {
      await deleteMutation.mutateAsync({ id });
      toast.success("经销商已删除");
      refetch();
    } catch (error) {
      toast.error("删除失败: " + (error as Error).message);
    }
  };

  const typeLabels = {
    core: "核心经销商",
    sub_dealer: "下级经销商",
    terminal: "终端客户",
  };

  const statusLabels = {
    active: "活跃",
    inactive: "停用",
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">经销商管理</h1>
            <p className="text-muted-foreground mt-1">管理所有经销商信息</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                新增经销商
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingDealer ? "编辑经销商" : "新增经销商"}</DialogTitle>
                <DialogDescription>
                  {editingDealer ? "修改经销商信息" : "填写经销商基本信息"}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="code">经销商编码</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value })
                    }
                    placeholder="如: D001"
                  />
                </div>
                <div>
                  <Label htmlFor="name">经销商名称</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="如: 张三经销商"
                  />
                </div>
                <div>
                  <Label htmlFor="type">类型</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: any) =>
                      setFormData({ ...formData, type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="core">核心绋销商</SelectItem>
                      <SelectItem value="sub_dealer">下级绋销商</SelectItem>
                      <SelectItem value="terminal">终端客户</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="username">登录用户名(可选)</Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) =>
                      setFormData({ ...formData, username: e.target.value })
                    }
                    placeholder="如: dealer001"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    设置后经销商可使用此用户名登录
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  取消
                </Button>
                <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                  {(createMutation.isPending || updateMutation.isPending) ? "处理中..." : (editingDealer ? "确认更新" : "确认创建")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>经销商列表</CardTitle>
            <CardDescription>查看和管理所有经销商</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="搜索经销商名称或编码..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部类型</SelectItem>
                  <SelectItem value="core">核心经销商</SelectItem>
                  <SelectItem value="sub_dealer">下级经销商</SelectItem>
                  <SelectItem value="terminal">终端客户</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>编码</TableHead>
                    <TableHead>名称</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>创建时间</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDealers && filteredDealers.length > 0 ? (
                    filteredDealers.map((dealer) => (
                      <TableRow key={dealer.id}>
                        <TableCell className="font-mono">{dealer.code}</TableCell>
                        <TableCell className="font-medium">{dealer.name}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {typeLabels[dealer.type]}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              dealer.status === "active"
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {statusLabels[dealer.status]}
                          </span>
                        </TableCell>
                        <TableCell>{formatDate(dealer.createdAt)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Link href={`/admin/dealers/${dealer.id}`}>
                              <Button variant="ghost" size="sm">
                                查看详情
                              </Button>
                            </Link>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenDialog(dealer)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(dealer.id, dealer.name)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        暂无数据
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
