import { useState } from "react";
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
  FileText, 
  Loader2, 
  Pencil, 
  Trash2, 
  Eye,
  Clock,
  User,
  Image as ImageIcon
} from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import ImageUpload from "@/components/ImageUpload";

interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  cover_image_url: string | null;
  author_name: string | null;
  author_avatar_url: string | null;
  category_id: string | null;
  category_name?: string | null;
  universe_id: string | null;
  universe_name?: string | null;
  read_time_minutes: number | null;
  is_featured: boolean;
  status: string;
  published_at: string | null;
  created_at: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Universe {
  id: string;
  name: string;
  slug: string;
}

export default function Articles() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    cover_image_url: "",
    author_name: "",
    author_avatar_url: "",
    category_id: "",
    universe_id: "",
    read_time_minutes: 5,
    is_featured: false,
    status: "draft",
  });

  // Queries
  const { data: articles, isLoading, refetch } = trpc.articles.getAll.useQuery();
  const { data: categories } = trpc.articles.getCategories.useQuery();
  const { data: universes } = trpc.articles.getUniverses.useQuery();

  // Mutations
  const createMutation = trpc.articles.create.useMutation({
    onSuccess: () => {
      toast.success("Article created successfully!");
      setIsCreateDialogOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const updateMutation = trpc.articles.update.useMutation({
    onSuccess: () => {
      toast.success("Article updated successfully!");
      setIsEditDialogOpen(false);
      setSelectedArticle(null);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const deleteMutation = trpc.articles.delete.useMutation({
    onSuccess: () => {
      toast.success("Article deleted successfully!");
      refetch();
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      slug: "",
      excerpt: "",
      content: "",
      cover_image_url: "",
      author_name: "",
      author_avatar_url: "",
      category_id: "",
      universe_id: "",
      read_time_minutes: 5,
      is_featured: false,
      status: "draft",
    });
  };

  const handleCreate = () => {
    if (!formData.title || !formData.slug) {
      toast.error("Title and slug are required");
      return;
    }
    createMutation.mutate(formData);
  };

  const handleUpdate = () => {
    if (!selectedArticle) return;
    updateMutation.mutate({ id: selectedArticle.id, ...formData });
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this article?")) {
      deleteMutation.mutate({ id });
    }
  };

  const openEditDialog = (article: Article) => {
    setSelectedArticle(article);
    setFormData({
      title: article.title,
      slug: article.slug,
      excerpt: article.excerpt || "",
      content: article.content || "",
      cover_image_url: article.cover_image_url || "",
      author_name: article.author_name || "",
      author_avatar_url: article.author_avatar_url || "",
      category_id: article.category_id || "",
      universe_id: article.universe_id || "",
      read_time_minutes: article.read_time_minutes || 5,
      is_featured: article.is_featured,
      status: article.status,
    });
    setIsEditDialogOpen(true);
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  const filteredArticles = articles?.filter(
    (article) =>
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const ArticleForm = ({ isEdit = false }: { isEdit?: boolean }) => (
    <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => {
              setFormData({ 
                ...formData, 
                title: e.target.value,
                slug: isEdit ? formData.slug : generateSlug(e.target.value)
              });
            }}
            placeholder="Article title"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="slug">Slug *</Label>
          <Input
            id="slug"
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            placeholder="article-slug"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="excerpt">Excerpt</Label>
        <Textarea
          id="excerpt"
          value={formData.excerpt}
          onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
          placeholder="Short description of the article..."
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="content">Content</Label>
        <Textarea
          id="content"
          value={formData.content}
          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
          placeholder="Full article content (HTML or Markdown)..."
          rows={6}
        />
      </div>

      <ImageUpload
        value={formData.cover_image_url}
        onChange={(url) => setFormData({ ...formData, cover_image_url: url })}
        label="Cover Image"
        placeholder="Enter image URL or upload a file"
      />

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="author_name">Author Name</Label>
          <Input
            id="author_name"
            value={formData.author_name}
            onChange={(e) => setFormData({ ...formData, author_name: e.target.value })}
            placeholder="Author name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="author_avatar_url">Author Avatar URL</Label>
          <Input
            id="author_avatar_url"
            value={formData.author_avatar_url}
            onChange={(e) => setFormData({ ...formData, author_avatar_url: e.target.value })}
            placeholder="https://..."
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select
            value={formData.category_id}
            onValueChange={(value) => setFormData({ ...formData, category_id: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories?.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="universe">Universe</Label>
          <Select
            value={formData.universe_id}
            onValueChange={(value) => setFormData({ ...formData, universe_id: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select universe" />
            </SelectTrigger>
            <SelectContent>
              {universes?.map((uni) => (
                <SelectItem key={uni.id} value={uni.id}>
                  {uni.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="read_time">Read Time (min)</Label>
          <Input
            id="read_time"
            type="number"
            min={1}
            value={formData.read_time_minutes}
            onChange={(e) => setFormData({ ...formData, read_time_minutes: parseInt(e.target.value) || 5 })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select
            value={formData.status}
            onValueChange={(value) => setFormData({ ...formData, status: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Featured</Label>
          <div className="flex items-center h-10">
            <input
              type="checkbox"
              checked={formData.is_featured}
              onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300"
            />
            <span className="ml-2 text-sm">Featured article</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Articles</h1>
          <p className="text-muted-foreground">Manage Atlas articles and content</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setIsCreateDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Article
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Article</DialogTitle>
              <DialogDescription>
                Add a new article to the Atlas. Fill in the details below.
              </DialogDescription>
            </DialogHeader>
            <ArticleForm />
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Article
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
              placeholder="Search articles by title or slug..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Articles Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Articles</CardTitle>
          <CardDescription>
            {filteredArticles?.length || 0} articles found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredArticles && filteredArticles.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Author</TableHead>
                  <TableHead>Read Time</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredArticles.map((article) => (
                  <TableRow key={article.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {article.cover_image_url ? (
                          <img
                            src={article.cover_image_url}
                            alt={article.title}
                            className="h-10 w-14 object-cover rounded"
                          />
                        ) : (
                          <div className="h-10 w-14 bg-muted rounded flex items-center justify-center">
                            <ImageIcon className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{article.title}</p>
                          <p className="text-xs text-muted-foreground">{article.slug}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {article.category_name ? (
                        <Badge variant="secondary">{article.category_name}</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          article.status === "published"
                            ? "default"
                            : article.status === "draft"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {article.status}
                      </Badge>
                      {article.is_featured && (
                        <Badge variant="outline" className="ml-1 text-yellow-500 border-yellow-500">
                          Featured
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{article.author_name || "Unknown"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{article.read_time_minutes || 5} min</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(article)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(article.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="font-semibold text-lg mb-2">No articles found</h3>
              <p className="text-muted-foreground">
                Create your first article to get started
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Article</DialogTitle>
            <DialogDescription>
              Update the article details below.
            </DialogDescription>
          </DialogHeader>
          <ArticleForm isEdit />
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
