import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Search, Zap, ThumbsUp, Sparkles, AlertTriangle, Loader2, MapPin, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function QuickEntry() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedPlace, setSelectedPlace] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [selectedSignals, setSelectedSignals] = useState<Map<string, number>>(new Map());

  const { data: places, isLoading: placesLoading, isFetching, error: placesError } = trpc.places.search.useQuery(
    { query: debouncedQuery, limit: 50 },
    { enabled: debouncedQuery.length >= 2, retry: false }
  );

  const { data: allSignalDefs, error: signalsError } = trpc.signals.getAll.useQuery({ retry: false });

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
    if (searchQuery.length >= 2) {
      setDebouncedQuery(searchQuery);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
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

  // Group signals by type
  const bestForSignals = allSignalDefs?.filter((s) => s.signal_type === "best_for") || [];
  const vibeSignals = allSignalDefs?.filter((s) => s.signal_type === "vibe") || [];
  const headsUpSignals = allSignalDefs?.filter((s) => s.signal_type === "heads_up") || [];

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Quick Signal Entry</h1>
        <p className="text-muted-foreground">
          Rapidly submit signals for places. Search, select, tap, submit.
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
                  <p className="text-xs text-muted-foreground">{selectedPlace.id}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => setSelectedPlace(null)}>
                Change
              </Button>
            </div>
          ) : (
            <>
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
                <Button onClick={handleSearch} disabled={searchQuery.length < 2}>
                  {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
                </Button>
              </div>

              {/* Search Results */}
              {places && places.length > 0 && (
                <div className="mt-4 space-y-2 max-h-80 overflow-y-auto">
                  <p className="text-xs text-muted-foreground mb-2">Found {places.length} results</p>
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
