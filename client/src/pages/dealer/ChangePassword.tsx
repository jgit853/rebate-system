import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { APP_TITLE } from "@/const";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, DollarSign } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function ChangePassword() {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    const storedInfo = localStorage.getItem("dealerInfo");
    if (!storedInfo) {
      setLocation("/dealer/login");
      return;
    }

    const dealerInfo = JSON.parse(storedInfo);
    setUsername(dealerInfo.code); // 使用code作为username
  }, [setLocation]);

  const changePasswordMutation = trpc.dealerAuth.changePassword.useMutation();

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!oldPassword || !newPassword || !confirmPassword) {
      toast.error("请填写所有字段");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("新密码长度至少为6位");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("两次输入的新密码不一致");
      return;
    }

    try {
      await changePasswordMutation.mutateAsync({
        username,
        oldPassword,
        newPassword,
      });
      toast.success("密码修改成功,请重新登录");
      localStorage.removeItem("dealerToken");
      localStorage.removeItem("dealerInfo");
      setLocation("/dealer/login");
    } catch (error) {
      toast.error((error as Error).message || "密码修改失败");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <DollarSign className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">{APP_TITLE}</CardTitle>
          <CardDescription>修改登录密码</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="oldPassword">原密码</Label>
              <Input
                id="oldPassword"
                type="password"
                placeholder="请输入原密码"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">新密码</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="请输入新密码(至少6位)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">确认新密码</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="请再次输入新密码"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={changePasswordMutation.isPending}
            >
              {changePasswordMutation.isPending ? "修改中..." : "确认修改"}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <Button
              variant="ghost"
              onClick={() => setLocation("/dealer/dashboard")}
              className="text-sm"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回仪表盘
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
