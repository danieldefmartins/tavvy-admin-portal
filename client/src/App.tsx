import { Switch, Route, Redirect } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import DashboardLayout from "@/components/DashboardLayout";

// Pages
import Login from "@/pages/Login";
import Home from "@/pages/Home";
import Places from "@/pages/Places";
import QuickEntry from "@/pages/QuickEntry";
import BatchUpload from "@/pages/BatchUpload";
import Signals from "@/pages/Signals";
import Articles from "@/pages/Articles";
import AtlasBulkImport from "@/pages/AtlasBulkImport";
import MarkdownImport from "@/pages/MarkdownImport";
import Cities from "@/pages/Cities";
import Universes from "@/pages/Universes";
// Admin & Safety Pages
import BusinessClaims from "@/pages/BusinessClaims";
import Moderation from "@/pages/Moderation";
import Overrides from "@/pages/Overrides";
import AuditLog from "@/pages/AuditLog";
import Verifications from "@/pages/Verifications";
import Realtors from "@/pages/Realtors";

// Loading component
function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F1233]">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
    </div>
  );
}

// Protected route wrapper with DashboardLayout
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  return (
    <DashboardLayout>
      {children}
    </DashboardLayout>
  );
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
          <Redirect to="/" />
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

        <Route path="/articles">
          <ProtectedRoute>
            <Articles />
          </ProtectedRoute>
        </Route>

        <Route path="/atlas-import">
          <ProtectedRoute>
            <AtlasBulkImport />
          </ProtectedRoute>
        </Route>

        <Route path="/markdown-import">
          <ProtectedRoute>
            <MarkdownImport />
          </ProtectedRoute>
        </Route>

        <Route path="/cities">
          <ProtectedRoute>
            <Cities />
          </ProtectedRoute>
        </Route>

        <Route path="/universes">
          <ProtectedRoute>
            <Universes />
          </ProtectedRoute>
        </Route>

        {/* Admin & Safety Routes */}
        <Route path="/realtors">
          <ProtectedRoute>
            <Realtors />
          </ProtectedRoute>
        </Route>

        <Route path="/business-claims">
          <ProtectedRoute>
            <BusinessClaims />
          </ProtectedRoute>
        </Route>

        <Route path="/moderation">
          <ProtectedRoute>
            <Moderation />
          </ProtectedRoute>
        </Route>

        <Route path="/overrides">
          <ProtectedRoute>
            <Overrides />
          </ProtectedRoute>
        </Route>

        <Route path="/audit-log">
          <ProtectedRoute>
            <AuditLog />
          </ProtectedRoute>
        </Route>

        <Route path="/verifications">
          <ProtectedRoute>
            <Verifications />
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
