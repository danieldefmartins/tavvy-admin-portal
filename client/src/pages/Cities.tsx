import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Pencil, Trash2, Search, MapPin, Users, Building2, Plane } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface City {
  id: string;
  name: string;
  slug: string;
  state: string;
  country: string;
  region: string;
  population: number;
  timezone: string;
  airport_code: string;
  latitude: number;
  longitude: number;
  cover_image_url: string;
  thumbnail_image_url: string;
  description: string;
  history: string;
  culture: string;
  famous_people: string;
  local_economy: string;
  major_companies: string;
  political_leaning: string;
  then_now_next: string;
  weather_summary: string;
  best_time_to_visit: string;
  cost_of_living_index: number;
  walkability_score: number;
  sales_tax_rate: number;
  avg_gas_price: number;
  is_featured: boolean;
  is_active: boolean;
  created_at: string;
}

const REGIONS = [
  "Northeast",
  "Southeast",
  "Midwest",
  "South",
  "Southwest",
  "West Coast",
  "Mountain West",
  "Pacific",
  "North America",
  "Central America",
  "South America",
  "Europe",
  "Asia",
  "Middle East",
  "Africa",
  "Oceania",
  "International",
];

export default function Cities() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCity, setEditingCity] = useState<City | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRegion, setFilterRegion] = useState<string>("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    state: "",
    country: "",
    region: "",
    population: 0,
    timezone: "",
    airport_code: "",
    latitude: 0,
    longitude: 0,
    cover_image_url: "",
    thumbnail_image_url: "",
    description: "",
    history: "",
    culture: "",
    famous_people: "",
    local_economy: "",
    major_companies: "",
    political_leaning: "",
    then_now_next: "",
    weather_summary: "",
    best_time_to_visit: "",
    cost_of_living_index: 100,
    walkability_score: 50,
    sales_tax_rate: 0,
    avg_gas_price: 0,
    is_featured: false,
    is_active: true,
  });

  // Fetch cities
  const { data: cities = [], isLoading } = useQuery({
    queryKey: ["/api/cities"],
    queryFn: async () => {
      const response = await fetch("/api/cities");
      if (!response.ok) throw new Error("Failed to fetch cities");
      return response.json();
    },
  });

  // Create city mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await fetch("/api/cities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create city");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cities"] });
      toast({ title: "City created successfully" });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Update city mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const response = await fetch(`/api/cities/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update city");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cities"] });
      toast({ title: "City updated successfully" });
      setIsDialogOpen(false);
      setEditingCity(null);
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Delete city mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/cities/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete city");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cities"] });
      toast({ title: "City deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      slug: "",
      state: "",
      country: "",
      region: "",
      population: 0,
      timezone: "",
      airport_code: "",
      latitude: 0,
      longitude: 0,
      cover_image_url: "",
      thumbnail_image_url: "",
      description: "",
      history: "",
      culture: "",
      famous_people: "",
      local_economy: "",
      major_companies: "",
      political_leaning: "",
      then_now_next: "",
      weather_summary: "",
      best_time_to_visit: "",
      cost_of_living_index: 100,
      walkability_score: 50,
      sales_tax_rate: 0,
      avg_gas_price: 0,
      is_featured: false,
      is_active: true,
    });
  };

  const handleEdit = (city: City) => {
    setEditingCity(city);
    setFormData({
      name: city.name || "",
      slug: city.slug || "",
      state: city.state || "",
      country: city.country || "",
      region: city.region || "",
      population: city.population || 0,
      timezone: city.timezone || "",
      airport_code: city.airport_code || "",
      latitude: city.latitude || 0,
      longitude: city.longitude || 0,
      cover_image_url: city.cover_image_url || "",
      thumbnail_image_url: city.thumbnail_image_url || "",
      description: city.description || "",
      history: city.history || "",
      culture: city.culture || "",
      famous_people: city.famous_people || "",
      local_economy: city.local_economy || "",
      major_companies: city.major_companies || "",
      political_leaning: city.political_leaning || "",
      then_now_next: city.then_now_next || "",
      weather_summary: city.weather_summary || "",
      best_time_to_visit: city.best_time_to_visit || "",
      cost_of_living_index: city.cost_of_living_index || 100,
      walkability_score: city.walkability_score || 50,
      sales_tax_rate: city.sales_tax_rate || 0,
      avg_gas_price: city.avg_gas_price || 0,
      is_featured: city.is_featured || false,
      is_active: city.is_active ?? true,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Auto-generate slug if empty
    const dataToSubmit = {
      ...formData,
      slug: formData.slug || formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    };

    if (editingCity) {
      updateMutation.mutate({ id: editingCity.id, data: dataToSubmit });
    } else {
      createMutation.mutate(dataToSubmit);
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  // Filter cities
  const filteredCities = cities.filter((city: City) => {
    const matchesSearch = city.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      city.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
      city.state?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRegion = filterRegion === "all" || city.region === filterRegion;
    return matchesSearch && matchesRegion;
  });

  const formatPopulation = (pop: number) => {
    if (pop >= 1000000) return `${(pop / 1000000).toFixed(1)}M`;
    if (pop >= 1000) return `${(pop / 1000).toFixed(0)}K`;
    return pop.toString();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Cities</h1>
          <p className="text-muted-foreground">Manage cities in the TavvY platform</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingCity(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add City
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingCity ? "Edit City" : "Add New City"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="basic">Basic</TabsTrigger>
                  <TabsTrigger value="location">Location</TabsTrigger>
                  <TabsTrigger value="editorial">Editorial</TabsTrigger>
                  <TabsTrigger value="practical">Practical</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">City Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="New York City"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="slug">Slug (auto-generated if empty)</Label>
                      <Input
                        id="slug"
                        value={formData.slug}
                        onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                        placeholder="new-york-city"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="state">State/Province</Label>
                      <Input
                        id="state"
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        placeholder="New York"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="country">Country *</Label>
                      <Input
                        id="country"
                        value={formData.country}
                        onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                        placeholder="United States"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="region">Region</Label>
                      <Select
                        value={formData.region}
                        onValueChange={(value) => setFormData({ ...formData, region: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select region" />
                        </SelectTrigger>
                        <SelectContent>
                          {REGIONS.map((region) => (
                            <SelectItem key={region} value={region}>
                              {region}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="population">Population</Label>
                      <Input
                        id="population"
                        type="number"
                        value={formData.population}
                        onChange={(e) => setFormData({ ...formData, population: parseInt(e.target.value) || 0 })}
                        placeholder="8000000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="timezone">Timezone</Label>
                      <Input
                        id="timezone"
                        value={formData.timezone}
                        onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                        placeholder="America/New_York"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Short Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="A brief description of the city..."
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cover_image_url">Cover Image URL</Label>
                      <Input
                        id="cover_image_url"
                        value={formData.cover_image_url}
                        onChange={(e) => setFormData({ ...formData, cover_image_url: e.target.value })}
                        placeholder="https://..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="thumbnail_image_url">Thumbnail Image URL</Label>
                      <Input
                        id="thumbnail_image_url"
                        value={formData.thumbnail_image_url}
                        onChange={(e) => setFormData({ ...formData, thumbnail_image_url: e.target.value })}
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="location" className="space-y-4 mt-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="airport_code">Airport Code</Label>
                      <Input
                        id="airport_code"
                        value={formData.airport_code}
                        onChange={(e) => setFormData({ ...formData, airport_code: e.target.value.toUpperCase() })}
                        placeholder="JFK"
                        maxLength={5}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="latitude">Latitude</Label>
                      <Input
                        id="latitude"
                        type="number"
                        step="any"
                        value={formData.latitude}
                        onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) || 0 })}
                        placeholder="40.7128"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="longitude">Longitude</Label>
                      <Input
                        id="longitude"
                        type="number"
                        step="any"
                        value={formData.longitude}
                        onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) || 0 })}
                        placeholder="-74.0060"
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="editorial" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="history">History</Label>
                    <Textarea
                      id="history"
                      value={formData.history}
                      onChange={(e) => setFormData({ ...formData, history: e.target.value })}
                      placeholder="The city's historical background..."
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="culture">Culture</Label>
                    <Textarea
                      id="culture"
                      value={formData.culture}
                      onChange={(e) => setFormData({ ...formData, culture: e.target.value })}
                      placeholder="Cultural highlights and character..."
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="famous_people">Famous People</Label>
                    <Textarea
                      id="famous_people"
                      value={formData.famous_people}
                      onChange={(e) => setFormData({ ...formData, famous_people: e.target.value })}
                      placeholder="Notable people from this city (comma separated)..."
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="local_economy">Local Economy</Label>
                    <Textarea
                      id="local_economy"
                      value={formData.local_economy}
                      onChange={(e) => setFormData({ ...formData, local_economy: e.target.value })}
                      placeholder="Major industries and economic overview..."
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="major_companies">Major Companies</Label>
                    <Textarea
                      id="major_companies"
                      value={formData.major_companies}
                      onChange={(e) => setFormData({ ...formData, major_companies: e.target.value })}
                      placeholder="Headquarters and big employers (comma separated)..."
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="political_leaning">Political Leaning</Label>
                    <Input
                      id="political_leaning"
                      value={formData.political_leaning}
                      onChange={(e) => setFormData({ ...formData, political_leaning: e.target.value })}
                      placeholder="e.g., Leans Democratic 54%"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="then_now_next">Then / Now / Next</Label>
                    <Textarea
                      id="then_now_next"
                      value={formData.then_now_next}
                      onChange={(e) => setFormData({ ...formData, then_now_next: e.target.value })}
                      placeholder="Past, present, and future outlook..."
                      rows={3}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="practical" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="weather_summary">Weather Summary</Label>
                    <Textarea
                      id="weather_summary"
                      value={formData.weather_summary}
                      onChange={(e) => setFormData({ ...formData, weather_summary: e.target.value })}
                      placeholder="Climate overview..."
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="best_time_to_visit">Best Time to Visit</Label>
                    <Input
                      id="best_time_to_visit"
                      value={formData.best_time_to_visit}
                      onChange={(e) => setFormData({ ...formData, best_time_to_visit: e.target.value })}
                      placeholder="e.g., Spring (April-June) and Fall (September-November)"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cost_of_living_index">Cost of Living Index (100 = avg)</Label>
                      <Input
                        id="cost_of_living_index"
                        type="number"
                        value={formData.cost_of_living_index}
                        onChange={(e) => setFormData({ ...formData, cost_of_living_index: parseInt(e.target.value) || 100 })}
                        placeholder="100"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="walkability_score">Walkability Score (0-100)</Label>
                      <Input
                        id="walkability_score"
                        type="number"
                        min="0"
                        max="100"
                        value={formData.walkability_score}
                        onChange={(e) => setFormData({ ...formData, walkability_score: parseInt(e.target.value) || 50 })}
                        placeholder="50"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="sales_tax_rate">Sales Tax Rate (%)</Label>
                      <Input
                        id="sales_tax_rate"
                        type="number"
                        step="0.01"
                        value={formData.sales_tax_rate}
                        onChange={(e) => setFormData({ ...formData, sales_tax_rate: parseFloat(e.target.value) || 0 })}
                        placeholder="8.875"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="avg_gas_price">Avg Gas Price ($)</Label>
                      <Input
                        id="avg_gas_price"
                        type="number"
                        step="0.01"
                        value={formData.avg_gas_price}
                        onChange={(e) => setFormData({ ...formData, avg_gas_price: parseFloat(e.target.value) || 0 })}
                        placeholder="3.50"
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="settings" className="space-y-4 mt-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Featured City</Label>
                      <p className="text-sm text-muted-foreground">
                        Show this city in featured sections
                      </p>
                    </div>
                    <Switch
                      checked={formData.is_featured}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Active</Label>
                      <p className="text-sm text-muted-foreground">
                        Make this city visible in the app
                      </p>
                    </div>
                    <Switch
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingCity ? "Update City" : "Create City"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cities</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cities.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Featured</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {cities.filter((c: City) => c.is_featured).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">US Cities</CardTitle>
            <Plane className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {cities.filter((c: City) => c.country === "United States").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">International</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {cities.filter((c: City) => c.country !== "United States").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search cities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterRegion} onValueChange={setFilterRegion}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by region" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Regions</SelectItem>
            {REGIONS.map((region) => (
              <SelectItem key={region} value={region}>
                {region}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Cities Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>City</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Region</TableHead>
              <TableHead>Population</TableHead>
              <TableHead>Airport</TableHead>
              <TableHead>Featured</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  Loading cities...
                </TableCell>
              </TableRow>
            ) : filteredCities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  No cities found
                </TableCell>
              </TableRow>
            ) : (
              filteredCities.map((city: City) => (
                <TableRow key={city.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {city.cover_image_url && (
                        <img
                          src={city.cover_image_url}
                          alt={city.name}
                          className="w-10 h-10 rounded object-cover"
                        />
                      )}
                      <div>
                        <div className="font-medium">{city.name}</div>
                        <div className="text-sm text-muted-foreground">{city.slug}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {city.state ? `${city.state}, ${city.country}` : city.country}
                  </TableCell>
                  <TableCell>{city.region}</TableCell>
                  <TableCell>{formatPopulation(city.population)}</TableCell>
                  <TableCell>{city.airport_code || "-"}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      city.is_featured ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-800"
                    }`}>
                      {city.is_featured ? "Featured" : "No"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      city.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                    }`}>
                      {city.is_active ? "Active" : "Inactive"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(city)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(city.id, city.name)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
