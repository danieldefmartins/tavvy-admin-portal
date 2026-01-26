import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { 
  ArrowLeft,
  MapPin, 
  Loader2, 
  Check,
  Plus,
  ChevronDown,
  ChevronUp,
  Building2,
  Phone,
  Globe,
  Mail,
  Instagram,
  Facebook,
  Twitter,
  Image,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

// Category definitions with icons
const CATEGORIES = [
  { slug: 'arts', name: 'Arts & Culture', icon: '🎨' },
  { slug: 'automotive', name: 'Automotive', icon: '🚗' },
  { slug: 'nightlife', name: 'Bars & Nightlife', icon: '🍸' },
  { slug: 'beauty', name: 'Beauty & Personal Care', icon: '💅' },
  { slug: 'business', name: 'Business Services', icon: '💼' },
  { slug: 'coffee_tea', name: 'Coffee & Tea', icon: '☕' },
  { slug: 'education', name: 'Education', icon: '📚' },
  { slug: 'entertainment', name: 'Entertainment', icon: '🎬' },
  { slug: 'events', name: 'Events & Venues', icon: '🎪' },
  { slug: 'financial', name: 'Financial Services', icon: '🏦' },
  { slug: 'fitness', name: 'Fitness & Sports', icon: '🏋️' },
  { slug: 'food', name: 'Food & Dining', icon: '🍽️' },
  { slug: 'government', name: 'Government', icon: '🏛️' },
  { slug: 'health', name: 'Health & Medical', icon: '🏥' },
  { slug: 'home', name: 'Home Services', icon: '🏠' },
  { slug: 'hotels', name: 'Hotels & Lodging', icon: '🏨' },
  { slug: 'legal', name: 'Legal Services', icon: '⚖️' },
  { slug: 'outdoors', name: 'Outdoors & Recreation', icon: '🏕️' },
  { slug: 'pets', name: 'Pets & Animals', icon: '🐾' },
  { slug: 'professional', name: 'Professional Services', icon: '👔' },
  { slug: 'real_estate', name: 'Real Estate', icon: '🏘️' },
  { slug: 'religious', name: 'Religious Organizations', icon: '⛪' },
  { slug: 'rv_camping', name: 'RV & Camping', icon: '🚐' },
  { slug: 'shopping', name: 'Shopping & Retail', icon: '🛍️' },
  { slug: 'transportation', name: 'Transportation', icon: '🚌' },
  { slug: 'other', name: 'Other', icon: '📍' },
];

// Initial form state
const initialFormState = {
  name: "",
  tavvy_category: "",
  tavvy_subcategory: "",
  description: "",
  address: "",
  address_line2: "",
  city: "",
  region: "",
  postcode: "",
  country: "US",
  latitude: "",
  longitude: "",
  phone: "",
  email: "",
  website: "",
  instagram: "",
  facebook: "",
  twitter: "",
  tiktok: "",
  hours_display: "",
  price_level: "",
  cover_image_url: "",
};

export default function CreatePlace() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [formData, setFormData] = useState(initialFormState);
  const [showOptional, setShowOptional] = useState(false);
  const [showSocials, setShowSocials] = useState(false);
  
  // Create place mutation
  const createPlace = trpc.places.create.useMutation({
    onSuccess: (data) => {
      toast({
        title: "Place created!",
        description: `"${data.name}" has been added successfully.`,
      });
      navigate("/places");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create place",
        variant: "destructive",
      });
    },
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a name for this place.",
        variant: "destructive",
      });
      return;
    }
    
    if (!formData.tavvy_category) {
      toast({
        title: "Category required",
        description: "Please select a category for this place.",
        variant: "destructive",
      });
      return;
    }

    // Prepare data for submission
    const submitData = {
      name: formData.name.trim(),
      tavvy_category: formData.tavvy_category,
      tavvy_subcategory: formData.tavvy_subcategory || undefined,
      description: formData.description || undefined,
      address: formData.address || undefined,
      address_line2: formData.address_line2 || undefined,
      city: formData.city || undefined,
      region: formData.region || undefined,
      postcode: formData.postcode || undefined,
      country: formData.country || undefined,
      latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
      longitude: formData.longitude ? parseFloat(formData.longitude) : undefined,
      phone: formData.phone || undefined,
      email: formData.email || undefined,
      website: formData.website || undefined,
      instagram: formData.instagram || undefined,
      facebook: formData.facebook || undefined,
      twitter: formData.twitter || undefined,
      tiktok: formData.tiktok || undefined,
      hours_display: formData.hours_display || undefined,
      price_level: formData.price_level ? parseInt(formData.price_level) : undefined,
      cover_image_url: formData.cover_image_url || undefined,
    };

    createPlace.mutate(submitData);
  };

  const selectedCategory = CATEGORIES.find(c => c.slug === formData.tavvy_category);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/places")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Add New Place</h1>
          <p className="text-muted-foreground">Create a new place in the Tavvy database</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Required Fields Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Basic Information
            </CardTitle>
            <CardDescription>Required fields to create a place</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Category Selection */}
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select
                value={formData.tavvy_category}
                onValueChange={(value) => handleInputChange("tavvy_category", value)}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.slug} value={cat.slug}>
                      <span className="flex items-center gap-2">
                        <span>{cat.icon}</span>
                        <span>{cat.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedCategory && (
                <Badge variant="secondary" className="mt-2">
                  {selectedCategory.icon} {selectedCategory.name}
                </Badge>
              )}
            </div>

            {/* Place Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Place Name *</Label>
              <Input
                id="name"
                placeholder="e.g. Joe's Coffee Shop"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                className="text-lg"
              />
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label htmlFor="address">Street Address</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="address"
                  placeholder="123 Main Street"
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* City, State, Zip Row */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  placeholder="New York"
                  value={formData.city}
                  onChange={(e) => handleInputChange("city", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="region">State/Region</Label>
                <Input
                  id="region"
                  placeholder="NY"
                  value={formData.region}
                  onChange={(e) => handleInputChange("region", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postcode">ZIP/Postal Code</Label>
                <Input
                  id="postcode"
                  placeholder="10001"
                  value={formData.postcode}
                  onChange={(e) => handleInputChange("postcode", e.target.value)}
                />
              </div>
            </div>

            {/* Country */}
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Select
                value={formData.country}
                onValueChange={(value) => handleInputChange("country", value)}
              >
                <SelectTrigger id="country">
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="US">United States</SelectItem>
                  <SelectItem value="CA">Canada</SelectItem>
                  <SelectItem value="GB">United Kingdom</SelectItem>
                  <SelectItem value="AU">Australia</SelectItem>
                  <SelectItem value="DE">Germany</SelectItem>
                  <SelectItem value="FR">France</SelectItem>
                  <SelectItem value="ES">Spain</SelectItem>
                  <SelectItem value="IT">Italy</SelectItem>
                  <SelectItem value="BR">Brazil</SelectItem>
                  <SelectItem value="MX">Mexico</SelectItem>
                  <SelectItem value="JP">Japan</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information - Collapsible */}
        <Collapsible open={showOptional} onOpenChange={setShowOptional} className="mb-6">
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Phone className="h-5 w-5" />
                    <CardTitle>Contact & Details</CardTitle>
                  </div>
                  {showOptional ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </div>
                <CardDescription>Phone, email, website, and description</CardDescription>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4 pt-0">
                {/* Phone */}
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      placeholder="+1 (555) 123-4567"
                      value={formData.phone}
                      onChange={(e) => handleInputChange("phone", e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="contact@example.com"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Website */}
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="website"
                      placeholder="https://example.com"
                      value={formData.website}
                      onChange={(e) => handleInputChange("website", e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Tell us about this place..."
                    value={formData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    rows={3}
                  />
                </div>

                {/* Hours */}
                <div className="space-y-2">
                  <Label htmlFor="hours">Hours of Operation</Label>
                  <Input
                    id="hours"
                    placeholder="Mon-Fri 9am-5pm, Sat 10am-3pm"
                    value={formData.hours_display}
                    onChange={(e) => handleInputChange("hours_display", e.target.value)}
                  />
                </div>

                {/* Price Level */}
                <div className="space-y-2">
                  <Label htmlFor="price_level">Price Level</Label>
                  <Select
                    value={formData.price_level}
                    onValueChange={(value) => handleInputChange("price_level", value)}
                  >
                    <SelectTrigger id="price_level">
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

                {/* Cover Image URL */}
                <div className="space-y-2">
                  <Label htmlFor="cover_image_url">Cover Image URL</Label>
                  <div className="relative">
                    <Image className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="cover_image_url"
                      placeholder="https://example.com/image.jpg"
                      value={formData.cover_image_url}
                      onChange={(e) => handleInputChange("cover_image_url", e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Coordinates */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="latitude">Latitude</Label>
                    <Input
                      id="latitude"
                      type="number"
                      step="any"
                      placeholder="40.7128"
                      value={formData.latitude}
                      onChange={(e) => handleInputChange("latitude", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="longitude">Longitude</Label>
                    <Input
                      id="longitude"
                      type="number"
                      step="any"
                      placeholder="-74.0060"
                      value={formData.longitude}
                      onChange={(e) => handleInputChange("longitude", e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Social Media - Collapsible */}
        <Collapsible open={showSocials} onOpenChange={setShowSocials} className="mb-6">
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Instagram className="h-5 w-5" />
                    <CardTitle>Social Media</CardTitle>
                  </div>
                  {showSocials ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </div>
                <CardDescription>Instagram, Facebook, Twitter, TikTok</CardDescription>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4 pt-0">
                <div className="grid grid-cols-2 gap-4">
                  {/* Instagram */}
                  <div className="space-y-2">
                    <Label htmlFor="instagram">Instagram</Label>
                    <div className="relative">
                      <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="instagram"
                        placeholder="@username"
                        value={formData.instagram}
                        onChange={(e) => handleInputChange("instagram", e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {/* Facebook */}
                  <div className="space-y-2">
                    <Label htmlFor="facebook">Facebook</Label>
                    <div className="relative">
                      <Facebook className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="facebook"
                        placeholder="facebook.com/page"
                        value={formData.facebook}
                        onChange={(e) => handleInputChange("facebook", e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {/* Twitter */}
                  <div className="space-y-2">
                    <Label htmlFor="twitter">Twitter / X</Label>
                    <div className="relative">
                      <Twitter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="twitter"
                        placeholder="@username"
                        value={formData.twitter}
                        onChange={(e) => handleInputChange("twitter", e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {/* TikTok */}
                  <div className="space-y-2">
                    <Label htmlFor="tiktok">TikTok</Label>
                    <Input
                      id="tiktok"
                      placeholder="@username"
                      value={formData.tiktok}
                      onChange={(e) => handleInputChange("tiktok", e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Submit Button */}
        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/places")}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={createPlace.isPending || !formData.name || !formData.tavvy_category}
            className="flex-1"
          >
            {createPlace.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Create Place
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
