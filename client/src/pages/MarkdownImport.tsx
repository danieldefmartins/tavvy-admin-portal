import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Eye,
  BookOpen,
  Clock,
  Hash
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import ImageUpload from "@/components/ImageUpload";

interface ContentBlock {
  type: string;
  text?: string;
  level?: number;
  style?: string;
  items?: string[];
  title?: string;
}

interface ParsedArticle {
  title: string;
  slug: string;
  excerpt: string;
  content_blocks: ContentBlock[];
  read_time_minutes: number;
}

// Markdown parser function
function parseMarkdownToBlocks(markdownContent: string): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  const lines = markdownContent.trim().split('\n');
  
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    
    // Skip empty lines
    if (!line) {
      i++;
      continue;
    }
    
    // Heading detection
    if (line.startsWith('# ')) {
      blocks.push({ type: "heading", text: line.slice(2).trim(), level: 1 });
      i++;
      continue;
    }
    
    if (line.startsWith('## ')) {
      blocks.push({ type: "heading", text: line.slice(3).trim(), level: 2 });
      i++;
      continue;
    }
    
    if (line.startsWith('### ')) {
      blocks.push({ type: "heading", text: line.slice(4).trim(), level: 3 });
      i++;
      continue;
    }
    
    // Divider
    if (line === '---' || line === '***' || line === '___') {
      blocks.push({ type: "divider" });
      i++;
      continue;
    }
    
    // Blockquote -> callout
    if (line.startsWith('>')) {
      let quoteText = line.slice(1).trim();
      while (i + 1 < lines.length && lines[i + 1].trim().startsWith('>')) {
        i++;
        quoteText += ' ' + lines[i].trim().slice(1).trim();
      }
      blocks.push({ type: "callout", style: "info", text: quoteText });
      i++;
      continue;
    }
    
    // Bullet list
    if (line.startsWith('- ') || line.startsWith('* ')) {
      const items: string[] = [];
      while (i < lines.length) {
        const current = lines[i].trim();
        if (current.startsWith('- ') || current.startsWith('* ')) {
          items.push(current.slice(2).trim());
          i++;
        } else if (current === '') {
          break;
        } else {
          break;
        }
      }
      blocks.push({ type: "list", style: "bullet", items });
      continue;
    }
    
    // Numbered list
    const numberedMatch = line.match(/^\d+\.\s/);
    if (numberedMatch) {
      const items: string[] = [];
      while (i < lines.length) {
        const current = lines[i].trim();
        const match = current.match(/^\d+\.\s(.+)/);
        if (match) {
          items.push(match[1].trim());
          i++;
        } else if (current === '') {
          break;
        } else {
          break;
        }
      }
      blocks.push({ type: "list", style: "numbered", items });
      continue;
    }
    
    // Tip box detection
    const tipMatch = line.match(/^\*\*([^*]+)\*\*:\s*(.+)/);
    if (tipMatch) {
      const tipTitle = tipMatch[1].trim();
      const tipKeywords = ['pro tip', 'tip', 'seasonal bonus', 'bonus', 'note', 'warning', 'important'];
      if (tipKeywords.some(kw => tipTitle.toLowerCase().includes(kw))) {
        blocks.push({ type: "tip_box", title: tipTitle, text: tipMatch[2].trim() });
        i++;
        continue;
      }
    }
    
    // Italic text (author notes) -> callout
    if (line.startsWith('*') && line.endsWith('*') && !line.startsWith('**')) {
      blocks.push({ type: "callout", style: "info", text: line.replace(/^\*|\*$/g, '').trim() });
      i++;
      continue;
    }
    
    // Regular paragraph
    let paragraph = line;
    while (i + 1 < lines.length) {
      const nextLine = lines[i + 1].trim();
      if (nextLine && 
          !nextLine.startsWith('#') && 
          !nextLine.startsWith('-') && 
          !nextLine.startsWith('*') &&
          !nextLine.startsWith('>') &&
          !nextLine.startsWith('---') &&
          !nextLine.match(/^\d+\.\s/)) {
        i++;
        paragraph += ' ' + nextLine;
      } else {
        break;
      }
    }
    
    blocks.push({ type: "paragraph", text: paragraph });
    i++;
  }
  
  return blocks;
}

