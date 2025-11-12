import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { APP_TITLE } from "@/const";
import { trpc } from "@/lib/trpc";
import { DollarSign } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function SetPassword() {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const setPasswordMutation = trpc.dealerAuth.setPassword.useMutation();

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || !newPassword || !confirmPassword) {
      toast.error("请填写所有字段");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("密码长度至少为6位");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("两次输入的密码不一致");
      return;
    }

    try {
      await setPasswordMutation.mutateAsync({ username, newPassword });
      toast.success("密码设置成功,请登录");
      setLocation("/dealer/login");
    } catch (error) {
      toast.error((error as Error).message || "密码设置失败");
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
          <CardDescription>设置登录密码</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">用户名</Label>
              <Input
                id="username"
                type="text"
                placeholder="请输入管理员分配的用户名"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
              />
              <p className="text-xs text-muted-foreground">
                请联系管理员获取您的用户名
              </p>
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
              <Label htmlFor="confirmPassword">确认密码</Label>
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
              disabled={setPasswordMutation.isPending}
            >
              {setPasswordMutation.isPending ? "设置中..." : "设置密码"}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <a
              href="/dealer/login"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              ← 返回登录
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
