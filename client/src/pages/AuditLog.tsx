import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { 
  History, 
  Loader2,
  User,
  CheckCircle2,
  XCircle,
  Edit,
  Eye,
  Shield,
  FileText,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  X
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const actionTypeConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  claim_verified: { label: "Claim Approved", icon: <CheckCircle2 className="h-4 w-4" />, color: "text-green-600" },
  claim_rejected: { label: "Claim Rejected", icon: <XCircle className="h-4 w-4" />, color: "text-red-600" },
  flag_reviewed: { label: "Flag Reviewed", icon: <Eye className="h-4 w-4" />, color: "text-blue-600" },
  flag_dismissed: { label: "Flag Dismissed", icon: <XCircle className="h-4 w-4" />, color: "text-gray-600" },
  flag_actioned: { label: "Flag Actioned", icon: <Shield className="h-4 w-4" />, color: "text-orange-600" },
  moderation_approved: { label: "Content Approved", icon: <CheckCircle2 className="h-4 w-4" />, color: "text-green-600" },
  moderation_rejected: { label: "Content Rejected", icon: <XCircle className="h-4 w-4" />, color: "text-red-600" },
  override_created: { label: "Override Created", icon: <Edit className="h-4 w-4" />, color: "text-purple-600" },
  override_approved: { label: "Override Approved", icon: <CheckCircle2 className="h-4 w-4" />, color: "text-green-600" },
  override_rejected: { label: "Override Rejected", icon: <XCircle className="h-4 w-4" />, color: "text-red-600" },
  login: { label: "Login", icon: <User className="h-4 w-4" />, color: "text-blue-600" },
  default: { label: "Action", icon: <FileText className="h-4 w-4" />, color: "text-gray-600" },
};

const targetTypeLabels: Record<string, string> = {
  business_claim: "Business Claim",
  content_flag: "Content Flag",
  moderation_item: "Moderation Item",
  place_override: "Place Override",
  place: "Place",
  user: "User",
  review: "Review",
};

const actionTypes = [
  "claim_verified",
  "claim_rejected",
  "flag_reviewed",
  "flag_dismissed",
  "flag_actioned",
  "moderation_approved",
  "moderation_rejected",
  "override_created",
  "override_approved",
  "override_rejected",
  "login",
];

const targetTypes = [
  "business_claim",
  "content_flag",
  "moderation_item",
  "place_override",
  "place",
  "user",
  "review",
];

