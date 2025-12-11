import { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Save, Loader2, Settings2, Palette, Mail, Shield, Database } from "lucide-react";

export default function SystemSettingsPage() {
  const { data: settings, isLoading, refetch } = trpc.systemSettings.get.useQuery();
  const updateMutation = trpc.systemSettings.update.useMutation();

  const [formData, setFormData] = useState({
    // 基础设置
    systemName: "",
    systemDescription: "",
    systemLogo: "",
    // 主题设置
    primaryColor: "#3b82f6",
    theme: "light" as "light" | "dark" | "auto",
    // 邮件配置
    smtpHost: "",
    smtpPort: 587,
    smtpUser: "",
    smtpPassword: "",
    smtpFrom: "",
    // 安全设置
    passwordMinLength: 6,
    sessionTimeout: 86400,
    enableTwoFactor: false,
    // 备份设置
    autoBackup: false,
    backupFrequency: 86400,
    backupRetentionDays: 7,
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        systemName: settings.systemName || "",
        systemDescription: settings.systemDescription || "",
        systemLogo: settings.systemLogo || "",
        primaryColor: settings.primaryColor || "#3b82f6",
        theme: settings.theme || "light",
        smtpHost: settings.smtpHost || "",
        smtpPort: settings.smtpPort || 587,
        smtpUser: settings.smtpUser || "",
        smtpPassword: settings.smtpPassword || "",
        smtpFrom: settings.smtpFrom || "",
        passwordMinLength: settings.passwordMinLength || 6,
        sessionTimeout: settings.sessionTimeout || 86400,
        enableTwoFactor: settings.enableTwoFactor || false,
        autoBackup: settings.autoBackup || false,
        backupFrequency: settings.backupFrequency || 86400,
        backupRetentionDays: settings.backupRetentionDays || 7,
      });
    }
  }, [settings]);

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync(formData);
      toast.success("系统设置已保存");
      refetch();
    } catch (error: any) {
      toast.error(error.message || "保存失败");
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">系统设置</h1>
            <p className="text-muted-foreground mt-2">管理系统全局配置</p>
          </div>
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            保存设置
          </Button>
        </div>

        {/* 设置标签页 */}
        <Tabs defaultValue="basic" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="basic">
              <Settings2 className="w-4 h-4 mr-2" />
              基础设置
            </TabsTrigger>
            <TabsTrigger value="theme">
              <Palette className="w-4 h-4 mr-2" />
              主题设置
            </TabsTrigger>
            <TabsTrigger value="email">
              <Mail className="w-4 h-4 mr-2" />
              邮件配置
            </TabsTrigger>
            <TabsTrigger value="security">
              <Shield className="w-4 h-4 mr-2" />
              安全设置
            </TabsTrigger>
            <TabsTrigger value="backup">
              <Database className="w-4 h-4 mr-2" />
              备份设置
            </TabsTrigger>
          </TabsList>

          {/* 基础设置 */}
          <TabsContent value="basic">
            <Card>
              <CardHeader>
                <CardTitle>基础设置</CardTitle>
                <CardDescription>配置系统名称、描述和Logo</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="systemName">系统名称</Label>
                  <Input
                    id="systemName"
                    value={formData.systemName}
                    onChange={(e) =>
                      setFormData({ ...formData, systemName: e.target.value })
                    }
                    placeholder="经销商返利对账系统"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="systemDescription">系统描述</Label>
                  <Textarea
                    id="systemDescription"
                    value={formData.systemDescription}
                    onChange={(e) =>
                      setFormData({ ...formData, systemDescription: e.target.value })
                    }
                    placeholder="管理经销商返利和对账的专业系统"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="systemLogo">系统Logo URL</Label>
                  <Input
                    id="systemLogo"
                    value={formData.systemLogo}
                    onChange={(e) =>
                      setFormData({ ...formData, systemLogo: e.target.value })
                    }
                    placeholder="/logo.png"
                  />
                  <p className="text-xs text-muted-foreground">
                    请输入Logo图片的URL地址
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 主题设置 */}
          <TabsContent value="theme">
            <Card>
              <CardHeader>
                <CardTitle>主题设置</CardTitle>
                <CardDescription>配置系统主题和颜色方案</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="primaryColor">主题颜色</Label>
                  <div className="flex gap-2">
                    <Input
                      id="primaryColor"
                      type="color"
                      value={formData.primaryColor}
                      onChange={(e) =>
                        setFormData({ ...formData, primaryColor: e.target.value })
                      }
                      className="w-20 h-10"
                    />
                    <Input
                      value={formData.primaryColor}
                      onChange={(e) =>
                        setFormData({ ...formData, primaryColor: e.target.value })
                      }
                      placeholder="#3b82f6"
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>主题模式</Label>
                  <Select
                    value={formData.theme}
                    onValueChange={(v: any) => setFormData({ ...formData, theme: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">浅色</SelectItem>
                      <SelectItem value="dark">深色</SelectItem>
                      <SelectItem value="auto">跟随系统</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 邮件配置 */}
          <TabsContent value="email">
            <Card>
              <CardHeader>
                <CardTitle>邮件配置</CardTitle>
                <CardDescription>配置SMTP邮件服务器</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="smtpHost">SMTP服务器</Label>
                    <Input
                      id="smtpHost"
                      value={formData.smtpHost}
                      onChange={(e) =>
                        setFormData({ ...formData, smtpHost: e.target.value })
                      }
                      placeholder="smtp.example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtpPort">SMTP端口</Label>
                    <Input
                      id="smtpPort"
                      type="number"
                      value={formData.smtpPort}
                      onChange={(e) =>
                        setFormData({ ...formData, smtpPort: parseInt(e.target.value) })
                      }
                      placeholder="587"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpUser">SMTP用户名</Label>
                  <Input
                    id="smtpUser"
                    value={formData.smtpUser}
                    onChange={(e) =>
                      setFormData({ ...formData, smtpUser: e.target.value })
                    }
                    placeholder="user@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpPassword">SMTP密码</Label>
                  <Input
                    id="smtpPassword"
                    type="password"
                    value={formData.smtpPassword}
                    onChange={(e) =>
                      setFormData({ ...formData, smtpPassword: e.target.value })
                    }
                    placeholder="••••••••"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpFrom">发件人地址</Label>
                  <Input
                    id="smtpFrom"
                    value={formData.smtpFrom}
                    onChange={(e) =>
                      setFormData({ ...formData, smtpFrom: e.target.value })
                    }
                    placeholder="noreply@example.com"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 安全设置 */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>安全设置</CardTitle>
                <CardDescription>配置密码策略和会话管理</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="passwordMinLength">最小密码长度</Label>
                  <Input
                    id="passwordMinLength"
                    type="number"
                    value={formData.passwordMinLength}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        passwordMinLength: parseInt(e.target.value),
                      })
                    }
                    min={4}
                    max={20}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sessionTimeout">会话超时(秒)</Label>
                  <Input
                    id="sessionTimeout"
                    type="number"
                    value={formData.sessionTimeout}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        sessionTimeout: parseInt(e.target.value),
                      })
                    }
                    min={300}
                  />
                  <p className="text-xs text-muted-foreground">
                    默认86400秒(24小时)
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>启用双因素认证</Label>
                    <p className="text-xs text-muted-foreground">
                      要求用户使用双因素认证登录
                    </p>
                  </div>
                  <Switch
                    checked={formData.enableTwoFactor}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, enableTwoFactor: checked })
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 备份设置 */}
          <TabsContent value="backup">
            <Card>
              <CardHeader>
                <CardTitle>备份设置</CardTitle>
                <CardDescription>配置数据库自动备份</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>启用自动备份</Label>
                    <p className="text-xs text-muted-foreground">
                      定期自动备份数据库
                    </p>
                  </div>
                  <Switch
                    checked={formData.autoBackup}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, autoBackup: checked })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="backupFrequency">备份频率(秒)</Label>
                  <Input
                    id="backupFrequency"
                    type="number"
                    value={formData.backupFrequency}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        backupFrequency: parseInt(e.target.value),
                      })
                    }
                    disabled={!formData.autoBackup}
                  />
                  <p className="text-xs text-muted-foreground">
                    默认86400秒(每天一次)
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="backupRetentionDays">备份保留天数</Label>
                  <Input
                    id="backupRetentionDays"
                    type="number"
                    value={formData.backupRetentionDays}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        backupRetentionDays: parseInt(e.target.value),
                      })
                    }
                    min={1}
                    disabled={!formData.autoBackup}
                  />
                  <p className="text-xs text-muted-foreground">
                    超过此天数的备份将被自动删除
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
