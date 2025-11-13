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
import { Package, Plus, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Products() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: products, refetch } = trpc.products.list.useQuery();
  const createMutation = trpc.products.create.useMutation();

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

  const handleCreate = async () => {
    if (!formData.sku || !formData.name || !formData.spec || !formData.baseUnit || !formData.wholesalePrice) {
      toast.error("请填写所有必填字段");
      return;
    }

    try {
      await createMutation.mutateAsync({
        sku: formData.sku,
        name: formData.name,
        spec: formData.spec,
        baseUnit: parseInt(formData.baseUnit),
        wholesalePrice: parseInt(formData.wholesalePrice),
      });
      toast.success("产品创建成功");
      setDialogOpen(false);
      setFormData({
        sku: "",
        name: "",
        spec: "",
        baseUnit: "",
        wholesalePrice: "",
      });
      refetch();
    } catch (error) {
      toast.error("创建失败: " + (error as Error).message);
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
          <Button onClick={() => setDialogOpen(true)}>
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
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
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
              <DialogTitle>新建产品</DialogTitle>
              <DialogDescription>添加新的产品信息到系统</DialogDescription>
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
