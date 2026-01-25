import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Database,
  Users,
  Palette,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Layers,
  Smartphone,
  Globe,
  Shield,
  Zap,
  Target,
  BarChart3,
  FileText,
  ChevronRight,
  Clock,
  Award,
  MessageSquare,
  Map,
  Star,
  XCircle,
} from "lucide-react";

// ============================================================================
// AUDIT DATA - Update this section when audit findings change
// ============================================================================

const auditMetrics = {
  tables: 108,
  screens: 112,
  platforms: 5,
  repos: 6,
};

const executiveSummary = {
  technology: { status: "solid", label: "Solid", description: "Solid foundation, complex but functional" },
  userExperience: { status: "warning", label: "Needs Work", description: "High friction in key journeys" },
  designSystem: { status: "solid", label: "Solid", description: "Strong brand, needs consistency" },
  engagement: { status: "warning", label: "Needs Work", description: "Good gamification, weak retention" },
};

const databaseDomains = [
  { name: "Users & Auth", tables: 12, description: "User accounts, sessions, verification" },
  { name: "Places", tables: 18, description: "Locations, hours, photos, reviews" },
  { name: "Stories", tables: 6, description: "Place stories, highlights, views" },
  { name: "Pro Services", tables: 24, description: "Providers, leads, bids, subscriptions" },
  { name: "Messaging", tables: 8, description: "Conversations, threads, messages" },
  { name: "Digital Cards", tables: 6, description: "Business cards, links, recommendations" },
  { name: "Gamification", tables: 8, description: "Badges, streaks, wallet, taps" },
  { name: "Atlas", tables: 10, description: "Articles, universes, categories" },
  { name: "Admin", tables: 6, description: "Audit logs, moderation, flags" },
  { name: "Other", tables: 10, description: "Cities, signals, memberships" },
];

const userJourneys = [
  {
    name: "New User Onboarding",
    screens: 4,
    friction: "Low",
    status: "good",
    issues: ["No personalization questions", "Missing interests selection"],
  },
  {
    name: "Place Discovery",
    screens: 3,
    friction: "Low",
    status: "good",
    issues: ["Search could be more prominent", "Filter options limited"],
  },
  {
    name: "Submit Review (Tap)",
    screens: 2,
    friction: "Low",
    status: "good",
    issues: ["Signal selection could be clearer"],
  },
  {
    name: "Pro Service Request",
    screens: 7,
    friction: "High",
    status: "critical",
    issues: ["Too many steps", "Category selection confusing", "No progress indicator"],
  },
  {
    name: "Realtor Matching",
    screens: 12,
    friction: "Critical",
    status: "critical",
    issues: ["12 screens is excessive", "Questions feel repetitive", "High abandonment risk"],
  },
  {
    name: "Messaging",
    screens: 3,
    friction: "Medium",
    status: "warning",
    issues: ["Thread organization unclear", "No read receipts visible"],
  },
];

const designColors = [
  { name: "Navy", hex: "#0F1233", usage: "Primary Background" },
  { name: "Blue", hex: "#3B82F6", usage: "Primary Actions" },
  { name: "Orange", hex: "#F97316", usage: "Secondary Accent" },
  { name: "Emerald", hex: "#10B981", usage: "Positive Signals" },
  { name: "Amber", hex: "#F59E0B", usage: "Warnings" },
];

const engagementFeatures = [
  { name: "Tap System", status: "implemented", effectiveness: 70 },
  { name: "Badge System", status: "implemented", effectiveness: 50 },
  { name: "Stories", status: "implemented", effectiveness: 60 },
  { name: "Wallet", status: "implemented", effectiveness: 40 },
  { name: "Social Layer", status: "missing", effectiveness: 0 },
  { name: "Personalization", status: "missing", effectiveness: 0 },
];

