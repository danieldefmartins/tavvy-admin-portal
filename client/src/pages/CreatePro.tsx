import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  Loader2,
  Plus,
  Building2,
  Phone,
  Globe,
  Mail,
  User,
  MapPin,
  CreditCard,
  Shield,
  Briefcase,
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
import { toast } from "sonner";

const PROVIDER_TYPES = [
  { value: "pro", label: "Professional / Contractor" },
  { value: "realtor", label: "Realtor / Real Estate" },
  { value: "on_the_go", label: "On-The-Go / Mobile" },
  { value: "other", label: "Other" },
];

const TRADE_CATEGORIES = [
  { value: "electrician", label: "Electrician" },
  { value: "plumber", label: "Plumber" },
  { value: "hvac", label: "HVAC" },
  { value: "roofing", label: "Roofing" },
  { value: "painting", label: "Painting" },
  { value: "landscaping", label: "Landscaping" },
  { value: "cleaning", label: "Cleaning" },
  { value: "handyman", label: "Handyman" },
  { value: "pool-contractor", label: "Pool Contractor" },
  { value: "floor-installation", label: "Floor Installation" },
  { value: "kitchen-remodeling", label: "Kitchen Remodeling" },
  { value: "bathroom-remodeling", label: "Bathroom Remodeling" },
  { value: "pest-control", label: "Pest Control" },
  { value: "garage-door", label: "Garage Door" },
  { value: "drywall", label: "Drywall" },
  { value: "real-estate", label: "Real Estate" },
  { value: "food-truck", label: "Food Truck" },
  { value: "other", label: "Other" },
];

const initialFormState = {
  business_name: "",
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  description: "",
  provider_type: "pro",
  trade_category: "",
  address: "",
  city: "",
  state: "",
  zip_code: "",
  service_radius: 25,
  years_in_business: "",
  license_number: "",
  is_insured: false,
  is_licensed: false,
  website: "",
  whatsapp_number: "",
  is_free_pro: true,
  create_ecard: true,
  user_id: "",
};

