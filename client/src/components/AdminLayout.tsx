import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { APP_TITLE, getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import {
  LayoutDashboard,
  Users,
  Package,
  FileText,
  Calendar,
  DollarSign,
  LogOut,
  Menu,
  Settings,
  UserCog,
  Megaphone,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { label: "概览", path: "/admin", icon: <LayoutDashboard className="w-5 h-5" /> },
  { label: "经销商管理", path: "/admin/dealers", icon: <Users className="w-5 h-5" /> },
  { label: "产品管理", path: "/admin/products", icon: <Package className="w-5 h-5" /> },
  { label: "订单管理", path: "/admin/orders", icon: <FileText className="w-5 h-5" /> },
  { label: "结算周期", path: "/admin/periods", icon: <Calendar className="w-5 h-5" /> },
  { label: "结算管理", path: "/admin/settlements", icon: <DollarSign className="w-5 h-5" /> },
  { label: "用户管理", path: "/admin/users", icon: <UserCog className="w-5 h-5" /> },
  { label: "公告管理", path: "/admin/announcements", icon: <Megaphone className="w-5 h-5" /> },
  { label: "政策设置", path: "/admin/policy-settings", icon: <Settings className="w-5 h-5" /> },
  { label: "系统设置", path: "/admin/settings", icon: <Settings className="w-5 h-5" /> },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, isAuthenticated } = useAuth();
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const logoutMutation = trpc.auth.logout.useMutation();

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
    window.location.href = "/";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/20">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">请先登录</h1>
          <p className="text-muted-foreground">您需要登录才能访问管理后台</p>
          <Button asChild>
            <a href={getLoginUrl()}>立即登录</a>
          </Button>
        </div>
      </div>
    );
  }

  const SidebarContent = () => (
    <>
      <div className="p-6 border-b">
        <h1 className="text-xl font-bold">{APP_TITLE}</h1>
        <p className="text-sm text-muted-foreground mt-1">管理后台</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = location === item.path;
          return (
            <Link key={item.path} href={item.path}>
              <div
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors cursor-pointer ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.icon}
                <span>{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t">
        <div className="flex items-center gap-3 px-4 py-3 mb-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-sm font-medium text-primary">
              {user?.name?.[0] || "U"}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name || "用户"}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
        <Button
          variant="outline"
          className="w-full"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4 mr-2" />
          退出登录
        </Button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 flex-col border-r bg-card">
        <SidebarContent />
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 border-b bg-card z-50 flex items-center px-4">
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="w-6 h-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <div className="flex flex-col h-full">
              <SidebarContent />
            </div>
          </SheetContent>
        </Sheet>
        <h1 className="ml-4 font-bold">{APP_TITLE}</h1>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="md:pt-0 pt-16">
          {children}
        </div>
      </main>
    </div>
  );
}
