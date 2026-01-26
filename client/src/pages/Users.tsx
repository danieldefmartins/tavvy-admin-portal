import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Users as UsersIcon,
  Search,
  MoreVertical,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Ban,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Trophy,
  Star,
  Flame,
  Mail,
  Phone,
  Calendar,
  Eye,
  UserPlus,
  Trash2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Edit,
  Save,
} from "lucide-react";

const AVAILABLE_ROLES = [
  { value: "super_admin", label: "Super Admin", description: "Full system access" },
  { value: "admin", label: "Admin", description: "Administrative access" },
  { value: "moderator", label: "Moderator", description: "Content moderation" },
  { value: "field_rep", label: "Field Rep", description: "Field data collection" },
  { value: "pro", label: "Pro", description: "Professional provider" },
  { value: "realtor", label: "Realtor", description: "Real estate agent" },
];

const STRIKE_REASONS = [
  "Inappropriate content",
  "Spam or misleading information",
  "Harassment or abuse",
  "Violation of community guidelines",
  "Fraudulent activity",
  "Other",
];

export default function Users() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [showStrikeDialog, setShowStrikeDialog] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [newRole, setNewRole] = useState("");
  const [strikeReason, setStrikeReason] = useState("");
  const [customStrikeReason, setCustomStrikeReason] = useState("");
  
  // Edit form state
  const [editForm, setEditForm] = useState({
    display_name: "",
    username: "",
    email: "",
    bio: "",
    is_pro: false,
    trusted_contributor: false,
  });
  
  const limit = 50;

  // Queries
  const { data: stats, isLoading: statsLoading } = trpc.users.getStats.useQuery();
  const { data: usersData, isLoading: usersLoading, refetch: refetchUsers } = trpc.users.getAll.useQuery({
    limit,
    offset: page * limit,
    search: debouncedSearch || undefined,
  });
  const { data: selectedUser, isLoading: userLoading, refetch: refetchSelectedUser } = trpc.users.getById.useQuery(
    { id: selectedUserId! },
    { enabled: !!selectedUserId }
  );
  const { data: userRoles, refetch: refetchRoles } = trpc.users.getRoles.useQuery(
    { userId: selectedUserId! },
    { enabled: !!selectedUserId }
  );
  const { data: userStrikes, refetch: refetchStrikes } = trpc.users.getStrikes.useQuery(
    { userId: selectedUserId! },
    { enabled: !!selectedUserId }
  );
  const { data: userGamification } = trpc.users.getGamification.useQuery(
    { userId: selectedUserId! },
    { enabled: !!selectedUserId }
  );
  const { data: isBlocked, refetch: refetchBlocked } = trpc.users.isBlocked.useQuery(
    { userId: selectedUserId! },
    { enabled: !!selectedUserId }
  );

  // Mutations
  const addRoleMutation = trpc.users.addRole.useMutation({
    onSuccess: () => {
      toast.success("Role added successfully");
      refetchRoles();
      setShowRoleDialog(false);
      setNewRole("");
    },
    onError: (error) => {
      toast.error(`Failed to add role: ${error.message}`);
    },
  });

  const removeRoleMutation = trpc.users.removeRole.useMutation({
    onSuccess: () => {
      toast.success("Role removed successfully");
      refetchRoles();
    },
    onError: (error) => {
      toast.error(`Failed to remove role: ${error.message}`);
    },
  });

  const addStrikeMutation = trpc.users.addStrike.useMutation({
    onSuccess: () => {
      toast.success("Strike issued successfully");
      refetchStrikes();
      setShowStrikeDialog(false);
      setStrikeReason("");
      setCustomStrikeReason("");
    },
    onError: (error) => {
      toast.error(`Failed to issue strike: ${error.message}`);
    },
  });

  const removeStrikeMutation = trpc.users.removeStrike.useMutation({
    onSuccess: () => {
      toast.success("Strike removed successfully");
      refetchStrikes();
    },
    onError: (error) => {
      toast.error(`Failed to remove strike: ${error.message}`);
    },
  });

  const blockMutation = trpc.users.block.useMutation({
    onSuccess: () => {
      toast.success("User blocked successfully");
      refetchBlocked();
      setShowBlockDialog(false);
    },
    onError: (error) => {
      toast.error(`Failed to block user: ${error.message}`);
    },
  });

  const unblockMutation = trpc.users.unblock.useMutation({
    onSuccess: () => {
      toast.success("User unblocked successfully");
      refetchBlocked();
    },
    onError: (error) => {
      toast.error(`Failed to unblock user: ${error.message}`);
    },
  });

  const updateUserMutation = trpc.users.update.useMutation({
    onSuccess: () => {
      toast.success("User updated successfully");
      refetchSelectedUser();
      refetchUsers();
      setShowEditDialog(false);
    },
    onError: (error) => {
      toast.error(`Failed to update user: ${error.message}`);
    },
  });

  const updateEmailMutation = trpc.users.updateEmail.useMutation({
    onSuccess: () => {
      toast.success("Email updated successfully");
      refetchSelectedUser();
      refetchUsers();
    },
    onError: (error) => {
      toast.error(`Failed to update email: ${error.message}`);
    },
  });

  const deleteUserMutation = trpc.users.delete.useMutation({
    onSuccess: () => {
      toast.success("User deleted successfully");
      refetchUsers();
      setShowDeleteDialog(false);
      setShowUserDialog(false);
      setSelectedUserId(null);
    },
    onError: (error) => {
      toast.error(`Failed to delete user: ${error.message}`);
    },
  });

  const handleSearch = () => {
    setDebouncedSearch(searchQuery);
    setPage(0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleViewUser = (userId: string) => {
    setSelectedUserId(userId);
    setShowUserDialog(true);
  };

  const handleEditUser = (user: any) => {
    setEditForm({
      display_name: user.display_name || "",
      username: user.username || "",
      email: user.email || "",
      bio: user.bio || "",
      is_pro: user.is_pro || false,
      trusted_contributor: user.trusted_contributor || false,
    });
    setShowEditDialog(true);
  };

  const handleSaveUser = () => {
    if (!selectedUserId) return;
    
    // Update profile data
    updateUserMutation.mutate({
      userId: selectedUserId,
      data: {
        display_name: editForm.display_name || undefined,
        username: editForm.username || undefined,
        bio: editForm.bio || undefined,
        is_pro: editForm.is_pro,
        trusted_contributor: editForm.trusted_contributor,
      },
    });

    // Update email if changed
    if (editForm.email && selectedUser?.email !== editForm.email) {
      updateEmailMutation.mutate({
        userId: selectedUserId,
        email: editForm.email,
      });
    }
  };

  const handleDeleteUser = () => {
    if (!selectedUserId) return;
    deleteUserMutation.mutate({ userId: selectedUserId });
  };

  const handleAddRole = () => {
    if (!selectedUserId || !newRole) return;
    addRoleMutation.mutate({ userId: selectedUserId, role: newRole });
  };

  const handleRemoveRole = (role: string) => {
    if (!selectedUserId) return;
    removeRoleMutation.mutate({ userId: selectedUserId, role });
  };

  const handleAddStrike = () => {
    if (!selectedUserId) return;
    const reason = strikeReason === "Other" ? customStrikeReason : strikeReason;
    if (!reason) {
      toast.error("Please provide a reason for the strike");
      return;
    }
    addStrikeMutation.mutate({ userId: selectedUserId, reason });
  };

  const handleRemoveStrike = (strikeId: string) => {
    removeStrikeMutation.mutate({ strikeId });
  };

  const handleBlockUser = () => {
    if (!selectedUserId) return;
    blockMutation.mutate({ userId: selectedUserId });
  };

  const handleUnblockUser = () => {
    if (!selectedUserId) return;
    unblockMutation.mutate({ userId: selectedUserId });
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const users = usersData?.users || [];
  const totalUsers = usersData?.total || 0;
  const totalPages = Math.ceil(totalUsers / limit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">
            Manage users, roles, strikes, and account status
          </p>
        </div>
        <Button onClick={() => refetchUsers()} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{stats?.totalUsers?.toLocaleString() || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pro Users</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{stats?.verifiedUsers?.toLocaleString() || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Today</CardTitle>
            <Calendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{stats?.activeToday?.toLocaleString() || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New This Week</CardTitle>
            <UserPlus className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{stats?.newThisWeek?.toLocaleString() || 0}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Search and Users List */}
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>Search and manage user accounts</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pl-10"
              />
            </div>
            <Button onClick={handleSearch}>Search</Button>
          </div>

          {usersLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No users found
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Last Active</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                            {user.avatar_url ? (
                              <img
                                src={user.avatar_url}
                                alt={user.display_name || "User"}
                                className="h-10 w-10 rounded-full object-cover"
                              />
                            ) : (
                              <UsersIcon className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{user.display_name || "No name"}</p>
                            <p className="text-sm text-muted-foreground">{user.email || "No email"}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">@{user.username || "—"}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {user.is_pro && (
                            <Badge variant="default" className="bg-purple-500">Pro</Badge>
                          )}
                          {user.trusted_contributor && (
                            <Badge variant="secondary">Trusted</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{formatDate(user.created_at)}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">{formatDate(user.last_login_at)}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewUser(user.id)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setSelectedUserId(user.id);
                              handleEditUser(user);
                            }}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit User
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedUserId(user.id);
                                setShowRoleDialog(true);
                              }}
                            >
                              <Shield className="h-4 w-4 mr-2" />
                              Manage Roles
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedUserId(user.id);
                                setShowStrikeDialog(true);
                              }}
                            >
                              <AlertTriangle className="h-4 w-4 mr-2" />
                              Issue Strike
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedUserId(user.id);
                                setShowBlockDialog(true);
                              }}
                              className="text-red-600"
                            >
                              <Ban className="h-4 w-4 mr-2" />
                              Block User
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedUserId(user.id);
                                setShowDeleteDialog(true);
                              }}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete User
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {page + 1} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(Math.max(0, page - 1))}
                      disabled={page === 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                      disabled={page >= totalPages - 1}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* User Details Dialog */}
      <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>User Details</span>
              {selectedUser && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEditUser(selectedUser)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </DialogTitle>
            <DialogDescription>
              View and manage user information
            </DialogDescription>
          </DialogHeader>

          {userLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : selectedUser ? (
            <Tabs defaultValue="info" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="info">Info</TabsTrigger>
                <TabsTrigger value="roles">Roles</TabsTrigger>
                <TabsTrigger value="strikes">Strikes</TabsTrigger>
                <TabsTrigger value="gamification">Gamification</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Display Name</Label>
                    <p className="font-medium">{selectedUser.display_name || "Not set"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Username</Label>
                    <p className="font-medium">@{selectedUser.username || "Not set"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Email</Label>
                    <p className="font-medium">{selectedUser.email || "Not set"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Phone</Label>
                    <p className="font-medium">{selectedUser.phone_e164 || "Not set"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">User ID</Label>
                    <p className="font-mono text-sm">{selectedUser.id}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Bio</Label>
                    <p className="font-medium">{selectedUser.bio || "Not set"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Joined</Label>
                    <p className="font-medium">{formatDate(selectedUser.created_at)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Last Active</Label>
                    <p className="font-medium">{formatDate(selectedUser.last_login_at)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Pro Status</Label>
                    <p>{selectedUser.is_pro ? <Badge className="bg-purple-500">Pro</Badge> : "No"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Trusted Contributor</Label>
                    <p>{selectedUser.trusted_contributor ? <Badge variant="secondary">Yes</Badge> : "No"}</p>
                  </div>
                </div>

                {isBlocked && (
                  <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <div className="flex items-center gap-2 text-red-600">
                      <Ban className="h-5 w-5" />
                      <span className="font-medium">This user is blocked</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={handleUnblockUser}
                    >
                      Unblock User
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="roles" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">Current Roles</h4>
                  <Button size="sm" onClick={() => setShowRoleDialog(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Role
                  </Button>
                </div>

                {userRoles && userRoles.length > 0 ? (
                  <div className="space-y-2">
                    {userRoles.map((role) => (
                      <div
                        key={role.id}
                        className="flex items-center justify-between p-3 bg-muted rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <ShieldCheck className="h-5 w-5 text-green-500" />
                          <div>
                            <p className="font-medium capitalize">{role.role.replace("_", " ")}</p>
                            <p className="text-xs text-muted-foreground">
                              Granted: {formatDate(role.granted_at)}
                              {role.expires_at && ` • Expires: ${formatDate(role.expires_at)}`}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveRole(role.role)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">No roles assigned</p>
                )}
              </TabsContent>

              <TabsContent value="strikes" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">Strike History</h4>
                  <Button size="sm" variant="destructive" onClick={() => setShowStrikeDialog(true)}>
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Issue Strike
                  </Button>
                </div>

                {userStrikes && userStrikes.length > 0 ? (
                  <div className="space-y-2">
                    {userStrikes.map((strike) => (
                      <div
                        key={strike.id}
                        className="flex items-center justify-between p-3 bg-red-500/10 border border-red-500/20 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <ShieldAlert className="h-5 w-5 text-red-500" />
                          <div>
                            <p className="font-medium">{strike.reason}</p>
                            <p className="text-xs text-muted-foreground">
                              Issued: {formatDate(strike.created_at)}
                              {strike.expires_at && ` • Expires: ${formatDate(strike.expires_at)}`}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveStrike(strike.id)}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">No strikes on record</p>
                )}
              </TabsContent>

              <TabsContent value="gamification" className="space-y-4">
                {userGamification ? (
                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Trophy className="h-4 w-4 text-yellow-500" />
                          Total Points
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold">{userGamification.total_points?.toLocaleString() || 0}</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Star className="h-4 w-4 text-blue-500" />
                          Total Taps
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold">{userGamification.total_taps?.toLocaleString() || 0}</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Flame className="h-4 w-4 text-orange-500" />
                          Current Streak
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold">{userGamification.current_streak || 0} days</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Flame className="h-4 w-4 text-red-500" />
                          Longest Streak
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold">{userGamification.longest_streak || 0} days</p>
                      </CardContent>
                    </Card>

                    {userGamification.badges && userGamification.badges.length > 0 && (
                      <div className="col-span-2">
                        <Label className="text-muted-foreground">Badges</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {userGamification.badges.map((badge, i) => (
                            <Badge key={i} variant="secondary">
                              {badge}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">No gamification data available</p>
                )}
              </TabsContent>
            </Tabs>
          ) : (
            <p className="text-muted-foreground">User not found</p>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user profile information
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="display_name">Display Name</Label>
              <Input
                id="display_name"
                value={editForm.display_name}
                onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
                placeholder="Enter display name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={editForm.username}
                onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                placeholder="Enter username"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                placeholder="Enter email address"
              />
              <p className="text-xs text-muted-foreground">
                Changing email will update the user's login credentials
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={editForm.bio}
                onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                placeholder="Enter user bio"
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="is_pro">Pro Status</Label>
                <p className="text-xs text-muted-foreground">Grant Pro privileges to this user</p>
              </div>
              <Switch
                id="is_pro"
                checked={editForm.is_pro}
                onCheckedChange={(checked) => setEditForm({ ...editForm, is_pro: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="trusted_contributor">Trusted Contributor</Label>
                <p className="text-xs text-muted-foreground">Mark as trusted contributor</p>
              </div>
              <Switch
                id="trusted_contributor"
                checked={editForm.trusted_contributor}
                onCheckedChange={(checked) => setEditForm({ ...editForm, trusted_contributor: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveUser} 
              disabled={updateUserMutation.isPending || updateEmailMutation.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              {updateUserMutation.isPending || updateEmailMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Role Dialog */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Role</DialogTitle>
            <DialogDescription>
              Assign a new role to this user
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Role</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a role" />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_ROLES.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      <div>
                        <span className="font-medium">{role.label}</span>
                        <span className="text-muted-foreground ml-2">- {role.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRoleDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddRole} disabled={!newRole || addRoleMutation.isPending}>
              {addRoleMutation.isPending ? "Adding..." : "Add Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Issue Strike Dialog */}
      <Dialog open={showStrikeDialog} onOpenChange={setShowStrikeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Issue Strike</DialogTitle>
            <DialogDescription>
              Issue a warning strike to this user for policy violations
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Reason</Label>
              <Select value={strikeReason} onValueChange={setStrikeReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  {STRIKE_REASONS.map((reason) => (
                    <SelectItem key={reason} value={reason}>
                      {reason}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {strikeReason === "Other" && (
              <div className="space-y-2">
                <Label>Custom Reason</Label>
                <Textarea
                  placeholder="Describe the reason for this strike..."
                  value={customStrikeReason}
                  onChange={(e) => setCustomStrikeReason(e.target.value)}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStrikeDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleAddStrike}
              disabled={!strikeReason || (strikeReason === "Other" && !customStrikeReason) || addStrikeMutation.isPending}
            >
              {addStrikeMutation.isPending ? "Issuing..." : "Issue Strike"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Block User Dialog */}
      <AlertDialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Block User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to block this user? They will no longer be able to access the platform.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBlockUser}
              className="bg-red-600 hover:bg-red-700"
            >
              {blockMutation.isPending ? "Blocking..." : "Block User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete User Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete this user? This action cannot be undone and will remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteUserMutation.isPending ? "Deleting..." : "Delete User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
