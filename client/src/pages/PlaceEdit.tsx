import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  ArrowLeft,
  Save,
  Trash2,
  MapPin,
  Phone,
  Globe,
  Mail,
  Clock,
  DollarSign,
  Tag,
  Image,
  Star,
  CheckCircle,
  XCircle,
  Sparkles,
  Eye,
  EyeOff,
  Building,
  RefreshCw,
} from "lucide-react";

export default function PlaceEdit() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/places/:id/edit");
  const placeId = params?.id;
  const isNewPlace = placeId === "new";

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    city: "",
    state: "",
    zip_code: "",
    country: "USA",
    latitude: "",
    longitude: "",
    phone: "",
    website: "",
    email: "",
    description: "",
    short_description: "",
    category: "",
    subcategory: "",
    price_level: "",
    amenities: "",
    tags: "",
  });

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Queries
  const { data: placeData, isLoading: placeLoading, refetch } = trpc.placeEdit.getForEdit.useQuery(
    { id: placeId! },
    { enabled: !!placeId && !isNewPlace }
  );
  const { data: categories } = trpc.placeEdit.getCategories.useQuery();
  const { data: photos } = trpc.placeEdit.getPhotos.useQuery(
    { placeId: placeId! },
    { enabled: !!placeId && !isNewPlace }
  );

  // Mutations
  const createMutation = trpc.placeEdit.create.useMutation({
    onSuccess: (data) => {
      toast.success("Place created successfully");
      setLocation(`/places/${data.placeId}/edit`);
    },
    onError: (error) => toast.error(`Failed to create: ${error.message}`),
  });

  const updateMutation = trpc.placeEdit.update.useMutation({
    onSuccess: () => {
      toast.success("Place updated successfully");
      setHasChanges(false);
      refetch();
    },
    onError: (error) => toast.error(`Failed to update: ${error.message}`),
  });

  const deleteMutation = trpc.placeEdit.delete.useMutation({
    onSuccess: () => {
      toast.success("Place deleted");
      setLocation("/places");
    },
    onError: (error) => toast.error(`Failed to delete: ${error.message}`),
  });

  const verifyMutation = trpc.placeEdit.verify.useMutation({
    onSuccess: () => {
      toast.success("Place verified");
      refetch();
    },
    onError: (error) => toast.error(`Failed to verify: ${error.message}`),
  });

  const unverifyMutation = trpc.placeEdit.unverify.useMutation({
    onSuccess: () => {
      toast.success("Place unverified");
      refetch();
    },
    onError: (error) => toast.error(`Failed to unverify: ${error.message}`),
  });

  const featureMutation = trpc.placeEdit.feature.useMutation({
    onSuccess: () => {
      toast.success("Place featured");
      refetch();
    },
    onError: (error) => toast.error(`Failed to feature: ${error.message}`),
  });

  const unfeatureMutation = trpc.placeEdit.unfeature.useMutation({
    onSuccess: () => {
      toast.success("Place unfeatured");
      refetch();
    },
    onError: (error) => toast.error(`Failed to unfeature: ${error.message}`),
  });

  const activateMutation = trpc.placeEdit.activate.useMutation({
    onSuccess: () => {
      toast.success("Place activated");
      refetch();
    },
    onError: (error) => toast.error(`Failed to activate: ${error.message}`),
  });

  const deactivateMutation = trpc.placeEdit.deactivate.useMutation({
    onSuccess: () => {
      toast.success("Place deactivated");
      refetch();
    },
    onError: (error) => toast.error(`Failed to deactivate: ${error.message}`),
  });

  // Load place data into form
  useEffect(() => {
    if (placeData && !isNewPlace) {
      setFormData({
        name: placeData.name || "",
        address: placeData.address || "",
        city: placeData.city || "",
        state: placeData.state || "",
        zip_code: placeData.zip_code || "",
        country: placeData.country || "USA",
        latitude: placeData.latitude?.toString() || "",
        longitude: placeData.longitude?.toString() || "",
        phone: placeData.phone || "",
        website: placeData.website || "",
        email: placeData.email || "",
        description: placeData.description || "",
        short_description: placeData.short_description || "",
        category: placeData.category || "",
        subcategory: placeData.subcategory || "",
        price_level: placeData.price_level?.toString() || "",
        amenities: (placeData.amenities || []).join(", "),
        tags: (placeData.tags || []).join(", "),
      });
    }
  }, [placeData, isNewPlace]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    if (isNewPlace) {
      createMutation.mutate({
        name: formData.name,
        address: formData.address || undefined,
        city: formData.city || undefined,
        state: formData.state || undefined,
        zip_code: formData.zip_code || undefined,
        country: formData.country || undefined,
        latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
        longitude: formData.longitude ? parseFloat(formData.longitude) : undefined,
        phone: formData.phone || undefined,
        website: formData.website || undefined,
        email: formData.email || undefined,
        description: formData.description || undefined,
        short_description: formData.short_description || undefined,
        category: formData.category || undefined,
        subcategory: formData.subcategory || undefined,
        price_level: formData.price_level ? parseInt(formData.price_level) : undefined,
        amenities: formData.amenities ? formData.amenities.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
        tags: formData.tags ? formData.tags.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
      });
    } else {
      updateMutation.mutate({
        id: placeId!,
        updates: {
          name: formData.name,
          address: formData.address || null,
          city: formData.city || null,
          state: formData.state || null,
          zip_code: formData.zip_code || null,
          country: formData.country || null,
          latitude: formData.latitude ? parseFloat(formData.latitude) : null,
          longitude: formData.longitude ? parseFloat(formData.longitude) : null,
          phone: formData.phone || null,
          website: formData.website || null,
          email: formData.email || null,
          description: formData.description || null,
          short_description: formData.short_description || null,
          category: formData.category || null,
          subcategory: formData.subcategory || null,
          price_level: formData.price_level ? parseInt(formData.price_level) : null,
          amenities: formData.amenities ? formData.amenities.split(",").map((s) => s.trim()).filter(Boolean) : null,
          tags: formData.tags ? formData.tags.split(",").map((s) => s.trim()).filter(Boolean) : null,
        },
      });
    }
  };

  const handleDelete = () => {
    if (!placeId || isNewPlace) return;
    deleteMutation.mutate({ id: placeId });
  };

  if (placeLoading && !isNewPlace) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/places")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {isNewPlace ? "Create New Place" : "Edit Place"}
            </h1>
            <p className="text-muted-foreground">
              {isNewPlace ? "Add a new place to the database" : placeData?.name || "Loading..."}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {!isNewPlace && (
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          )}
          <Button
            onClick={handleSave}
            disabled={createMutation.isPending || updateMutation.isPending || (!isNewPlace && !hasChanges)}
          >
            <Save className="h-4 w-4 mr-2" />
            {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Status Badges (for existing places) */}
      {!isNewPlace && placeData && (
        <div className="flex flex-wrap gap-2">
          {placeData.is_verified && (
            <Badge className="bg-blue-500">
              <CheckCircle className="h-3 w-3 mr-1" />
              Verified
            </Badge>
          )}
          {placeData.is_claimed && (
            <Badge className="bg-purple-500">
              <Building className="h-3 w-3 mr-1" />
              Claimed
            </Badge>
          )}
          {placeData.is_featured && (
            <Badge className="bg-yellow-500">
              <Sparkles className="h-3 w-3 mr-1" />
              Featured
            </Badge>
          )}
          {placeData.is_active ? (
            <Badge className="bg-green-500">
              <Eye className="h-3 w-3 mr-1" />
              Active
            </Badge>
          ) : (
            <Badge variant="destructive">
              <EyeOff className="h-3 w-3 mr-1" />
              Inactive
            </Badge>
          )}
          {placeData.average_rating && (
            <Badge variant="outline">
              <Star className="h-3 w-3 mr-1 text-yellow-500 fill-yellow-500" />
              {placeData.average_rating.toFixed(1)} ({placeData.total_reviews || 0} reviews)
            </Badge>
          )}
        </div>
      )}

      <Tabs defaultValue="basic" className="space-y-4">
        <TabsList>
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="location">Location</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
          {!isNewPlace && <TabsTrigger value="photos">Photos</TabsTrigger>}
          {!isNewPlace && <TabsTrigger value="actions">Actions</TabsTrigger>}
        </TabsList>

        <TabsContent value="basic">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Core details about the place</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder="Place name"
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(v) => handleInputChange("category", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {(categories || []).map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                      <SelectItem value="restaurant">Restaurant</SelectItem>
                      <SelectItem value="cafe">Cafe</SelectItem>
                      <SelectItem value="bar">Bar</SelectItem>
                      <SelectItem value="retail">Retail</SelectItem>
                      <SelectItem value="service">Service</SelectItem>
                      <SelectItem value="entertainment">Entertainment</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="subcategory">Subcategory</Label>
                  <Input
                    id="subcategory"
                    value={formData.subcategory}
                    onChange={(e) => handleInputChange("subcategory", e.target.value)}
                    placeholder="e.g., Italian, Coffee Shop"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="short_description">Short Description</Label>
                  <Input
                    id="short_description"
                    value={formData.short_description}
                    onChange={(e) => handleInputChange("short_description", e.target.value)}
                    placeholder="Brief tagline or description"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="description">Full Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    placeholder="Detailed description of the place"
                    rows={4}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="location">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Location
              </CardTitle>
              <CardDescription>Address and coordinates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="address">Street Address</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleInputChange("address", e.target.value)}
                    placeholder="123 Main St"
                  />
                </div>
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleInputChange("city", e.target.value)}
                    placeholder="City"
                  />
                </div>
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => handleInputChange("state", e.target.value)}
                    placeholder="State"
                  />
                </div>
                <div>
                  <Label htmlFor="zip_code">ZIP Code</Label>
                  <Input
                    id="zip_code"
                    value={formData.zip_code}
                    onChange={(e) => handleInputChange("zip_code", e.target.value)}
                    placeholder="12345"
                  />
                </div>
                <div>
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => handleInputChange("country", e.target.value)}
                    placeholder="USA"
                  />
                </div>
                <div>
                  <Label htmlFor="latitude">Latitude</Label>
                  <Input
                    id="latitude"
                    type="number"
                    step="any"
                    value={formData.latitude}
                    onChange={(e) => handleInputChange("latitude", e.target.value)}
                    placeholder="40.7128"
                  />
                </div>
                <div>
                  <Label htmlFor="longitude">Longitude</Label>
                  <Input
                    id="longitude"
                    type="number"
                    step="any"
                    value={formData.longitude}
                    onChange={(e) => handleInputChange("longitude", e.target.value)}
                    placeholder="-74.0060"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contact">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Contact Information
              </CardTitle>
              <CardDescription>How to reach the place</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => handleInputChange("phone", e.target.value)}
                      placeholder="(555) 123-4567"
                      className="pl-10"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      placeholder="contact@place.com"
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="col-span-2">
                  <Label htmlFor="website">Website</Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="website"
                      type="url"
                      value={formData.website}
                      onChange={(e) => handleInputChange("website", e.target.value)}
                      placeholder="https://www.example.com"
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Additional Details
              </CardTitle>
              <CardDescription>Price level, amenities, and tags</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price_level">Price Level</Label>
                  <Select
                    value={formData.price_level}
                    onValueChange={(v) => handleInputChange("price_level", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select price level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">$ - Budget</SelectItem>
                      <SelectItem value="2">$$ - Moderate</SelectItem>
                      <SelectItem value="3">$$$ - Upscale</SelectItem>
                      <SelectItem value="4">$$$$ - Fine Dining</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label htmlFor="amenities">Amenities</Label>
                  <Input
                    id="amenities"
                    value={formData.amenities}
                    onChange={(e) => handleInputChange("amenities", e.target.value)}
                    placeholder="WiFi, Outdoor Seating, Parking (comma-separated)"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Enter amenities separated by commas
                  </p>
                </div>
                <div className="col-span-2">
                  <Label htmlFor="tags">Tags</Label>
                  <Input
                    id="tags"
                    value={formData.tags}
                    onChange={(e) => handleInputChange("tags", e.target.value)}
                    placeholder="family-friendly, date-night, brunch (comma-separated)"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Enter tags separated by commas
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {!isNewPlace && (
          <TabsContent value="photos">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Image className="h-5 w-5" />
                  Photos
                </CardTitle>
                <CardDescription>Manage place photos</CardDescription>
              </CardHeader>
              <CardContent>
                {photos && photos.length > 0 ? (
                  <div className="grid grid-cols-4 gap-4">
                    {photos.map((photo) => (
                      <div
                        key={photo.id}
                        className="relative aspect-square rounded-lg overflow-hidden bg-muted"
                      >
                        <img
                          src={photo.thumbnail_url || photo.url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                        {photo.is_cover && (
                          <Badge className="absolute top-2 left-2 bg-yellow-500">
                            <Star className="h-3 w-3 mr-1" />
                            Cover
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Image className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No photos uploaded yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {!isNewPlace && placeData && (
          <TabsContent value="actions">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Verification */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    Verification
                  </CardTitle>
                  <CardDescription>
                    Verified places show a badge and rank higher in search
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {placeData.is_verified ? "Verified" : "Not Verified"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {placeData.is_verified
                          ? "This place is marked as verified"
                          : "This place is not verified yet"}
                      </p>
                    </div>
                    <Button
                      variant={placeData.is_verified ? "outline" : "default"}
                      onClick={() =>
                        placeData.is_verified
                          ? unverifyMutation.mutate({ id: placeId! })
                          : verifyMutation.mutate({ id: placeId! })
                      }
                      disabled={verifyMutation.isPending || unverifyMutation.isPending}
                    >
                      {placeData.is_verified ? "Remove Verification" : "Verify Place"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Featured */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    Featured
                  </CardTitle>
                  <CardDescription>
                    Featured places appear in highlighted sections
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {placeData.is_featured ? "Featured" : "Not Featured"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {placeData.is_featured
                          ? "This place is featured"
                          : "This place is not featured"}
                      </p>
                    </div>
                    <Button
                      variant={placeData.is_featured ? "outline" : "default"}
                      onClick={() =>
                        placeData.is_featured
                          ? unfeatureMutation.mutate({ id: placeId! })
                          : featureMutation.mutate({ id: placeId! })
                      }
                      disabled={featureMutation.isPending || unfeatureMutation.isPending}
                    >
                      {placeData.is_featured ? "Remove from Featured" : "Feature Place"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Active Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {placeData.is_active ? (
                      <Eye className="h-5 w-5" />
                    ) : (
                      <EyeOff className="h-5 w-5" />
                    )}
                    Visibility
                  </CardTitle>
                  <CardDescription>
                    Control whether this place appears in the app
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {placeData.is_active ? "Active" : "Inactive"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {placeData.is_active
                          ? "This place is visible to users"
                          : "This place is hidden from users"}
                      </p>
                    </div>
                    <Button
                      variant={placeData.is_active ? "outline" : "default"}
                      onClick={() =>
                        placeData.is_active
                          ? deactivateMutation.mutate({ id: placeId! })
                          : activateMutation.mutate({ id: placeId! })
                      }
                      disabled={activateMutation.isPending || deactivateMutation.isPending}
                    >
                      {placeData.is_active ? "Deactivate" : "Activate"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Delete */}
              <Card className="border-red-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-600">
                    <Trash2 className="h-5 w-5" />
                    Danger Zone
                  </CardTitle>
                  <CardDescription>
                    Permanently delete this place and all associated data
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="destructive"
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Place
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Place</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete "{placeData?.name}"? This will also delete all associated reviews, photos, stories, and signals. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Place"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
