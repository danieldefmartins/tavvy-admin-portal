import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Move, RotateCcw, ZoomIn, Maximize2 } from "lucide-react";

interface ImageCropPreviewProps {
  imageUrl: string;
  position: string;
  onPositionChange: (position: string) => void;
  aspectRatio: "1:1" | "16:9";
  label: string;
}

/**
 * Visual image crop preview component.
 * Shows the full original image with a semi-transparent overlay,
 * and a bright crop window that can be dragged to select the visible area.
 * The crop window maintains the target aspect ratio.
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
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // Parse position string like "50% 50%" into x, y percentages
  const parsePosition = (pos: string): { x: number; y: number } => {
    const parts = pos.split(" ");
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

  // Observe container size
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Calculate the crop window size relative to the displayed image
  const getCropDimensions = () => {
    if (!imageNaturalSize.width || !imageNaturalSize.height || !containerSize.width) {
      return { cropW: 0, cropH: 0, imgW: 0, imgH: 0, offsetX: 0, offsetY: 0 };
    }

    const containerW = containerSize.width;
    const containerH = containerSize.height;

    // The image is displayed with object-fit: contain inside the container
    const imgAspect = imageNaturalSize.width / imageNaturalSize.height;
    const containerAspect = containerW / containerH;

    let imgW: number, imgH: number;
    if (imgAspect > containerAspect) {
      // Image is wider - fits width
      imgW = containerW;
      imgH = containerW / imgAspect;
    } else {
      // Image is taller - fits height
      imgH = containerH;
      imgW = containerH * imgAspect;
    }

    const offsetX = (containerW - imgW) / 2;
    const offsetY = (containerH - imgH) / 2;

    // Target aspect ratio
    const targetAspect = aspectRatio === "1:1" ? 1 : 16 / 9;

    // The crop window represents what object-fit: cover would show
    // When using cover, the image fills the target container, cropping the excess
    const imageAspect = imageNaturalSize.width / imageNaturalSize.height;

    let cropW: number, cropH: number;
    if (imageAspect > targetAspect) {
      // Image is wider than target - height fills, width crops
      cropH = imgH;
      cropW = imgH * targetAspect;
    } else {
      // Image is taller than target - width fills, height crops
      cropW = imgW;
      cropH = imgW / targetAspect;
    }

    return { cropW, cropH, imgW, imgH, offsetX, offsetY };
  };

  const { cropW, cropH, imgW, imgH, offsetX, offsetY } = getCropDimensions();

  // Calculate crop window position based on object-position percentages
  const getCropPosition = () => {
    if (!cropW || !cropH || !imgW || !imgH) return { left: 0, top: 0 };

    // The position percentage determines where the crop window sits
    // 0% = left/top edge, 50% = center, 100% = right/bottom edge
    const maxLeft = imgW - cropW;
    const maxTop = imgH - cropH;

    const left = offsetX + (posX / 100) * maxLeft;
    const top = offsetY + (posY / 100) * maxTop;

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

      const maxLeft = imgW - cropW;
      const maxTop = imgH - cropH;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        moveEvent.preventDefault();
        moveEvent.stopPropagation();

        const deltaX = moveEvent.clientX - startX;
        const deltaY = moveEvent.clientY - startY;

        // Convert pixel delta to percentage delta
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
    [posX, posY, imgW, imgH, cropW, cropH, onPositionChange]
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

      const maxLeft = imgW - cropW;
      const maxTop = imgH - cropH;

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
    [posX, posY, imgW, imgH, cropW, cropH, onPositionChange]
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

  const needsCrop = cropW > 0 && cropH > 0 && (Math.abs(cropW - imgW) > 1 || Math.abs(cropH - imgH) > 1);

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

      {/* Crop Editor - Shows full image with crop overlay */}
      <div
        ref={containerRef}
        className="relative rounded-lg overflow-hidden bg-black/80 border border-white/10"
        style={{
          width: "100%",
          height: aspectRatio === "1:1" ? "280px" : "220px",
        }}
      >
        {/* Full image displayed with object-fit: contain */}
        <img
          src={imageUrl}
          alt="Full image"
          className="absolute inset-0 w-full h-full select-none pointer-events-none"
          draggable={false}
          style={{
            objectFit: "contain",
            opacity: 0.35,
            filter: "brightness(0.7)",
          }}
        />

        {/* Crop window - bright area showing what will be visible */}
        {cropW > 0 && cropH > 0 && (
          <div
            className={`absolute rounded-sm overflow-hidden ${
              isDragging ? "ring-2 ring-orange-400" : "ring-1 ring-white/60"
            } ${needsCrop ? "cursor-grab" : ""} ${isDragging ? "cursor-grabbing" : ""}`}
            style={{
              left: `${cropLeft}px`,
              top: `${cropTop}px`,
              width: `${cropW}px`,
              height: `${cropH}px`,
              transition: isDragging ? "none" : "left 0.15s ease, top 0.15s ease",
              boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
            }}
            onMouseDown={needsCrop ? handleMouseDown : undefined}
            onTouchStart={needsCrop ? handleTouchStart : undefined}
          >
            {/* The actual cropped preview */}
            <img
              src={imageUrl}
              alt="Crop preview"
              className="absolute select-none pointer-events-none"
              draggable={false}
              style={{
                width: `${imgW}px`,
                height: `${imgH}px`,
                left: `${offsetX - cropLeft}px`,
                top: `${offsetY - cropTop}px`,
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
                <div className="flex items-center gap-1.5 text-white text-xs font-medium px-2.5 py-1.5 bg-black/60 rounded-full backdrop-blur-sm">
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
        {!needsCrop && cropW > 0 && (
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
            width: aspectRatio === "1:1" ? "80px" : "100%",
            height: aspectRatio === "1:1" ? "80px" : "0",
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
