import { useState, useMemo, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getRegionsForCountry, hasRegionMapping } from "@/lib/regionMappings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Search, Zap, ThumbsUp, Sparkles, AlertTriangle, Loader2, MapPin, CheckCircle2, Filter, ChevronDown, ChevronUp, Check, ChevronsUpDown, Clock, X } from "lucide-react";
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

// Country code to name mapping
const countryNames: Record<string, string> = {
  AD: "Andorra", AE: "United Arab Emirates", AF: "Afghanistan", AG: "Antigua and Barbuda",
  AL: "Albania", AM: "Armenia", AO: "Angola", AQ: "Antarctica", AR: "Argentina",
  AT: "Austria", AU: "Australia", AW: "Aruba", AX: "Åland Islands", AZ: "Azerbaijan",
  BA: "Bosnia and Herzegovina", BB: "Barbados", BD: "Bangladesh", BE: "Belgium",
  BF: "Burkina Faso", BG: "Bulgaria", BH: "Bahrain", BJ: "Benin", BL: "Saint Barthélemy",
  BM: "Bermuda", BN: "Brunei", BO: "Bolivia", BQ: "Caribbean Netherlands", BR: "Brazil",
  BS: "Bahamas", BT: "Bhutan", BW: "Botswana", BY: "Belarus", BZ: "Belize",
  CA: "Canada", CD: "DR Congo", CG: "Republic of the Congo", CH: "Switzerland",
  CI: "Côte d'Ivoire", CK: "Cook Islands", CL: "Chile", CM: "Cameroon", CN: "China",
  CO: "Colombia", CR: "Costa Rica", CU: "Cuba", CV: "Cape Verde", CW: "Curaçao",
  CY: "Cyprus", CZ: "Czech Republic", DE: "Germany", DK: "Denmark", DM: "Dominica",
  DO: "Dominican Republic", DZ: "Algeria", EC: "Ecuador", EE: "Estonia", EG: "Egypt",
  ES: "Spain", ET: "Ethiopia", FI: "Finland", FJ: "Fiji", FM: "Micronesia",
  FO: "Faroe Islands", FR: "France", GA: "Gabon", GB: "United Kingdom", GE: "Georgia",
  GF: "French Guiana", GH: "Ghana", GI: "Gibraltar", GL: "Greenland", GM: "Gambia",
  GN: "Guinea", GP: "Guadeloupe", GQ: "Equatorial Guinea", GR: "Greece", GT: "Guatemala",
  GU: "Guam", GY: "Guyana", HK: "Hong Kong", HN: "Honduras", HR: "Croatia",
  HT: "Haiti", HU: "Hungary", ID: "Indonesia", IE: "Ireland", IL: "Israel",
  IM: "Isle of Man", IN: "India", IQ: "Iraq", IR: "Iran", IS: "Iceland", IT: "Italy",
  JE: "Jersey", JM: "Jamaica", JO: "Jordan", JP: "Japan", KE: "Kenya", KG: "Kyrgyzstan",
  KH: "Cambodia", KN: "Saint Kitts and Nevis", KR: "South Korea", KW: "Kuwait",
  KY: "Cayman Islands", KZ: "Kazakhstan", LA: "Laos", LB: "Lebanon", LC: "Saint Lucia",
  LI: "Liechtenstein", LK: "Sri Lanka", LR: "Liberia", LS: "Lesotho", LT: "Lithuania",
  LU: "Luxembourg", LV: "Latvia", LY: "Libya", MA: "Morocco", MC: "Monaco",
  MD: "Moldova", ME: "Montenegro", MF: "Saint Martin", MG: "Madagascar", MK: "North Macedonia",
  ML: "Mali", MM: "Myanmar", MN: "Mongolia", MO: "Macau", MP: "Northern Mariana Islands",
  MQ: "Martinique", MR: "Mauritania", MT: "Malta", MU: "Mauritius", MV: "Maldives",
  MW: "Malawi", MX: "Mexico", MY: "Malaysia", MZ: "Mozambique", NA: "Namibia",
  NC: "New Caledonia", NE: "Niger", NG: "Nigeria", NI: "Nicaragua", NL: "Netherlands",
  NO: "Norway", NP: "Nepal", NZ: "New Zealand", OM: "Oman", PA: "Panama", PE: "Peru",
  PF: "French Polynesia", PG: "Papua New Guinea", PH: "Philippines", PK: "Pakistan",
  PL: "Poland", PR: "Puerto Rico", PS: "Palestine", PT: "Portugal", PY: "Paraguay",
  QA: "Qatar", RE: "Réunion", RO: "Romania", RS: "Serbia", RU: "Russia", RW: "Rwanda",
  SA: "Saudi Arabia", SC: "Seychelles", SD: "Sudan", SE: "Sweden", SG: "Singapore",
  SI: "Slovenia", SJ: "Svalbard and Jan Mayen", SK: "Slovakia", SL: "Sierra Leone",
  SM: "San Marino", SN: "Senegal", SO: "Somalia", SR: "Suriname", SS: "South Sudan",
  SV: "El Salvador", SX: "Sint Maarten", SY: "Syria", SZ: "Eswatini", TC: "Turks and Caicos",
  TD: "Chad", TH: "Thailand", TJ: "Tajikistan", TL: "Timor-Leste", TM: "Turkmenistan",
  TN: "Tunisia", TR: "Turkey", TT: "Trinidad and Tobago", TW: "Taiwan", TZ: "Tanzania",
  UA: "Ukraine", UG: "Uganda", US: "United States", UY: "Uruguay", UZ: "Uzbekistan",
  VC: "Saint Vincent", VE: "Venezuela", VG: "British Virgin Islands", VI: "US Virgin Islands",
  VN: "Vietnam", VU: "Vanuatu", WS: "Samoa", XK: "Kosovo", ZA: "South Africa",
  ZM: "Zambia", ZW: "Zimbabwe",
};

