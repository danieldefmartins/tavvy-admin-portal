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
  Loader2, 
  Pencil, 
  Trash2, 
  Image as ImageIcon,
  Palette,
  MapPin,
  Filter,
  X,
  Zap,
  Clock,
  Ruler,
  Droplets,
  Shield,
  Users,
  Baby,
  Accessibility,
  Sun,
  TicketCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import ImageUpload from "@/components/ImageUpload";
import ImageCropPreview from "@/components/ImageCropPreview";
import { useIsMobile } from "@/hooks/useMobile";

interface Ride {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  thumbnail_image_url: string | null;
  banner_image_url: string | null;
  thumbnail_fit: string | null;
  thumbnail_position: string | null;
  banner_fit: string | null;
  banner_position: string | null;
  location: string | null;
  ride_type: string | null;
  thrill_level: string | null;
  duration_minutes: number | null;
  height_requirement_inches: number | null;
  gets_wet: string | null;
  single_rider: boolean;
  child_swap: boolean;
  lightning_lane: string | null;
  indoor_outdoor: string | null;
  accessibility: string | null;
  age_recommendation: string | null;
  motion_sickness: string | null;
  park_name: string | null;
  is_featured: boolean;
  status: string;
  created_at: string;
}

const GETS_WET_OPTIONS = [
  { value: "dry", label: "Dry" },
  { value: "light_splash", label: "Light Splash" },
  { value: "soaked", label: "Soaked" },
];

const LIGHTNING_LANE_OPTIONS = [
  { value: "individual_ll", label: "Individual LL" },
  { value: "multi_pass", label: "Multi Pass" },
  { value: "virtual_queue", label: "Virtual Queue" },
  { value: "standby_only", label: "Standby Only" },
  { value: "not_applicable", label: "N/A" },
];

const INDOOR_OUTDOOR_OPTIONS = [
  { value: "indoor", label: "Indoor" },
  { value: "outdoor", label: "Outdoor" },
  { value: "both", label: "Both" },
];

const ACCESSIBILITY_OPTIONS = [
  { value: "fully_accessible", label: "Fully Accessible" },
  { value: "wheelchair_accessible", label: "Wheelchair Accessible" },
  { value: "ecv_to_wheelchair", label: "ECV to Wheelchair" },
  { value: "must_transfer", label: "Must Transfer" },
];

const AGE_OPTIONS = [
  { value: "all_ages", label: "All Ages" },
  { value: "3+", label: "3+" },
  { value: "4+", label: "4+" },
  { value: "6+", label: "6+" },
  { value: "8+", label: "8+" },
  { value: "10+", label: "10+" },
  { value: "teens+", label: "Teens+" },
];

const MOTION_SICKNESS_OPTIONS = [
  { value: "none", label: "None" },
  { value: "mild", label: "Mild" },
  { value: "moderate", label: "Moderate" },
  { value: "intense", label: "Intense" },
];

const RIDE_TYPES = [
  { value: "thrill_rides", label: "Thrill Rides" },
  { value: "family_rides", label: "Family Rides" },
  { value: "dark_rides", label: "Dark Rides" },
  { value: "shows", label: "Shows & Entertainment" },
  { value: "characters", label: "Characters" },
  { value: "explore", label: "Explore" },
  { value: "animals", label: "Animals & Nature" },
  { value: "water_rides", label: "Water Rides" },
  { value: "simulators", label: "Simulators" },
  { value: "interactive", label: "Interactive" },
];

const THRILL_LEVELS = [
  { value: "mild", label: "Mild" },
  { value: "moderate", label: "Moderate" },
  { value: "thrilling", label: "Thrilling" },
  { value: "extreme", label: "Extreme" },
];