export default function AuditLog() {
  const [limit, setLimit] = useState<number>(100);
  
  // Search/filter state
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    actionType: "",
    targetType: "",
    adminId: "",
    targetId: "",
    notes: "",
  });

  const { data: logs, isLoading } = trpc.auditLog.getAll.useQuery({ limit });

  // Filter logs client-side
  const filteredLogs = useMemo(() => {
    if (!logs) return [];
    return logs.filter(log => {
      if (filters.actionType && log.action_type !== filters.actionType) return false;
      if (filters.targetType && log.target_type !== filters.targetType) return false;
      if (filters.adminId && !log.admin_id?.toLowerCase().includes(filters.adminId.toLowerCase())) return false;
      if (filters.targetId && !log.target_id?.toLowerCase().includes(filters.targetId.toLowerCase())) return false;
      if (filters.notes && !log.notes?.toLowerCase().includes(filters.notes.toLowerCase())) return false;
      return true;
    });
  }, [logs, filters]);

  const hasActiveFilters = Object.values(filters).some(v => v.length > 0);
  const activeFilterCount = Object.values(filters).filter(v => v.length > 0).length;

  const handleClearFilters = () => {
    setFilters({
      actionType: "",
      targetType: "",
      adminId: "",
      targetId: "",
      notes: "",
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const getActionConfig = (actionType: string) => {
    return actionTypeConfig[actionType] || actionTypeConfig.default;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Audit Log</h1>
        <p className="text-muted-foreground">
          Track all administrative actions and changes
        </p>
      </div>

      {/* Search/Filter Card */}
      <Card>
        <CardContent className="pt-6">
          <Collapsible open={showFilters} onOpenChange={setShowFilters}>
            <div className="flex items-center justify-between">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <Filter className="h-4 w-4" />
                  Search & Filter
                  {activeFilterCount > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {activeFilterCount}
                    </Badge>
                  )}
                  {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={handleClearFilters} className="gap-2 text-muted-foreground">
                  <RotateCcw className="h-4 w-4" />
                  Clear Filters
                </Button>
              )}
            </div>

            <CollapsibleContent className="pt-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <div className="space-y-2">
                  <Label>Action Type</Label>
                  <Select value={filters.actionType} onValueChange={(v) => setFilters({ ...filters, actionType: v === "all" ? "" : v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="All actions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Actions</SelectItem>
                      {actionTypes.map(type => (
                        <SelectItem key={type} value={type}>
                          {actionTypeConfig[type]?.label || type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Target Type</Label>
                  <Select value={filters.targetType} onValueChange={(v) => setFilters({ ...filters, targetType: v === "all" ? "" : v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="All targets" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Targets</SelectItem>
                      {targetTypes.map(type => (
                        <SelectItem key={type} value={type}>
                          {targetTypeLabels[type] || type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Admin ID</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by admin..."
                      value={filters.adminId}
                      onChange={(e) => setFilters({ ...filters, adminId: e.target.value })}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Target ID</Label>
                  <Input
                    placeholder="Search by target ID..."
                    value={filters.targetId}
                    onChange={(e) => setFilters({ ...filters, targetId: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Input
                    placeholder="Search in notes..."
                    value={filters.notes}
                    onChange={(e) => setFilters({ ...filters, notes: e.target.value })}
                  />
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {filters.actionType && (
            <Badge variant="secondary" className="gap-1">
              Action: {actionTypeConfig[filters.actionType]?.label || filters.actionType}
              <X className="h-3 w-3 cursor-pointer" onClick={() => setFilters({ ...filters, actionType: "" })} />
            </Badge>
          )}
          {filters.targetType && (
            <Badge variant="secondary" className="gap-1">
              Target: {targetTypeLabels[filters.targetType] || filters.targetType}
              <X className="h-3 w-3 cursor-pointer" onClick={() => setFilters({ ...filters, targetType: "" })} />
            </Badge>
          )}
          {filters.adminId && (
            <Badge variant="secondary" className="gap-1">
              Admin: {filters.adminId}
              <X className="h-3 w-3 cursor-pointer" onClick={() => setFilters({ ...filters, adminId: "" })} />
            </Badge>
          )}
          {filters.targetId && (
            <Badge variant="secondary" className="gap-1">
              Target ID: {filters.targetId}
              <X className="h-3 w-3 cursor-pointer" onClick={() => setFilters({ ...filters, targetId: "" })} />
            </Badge>
          )}
          {filters.notes && (
            <Badge variant="secondary" className="gap-1">
              Notes: {filters.notes}
              <X className="h-3 w-3 cursor-pointer" onClick={() => setFilters({ ...filters, notes: "" })} />
            </Badge>
          )}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Activity History</CardTitle>
              <CardDescription>
                {hasActiveFilters 
                  ? `Showing ${filteredLogs.length} of ${logs?.length || 0} entries`
                  : "All admin actions are logged for security and compliance"}
              </CardDescription>
            </div>
            <Select value={limit.toString()} onValueChange={(v) => setLimit(parseInt(v))}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Show entries" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="50">Last 50</SelectItem>
                <SelectItem value="100">Last 100</SelectItem>
                <SelectItem value="250">Last 250</SelectItem>
                <SelectItem value="500">Last 500</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredLogs && filteredLogs.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">Timestamp</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Admin</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => {
                    const config = getActionConfig(log.action_type);
                    return (
                      <TableRow key={log.id}>
                        <TableCell className="font-mono text-xs">
                          {formatDate(log.created_at)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={config.color}>{config.icon}</span>
                            <span className="font-medium">{config.label}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {log.target_type && (
                            <div className="space-y-1">
                              <Badge variant="outline" className="text-xs">
                                {targetTypeLabels[log.target_type] || log.target_type}
                              </Badge>
                              {log.target_id && (
                                <p className="text-xs text-muted-foreground font-mono truncate max-w-[200px]">
                                  {log.target_id}
                                </p>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="h-3 w-3 text-primary" />
                            </div>
                            <span className="text-xs font-mono truncate max-w-[150px]">
                              {log.admin_id}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {log.notes && (
                            <span className="text-sm text-muted-foreground truncate max-w-[200px] block">
                              {log.notes}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-12 text-center">
              <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {hasActiveFilters ? "No entries match your filters" : "No audit log entries found"}
              </p>
              {hasActiveFilters && (
                <Button variant="outline" className="mt-4" onClick={handleClearFilters}>
                  Clear Filters
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      {filteredLogs && filteredLogs.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredLogs.length}</div>
              <p className="text-xs text-muted-foreground">
                {hasActiveFilters ? "matching filters" : "in selected period"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Approvals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {filteredLogs.filter(l => l.action_type.includes("approved") || l.action_type.includes("verified")).length}
              </div>
              <p className="text-xs text-muted-foreground">claims, content, overrides</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Rejections</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {filteredLogs.filter(l => l.action_type.includes("rejected") || l.action_type.includes("actioned")).length}
              </div>
              <p className="text-xs text-muted-foreground">claims, content, flags</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
