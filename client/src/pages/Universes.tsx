import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { 
  Search, 
  Plus, 
  Globe, 
  Loader2, 
  Pencil, 
  Trash2, 
  Image as ImageIcon,
  Palette,
  Eye
} from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import ImageUpload from "@/components/ImageUpload";

interface Universe {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  thumbnail_image_url: string | null;
  banner_image_url: string | null;
  location: string | null;
  is_featured: boolean;
  status: string;
  created_at: string;
}

export default function Universes() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedUniverse, setSelectedUniverse] = useState<Universe | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    thumbnail_image_url: "",
    banner_image_url: "",
    location: "",
    is_featured: false,
    status: "active",
  });

  // Queries
  const { data: universes, isLoading, refetch } = trpc.universes.getAll.useQuery();

  // Mutations
  const createMutation = trpc.universes.create.useMutation({
    onSuccess: () => {
      toast.success("Universe created successfully!");
      setIsCreateDialogOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const updateMutation = trpc.universes.update.useMutation({
    onSuccess: () => {
      toast.success("Universe updated successfully!");
      setIsEditDialogOpen(false);
      setSelectedUniverse(null);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const deleteMutation = trpc.universes.delete.useMutation({
    onSuccess: () => {
      toast.success("Universe deleted successfully!");
      refetch();
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      slug: "",
      description: "",
      thumbnail_image_url: "",
      banner_image_url: "",
      location: "",
      is_featured: false,
      status: "active",
    });
  };

  const handleCreate = () => {
    if (!formData.name || !formData.slug) {
      toast.error("Name and slug are required");
      return;
    }
    createMutation.mutate(formData);
  };

  const handleUpdate = () => {
    if (!selectedUniverse) return;
    updateMutation.mutate({ id: selectedUniverse.id, ...formData });
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this universe? This may affect related articles.")) {
      deleteMutation.mutate({ id });
    }
  };

  const openEditDialog = (universe: Universe) => {
    setSelectedUniverse(universe);
    setFormData({
      name: universe.name,
      slug: universe.slug,
      description: universe.description || "",
      thumbnail_image_url: universe.thumbnail_image_url || "",
      banner_image_url: universe.banner_image_url || "",
      location: universe.location || "",
      is_featured: universe.is_featured,
      status: universe.status || "active",
    });
    setIsEditDialogOpen(true);
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  const filteredUniverses = universes?.filter(
    (universe) =>
      universe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      universe.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const UniverseForm = ({ isEdit = false }: { isEdit?: boolean }) => (
    <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Universe Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => {
              setFormData({ 
                ...formData, 
                name: e.target.value,
                slug: isEdit ? formData.slug : generateSlug(e.target.value)
              });
            }}
            placeholder="Disney World"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="slug">Slug *</Label>
          <Input
            id="slug"
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            placeholder="disney-world"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="A brief description of this universe..."
          rows={3}
        />
      </div>

      {/* Thumbnail Image with Upload */}
      <ImageUpload
        value={formData.thumbnail_image_url}
        onChange={(url) => setFormData({ ...formData, thumbnail_image_url: url })}
        bucket="universe-images"
        folder="thumbnails"
        label="Thumbnail Image"
        placeholder="Enter thumbnail URL or upload a file"
      />

      {/* Banner Image with Upload */}
      <ImageUpload
        value={formData.banner_image_url}
        onChange={(url) => setFormData({ ...formData, banner_image_url: url })}
        bucket="universe-images"
        folder="banners"
        label="Banner Image"
        placeholder="Enter banner URL or upload a file"
      />

      <div className="space-y-2">
        <Label htmlFor="location">Location</Label>
        <Input
          id="location"
          value={formData.location}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          placeholder="e.g., Orlando, FL"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Featured</Label>
          <div className="flex items-center h-10">
            <input
              type="checkbox"
              checked={formData.is_featured}
              onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300"
            />
            <span className="ml-2 text-sm">Featured universe</span>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Universes</h1>
          <p className="text-muted-foreground">Manage universes (theme parks, brands, etc.)</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setIsCreateDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Universe
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Universe</DialogTitle>
              <DialogDescription>
                Add a new universe to the platform. Fill in the details below.
              </DialogDescription>
            </DialogHeader>
            <UniverseForm />
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Universe
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search universes by name or slug..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Universes Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Universes</CardTitle>
          <CardDescription>
            {filteredUniverses?.length || 0} universes found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredUniverses?.length === 0 ? (
            <div className="text-center py-12">
              <Globe className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No universes found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery ? "Try a different search term" : "Get started by creating your first universe"}
              </p>
              {!searchQuery && (
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Universe
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">Image</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUniverses?.map((universe) => (
                  <TableRow key={universe.id}>
                    <TableCell>
                      {universe.thumbnail_image_url ? (
                        <img 
                          src={universe.thumbnail_image_url} 
                          alt={universe.name}
                          className="w-10 h-10 rounded object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                          <ImageIcon className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {universe.name}
                        {universe.is_featured && (
                          <Badge variant="secondary" className="text-xs">
                            <Palette className="h-3 w-3 mr-1" />
                            Featured
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{universe.slug}</TableCell>
                    <TableCell className="text-muted-foreground">{universe.location || "-"}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={
                          universe.status === "active" ? "default" : 
                          universe.status === "draft" ? "secondary" : "outline"
                        }
                      >
                        {universe.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => setLocation(`/universes/${universe.id}`)}
                          title="View planets & places"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => openEditDialog(universe)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleDelete(universe.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Universe</DialogTitle>
            <DialogDescription>
              Update the universe details below.
            </DialogDescription>
          </DialogHeader>
          <UniverseForm isEdit />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
