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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { formatMoney, formatBaseUnit } from "@/lib/format";
import { Package, Plus, Search, Edit, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Products() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);

  const { data: products, refetch } = trpc.products.list.useQuery();
  const createMutation = trpc.products.create.useMutation();
  const updateMutation = trpc.products.update.useMutation();
  const deleteMutation = trpc.products.delete.useMutation();

  const [formData, setFormData] = useState({
    sku: "",
    name: "",
    spec: "",
    baseUnit: "",
    wholesalePrice: "",
  });

  const filteredProducts = products?.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.spec.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const handleOpenDialog = (product?: any) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        sku: product.sku,
        name: product.name,
        spec: product.spec,
        baseUnit: product.baseUnit.toString(),
        wholesalePrice: product.wholesalePrice.toString(),
      });
    } else {
      setEditingProduct(null);
      setFormData({
        sku: "",
        name: "",
        spec: "",
        baseUnit: "",
        wholesalePrice: "",
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.sku || !formData.name || !formData.spec || !formData.baseUnit || !formData.wholesalePrice) {
      toast.error("请填写所有必填字段");
      return;
    }

    try {
      if (editingProduct) {
        await updateMutation.mutateAsync({
          id: editingProduct.id,
          sku: formData.sku,
          name: formData.name,
          spec: formData.spec,
          baseUnit: parseInt(formData.baseUnit),
          wholesalePrice: parseInt(formData.wholesalePrice),
        });
        toast.success("产品更新成功");
      } else {
        await createMutation.mutateAsync({
          sku: formData.sku,
          name: formData.name,
          spec: formData.spec,
          baseUnit: parseInt(formData.baseUnit),
          wholesalePrice: parseInt(formData.wholesalePrice),
        });
        toast.success("产品创建成功");
      }
      setDialogOpen(false);
      setEditingProduct(null);
      setFormData({
        sku: "",
        name: "",
        spec: "",
        baseUnit: "",
        wholesalePrice: "",
      });
      refetch();
    } catch (error) {
      toast.error("操作失败: " + (error as Error).message);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`确定要删除产品「${name}」吗?此操作不可恢复。`)) {
      return;
    }

    try {
      await deleteMutation.mutateAsync({ id });
      toast.success("产品已删除");
      refetch();
    } catch (error) {
      toast.error("删除失败: " + (error as Error).message);
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">产品管理</h1>
            <p className="text-muted-foreground mt-1">管理系统中的所有产品信息</p>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="w-4 h-4 mr-2" />
            新建产品
          </Button>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                产品总数
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{products?.length || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                产品类别
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {new Set(products?.map((p) => p.spec).filter(Boolean)).size}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                平均单价
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                ¥
                {products && products.length > 0
                  ? formatMoney(
                      products.reduce((sum, p) => sum + p.wholesalePrice, 0) / products.length
                    )
                  : "0"}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>产品列表</CardTitle>
                <CardDescription>查看和管理所有产品</CardDescription>
              </div>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="搜索产品..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>产品名称</TableHead>
                  <TableHead>规格</TableHead>
                  <TableHead>基数单位</TableHead>
                  <TableHead>批发价</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts && filteredProducts.length > 0 ? (
                    filteredProducts.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">{product.sku}</TableCell>
                        <TableCell>{product.name}</TableCell>
                        <TableCell>{product.spec}</TableCell>
                        <TableCell>{formatBaseUnit(product.baseUnit)}</TableCell>
                        <TableCell>¥{formatMoney(product.wholesalePrice)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenDialog(product)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(product.id, product.name)}
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
                        {searchTerm ? "未找到匹配的产品" : "暂无产品"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* 创建产品对话框 */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingProduct ? "编辑产品" : "新建产品"}</DialogTitle>
              <DialogDescription>
                {editingProduct ? "修改产品信息" : "添加新的产品信息到系统"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="sku">SKU *</Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  placeholder="如: SKU001"
                />
              </div>
              <div>
                <Label htmlFor="name">产品名称 *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="如: 产品A"
                />
              </div>
              <div>
                <Label htmlFor="spec">规格 *</Label>
                <Input
                  id="spec"
                  value={formData.spec}
                  onChange={(e) => setFormData({ ...formData, spec: e.target.value })}
                  placeholder="如: 500ml"
                />
              </div>
              <div>
                <Label htmlFor="baseUnit">基数单位 *</Label>
                <Input
                  id="baseUnit"
                  type="number"
                  value={formData.baseUnit}
                  onChange={(e) => setFormData({ ...formData, baseUnit: e.target.value })}
                  placeholder="如: 10000"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  用于计算返利的基数单位(整数)
                </p>
              </div>
              <div>
                <Label htmlFor="wholesalePrice">批发价(分) *</Label>
                <Input
                  id="wholesalePrice"
                  type="number"
                  value={formData.wholesalePrice}
                  onChange={(e) => setFormData({ ...formData, wholesalePrice: e.target.value })}
                  placeholder="如: 100000 (表示1000元)"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  以分为单位,100分=1元
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                {(createMutation.isPending || updateMutation.isPending) ? "处理中..." : (editingProduct ? "更新" : "创建")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
