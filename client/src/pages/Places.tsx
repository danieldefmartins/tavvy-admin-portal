import React, { useState, useEffect, useMemo } from "react";
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
  RotateCcw,
Plus,
  Edit
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
import { Check, ChevronsUpDown } from "lucide-react";

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
  const [countryOpen, setCountryOpen] = useState(false);
  const limit = 1000;

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
    { query: debouncedQuery, limit: 1000 },
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

  // Comprehensive country code to name mapping (ISO 3166-1 alpha-2)
  const countryNames: Record<string, string> = {
    // A
    AD: "Andorra",
    AE: "United Arab Emirates",
    AF: "Afghanistan",
    AG: "Antigua and Barbuda",
    AI: "Anguilla",
    AL: "Albania",
    AM: "Armenia",
    AO: "Angola",
    AQ: "Antarctica",
    AR: "Argentina",
    AS: "American Samoa",
    AT: "Austria",
    AU: "Australia",
    AW: "Aruba",
    AX: "Åland Islands",
    AZ: "Azerbaijan",
    // B
    BA: "Bosnia and Herzegovina",
    BB: "Barbados",
    BD: "Bangladesh",
    BE: "Belgium",
    BF: "Burkina Faso",
    BG: "Bulgaria",
    BH: "Bahrain",
    BI: "Burundi",
    BJ: "Benin",
    BL: "Saint Barthélemy",
    BM: "Bermuda",
    BN: "Brunei",
    BO: "Bolivia",
    BQ: "Caribbean Netherlands",
    BR: "Brazil",
    BS: "Bahamas",
    BT: "Bhutan",
    BV: "Bouvet Island",
    BW: "Botswana",
    BY: "Belarus",
    BZ: "Belize",
    // C
    CA: "Canada",
    CC: "Cocos Islands",
    CD: "DR Congo",
    CF: "Central African Republic",
    CG: "Republic of the Congo",
    CH: "Switzerland",
    CI: "Côte d'Ivoire",
    CK: "Cook Islands",
    CL: "Chile",
    CM: "Cameroon",
    CN: "China",
    CO: "Colombia",
    CR: "Costa Rica",
    CU: "Cuba",
    CV: "Cape Verde",
    CW: "Curaçao",
    CX: "Christmas Island",
    CY: "Cyprus",
    CZ: "Czech Republic",
    // D
    DE: "Germany",
    DJ: "Djibouti",
    DK: "Denmark",
    DM: "Dominica",
    DO: "Dominican Republic",
    DZ: "Algeria",
    // E
    EC: "Ecuador",
    EE: "Estonia",
    EG: "Egypt",
    EH: "Western Sahara",
    ER: "Eritrea",
    ES: "Spain",
    ET: "Ethiopia",
    // F
    FI: "Finland",
    FJ: "Fiji",
    FK: "Falkland Islands",
    FM: "Micronesia",
    FO: "Faroe Islands",
    FR: "France",
    // G
    GA: "Gabon",
    GB: "United Kingdom",
    GD: "Grenada",
    GE: "Georgia",
    GF: "French Guiana",
    GG: "Guernsey",
    GH: "Ghana",
    GI: "Gibraltar",
    GL: "Greenland",
    GM: "Gambia",
    GN: "Guinea",
    GP: "Guadeloupe",
    GQ: "Equatorial Guinea",
    GR: "Greece",
    GS: "South Georgia",
    GT: "Guatemala",
    GU: "Guam",
    GW: "Guinea-Bissau",
    GY: "Guyana",
    // H
    HK: "Hong Kong",
    HM: "Heard Island",
    HN: "Honduras",
    HR: "Croatia",
    HT: "Haiti",
    HU: "Hungary",
    // I
    ID: "Indonesia",
    IE: "Ireland",
    IL: "Israel",
    IM: "Isle of Man",
    IN: "India",
    IO: "British Indian Ocean Territory",
    IQ: "Iraq",
    IR: "Iran",
    IS: "Iceland",
    IT: "Italy",
    // J
    JE: "Jersey",
    JM: "Jamaica",
    JO: "Jordan",
    JP: "Japan",
    // K
    KE: "Kenya",
    KG: "Kyrgyzstan",
    KH: "Cambodia",
    KI: "Kiribati",
    KM: "Comoros",
    KN: "Saint Kitts and Nevis",
    KP: "North Korea",
    KR: "South Korea",
    KW: "Kuwait",
    KY: "Cayman Islands",
    KZ: "Kazakhstan",
    // L
    LA: "Laos",
    LB: "Lebanon",
    LC: "Saint Lucia",
    LI: "Liechtenstein",
    LK: "Sri Lanka",
    LR: "Liberia",
    LS: "Lesotho",
    LT: "Lithuania",
    LU: "Luxembourg",
    LV: "Latvia",
    LY: "Libya",
    // M
    MA: "Morocco",
    MC: "Monaco",
    MD: "Moldova",
    ME: "Montenegro",
    MF: "Saint Martin",
    MG: "Madagascar",
    MH: "Marshall Islands",
    MK: "North Macedonia",
    ML: "Mali",
    MM: "Myanmar",
    MN: "Mongolia",
    MO: "Macau",
    MP: "Northern Mariana Islands",
    MQ: "Martinique",
    MR: "Mauritania",
    MS: "Montserrat",
    MT: "Malta",
    MU: "Mauritius",
    MV: "Maldives",
    MW: "Malawi",
    MX: "Mexico",
    MY: "Malaysia",
    MZ: "Mozambique",
    // N
    NA: "Namibia",
    NC: "New Caledonia",
    NE: "Niger",
    NF: "Norfolk Island",
    NG: "Nigeria",
    NI: "Nicaragua",
    NL: "Netherlands",
    NO: "Norway",
    NP: "Nepal",
    NR: "Nauru",
    NU: "Niue",
    NZ: "New Zealand",
    // O
    OM: "Oman",
    // P
    PA: "Panama",
    PE: "Peru",
    PF: "French Polynesia",
    PG: "Papua New Guinea",
    PH: "Philippines",
    PK: "Pakistan",
    PL: "Poland",
    PM: "Saint Pierre and Miquelon",
    PN: "Pitcairn Islands",
    PR: "Puerto Rico",
    PS: "Palestine",
    PT: "Portugal",
    PW: "Palau",
    PY: "Paraguay",
    // Q
    QA: "Qatar",
    // R
    RE: "Réunion",
    RO: "Romania",
    RS: "Serbia",
    RU: "Russia",
    RW: "Rwanda",
    // S
    SA: "Saudi Arabia",
    SB: "Solomon Islands",
    SC: "Seychelles",
    SD: "Sudan",
    SE: "Sweden",
    SG: "Singapore",
    SH: "Saint Helena",
    SI: "Slovenia",
    SJ: "Svalbard and Jan Mayen",
    SK: "Slovakia",
    SL: "Sierra Leone",
    SM: "San Marino",
    SN: "Senegal",
    SO: "Somalia",
    SR: "Suriname",
    SS: "South Sudan",
    ST: "São Tomé and Príncipe",
    SV: "El Salvador",
    SX: "Sint Maarten",
    SY: "Syria",
    SZ: "Eswatini",
    // T
    TC: "Turks and Caicos Islands",
    TD: "Chad",
    TF: "French Southern Territories",
    TG: "Togo",
    TH: "Thailand",
    TJ: "Tajikistan",
    TK: "Tokelau",
    TL: "Timor-Leste",
    TM: "Turkmenistan",
    TN: "Tunisia",
    TO: "Tonga",
    TR: "Turkey",
    TT: "Trinidad and Tobago",
    TV: "Tuvalu",
    TW: "Taiwan",
    TZ: "Tanzania",
    // U
    UA: "Ukraine",
    UG: "Uganda",
    UM: "U.S. Minor Outlying Islands",
    US: "United States",
    UY: "Uruguay",
    UZ: "Uzbekistan",
    // V
    VA: "Vatican City",
    VC: "Saint Vincent and the Grenadines",
    VE: "Venezuela",
    VG: "British Virgin Islands",
    VI: "U.S. Virgin Islands",
    VN: "Vietnam",
    VU: "Vanuatu",
    // W
    WF: "Wallis and Futuna",
    WS: "Samoa",
    // X
    XK: "Kosovo",
    XX: "Unknown",
    // Y
    YE: "Yemen",
    YT: "Mayotte",
    // Z
    ZA: "South Africa",
    ZM: "Zambia",
    ZW: "Zimbabwe",
    // Full names (data inconsistency)
    "United States": "United States",
  };

  const getCountryName = (code: string) => countryNames[code] || code;

  // US State name mapping (code -> full name)
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
    // Common variations/typos in data
    "Calif": "California", "Florida": "Florida", "New York": "New York",
    "Texas": "Texas", "California": "California",
  };

  // Map state variations to their canonical code
  const stateToCanonical: Record<string, string> = {
    "Calif": "CA", "California": "CA",
    "Florida": "FL",
    "New York": "NY",
    "Texas": "TX",
  };

  const getStateName = (code: string) => usStateNames[code] || code;

  // Consolidate duplicate states (e.g., "FL" and "Florida" -> just "FL")
  const sortedRegions = useMemo(() => {
    if (!regions) return [];
    
    // Build a set of canonical codes
    const canonicalSet = new Set<string>();
    const result: string[] = [];
    
    regions.forEach(region => {
      const canonical = stateToCanonical[region] || region;
      if (!canonicalSet.has(canonical)) {
        canonicalSet.add(canonical);
        // Prefer the code version if it exists
        if (stateToCanonical[region]) {
          // This is a full name, check if the code exists in regions
          if (regions.includes(canonical)) {
            // Code exists, skip this full name
            return;
          }
        }
        result.push(region);
      }
    });
    
    // Filter out full names if their code equivalent exists
    const finalResult = result.filter(r => {
      const canonical = stateToCanonical[r];
      if (canonical && result.includes(canonical)) {
        return false; // Skip full name if code exists
      }
      return true;
    });
    
    return finalResult.sort((a, b) => {
      const nameA = getStateName(a);
      const nameB = getStateName(b);
      return nameA.localeCompare(nameB);
    });
  }, [regions]);

  // Sort countries with US first, then alphabetically by name
  // Also consolidate duplicate entries (e.g., "US" and "United States")
  const sortedCountries = useMemo(() => {
    if (!countries) return [];
    const getName = (code: string) => countryNames[code] || code;
    
    // Consolidate duplicates: if both "US" and "United States" exist, keep only "US"
    const hasUS = countries.includes("US");
    const hasUnitedStates = countries.includes("United States");
    
    let filteredCountries = [...countries];
    if (hasUS && hasUnitedStates) {
      // Remove "United States" since we'll use "US" (which maps to "United States")
      filteredCountries = filteredCountries.filter(c => c !== "United States");
    }
    
    return filteredCountries.sort((a, b) => {
      // US always first
      if (a === "US" || a === "United States") return -1;
      if (b === "US" || b === "United States") return 1;
      // Then alphabetically by display name
      return getName(a).localeCompare(getName(b));
    });
  }, [countries]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Places</h1>
          <p className="text-muted-foreground">Search and browse places in the database</p>
        </div>
<Link href="/places/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Place
          </Button>
        </Link>
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
                {/* Country - Searchable Combobox */}
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
                        {filters.country
                          ? getCountryName(filters.country)
                          : "Select country..."}
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
                                setFilters({ ...filters, country: "" });
                                setCountryOpen(false);
                              }}
                            >
                              <Check
                                className={`mr-2 h-4 w-4 ${!filters.country ? "opacity-100" : "opacity-0"}`}
                              />
                              All Countries
                            </CommandItem>
                            {sortedCountries.map((country) => (
                              <CommandItem
                                key={country}
                                value={`${country} ${getCountryName(country)}`}
                                onSelect={() => {
                                  setFilters({ ...filters, country: country });
                                  setCountryOpen(false);
                                }}
                              >
                                <Check
                                  className={`mr-2 h-4 w-4 ${filters.country === country ? "opacity-100" : "opacity-0"}`}
                                />
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
                    onValueChange={(v) => setFilters({ ...filters, state: v === "all" ? "" : v })}
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
                  <div className="flex items-center gap-2">
                    <Link href={`/places/${place.id}/edit`} onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </Link>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
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