const getCountryName = (code: string) => countryNames[code] || code;

// Draft interface for localStorage
interface QuickEntryDraft {
  place: { id: string; name: string };
  signals: [string, number][];
  timestamp: number;
}

export default function QuickEntry() {
  // Location filter state
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("");
  const [citySearch, setCitySearch] = useState("");
  const [countryOpen, setCountryOpen] = useState(false);
  const [regionOpen, setRegionOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedPlace, setSelectedPlace] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [selectedSignals, setSelectedSignals] = useState<Map<string, number>>(new Map());
  const [showFilters, setShowFilters] = useState(true);

  // NEW: Signal search and collapsible state
  const [signalSearchQuery, setSignalSearchQuery] = useState("");
  const [collapsedCategories, setCollapsedCategories] = useState({
    bestFor: false,  // Start expanded
    vibe: true,      // Start collapsed
    headsUp: true    // Start collapsed
  });

  // NEW: Draft state
  const [hasDraft, setHasDraft] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);

  // OPTIMIZATION: Add debouncing to search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300); // 300ms debounce
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // NEW: Load draft from localStorage on mount
  useEffect(() => {
    const draftStr = localStorage.getItem('quickEntryDraft');
    if (draftStr) {
      try {
        const draft: QuickEntryDraft = JSON.parse(draftStr);
        // Only load if less than 24 hours old
        if (Date.now() - draft.timestamp < 24 * 60 * 60 * 1000) {
          setHasDraft(true);
        }
      } catch (e) {
        // Invalid draft, ignore
      }
    }
  }, []);

  // NEW: Auto-save draft to localStorage
  useEffect(() => {
    if (selectedPlace && selectedSignals.size > 0) {
      const draft: QuickEntryDraft = {
        place: selectedPlace,
        signals: Array.from(selectedSignals.entries()),
        timestamp: Date.now()
      };
      localStorage.setItem('quickEntryDraft', JSON.stringify(draft));
      setDraftSaved(true);
      setTimeout(() => setDraftSaved(false), 2000);
    }
  }, [selectedPlace, selectedSignals]);

  // NEW: Load draft function
  const loadDraft = () => {
    const draftStr = localStorage.getItem('quickEntryDraft');
    if (draftStr) {
      try {
        const draft: QuickEntryDraft = JSON.parse(draftStr);
        setSelectedPlace(draft.place);
        setSelectedSignals(new Map(draft.signals));
        setHasDraft(false);
        toast.success("Draft loaded!");
      } catch (e) {
        toast.error("Failed to load draft");
      }
    }
  };

  // NEW: Clear draft function
  const clearDraft = () => {
    localStorage.removeItem('quickEntryDraft');
    setHasDraft(false);
    toast.success("Draft cleared");
  };

  // Fetch countries from lookup table
  const { data: countries } = trpc.places.getCountries.useQuery();

  // Fetch regions when country is selected (only if no mapping exists)
  const { data: fsqRegions, isLoading: regionsLoading } = trpc.places.getFsqRegions.useQuery(
    { country: selectedCountry },
    { enabled: !!selectedCountry && !hasRegionMapping(selectedCountry) }
  );

  // Use region mappings for countries with clean data, otherwise use fsq regions
  const regions = useMemo(() => {
    if (!selectedCountry) return [];
    
    // Check if we have a clean mapping for this country
    const mappedRegions = getRegionsForCountry(selectedCountry);
    if (mappedRegions) {
      return mappedRegions;
    }
    
    // Fall back to database regions for countries without mappings
    return fsqRegions || [];
  }, [selectedCountry, fsqRegions]);

  // Fetch cities when country (and optionally region) is selected
  const { data: cities, isLoading: citiesLoading } = trpc.places.getFsqCities.useQuery(
    { country: selectedCountry, region: selectedRegion || undefined },
    { enabled: !!selectedCountry }
  );

  // OPTIMIZATION: Reduced initial limit from 100 to 30 for faster loading
  const { 
    data: fsqPlacesResult, 
    isLoading: fsqLoading, 
    isFetching: fsqFetching,
    fetchNextPage: fetchNextFsqPage,
    hasNextPage: hasNextFsqPage,
    isFetchingNextPage: isFetchingNextFsqPage
  } = trpc.places.searchFsq.useInfiniteQuery(
    { 
      name: debouncedQuery,
      country: selectedCountry || undefined, 
      region: selectedRegion || undefined,
      city: citySearch || undefined,
      limit: 30  // REDUCED from 100
    },
    { 
      enabled: debouncedQuery.length >= 2,
      getNextPageParam: (lastPage, allPages) => {
        if (lastPage.places.length < 30) return undefined;
        return allPages.length * 30;
      },
    }
  );

  // OPTIMIZATION: Only use simple search as fallback if fsq search fails
  const { data: simplePlaces, isLoading: simpleLoading, isFetching: simpleFetching } = trpc.places.search.useQuery(
    { query: debouncedQuery, limit: 30 },
    { 
      enabled: debouncedQuery.length >= 2 && (!fsqPlacesResult || fsqPlacesResult.pages[0]?.places.length === 0)
    }
  );

  // Ref for infinite scroll observer
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Set up intersection observer for infinite scroll
  useEffect(() => {
    if (!loadMoreRef.current || !hasNextFsqPage || isFetchingNextFsqPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextFsqPage && !isFetchingNextFsqPage) {
          fetchNextFsqPage();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasNextFsqPage, isFetchingNextFsqPage, fetchNextFsqPage]);

  // OPTIMIZATION: Add staleTime to cache signal definitions
  const { data: allSignalDefs, error: signalsError } = trpc.signals.getAll.useQuery(undefined, {
    staleTime: 60 * 60 * 1000, // 1 hour
    cacheTime: 24 * 60 * 60 * 1000, // 24 hours
  });

  const submitMutation = trpc.reviews.submitQuick.useMutation({
    onSuccess: (result) => {
      toast.success(`Successfully submitted ${result.success} signals for ${selectedPlace?.name}!`);
      setSelectedSignals(new Map());
      setSelectedPlace(null);
      setSearchQuery("");
      setDebouncedQuery("");
      localStorage.removeItem('quickEntryDraft');
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  // Sort countries with US first
  const sortedCountries = useMemo(() => {
    if (!countries) return [];
    return [...countries].sort((a, b) => {
      if (a === "US") return -1;
      if (b === "US") return 1;
      return getCountryName(a).localeCompare(getCountryName(b));
    });
  }, [countries]);

  // Filter cities based on search
  const filteredCities = useMemo(() => {
    if (!cities) return [];
    if (!citySearch) return cities.slice(0, 100);
    const search = citySearch.toLowerCase();
    return cities.filter(c => c.toLowerCase().includes(search)).slice(0, 100);
  }, [cities, citySearch]);

  const handleSearch = () => {
    if (searchQuery.length >= 2 || citySearch) {
      setDebouncedQuery(searchQuery);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
    // NEW: Keyboard shortcut - Escape to clear
    if (e.key === "Escape") {
      setSearchQuery("");
      setDebouncedQuery("");
      setSignalSearchQuery("");
    }
  };

  const handleSelectPlace = (place: { id: string; name: string }) => {
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

  const handleCountryChange = (country: string) => {
    setSelectedCountry(country);
    setSelectedRegion("");
    setCitySearch("");
  };

  const handleRegionChange = (region: string) => {
    setSelectedRegion(region);
    setCitySearch("");
  };

  // Toggle category collapse
  const toggleCategory = (category: 'bestFor' | 'vibe' | 'headsUp') => {
    setCollapsedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  // Combine results from both fsq and simple search, deduplicated
  const fsqPlaces = fsqPlacesResult?.pages.flatMap(page => page.places) || [];
  const simplePlacesData = simplePlaces || [];
  
  const seenIds = new Set<string>();
  const places = [...fsqPlaces, ...simplePlacesData].filter(p => {
    if (seenIds.has(p.id)) return false;
    seenIds.add(p.id);
    return true;
  });
  
  const totalCount = places.length;
  const isLoading = fsqLoading || simpleLoading;
  const isFetching = fsqFetching || simpleFetching;

  // Group signals by type
  const bestForSignals = allSignalDefs?.filter((s) => s.signal_type === "best_for") || [];
  const vibeSignals = allSignalDefs?.filter((s) => s.signal_type === "vibe") || [];
  const headsUpSignals = allSignalDefs?.filter((s) => s.signal_type === "heads_up") || [];

  // NEW: Filter signals based on search query
  const filterSignals = (signals: typeof bestForSignals) => {
    if (!signalSearchQuery) return signals;
    const query = signalSearchQuery.toLowerCase();
    return signals.filter(s => s.label.toLowerCase().includes(query));
  };

  const filteredBestFor = filterSignals(bestForSignals);
  const filteredVibe = filterSignals(vibeSignals);
  const filteredHeadsUp = filterSignals(headsUpSignals);

  // NEW: Get recently used signals (from selectedSignals)
  const recentlyUsedSignals = useMemo(() => {
    const allSignals = [...bestForSignals, ...vibeSignals, ...headsUpSignals];
    return Array.from(selectedSignals.keys())
      .map(slug => allSignals.find(s => s.slug === slug))
      .filter(Boolean)
      .slice(0, 10); // Show top 10
  }, [selectedSignals, bestForSignals, vibeSignals, headsUpSignals]);

  // Show error if signals fail to load
  if (signalsError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Quick Signal Entry</h1>
          <p className="text-muted-foreground">Error loading signals: {signalsError.message}</p>
        </div>
      </div>
    );
  }

  // NEW: Render signal button component (extracted for reusability)
  const SignalButton = ({ signal, category }: { signal: typeof bestForSignals[0], category: 'bestFor' | 'vibe' | 'headsUp' }) => {
    const tapCount = selectedSignals.get(signal.slug) || 0;
    const colorClass = category === 'bestFor' ? 'emerald' : category === 'vibe' ? 'blue' : 'orange';
    
    return (
      <Button
        key={signal.slug}
        variant="outline"
        size="sm"
        onClick={() => handleTap(signal.slug)}
        className={`relative ${
          tapCount > 0
            ? `bg-${colorClass}-500/20 border-${colorClass}-500 text-${colorClass}-500`
            : ""
        }`}
      >
        {signal.label}
        {tapCount > 0 && (
          <span className={`ml-2 bg-${colorClass}-500 text-white text-xs px-1.5 py-0.5 rounded-full`}>
            x{tapCount}
          </span>
        )}
      </Button>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Quick Signal Entry</h1>
          <p className="text-muted-foreground">
            Rapidly submit signals for places. Filter by location, search, select, tap, submit.
          </p>
        </div>
        {/* NEW: Draft indicator and actions */}
        <div className="flex items-center gap-2">
          {draftSaved && (
            <Badge variant="outline" className="gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Draft saved
            </Badge>
          )}
          {hasDraft && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={loadDraft}>
                <Clock className="h-4 w-4 mr-2" />
                Load Draft
              </Button>
              <Button variant="ghost" size="sm" onClick={clearDraft}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
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
                  <p className="text-xs text-muted-foreground">{selectedPlace.id}</p>
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
                    {selectedCountry && (
                      <Badge variant="secondary" className="ml-1">
                        {selectedCountry}
                        {selectedRegion && ` / ${selectedRegion}`}
                      </Badge>
                    )}
                    {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="grid gap-4 sm:grid-cols-3 p-4 bg-muted/50 rounded-lg">
                    {/* Country Selector */}
                    <div className="space-y-2">
                      <Label>Country</Label>
                      <Popover open={countryOpen} onOpenChange={setCountryOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={countryOpen}
                            className="w-full justify-between font-normal"
                          >
                            {selectedCountry ? getCountryName(selectedCountry) : "Select country..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Search country..." />
                            <CommandList>
                              <CommandEmpty>No country found.</CommandEmpty>
                              <CommandGroup>
                                <CommandItem
                                  value="all-countries"
                                  onSelect={() => {
                                    handleCountryChange("");
                                    setCountryOpen(false);
                                  }}
                                >
                                  <Check className={`mr-2 h-4 w-4 ${!selectedCountry ? "opacity-100" : "opacity-0"}`} />
                                  All Countries
                                </CommandItem>
                                {sortedCountries.map((country) => (
                                  <CommandItem
                                    key={country}
                                    value={`${country} ${getCountryName(country)}`}
                                    onSelect={() => {
                                      handleCountryChange(country);
                                      setCountryOpen(false);
                                    }}
                                  >
                                    <Check className={`mr-2 h-4 w-4 ${selectedCountry === country ? "opacity-100" : "opacity-0"}`} />
                                    {getCountryName(country)}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Region Selector */}
                    <div className="space-y-2">
                      <Label>State / Region</Label>
                      <Popover open={regionOpen} onOpenChange={setRegionOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={regionOpen}
                            className="w-full justify-between font-normal"
                            disabled={!selectedCountry || regionsLoading}
                          >
                            {regionsLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : selectedRegion ? (
                              selectedRegion
                            ) : (
                              "Select region..."
                            )}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Search region..." />
                            <CommandList>
                              <CommandEmpty>No region found.</CommandEmpty>
                              <CommandGroup>
                                <CommandItem
                                  value="all-regions"
                                  onSelect={() => {
                                    handleRegionChange("");
                                    setRegionOpen(false);
                                  }}
                                >
                                  <Check className={`mr-2 h-4 w-4 ${!selectedRegion ? "opacity-100" : "opacity-0"}`} />
                                  All Regions
                                </CommandItem>
                                {regions?.map((region) => (
                                  <CommandItem
                                    key={region}
                                    value={region}
                                    onSelect={() => {
                                      handleRegionChange(region);
                                      setRegionOpen(false);
                                    }}
                                  >
                                    <Check className={`mr-2 h-4 w-4 ${selectedRegion === region ? "opacity-100" : "opacity-0"}`} />
                                    {region}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* City Selector */}
                    <div className="space-y-2">
                      <Label>City</Label>
                      <Popover open={cityOpen} onOpenChange={setCityOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={cityOpen}
                            className="w-full justify-between font-normal"
                            disabled={!selectedCountry || citiesLoading}
                          >
                            {citiesLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : citySearch ? (
                              citySearch
                            ) : (
                              "Search city..."
                            )}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0" align="start">
                          <Command>
                            <CommandInput 
                              placeholder="Type to search cities..." 
                              value={citySearch}
                              onValueChange={setCitySearch}
                            />
                            <CommandList>
                              <CommandEmpty>
                                {citySearch ? `Search for "${citySearch}"` : "Type to search cities..."}
                              </CommandEmpty>
                              <CommandGroup>
                                <CommandItem
                                  value="all-cities"
                                  onSelect={() => {
                                    setCitySearch("");
                                    setCityOpen(false);
                                  }}
                                >
                                  <Check className={`mr-2 h-4 w-4 ${!citySearch ? "opacity-100" : "opacity-0"}`} />
                                  All Cities
                                </CommandItem>
                                {filteredCities.map((city) => (
                                  <CommandItem
                                    key={city}
                                    value={city}
                                    onSelect={() => {
                                      setCitySearch(city);
                                      setCityOpen(false);
                                    }}
                                  >
                                    <Check className={`mr-2 h-4 w-4 ${citySearch === city ? "opacity-100" : "opacity-0"}`} />
                                    {city}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Search Input */}
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={selectedCountry ? "Search places by name..." : "Select a country first, or search all places..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="pl-10"
                  />
                </div>
                <Button onClick={handleSearch} disabled={searchQuery.length < 2 && !citySearch}>
                  {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
                </Button>
              </div>

              {/* Helper text */}
              <p className="text-xs text-muted-foreground mt-2">
                {selectedCountry 
                  ? `Searching in ${getCountryName(selectedCountry)}${selectedRegion ? ` / ${selectedRegion}` : ''}${citySearch ? ` / ${citySearch}` : ''}. Enter at least 2 characters to search.`
                  : "Select a country to search the full database (104M+ places), or search without filters for curated places only. Press ESC to clear."}
              </p>

              {/* Search Results */}
              {places && places.length > 0 && (
                <div className="mt-4 space-y-2 max-h-80 overflow-y-auto">
                  <p className="text-xs text-muted-foreground mb-2">
                    Found {places.length} results{hasNextFsqPage ? ' (scroll to load more)' : ''}
                  </p>
                  {places.map((place) => (
                    <div
                      key={place.id}
                      onClick={() => handleSelectPlace({ id: place.id, name: place.name })}
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
                  
                  {/* Infinite scroll trigger */}
                  {hasNextFsqPage && (
                    <div ref={loadMoreRef} className="flex items-center justify-center py-4">
                      {isFetchingNextFsqPage && (
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* No results message */}
              {(debouncedQuery.length >= 2 || citySearch) && !isLoading && (!places || places.length === 0) && (
                <div className="mt-4 p-4 text-center text-muted-foreground bg-muted/50 rounded-lg">
                  No places found. Try adjusting your filters or search term.
                </div>
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
          {/* NEW: Signal Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search signals... (e.g., 'coffee', 'friendly', 'clean')"
              value={signalSearchQuery}
              onChange={(e) => setSignalSearchQuery(e.target.value)}
              className="pl-10"
            />
            {signalSearchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2"
                onClick={() => setSignalSearchQuery("")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* NEW: Recently Used Signals (only show if there are any) */}
          {recentlyUsedSignals.length > 0 && !signalSearchQuery && (
            <div>
              <h3 className="font-semibold text-purple-500 flex items-center gap-2 mb-3">
                <Clock className="h-4 w-4" />
                Recently Used
              </h3>
              <div className="flex flex-wrap gap-2">
                {recentlyUsedSignals.map((signal) => {
                  if (!signal) return null;
                  const tapCount = selectedSignals.get(signal.slug) || 0;
                  return (
                    <Button
                      key={signal.slug}
                      variant="outline"
                      size="sm"
                      onClick={() => handleTap(signal.slug)}
                      className={`relative ${
                        tapCount > 0
                          ? "bg-purple-500/20 border-purple-500 text-purple-500"
                          : ""
                      }`}
                    >
                      {signal.label}
                      {tapCount > 0 && (
                        <span className="ml-2 bg-purple-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                          x{tapCount}
                        </span>
                      )}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          {/* The Good (Best For) - OPTIMIZED with collapsible */}
          <Collapsible open={!collapsedCategories.bestFor} onOpenChange={() => toggleCategory('bestFor')}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-start gap-2 p-0 h-auto hover:bg-transparent">
                <h3 className="font-semibold text-emerald-500 flex items-center gap-2">
                  <ThumbsUp className="h-4 w-4" />
                  The Good
                  <Badge variant="secondary" className="ml-2">
                    {filteredBestFor.length}
                  </Badge>
                  {collapsedCategories.bestFor ? <ChevronDown className="h-4 w-4 ml-auto" /> : <ChevronUp className="h-4 w-4 ml-auto" />}
                </h3>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
              <div className="flex flex-wrap gap-2">
                {filteredBestFor.map((signal) => {
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
            </CollapsibleContent>
          </Collapsible>

          {/* The Vibe - OPTIMIZED with collapsible */}
          <Collapsible open={!collapsedCategories.vibe} onOpenChange={() => toggleCategory('vibe')}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-start gap-2 p-0 h-auto hover:bg-transparent">
                <h3 className="font-semibold text-blue-500 flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  The Vibe
                  <Badge variant="secondary" className="ml-2">
                    {filteredVibe.length}
                  </Badge>
                  {collapsedCategories.vibe ? <ChevronDown className="h-4 w-4 ml-auto" /> : <ChevronUp className="h-4 w-4 ml-auto" />}
                </h3>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
              <div className="flex flex-wrap gap-2">
                {filteredVibe.map((signal) => {
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
            </CollapsibleContent>
          </Collapsible>

          {/* Heads Up - OPTIMIZED with collapsible */}
          <Collapsible open={!collapsedCategories.headsUp} onOpenChange={() => toggleCategory('headsUp')}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-start gap-2 p-0 h-auto hover:bg-transparent">
                <h3 className="font-semibold text-orange-500 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Heads Up
                  <Badge variant="secondary" className="ml-2">
                    {filteredHeadsUp.length}
                  </Badge>
                  {collapsedCategories.headsUp ? <ChevronDown className="h-4 w-4 ml-auto" /> : <ChevronUp className="h-4 w-4 ml-auto" />}
                </h3>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
              <div className="flex flex-wrap gap-2">
                {filteredHeadsUp.map((signal) => {
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
            </CollapsibleContent>
          </Collapsible>

          {/* Show message if search has no results */}
          {signalSearchQuery && filteredBestFor.length === 0 && filteredVibe.length === 0 && filteredHeadsUp.length === 0 && (
            <div className="text-center p-4 text-muted-foreground bg-muted/50 rounded-lg">
              No signals found matching "{signalSearchQuery}"
            </div>
          )}
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