export default function Rides() {
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);
  
  // Filter state
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [thrillFilter, setThrillFilter] = useState<string>('all');
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    thumbnail_image_url: "",
    banner_image_url: "",
    thumbnail_fit: "cover",
    thumbnail_position: "center",
    banner_fit: "cover",
    banner_position: "center",
    location: "",
    ride_type: "",
    thrill_level: "moderate",
    duration_minutes: undefined as number | undefined,
    height_requirement_inches: undefined as number | undefined,
    gets_wet: "dry",
    single_rider: false,
    child_swap: false,
    lightning_lane: "standby_only",
    indoor_outdoor: "",
    accessibility: "",
    age_recommendation: "all_ages",
    motion_sickness: "none",
    park_name: "",
    is_featured: false,
    status: "active",
  });

  // Queries
  const { data: rides, isLoading, refetch } = trpc.rides.getAll.useQuery(
    {
      rideType: typeFilter === 'all' ? undefined : typeFilter,
      thrillLevel: thrillFilter === 'all' ? undefined : thrillFilter,
    },
    {
      refetchOnMount: true,
      staleTime: 0,
    }
  );

  // Mutations
  const createMutation = trpc.rides.create.useMutation({
    onSuccess: () => {
      toast.success("Ride created successfully!");
      setIsCreateDialogOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const updateMutation = trpc.rides.update.useMutation({
    onSuccess: () => {
      toast.success("Ride updated successfully!");
      setIsEditDialogOpen(false);
      setSelectedRide(null);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const deleteMutation = trpc.rides.delete.useMutation({
    onSuccess: () => {
      toast.success("Ride deleted successfully!");
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
      thumbnail_fit: "cover",
      thumbnail_position: "center",
      banner_fit: "cover",
      banner_position: "center",
      location: "",
      ride_type: "",
      thrill_level: "moderate",
      duration_minutes: undefined,
      height_requirement_inches: undefined,
      gets_wet: "dry",
      single_rider: false,
      child_swap: false,
      lightning_lane: "standby_only",
      indoor_outdoor: "",
      accessibility: "",
      age_recommendation: "all_ages",
      motion_sickness: "none",
      park_name: "",
      is_featured: false,
      status: "active",
    });
  };

  const handleCreate = () => {
    if (!formData.name || !formData.slug) {
      toast.error("Name and slug are required");
      return;
    }
    createMutation.mutate({
      ...formData,
      ride_type: formData.ride_type || undefined,
      thrill_level: formData.thrill_level || undefined,
      duration_minutes: formData.duration_minutes || undefined,
      height_requirement_inches: formData.height_requirement_inches || undefined,
      gets_wet: formData.gets_wet || undefined,
      single_rider: formData.single_rider,
      child_swap: formData.child_swap,
      lightning_lane: formData.lightning_lane || undefined,
      indoor_outdoor: formData.indoor_outdoor || undefined,
      accessibility: formData.accessibility || undefined,
      age_recommendation: formData.age_recommendation || undefined,
      motion_sickness: formData.motion_sickness || undefined,
      park_name: formData.park_name || undefined,
    });
  };

  const handleUpdate = () => {
    if (!selectedRide) return;
    updateMutation.mutate({
      id: selectedRide.id,
      ...formData,
      ride_type: formData.ride_type || undefined,
      thrill_level: formData.thrill_level || undefined,
      duration_minutes: formData.duration_minutes || undefined,
      height_requirement_inches: formData.height_requirement_inches || undefined,
      gets_wet: formData.gets_wet || undefined,
      single_rider: formData.single_rider,
      child_swap: formData.child_swap,
      lightning_lane: formData.lightning_lane || undefined,
      indoor_outdoor: formData.indoor_outdoor || undefined,
      accessibility: formData.accessibility || undefined,
      age_recommendation: formData.age_recommendation || undefined,
      motion_sickness: formData.motion_sickness || undefined,
      park_name: formData.park_name || undefined,
    });
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this ride? This will also unlink it from all universes/planets.")) {
      deleteMutation.mutate({ id });
    }
  };

  const openEditDialog = (ride: Ride) => {
    setSelectedRide(ride);
    setFormData({
      name: ride.name,
      slug: ride.slug,
      description: ride.description || "",
      thumbnail_image_url: ride.thumbnail_image_url || "",
      banner_image_url: ride.banner_image_url || "",
      thumbnail_fit: ride.thumbnail_fit || "cover",
      thumbnail_position: ride.thumbnail_position || "center",
      banner_fit: ride.banner_fit || "cover",
      banner_position: ride.banner_position || "center",
      location: ride.location || "",
      ride_type: ride.ride_type || "",
      thrill_level: ride.thrill_level || "moderate",
      duration_minutes: ride.duration_minutes || undefined,
      height_requirement_inches: ride.height_requirement_inches || undefined,
      gets_wet: ride.gets_wet || "dry",
      single_rider: ride.single_rider || false,
      child_swap: ride.child_swap || false,
      lightning_lane: ride.lightning_lane || "standby_only",
      indoor_outdoor: ride.indoor_outdoor || "",
      accessibility: ride.accessibility || "",
      age_recommendation: ride.age_recommendation || "all_ages",
      motion_sickness: ride.motion_sickness || "none",
      park_name: ride.park_name || "",
      is_featured: ride.is_featured,
      status: ride.status || "active",
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
    setTypeFilter('all');
    setThrillFilter('all');
    setSearchQuery('');
  };

  const hasActiveFilters = typeFilter !== 'all' || thrillFilter !== 'all' || searchQuery !== '';

  const filteredRides = rides?.filter(
    (ride) =>
      ride.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ride.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ride.park_name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getThrillColor = (level: string | null) => {
    switch (level) {
      case 'mild': return 'bg-green-500/10 text-green-400 border-green-500/30';
      case 'moderate': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
      case 'thrilling': return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
      case 'extreme': return 'bg-red-500/10 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/30';
    }
  };

  const getRideTypeLabel = (type: string | null) => {
    return RIDE_TYPES.find(t => t.value === type)?.label || type || '-';
  };

  // Form component - matches Universe form exactly
  const RideForm = ({ isEdit = false }: { isEdit?: boolean }) => (
    <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
      <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
        <div className="space-y-2">
          <Label htmlFor="name">Ride Name *</Label>
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
            placeholder="Space Mountain"
            className="h-12"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="slug">Slug *</Label>
          <Input
            id="slug"
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            placeholder="space-mountain"
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
          placeholder="A brief description of this ride..."
          rows={3}
        />
      </div>

      {/* Thumbnail Image with Upload */}
      <ImageUpload
        value={formData.thumbnail_image_url}
        onChange={(url) => setFormData({ ...formData, thumbnail_image_url: url })}
        bucket="universe-images"
        folder="ride-thumbnails"
        label="Thumbnail Image"
        placeholder="Enter thumbnail URL or upload a file"
      />
      
      {/* Thumbnail Crop & Position */}
      {formData.thumbnail_image_url && (
        <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
          <ImageCropPreview
            imageUrl={formData.thumbnail_image_url}
            position={formData.thumbnail_position}
            onPositionChange={(pos) => setFormData(prev => ({ ...prev, thumbnail_position: pos }))}
            aspectRatio="1:1"
            label="Thumbnail Crop (1:1)"
          />
        </div>
      )}

      {/* Banner Image with Upload */}
      <ImageUpload
        value={formData.banner_image_url}
        onChange={(url) => setFormData({ ...formData, banner_image_url: url })}
        bucket="universe-images"
        folder="ride-banners"
        label="Banner Image"
        placeholder="Enter banner URL or upload a file"
      />
      
      {/* Banner Crop & Position */}
      {formData.banner_image_url && (
        <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
          <ImageCropPreview
            imageUrl={formData.banner_image_url}
            position={formData.banner_position}
            onPositionChange={(pos) => setFormData(prev => ({ ...prev, banner_position: pos }))}
            aspectRatio="16:9"
            label="Banner Crop (16:9)"
          />
        </div>
      )}

      <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-3'}`}>
        <div className="space-y-2">
          <Label htmlFor="park_name">Theme Park</Label>
          <Select
            value={formData.park_name || "none"}
            onValueChange={(v) => setFormData({ ...formData, park_name: v === "none" ? "" : v })}
          >
            <SelectTrigger className="h-12">
              <SelectValue placeholder="Select park" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Park</SelectItem>
              <SelectItem value="Magic Kingdom">Magic Kingdom</SelectItem>
              <SelectItem value="EPCOT">EPCOT</SelectItem>
              <SelectItem value="Hollywood Studios">Hollywood Studios</SelectItem>
              <SelectItem value="Animal Kingdom">Animal Kingdom</SelectItem>
              <SelectItem value="Disney Springs">Disney Springs</SelectItem>
              <SelectItem value="Typhoon Lagoon">Typhoon Lagoon</SelectItem>
              <SelectItem value="Blizzard Beach">Blizzard Beach</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            placeholder="e.g., Orlando, Florida"
            className="h-12"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ride_type">Ride Type</Label>
          <Select 
            value={formData.ride_type || "none"} 
            onValueChange={(v) => setFormData({ ...formData, ride_type: v === "none" ? "" : v })}
          >
            <SelectTrigger className="h-12">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Type</SelectItem>
              {RIDE_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-3'}`}>
        <div className="space-y-2">
          <Label htmlFor="thrill_level">Thrill Level</Label>
          <Select 
            value={formData.thrill_level || "moderate"} 
            onValueChange={(v) => setFormData({ ...formData, thrill_level: v })}
          >
            <SelectTrigger className="h-12">
              <SelectValue placeholder="Select level" />
            </SelectTrigger>
            <SelectContent>
              {THRILL_LEVELS.map((level) => (
                <SelectItem key={level.value} value={level.value}>
                  {level.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="duration">Duration (min)</Label>
          <Input
            id="duration"
            type="number"
            value={formData.duration_minutes || ""}
            onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value ? parseInt(e.target.value) : undefined })}
            placeholder="e.g., 3"
            className="h-12"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="height">Height Req. (inches)</Label>
          <Input
            id="height"
            type="number"
            value={formData.height_requirement_inches || ""}
            onChange={(e) => setFormData({ ...formData, height_requirement_inches: e.target.value ? parseInt(e.target.value) : undefined })}
            placeholder="e.g., 44"
            className="h-12"
          />
        </div>
      </div>

      {/* Gets Wet, Lightning Lane, Indoor/Outdoor */}
      <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-3'}`}>
        <div className="space-y-2">
          <Label htmlFor="gets_wet">Gets You Wet</Label>
          <Select 
            value={formData.gets_wet || "dry"} 
            onValueChange={(v) => setFormData({ ...formData, gets_wet: v })}
          >
            <SelectTrigger className="h-12">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {GETS_WET_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="lightning_lane">Lightning Lane</Label>
          <Select 
            value={formData.lightning_lane || "standby_only"} 
            onValueChange={(v) => setFormData({ ...formData, lightning_lane: v })}
          >
            <SelectTrigger className="h-12">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {LIGHTNING_LANE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="indoor_outdoor">Indoor / Outdoor</Label>
          <Select 
            value={formData.indoor_outdoor || "none"} 
            onValueChange={(v) => setFormData({ ...formData, indoor_outdoor: v === "none" ? "" : v })}
          >
            <SelectTrigger className="h-12">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Not Set</SelectItem>
              {INDOOR_OUTDOOR_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Accessibility, Age, Motion Sickness */}
      <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-3'}`}>
        <div className="space-y-2">
          <Label htmlFor="accessibility">Accessibility</Label>
          <Select 
            value={formData.accessibility || "none"} 
            onValueChange={(v) => setFormData({ ...formData, accessibility: v === "none" ? "" : v })}
          >
            <SelectTrigger className="h-12">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Not Set</SelectItem>
              {ACCESSIBILITY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="age_recommendation">Age Recommendation</Label>
          <Select 
            value={formData.age_recommendation || "all_ages"} 
            onValueChange={(v) => setFormData({ ...formData, age_recommendation: v })}
          >
            <SelectTrigger className="h-12">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {AGE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="motion_sickness">Motion Sickness</Label>
          <Select 
            value={formData.motion_sickness || "none"} 
            onValueChange={(v) => setFormData({ ...formData, motion_sickness: v })}
          >
            <SelectTrigger className="h-12">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {MOTION_SICKNESS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Single Rider, Child Swap, Featured, Status */}
      <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
        <div className="space-y-2">
          <Label>Rider Options</Label>
          <div className="flex flex-col gap-3 pt-1">
            <div className="flex items-center h-8">
              <input
                type="checkbox"
                checked={formData.single_rider}
                onChange={(e) => setFormData({ ...formData, single_rider: e.target.checked })}
                className="h-5 w-5 rounded border-gray-300"
              />
              <span className="ml-2 text-sm">Single Rider available</span>
            </div>
            <div className="flex items-center h-8">
              <input
                type="checkbox"
                checked={formData.child_swap}
                onChange={(e) => setFormData({ ...formData, child_swap: e.target.checked })}
                className="h-5 w-5 rounded border-gray-300"
              />
              <span className="ml-2 text-sm">Child Swap (Rider Switch) available</span>
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Featured & Status</Label>
          <div className="flex flex-col gap-3 pt-1">
            <div className="flex items-center h-8">
              <input
                type="checkbox"
                checked={formData.is_featured}
                onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                className="h-5 w-5 rounded border-gray-300"
              />
              <span className="ml-2 text-sm">Featured ride</span>
            </div>
            <select
              id="status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="closed">Closed</option>
              <option value="seasonal">Seasonal</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );

  // Mobile Card Component
  const RideCard = ({ ride }: { ride: Ride }) => (
    <Card className="mb-3 active:scale-[0.98] transition-transform border-border/50 bg-card/50">
      <CardContent className="p-4">
        <div className="flex gap-3">
          {/* Thumbnail */}
          {ride.thumbnail_image_url ? (
            <img 
              src={ride.thumbnail_image_url} 
              alt={ride.name}
              className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <Zap className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-semibold truncate">{ride.name}</h3>
                {ride.park_name && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3" />
                    {ride.park_name}
                  </p>
                )}
              </div>
            </div>
            
            {/* Badges */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {ride.ride_type && (
                <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-400 border-blue-500/30">
                  {getRideTypeLabel(ride.ride_type)}
                </Badge>
              )}
              {ride.thrill_level && (
                <Badge variant="outline" className={`text-xs ${getThrillColor(ride.thrill_level)}`}>
                  {ride.thrill_level}
                </Badge>
              )}
              {ride.is_featured && (
                <Badge variant="secondary" className="text-xs">
                  <Palette className="h-3 w-3 mr-1" />
                  Featured
                </Badge>
              )}
              {ride.duration_minutes && (
                <Badge variant="outline" className="text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  {ride.duration_minutes}m
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
            onClick={() => openEditDialog(ride)}
          >
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            className="h-10 px-3"
            onClick={() => handleDelete(ride.id)}
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
          <h1 className={`font-bold tracking-tight ${isMobile ? 'text-2xl' : 'text-3xl'}`}>Rides</h1>
          <p className="text-muted-foreground text-sm">Manage rides & attractions across all parks</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              onClick={() => { resetForm(); setIsCreateDialogOpen(true); }}
              className={`h-11 ${isMobile ? 'w-full' : ''}`}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Ride
            </Button>
          </DialogTrigger>
          <DialogContent className={isMobile ? 'max-w-[95vw] max-h-[90vh]' : 'max-w-2xl'}>
            <DialogHeader>
              <DialogTitle>Create New Ride</DialogTitle>
              <DialogDescription>
                Add a new ride or attraction. Fill in the details below.
              </DialogDescription>
            </DialogHeader>
            <RideForm />
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
                Create Ride
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
            <div className={isMobile ? 'w-full' : 'w-[200px]'}>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className={isMobile ? 'h-12' : ''}>
                  <SelectValue placeholder="Ride Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {RIDE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Thrill Filter */}
            <div className={isMobile ? 'w-full' : 'w-[180px]'}>
              <Select value={thrillFilter} onValueChange={setThrillFilter}>
                <SelectTrigger className={isMobile ? 'h-12' : ''}>
                  <SelectValue placeholder="Thrill Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  {THRILL_LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      {level.label}
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
              {typeFilter !== 'all' && (
                <Badge variant="secondary" className="text-xs">
                  Type: {getRideTypeLabel(typeFilter)}
                </Badge>
              )}
              {thrillFilter !== 'all' && (
                <Badge variant="secondary" className="text-xs">
                  Thrill: {thrillFilter}
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

      {/* Rides List */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader className={isMobile ? 'pb-2' : ''}>
          <CardTitle className={isMobile ? 'text-lg' : ''}>Rides & Attractions</CardTitle>
          <CardDescription>
            {filteredRides?.length || 0} rides found
          </CardDescription>
        </CardHeader>
        <CardContent className={isMobile ? 'px-3' : ''}>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className={isMobile ? 'h-32' : 'h-16'} />
              ))}
            </div>
          ) : filteredRides?.length === 0 ? (
            <div className="text-center py-8">
              <Zap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No rides found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || typeFilter !== 'all' || thrillFilter !== 'all'
                  ? "Try adjusting your filters" 
                  : "Get started by creating your first ride"}
              </p>
              {hasActiveFilters ? (
                <Button onClick={clearFilters} variant="outline" className="h-11">
                  <X className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
              ) : (
                <Button onClick={() => setIsCreateDialogOpen(true)} className="h-11">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Ride
                </Button>
              )}
            </div>
          ) : isMobile ? (
            // Mobile: Card-based layout
            <div className="space-y-0">
              {filteredRides?.map((ride) => (
                <RideCard key={ride.id} ride={ride} />
              ))}
            </div>
          ) : (
            // Desktop: Table layout
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">Image</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Park</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Thrill</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRides?.map((ride) => (
                  <TableRow key={ride.id}>
                    <TableCell>
                      {ride.thumbnail_image_url ? (
                        <img 
                          src={ride.thumbnail_image_url} 
                          alt={ride.name}
                          className="w-10 h-10 rounded object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                          <Zap className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {ride.name}
                        {ride.is_featured && (
                          <Badge variant="secondary" className="text-xs">
                            <Palette className="h-3 w-3 mr-1" />
                            Featured
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {ride.park_name || '-'}
                    </TableCell>
                    <TableCell>
                      {ride.ride_type ? (
                        <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30">
                          {getRideTypeLabel(ride.ride_type)}
                        </Badge>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      {ride.thrill_level ? (
                        <Badge variant="outline" className={getThrillColor(ride.thrill_level)}>
                          {ride.thrill_level}
                        </Badge>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {ride.duration_minutes ? `${ride.duration_minutes}m` : '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{ride.location || "-"}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={
                          ride.status === "active" ? "default" : 
                          ride.status === "draft" ? "secondary" : "outline"
                        }
                      >
                        {ride.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => openEditDialog(ride)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleDelete(ride.id)}
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
            <DialogTitle>Edit Ride</DialogTitle>
            <DialogDescription>
              Update the ride details below.
            </DialogDescription>
          </DialogHeader>
          <RideForm isEdit />
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