const recommendations = [
  { priority: "P0", title: "Badge Celebration Animations", description: "Add confetti/animations when users earn badges", impact: "High", effort: "Low" },
  { priority: "P0", title: "Streak Notifications", description: "Push notifications before streak expires", impact: "High", effort: "Low" },
  { priority: "P1", title: "Consolidate Realtor Questions", description: "Reduce from 12 screens to 3-4", impact: "High", effort: "Medium" },
  { priority: "P1", title: "Profile Stats Card", description: "Show user their contribution stats prominently", impact: "Medium", effort: "Low" },
  { priority: "P1", title: "Social Following", description: "Allow users to follow friends and see their activity", impact: "High", effort: "High" },
  { priority: "P2", title: "Personalized Discovery", description: "AI-powered place recommendations", impact: "High", effort: "High" },
  { priority: "P2", title: "Weekly Challenges", description: "Time-limited challenges with bonus rewards", impact: "Medium", effort: "Medium" },
];

const migrationAssessment = [
  {
    title: "RLS on project_requests",
    status: "safe",
    verdict: "Already Done",
    description: "RLS is already enabled with 5 comprehensive policies",
    details: [
      "Users can view their own project requests",
      "Matched pros can view project requests",
      "Users can create project requests",
      "Users can update their own project requests",
      "Service role has full access",
    ],
  },
  {
    title: "Remove pros table",
    status: "critical",
    verdict: "High Risk",
    description: "6 FK dependencies + 4 DB functions + code refs",
    details: [
      "Foreign keys: project_bids, pro_categories, pro_service_areas, pro_availability, pro_request_matches, pro_subscription_history",
      "Functions: find_pros_by_zip, update_expired_pro_subscriptions, update_pros_updated_at_column, match_pros_to_lead",
      "Code: ProsManageProfileScreen.tsx (2 queries)",
    ],
  },
  {
    title: "Remove leads table",
    status: "warning",
    verdict: "Medium Risk",
    description: "2 DB functions + 1 code file",
    details: [
      "Functions: match_pros_to_lead, on_lead_created",
      "Code: ProsLeadDetailScreen.tsx (1 query)",
      "Both tables currently empty - migration is technically simple",
    ],
  },
];

// ============================================================================
// COMPONENT
// ============================================================================

