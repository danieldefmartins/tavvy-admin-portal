import { Switch, Route, Redirect } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import Login from "@/pages/Login";
import Home from "@/pages/Home";
import Places from "@/pages/Places";
import QuickEntry from "@/pages/QuickEntry";
import BatchUpload from "@/pages/BatchUpload";
import Signals from "@/pages/Signals";

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  return <>{children}</>;
}

// Dashboard pages wrapped in layout
function DashboardPages() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/places" component={Places} />
        <Route path="/quick-entry" component={QuickEntry} />
        <Route path="/batch-upload" component={BatchUpload} />
        <Route path="/signals" component={Signals} />
        <Route>
          <div className="p-8">
            <h1 className="text-2xl font-bold text-white">404 - Page Not Found</h1>
          </div>
        </Route>
      </Switch>
    </DashboardLayout>
  );
}

function App() {
  return (
    <>
      <Switch>
        <Route path="/login" component={Login} />
        <Route>
          <ProtectedRoute>
            <DashboardPages />
          </ProtectedRoute>
        </Route>
      </Switch>
      <Toaster />
    </>
  );
}

export default App;
