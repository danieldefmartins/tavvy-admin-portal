import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  ArrowLeft,
  Search, 
  Plus, 
  Globe, 
  Loader2, 
  Pencil, 
  Trash2, 
  Image as ImageIcon,
  MapPin,
  Link as LinkIcon,
  Unlink,
  Star,
  StarOff,
} from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import ImageUpload from "@/components/ImageUpload";

interface Planet {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  thumbnail_url: string | null;
  banner_url: string | null;
  location: string | null;
  place_count: number;
  created_at: string;
}

interface LinkedPlace {
  id: string;
  universe_id: string;
  place_id: string;
  display_order: number;
  is_featured: boolean;
  created_at: string;
  places: {
    id: string;
    name: string;
    address: string | null;
    city: string | null;
    region: string | null;
    country: string | null;
    category_name: string | null;
    thumbnail_url: string | null;
  } | null;
}

interface SearchPlace {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  category_name: string | null;
  thumbnail_url: string | null;
}

export default function UniverseDetail() {
  const [, params] = useRoute("/universes/:id");
  const id = params?.id;
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("planets");
  
  // Planet dialog state
  const [isPlanetDialogOpen, setIsPlanetDialogOpen] = useState(false);
  const [editingPlanet, setEditingPlanet] = useState<Planet | null>(null);
  const [planetForm, setPlanetForm] = useState({
    name: "",
    slug: "",
    description: "",
    thumbnail_url: "",
    banner_url: "",
    location: "",
  });
  
  // Place linking state
  const [isLinkPlaceDialogOpen, setIsLinkPlaceDialogOpen] = useState(false);
  const [placeSearchQuery, setPlaceSearchQuery] = useState("");
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);

  // Queries
  const { data: universe, isLoading: universeLoading } = trpc.universes.getById.useQuery(
    { id: id! },
    { enabled: !!id }
  );
  
  const { data: planets, isLoading: planetsLoading, refetch: refetchPlanets } = trpc.universes.getPlanets.useQuery(
    { universeId: id! },
    { enabled: !!id }
  );
  
  const { data: linkedPlaces, isLoading: placesLoading, refetch: refetchPlaces } = trpc.universes.getPlaces.useQuery(
    { universeId: id! },
    { enabled: !!id }
  );
  
  const { data: searchResults, isLoading: searchLoading } = trpc.universes.searchPlaces.useQuery(
    { query: placeSearchQuery, limit: 20 },
    { enabled: placeSearchQuery.length >= 2 }
  );

  // Planet mutations
  const createPlanetMutation = trpc.universes.createPlanet.useMutation({
    onSuccess: () => {
      toast.success("Planet created successfully!");
      setIsPlanetDialogOpen(false);
      resetPlanetForm();
      refetchPlanets();
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const updatePlanetMutation = trpc.universes.updatePlanet.useMutation({
    onSuccess: () => {
      toast.success("Planet updated successfully!");
      setIsPlanetDialogOpen(false);
      setEditingPlanet(null);
      resetPlanetForm();
      refetchPlanets();
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const deletePlanetMutation = trpc.universes.deletePlanet.useMutation({
    onSuccess: () => {
      toast.success("Planet deleted successfully!");
      refetchPlanets();
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  // Place mutations
  const linkPlaceMutation = trpc.universes.linkPlace.useMutation({
    onSuccess: (result) => {
      if (result.alreadyLinked) {
        toast.info("This place is already linked to this universe");
      } else {
        toast.success("Place linked successfully!");
      }
      setIsLinkPlaceDialogOpen(false);
      setPlaceSearchQuery("");
      setSelectedPlaceId(null);
      refetchPlaces();
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const unlinkPlaceMutation = trpc.universes.unlinkPlace.useMutation({
    onSuccess: () => {
      toast.success("Place unlinked successfully!");
      refetchPlaces();
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const toggleFeaturedMutation = trpc.universes.togglePlaceFeatured.useMutation({
    onSuccess: () => {
      toast.success("Featured status updated!");
      refetchPlaces();
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const resetPlanetForm = () => {
    setPlanetForm({
      name: "",
      slug: "",
      description: "",
      thumbnail_url: "",
      banner_url: "",
      location: "",
    });
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  const openEditPlanetDialog = (planet: Planet) => {
    setEditingPlanet(planet);
    setPlanetForm({
      name: planet.name,
      slug: planet.slug,
      description: planet.description || "",
      thumbnail_url: planet.thumbnail_url || "",
      banner_url: planet.banner_url || "",
      location: planet.location || "",
    });
    setIsPlanetDialogOpen(true);
  };

  const handleCreatePlanet = () => {
    if (!planetForm.name || !planetForm.slug) {
      toast.error("Name and slug are required");
      return;
    }
    createPlanetMutation.mutate({
      ...planetForm,
      parent_universe_id: id!,
    });
  };

  const handleUpdatePlanet = () => {
    if (!editingPlanet) return;
    updatePlanetMutation.mutate({
      id: editingPlanet.id,
      ...planetForm,
    });
  };

  const handleDeletePlanet = (planetId: string) => {
    if (confirm("Are you sure you want to delete this planet? This will also unlink all places.")) {
      deletePlanetMutation.mutate({ id: planetId });
    }
  };

  const handleLinkPlace = () => {
    if (!selectedPlaceId) {
      toast.error("Please select a place to link");
      return;
    }
    linkPlaceMutation.mutate({
      universeId: id!,
      placeId: selectedPlaceId,
    });
  };

  const handleUnlinkPlace = (placeId: string) => {
    if (confirm("Are you sure you want to unlink this place?")) {
      unlinkPlaceMutation.mutate({
        universeId: id!,
        placeId,
      });
    }
  };

  const handleToggleFeatured = (placeId: string, currentStatus: boolean) => {
    toggleFeaturedMutation.mutate({
      universeId: id!,
      placeId,
      isFeatured: !currentStatus,
    });
  };

  if (universeLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!universe) {
    return (
      <div className="text-center py-12">
        <Globe className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Universe not found</h3>
        <Button onClick={() => setLocation("/universes")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Universes
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/universes")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">{universe.name}</h1>
          <p className="text-muted-foreground">
            Manage planets and places for this universe
          </p>
        </div>
        {universe.thumbnail_url && (
          <img 
            src={universe.thumbnail_url} 
            alt={universe.name}
            className="w-16 h-16 rounded-lg object-cover"
          />
        )}
      </div>

      {/* Universe Info Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Slug:</span>
              <span className="ml-2 font-mono">{universe.slug}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Location:</span>
              <span className="ml-2">{universe.location || "Not set"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Place Count:</span>
              <span className="ml-2">{universe.place_count || 0}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Status:</span>
              <Badge variant="outline" className="ml-2">
                {universe.status || "active"}
              </Badge>
            </div>
          </div>
          {universe.description && (
            <p className="mt-4 text-sm text-muted-foreground">{universe.description}</p>
          )}
        </CardContent>
      </Card>

      {/* Tabs for Planets and Places */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="planets">
            <Globe className="h-4 w-4 mr-2" />
            Planets ({planets?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="places">
            <MapPin className="h-4 w-4 mr-2" />
            Places ({linkedPlaces?.length || 0})
          </TabsTrigger>
        </TabsList>

        {/* Planets Tab */}
        <TabsContent value="planets" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Planets</CardTitle>
                <CardDescription>
                  Sub-locations within this universe (e.g., Magic Kingdom within Walt Disney World)
                </CardDescription>
              </div>
              <Button onClick={() => {
                resetPlanetForm();
                setEditingPlanet(null);
                setIsPlanetDialogOpen(true);
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Planet
              </Button>
            </CardHeader>
            <CardContent>
              {planetsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : planets?.length === 0 ? (
                <div className="text-center py-8">
                  <Globe className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No planets yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Add planets to organize places within this universe
                  </p>
                  <Button onClick={() => {
                    resetPlanetForm();
                    setEditingPlanet(null);
                    setIsPlanetDialogOpen(true);
                  }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Planet
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60px]">Image</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Slug</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Places</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {planets?.map((planet) => (
                      <TableRow key={planet.id}>
                        <TableCell>
                          {planet.thumbnail_url ? (
                            <img 
                              src={planet.thumbnail_url} 
                              alt={planet.name}
                              className="w-10 h-10 rounded object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                              <ImageIcon className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{planet.name}</TableCell>
                        <TableCell className="text-muted-foreground font-mono text-sm">
                          {planet.slug}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {planet.location || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{planet.place_count || 0}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => setLocation(`/universes/${planet.id}`)}
                              title="View planet details"
                            >
                              <Globe className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => openEditPlanetDialog(planet)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleDeletePlanet(planet.id)}
                              disabled={deletePlanetMutation.isPending}
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
        </TabsContent>

        {/* Places Tab */}
        <TabsContent value="places" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Linked Places</CardTitle>
                <CardDescription>
                  Places that belong to this universe
                </CardDescription>
              </div>
              <Button onClick={() => setIsLinkPlaceDialogOpen(true)}>
                <LinkIcon className="h-4 w-4 mr-2" />
                Link Place
              </Button>
            </CardHeader>
            <CardContent>
              {placesLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : linkedPlaces?.length === 0 ? (
                <div className="text-center py-8">
                  <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No places linked</h3>
                  <p className="text-muted-foreground mb-4">
                    Link places to this universe to organize them
                  </p>
                  <Button onClick={() => setIsLinkPlaceDialogOpen(true)}>
                    <LinkIcon className="h-4 w-4 mr-2" />
                    Link First Place
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60px]">Image</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Featured</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {linkedPlaces?.map((link) => (
                      <TableRow key={link.id}>
                        <TableCell>
                          {link.places?.thumbnail_url ? (
                            <img 
                              src={link.places.thumbnail_url} 
                              alt={link.places.name}
                              className="w-10 h-10 rounded object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                              <ImageIcon className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          {link.places?.name || "Unknown"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {link.places?.category_name || "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {[link.places?.city, link.places?.region, link.places?.country]
                            .filter(Boolean)
                            .join(", ") || "-"}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleFeatured(link.place_id, link.is_featured)}
                            disabled={toggleFeaturedMutation.isPending}
                          >
                            {link.is_featured ? (
                              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                            ) : (
                              <StarOff className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleUnlinkPlace(link.place_id)}
                            disabled={unlinkPlaceMutation.isPending}
                            title="Unlink place"
                          >
                            <Unlink className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Planet Dialog */}
      <Dialog open={isPlanetDialogOpen} onOpenChange={setIsPlanetDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingPlanet ? "Edit Planet" : "Add New Planet"}
            </DialogTitle>
            <DialogDescription>
              {editingPlanet 
                ? "Update the planet details below."
                : `Add a new planet to ${universe.name}`}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="planet-name">Planet Name *</Label>
                <Input
                  id="planet-name"
                  value={planetForm.name}
                  onChange={(e) => {
                    setPlanetForm({ 
                      ...planetForm, 
                      name: e.target.value,
                      slug: editingPlanet ? planetForm.slug : generateSlug(e.target.value)
                    });
                  }}
                  placeholder="Magic Kingdom"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="planet-slug">Slug *</Label>
                <Input
                  id="planet-slug"
                  value={planetForm.slug}
                  onChange={(e) => setPlanetForm({ ...planetForm, slug: e.target.value })}
                  placeholder="magic-kingdom"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="planet-description">Description</Label>
              <Textarea
                id="planet-description"
                value={planetForm.description}
                onChange={(e) => setPlanetForm({ ...planetForm, description: e.target.value })}
                placeholder="A brief description of this planet..."
                rows={3}
              />
            </div>

            <ImageUpload
              value={planetForm.thumbnail_url}
              onChange={(url) => setPlanetForm({ ...planetForm, thumbnail_url: url })}
              bucket="universe-images"
              folder="planet-thumbnails"
              label="Thumbnail Image"
              placeholder="Enter thumbnail URL or upload a file"
            />

            <ImageUpload
              value={planetForm.banner_url}
              onChange={(url) => setPlanetForm({ ...planetForm, banner_url: url })}
              bucket="universe-images"
              folder="planet-banners"
              label="Banner Image"
              placeholder="Enter banner URL or upload a file"
            />

            <div className="space-y-2">
              <Label htmlFor="planet-location">Location</Label>
              <Input
                id="planet-location"
                value={planetForm.location}
                onChange={(e) => setPlanetForm({ ...planetForm, location: e.target.value })}
                placeholder="e.g., Orlando, FL"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPlanetDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={editingPlanet ? handleUpdatePlanet : handleCreatePlanet}
              disabled={createPlanetMutation.isPending || updatePlanetMutation.isPending}
            >
              {(createPlanetMutation.isPending || updatePlanetMutation.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editingPlanet ? "Save Changes" : "Create Planet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link Place Dialog */}
      <Dialog open={isLinkPlaceDialogOpen} onOpenChange={setIsLinkPlaceDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Link Place to Universe</DialogTitle>
            <DialogDescription>
              Search for a place and link it to {universe.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search places by name..."
                value={placeSearchQuery}
                onChange={(e) => setPlaceSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {searchLoading && (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            )}
            
            {placeSearchQuery.length >= 2 && !searchLoading && searchResults?.length === 0 && (
              <div className="text-center py-4 text-muted-foreground">
                No places found matching "{placeSearchQuery}"
              </div>
            )}
            
            {searchResults && searchResults.length > 0 && (
              <div className="max-h-[300px] overflow-y-auto space-y-2">
                {searchResults.map((place) => (
                  <div
                    key={place.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedPlaceId === place.id 
                        ? "border-primary bg-primary/5" 
                        : "hover:bg-muted"
                    }`}
                    onClick={() => setSelectedPlaceId(place.id)}
                  >
                    {place.thumbnail_url ? (
                      <img 
                        src={place.thumbnail_url} 
                        alt={place.name}
                        className="w-12 h-12 rounded object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                        <ImageIcon className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{place.name}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {[place.city, place.region, place.country].filter(Boolean).join(", ")}
                      </p>
                      {place.category_name && (
                        <Badge variant="secondary" className="mt-1 text-xs">
                          {place.category_name}
                        </Badge>
                      )}
                    </div>
                    {selectedPlaceId === place.id && (
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsLinkPlaceDialogOpen(false);
              setPlaceSearchQuery("");
              setSelectedPlaceId(null);
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleLinkPlace}
              disabled={!selectedPlaceId || linkPlaceMutation.isPending}
            >
              {linkPlaceMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Link Place
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
