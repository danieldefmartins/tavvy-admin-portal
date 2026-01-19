import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  FileText
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

export default function AuditLog() {
  const [limit, setLimit] = useState<number>(100);

  const { data: logs, isLoading } = trpc.auditLog.getAll.useQuery({ limit });

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

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Activity History</CardTitle>
              <CardDescription>
                All admin actions are logged for security and compliance
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
          ) : logs && logs.length > 0 ? (
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
                  {logs.map((log) => {
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
              <p className="text-muted-foreground">No audit log entries found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      {logs && logs.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{logs.length}</div>
              <p className="text-xs text-muted-foreground">in selected period</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Approvals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {logs.filter(l => l.action_type.includes("approved") || l.action_type.includes("verified")).length}
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
                {logs.filter(l => l.action_type.includes("rejected") || l.action_type.includes("actioned")).length}
              </div>
              <p className="text-xs text-muted-foreground">claims, content, flags</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
