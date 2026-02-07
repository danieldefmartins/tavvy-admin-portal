import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Move, RotateCcw, Maximize2 } from "lucide-react";

interface ImageCropPreviewProps {
  imageUrl: string;
  position: string;
  onPositionChange: (position: string) => void;
  aspectRatio: "1:1" | "16:9";
  label: string;
}

/**
 * Visual image crop preview component.
 * 
 * The image ALWAYS fills the full container width. The container height
 * adjusts dynamically based on the image's natural aspect ratio.
 * A crop window overlay shows exactly what portion will be visible
 * at the target aspect ratio, and can be dragged to reposition.
 * 
 * For portrait images: image fills width, container becomes tall, crop window slides vertically.
 * For landscape images: image fills width, container is shorter, crop window slides horizontally.
 * For images matching the target ratio: no crop needed, shown at full size.
 */
export default function ImageCropPreview({
  imageUrl,
  position,
  onPositionChange,
  aspectRatio,
  label,
}: ImageCropPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [imageNaturalSize, setImageNaturalSize] = useState({ width: 0, height: 0 });
  const [containerWidth, setContainerWidth] = useState(0);

  // Parse position string like "50% 50%" into x, y percentages
  const parsePosition = (pos: string): { x: number; y: number } => {
    if (pos === "center") return { x: 50, y: 50 };
    const parts = pos.replace(/%/g, "").split(" ");
    const x = parseFloat(parts[0]) || 50;
    const y = parseFloat(parts[1] || parts[0]) || 50;
    return { x, y };
  };

  const { x: posX, y: posY } = parsePosition(position);

  // Load image natural dimensions
  useEffect(() => {
    if (!imageUrl) return;
    const img = new Image();
    img.onload = () => {
      setImageNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // Observe container width
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Calculate all dimensions
  const getDimensions = () => {
    if (!imageNaturalSize.width || !imageNaturalSize.height || !containerWidth) {
      return { imgW: 0, imgH: 0, cropW: 0, cropH: 0 };
    }

    const imgAspect = imageNaturalSize.width / imageNaturalSize.height;
    const targetAspect = aspectRatio === "1:1" ? 1 : 16 / 9;

    // Image ALWAYS fills the full container width
    const imgW = containerWidth;
    const imgH = containerWidth / imgAspect;

    // Crop window: represents what object-fit: cover would show
    let cropW: number, cropH: number;
    if (imgAspect > targetAspect) {
      // Image is wider than target — height fills, width crops
      cropH = imgH;
      cropW = imgH * targetAspect;
    } else {
      // Image is taller than target — width fills, height crops
      cropW = imgW;
      cropH = imgW / targetAspect;
    }

    return { imgW, imgH, cropW, cropH };
  };

  const { imgW, imgH, cropW, cropH } = getDimensions();

  // Does the image need cropping?
  const needsCrop = cropW > 0 && cropH > 0 && (Math.abs(cropW - imgW) > 2 || Math.abs(cropH - imgH) > 2);

  // Max container height to prevent extremely tall containers for very portrait images
  const maxContainerHeight = 400;
  const naturalContainerHeight = imgH;
  const containerHeight = Math.min(naturalContainerHeight, maxContainerHeight);

  // If we capped the height, we need to scale everything down
  const scale = containerHeight > 0 && naturalContainerHeight > 0
    ? containerHeight / naturalContainerHeight
    : 1;

  const scaledImgW = imgW * scale;
  const scaledImgH = imgH * scale;
  const scaledCropW = cropW * scale;
  const scaledCropH = cropH * scale;

  // Offset to center the image horizontally if it was scaled down
  const offsetX = (containerWidth - scaledImgW) / 2;

  // Calculate crop window position based on object-position percentages
  const getCropPosition = () => {
    if (!scaledCropW || !scaledCropH || !scaledImgW || !scaledImgH) return { left: 0, top: 0 };

    const maxLeft = scaledImgW - scaledCropW;
    const maxTop = scaledImgH - scaledCropH;

    const left = offsetX + (posX / 100) * maxLeft;
    const top = (posY / 100) * maxTop;

    return { left, top };
  };

  const { left: cropLeft, top: cropTop } = getCropPosition();

  // Handle drag
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);

      const startX = e.clientX;
      const startY = e.clientY;
      const startPosX = posX;
      const startPosY = posY;

      const maxLeft = scaledImgW - scaledCropW;
      const maxTop = scaledImgH - scaledCropH;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        moveEvent.preventDefault();
        moveEvent.stopPropagation();

        const deltaX = moveEvent.clientX - startX;
        const deltaY = moveEvent.clientY - startY;

        const pctDeltaX = maxLeft > 0 ? (deltaX / maxLeft) * 100 : 0;
        const pctDeltaY = maxTop > 0 ? (deltaY / maxTop) * 100 : 0;

        const newX = Math.max(0, Math.min(100, startPosX + pctDeltaX));
        const newY = Math.max(0, Math.min(100, startPosY + pctDeltaY));

        onPositionChange(`${Math.round(newX)}% ${Math.round(newY)}%`);
      };

      const handleMouseUp = () => {
        setIsDragging(false);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.body.style.cursor = "grabbing";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [posX, posY, scaledImgW, scaledImgH, scaledCropW, scaledCropH, onPositionChange]
  );

  // Handle touch
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.stopPropagation();
      setIsDragging(true);

      const touch = e.touches[0];
      const startX = touch.clientX;
      const startY = touch.clientY;
      const startPosX = posX;
      const startPosY = posY;

      const maxLeft = scaledImgW - scaledCropW;
      const maxTop = scaledImgH - scaledCropH;

      const handleTouchMove = (moveEvent: TouchEvent) => {
        moveEvent.preventDefault();
        const moveTouch = moveEvent.touches[0];
        const deltaX = moveTouch.clientX - startX;
        const deltaY = moveTouch.clientY - startY;

        const pctDeltaX = maxLeft > 0 ? (deltaX / maxLeft) * 100 : 0;
        const pctDeltaY = maxTop > 0 ? (deltaY / maxTop) * 100 : 0;

        const newX = Math.max(0, Math.min(100, startPosX + pctDeltaX));
        const newY = Math.max(0, Math.min(100, startPosY + pctDeltaY));

        onPositionChange(`${Math.round(newX)}% ${Math.round(newY)}%`);
      };

      const handleTouchEnd = () => {
        setIsDragging(false);
        document.removeEventListener("touchmove", handleTouchMove);
        document.removeEventListener("touchend", handleTouchEnd);
      };

      document.addEventListener("touchmove", handleTouchMove, { passive: false });
      document.addEventListener("touchend", handleTouchEnd);
    },
    [posX, posY, scaledImgW, scaledImgH, scaledCropW, scaledCropH, onPositionChange]
  );

  // Quick presets
  const presets = [
    { label: "↖", x: 0, y: 0 },
    { label: "↑", x: 50, y: 0 },
    { label: "↗", x: 100, y: 0 },
    { label: "←", x: 0, y: 50 },
    { label: "●", x: 50, y: 50 },
    { label: "→", x: 100, y: 50 },
    { label: "↙", x: 0, y: 100 },
    { label: "↓", x: 50, y: 100 },
    { label: "↘", x: 100, y: 100 },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground font-medium">{label}</Label>
        {imageNaturalSize.width > 0 && (
          <span className="text-[10px] text-muted-foreground/60">
            {imageNaturalSize.width} × {imageNaturalSize.height}px
          </span>
        )}
      </div>

      {/* Crop Editor - Image fills full width, height adjusts dynamically */}
      <div
        ref={containerRef}
        className="relative rounded-lg overflow-hidden bg-black/80 border border-white/10"
        style={{
          width: "100%",
          height: containerHeight > 0 ? `${containerHeight}px` : "200px",
        }}
      >
        {/* Full image - fills width, positioned to show correctly */}
        <img
          src={imageUrl}
          alt="Full image"
          className="absolute select-none pointer-events-none"
          draggable={false}
          style={{
            width: `${scaledImgW}px`,
            height: `${scaledImgH}px`,
            left: `${offsetX}px`,
            top: 0,
            opacity: 0.35,
            filter: "brightness(0.7)",
            maxWidth: "none",
          }}
        />

        {/* Crop window - bright area showing what will be visible */}
        {scaledCropW > 0 && scaledCropH > 0 && (
          <div
            className={`absolute rounded-sm overflow-hidden ${
              isDragging ? "ring-2 ring-orange-400" : "ring-1 ring-white/60"
            } ${needsCrop ? "cursor-grab" : ""} ${isDragging ? "cursor-grabbing" : ""}`}
            style={{
              left: `${cropLeft}px`,
              top: `${cropTop}px`,
              width: `${scaledCropW}px`,
              height: `${scaledCropH}px`,
              transition: isDragging ? "none" : "left 0.15s ease, top 0.15s ease",
              boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
            }}
            onMouseDown={needsCrop ? handleMouseDown : undefined}
            onTouchStart={needsCrop ? handleTouchStart : undefined}
          >
            {/* The actual cropped preview - bright version of the image */}
            <img
              src={imageUrl}
              alt="Crop preview"
              className="absolute select-none pointer-events-none"
              draggable={false}
              style={{
                width: `${scaledImgW}px`,
                height: `${scaledImgH}px`,
                left: `${offsetX - cropLeft}px`,
                top: `${-cropTop}px`,
                maxWidth: "none",
              }}
            />

            {/* Drag hint overlay */}
            {needsCrop && (
              <div
                className={`absolute inset-0 flex items-center justify-center transition-opacity pointer-events-none ${
                  isDragging ? "opacity-100" : "opacity-0 hover:opacity-100"
                }`}
                style={{ background: "rgba(0,0,0,0.25)" }}
              >
                <div className="flex items-center gap-1 text-white text-[10px] font-medium px-2 py-1 bg-black/50 rounded-full">
                  <Move className="h-3 w-3" />
                  <span>Drag to reposition</span>
                </div>
              </div>
            )}

            {/* Corner markers */}
            {needsCrop && !isDragging && (
              <>
                <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-white/80 rounded-tl-sm pointer-events-none" />
                <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-white/80 rounded-tr-sm pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-white/80 rounded-bl-sm pointer-events-none" />
                <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-white/80 rounded-br-sm pointer-events-none" />
              </>
            )}
          </div>
        )}

        {/* No crop needed badge */}
        {!needsCrop && scaledCropW > 0 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 text-green-400 text-[10px] font-medium px-2 py-1 bg-black/60 rounded-full">
            <Maximize2 className="h-2.5 w-2.5" />
            Image fits perfectly
          </div>
        )}

        {/* Aspect ratio badge */}
        <div className="absolute top-2 left-2 text-[10px] text-white/50 font-medium px-1.5 py-0.5 bg-black/40 rounded">
          {aspectRatio}
        </div>
      </div>

      {/* Position info + presets */}
      {needsCrop && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">
              Focus: {position}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 text-[10px] text-muted-foreground px-2"
              onClick={() => onPositionChange("50% 50%")}
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Reset
            </Button>
          </div>
          <div className="grid grid-cols-9 gap-0.5">
            {presets.map((preset) => (
              <Button
                key={`${preset.x}-${preset.y}`}
                type="button"
                variant={
                  posX === preset.x && posY === preset.y ? "default" : "outline"
                }
                size="sm"
                className="h-7 text-xs px-0"
                onClick={() => onPositionChange(`${preset.x}% ${preset.y}%`)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Live Result Preview */}
      <div className="space-y-1.5">
        <Label className="text-[10px] text-muted-foreground/70 uppercase tracking-wider">
          Result Preview
        </Label>
        <div
          className="rounded-md overflow-hidden border border-white/5 bg-black/30"
          style={{
            width: aspectRatio === "1:1" ? "120px" : "100%",
            height: aspectRatio === "1:1" ? "120px" : "0",
            paddingBottom: aspectRatio === "16:9" ? "56.25%" : undefined,
            position: "relative",
          }}
        >
          <img
            src={imageUrl}
            alt="Result"
            className="absolute inset-0 w-full h-full"
            style={{
              objectFit: "cover",
              objectPosition: position,
            }}
          />
        </div>
        {aspectRatio === "1:1" && (
          <p className="text-[10px] text-muted-foreground/50">How it appears as a thumbnail</p>
        )}
        {aspectRatio === "16:9" && (
          <p className="text-[10px] text-muted-foreground/50">How it appears as a banner</p>
        )}
      </div>
    </div>
  );
}
