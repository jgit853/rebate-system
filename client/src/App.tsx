import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Dashboard from "./pages/admin/Dashboard";
import Dealers from "./pages/admin/Dealers";
import DealerDetail from "./pages/admin/DealerDetail";
import Settlements from "./pages/admin/Settlements";
import DealerLogin from "./pages/dealer/Login";
import DealerDashboard from "./pages/dealer/Dashboard";
import SetPassword from "./pages/dealer/SetPassword";
import ChangePassword from "./pages/dealer/ChangePassword";
import Products from "./pages/admin/Products";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/admin"} component={Dashboard} />
      <Route path={"/admin/dealers"} component={Dealers} />
      <Route path={"/admin/dealers/:id"} component={DealerDetail} />
      <Route path={"/admin/products"} component={Products} />
      <Route path={"/admin/settlements"} component={Settlements} />
      <Route path={"/dealer/login"} component={DealerLogin} />
      <Route path={"/dealer/dashboard"} component={DealerDashboard} />
      <Route path={"/dealer/set-password"} component={SetPassword} />
      <Route path={"/dealer/change-password"} component={ChangePassword} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
