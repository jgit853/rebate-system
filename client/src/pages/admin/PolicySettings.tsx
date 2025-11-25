import { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Settings, Save, Plus, Trash2 } from "lucide-react";

interface RebateTier {
  threshold: number;
  rate: number;
}

interface OverdueDeduction {
  overdueRatio: number;
  deduction: number;
}

export default function PolicySettings() {
  const { data: settings, isLoading, refetch } = trpc.policySettings.get.useQuery();
  const updateMutation = trpc.policySettings.update.useMutation();

  const [rebateTiers, setRebateTiers] = useState<RebateTier[]>([]);
  const [overdueDeductions, setOverdueDeductions] = useState<OverdueDeduction[]>([]);
  const [benefitRedline, setBenefitRedline] = useState(1800);
  const [marketFundRate, setMarketFundRate] = useState(300);
  const [firstYearCommissionRate, setFirstYearCommissionRate] = useState(1500);
  const [renewalCommissionRate, setRenewalCommissionRate] = useState(500);
  const [isEdited, setIsEdited] = useState(false);

  // 当数据加载完成时初始化表单
  useEffect(() => {
    if (settings) {
      try {
        setRebateTiers(JSON.parse(settings.rebateTiers));
        setOverdueDeductions(JSON.parse(settings.overdueDeductions));
        setBenefitRedline(settings.benefitRedline);
        setMarketFundRate(settings.marketFundRate);
        setFirstYearCommissionRate(settings.firstYearCommissionRate);
        setRenewalCommissionRate(settings.renewalCommissionRate);
      } catch (e) {
        console.error("Failed to parse settings:", e);
      }
    }
  }, [settings]);

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({
        rebateTiers: JSON.stringify(rebateTiers),
        overdueDeductions: JSON.stringify(overdueDeductions),
        benefitRedline,
        marketFundRate,
        firstYearCommissionRate,
        renewalCommissionRate,
      });
      
      toast.success("政策参数已更新");
      setIsEdited(false);
      refetch();
    } catch (error: any) {
      toast.error(error.message || "更新失败");
    }
  };

  const addRebateTier = () => {
    setRebateTiers([...rebateTiers, { threshold: 0, rate: 0 }]);
    setIsEdited(true);
  };

  const removeRebateTier = (index: number) => {
    setRebateTiers(rebateTiers.filter((_, i) => i !== index));
    setIsEdited(true);
  };

  const updateRebateTier = (index: number, field: keyof RebateTier, value: number) => {
    const updated = [...rebateTiers];
    updated[index][field] = value;
    setRebateTiers(updated);
    setIsEdited(true);
  };

  const addOverdueDeduction = () => {
    setOverdueDeductions([...overdueDeductions, { overdueRatio: 0, deduction: 0 }]);
    setIsEdited(true);
  };

  const removeOverdueDeduction = (index: number) => {
    setOverdueDeductions(overdueDeductions.filter((_, i) => i !== index));
    setIsEdited(true);
  };

  const updateOverdueDeduction = (index: number, field: keyof OverdueDeduction, value: number) => {
    const updated = [...overdueDeductions];
    updated[index][field] = value;
    setOverdueDeductions(updated);
    setIsEdited(true);
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">加载中...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">政策参数设置</h1>
            <p className="text-muted-foreground mt-1">配置返利政策相关参数</p>
          </div>
          <Button onClick={handleSave} disabled={!isEdited || updateMutation.isPending}>
            <Save className="w-4 h-4 mr-2" />
            {updateMutation.isPending ? "保存中..." : "保存更改"}
          </Button>
        </div>

        {/* 返利阶梯 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              返利阶梯设置
            </CardTitle>
            <CardDescription>
              设置不同回款基数对应的返利比例。基数单位:元,比例单位:万分之一(如600表示6%)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {rebateTiers.map((tier, index) => (
              <div key={index} className="flex items-center gap-4">
                <div className="flex-1">
                  <Label>基数门槛(元)</Label>
                  <Input
                    type="number"
                    value={tier.threshold}
                    onChange={(e) => updateRebateTier(index, "threshold", parseInt(e.target.value) || 0)}
                    placeholder="如: 100000"
                  />
                </div>
                <div className="flex-1">
                  <Label>返利比例(万分之一)</Label>
                  <Input
                    type="number"
                    value={tier.rate}
                    onChange={(e) => updateRebateTier(index, "rate", parseInt(e.target.value) || 0)}
                    placeholder="如: 600 (表示6%)"
                  />
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => removeRebateTier(index)}
                  className="mt-6"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" onClick={addRebateTier}>
              <Plus className="w-4 h-4 mr-2" />
              添加阶梯
            </Button>
          </CardContent>
        </Card>

        {/* 超期扣减 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              超期扣减设置
            </CardTitle>
            <CardDescription>
              设置超期比例对应的返利扣减。比例单位:万分之一(如500表示5%)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {overdueDeductions.map((deduction, index) => (
              <div key={index} className="flex items-center gap-4">
                <div className="flex-1">
                  <Label>超期比例(万分之一)</Label>
                  <Input
                    type="number"
                    value={deduction.overdueRatio}
                    onChange={(e) => updateOverdueDeduction(index, "overdueRatio", parseInt(e.target.value) || 0)}
                    placeholder="如: 500 (表示5%)"
                  />
                </div>
                <div className="flex-1">
                  <Label>扣减比例(万分之一)</Label>
                  <Input
                    type="number"
                    value={deduction.deduction}
                    onChange={(e) => updateOverdueDeduction(index, "deduction", parseInt(e.target.value) || 0)}
                    placeholder="如: 100 (表示1%)"
                  />
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => removeOverdueDeduction(index)}
                  className="mt-6"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" onClick={addOverdueDeduction}>
              <Plus className="w-4 h-4 mr-2" />
              添加扣减规则
            </Button>
          </CardContent>
        </Card>

        {/* 其他参数 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              其他参数设置
            </CardTitle>
            <CardDescription>
              配置综合让利红线、市场基金比例和抽佣比例。单位:万分之一
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>综合让利红线(万分之一)</Label>
              <Input
                type="number"
                value={benefitRedline}
                onChange={(e) => {
                  setBenefitRedline(parseInt(e.target.value) || 0);
                  setIsEdited(true);
                }}
                placeholder="如: 1800 (表示18%)"
              />
              <p className="text-xs text-muted-foreground mt-1">
                当前值: {(benefitRedline / 100).toFixed(2)}%
              </p>
            </div>

            <div>
              <Label>市场基金比例(万分之一)</Label>
              <Input
                type="number"
                value={marketFundRate}
                onChange={(e) => {
                  setMarketFundRate(parseInt(e.target.value) || 0);
                  setIsEdited(true);
                }}
                placeholder="如: 300 (表示3%)"
              />
              <p className="text-xs text-muted-foreground mt-1">
                当前值: {(marketFundRate / 100).toFixed(2)}%
              </p>
            </div>

            <div>
              <Label>首年抽佣比例(万分之一)</Label>
              <Input
                type="number"
                value={firstYearCommissionRate}
                onChange={(e) => {
                  setFirstYearCommissionRate(parseInt(e.target.value) || 0);
                  setIsEdited(true);
                }}
                placeholder="如: 1500 (表示15%)"
              />
              <p className="text-xs text-muted-foreground mt-1">
                当前值: {(firstYearCommissionRate / 100).toFixed(2)}%
              </p>
            </div>

            <div>
              <Label>续约抽佣比例(万分之一)</Label>
              <Input
                type="number"
                value={renewalCommissionRate}
                onChange={(e) => {
                  setRenewalCommissionRate(parseInt(e.target.value) || 0);
                  setIsEdited(true);
                }}
                placeholder="如: 500 (表示5%)"
              />
              <p className="text-xs text-muted-foreground mt-1">
                当前值: {(renewalCommissionRate / 100).toFixed(2)}%
              </p>
            </div>
          </CardContent>
        </Card>

        {settings?.updatedAt && (
          <p className="text-sm text-muted-foreground text-center">
            最后更新时间: {new Date(settings.updatedAt).toLocaleString("zh-CN")}
          </p>
        )}
      </div>
    </AdminLayout>
  );
}
