import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, Loader2, Image as ImageIcon, X, Link } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  bucket?: string;
  folder?: string;
  label?: string;
  placeholder?: string;
}

/**
 * Get the clean, original URL for storage in the database.
 * Strips any render/transformation parameters so we always store the original.
 */
function getCleanUrl(url: string): string {
  if (!url) return url;
  
  // If it's a Supabase render URL, convert back to object URL
  if (url.includes('supabase.co/storage')) {
    let clean = url.replace('/render/image/public/', '/object/public/');
    // Remove any query parameters (width, quality, etc.)
    const qIndex = clean.indexOf('?');
    if (qIndex !== -1) {
      clean = clean.substring(0, qIndex);
    }
    return clean;
  }
  
  return url;
}

/**
 * Get an optimized URL for display purposes only (NOT for storage).
 * Uses Supabase/Unsplash/Cloudinary transformation endpoints.
 */
export function getOptimizedImageUrl(url: string, width: number = 800, quality: number = 75): string {
  if (!url) return url;
  
  // Supabase Storage - use render endpoint with transformations
  if (url.includes('supabase.co/storage')) {
    // First get the clean object URL
    const clean = getCleanUrl(url);
    // Convert to render endpoint
    const renderUrl = clean.replace('/object/public/', '/render/image/public/');
    return `${renderUrl}?width=${width}&quality=${quality}`;
  }
  
  // Unsplash - use their URL parameters
  if (url.includes('unsplash.com')) {
    const baseUrl = url.split('?')[0];
    return `${baseUrl}?w=${width}&q=${quality}&auto=format&fit=crop`;
  }
  
  // Cloudinary - use their transformation URL format
  if (url.includes('cloudinary.com')) {
    return url.replace('/upload/', `/upload/w_${width},q_${quality},f_auto/`);
  }
  
  // Imgix - use their URL parameters
  if (url.includes('imgix.net')) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}w=${width}&q=${quality}&auto=format`;
  }
  
  // For other URLs, return as-is
  return url;
}

export default function ImageUpload({ 
  value, 
  onChange, 
  bucket = "article-images",
  folder = "covers",
  label = "Cover Image",
  placeholder = "Enter image URL or upload a file"
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [inputMode, setInputMode] = useState<"url" | "upload">("url");

  const uploadImage = async (file: File) => {
    setUploading(true);
    setError(null);

    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      // Upload to Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL - store the CLEAN original URL (no transformations)
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      // Store the original, clean URL - NOT the optimized one
      onChange(urlData.publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError("Please select an image file");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError("Image must be less than 10MB");
        return;
      }
      uploadImage(file);
    }
  }, []);

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
    
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      if (file.size > 10 * 1024 * 1024) {
        setError("Image must be less than 10MB");
        return;
      }
      uploadImage(file);
    }
  }, []);

  const handleUrlChange = (url: string) => {
    // Store the clean URL - no transformations applied
    const cleanUrl = getCleanUrl(url);
    onChange(cleanUrl);
  };

  const clearImage = () => {
    onChange("");
    setError(null);
  };

  // For display in the preview, use the original URL (not transformed)
  // The ImageCropPreview will handle display optimization
  const displayUrl = value || "";

  return (
    <div className="space-y-3">
      <Label>{label}</Label>
      
      {/* Mode Toggle */}
      <div className="flex gap-2 mb-2">
        <Button
          type="button"
          variant={inputMode === "url" ? "default" : "outline"}
          size="sm"
          onClick={() => setInputMode("url")}
          className="flex items-center gap-1"
        >
          <Link className="h-4 w-4" />
          URL
        </Button>
        <Button
          type="button"
          variant={inputMode === "upload" ? "default" : "outline"}
          size="sm"
          onClick={() => setInputMode("upload")}
          className="flex items-center gap-1"
        >
          <Upload className="h-4 w-4" />
          Upload
        </Button>
      </div>

      {inputMode === "url" ? (
        <div className="flex gap-2">
          <Input
            value={value || ""}
            onChange={(e) => handleUrlChange(e.target.value)}
            placeholder={placeholder}
            className="flex-1"
          />
          {value && (
            <Button type="button" variant="ghost" size="icon" onClick={clearImage}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      ) : (
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            dragActive 
              ? "border-orange-500 bg-orange-500/10" 
              : "border-white/20 hover:border-white/40"
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
              <p className="text-sm text-white/60">Uploading...</p>
            </div>
          ) : (
            <>
              <Upload className="h-8 w-8 mx-auto mb-2 text-white/40" />
              <p className="text-sm text-white/60 mb-2">
                Drag & drop an image here, or click to select
              </p>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                id="image-upload"
              />
              <label htmlFor="image-upload">
                <Button type="button" variant="outline" size="sm" asChild>
                  <span>Select Image</span>
                </Button>
              </label>
            </>
          )}
        </div>
      )}

      {/* Preview - shows the original image at natural aspect ratio */}
      {displayUrl && (
        <div className="relative rounded-lg overflow-hidden bg-black/20">
          <img 
            src={displayUrl} 
            alt="Preview" 
            className="w-full object-contain"
            style={{ maxHeight: "300px" }}
            onError={() => setError("Failed to load image preview")}
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2"
            onClick={clearImage}
          >
            <X className="h-4 w-4" />
          </Button>
          <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1">
            <p className="text-xs text-white/80 truncate">
              {displayUrl.includes('supabase.co') ? '✓ Stored (Supabase)' : 
               displayUrl.includes('unsplash.com') ? '✓ Unsplash' :
               '⚠ External URL'}
            </p>
          </div>
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
