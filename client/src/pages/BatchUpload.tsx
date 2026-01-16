import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, Download, X } from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ParsedRow {
  place_id: string;
  signal_slug: string;
  tap_count: number;
  isValid: boolean;
  error?: string;
}

export default function BatchUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: allSignals } = trpc.signals.getAll.useQuery();
  const validSignalSlugs = new Set(allSignals?.map((s) => s.slug) || []);

  const batchImportMutation = trpc.reviews.batchImport.useMutation({
    onSuccess: (result) => {
      toast.success(`Import complete: ${result.success} succeeded, ${result.failed} failed`);
      setFile(null);
      setParsedData([]);
    },
    onError: (error) => {
      toast.error(`Import failed: ${error.message}`);
    },
  });

  const parseCSV = useCallback((text: string): ParsedRow[] => {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return [];

    const header = lines[0].toLowerCase().split(",").map((h) => h.trim());
    const placeIdIdx = header.findIndex((h) => h === "place_id" || h === "fsq_place_id" || h === "id");
    const signalSlugIdx = header.findIndex((h) => h === "signal_slug" || h === "signal" || h === "slug");
    const tapCountIdx = header.findIndex((h) => h === "tap_count" || h === "taps" || h === "count");

    if (placeIdIdx === -1 || signalSlugIdx === -1) {
      toast.error("CSV must have place_id and signal_slug columns");
      return [];
    }

    const rows: ParsedRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = line.split(",").map((v) => v.trim());
      const place_id = values[placeIdIdx] || "";
      const signal_slug = values[signalSlugIdx] || "";
      const tap_count = tapCountIdx !== -1 ? parseInt(values[tapCountIdx]) || 1 : 1;

      let isValid = true;
      let error = "";

      if (!place_id) {
        isValid = false;
        error = "Missing place_id";
      } else if (!signal_slug) {
        isValid = false;
        error = "Missing signal_slug";
      } else if (!validSignalSlugs.has(signal_slug)) {
        isValid = false;
        error = `Invalid signal: ${signal_slug}`;
      } else if (tap_count < 1 || tap_count > 10) {
        isValid = false;
        error = "Tap count must be 1-10";
      }

      rows.push({ place_id, signal_slug, tap_count, isValid, error });
    }

    return rows;
  }, [validSignalSlugs]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith(".csv")) {
      toast.error("Please upload a CSV file");
      return;
    }

    setFile(selectedFile);
    setIsProcessing(true);

    try {
      const text = await selectedFile.text();
      const parsed = parseCSV(text);
      setParsedData(parsed);
    } catch (error) {
      toast.error("Failed to parse CSV file");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = () => {
    const validRows = parsedData.filter((r) => r.isValid);
    if (validRows.length === 0) {
      toast.error("No valid rows to import");
      return;
    }

    batchImportMutation.mutate({
      reviews: validRows.map((r) => ({
        place_id: r.place_id,
        signal_slug: r.signal_slug,
        tap_count: r.tap_count,
      })),
      fileName: file?.name || "batch_import.csv",
    });
  };

  const validCount = parsedData.filter((r) => r.isValid).length;
  const invalidCount = parsedData.filter((r) => !r.isValid).length;

  const downloadTemplate = () => {
    const template = "place_id,signal_slug,tap_count\n4b5a3b3af964a520c6c027e3,great_coffee,2\n4b5a3b3af964a520c6c027e3,cozy_atmosphere,1\n";
    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tavvy_batch_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Batch Upload</h1>
          <p className="text-muted-foreground">
            Import multiple reviews from a CSV file
          </p>
        </div>
        <Button variant="outline" onClick={downloadTemplate}>
          <Download className="mr-2 h-4 w-4" />
          Download Template
        </Button>
      </div>

      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle>Upload CSV File</CardTitle>
          <CardDescription>
            Required columns: place_id, signal_slug. Optional: tap_count (defaults to 1)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!file ? (
            <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="mb-2 text-sm text-muted-foreground">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-muted-foreground">CSV files only</p>
              </div>
              <input
                type="file"
                className="hidden"
                accept=".csv"
                onChange={handleFileChange}
              />
            </label>
          ) : (
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setFile(null);
                  setParsedData([]);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview */}
      {parsedData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Preview</span>
              <div className="flex gap-2">
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  {validCount} valid
                </Badge>
                {invalidCount > 0 && (
                  <Badge variant="outline" className="bg-red-500/10 text-red-500">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {invalidCount} invalid
                  </Badge>
                )}
              </div>
            </CardTitle>
            <CardDescription>
              Review the parsed data before importing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border max-h-96 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Place ID</TableHead>
                    <TableHead>Signal</TableHead>
                    <TableHead className="w-20">Taps</TableHead>
                    <TableHead className="w-24">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedData.slice(0, 100).map((row, idx) => (
                    <TableRow key={idx} className={!row.isValid ? "bg-red-500/5" : ""}>
                      <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {row.place_id.substring(0, 24)}...
                      </TableCell>
                      <TableCell>{row.signal_slug}</TableCell>
                      <TableCell>x{row.tap_count}</TableCell>
                      <TableCell>
                        {row.isValid ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <span className="text-xs text-red-500">{row.error}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {parsedData.length > 100 && (
              <p className="text-sm text-muted-foreground mt-2">
                Showing first 100 of {parsedData.length} rows
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Import Button */}
      {parsedData.length > 0 && validCount > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Ready to import {validCount} reviews</p>
                {invalidCount > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {invalidCount} invalid rows will be skipped
                  </p>
                )}
              </div>
              <Button
                onClick={handleImport}
                disabled={batchImportMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {batchImportMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Import {validCount} Reviews
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>CSV Format Guide</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Required Columns</h4>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li><code className="bg-muted px-1 rounded">place_id</code> - The Foursquare place ID (or fsq_place_id)</li>
              <li><code className="bg-muted px-1 rounded">signal_slug</code> - The signal identifier (e.g., great_coffee, cozy_atmosphere)</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">Optional Columns</h4>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li><code className="bg-muted px-1 rounded">tap_count</code> - Number of taps (1-10, defaults to 1)</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">Example</h4>
            <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
{`place_id,signal_slug,tap_count
4b5a3b3af964a520c6c027e3,great_coffee,2
4b5a3b3af964a520c6c027e3,cozy_atmosphere,1
5a1b2c3d4e5f6g7h8i9j0k1l,friendly_staff,3`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
