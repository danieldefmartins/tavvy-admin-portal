import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useRoute, Link } from "wouter";
import { ArrowLeft, MapPin, Zap, ThumbsUp, Sparkles, AlertTriangle, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export default function PlaceDetail() {
  const [, params] = useRoute("/places/:id");
  const placeId = params?.id || "";

  const { data: place, isLoading: placeLoading } = trpc.places.getById.useQuery(
    { id: placeId },
    { enabled: !!placeId }
  );

  const { data: signals, isLoading: signalsLoading } = trpc.places.getSignals.useQuery(
    { placeId },
    { enabled: !!placeId }
  );

  const { data: allSignalDefs } = trpc.signals.getAll.useQuery();

  const [selectedSignals, setSelectedSignals] = useState<Map<string, number>>(new Map());

  const submitMutation = trpc.reviews.submitQuick.useMutation({
    onSuccess: (result) => {
      toast.success(`Successfully submitted ${result.success} signals!`);
      setSelectedSignals(new Map());
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

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
    if (selectedSignals.size === 0) {
      toast.error("Please select at least one signal");
      return;
    }

    const signalsArray = Array.from(selectedSignals.entries()).map(([signalSlug, tapCount]) => ({
      signalSlug,
      tapCount,
    }));

    submitMutation.mutate({
      placeId,
      signals: signalsArray,
    });
  };

  const getSignalColor = (type: string) => {
    switch (type) {
      case "best_for":
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "vibe":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "heads_up":
        return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getSignalIcon = (type: string) => {
    switch (type) {
      case "best_for":
        return <ThumbsUp className="h-4 w-4" />;
      case "vibe":
        return <Sparkles className="h-4 w-4" />;
      case "heads_up":
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Zap className="h-4 w-4" />;
    }
  };

  if (placeLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!place) {
    return (
      <div className="space-y-6">
        <Link href="/places">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Places
          </Button>
        </Link>
        <Card>
          <CardContent className="py-12 text-center">
            <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="font-semibold text-lg mb-2">Place not found</h3>
            <p className="text-muted-foreground">
              The place you're looking for doesn't exist or has been removed.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Group signals by type
  const bestForSignals = allSignalDefs?.filter((s) => s.signal_type === "best_for") || [];
  const vibeSignals = allSignalDefs?.filter((s) => s.signal_type === "vibe") || [];
  const headsUpSignals = allSignalDefs?.filter((s) => s.signal_type === "heads_up") || [];

  // Get existing signal counts
  const getExistingCount = (signalSlug: string) => {
    const found = signals?.find((s) => s.signal_slug === signalSlug);
    return found?.tap_total || 0;
  };

  return (
    <div className="space-y-6">
      <Link href="/places">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Places
        </Button>
      </Link>

      {/* Place Info */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 rounded-lg bg-primary/10 flex items-center justify-center">
              <MapPin className="h-8 w-8 text-primary" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{place.name}</h1>
              <p className="text-muted-foreground">{place.address_line1 || place.city}</p>
              {place.category && (
                <Badge variant="secondary" className="mt-2">
                  {place.category}
                </Badge>
              )}
              <p className="text-xs text-muted-foreground mt-2">ID: {place.id}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Signals */}
      {signalsLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : signals && signals.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Current Signals</CardTitle>
            <CardDescription>Existing signal data for this place</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {signals.map((signal) => (
                <Badge
                  key={signal.signal_slug}
                  variant="outline"
                  className={getSignalColor(signal.signal_type || "")}
                >
                  {signal.signal_slug}: x{signal.tap_total}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Quick Signal Entry */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Quick Signal Entry
          </CardTitle>
          <CardDescription>
            Tap signals to add them. Tap multiple times for higher intensity (1-3).
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
                const existingCount = getExistingCount(signal.slug);
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
                    {existingCount > 0 && tapCount === 0 && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({existingCount})
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
                const existingCount = getExistingCount(signal.slug);
                return (
                  <Button
                    key={signal.slug}
                    variant="outline"
                    size="sm"
                    onClick={() => handleTap(signal.slug)}
                    className={`relative ${
                      tapCount > 0
                        ? "bg-blue-500/20 border-blue-500 text-blue-500"
                        : ""
                    }`}
                  >
                    {signal.label}
                    {tapCount > 0 && (
                      <span className="ml-2 bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                        x{tapCount}
                      </span>
                    )}
                    {existingCount > 0 && tapCount === 0 && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({existingCount})
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
                const existingCount = getExistingCount(signal.slug);
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
                    {existingCount > 0 && tapCount === 0 && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({existingCount})
                      </span>
                    )}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Submit */}
          {selectedSignals.size > 0 && (
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {selectedSignals.size} signal{selectedSignals.size > 1 ? "s" : ""} selected
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {Array.from(selectedSignals.entries())
                      .map(([slug, count]) => `${slug} (x${count})`)
                      .join(", ")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedSignals(new Map())}
                  >
                    Clear
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={submitMutation.isPending}
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
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