function extractTitle(markdown: string): string {
  const lines = markdown.trim().split('\n');
  for (const line of lines) {
    if (line.startsWith('# ')) {
      return line.slice(2).trim();
    }
  }
  return "Untitled Article";
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function extractExcerpt(blocks: ContentBlock[]): string {
  for (const block of blocks) {
    if (block.type === 'paragraph' && block.text) {
      const text = block.text;
      if (text.length > 200) {
        return text.slice(0, 197) + '...';
      }
      return text;
    }
  }
  return "";
}

function estimateReadTime(blocks: ContentBlock[]): number {
  let totalWords = 0;
  for (const block of blocks) {
    if (block.text) {
      totalWords += block.text.split(/\s+/).length;
    }
    if (block.items) {
      for (const item of block.items) {
        totalWords += item.split(/\s+/).length;
      }
    }
  }
  return Math.max(1, Math.round(totalWords / 225));
}

export default function MarkdownImport() {
  const [markdownContent, setMarkdownContent] = useState("");
  const [parsedArticle, setParsedArticle] = useState<ParsedArticle | null>(null);
  const [customSlug, setCustomSlug] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedUniverse, setSelectedUniverse] = useState<string>("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [coverImageUrl, setCoverImageUrl] = useState("");

  // Fetch categories and universes
  const { data: categories } = trpc.articles.getCategories.useQuery();
  const { data: universes } = trpc.articles.getUniverses.useQuery();
  const bulkImportMutation = trpc.articles.bulkImport.useMutation();

  const parseMarkdown = useCallback((content: string) => {
    if (!content.trim()) {
      setParsedArticle(null);
      return;
    }

    const blocks = parseMarkdownToBlocks(content);
    const title = extractTitle(content);
    const slug = generateSlug(title);
    const excerpt = extractExcerpt(blocks);
    const readTime = estimateReadTime(blocks);

    setParsedArticle({
      title,
      slug,
      excerpt,
      content_blocks: blocks,
      read_time_minutes: readTime
    });
    setCustomSlug(slug);
  }, []);

  const handleFileUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setMarkdownContent(content);
      parseMarkdown(content);
    };
    reader.readAsText(file);
  }, [parseMarkdown]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.md') || file.type === 'text/markdown' || file.type === 'text/plain') {
        handleFileUpload(file);
      }
    }
  }, [handleFileUpload]);

  const handleImport = async () => {
    if (!parsedArticle) return;

    setImporting(true);
    setImportResult(null);

    try {
      const articleData = {
        title: parsedArticle.title,
        slug: customSlug || parsedArticle.slug,
        excerpt: parsedArticle.excerpt,
        content: "",
        content_blocks: parsedArticle.content_blocks,
        read_time_minutes: parsedArticle.read_time_minutes,
        category_id: selectedCategory || null,
        cover_image_url: coverImageUrl || undefined,
        status: "published",
        author_name: "Tavvy Team"
      };

      await bulkImportMutation.mutateAsync({
        articles: [articleData],
        updateExisting: true
      });

      setImportResult({ success: true, message: `Article "${parsedArticle.title}" imported successfully!` });
      
      // Clear form after successful import
      setMarkdownContent("");
      setParsedArticle(null);
      setCustomSlug("");
      setSelectedCategory("");
      setSelectedUniverse("");
      setCoverImageUrl("");
    } catch (error) {
      setImportResult({ 
        success: false, 
        message: error instanceof Error ? error.message : "Failed to import article" 
      });
    } finally {
      setImporting(false);
    }
  };

  const renderBlockPreview = (block: ContentBlock, index: number) => {
    switch (block.type) {
      case 'heading':
        const headingClass = `font-bold ${block.level === 1 ? 'text-2xl' : block.level === 2 ? 'text-xl' : 'text-lg'} text-white mb-2`;
        if (block.level === 1) {
          return <h1 key={index} className={headingClass}>{block.text}</h1>;
        } else if (block.level === 3) {
          return <h3 key={index} className={headingClass}>{block.text}</h3>;
        }
        return <h2 key={index} className={headingClass}>{block.text}</h2>;
      case 'paragraph':
        return <p key={index} className="text-white/80 mb-3">{block.text}</p>;
      case 'list':
        if (block.style === 'numbered') {
          return (
            <ol key={index} className="list-decimal list-inside text-white/80 mb-3 space-y-1">
              {block.items?.map((item, i) => <li key={i}>{item}</li>)}
            </ol>
          );
        }
        return (
          <ul key={index} className="list-disc list-inside text-white/80 mb-3 space-y-1">
            {block.items?.map((item, i) => <li key={i}>{item}</li>)}
          </ul>
        );
      case 'tip_box':
        return (
          <div key={index} className="bg-orange-500/20 border border-orange-500/30 rounded-lg p-3 mb-3">
            <p className="font-semibold text-orange-400">{block.title}</p>
            <p className="text-white/80 text-sm">{block.text}</p>
          </div>
        );
      case 'callout':
        return (
          <div key={index} className="bg-blue-500/20 border-l-4 border-blue-500 p-3 mb-3">
            <p className="text-white/80 italic">{block.text}</p>
          </div>
        );
      case 'divider':
        return <hr key={index} className="border-white/20 my-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Markdown Import</h1>
        <p className="text-white/60 mt-1">Import articles from Markdown files</p>
      </div>

      {importResult && (
        <Alert className={importResult.success ? "border-green-500/50 bg-green-500/10" : "border-red-500/50 bg-red-500/10"}>
          {importResult.success ? (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-500" />
          )}
          <AlertDescription className={importResult.success ? "text-green-400" : "text-red-400"}>
            {importResult.message}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Input */}
        <div className="space-y-6">
          <Card className="bg-[#141842] border-orange-500/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Upload className="h-5 w-5 text-orange-400" />
                Upload Markdown
              </CardTitle>
              <CardDescription className="text-white/60">
                Drag & drop a .md file or paste markdown content
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* File Drop Zone */}
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive 
                    ? 'border-orange-500 bg-orange-500/10' 
                    : 'border-white/20 hover:border-orange-500/50'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <FileText className="h-12 w-12 text-white/40 mx-auto mb-3" />
                <p className="text-white/60 mb-2">Drag & drop your .md file here</p>
                <p className="text-white/40 text-sm mb-3">or</p>
                <label className="cursor-pointer">
                  <span className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors">
                    Browse Files
                  </span>
                  <input
                    type="file"
                    accept=".md,.markdown,.txt"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
                  />
                </label>
              </div>

              {/* Markdown Text Area */}
              <div>
                <Label className="text-white/80">Or paste markdown content:</Label>
                <Textarea
                  value={markdownContent}
                  onChange={(e) => {
                    setMarkdownContent(e.target.value);
                    parseMarkdown(e.target.value);
                  }}
                  placeholder="# Article Title&#10;&#10;Your article content here..."
                  className="mt-2 h-64 bg-[#0F1233] border-white/20 text-white font-mono text-sm"
                />
              </div>
            </CardContent>
          </Card>

          {/* Article Settings */}
          {parsedArticle && (
            <Card className="bg-[#141842] border-orange-500/20">
              <CardHeader>
                <CardTitle className="text-white">Article Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-white/80">Slug</Label>
                  <Input
                    value={customSlug}
                    onChange={(e) => setCustomSlug(e.target.value)}
                    placeholder="article-slug"
                    className="mt-1 bg-[#0F1233] border-white/20 text-white"
                  />
                </div>

                <ImageUpload
                  value={coverImageUrl}
                  onChange={setCoverImageUrl}
                  label="Cover Image"
                  placeholder="Enter image URL or upload"
                />

                <div>
                  <Label className="text-white/80">Category</Label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="mt-1 bg-[#0F1233] border-white/20 text-white">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.map((cat: { id: string; name: string }) => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-white/80">Universe</Label>
                  <Select value={selectedUniverse} onValueChange={setSelectedUniverse}>
                    <SelectTrigger className="mt-1 bg-[#0F1233] border-white/20 text-white">
                      <SelectValue placeholder="Select universe" />
                    </SelectTrigger>
                    <SelectContent>
                      {universes?.map((uni: { id: string; name: string }) => (
                        <SelectItem key={uni.id} value={uni.id}>{uni.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleImport}
                  disabled={importing || !parsedArticle}
                  className="w-full bg-orange-500 hover:bg-orange-600"
                >
                  {importing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Import Article
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Preview */}
        <div>
          <Card className="bg-[#141842] border-orange-500/20 h-full">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Eye className="h-5 w-5 text-orange-400" />
                Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              {parsedArticle ? (
                <Tabs defaultValue="preview" className="w-full">
                  <TabsList className="bg-[#0F1233] mb-4">
                    <TabsTrigger value="preview">Article Preview</TabsTrigger>
                    <TabsTrigger value="blocks">Content Blocks ({parsedArticle.content_blocks.length})</TabsTrigger>
                  </TabsList>

                  <TabsContent value="preview" className="space-y-4">
                    {/* Article Stats */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      <Badge variant="outline" className="border-orange-500/50 text-orange-400">
                        <BookOpen className="h-3 w-3 mr-1" />
                        {parsedArticle.content_blocks.length} blocks
                      </Badge>
                      <Badge variant="outline" className="border-blue-500/50 text-blue-400">
                        <Clock className="h-3 w-3 mr-1" />
                        {parsedArticle.read_time_minutes} min read
                      </Badge>
                      <Badge variant="outline" className="border-green-500/50 text-green-400">
                        <Hash className="h-3 w-3 mr-1" />
                        {customSlug || parsedArticle.slug}
                      </Badge>
                    </div>

                    {/* Article Content Preview */}
                    <div className="bg-[#0F1233] rounded-lg p-4 max-h-[600px] overflow-y-auto">
                      {parsedArticle.content_blocks.map((block, index) => renderBlockPreview(block, index))}
                    </div>
                  </TabsContent>

                  <TabsContent value="blocks">
                    <div className="bg-[#0F1233] rounded-lg p-4 max-h-[600px] overflow-y-auto">
                      <pre className="text-xs text-white/80 whitespace-pre-wrap">
                        {JSON.stringify(parsedArticle.content_blocks, null, 2)}
                      </pre>
                    </div>
                  </TabsContent>
                </Tabs>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-white/40">
                  <FileText className="h-16 w-16 mb-4" />
                  <p>Upload or paste markdown to see preview</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
