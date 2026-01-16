import { Switch, Route, Redirect } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";

// Pages
import Login from "@/pages/Login";
import Home from "@/pages/Home";
import Dashboard from "@/pages/Dashboard";
import Places from "@/pages/Places";
import QuickEntry from "@/pages/QuickEntry";
import BatchUpload from "@/pages/BatchUpload";
import Signals from "@/pages/Signals";

// Loading component
function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
    </div>
  );
}

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="tavvy-admin-theme">
      <Switch>
        <Route path="/login" component={Login} />
        
        <Route path="/">
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        </Route>

        <Route path="/dashboard">
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        </Route>

        <Route path="/places">
          <ProtectedRoute>
            <Places />
          </ProtectedRoute>
        </Route>

        <Route path="/quick-entry">
          <ProtectedRoute>
            <QuickEntry />
          </ProtectedRoute>
        </Route>

        <Route path="/batch-upload">
          <ProtectedRoute>
            <BatchUpload />
          </ProtectedRoute>
        </Route>

        <Route path="/signals">
          <ProtectedRoute>
            <Signals />
          </ProtectedRoute>
        </Route>

        {/* Fallback - redirect to home */}
        <Route>
          <Redirect to="/" />
        </Route>
      </Switch>
      <Toaster />
    </ThemeProvider>
  );
}

export default App;
