import { useSupabaseAuth } from "@/contexts/SupabaseAuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/useMobile";
import { LayoutDashboard, LogOut, PanelLeft, MapPin, Zap, Upload, BarChart3 } from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: MapPin, label: "Places", path: "/places" },
  { icon: Zap, label: "Quick Entry", path: "/quick-entry" },
  { icon: Upload, label: "Batch Upload", path: "/batch-upload" },
  { icon: BarChart3, label: "Signals", path: "/signals" },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 260;
const MIN_WIDTH = 200;
const MAX_WIDTH = 400;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useSupabaseAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />
  }

  // Auth check is now handled by ProtectedRoute in App.tsx
  // This component assumes user is authenticated

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, signOut } = useSupabaseAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeMenuItem = menuItems.find(item => item.path === location);
  const isMobile = useIsMobile();

  // Get user display info from Supabase user metadata
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const userEmail = user?.email || '';
  const userInitial = userName.charAt(0).toUpperCase();

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  const handleSignOut = async () => {
    await signOut();
    setLocation("/login");
  };

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r border-orange-500/20 bg-gradient-to-b from-[#141842] to-[#0F1233]"
          disableTransition={isResizing}
        >
          {/* Header with Logo */}
          <SidebarHeader className="h-20 justify-center border-b border-orange-500/20 bg-gradient-to-r from-orange-500/5 to-blue-500/5">
            <div className="flex items-center gap-3 px-3 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-white/10 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-orange-400/80" />
              </button>
              {!isCollapsed && (
                <div className="flex items-center min-w-0 flex-1">
                  <img 
                    src="/tavvy-logo-horizontal.png" 
                    alt="TavvY" 
                    className="h-8 w-auto object-contain"
                  />
                </div>
              )}
            </div>
          </SidebarHeader>

          {/* Navigation Menu */}
          <SidebarContent className="gap-0 px-2 py-4">
            <SidebarMenu>
              {menuItems.map(item => {
                const isActive = location === item.path;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className={`h-11 transition-all font-medium rounded-lg mb-1 ${
                        isActive 
                          ? 'bg-gradient-to-r from-orange-500/25 to-orange-500/10 text-orange-400 border border-orange-500/30 hover:from-orange-500/30 hover:to-orange-500/15' 
                          : 'text-white/70 hover:bg-white/8 hover:text-white border border-transparent'
                      }`}
                    >
                      <item.icon
                        className={`h-5 w-5 shrink-0 ${isActive ? "text-orange-400" : "text-white/50"}`}
                      />
                      <span className="truncate">{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          {/* User Footer */}
          <SidebarFooter className="p-3 border-t border-orange-500/20 bg-gradient-to-r from-orange-500/5 to-transparent">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-white/10 transition-colors w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">
                  <Avatar className="h-9 w-9 shrink-0 border-2 border-orange-500/50">
                    <AvatarFallback className="text-sm font-semibold text-white bg-gradient-to-br from-orange-500 to-orange-600">
                      {userInitial}
                    </AvatarFallback>
                  </Avatar>
                  {!isCollapsed && (
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <p className="text-sm font-medium text-white truncate leading-tight">
                        {userName}
                      </p>
                      <p className="text-xs text-white/50 truncate mt-0.5">
                        {userEmail}
                      </p>
                    </div>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        
        {/* Resize Handle */}
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-orange-500/40 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      {/* Main Content Area */}
      <SidebarInset className="bg-[#0a0d24]">
        {isMobile && (
          <div className="flex border-b border-orange-500/20 h-14 items-center justify-between bg-gradient-to-r from-[#141842] to-[#0F1233] px-3 backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-white/5 text-orange-400 hover:bg-white/10" />
              <img 
                src="/tavvy-logo-horizontal.png" 
                alt="TavvY" 
                className="h-6 w-auto object-contain"
              />
            </div>
          </div>
        )}
        <main className="flex-1 p-6 min-h-screen">{children}</main>
      </SidebarInset>
    </>
  );
}
