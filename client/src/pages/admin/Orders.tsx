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
import { formatMoney } from "@/lib/format";
import { FileText, Plus, Search, Filter, Edit, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type OrderItem = {
  productId: number;
  quantity: number;
  price: number;
};

type FormData = {
  orderNumber: string;
  dealerId: string;
  orderDate: string;
  type: "normal" | "gift" | "special";
  dueDate: string;
  items: OrderItem[];
};

export default function Orders() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const { data: allOrders, refetch } = trpc.orders.list.useQuery({});
  const orders = allOrders || [];
  const { data: dealers } = trpc.dealers.list.useQuery();
  const { data: products } = trpc.products.list.useQuery();
  const createMutation = trpc.orders.create.useMutation();
  const updateMutation = trpc.orders.update.useMutation();
  const deleteMutation = trpc.orders.delete.useMutation();

  const [formData, setFormData] = useState<FormData>({
    orderNumber: "",
    dealerId: "",
    orderDate: new Date().toISOString().split("T")[0],
    type: "normal",
    dueDate: "",
    items: [],
  });

  const [editFormData, setEditFormData] = useState<FormData>({
    orderNumber: "",
    dealerId: "",
    orderDate: "",
    type: "normal",
    dueDate: "",
    items: [],
  });

  const [currentItem, setCurrentItem] = useState({
    productId: "",
    quantity: "",
    price: "",
  });

  const filteredOrders = orders.filter((order: any) => {
    const dealer = dealers?.find((d) => d.id === order.dealerId);
    const matchesSearch = dealer?.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          order.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    const matchesType = typeFilter === "all" || order.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const handleAddItem = () => {
    if (!currentItem.productId || !currentItem.quantity || !currentItem.price) {
      toast.error("请填写完整的产品信息");
      return;
    }

    const newItem: OrderItem = {
      productId: parseInt(currentItem.productId),
      quantity: parseInt(currentItem.quantity),
      price: Math.round(parseFloat(currentItem.price) * 100), // 转换为分
    };

    setFormData({
      ...formData,
      items: [...formData.items, newItem],
    });

    setCurrentItem({ productId: "", quantity: "", price: "" });
    toast.success("产品已添加");
  };

  const handleRemoveItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    });
  };

  const handleCreate = async () => {
    if (!formData.dealerId || !formData.orderDate || !formData.dueDate) {
      toast.error("请填写所有必填字段");
      return;
    }

    if (formData.items.length === 0) {
      toast.error("请至少添加一个产品");
      return;
    }

    if (new Date(formData.orderDate) >= new Date(formData.dueDate)) {
      toast.error("到期日期必须晚于订单日期");
      return;
    }

    try {
      // 生成订单编号
      const orderNumber = `ORD-${Date.now()}`;
      
      await createMutation.mutateAsync({
        orderNumber,
        dealerId: parseInt(formData.dealerId),
        orderDate: formData.orderDate,
        dueDate: formData.dueDate,
        type: formData.type,
        items: formData.items,
      });

      toast.success("订单创建成功");
      setDialogOpen(false);
      setFormData({
        orderNumber: "",
        dealerId: "",
        orderDate: new Date().toISOString().split("T")[0],
        type: "normal",
        dueDate: "",
        items: [],
      });
      refetch();
    } catch (error) {
      toast.error("创建失败: " + (error as Error).message);
    }
  };

  const handleEdit = (order: any) => {
    setSelectedOrder(order);
    setEditFormData({
      orderNumber: order.orderNumber,
      dealerId: order.dealerId.toString(),
      orderDate: new Date(order.orderDate).toISOString().split("T")[0],
      type: order.type,
      dueDate: new Date(order.dueDate).toISOString().split("T")[0],
      items: [], // 需要从orderItems加载
    });
    setEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!selectedOrder) return;

    try {
      await updateMutation.mutateAsync({
        id: selectedOrder.id,
        dealerId: parseInt(editFormData.dealerId),
        orderDate: editFormData.orderDate,
        dueDate: editFormData.dueDate,
        type: editFormData.type,
      });

      toast.success("订单更新成功");
      setEditDialogOpen(false);
      setSelectedOrder(null);
      refetch();
    } catch (error) {
      toast.error("更新失败: " + (error as Error).message);
    }
  };

  const handleDelete = async () => {
    if (!selectedOrder) return;

    try {
      await deleteMutation.mutateAsync({ id: selectedOrder.id });
      toast.success("订单删除成功");
      setDeleteDialogOpen(false);
      setSelectedOrder(null);
      refetch();
    } catch (error) {
      toast.error("删除失败: " + (error as Error).message);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: "bg-yellow-100 text-yellow-800",
      paid: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
    };
    const labels = {
      pending: "待支付",
      paid: "已支付",
      cancelled: "已取消",
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  const getTypeBadge = (type: string) => {
    const labels = {
      normal: "正常订单",
      gift: "赠品订单",
      special: "特殊订单",
    };
    return labels[type as keyof typeof labels] || type;
  };

  const stats = {
    total: orders.length,
    pending: orders.filter((o: any) => o.status === "pending").length,
    paid: orders.filter((o: any) => o.status === "paid").length,
    totalAmount: orders.reduce((sum: number, o: any) => sum + o.totalAmount, 0),
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">订单管理</h1>
            <p className="text-muted-foreground mt-1">管理系统中的所有订单信息</p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            新建订单
          </Button>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                订单总数
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                待支付
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600">{stats.pending}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                已支付
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{stats.paid}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                订单总额
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">¥{formatMoney(stats.totalAmount)}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <CardTitle>订单列表</CardTitle>
                <CardDescription>查看和管理所有订单</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative w-48">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="搜索经销商或订单号..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部状态</SelectItem>
                    <SelectItem value="pending">待支付</SelectItem>
                    <SelectItem value="paid">已支付</SelectItem>
                    <SelectItem value="cancelled">已取消</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部类型</SelectItem>
                    <SelectItem value="normal">正常订单</SelectItem>
                    <SelectItem value="gift">赠品订单</SelectItem>
                    <SelectItem value="special">特殊订单</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>订单号</TableHead>
                    <TableHead>经销商</TableHead>
                    <TableHead>订单日期</TableHead>
                    <TableHead>订单金额</TableHead>
                    <TableHead>到期日期</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders && filteredOrders.length > 0 ? (
                    filteredOrders.map((order: any) => {
                      const dealer = dealers?.find((d) => d.id === order.dealerId);
                      return (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">{order.orderNumber || `#${order.id}`}</TableCell>
                          <TableCell>{dealer?.name || "-"}</TableCell>
                          <TableCell>{new Date(order.orderDate).toLocaleDateString('zh-CN')}</TableCell>
                          <TableCell>¥{formatMoney(order.totalAmount)}</TableCell>
                          <TableCell>{new Date(order.dueDate).toLocaleDateString('zh-CN')}</TableCell>
                          <TableCell>{getTypeBadge(order.type)}</TableCell>
                          <TableCell>{getStatusBadge(order.status)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(order)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedOrder(order);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
                        {searchTerm || statusFilter !== "all" || typeFilter !== "all"
                          ? "未找到匹配的订单"
                          : "暂无订单"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* 创建订单对话框 */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>新建订单</DialogTitle>
              <DialogDescription>添加新的订单信息到系统</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dealerId">经销商 *</Label>
                  <Select
                    value={formData.dealerId}
                    onValueChange={(value) => setFormData({ ...formData, dealerId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择经销商" />
                    </SelectTrigger>
                    <SelectContent>
                      {dealers?.map((dealer) => (
                        <SelectItem key={dealer.id} value={dealer.id.toString()}>
                          {dealer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="type">订单类型</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: any) => setFormData({ ...formData, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">正常订单</SelectItem>
                      <SelectItem value="gift">赠品订单</SelectItem>
                      <SelectItem value="special">特殊订单</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="orderDate">订单日期 *</Label>
                  <Input
                    id="orderDate"
                    type="date"
                    value={formData.orderDate}
                    onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="dueDate">到期日期 *</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <Label className="text-base font-semibold">订单产品</Label>
                <div className="mt-2 space-y-2">
                  <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-5">
                      <Select
                        value={currentItem.productId}
                        onValueChange={(value) => {
                          const product = products?.find(p => p.id === parseInt(value));
                          setCurrentItem({ 
                            ...currentItem, 
                            productId: value,
                            price: product ? (product.wholesalePrice / 100).toString() : ""
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="选择产品" />
                        </SelectTrigger>
                        <SelectContent>
                          {products?.map((product) => (
                            <SelectItem key={product.id} value={product.id.toString()}>
                              {product.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-3">
                      <Input
                        type="number"
                        placeholder="数量"
                        value={currentItem.quantity}
                        onChange={(e) => setCurrentItem({ ...currentItem, quantity: e.target.value })}
                      />
                    </div>
                    <div className="col-span-3">
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="单价(元)"
                        value={currentItem.price}
                        onChange={(e) => setCurrentItem({ ...currentItem, price: e.target.value })}
                      />
                    </div>
                    <div className="col-span-1">
                      <Button type="button" onClick={handleAddItem} className="w-full">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {formData.items.length > 0 && (
                    <div className="border rounded-md p-2 space-y-2">
                      {formData.items.map((item, index) => {
                        const product = products?.find(p => p.id === item.productId);
                        return (
                          <div key={index} className="flex items-center justify-between bg-muted p-2 rounded">
                            <div className="flex-1">
                              <span className="font-medium">{product?.name}</span>
                              <span className="text-sm text-muted-foreground ml-2">
                                x{item.quantity} @ ¥{(item.price / 100).toFixed(2)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">
                                ¥{((item.price * item.quantity) / 100).toFixed(2)}
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveItem(index)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                      <div className="flex justify-end font-bold text-lg pt-2 border-t">
                        总计: ¥{(formData.items.reduce((sum, item) => sum + item.price * item.quantity, 0) / 100).toFixed(2)}
                      </div>
                    </div>
                  )}
                </div>
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

        {/* 编辑订单对话框 */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>编辑订单</DialogTitle>
              <DialogDescription>修改订单基本信息</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-dealerId">经销商 *</Label>
                <Select
                  value={editFormData.dealerId}
                  onValueChange={(value) => setEditFormData({ ...editFormData, dealerId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择经销商" />
                  </SelectTrigger>
                  <SelectContent>
                    {dealers?.map((dealer) => (
                      <SelectItem key={dealer.id} value={dealer.id.toString()}>
                        {dealer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit-orderDate">订单日期 *</Label>
                <Input
                  id="edit-orderDate"
                  type="date"
                  value={editFormData.orderDate}
                  onChange={(e) => setEditFormData({ ...editFormData, orderDate: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="edit-dueDate">到期日期 *</Label>
                <Input
                  id="edit-dueDate"
                  type="date"
                  value={editFormData.dueDate}
                  onChange={(e) => setEditFormData({ ...editFormData, dueDate: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="edit-type">订单类型</Label>
                <Select
                  value={editFormData.type}
                  onValueChange={(value: any) => setEditFormData({ ...editFormData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">正常订单</SelectItem>
                    <SelectItem value="gift">赠品订单</SelectItem>
                    <SelectItem value="special">特殊订单</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "更新中..." : "更新"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 删除确认对话框 */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认删除订单</AlertDialogTitle>
              <AlertDialogDescription>
                确定要删除订单 {selectedOrder?.orderNumber || `#${selectedOrder?.id}`} 吗？
                此操作将同时删除订单明细和回款记录，且无法撤销。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} disabled={deleteMutation.isPending}>
                {deleteMutation.isPending ? "删除中..." : "确认删除"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}
