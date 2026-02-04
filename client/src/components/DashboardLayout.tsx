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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useIsMobile } from "@/hooks/useMobile";
import { 
  LayoutDashboard, 
  LogOut, 
  PanelLeft, 
  MapPin, 
  Zap, 
  Upload, 
  BarChart3, 
  FileText, 
  Building2, 
  Globe, 
  Shield, 
  Flag, 
  History, 
  Edit3, 
  BookOpen,
  ChevronRight,
  FileUp,
  FileCode,
  BadgeCheck,
Home,
  Users,
  Briefcase,
  Film,
  ImageIcon,
  MessageSquare,
  PlusCircle
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';

// Regular menu items (non-grouped)
const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: MapPin, label: "Places", path: "/places" },
  { icon: PlusCircle, label: "Add Place", path: "/places/new" },
  { icon: FileText, label: "Drafts", path: "/drafts" },
  { icon: Zap, label: "Quick Entry", path: "/quick-entry" },
  { icon: Upload, label: "Batch Upload", path: "/batch-upload" },
  { icon: BarChart3, label: "Signals", path: "/signals" },
];

// Atlas section items
const atlasItems = [
  { icon: FileText, label: "Articles", path: "/articles" },
  { icon: FileUp, label: "CSV Import", path: "/atlas-import" },
  { icon: FileCode, label: "Markdown Import", path: "/markdown-import" },
];

// Other menu items
const otherItems = [
  { icon: Building2, label: "Cities", path: "/cities" },
  { icon: Globe, label: "Universes", path: "/universes" },
];

// Content Moderation items
const moderationItems = [
  { icon: Film, label: "Stories", path: "/stories" },
  { icon: ImageIcon, label: "Photos", path: "/photos" },
  { icon: MessageSquare, label: "Reviews", path: "/reviews" },
  { icon: Flag, label: "Flags Queue", path: "/moderation" },
];

// Providers items
const providerItems = [
  { icon: Briefcase, label: "All Providers", path: "/providers" },
  { icon: BadgeCheck, label: "Verifications", path: "/verifications" },
  { icon: Shield, label: "Business Claims", path: "/business-claims" },
];

// Users & Access items
const usersItems = [
  { icon: Users, label: "Users", path: "/users" },
  { icon: History, label: "Audit Log", path: "/audit-log" },
];

// System items
const systemItems = [
  { icon: Edit3, label: "Overrides", path: "/overrides" },
  { icon: BarChart3, label: "Strategic Audit", path: "/strategic-audit" },
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
  const isMobile = useIsMobile();
  
  // Check if current path is in Atlas section
  const isAtlasActive = atlasItems.some(item => item.path === location);
  const [atlasOpen, setAtlasOpen] = useState(isAtlasActive);

  // Get user display info from Supabase user metadata
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const userEmail = user?.email || '';
  const userInitial = userName.charAt(0).toUpperCase();

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  // Open Atlas section when navigating to an Atlas page
  useEffect(() => {
    if (isAtlasActive) {
      setAtlasOpen(true);
    }
  }, [isAtlasActive]);

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

  const renderMenuItem = (item: typeof menuItems[0]) => {
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
  };

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r border-white/10 bg-black"
          disableTransition={isResizing}
        >
          {/* Header with Logo */}
          <SidebarHeader className="h-20 justify-center border-b border-white/10 bg-black">
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
                    src="/tavvy-logo-horizontal.jpg" 
                    alt="Tavvy" 
                    className="h-8 w-auto object-contain"
                  />
                </div>
              )}
            </div>
          </SidebarHeader>

          {/* Navigation Menu */}
          <SidebarContent className="gap-0 px-2 py-4">
            <SidebarMenu>
              {/* Main menu items */}
              {menuItems.map(renderMenuItem)}
              
              {/* Atlas Section - Collapsible */}
              <Collapsible
                open={atlasOpen}
                onOpenChange={setAtlasOpen}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      tooltip="Atlas"
                      className={`h-11 transition-all font-medium rounded-lg mb-1 ${
                        isAtlasActive 
                          ? 'bg-gradient-to-r from-green-500/25 to-green-500/10 text-green-400 border border-green-500/30 hover:from-green-500/30 hover:to-green-500/15' 
                          : 'text-white/70 hover:bg-white/8 hover:text-white border border-transparent'
                      }`}
                    >
                      <BookOpen
                        className={`h-5 w-5 shrink-0 ${isAtlasActive ? "text-green-400" : "text-white/50"}`}
                      />
                      <span className="truncate">Atlas</span>
                      <ChevronRight className={`ml-auto h-4 w-4 transition-transform duration-200 ${atlasOpen ? 'rotate-90' : ''}`} />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {atlasItems.map((item) => {
                        const isActive = location === item.path;
                        return (
                          <SidebarMenuSubItem key={item.path}>
                            <SidebarMenuSubButton
                              onClick={() => setLocation(item.path)}
                              className={`transition-all ${
                                isActive 
                                  ? 'text-green-400 bg-green-500/10' 
                                  : 'text-white/60 hover:text-white hover:bg-white/5'
                              }`}
                            >
                              <item.icon className={`h-4 w-4 mr-2 ${isActive ? 'text-green-400' : 'text-white/40'}`} />
                              <span>{item.label}</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        );
                      })}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              {/* Other items */}
              {otherItems.map(renderMenuItem)}
              
              {/* Divider - Content Moderation */}
              <div className="my-3 mx-2 border-t border-white/10" />
              <div className="px-3 py-1 text-xs uppercase tracking-wider text-white/40 font-medium">Moderation</div>
              {moderationItems.map(renderMenuItem)}
              
              {/* Divider - Providers */}
              <div className="my-3 mx-2 border-t border-white/10" />
              <div className="px-3 py-1 text-xs uppercase tracking-wider text-white/40 font-medium">Providers</div>
              {providerItems.map(renderMenuItem)}
              
              {/* Divider - Users & Access */}
              <div className="my-3 mx-2 border-t border-white/10" />
              <div className="px-3 py-1 text-xs uppercase tracking-wider text-white/40 font-medium">Users & Access</div>
              {usersItems.map(renderMenuItem)}
              
              {/* Divider - System */}
              <div className="my-3 mx-2 border-t border-white/10" />
              <div className="px-3 py-1 text-xs uppercase tracking-wider text-white/40 font-medium">System</div>
              {systemItems.map(renderMenuItem)}
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
      <SidebarInset className="bg-black">
        {isMobile && (
          <div className="flex border-b border-white/10 h-14 items-center justify-between bg-black px-3 backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-white/5 text-orange-400 hover:bg-white/10" />
              <img 
                src="/tavvy-logo-horizontal.jpg" 
                alt="Tavvy" 
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
