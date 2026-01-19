import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { Search, MapPin, ChevronRight, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Places() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const { data: places, isLoading, isFetching } = trpc.places.search.useQuery(
    { query: debouncedQuery, limit: 50 },
    { enabled: debouncedQuery.length >= 2 }
  );

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Places</h1>
        <p className="text-muted-foreground">Search and browse places in the database</p>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search places by name, address, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pl-10"
              />
            </div>
            <Button onClick={handleSearch} disabled={searchQuery.length < 2}>
              {isFetching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Search"
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Enter at least 2 characters to search
          </p>
        </CardContent>
      </Card>

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
      ) : places && places.length > 0 ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Found {places.length} places
          </p>
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
                        {place.address || place.city || "No address"}
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
        </div>
      ) : debouncedQuery.length >= 2 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="font-semibold text-lg mb-2">No places found</h3>
            <p className="text-muted-foreground">
              Try a different search term or check the spelling
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="font-semibold text-lg mb-2">Search for places</h3>
            <p className="text-muted-foreground">
              Enter a name, address, or place ID to find places
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