export default function CreatePro() {
  const [, navigate] = useLocation();
  const [formData, setFormData] = useState(initialFormState);
  const [showDetails, setShowDetails] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);

  const createPro = trpc.pros.create.useMutation({
    onSuccess: (data) => {
      toast.success(
        `Pro "${formData.business_name}" created!` +
        (data.cardId ? " eCard was also created." : "")
      );
      navigate("/providers");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create pro");
    },
  });

  const handleInputChange = (field: string, value: string | boolean | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.business_name.trim()) {
      toast.error("Business name is required");
      return;
    }

    const submitData: Record<string, any> = {
      business_name: formData.business_name.trim(),
      first_name: formData.first_name || undefined,
      last_name: formData.last_name || undefined,
      email: formData.email || undefined,
      phone: formData.phone || undefined,
      description: formData.description || undefined,
      provider_type: formData.provider_type || undefined,
      trade_category: formData.trade_category || undefined,
      address: formData.address || undefined,
      city: formData.city || undefined,
      state: formData.state || undefined,
      zip_code: formData.zip_code || undefined,
      service_radius: formData.service_radius || 25,
      years_in_business: formData.years_in_business ? parseInt(formData.years_in_business) : undefined,
      license_number: formData.license_number || undefined,
      is_insured: formData.is_insured,
      is_licensed: formData.is_licensed,
      website: formData.website || undefined,
      whatsapp_number: formData.whatsapp_number || undefined,
      is_free_pro: formData.is_free_pro,
      create_ecard: formData.create_ecard,
      user_id: formData.user_id || undefined,
    };

    createPro.mutate(submitData);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/providers")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Pro Profile</h1>
          <p className="text-muted-foreground">
            Add a new professional provider to Tavvy
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Subscription & eCard Options */}
        <Card className="mb-6 border-orange-500/30 bg-gradient-to-r from-orange-500/5 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-orange-400" />
              Subscription & eCard
            </CardTitle>
            <CardDescription>
              Set up the pro's subscription plan and digital business card
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-base font-medium">Free Pro Account</Label>
                <p className="text-sm text-muted-foreground">
                  Grant pro access without requiring payment. All features work including eCard.
                </p>
              </div>
              <Switch
                checked={formData.is_free_pro}
                onCheckedChange={(checked) => handleInputChange("is_free_pro", checked)}
              />
            </div>

            {!formData.is_free_pro && (
              <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <p className="text-sm text-yellow-400">
                  Paid plan: Early Adopter ($99/year). Subscription will be set to active with 1-year expiry.
                </p>
              </div>
            )}

            {formData.is_free_pro && (
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <p className="text-sm text-green-400">
                  Free plan: No payment required. Subscription set to active with no expiry. All features enabled.
                </p>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-base font-medium">Create eCard (Digital Business Card)</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically create a digital business card with the pro's info
                </p>
              </div>
              <Switch
                checked={formData.create_ecard}
                onCheckedChange={(checked) => handleInputChange("create_ecard", checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Required Fields */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Business Information
            </CardTitle>
            <CardDescription>Core details about the business</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Business Name *</Label>
              <Input
                value={formData.business_name}
                onChange={(e) => handleInputChange("business_name", e.target.value)}
                placeholder="e.g. Smith Plumbing LLC"
                className="text-lg"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Provider Type</Label>
                <Select
                  value={formData.provider_type}
                  onValueChange={(v) => handleInputChange("provider_type", v)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROVIDER_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Trade Category</Label>
                <Select
                  value={formData.trade_category}
                  onValueChange={(v) => handleInputChange("trade_category", v)}
                >
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {TRADE_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={formData.first_name}
                    onChange={(e) => handleInputChange("first_name", e.target.value)}
                    placeholder="John"
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input
                  value={formData.last_name}
                  onChange={(e) => handleInputChange("last_name", e.target.value)}
                  placeholder="Smith"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    placeholder="john@smithplumbing.com"
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    placeholder="(555) 123-4567"
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                placeholder="Tell us about this business..."
                rows={3}
              />
            </div>

            {/* Location */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>City</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={formData.city}
                    onChange={(e) => handleInputChange("city", e.target.value)}
                    placeholder="Miami"
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>State</Label>
                <Input
                  value={formData.state}
                  onChange={(e) => handleInputChange("state", e.target.value)}
                  placeholder="FL"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>ZIP Code</Label>
                <Input
                  value={formData.zip_code}
                  onChange={(e) => handleInputChange("zip_code", e.target.value)}
                  placeholder="33101"
                />
              </div>
              <div className="space-y-2">
                <Label>Service Radius (miles)</Label>
                <Input
                  type="number"
                  value={formData.service_radius}
                  onChange={(e) => handleInputChange("service_radius", parseInt(e.target.value) || 25)}
                  placeholder="25"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Optional: Contact & Web */}
        <Collapsible open={showDetails} onOpenChange={setShowDetails} className="mb-6">
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    Web & Contact Details
                  </CardTitle>
                  <Badge variant="outline">{showDetails ? "Hide" : "Show"}</Badge>
                </div>
                <CardDescription>Website, WhatsApp, address, user linking</CardDescription>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4 pt-0">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Website</Label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={formData.website}
                        onChange={(e) => handleInputChange("website", e.target.value)}
                        placeholder="https://smithplumbing.com"
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>WhatsApp</Label>
                    <Input
                      value={formData.whatsapp_number}
                      onChange={(e) => handleInputChange("whatsapp_number", e.target.value)}
                      placeholder="+1 555 123 4567"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Street Address</Label>
                  <Input
                    value={formData.address}
                    onChange={(e) => handleInputChange("address", e.target.value)}
                    placeholder="123 Main St"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Link to Existing User (optional)</Label>
                  <Input
                    value={formData.user_id}
                    onChange={(e) => handleInputChange("user_id", e.target.value)}
                    placeholder="User UUID (leave blank if no existing account)"
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    If this pro already has a Tavvy account, paste their user ID to link it. Otherwise leave blank.
                  </p>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Optional: Credentials */}
        <Collapsible open={showCredentials} onOpenChange={setShowCredentials} className="mb-6">
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Credentials & Experience
                  </CardTitle>
                  <Badge variant="outline">{showCredentials ? "Hide" : "Show"}</Badge>
                </div>
                <CardDescription>License, insurance, years of experience</CardDescription>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4 pt-0">
                <div className="space-y-2">
                  <Label>Years in Business</Label>
                  <Input
                    type="number"
                    value={formData.years_in_business}
                    onChange={(e) => handleInputChange("years_in_business", e.target.value)}
                    placeholder="e.g. 10"
                  />
                </div>

                <div className="space-y-2">
                  <Label>License Number</Label>
                  <Input
                    value={formData.license_number}
                    onChange={(e) => handleInputChange("license_number", e.target.value)}
                    placeholder="License #"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Licensed</Label>
                    <p className="text-xs text-muted-foreground">Has a valid professional license</p>
                  </div>
                  <Switch
                    checked={formData.is_licensed}
                    onCheckedChange={(v) => handleInputChange("is_licensed", v)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Insured</Label>
                    <p className="text-xs text-muted-foreground">Has liability insurance coverage</p>
                  </div>
                  <Switch
                    checked={formData.is_insured}
                    onCheckedChange={(v) => handleInputChange("is_insured", v)}
                  />
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Submit */}
        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/providers")}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={createPro.isPending || !formData.business_name}
            className="flex-1"
          >
            {createPro.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Create Pro {formData.create_ecard ? "+ eCard" : ""}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
