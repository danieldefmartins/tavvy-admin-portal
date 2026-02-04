import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Eye,
  MapPin,
  ChevronRight,
  Filter,
  X
} from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import ImageUpload from "@/components/ImageUpload";
import { useIsMobile } from "@/hooks/useMobile";

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
  category_id?: string | null;
  category_name?: string | null;
  category_slug?: string | null;
  parent_universe_id?: string | null;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

export default function Universes() {
  const [, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedUniverse, setSelectedUniverse] = useState<Universe | null>(null);
  
  // Filter state
  const [typeFilter, setTypeFilter] = useState<'all' | 'universes' | 'planets'>('universes');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  
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
    category_id: "",
  });

  // Queries - refetch when filters change
  const { data: universes, isLoading, refetch } = trpc.universes.getAll.useQuery(
    {
      type: typeFilter,
      categoryId: categoryFilter === 'all' ? undefined : categoryFilter,
    },
    {
      // Ensure query refetches when filters change
      refetchOnMount: true,
      staleTime: 0,
    }
  );
  
  const { data: categories } = trpc.universes.getCategories.useQuery();

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
      category_id: "",
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
      category_id: universe.category_id || "",
    });
    setIsEditDialogOpen(true);
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  const clearFilters = () => {
    setTypeFilter('universes');
    setCategoryFilter('all');
    setSearchQuery('');
  };

  const hasActiveFilters = typeFilter !== 'universes' || categoryFilter !== 'all' || searchQuery !== '';

  const filteredUniverses = universes?.filter(
    (universe) =>
      universe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      universe.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const UniverseForm = ({ isEdit = false }: { isEdit?: boolean }) => (
    <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
      <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
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
            className="h-12"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="slug">Slug *</Label>
          <Input
            id="slug"
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            placeholder="disney-world"
            className="h-12"
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

      <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            placeholder="e.g., Orlando, FL"
            className="h-12"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select 
            value={formData.category_id || "none"} 
            onValueChange={(v) => setFormData({ ...formData, category_id: v === "none" ? "" : v })}
          >
            <SelectTrigger className="h-12">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Category</SelectItem>
              {categories?.map((cat: Category) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
        <div className="space-y-2">
          <Label>Featured</Label>
          <div className="flex items-center h-12">
            <input
              type="checkbox"
              checked={formData.is_featured}
              onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
              className="h-5 w-5 rounded border-gray-300"
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
            className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>
    </div>
  );

  // Mobile Card Component for each universe
  const UniverseCard = ({ universe }: { universe: Universe }) => (
    <Card 
      className="mb-3 active:scale-[0.98] transition-transform cursor-pointer border-border/50 bg-card/50"
      onClick={() => setLocation(`/universes/${universe.id}`)}
    >
      <CardContent className="p-4">
        <div className="flex gap-3">
          {/* Thumbnail */}
          {universe.thumbnail_image_url ? (
            <img 
              src={universe.thumbnail_image_url} 
              alt={universe.name}
              className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <ImageIcon className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-semibold truncate">{universe.name}</h3>
                {universe.location && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3" />
                    {universe.location}
                  </p>
                )}
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            </div>
            
            {/* Badges */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {universe.parent_universe_id && (
                <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-400 border-blue-500/30">
                  Planet
                </Badge>
              )}
              {universe.category_name && (
                <Badge variant="outline" className="text-xs">
                  {universe.category_name}
                </Badge>
              )}
              {universe.is_featured && (
                <Badge variant="secondary" className="text-xs">
                  <Palette className="h-3 w-3 mr-1" />
                  Featured
                </Badge>
              )}
            </div>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex gap-2 mt-3 pt-3 border-t border-border/50">
          <Button 
            variant="outline" 
            size="sm"
            className="flex-1 h-10"
            onClick={(e) => {
              e.stopPropagation();
              setLocation(`/universes/${universe.id}`);
            }}
          >
            <Eye className="h-4 w-4 mr-2" />
            Manage
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            className="h-10 px-3"
            onClick={(e) => {
              e.stopPropagation();
              openEditDialog(universe);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            className="h-10 px-3"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(universe.id);
            }}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className={`flex items-center justify-between ${isMobile ? 'flex-col gap-3' : ''}`}>
        <div className={isMobile ? 'text-center w-full' : ''}>
          <h1 className={`font-bold tracking-tight ${isMobile ? 'text-2xl' : 'text-3xl'}`}>Universes</h1>
          <p className="text-muted-foreground text-sm">Manage universes (theme parks, brands, etc.)</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              onClick={() => { resetForm(); setIsCreateDialogOpen(true); }}
              className={`h-11 ${isMobile ? 'w-full' : ''}`}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Universe
            </Button>
          </DialogTrigger>
          <DialogContent className={isMobile ? 'max-w-[95vw] max-h-[90vh]' : 'max-w-2xl'}>
            <DialogHeader>
              <DialogTitle>Create New Universe</DialogTitle>
              <DialogDescription>
                Add a new universe to the platform. Fill in the details below.
              </DialogDescription>
            </DialogHeader>
            <UniverseForm />
            <DialogFooter className={isMobile ? 'flex-col gap-2' : ''}>
              <Button 
                variant="outline" 
                onClick={() => setIsCreateDialogOpen(false)}
                className={isMobile ? 'w-full h-11' : ''}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCreate} 
                disabled={createMutation.isPending}
                className={isMobile ? 'w-full h-11' : ''}
              >
                {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Universe
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card className="border-border/50 bg-card/50">
        <CardContent className={isMobile ? 'p-3' : 'pt-6'}>
          <div className={`flex gap-3 ${isMobile ? 'flex-col' : 'items-center'}`}>
            {/* Search */}
            <div className={`relative ${isMobile ? 'w-full' : 'flex-1'}`}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or slug..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`pl-10 ${isMobile ? 'h-12' : ''}`}
              />
            </div>
            
            {/* Type Filter */}
            <div className={isMobile ? 'w-full' : 'w-[180px]'}>
              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
                <SelectTrigger className={isMobile ? 'h-12' : ''}>
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="universes">Universes Only</SelectItem>
                  <SelectItem value="planets">Planets Only</SelectItem>
                  <SelectItem value="all">All (Both)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Category Filter */}
            <div className={isMobile ? 'w-full' : 'w-[200px]'}>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className={isMobile ? 'h-12' : ''}>
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories?.map((cat: Category) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={clearFilters}
                className={`text-muted-foreground ${isMobile ? 'w-full h-11' : ''}`}
              >
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
          
          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border/50">
              <span className="text-xs text-muted-foreground flex items-center">
                <Filter className="h-3 w-3 mr-1" />
                Active filters:
              </span>
              {typeFilter !== 'universes' && (
                <Badge variant="secondary" className="text-xs">
                  Type: {typeFilter === 'planets' ? 'Planets' : 'All'}
                </Badge>
              )}
              {categoryFilter !== 'all' && (
                <Badge variant="secondary" className="text-xs">
                  Category: {categories?.find((c: Category) => c.id === categoryFilter)?.name}
                </Badge>
              )}
              {searchQuery && (
                <Badge variant="secondary" className="text-xs">
                  Search: "{searchQuery}"
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Universes List */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader className={isMobile ? 'pb-2' : ''}>
          <CardTitle className={isMobile ? 'text-lg' : ''}>
            {typeFilter === 'universes' ? 'Universes' : typeFilter === 'planets' ? 'Planets' : 'All Items'}
          </CardTitle>
          <CardDescription>
            {filteredUniverses?.length || 0} {typeFilter === 'all' ? 'items' : typeFilter} found
          </CardDescription>
        </CardHeader>
        <CardContent className={isMobile ? 'px-3' : ''}>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className={isMobile ? 'h-32' : 'h-16'} />
              ))}
            </div>
          ) : filteredUniverses?.length === 0 ? (
            <div className="text-center py-8">
              <Globe className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No {typeFilter} found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || categoryFilter !== 'all' 
                  ? "Try adjusting your filters" 
                  : "Get started by creating your first universe"}
              </p>
              {hasActiveFilters ? (
                <Button onClick={clearFilters} variant="outline" className="h-11">
                  <X className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
              ) : (
                <Button onClick={() => setIsCreateDialogOpen(true)} className="h-11">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Universe
                </Button>
              )}
            </div>
          ) : isMobile ? (
            // Mobile: Card-based layout
            <div className="space-y-0">
              {filteredUniverses?.map((universe) => (
                <UniverseCard key={universe.id} universe={universe} />
              ))}
            </div>
          ) : (
            // Desktop: Table layout
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">Image</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Category</TableHead>
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
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={universe.parent_universe_id 
                          ? "bg-blue-500/10 text-blue-400 border-blue-500/30" 
                          : "bg-green-500/10 text-green-400 border-green-500/30"
                        }
                      >
                        {universe.parent_universe_id ? "Planet" : "Universe"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {universe.category_name || "-"}
                    </TableCell>
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
        <DialogContent className={isMobile ? 'max-w-[95vw] max-h-[90vh]' : 'max-w-2xl'}>
          <DialogHeader>
            <DialogTitle>Edit Universe</DialogTitle>
            <DialogDescription>
              Update the universe details below.
            </DialogDescription>
          </DialogHeader>
          <UniverseForm isEdit />
          <DialogFooter className={isMobile ? 'flex-col gap-2' : ''}>
            <Button 
              variant="outline" 
              onClick={() => setIsEditDialogOpen(false)}
              className={isMobile ? 'w-full h-11' : ''}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleUpdate} 
              disabled={updateMutation.isPending}
              className={isMobile ? 'w-full h-11' : ''}
            >
              {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
