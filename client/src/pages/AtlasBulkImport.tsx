import { useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";
import { 
  Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, Download, X, BookOpen, RefreshCw,
  Eye, ChevronDown, ChevronRight, FileText, Image as ImageIcon, List, Quote, AlertTriangle, 
  Info, CheckSquare, Calendar, MapPin, Minus
} from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

// Content block types supported by Tavvy Atlas v2.0
const VALID_BLOCK_TYPES = [
  "heading", "paragraph", "bullet_list", "numbered_list", 
  "place_card", "itinerary_day", "callout", "checklist", 
  "quote", "image", "divider"
];

// Block type icons for preview
const BLOCK_TYPE_ICONS: Record<string, React.ReactNode> = {
  heading: <FileText className="h-4 w-4" />,
  paragraph: <FileText className="h-4 w-4" />,
  bullet_list: <List className="h-4 w-4" />,
  numbered_list: <List className="h-4 w-4" />,
  place_card: <MapPin className="h-4 w-4" />,
  itinerary_day: <Calendar className="h-4 w-4" />,
  callout: <Info className="h-4 w-4" />,
  checklist: <CheckSquare className="h-4 w-4" />,
  quote: <Quote className="h-4 w-4" />,
  image: <ImageIcon className="h-4 w-4" />,
  divider: <Minus className="h-4 w-4" />,
};

interface ContentBlock {
  type: string;
  text?: string;
  level?: number;
  items?: string[];
  style?: string;
  title?: string;
  image_id?: string;
  place_id?: string;
}

interface ParsedArticle {
  title: string;
  slug: string;
  excerpt: string;
  author: string;
  category_slug: string;
  content_blocks: ContentBlock[];
  section_images: any[];
  cover_image_url: string;
  read_time_minutes: number;
  article_template_type: string;
  is_featured: boolean;
  status: string;
  isValid: boolean;
  errors: string[];
  warnings: string[];
  blockCount: number;
}

export default function AtlasBulkImport() {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedArticle[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [updateExisting, setUpdateExisting] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const { data: categories } = trpc.articles.getCategories.useQuery();
  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    if (categories) {
      categories.forEach((c: any) => {
        map.set(c.slug, c.id);
      });
    }
    return map;
  }, [categories]);

  // Validate individual content block
  const validateContentBlock = (block: any, index: number): string[] => {
    const errors: string[] = [];
    
    if (!block.type) {
      errors.push(`Block ${index + 1}: Missing type`);
      return errors;
    }
    
    if (!VALID_BLOCK_TYPES.includes(block.type)) {
      errors.push(`Block ${index + 1}: Invalid type "${block.type}"`);
    }
    
    switch (block.type) {
      case "heading":
        if (!block.text) errors.push(`Block ${index + 1}: Heading missing text`);
        if (!block.level || ![1, 2, 3].includes(block.level)) {
          errors.push(`Block ${index + 1}: Heading level must be 1, 2, or 3`);
        }
        break;
      case "paragraph":
        if (!block.text) errors.push(`Block ${index + 1}: Paragraph missing text`);
        break;
      case "bullet_list":
      case "numbered_list":
        if (!block.items || !Array.isArray(block.items) || block.items.length === 0) {
          errors.push(`Block ${index + 1}: List must have items array`);
        }
        break;
      case "place_card":
        if (!block.place_id) errors.push(`Block ${index + 1}: Place card missing place_id`);
        break;
      case "itinerary_day":
        if (!block.title) errors.push(`Block ${index + 1}: Itinerary day missing title`);
        if (!block.items || !Array.isArray(block.items)) {
          errors.push(`Block ${index + 1}: Itinerary day must have items array`);
        }
        break;
      case "callout":
        if (!block.text) errors.push(`Block ${index + 1}: Callout missing text`);
        if (!block.style || !["tip", "warning", "tavvy_note"].includes(block.style)) {
          errors.push(`Block ${index + 1}: Callout style must be tip, warning, or tavvy_note`);
        }
        break;
      case "checklist":
        if (!block.items || !Array.isArray(block.items) || block.items.length === 0) {
          errors.push(`Block ${index + 1}: Checklist must have items array`);
        }
        break;
      case "quote":
        if (!block.text) errors.push(`Block ${index + 1}: Quote missing text`);
        break;
      case "image":
        if (!block.ref && !block.url && !block.image_id) errors.push(`Block ${index + 1}: Image missing ref, url, or image_id`);
        break;
    }
    
    return errors;
  };

  const bulkImportMutation = trpc.articles.bulkImport.useMutation({
    onSuccess: (result) => {
      toast.success(`Import complete: ${result.inserted} inserted, ${result.updated} updated, ${result.skipped} skipped`);
      setFile(null);
      setParsedData([]);
    },
    onError: (error) => {
      toast.error(`Import failed: ${error.message}`);
    },
  });

  const parseCSV = useCallback((text: string): ParsedArticle[] => {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return [];

    // Parse header - handle quoted values
    const parseCSVLine = (line: string): string[] => {
      const result: string[] = [];
      let current = "";
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const header = parseCSVLine(lines[0]).map((h) => h.toLowerCase().replace(/"/g, ''));
    
    // Find column indices
    const titleIdx = header.findIndex((h) => h === "title");
    const slugIdx = header.findIndex((h) => h === "slug");
    const excerptIdx = header.findIndex((h) => h === "excerpt");
    const authorIdx = header.findIndex((h) => h === "author");
    const categoryIdx = header.findIndex((h) => h === "category_slug");
    const contentBlocksIdx = header.findIndex((h) => h === "content_blocks");
    const sectionImagesIdx = header.findIndex((h) => h === "section_images");
    const coverImageIdx = header.findIndex((h) => h === "cover_image_url");
    const readTimeIdx = header.findIndex((h) => h === "read_time_minutes");
    const templateTypeIdx = header.findIndex((h) => h === "article_template_type");
    const isFeaturedIdx = header.findIndex((h) => h === "is_featured");
    const statusIdx = header.findIndex((h) => h === "status");

    if (titleIdx === -1 || slugIdx === -1) {
      toast.error("CSV must have 'title' and 'slug' columns");
      return [];
    }

    const articles: ParsedArticle[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = parseCSVLine(line).map(v => v.replace(/^"|"$/g, ''));
      
      const errors: string[] = [];
      const warnings: string[] = [];
      let contentBlocks: ContentBlock[] = [];
      let sectionImages: any[] = [];

      const title = values[titleIdx] || "";
      const slug = values[slugIdx] || "";

      if (!title) {
        errors.push("Missing title");
      }
      if (!slug) {
        errors.push("Missing slug");
      }

      // Parse content_blocks JSON
      if (contentBlocksIdx !== -1 && values[contentBlocksIdx]) {
        try {
          contentBlocks = JSON.parse(values[contentBlocksIdx]);
          if (!Array.isArray(contentBlocks)) {
            errors.push("content_blocks must be a JSON array");
            contentBlocks = [];
          } else {
            // Validate each block
            contentBlocks.forEach((block, idx) => {
              const blockErrors = validateContentBlock(block, idx);
              errors.push(...blockErrors);
            });
          }
        } catch (e) {
          errors.push(`Invalid content_blocks JSON: ${(e as Error).message}`);
        }
      }

      // Parse section_images JSON
      if (sectionImagesIdx !== -1 && values[sectionImagesIdx]) {
        try {
          sectionImages = JSON.parse(values[sectionImagesIdx]);
          if (!Array.isArray(sectionImages)) {
            warnings.push("section_images should be a JSON array");
            sectionImages = [];
          }
        } catch (e) {
          warnings.push(`Invalid section_images JSON: ${(e as Error).message}`);
        }
      }

      // Validate category
      const categorySlug = categoryIdx !== -1 ? values[categoryIdx] : "";
      if (categorySlug && !categoryMap.has(categorySlug)) {
        warnings.push(`Category "${categorySlug}" not found - will be null`);
      }

      articles.push({
        title,
        slug,
        excerpt: excerptIdx !== -1 ? values[excerptIdx] || "" : "",
        author: authorIdx !== -1 ? values[authorIdx] || "Tavvy Atlas Team" : "Tavvy Atlas Team",
        category_slug: categorySlug,
        content_blocks: contentBlocks,
        section_images: sectionImages,
        cover_image_url: coverImageIdx !== -1 ? values[coverImageIdx] || "" : "",
        read_time_minutes: readTimeIdx !== -1 ? parseInt(values[readTimeIdx]) || 5 : 5,
        article_template_type: templateTypeIdx !== -1 ? values[templateTypeIdx] || "city_guide" : "city_guide",
        is_featured: isFeaturedIdx !== -1 ? values[isFeaturedIdx]?.toLowerCase() === "true" : false,
        status: statusIdx !== -1 ? values[statusIdx] || "published" : "published",
        isValid: errors.length === 0,
        errors,
        warnings,
        blockCount: contentBlocks.length,
      });
    }

    return articles;
  }, [categoryMap]);

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
      
      if (parsed.length === 0) {
        toast.error("No valid articles found in CSV");
      } else {
        toast.success(`Parsed ${parsed.length} articles`);
      }
    } catch (error) {
      toast.error("Failed to parse CSV file");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = () => {
    const validArticles = parsedData.filter((a) => a.isValid);
    if (validArticles.length === 0) {
      toast.error("No valid articles to import");
      return;
    }

    bulkImportMutation.mutate({
      articles: validArticles.map((a) => ({
        title: a.title,
        slug: a.slug,
        excerpt: a.excerpt,
        content: a.excerpt, // Legacy field
        author_name: a.author,
        category_id: categoryMap.get(a.category_slug) || null,
        content_blocks: a.content_blocks,
        section_images: a.section_images,
        cover_image_url: a.cover_image_url,
        read_time_minutes: a.read_time_minutes,
        article_template_type: a.article_template_type,
        is_featured: a.is_featured,
        status: a.status,
      })),
      updateExisting,
    });
  };

  const validCount = parsedData.filter((a) => a.isValid).length;
  const invalidCount = parsedData.filter((a) => !a.isValid).length;
  const warningCount = parsedData.filter((a) => a.warnings.length > 0).length;
  const totalBlocks = parsedData.reduce((sum, a) => sum + a.blockCount, 0);

  const toggleRowExpand = (index: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRows(newExpanded);
  };

  const downloadTemplate = () => {
    const template = `title,slug,excerpt,author,category_slug,content_blocks,section_images,cover_image_url,read_time_minutes,article_template_type,is_featured,status
"Best Coffee Shops in Austin",best-coffee-shops-austin,"Discover the top coffee spots in Austin","Sarah Chen",cities,"[{""type"":""heading"",""text"":""Introduction"",""level"":2},{""type"":""paragraph"",""text"":""Austin has an amazing coffee scene.""}]","[]","https://example.com/image.jpg",8,city_guide,true,published`;
    
    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "atlas_articles_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Atlas Bulk Import</h1>
          <p className="text-muted-foreground">
            Import multiple Atlas articles from a CSV file
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
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Upload CSV File
          </CardTitle>
          <CardDescription>
            Required columns: title, slug. Optional: excerpt, author, category_slug, content_blocks, section_images, cover_image_url, read_time_minutes, article_template_type, is_featured, status
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
                <Badge variant="outline" className="bg-blue-500/10 text-blue-500">
                  <BookOpen className="h-3 w-3 mr-1" />
                  {totalBlocks} blocks
                </Badge>
                {warningCount > 0 && (
                  <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {warningCount} warnings
                  </Badge>
                )}
              </div>
            </CardTitle>
            <CardDescription>
              Review the parsed articles before importing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border max-h-96 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="w-20">Blocks</TableHead>
                    <TableHead className="w-24">Status</TableHead>
                    <TableHead className="w-16">Preview</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedData.slice(0, 100).map((article, idx) => (
                    <Collapsible key={idx} asChild open={expandedRows.has(idx)}>
                      <>
                        <TableRow className={!article.isValid ? "bg-red-500/5" : article.warnings.length > 0 ? "bg-yellow-500/5" : ""}>
                          <TableCell>
                            <CollapsibleTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => toggleRowExpand(idx)}
                              >
                                {expandedRows.has(idx) ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </Button>
                            </CollapsibleTrigger>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                          <TableCell className="font-medium max-w-[200px] truncate">
                            {article.title || <span className="text-red-500">Missing</span>}
                          </TableCell>
                          <TableCell className="font-mono text-xs max-w-[150px] truncate">
                            {article.slug || <span className="text-red-500">Missing</span>}
                          </TableCell>
                          <TableCell>
                            {categoryMap.has(article.category_slug) ? (
                              <Badge variant="secondary">{article.category_slug}</Badge>
                            ) : article.category_slug ? (
                              <Badge variant="outline" className="text-yellow-500">{article.category_slug}?</Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{article.blockCount}</Badge>
                          </TableCell>
                          <TableCell>
                            {article.isValid ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-red-500" />
                            )}
                          </TableCell>
                          <TableCell>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
                                <DialogHeader>
                                  <DialogTitle>{article.title}</DialogTitle>
                                  <DialogDescription>
                                    Article preview with {article.blockCount} content blocks
                                  </DialogDescription>
                                </DialogHeader>
                                <ArticlePreview article={article} />
                              </DialogContent>
                            </Dialog>
                          </TableCell>
                        </TableRow>
                        <CollapsibleContent asChild>
                          <TableRow className="bg-muted/30">
                            <TableCell colSpan={8} className="p-4">
                              <div className="space-y-3">
                                {/* Errors */}
                                {article.errors.length > 0 && (
                                  <div className="rounded-md bg-red-500/10 p-3">
                                    <p className="font-medium text-red-500 mb-1">Errors:</p>
                                    <ul className="list-disc list-inside text-sm text-red-400">
                                      {article.errors.map((err, i) => (
                                        <li key={i}>{err}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                
                                {/* Warnings */}
                                {article.warnings.length > 0 && (
                                  <div className="rounded-md bg-yellow-500/10 p-3">
                                    <p className="font-medium text-yellow-500 mb-1">Warnings:</p>
                                    <ul className="list-disc list-inside text-sm text-yellow-400">
                                      {article.warnings.map((warn, i) => (
                                        <li key={i}>{warn}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                
                                {/* Content blocks summary */}
                                {article.content_blocks.length > 0 && (
                                  <div className="rounded-md bg-blue-500/10 p-3">
                                    <p className="font-medium text-blue-500 mb-2">Content Blocks:</p>
                                    <div className="flex flex-wrap gap-2">
                                      {article.content_blocks.map((block, i) => (
                                        <Badge key={i} variant="outline" className="gap-1">
                                          {BLOCK_TYPE_ICONS[block.type] || <FileText className="h-3 w-3" />}
                                          {block.type}
                                          {block.level && ` (H${block.level})`}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Metadata */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                  <div>
                                    <span className="text-muted-foreground">Author:</span>{" "}
                                    {article.author || "-"}
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Template:</span>{" "}
                                    {article.article_template_type || "-"}
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Read time:</span>{" "}
                                    {article.read_time_minutes ? `${article.read_time_minutes} min` : "-"}
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Status:</span>{" "}
                                    <Badge variant={article.status === "published" ? "default" : "secondary"}>
                                      {article.status}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        </CollapsibleContent>
                      </>
                    </Collapsible>
                  ))}
                </TableBody>
              </Table>
            </div>
            {parsedData.length > 100 && (
              <p className="text-sm text-muted-foreground mt-2">
                Showing first 100 of {parsedData.length} articles
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Import Options & Button */}
      {parsedData.length > 0 && validCount > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="font-medium">Ready to import {validCount} articles</p>
                {invalidCount > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {invalidCount} invalid articles will be skipped
                  </p>
                )}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="updateExisting"
                    checked={updateExisting}
                    onCheckedChange={(checked) => setUpdateExisting(checked as boolean)}
                  />
                  <label
                    htmlFor="updateExisting"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Update existing articles (by slug)
                  </label>
                </div>
              </div>
              <Button
                onClick={handleImport}
                disabled={bulkImportMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {bulkImportMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : updateExisting ? (
                  <RefreshCw className="h-4 w-4 mr-2" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                {updateExisting ? "Import & Update" : "Import"} {validCount} Articles
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
        <CardContent>
          <Tabs defaultValue="columns">
            <TabsList>
              <TabsTrigger value="columns">Columns</TabsTrigger>
              <TabsTrigger value="blocks">Content Blocks</TabsTrigger>
              <TabsTrigger value="example">Example</TabsTrigger>
            </TabsList>
            
            <TabsContent value="columns" className="space-y-4 mt-4">
              <div>
                <h4 className="font-medium mb-2">Required Columns</h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li><code className="bg-muted px-1 rounded">title</code> - Article headline</li>
                  <li><code className="bg-muted px-1 rounded">slug</code> - URL-friendly identifier (unique)</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Recommended Columns</h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li><code className="bg-muted px-1 rounded">content_blocks</code> - JSON array of content blocks</li>
                  <li><code className="bg-muted px-1 rounded">category_slug</code> - Category identifier (cities, food-drink, etc.)</li>
                  <li><code className="bg-muted px-1 rounded">author</code> - Display name of author</li>
                  <li><code className="bg-muted px-1 rounded">excerpt</code> - Short summary for cards</li>
                  <li><code className="bg-muted px-1 rounded">cover_image_url</code> - Hero image URL</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Optional Columns</h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li><code className="bg-muted px-1 rounded">article_template_type</code> - city_guide, owner_spotlight, place_roundup, travel_tips</li>
                  <li><code className="bg-muted px-1 rounded">section_images</code> - JSON array of image references</li>
                  <li><code className="bg-muted px-1 rounded">read_time_minutes</code> - Estimated read time</li>
                  <li><code className="bg-muted px-1 rounded">status</code> - draft or published</li>
                  <li><code className="bg-muted px-1 rounded">is_featured</code> - true/false</li>
                </ul>
              </div>
            </TabsContent>
            
            <TabsContent value="blocks" className="space-y-4 mt-4">
              <p className="text-sm text-muted-foreground">
                The <code className="bg-muted px-1 rounded">content_blocks</code> column accepts a JSON array of block objects:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Text Blocks</h4>
                  <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
{`{"type": "heading", "level": 2, "text": "Section Title"}
{"type": "paragraph", "text": "Body text here..."}
{"type": "bullet_list", "items": ["Item 1", "Item 2"]}
{"type": "numbered_list", "items": ["Step 1", "Step 2"]}`}
                  </pre>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Interactive Blocks</h4>
                  <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
{`{"type": "place_card", "place_id": "uuid-here"}
{"type": "callout", "style": "tip", "text": "Pro tip..."}
{"type": "checklist", "items": ["Pack snacks", "Bring water"]}
{"type": "quote", "text": "Quote text", "attribution": "Author"}`}
                  </pre>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Itinerary Block</h4>
                  <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
{`{
  "type": "itinerary_day",
  "title": "Day 1: Downtown",
  "items": [
    {"time": "Morning", "activity": "Visit museum"},
    {"time": "Lunch", "activity": "Local cafe"}
  ]
}`}
                  </pre>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Callout Styles</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li><code className="bg-muted px-1 rounded">tip</code> - Blue info box</li>
                    <li><code className="bg-muted px-1 rounded">warning</code> - Yellow warning box</li>
                    <li><code className="bg-muted px-1 rounded">tavvy_note</code> - Green Tavvy-branded box</li>
                  </ul>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="example" className="mt-4">
              <pre className="bg-muted p-3 rounded text-xs overflow-x-auto whitespace-pre-wrap">
{`title,slug,category_slug,author,excerpt,content_blocks,status
"Nashville With Kids","nashville-with-kids","cities","Tavvy Atlas Team","Family guide to Nashville","[{""type"":""heading"",""level"":2,""text"":""Best Activities""},{""type"":""paragraph"",""text"":""Nashville offers amazing family fun.""},{""type"":""place_card"",""place_id"":""abc-123""}]","published"`}
              </pre>
              <p className="text-sm text-muted-foreground mt-2">
                Note: JSON must use double-quotes, escaped as "" in CSV
              </p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

// Article Preview Component
function ArticlePreview({ article }: { article: ParsedArticle }) {
  return (
    <div className="space-y-4">
      {/* Cover Image */}
      {article.cover_image_url && (
        <div className="rounded-lg overflow-hidden">
          <img 
            src={article.cover_image_url} 
            alt={article.title}
            className="w-full h-48 object-cover"
          />
        </div>
      )}
      
      {/* Metadata */}
      <div className="flex flex-wrap gap-2">
        {article.category_slug && (
          <Badge>{article.category_slug}</Badge>
        )}
        {article.article_template_type && (
          <Badge variant="outline">{article.article_template_type}</Badge>
        )}
        {article.read_time_minutes && (
          <Badge variant="secondary">{article.read_time_minutes} min read</Badge>
        )}
      </div>
      
      {/* Excerpt */}
      {article.excerpt && (
        <p className="text-muted-foreground italic">{article.excerpt}</p>
      )}
      
      {/* Content Blocks Preview */}
      <div className="border-t pt-4 space-y-3">
        <h4 className="font-medium">Content Blocks ({article.content_blocks.length})</h4>
        {article.content_blocks.map((block, idx) => (
          <ContentBlockPreview key={idx} block={block} index={idx} />
        ))}
      </div>
    </div>
  );
}

// Content Block Preview Component
function ContentBlockPreview({ block, index }: { block: ContentBlock; index: number }) {
  const icon = BLOCK_TYPE_ICONS[block.type] || <FileText className="h-4 w-4" />;
  
  return (
    <div className="flex gap-3 p-2 rounded bg-muted/50">
      <div className="flex items-center justify-center w-8 h-8 rounded bg-muted shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="outline" className="text-xs">
            {block.type}
            {block.level && ` H${block.level}`}
            {block.style && ` (${block.style})`}
          </Badge>
          <span className="text-xs text-muted-foreground">#{index + 1}</span>
        </div>
        <div className="text-sm truncate">
          {block.text && <span>{block.text.substring(0, 100)}{block.text.length > 100 ? "..." : ""}</span>}
          {block.items && <span>{block.items.length} items</span>}
          {block.place_id && <span className="font-mono text-xs">{block.place_id}</span>}
          {block.title && <span>{block.title}</span>}
          {block.type === "divider" && <span className="text-muted-foreground">---</span>}
        </div>
      </div>
    </div>
  );
}
