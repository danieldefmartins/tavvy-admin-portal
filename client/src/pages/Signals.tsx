import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { ThumbsUp, Sparkles, AlertTriangle, Zap } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Signals() {
  const { data: allSignals, isLoading } = trpc.signals.getAll.useQuery();

  // Group signals by type
  const bestForSignals = allSignals?.filter((s) => s.signal_type === "best_for") || [];
  const vibeSignals = allSignals?.filter((s) => s.signal_type === "vibe") || [];
  const headsUpSignals = allSignals?.filter((s) => s.signal_type === "heads_up") || [];

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

  const SignalCard = ({ signal }: { signal: typeof allSignals extends (infer T)[] | undefined ? T : never }) => (
    <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
      <div className="flex items-center gap-3">
        <Badge variant="outline" className={getSignalColor(signal.signal_type || "")}>
          {signal.signal_type === "best_for" && <ThumbsUp className="h-3 w-3 mr-1" />}
          {signal.signal_type === "vibe" && <Sparkles className="h-3 w-3 mr-1" />}
          {signal.signal_type === "heads_up" && <AlertTriangle className="h-3 w-3 mr-1" />}
          {signal.signal_type}
        </Badge>
        <div>
          <p className="font-medium">{signal.label}</p>
          <p className="text-xs text-muted-foreground font-mono">{signal.slug}</p>
        </div>
      </div>
      
    </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Signals</h1>
          <p className="text-muted-foreground">View all available signal definitions</p>
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Signals</h1>
        <p className="text-muted-foreground">
          View all available signal definitions ({allSignals?.length || 0} total)
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">The Good</CardTitle>
            <ThumbsUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">{bestForSignals.length}</div>
            <p className="text-xs text-muted-foreground">Positive signals</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">The Vibe</CardTitle>
            <Sparkles className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{vibeSignals.length}</div>
            <p className="text-xs text-muted-foreground">Neutral signals</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Heads Up</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{headsUpSignals.length}</div>
            <p className="text-xs text-muted-foreground">Warning signals</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">All ({allSignals?.length || 0})</TabsTrigger>
          <TabsTrigger value="best_for" className="text-emerald-500">
            The Good ({bestForSignals.length})
          </TabsTrigger>
          <TabsTrigger value="vibe" className="text-blue-500">
            The Vibe ({vibeSignals.length})
          </TabsTrigger>
          <TabsTrigger value="heads_up" className="text-orange-500">
            Heads Up ({headsUpSignals.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>All Signals</CardTitle>
              <CardDescription>Complete list of available signals</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {allSignals?.map((signal) => (
                <SignalCard key={signal.slug} signal={signal} />
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="best_for" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-emerald-500">
                <ThumbsUp className="h-5 w-5" />
                The Good
              </CardTitle>
              <CardDescription>Positive signals that highlight what a place is good for</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {bestForSignals.map((signal) => (
                <SignalCard key={signal.slug} signal={signal} />
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vibe" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-500">
                <Sparkles className="h-5 w-5" />
                The Vibe
              </CardTitle>
              <CardDescription>Neutral signals that describe the atmosphere and feel</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {vibeSignals.map((signal) => (
                <SignalCard key={signal.slug} signal={signal} />
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="heads_up" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-500">
                <AlertTriangle className="h-5 w-5" />
                Heads Up
              </CardTitle>
              <CardDescription>Warning signals to watch out for</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {headsUpSignals.map((signal) => (
                <SignalCard key={signal.slug} signal={signal} />
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
