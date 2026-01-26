import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Search, Zap, ThumbsUp, Sparkles, AlertTriangle, Loader2, MapPin, CheckCircle2, Filter, ChevronDown, ChevronUp, Check, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export default function QuickEntry() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedPlace, setSelectedPlace] = useState<{
    id: string;
    name: string;
    city?: string;
    state?: string;
  } | null>(null);
  const [selectedSignals, setSelectedSignals] = useState<Map<string, number>>(new Map());
  
  // Location filter state
  const [showFilters, setShowFilters] = useState(false);
  const [countryOpen, setCountryOpen] = useState(false);
  const [filters, setFilters] = useState({
    country: "",
    state: "",
    city: "",
  });

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

  // Use advanced search when filters are applied
  const hasFilters = filters.country || filters.state || filters.city;
  
  const { data: places, isLoading: placesLoading, isFetching } = trpc.places.searchAdvanced.useQuery(
    { 
      name: debouncedQuery || undefined,
      country: filters.country || undefined,
      state: filters.state || undefined,
      city: filters.city || undefined,
      limit: 20,
      offset: 0,
    },
    { enabled: debouncedQuery.length >= 2 || hasFilters }
  );

  const { data: allSignalDefs } = trpc.signals.getAll.useQuery();

  const submitMutation = trpc.reviews.submitQuick.useMutation({
    onSuccess: (result) => {
      toast.success(`Successfully submitted ${result.success} signals for ${selectedPlace?.name}!`);
      setSelectedSignals(new Map());
      setSelectedPlace(null);
      setSearchQuery("");
      setDebouncedQuery("");
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const handleSearch = () => {
    if (searchQuery.length >= 2 || hasFilters) {
      setDebouncedQuery(searchQuery);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleSelectPlace = (place: { id: string; name: string; city?: string; state?: string }) => {
    setSelectedPlace(place);
    setDebouncedQuery("");
    setSearchQuery("");
  };

  const handleTap = (signalSlug: string) => {
    setSelectedSignals((prev) => {
      const newMap = new Map(prev);
      const current = newMap.get(signalSlug) || 0;
      if (current >= 3) {
        newMap.delete(signalSlug);
      } else {
        newMap.set(signalSlug, current + 1);
      }
      return newMap;
    });
  };

  const handleSubmit = () => {
    if (!selectedPlace) {
      toast.error("Please select a place first");
      return;
    }
    if (selectedSignals.size === 0) {
      toast.error("Please select at least one signal");
      return;
    }

    const signalsArray = Array.from(selectedSignals.entries()).map(([signalSlug, tapCount]) => ({
      signalSlug,
      tapCount,
    }));

    submitMutation.mutate({
      placeId: selectedPlace.id,
      signals: signalsArray,
    });
  };

  const resetFilters = () => {
    setFilters({ country: "", state: "", city: "" });
  };

  // Country name mapping
  const countryNames: Record<string, string> = {
    US: "United States", CA: "Canada", MX: "Mexico", GB: "United Kingdom",
    FR: "France", DE: "Germany", IT: "Italy", ES: "Spain", PT: "Portugal",
    BR: "Brazil", AR: "Argentina", CO: "Colombia", CL: "Chile",
    AU: "Australia", NZ: "New Zealand", JP: "Japan", KR: "South Korea",
    CN: "China", IN: "India", AE: "United Arab Emirates", SA: "Saudi Arabia",
    "United States": "United States",
  };
  const getCountryName = (code: string) => countryNames[code] || code;

  // US State name mapping
  const usStateNames: Record<string, string> = {
    AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
    CO: "Colorado", CT: "Connecticut", DE: "Delaware", DC: "District of Columbia",
    FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois",
    IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana",
    ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota",
    MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada",
    NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York",
    NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon",
    PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota",
    TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia",
    WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
    "Calif": "California", "Florida": "Florida", "New York": "New York",
  };
  const getStateName = (code: string) => usStateNames[code] || code;

  // Map state variations to canonical code
  const stateToCanonical: Record<string, string> = {
    "Calif": "CA", "California": "CA", "Florida": "FL", "New York": "NY", "Texas": "TX",
  };

  // Sort and consolidate countries
  const sortedCountries = useMemo(() => {
    if (!countries) return [];
    const hasUS = countries.includes("US");
    const hasUnitedStates = countries.includes("United States");
    let filtered = [...countries];
    if (hasUS && hasUnitedStates) {
      filtered = filtered.filter(c => c !== "United States");
    }
    return filtered.sort((a, b) => {
      if (a === "US" || a === "United States") return -1;
      if (b === "US" || b === "United States") return 1;
      return getCountryName(a).localeCompare(getCountryName(b));
    });
  }, [countries]);

  // Sort and consolidate regions
  const sortedRegions = useMemo(() => {
    if (!regions) return [];
    const canonicalSet = new Set<string>();
    const result: string[] = [];
    regions.forEach(region => {
      const canonical = stateToCanonical[region] || region;
      if (!canonicalSet.has(canonical)) {
        canonicalSet.add(canonical);
        if (stateToCanonical[region] && regions.includes(canonical)) {
          return;
        }
        result.push(region);
      }
    });
    const finalResult = result.filter(r => {
      const canonical = stateToCanonical[r];
      if (canonical && result.includes(canonical)) return false;
      return true;
    });
    return finalResult.sort((a, b) => getStateName(a).localeCompare(getStateName(b)));
  }, [regions]);

  // Group signals by type
  const bestForSignals = allSignalDefs?.filter((s) => s.signal_type === "best_for") || [];
  const vibeSignals = allSignalDefs?.filter((s) => s.signal_type === "vibe") || [];
  const headsUpSignals = allSignalDefs?.filter((s) => s.signal_type === "heads_up") || [];

  const placesData = places?.places || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Quick Signal Entry</h1>
        <p className="text-muted-foreground">
          Rapidly submit signals for places. Filter by location, search, select, tap, submit.
        </p>
      </div>

      {/* Step 1: Search Place */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">
              1
            </span>
            {selectedPlace ? (
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                Place Selected
              </span>
            ) : (
              "Search for a Place"
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedPlace ? (
            <div className="flex items-center justify-between p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-emerald-500" />
                <div>
                  <p className="font-semibold">{selectedPlace.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {[selectedPlace.city, selectedPlace.state].filter(Boolean).join(", ")} • {selectedPlace.id}
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => setSelectedPlace(null)}>
                Change
              </Button>
            </div>
          ) : (
            <>
              {/* Location Filters */}
              <Collapsible open={showFilters} onOpenChange={setShowFilters} className="mb-4">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2 mb-2">
                    <Filter className="h-4 w-4" />
                    Location Filters
                    {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    {hasFilters && (
                      <Badge variant="secondary" className="ml-2">
                        {[filters.country, filters.state, filters.city].filter(Boolean).length} active
                      </Badge>
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-lg bg-muted/50">
                    {/* Country */}
                    <div className="space-y-2">
                      <Label>Country</Label>
                      <Popover open={countryOpen} onOpenChange={setCountryOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={countryOpen}
                            className="w-full justify-between"
                          >
                            {filters.country ? getCountryName(filters.country) : "Select country..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0">
                          <Command>
                            <CommandInput placeholder="Search country..." />
                            <CommandList>
                              <CommandEmpty>No country found.</CommandEmpty>
                              <CommandGroup>
                                <CommandItem
                                  value="all-countries"
                                  onSelect={() => {
                                    setFilters({ ...filters, country: "", state: "", city: "" });
                                    setCountryOpen(false);
                                  }}
                                >
                                  <Check className={`mr-2 h-4 w-4 ${!filters.country ? "opacity-100" : "opacity-0"}`} />
                                  All Countries
                                </CommandItem>
                                {sortedCountries.map((country) => (
                                  <CommandItem
                                    key={country}
                                    value={`${country} ${getCountryName(country)}`}
                                    onSelect={() => {
                                      setFilters({ ...filters, country, state: "", city: "" });
                                      setCountryOpen(false);
                                    }}
                                  >
                                    <Check className={`mr-2 h-4 w-4 ${filters.country === country ? "opacity-100" : "opacity-0"}`} />
                                    {getCountryName(country)}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* State/Region */}
                    <div className="space-y-2">
                      <Label>State / Region</Label>
                      <Select
                        value={filters.state}
                        onValueChange={(v) => setFilters({ ...filters, state: v === "all" ? "" : v, city: "" })}
                        disabled={!filters.country}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={filters.country ? "Select state" : "Select country first"} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All States</SelectItem>
                          {sortedRegions.map((region) => (
                            <SelectItem key={region} value={region}>
                              {getStateName(region)}
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
                  </div>
                  {hasFilters && (
                    <Button variant="ghost" size="sm" onClick={resetFilters} className="mt-2">
                      Clear Filters
                    </Button>
                  )}
                </CollapsibleContent>
              </Collapsible>

              {/* Search Input */}
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search places by name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="pl-10"
                  />
                </div>
                <Button onClick={handleSearch} disabled={searchQuery.length < 2 && !hasFilters}>
                  {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
                </Button>
              </div>
              
              {hasFilters && !debouncedQuery && (
                <p className="text-sm text-muted-foreground mt-2">
                  Filters applied. Enter a name to search or click Search to browse.
                </p>
              )}

              {/* Search Results */}
              {placesData.length > 0 && (
                <div className="mt-4 space-y-2 max-h-[300px] overflow-y-auto">
                  <p className="text-sm text-muted-foreground mb-2">
                    Found {places?.total || placesData.length} places
                  </p>
                  {placesData.map((place) => (
                    <div
                      key={place.id}
                      onClick={() => handleSelectPlace({ 
                        id: place.id, 
                        name: place.name,
                        city: place.city,
                        state: place.state,
                      })}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                    >
                      <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium truncate">{place.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {[place.city, place.state, place.country].filter(Boolean).join(", ")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {(debouncedQuery || hasFilters) && placesData.length === 0 && !isFetching && (
                <p className="text-sm text-muted-foreground mt-4 text-center py-4">
                  No places found. Try adjusting your filters or search term.
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Step 2: Select Signals */}
      <Card className={!selectedPlace ? "opacity-50 pointer-events-none" : ""}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">
              2
            </span>
            Tap Signals
          </CardTitle>
          <CardDescription>
            Tap each signal 1-3 times to indicate intensity. Tap again to reset.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* The Good (Best For) */}
          <div>
            <h3 className="font-semibold text-emerald-500 flex items-center gap-2 mb-3">
              <ThumbsUp className="h-4 w-4" />
              The Good
            </h3>
            <div className="flex flex-wrap gap-2">
              {bestForSignals.map((signal) => {
                const tapCount = selectedSignals.get(signal.slug) || 0;
                return (
                  <Button
                    key={signal.slug}
                    variant="outline"
                    size="sm"
                    onClick={() => handleTap(signal.slug)}
                    className={`relative ${
                      tapCount > 0
                        ? "bg-emerald-500/20 border-emerald-500 text-emerald-500"
                        : ""
                    }`}
                  >
                    {signal.label}
                    {tapCount > 0 && (
                      <span className="ml-2 bg-emerald-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                        x{tapCount}
                      </span>
                    )}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* The Vibe */}
          <div>
            <h3 className="font-semibold text-blue-500 flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4" />
              The Vibe
            </h3>
            <div className="flex flex-wrap gap-2">
              {vibeSignals.map((signal) => {
                const tapCount = selectedSignals.get(signal.slug) || 0;
                return (
                  <Button
                    key={signal.slug}
                    variant="outline"
                    size="sm"
                    onClick={() => handleTap(signal.slug)}
                    className={`relative ${
                      tapCount > 0 ? "bg-blue-500/20 border-blue-500 text-blue-500" : ""
                    }`}
                  >
                    {signal.label}
                    {tapCount > 0 && (
                      <span className="ml-2 bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                        x{tapCount}
                      </span>
                    )}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Heads Up */}
          <div>
            <h3 className="font-semibold text-orange-500 flex items-center gap-2 mb-3">
              <AlertTriangle className="h-4 w-4" />
              Heads Up
            </h3>
            <div className="flex flex-wrap gap-2">
              {headsUpSignals.map((signal) => {
                const tapCount = selectedSignals.get(signal.slug) || 0;
                return (
                  <Button
                    key={signal.slug}
                    variant="outline"
                    size="sm"
                    onClick={() => handleTap(signal.slug)}
                    className={`relative ${
                      tapCount > 0
                        ? "bg-orange-500/20 border-orange-500 text-orange-500"
                        : ""
                    }`}
                  >
                    {signal.label}
                    {tapCount > 0 && (
                      <span className="ml-2 bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                        x{tapCount}
                      </span>
                    )}
                  </Button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step 3: Submit */}
      <Card className={!selectedPlace || selectedSignals.size === 0 ? "opacity-50" : ""}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">
              3
            </span>
            Submit
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              {selectedSignals.size > 0 ? (
                <>
                  <p className="font-medium">
                    {selectedSignals.size} signal{selectedSignals.size > 1 ? "s" : ""} selected
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {Array.from(selectedSignals.entries())
                      .map(([slug, count]) => `${slug} (x${count})`)
                      .join(", ")}
                  </p>
                </>
              ) : (
                <p className="text-muted-foreground">No signals selected</p>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setSelectedSignals(new Map())}
                disabled={selectedSignals.size === 0}
              >
                Clear
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!selectedPlace || selectedSignals.size === 0 || submitMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {submitMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Zap className="h-4 w-4 mr-2" />
                )}
                Submit Signals
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