export default function StrategicAudit() {
  const [activeTab, setActiveTab] = useState("overview");

  const tabs = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "database", label: "Database", icon: Database },
    { id: "journeys", label: "User Journeys", icon: Users },
    { id: "design", label: "Design System", icon: Palette },
    { id: "engagement", label: "Engagement", icon: TrendingUp },
    { id: "recommendations", label: "Recommendations", icon: Target },
    { id: "migration", label: "Migration Risk", icon: Shield },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "solid":
      case "good":
      case "safe":
      case "implemented":
        return "text-green-400 bg-green-500/10 border-green-500/30";
      case "warning":
      case "medium":
        return "text-amber-400 bg-amber-500/10 border-amber-500/30";
      case "critical":
      case "missing":
        return "text-red-400 bg-red-500/10 border-red-500/30";
      default:
        return "text-white/60 bg-white/5 border-white/10";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "solid":
      case "good":
      case "safe":
      case "implemented":
        return <CheckCircle2 className="h-4 w-4 text-green-400" />;
      case "warning":
      case "medium":
        return <AlertTriangle className="h-4 w-4 text-amber-400" />;
      case "critical":
      case "missing":
        return <XCircle className="h-4 w-4 text-red-400" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Strategic Audit</h1>
          <p className="text-white/60">System health, recommendations, and migration risk assessment</p>
        </div>
        <Badge className="bg-gradient-to-r from-orange-500/20 to-orange-600/20 text-orange-400 border-orange-500/30 w-fit">
          <Clock className="w-3 h-3 mr-1" />
          Last Updated: January 2026
        </Badge>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? "default" : "outline"}
            onClick={() => setActiveTab(tab.id)}
            size="sm"
            className={
              activeTab === tab.id
                ? "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
                : "border-white/20 text-white/70 hover:bg-white/10 hover:text-white hover:border-white/30"
            }
          >
            <tab.icon className="mr-2 h-4 w-4" />
            {tab.label}
          </Button>
        ))}
      </div>

      {/* ========== OVERVIEW TAB ========== */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Metrics */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Database Tables", value: auditMetrics.tables, icon: Database, color: "orange" },
              { label: "Total Screens", value: auditMetrics.screens, icon: Smartphone, color: "blue" },
              { label: "Platforms", value: auditMetrics.platforms, icon: Globe, color: "green" },
              { label: "GitHub Repos", value: auditMetrics.repos, icon: Layers, color: "purple" },
            ].map((metric) => (
              <Card key={metric.label} className="bg-[#1a1f4e]/60 border-white/10 backdrop-blur">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-white/70">{metric.label}</CardTitle>
                  <metric.icon className={`h-4 w-4 text-${metric.color}-400`} />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-white">{metric.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Executive Summary */}
          <Card className="bg-[#1a1f4e]/60 border-white/10 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <FileText className="h-5 w-5 text-orange-400" />
                Executive Summary
              </CardTitle>
              <CardDescription className="text-white/50">
                This comprehensive audit analyzed the entire Tavvy ecosystem across iOS, Android, Web, Admin, and Pros platforms.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(executiveSummary).map(([key, data]) => (
                  <div
                    key={key}
                    className={`p-4 rounded-lg border ${getStatusColor(data.status)}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-white capitalize">
                        {key.replace(/([A-Z])/g, " $1").trim()}
                      </span>
                      <Badge variant="outline" className={getStatusColor(data.status)}>
                        {getStatusIcon(data.status)}
                        <span className="ml-1">{data.label}</span>
                      </Badge>
                    </div>
                    <p className="text-sm text-white/60">{data.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Recommendations */}
          <Card className="bg-[#1a1f4e]/60 border-white/10 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Target className="h-5 w-5 text-orange-400" />
                Top 3 Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recommendations.slice(0, 3).map((rec, i) => (
                <div
                  key={rec.title}
                  className="flex items-center justify-between p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/5"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-orange-500/20 to-orange-600/20 text-orange-400 font-bold">
                      {i + 1}
                    </div>
                    <div>
                      <p className="font-medium text-white">{rec.title}</p>
                      <p className="text-sm text-white/50">{rec.description}</p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      rec.priority === "P0"
                        ? "bg-red-500/10 text-red-400 border-red-500/30"
                        : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                    }
                  >
                    {rec.priority}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========== DATABASE TAB ========== */}
      {activeTab === "database" && (
        <div className="space-y-6">
          <Card className="bg-[#1a1f4e]/60 border-white/10 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Database className="h-5 w-5 text-orange-400" />
                Database Schema Overview
              </CardTitle>
              <CardDescription className="text-white/50">
                {auditMetrics.tables} tables organized across {databaseDomains.length} domains
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {databaseDomains.map((domain) => (
                  <div
                    key={domain.name}
                    className="p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-white">{domain.name}</span>
                      <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30">
                        {domain.tables} tables
                      </Badge>
                    </div>
                    <p className="text-sm text-white/50">{domain.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========== USER JOURNEYS TAB ========== */}
      {activeTab === "journeys" && (
        <div className="space-y-6">
          <Card className="bg-[#1a1f4e]/60 border-white/10 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Users className="h-5 w-5 text-orange-400" />
                User Journey Analysis
              </CardTitle>
              <CardDescription className="text-white/50">
                Friction points and optimization opportunities across key user flows
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="space-y-2">
                {userJourneys.map((journey) => (
                  <AccordionItem
                    key={journey.name}
                    value={journey.name}
                    className={`border rounded-lg px-4 ${getStatusColor(journey.status)}`}
                  >
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-4 w-full">
                        {getStatusIcon(journey.status)}
                        <span className="font-medium text-white">{journey.name}</span>
                        <div className="flex gap-2 ml-auto mr-4">
                          <Badge variant="outline" className="bg-white/5 text-white/70 border-white/20">
                            {journey.screens} screens
                          </Badge>
                          <Badge
                            variant="outline"
                            className={
                              journey.friction === "Low"
                                ? "bg-green-500/10 text-green-400 border-green-500/30"
                                : journey.friction === "High" || journey.friction === "Critical"
                                ? "bg-red-500/10 text-red-400 border-red-500/30"
                                : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                            }
                          >
                            {journey.friction} Friction
                          </Badge>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="pt-2 pb-1">
                        <p className="text-sm text-white/60 mb-2">Issues identified:</p>
                        <ul className="space-y-1">
                          {journey.issues.map((issue, i) => (
                            <li key={i} className="flex items-center gap-2 text-sm text-white/70">
                              <ChevronRight className="h-3 w-3 text-orange-400" />
                              {issue}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========== DESIGN SYSTEM TAB ========== */}
      {activeTab === "design" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Color Palette */}
            <Card className="bg-[#1a1f4e]/60 border-white/10 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Brand Color Palette</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {designColors.map((color) => (
                  <div key={color.name} className="flex items-center gap-4">
                    <div
                      className="w-12 h-12 rounded-lg border border-white/20"
                      style={{ backgroundColor: color.hex }}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">{color.name}</span>
                        <code className="text-xs text-white/50 font-mono bg-white/5 px-2 py-0.5 rounded">
                          {color.hex}
                        </code>
                      </div>
                      <p className="text-sm text-white/50">{color.usage}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Typography */}
            <Card className="bg-[#1a1f4e]/60 border-white/10 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Typography Scale</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { name: "Large Title", size: "34px", weight: "700" },
                  { name: "Title 1", size: "28px", weight: "700" },
                  { name: "Title 2", size: "22px", weight: "700" },
                  { name: "Headline", size: "17px", weight: "600" },
                  { name: "Body", size: "17px", weight: "400" },
                  { name: "Caption", size: "12px", weight: "400" },
                ].map((type) => (
                  <div key={type.name} className="flex items-center justify-between">
                    <span className="text-white" style={{ fontSize: type.size, fontWeight: type.weight }}>
                      {type.name}
                    </span>
                    <code className="text-xs text-white/50 font-mono">
                      {type.size} / {type.weight}
                    </code>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Consistency Issues */}
          <Card className="bg-[#1a1f4e]/60 border-white/10 backdrop-blur border-amber-500/30">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
                Design Consistency Issues
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { title: "Color System Divergence", description: "Mobile uses hex colors, web uses oklch color space", severity: "Medium" },
                  { title: "Legacy Color Support", description: "Deprecated Colors export still in use alongside useTheme()", severity: "Low" },
                  { title: "Signal Color Naming", description: "Multiple naming conventions: signalPros, signalPositive, positive", severity: "Medium" },
                  { title: "Component Library Differences", description: "Mobile uses custom components, Web uses shadcn/ui", severity: "High" },
                ].map((issue, i) => (
                  <div key={i} className="p-4 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-white">{issue.title}</span>
                      <Badge
                        variant="outline"
                        className={
                          issue.severity === "High"
                            ? "bg-red-500/10 text-red-400 border-red-500/30"
                            : issue.severity === "Medium"
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                            : "bg-blue-500/10 text-blue-400 border-blue-500/30"
                        }
                      >
                        {issue.severity}
                      </Badge>
                    </div>
                    <p className="text-sm text-white/50">{issue.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========== ENGAGEMENT TAB ========== */}
      {activeTab === "engagement" && (
        <div className="space-y-6">
          <Card className="bg-[#1a1f4e]/60 border-white/10 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-orange-400" />
                Engagement Features Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {engagementFeatures.map((feature) => (
                  <div key={feature.name} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(feature.status)}
                        <span className="font-medium text-white">{feature.name}</span>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          feature.status === "implemented"
                            ? "bg-green-500/10 text-green-400 border-green-500/30"
                            : "bg-red-500/10 text-red-400 border-red-500/30"
                        }
                      >
                        {feature.status === "implemented" ? "Implemented" : "Missing"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <Progress
                        value={feature.effectiveness}
                        className="h-2 bg-white/10"
                      />
                      <span className="text-sm text-white/50 w-12">{feature.effectiveness}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Badge System */}
          <Card className="bg-[#1a1f4e]/60 border-white/10 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Award className="h-5 w-5 text-orange-400" />
                Badge System
              </CardTitle>
              <CardDescription className="text-white/50">
                Current gamification badges and their unlock criteria
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { name: "First Tap", icon: "👆", criteria: "Submit first review" },
                  { name: "Explorer", icon: "🧭", criteria: "Visit 10 places" },
                  { name: "Streak Master", icon: "🔥", criteria: "7-day streak" },
                  { name: "Storyteller", icon: "📖", criteria: "Post 5 stories" },
                  { name: "Local Expert", icon: "🏆", criteria: "50 reviews in one city" },
                  { name: "Social Butterfly", icon: "🦋", criteria: "Follow 20 users" },
                  { name: "Early Bird", icon: "🐦", criteria: "Review before 8am" },
                  { name: "Night Owl", icon: "🦉", criteria: "Review after 10pm" },
                ].map((badge) => (
                  <div
                    key={badge.name}
                    className="p-4 rounded-lg bg-white/5 border border-white/10 text-center hover:bg-white/10 transition-colors"
                  >
                    <div className="text-3xl mb-2">{badge.icon}</div>
                    <p className="font-medium text-white text-sm">{badge.name}</p>
                    <p className="text-xs text-white/50 mt-1">{badge.criteria}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========== RECOMMENDATIONS TAB ========== */}
      {activeTab === "recommendations" && (
        <div className="space-y-6">
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="bg-white/5 border border-white/10">
              <TabsTrigger value="all" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">
                All
              </TabsTrigger>
              <TabsTrigger value="p0" className="data-[state=active]:bg-red-500 data-[state=active]:text-white">
                P0 - Critical
              </TabsTrigger>
              <TabsTrigger value="p1" className="data-[state=active]:bg-amber-500 data-[state=active]:text-white">
                P1 - Important
              </TabsTrigger>
              <TabsTrigger value="p2" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
                P2 - Nice to Have
              </TabsTrigger>
            </TabsList>

            {["all", "p0", "p1", "p2"].map((tab) => (
              <TabsContent key={tab} value={tab}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  {recommendations
                    .filter((rec) => tab === "all" || rec.priority.toLowerCase() === tab)
                    .map((rec) => (
                      <Card key={rec.title} className="bg-[#1a1f4e]/60 border-white/10 backdrop-blur">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-3">
                            <Badge
                              variant="outline"
                              className={
                                rec.priority === "P0"
                                  ? "bg-red-500/10 text-red-400 border-red-500/30"
                                  : rec.priority === "P1"
                                  ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                                  : "bg-blue-500/10 text-blue-400 border-blue-500/30"
                              }
                            >
                              {rec.priority}
                            </Badge>
                            <div className="flex gap-2">
                              <Badge variant="outline" className="bg-white/5 text-white/60 border-white/20 text-xs">
                                Impact: {rec.impact}
                              </Badge>
                              <Badge variant="outline" className="bg-white/5 text-white/60 border-white/20 text-xs">
                                Effort: {rec.effort}
                              </Badge>
                            </div>
                          </div>
                          <h3 className="font-semibold text-lg text-white mb-2">{rec.title}</h3>
                          <p className="text-sm text-white/60">{rec.description}</p>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>

          {/* Implementation Timeline */}
          <Card className="bg-[#1a1f4e]/60 border-white/10 backdrop-blur mt-8">
            <CardHeader>
              <CardTitle className="text-white">Suggested Implementation Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                {[
                  { phase: "Quick Wins", time: "1-2 weeks", items: ["Badge celebrations", "Streak notifications", "Profile stats card"] },
                  { phase: "Medium-Term", time: "1-2 months", items: ["Social layer", "Personalized discovery", "Weekly challenges"] },
                  { phase: "Strategic", time: "3-6 months", items: ["Tavvy Levels", "Local leaderboards", "Creator program"] },
                ].map((phase, i) => (
                  <div key={phase.phase} className="flex gap-6 mb-8 last:mb-0">
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500/20 to-orange-600/20 flex items-center justify-center">
                        <span className="text-lg font-bold text-orange-400">{i + 1}</span>
                      </div>
                      {i < 2 && <div className="w-0.5 h-full bg-white/10 mt-2" />}
                    </div>
                    <div className="flex-1 pb-8">
                      <div className="flex items-center gap-3 mb-3">
                        <h4 className="font-semibold text-lg text-white">{phase.phase}</h4>
                        <Badge variant="outline" className="bg-white/5 text-white/60 border-white/20">
                          {phase.time}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {phase.items.map((item) => (
                          <Badge key={item} className="bg-white/10 text-white/70 border-0">
                            {item}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========== MIGRATION RISK TAB ========== */}
      {activeTab === "migration" && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {migrationAssessment.map((item) => (
              <Card
                key={item.title}
                className={`bg-[#1a1f4e]/60 backdrop-blur ${
                  item.status === "safe"
                    ? "border-green-500/30"
                    : item.status === "critical"
                    ? "border-red-500/30"
                    : "border-amber-500/30"
                }`}
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    {getStatusIcon(item.status)}
                    <Badge variant="outline" className={getStatusColor(item.status)}>
                      {item.verdict}
                    </Badge>
                  </div>
                  <h3 className="font-semibold text-white mb-2">{item.title}</h3>
                  <p className="text-sm text-white/60">{item.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Detailed Analysis */}
          {migrationAssessment.map((item) => (
            <Card
              key={item.title}
              className={`bg-[#1a1f4e]/60 border-white/10 backdrop-blur ${
                item.status === "safe"
                  ? "border-green-500/30"
                  : item.status === "critical"
                  ? "border-red-500/30"
                  : "border-amber-500/30"
              }`}
            >
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  {getStatusIcon(item.status)}
                  {item.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={`p-4 rounded-lg mb-4 ${
                    item.status === "safe"
                      ? "bg-green-500/10 border border-green-500/30"
                      : item.status === "critical"
                      ? "bg-red-500/10 border border-red-500/30"
                      : "bg-amber-500/10 border border-amber-500/30"
                  }`}
                >
                  <p
                    className={`font-medium ${
                      item.status === "safe"
                        ? "text-green-400"
                        : item.status === "critical"
                        ? "text-red-400"
                        : "text-amber-400"
                    }`}
                  >
                    {item.status === "safe"
                      ? "✅ NO ACTION NEEDED"
                      : item.status === "critical"
                      ? "⚠️ HIGH RISK - DO NOT DROP WITHOUT MIGRATION"
                      : "⚠️ MEDIUM RISK - MIGRATION REQUIRED"}
                  </p>
                </div>
                <div className="space-y-2">
                  {item.details.map((detail, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-white/70">
                      <ChevronRight className="h-4 w-4 text-orange-400 mt-0.5 shrink-0" />
                      <span>{detail}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Critical Questions */}
          <Card className="bg-[#1a1f4e]/60 border-white/10 backdrop-blur border-blue-500/30">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-blue-400" />
                Critical Questions Before Proceeding
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                {
                  question: "Are pros and pro_providers meant to serve different purposes?",
                  context: "pros links to Foursquare places, pro_providers links to users. Is this intentional?",
                },
                {
                  question: "Is the match_pros_to_lead function actively used?",
                  context: "If yes, it needs to be rewritten before dropping pros or leads tables.",
                },
                {
                  question: "What is the relationship between leads and project_requests?",
                  context: "Are they the same concept at different stages, or fundamentally different entities?",
                },
              ].map((item, i) => (
                <div key={i} className="p-4 rounded-lg bg-white/5 border border-white/10">
                  <h4 className="font-semibold text-white mb-2">
                    {i + 1}. {item.question}
                  </h4>
                  <p className="text-sm text-white/60">{item.context}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
