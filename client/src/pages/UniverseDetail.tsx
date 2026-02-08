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
  ChevronRight,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import ImageUpload from "@/components/ImageUpload";
import { useIsMobile } from "@/hooks/useMobile";

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

interface LinkedRide {
  id: string;
  universe_id: string;
  ride_id: string;
  display_order: number;
  is_featured: boolean;
  created_at: string;
  ride: {
    id: string;
    name: string;
    slug: string;
    thumbnail_image_url: string | null;
    ride_type: string | null;
    thrill_level: string | null;
    location: string | null;
    duration_minutes: number | null;
    status: string;
  } | null;
}

interface SearchRide {
  id: string;
  name: string;
  slug: string;
  thumbnail_image_url: string | null;
  ride_type: string | null;
  thrill_level: string | null;
  location: string | null;
  status: string;
}

export default function UniverseDetail() {
  const [, params] = useRoute("/universes/:id");
  const id = params?.id;
  const [, setLocation] = useLocation();
  const isMobile = useIsMobile();
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

  // Ride linking state
  const [isLinkRideDialogOpen, setIsLinkRideDialogOpen] = useState(false);
  const [rideSearchQuery, setRideSearchQuery] = useState("");
  const [selectedRideId, setSelectedRideId] = useState<string | null>(null);

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
    { query: placeSearchQuery, excludeUniverseId: id! },
    { enabled: placeSearchQuery.length >= 2 && !!id }
  );

  // Ride queries
  const { data: linkedRides, isLoading: ridesLoading, refetch: refetchRides } = trpc.universes.getRides.useQuery(
    { universeId: id! },
    { enabled: !!id }
  );

  const { data: rideSearchResults, isLoading: rideSearchLoading } = trpc.universes.searchRides.useQuery(
    { query: rideSearchQuery, excludeUniverseId: id! },
    { enabled: rideSearchQuery.length >= 2 && !!id }
  );

  // Mutations
  const createPlanetMutation = trpc.universes.createPlanet.useMutation({
    onSuccess: () => {
      toast.success("Planet created successfully!");
      setIsPlanetDialogOpen(false);
      resetPlanetForm();
      refetchPlanets();
    },
    onError: (error) => toast.error(`Error: ${error.message}`),
  });

  const updatePlanetMutation = trpc.universes.updatePlanet.useMutation({
    onSuccess: () => {
      toast.success("Planet updated successfully!");
      setIsPlanetDialogOpen(false);
      setEditingPlanet(null);
      resetPlanetForm();
      refetchPlanets();
    },
    onError: (error) => toast.error(`Error: ${error.message}`),
  });

  const deletePlanetMutation = trpc.universes.deletePlanet.useMutation({
    onSuccess: () => {
      toast.success("Planet deleted successfully!");
      refetchPlanets();
    },
    onError: (error) => toast.error(`Error: ${error.message}`),
  });

  const linkPlaceMutation = trpc.universes.linkPlace.useMutation({
    onSuccess: () => {
      toast.success("Place linked successfully!");
      setIsLinkPlaceDialogOpen(false);
      setPlaceSearchQuery("");
      setSelectedPlaceId(null);
      refetchPlaces();
    },
    onError: (error) => toast.error(`Error: ${error.message}`),
  });

  const unlinkPlaceMutation = trpc.universes.unlinkPlace.useMutation({
    onSuccess: () => {
      toast.success("Place unlinked successfully!");
      refetchPlaces();
    },
    onError: (error) => toast.error(`Error: ${error.message}`),
  });

  const toggleFeaturedMutation = trpc.universes.togglePlaceFeatured.useMutation({
    onSuccess: () => {
      toast.success("Featured status updated!");
      refetchPlaces();
    },
    onError: (error) => toast.error(`Error: ${error.message}`),
  });

  // Ride mutations
  const linkRideMutation = trpc.universes.linkRide.useMutation({
    onSuccess: () => {
      toast.success("Ride linked successfully!");
      setIsLinkRideDialogOpen(false);
      setRideSearchQuery("");
      setSelectedRideId(null);
      refetchRides();
    },
    onError: (error) => toast.error(`Error: ${error.message}`),
  });

  const unlinkRideMutation = trpc.universes.unlinkRide.useMutation({
    onSuccess: () => {
      toast.success("Ride unlinked successfully!");
      refetchRides();
    },
    onError: (error) => toast.error(`Error: ${error.message}`),
  });

  const toggleRideFeaturedMutation = trpc.universes.toggleRideFeatured.useMutation({
    onSuccess: () => {
      toast.success("Ride featured status updated!");
      refetchRides();
    },
    onError: (error) => toast.error(`Error: ${error.message}`),
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
      parent_universe_id: id!,
      ...planetForm,
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
    if (confirm("Are you sure you want to delete this planet?")) {
      deletePlanetMutation.mutate({ id: planetId });
    }
  };

  const handleLinkPlace = () => {
    if (!selectedPlaceId) return;
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

  // Ride handlers
  const handleLinkRide = () => {
    if (!selectedRideId) return;
    linkRideMutation.mutate({
      universeId: id!,
      rideId: selectedRideId,
    });
  };

  const handleUnlinkRide = (rideId: string) => {
    if (confirm("Are you sure you want to unlink this ride?")) {
      unlinkRideMutation.mutate({
        universeId: id!,
        rideId,
      });
    }
  };

  const handleToggleRideFeatured = (rideId: string, currentStatus: boolean) => {
    toggleRideFeaturedMutation.mutate({
      universeId: id!,
      rideId,
      isFeatured: !currentStatus,
    });
  };

  const getRideTypeLabel = (type: string | null) => {
    const types: Record<string, string> = {
      thrill_rides: "Thrill Rides",
      family_rides: "Family Rides",
      dark_rides: "Dark Rides",
      shows: "Shows & Entertainment",
      characters: "Characters",
      explore: "Explore",
      animals: "Animals & Nature",
      water_rides: "Water Rides",
      simulators: "Simulators",
      interactive: "Interactive",
    };
    return types[type || ""] || type || "-";
  };

  // Mobile Card Components
  const PlanetCard = ({ planet }: { planet: Planet }) => (
    <Card 
      className="mb-3 active:scale-[0.98] transition-transform cursor-pointer border-border/50 bg-card/50"
      onClick={() => setLocation(`/universes/${planet.id}`)}
    >
      <CardContent className="p-4">
        <div className="flex gap-3">
          {planet.thumbnail_url ? (
            <img 
              src={planet.thumbnail_url} 
              alt={planet.name}
              className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <Globe className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-semibold truncate">{planet.name}</h3>
                {planet.location && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3" />
                    {planet.location}
                  </p>
                )}
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            </div>
            
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className="text-xs">
                {planet.place_count || 0} places
              </Badge>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2 mt-3 pt-3 border-t border-border/50">
          <Button 
            variant="outline" 
            size="sm"
            className="flex-1 h-11"
            onClick={(e) => {
              e.stopPropagation();
              setLocation(`/universes/${planet.id}`);
            }}
          >
            <Globe className="h-4 w-4 mr-2" />
            View
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            className="h-11 px-4"
            onClick={(e) => {
              e.stopPropagation();
              openEditPlanetDialog(planet);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            className="h-11 px-4"
            onClick={(e) => {
              e.stopPropagation();
              handleDeletePlanet(planet.id);
            }}
            disabled={deletePlanetMutation.isPending}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const PlaceCard = ({ link }: { link: LinkedPlace }) => (
    <Card className="mb-3 border-border/50 bg-card/50">
      <CardContent className="p-4">
        <div className="flex gap-3">
          {link.places?.thumbnail_url ? (
            <img 
              src={link.places.thumbnail_url} 
              alt={link.places.name}
              className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <MapPin className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-semibold truncate">{link.places?.name || "Unknown"}</h3>
                <p className="text-sm text-muted-foreground truncate">
                  {link.places?.category_name || "No category"}
                </p>
              </div>
              {link.is_featured && (
                <Star className="h-5 w-5 text-yellow-500 fill-yellow-500 flex-shrink-0" />
              )}
            </div>
            
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {[link.places?.city, link.places?.region, link.places?.country]
                .filter(Boolean)
                .join(", ") || "No location"}
            </p>
          </div>
        </div>
        
        <div className="flex gap-2 mt-3 pt-3 border-t border-border/50">
          <Button 
            variant="outline" 
            size="sm"
            className="flex-1 h-11"
            onClick={() => handleToggleFeatured(link.place_id, link.is_featured)}
            disabled={toggleFeaturedMutation.isPending}
          >
            {link.is_featured ? (
              <>
                <StarOff className="h-4 w-4 mr-2" />
                Unfeature
              </>
            ) : (
              <>
                <Star className="h-4 w-4 mr-2" />
                Feature
              </>
            )}
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            className="h-11 px-4"
            onClick={() => handleUnlinkPlace(link.place_id)}
            disabled={unlinkPlaceMutation.isPending}
          >
            <Unlink className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  // Mobile Ride Card
  const RideCard = ({ link }: { link: LinkedRide }) => (
    <Card className="mb-3 border-border/50 bg-card/50">
      <CardContent className="p-4">
        <div className="flex gap-3">
          {link.ride?.thumbnail_image_url ? (
            <img 
              src={link.ride.thumbnail_image_url} 
              alt={link.ride.name}
              className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <Zap className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-semibold truncate">{link.ride?.name || "Unknown"}</h3>
                <p className="text-sm text-muted-foreground truncate">
                  {link.ride?.ride_type ? getRideTypeLabel(link.ride.ride_type) : "No type"}
                </p>
              </div>
              {link.is_featured && (
                <Star className="h-5 w-5 text-yellow-500 fill-yellow-500 flex-shrink-0" />
              )}
            </div>
            
            {link.ride?.location && (
              <p className="text-xs text-muted-foreground mt-1 truncate">
                {link.ride.location}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex gap-2 mt-3 pt-3 border-t border-border/50">
          <Button 
            variant="outline" 
            size="sm"
            className="flex-1 h-11"
            onClick={() => handleToggleRideFeatured(link.ride_id, link.is_featured)}
            disabled={toggleRideFeaturedMutation.isPending}
          >
            {link.is_featured ? (
              <>
                <StarOff className="h-4 w-4 mr-2" />
                Unfeature
              </>
            ) : (
              <>
                <Star className="h-4 w-4 mr-2" />
                Feature
              </>
            )}
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            className="h-11 px-4"
            onClick={() => handleUnlinkRide(link.ride_id)}
            disabled={unlinkRideMutation.isPending}
          >
            <Unlink className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  if (universeLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!universe) {
    return (
      <div className="text-center py-12 px-4">
        <Globe className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Universe not found</h3>
        <Button onClick={() => setLocation("/universes")} className="h-11">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Universes
        </Button>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${isMobile ? 'pb-20' : 'space-y-6'}`}>
      {/* Header */}
      <div className={`flex items-center gap-3 ${isMobile ? 'flex-wrap' : 'gap-4'}`}>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setLocation("/universes")}
          className="h-11 w-11"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className={`font-bold tracking-tight truncate ${isMobile ? 'text-xl' : 'text-3xl'}`}>
            {universe.name}
          </h1>
          <p className="text-muted-foreground text-sm">
            Manage planets and places
          </p>
        </div>
        {universe.thumbnail_url && (
          <img 
            src={universe.thumbnail_url} 
            alt={universe.name}
            className={`rounded-lg object-cover ${isMobile ? 'w-12 h-12' : 'w-16 h-16'}`}
          />
        )}
      </div>

      {/* Universe Info Card */}
      <Card className="border-border/50 bg-card/50">
        <CardContent className={isMobile ? 'p-4' : 'pt-6'}>
          <div className={`grid gap-3 text-sm ${isMobile ? 'grid-cols-2' : 'grid-cols-4'}`}>
            <div>
              <span className="text-muted-foreground block text-xs">Slug</span>
              <span className="font-mono text-xs">{universe.slug}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-xs">Location</span>
              <span>{universe.location || "Not set"}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-xs">Places</span>
              <span>{universe.place_count || 0}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-xs">Status</span>
              <Badge variant="outline" className="mt-0.5">
                {universe.status || "active"}
              </Badge>
            </div>
          </div>
          {universe.description && (
            <p className="mt-4 text-sm text-muted-foreground">{universe.description}</p>
          )}
        </CardContent>
      </Card>

      {/* Tabs for Planets, Places, and Rides */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className={`w-full ${isMobile ? 'grid grid-cols-3 h-12' : ''}`}>
          <TabsTrigger value="planets" className={isMobile ? 'h-10 text-xs px-2' : ''}>
            <Globe className="h-4 w-4 mr-2" />
            Planets ({planets?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="places" className={isMobile ? 'h-10 text-xs px-2' : ''}>
            <MapPin className="h-4 w-4 mr-2" />
            Places ({linkedPlaces?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="rides" className={isMobile ? 'h-10 text-xs px-2' : ''}>
            <Zap className="h-4 w-4 mr-2" />
            Rides ({linkedRides?.length || 0})
          </TabsTrigger>
        </TabsList>

        {/* Planets Tab */}
        <TabsContent value="planets" className="space-y-4 mt-4">
          <Card className="border-border/50 bg-card/50">
            <CardHeader className={`${isMobile ? 'pb-3' : ''} flex ${isMobile ? 'flex-col gap-3' : 'flex-row items-center justify-between'}`}>
              <div>
                <CardTitle className={isMobile ? 'text-lg' : ''}>Planets</CardTitle>
                <CardDescription>
                  Sub-locations within this universe
                </CardDescription>
              </div>
              <Button 
                onClick={() => {
                  resetPlanetForm();
                  setEditingPlanet(null);
                  setIsPlanetDialogOpen(true);
                }}
                className={`h-11 ${isMobile ? 'w-full' : ''}`}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Planet
              </Button>
            </CardHeader>
            <CardContent className={isMobile ? 'px-3' : ''}>
              {planetsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className={isMobile ? 'h-32' : 'h-16'} />
                  ))}
                </div>
              ) : planets?.length === 0 ? (
                <div className="text-center py-8">
                  <Globe className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No planets yet</h3>
                  <p className="text-muted-foreground mb-4 text-sm">
                    Add planets to organize places within this universe
                  </p>
                  <Button 
                    onClick={() => {
                      resetPlanetForm();
                      setEditingPlanet(null);
                      setIsPlanetDialogOpen(true);
                    }}
                    className="h-11"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Planet
                  </Button>
                </div>
              ) : isMobile ? (
                // Mobile: Card layout
                <div className="space-y-0">
                  {planets?.map((planet) => (
                    <PlanetCard key={planet.id} planet={planet} />
                  ))}
                </div>
              ) : (
                // Desktop: Table layout
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
        <TabsContent value="places" className="space-y-4 mt-4">
          <Card className="border-border/50 bg-card/50">
            <CardHeader className={`${isMobile ? 'pb-3' : ''} flex ${isMobile ? 'flex-col gap-3' : 'flex-row items-center justify-between'}`}>
              <div>
                <CardTitle className={isMobile ? 'text-lg' : ''}>Linked Places</CardTitle>
                <CardDescription>
                  Places that belong to this universe
                </CardDescription>
              </div>
              <Button 
                onClick={() => setIsLinkPlaceDialogOpen(true)}
                className={`h-11 ${isMobile ? 'w-full' : ''}`}
              >
                <LinkIcon className="h-4 w-4 mr-2" />
                Link Place
              </Button>
            </CardHeader>
            <CardContent className={isMobile ? 'px-3' : ''}>
              {placesLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className={isMobile ? 'h-28' : 'h-16'} />
                  ))}
                </div>
              ) : linkedPlaces?.length === 0 ? (
                <div className="text-center py-8">
                  <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No places linked</h3>
                  <p className="text-muted-foreground mb-4 text-sm">
                    Link places to this universe to organize them
                  </p>
                  <Button onClick={() => setIsLinkPlaceDialogOpen(true)} className="h-11">
                    <LinkIcon className="h-4 w-4 mr-2" />
                    Link First Place
                  </Button>
                </div>
              ) : isMobile ? (
                // Mobile: Card layout
                <div className="space-y-0">
                  {linkedPlaces?.map((link) => (
                    <PlaceCard key={link.id} link={link} />
                  ))}
                </div>
              ) : (
                // Desktop: Table layout
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
        {/* Rides Tab */}
        <TabsContent value="rides" className="space-y-4 mt-4">
          <Card className="border-border/50 bg-card/50">
            <CardHeader className={`${isMobile ? 'pb-3' : ''} flex ${isMobile ? 'flex-col gap-3' : 'flex-row items-center justify-between'}`}>
              <div>
                <CardTitle className={isMobile ? 'text-lg' : ''}>Linked Rides</CardTitle>
                <CardDescription>
                  Rides & attractions in this universe
                </CardDescription>
              </div>
              <Button 
                onClick={() => setIsLinkRideDialogOpen(true)}
                className={`h-11 ${isMobile ? 'w-full' : ''}`}
              >
                <LinkIcon className="h-4 w-4 mr-2" />
                Link Ride
              </Button>
            </CardHeader>
            <CardContent className={isMobile ? 'px-3' : ''}>
              {ridesLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className={isMobile ? 'h-28' : 'h-16'} />
                  ))}
                </div>
              ) : linkedRides?.length === 0 ? (
                <div className="text-center py-8">
                  <Zap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No rides linked</h3>
                  <p className="text-muted-foreground mb-4 text-sm">
                    Link rides to this universe to organize them
                  </p>
                  <Button onClick={() => setIsLinkRideDialogOpen(true)} className="h-11">
                    <LinkIcon className="h-4 w-4 mr-2" />
                    Link First Ride
                  </Button>
                </div>
              ) : isMobile ? (
                <div className="space-y-0">
                  {linkedRides?.map((link: any) => (
                    <RideCard key={link.id} link={link} />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60px]">Image</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Featured</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {linkedRides?.map((link: any) => (
                      <TableRow key={link.id}>
                        <TableCell>
                          {link.ride?.thumbnail_image_url ? (
                            <img 
                              src={link.ride.thumbnail_image_url} 
                              alt={link.ride.name}
                              className="w-10 h-10 rounded object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                              <Zap className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          {link.ride?.name || "Unknown"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {link.ride?.ride_type ? getRideTypeLabel(link.ride.ride_type) : "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {link.ride?.location || "-"}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleRideFeatured(link.ride_id, link.is_featured)}
                            disabled={toggleRideFeaturedMutation.isPending}
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
                            onClick={() => handleUnlinkRide(link.ride_id)}
                            disabled={unlinkRideMutation.isPending}
                            title="Unlink ride"
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
        <DialogContent className={isMobile ? 'max-w-[95vw] max-h-[90vh]' : 'max-w-2xl'}>
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
            <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
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
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="planet-slug">Slug *</Label>
                <Input
                  id="planet-slug"
                  value={planetForm.slug}
                  onChange={(e) => setPlanetForm({ ...planetForm, slug: e.target.value })}
                  placeholder="magic-kingdom"
                  className="h-12"
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
                className="h-12"
              />
            </div>
          </div>
          <DialogFooter className={isMobile ? 'flex-col gap-2' : ''}>
            <Button 
              variant="outline" 
              onClick={() => setIsPlanetDialogOpen(false)}
              className={isMobile ? 'w-full h-11' : ''}
            >
              Cancel
            </Button>
            <Button 
              onClick={editingPlanet ? handleUpdatePlanet : handleCreatePlanet}
              disabled={createPlanetMutation.isPending || updatePlanetMutation.isPending}
              className={isMobile ? 'w-full h-11' : ''}
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
        <DialogContent className={isMobile ? 'max-w-[95vw] max-h-[90vh]' : 'max-w-2xl'}>
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
                className="pl-10 h-12"
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
                        ? "border-primary bg-primary/10" 
                        : "border-border/50 hover:bg-muted/50"
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
          <DialogFooter className={isMobile ? 'flex-col gap-2' : ''}>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsLinkPlaceDialogOpen(false);
                setPlaceSearchQuery("");
                setSelectedPlaceId(null);
              }}
              className={isMobile ? 'w-full h-11' : ''}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleLinkPlace}
              disabled={!selectedPlaceId || linkPlaceMutation.isPending}
              className={isMobile ? 'w-full h-11' : ''}
            >
              {linkPlaceMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Link Place
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link Ride Dialog */}
      <Dialog open={isLinkRideDialogOpen} onOpenChange={setIsLinkRideDialogOpen}>
        <DialogContent className={isMobile ? 'max-w-[95vw] max-h-[90vh]' : 'max-w-2xl'}>
          <DialogHeader>
            <DialogTitle>Link Ride to Universe</DialogTitle>
            <DialogDescription>
              Search for a ride and link it to {universe.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search rides by name..."
                value={rideSearchQuery}
                onChange={(e) => setRideSearchQuery(e.target.value)}
                className="pl-10 h-12"
              />
            </div>
            
            {rideSearchLoading && (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            )}
            
            {rideSearchQuery.length >= 2 && !rideSearchLoading && rideSearchResults?.length === 0 && (
              <div className="text-center py-4 text-muted-foreground">
                No rides found matching "{rideSearchQuery}"
              </div>
            )}
            
            {rideSearchResults && rideSearchResults.length > 0 && (
              <div className="max-h-[300px] overflow-y-auto space-y-2">
                {rideSearchResults.map((ride: any) => (
                  <div
                    key={ride.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedRideId === ride.id 
                        ? "border-primary bg-primary/10" 
                        : "border-border/50 hover:bg-muted/50"
                    }`}
                    onClick={() => setSelectedRideId(ride.id)}
                  >
                    {ride.thumbnail_image_url ? (
                      <img 
                        src={ride.thumbnail_image_url} 
                        alt={ride.name}
                        className="w-12 h-12 rounded object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                        <Zap className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{ride.name}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {ride.location || "No location"}
                      </p>
                      {ride.ride_type && (
                        <Badge variant="secondary" className="mt-1 text-xs">
                          {getRideTypeLabel(ride.ride_type)}
                        </Badge>
                      )}
                    </div>
                    {selectedRideId === ride.id && (
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
          <DialogFooter className={isMobile ? 'flex-col gap-2' : ''}>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsLinkRideDialogOpen(false);
                setRideSearchQuery("");
                setSelectedRideId(null);
              }}
              className={isMobile ? 'w-full h-11' : ''}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleLinkRide}
              disabled={!selectedRideId || linkRideMutation.isPending}
              className={isMobile ? 'w-full h-11' : ''}
            >
              {linkRideMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Link Ride
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
