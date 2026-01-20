import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { 
  Search, 
  MapPin, 
  ChevronRight, 
  Loader2, 
  Filter, 
  X, 
  ChevronDown,
  ChevronUp,
  RotateCcw
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Badge } from "@/components/ui/badge";

export default function Places() {
  // Simple search state
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  
  // Advanced filter state
  const [showFilters, setShowFilters] = useState(false);
  const [useAdvancedSearch, setUseAdvancedSearch] = useState(false);
  const [filters, setFilters] = useState({
    name: "",
    address: "",
    city: "",
    state: "",
    country: "",
    category: "",
  });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [page, setPage] = useState(0);
  const limit = 50;

  // Fetch dropdown data
  const { data: countries } = trpc.places.getCountries.useQuery();
  const { data: regions } = trpc.places.getRegions.useQuery(
    { country: filters.country || undefined },
    { enabled: !!filters.country }
  );
  const { data: cities } = trpc.places.getCities.useQuery(
    { country: filters.country || undefined, region: filters.state || undefined },
    { enabled: !!filters.country || !!filters.state }
  );
  const { data: categories } = trpc.places.getCategories.useQuery();

  // Simple search query
  const { data: simplePlaces, isLoading: simpleLoading, isFetching: simpleFetching } = trpc.places.search.useQuery(
    { query: debouncedQuery, limit: 50 },
    { enabled: !useAdvancedSearch && debouncedQuery.length >= 2 }
  );

  // Advanced search query
  const { data: advancedResult, isLoading: advancedLoading, isFetching: advancedFetching } = trpc.places.advancedSearch.useQuery(
    { 
      filters: {
        name: appliedFilters.name || undefined,
        address: appliedFilters.address || undefined,
        city: appliedFilters.city || undefined,
        state: appliedFilters.state || undefined,
        country: appliedFilters.country || undefined,
        category: appliedFilters.category || undefined,
      },
      limit,
      offset: page * limit
    },
    { enabled: useAdvancedSearch && hasActiveFilters(appliedFilters) }
  );

  // Reset dependent dropdowns when parent changes
  useEffect(() => {
    if (!filters.country) {
      setFilters(f => ({ ...f, state: "", city: "" }));
    }
  }, [filters.country]);

  useEffect(() => {
    if (!filters.state) {
      setFilters(f => ({ ...f, city: "" }));
    }
  }, [filters.state]);

  function hasActiveFilters(f: typeof filters): boolean {
    return Object.values(f).some(v => v && v.length > 0);
  }

  const activeFilterCount = Object.values(appliedFilters).filter(v => v && v.length > 0).length;

  const handleSimpleSearch = () => {
    if (searchQuery.length >= 2) {
      setUseAdvancedSearch(false);
      setDebouncedQuery(searchQuery);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSimpleSearch();
    }
  };

  const handleAdvancedSearch = () => {
    setUseAdvancedSearch(true);
    setAppliedFilters(filters);
    setPage(0);
  };

  const handleClearFilters = () => {
    const emptyFilters = {
      name: "",
      address: "",
      city: "",
      state: "",
      country: "",
      category: "",
    };
    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
    setUseAdvancedSearch(false);
    setPage(0);
  };

  const isLoading = simpleLoading || advancedLoading;
  const isFetching = simpleFetching || advancedFetching;
  const places = useAdvancedSearch ? advancedResult?.places : simplePlaces;
  const totalCount = useAdvancedSearch ? (advancedResult?.total || 0) : (simplePlaces?.length || 0);
  const hasResults = places && places.length > 0;
  const hasSearched = useAdvancedSearch ? hasActiveFilters(appliedFilters) : debouncedQuery.length >= 2;

  // Country code to name mapping (common ones)
  const countryNames: Record<string, string> = {
    US: "United States",
    BR: "Brazil",
    GB: "United Kingdom",
    CA: "Canada",
    AU: "Australia",
    DE: "Germany",
    FR: "France",
    ES: "Spain",
    IT: "Italy",
    JP: "Japan",
    MX: "Mexico",
    AR: "Argentina",
    PT: "Portugal",
    NL: "Netherlands",
    BE: "Belgium",
    CH: "Switzerland",
    AT: "Austria",
    SE: "Sweden",
    NO: "Norway",
    DK: "Denmark",
    FI: "Finland",
    IE: "Ireland",
    NZ: "New Zealand",
    SG: "Singapore",
    HK: "Hong Kong",
    AE: "UAE",
    IN: "India",
    CN: "China",
    KR: "South Korea",
    TH: "Thailand",
    PH: "Philippines",
    ID: "Indonesia",
    MY: "Malaysia",
    VN: "Vietnam",
    ZA: "South Africa",
    EG: "Egypt",
    NG: "Nigeria",
    KE: "Kenya",
    CL: "Chile",
    CO: "Colombia",
    PE: "Peru",
    VE: "Venezuela",
    PL: "Poland",
    CZ: "Czech Republic",
    RO: "Romania",
    HU: "Hungary",
    GR: "Greece",
    TR: "Turkey",
    RU: "Russia",
    UA: "Ukraine",
    IL: "Israel",
    SA: "Saudi Arabia",
    QA: "Qatar",
    KW: "Kuwait",
    BH: "Bahrain",
    OM: "Oman",
  };

  const getCountryName = (code: string) => countryNames[code] || code;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Places</h1>
        <p className="text-muted-foreground">Search and browse places in the database</p>
      </div>

      {/* Search Card */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          {/* Simple Search Bar */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Quick search by name, address, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pl-10"
              />
            </div>
            <Button onClick={handleSimpleSearch} disabled={searchQuery.length < 2}>
              {isFetching && !useAdvancedSearch ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Search"
              )}
            </Button>
          </div>

          {/* Advanced Filters Toggle */}
          <Collapsible open={showFilters} onOpenChange={setShowFilters}>
            <div className="flex items-center justify-between">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <Filter className="h-4 w-4" />
                  Advanced Filters
                  {activeFilterCount > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {activeFilterCount}
                    </Badge>
                  )}
                  {showFilters ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" onClick={handleClearFilters} className="gap-2 text-muted-foreground">
                  <RotateCcw className="h-4 w-4" />
                  Clear Filters
                </Button>
              )}
            </div>

            <CollapsibleContent className="pt-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {/* Country */}
                <div className="space-y-2">
                  <Label>Country</Label>
                  <Select
                    value={filters.country}
                    onValueChange={(v) => setFilters({ ...filters, country: v === "all" ? "" : v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Countries</SelectItem>
                      {countries?.map((country) => (
                        <SelectItem key={country} value={country}>
                          {getCountryName(country)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* State/Region */}
                <div className="space-y-2">
                  <Label>State / Region</Label>
                  <Select
                    value={filters.state}
                    onValueChange={(v) => setFilters({ ...filters, state: v === "all" ? "" : v })}
                    disabled={!filters.country}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={filters.country ? "Select state" : "Select country first"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All States</SelectItem>
                      {regions?.map((region) => (
                        <SelectItem key={region} value={region}>
                          {region}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* City */}
                <div className="space-y-2">
                  <Label>City</Label>
                  <Select
                    value={filters.city}
                    onValueChange={(v) => setFilters({ ...filters, city: v === "all" ? "" : v })}
                    disabled={!filters.country && !filters.state}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={filters.country || filters.state ? "Select city" : "Select country/state first"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Cities</SelectItem>
                      {cities?.map((city) => (
                        <SelectItem key={city} value={city}>
                          {city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Business Name */}
                <div className="space-y-2">
                  <Label>Business Name</Label>
                  <Input
                    placeholder="Search by name..."
                    value={filters.name}
                    onChange={(e) => setFilters({ ...filters, name: e.target.value })}
                  />
                </div>

                {/* Address */}
                <div className="space-y-2">
                  <Label>Street Address</Label>
                  <Input
                    placeholder="Search by address..."
                    value={filters.address}
                    onChange={(e) => setFilters({ ...filters, address: e.target.value })}
                  />
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={filters.category}
                    onValueChange={(v) => setFilters({ ...filters, category: v === "all" ? "" : v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories?.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <Button onClick={handleAdvancedSearch} disabled={!hasActiveFilters(filters)}>
                  {isFetching && useAdvancedSearch ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Search className="h-4 w-4 mr-2" />
                  )}
                  Search with Filters
                </Button>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <p className="text-xs text-muted-foreground">
            {useAdvancedSearch 
              ? "Using advanced filters. Clear filters to use quick search."
              : "Enter at least 2 characters for quick search, or use advanced filters below."}
          </p>
        </CardContent>
      </Card>

      {/* Active Filters Display */}
      {useAdvancedSearch && activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {appliedFilters.country && (
            <Badge variant="secondary" className="gap-1">
              Country: {getCountryName(appliedFilters.country)}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => {
                  const newFilters = { ...appliedFilters, country: "", state: "", city: "" };
                  setFilters(newFilters);
                  setAppliedFilters(newFilters);
                }}
              />
            </Badge>
          )}
          {appliedFilters.state && (
            <Badge variant="secondary" className="gap-1">
              State: {appliedFilters.state}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => {
                  const newFilters = { ...appliedFilters, state: "", city: "" };
                  setFilters(newFilters);
                  setAppliedFilters(newFilters);
                }}
              />
            </Badge>
          )}
          {appliedFilters.city && (
            <Badge variant="secondary" className="gap-1">
              City: {appliedFilters.city}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => {
                  const newFilters = { ...appliedFilters, city: "" };
                  setFilters(newFilters);
                  setAppliedFilters(newFilters);
                }}
              />
            </Badge>
          )}
          {appliedFilters.name && (
            <Badge variant="secondary" className="gap-1">
              Name: {appliedFilters.name}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => {
                  const newFilters = { ...appliedFilters, name: "" };
                  setFilters(newFilters);
                  setAppliedFilters(newFilters);
                }}
              />
            </Badge>
          )}
          {appliedFilters.address && (
            <Badge variant="secondary" className="gap-1">
              Address: {appliedFilters.address}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => {
                  const newFilters = { ...appliedFilters, address: "" };
                  setFilters(newFilters);
                  setAppliedFilters(newFilters);
                }}
              />
            </Badge>
          )}
          {appliedFilters.category && (
            <Badge variant="secondary" className="gap-1">
              Category: {appliedFilters.category}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => {
                  const newFilters = { ...appliedFilters, category: "" };
                  setFilters(newFilters);
                  setAppliedFilters(newFilters);
                }}
              />
            </Badge>
          )}
        </div>
      )}

      {/* Results */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : hasResults ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {useAdvancedSearch 
                ? `Showing ${places.length} of ${totalCount} places`
                : `Found ${places.length} places`}
            </p>
            {useAdvancedSearch && totalCount > limit && (
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page + 1} of {Math.ceil(totalCount / limit)}
                </span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setPage(p => p + 1)}
                  disabled={(page + 1) * limit >= totalCount}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
          {places.map((place) => (
            <Link key={place.id} href={`/places/${place.id}`}>
              <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <MapPin className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{place.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {[place.address, place.city, place.state, place.country].filter(Boolean).join(", ") || "No address"}
                      </p>
                      {place.category && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {place.category}
                        </p>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          ))}
          
          {/* Bottom pagination for advanced search */}
          {useAdvancedSearch && totalCount > limit && (
            <div className="flex justify-center gap-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                Previous
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setPage(p => p + 1)}
                disabled={(page + 1) * limit >= totalCount}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      ) : hasSearched ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="font-semibold text-lg mb-2">No places found</h3>
            <p className="text-muted-foreground">
              Try different search terms or adjust your filters
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="font-semibold text-lg mb-2">Search for places</h3>
            <p className="text-muted-foreground">
              Enter a name, address, or place ID to find places, or use advanced filters
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
