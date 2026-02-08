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
 * KEY DESIGN: The image ALWAYS fills the full container width.
 * - For landscape images: container is shorter, crop window slides horizontally
 * - For portrait images: container is capped at max height, image fills width,
 *   and the crop window shows the visible portion that slides vertically
 * - For images matching the target ratio: no crop needed, shown at full size
 *
 * The container uses overflow:hidden so tall portrait images are clipped,
 * but the image still fills the full width (no black side bars).
 *
 * FIX: Drag handlers use refs instead of closure-captured values to prevent
 * the crop from snapping back when React re-renders during drag.
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

  // Use refs to store the latest values so drag handlers always see current data.
  // This prevents the snap-back bug where stale closure values caused the crop
  // to jump to an old position during drag.
  const positionRef = useRef(position);
  const onPositionChangeRef = useRef(onPositionChange);

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  useEffect(() => {
    onPositionChangeRef.current = onPositionChange;
  }, [onPositionChange]);

  // Parse position string like "50% 50%" into x, y percentages
  const parsePosition = (pos: string): { x: number; y: number } => {
    if (pos === "center") return { x: 50, y: 50 };
    const parts = pos.replace(/%/g, "").split(" ");
    const x = parseFloat(parts[0]) || 50;
    const y = parseFloat(parts[1] || parts[0]) || 50;
    return { x, y };
  };

  const { x: posX, y: posY } = parsePosition(position);

  // Load image natural dimensions — use clean URL to get real dimensions
  useEffect(() => {
    if (!imageUrl) return;
    const img = new Image();
    img.onload = () => {
      setImageNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
    };
    // Strip any render/transformation params to get the real image
    let cleanUrl = imageUrl;
    if (cleanUrl.includes('supabase.co/storage')) {
      cleanUrl = cleanUrl.replace('/render/image/public/', '/object/public/');
      const qIdx = cleanUrl.indexOf('?');
      if (qIdx !== -1) cleanUrl = cleanUrl.substring(0, qIdx);
    }
    img.src = cleanUrl;
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

  // Get clean URL for display (strip render transforms)
  const getDisplayUrl = (url: string) => {
    if (!url) return url;
    if (url.includes('supabase.co/storage')) {
      let clean = url.replace('/render/image/public/', '/object/public/');
      const qIdx = clean.indexOf('?');
      if (qIdx !== -1) clean = clean.substring(0, qIdx);
      return clean;
    }
    return url;
  };

  const displayUrl = getDisplayUrl(imageUrl);

  // Calculate all dimensions
  // Image ALWAYS fills the full container width. No scaling down.
  const imgAspect = imageNaturalSize.width && imageNaturalSize.height
    ? imageNaturalSize.width / imageNaturalSize.height
    : 1;
  const targetAspect = aspectRatio === "1:1" ? 1 : 16 / 9;

  // Image fills full width
  const imgW = containerWidth;
  const imgH = containerWidth > 0 ? containerWidth / imgAspect : 0;

  // Crop window dimensions (what object-fit: cover would show)
  let cropW = 0, cropH = 0;
  if (imgW > 0 && imgH > 0) {
    if (imgAspect > targetAspect) {
      // Image is wider than target — height fills, width crops
      cropH = imgH;
      cropW = imgH * targetAspect;
    } else {
      // Image is taller than target — width fills, height crops
      cropW = imgW;
      cropH = imgW / targetAspect;
    }
  }

  // Store dimension refs for drag handlers
  const dimsRef = useRef({ imgW: 0, imgH: 0, cropW: 0, cropH: 0 });
  dimsRef.current = { imgW, imgH, cropW, cropH };

  // Does the image need cropping?
  const needsCrop = cropW > 0 && cropH > 0 && (Math.abs(cropW - imgW) > 2 || Math.abs(cropH - imgH) > 2);

  // Container height: cap at reasonable max, but image still fills width
  const maxContainerHeight = 400;
  const containerHeight = imgH > 0 ? Math.min(imgH, maxContainerHeight) : 200;

  // The image position within the container (for portrait images, we scroll the image)
  const getImageTop = () => {
    if (imgH <= containerHeight) return 0;
    const maxTop = imgH - cropH;
    const cropTopPos = (posY / 100) * maxTop;
    const idealTop = cropTopPos - (containerHeight - cropH) / 2;
    return -Math.max(0, Math.min(imgH - containerHeight, idealTop));
  };

  const imageTop = getImageTop();

  // Calculate crop window position relative to the image
  const getCropPosition = () => {
    if (!cropW || !cropH || !imgW || !imgH) return { left: 0, top: 0 };

    const maxLeft = imgW - cropW;
    const maxTop = imgH - cropH;

    const left = (posX / 100) * maxLeft;
    const top = (posY / 100) * maxTop;

    return { left, top: top + imageTop };
  };

  const { left: cropLeft, top: cropTop } = getCropPosition();

  // Handle mouse drag — uses refs to avoid stale closure values
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);

      const startX = e.clientX;
      const startY = e.clientY;

      // Capture the starting position at the moment of mousedown
      const { x: startPosX, y: startPosY } = parsePosition(positionRef.current);

      const handleMouseMove = (moveEvent: MouseEvent) => {
        moveEvent.preventDefault();
        moveEvent.stopPropagation();

        const { imgW: iW, imgH: iH, cropW: cW, cropH: cH } = dimsRef.current;
        const maxLeft = iW - cW;
        const maxTop = iH - cH;

        const deltaX = moveEvent.clientX - startX;
        const deltaY = moveEvent.clientY - startY;

        const pctDeltaX = maxLeft > 0 ? (deltaX / maxLeft) * 100 : 0;
        const pctDeltaY = maxTop > 0 ? (deltaY / maxTop) * 100 : 0;

        const newX = Math.max(0, Math.min(100, startPosX + pctDeltaX));
        const newY = Math.max(0, Math.min(100, startPosY + pctDeltaY));

        onPositionChangeRef.current(`${Math.round(newX)}% ${Math.round(newY)}%`);
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
    [] // No dependencies — we read everything from refs
  );

  // Handle touch drag — uses refs to avoid stale closure values
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.stopPropagation();
      setIsDragging(true);

      const touch = e.touches[0];
      const startX = touch.clientX;
      const startY = touch.clientY;

      // Capture the starting position at the moment of touchstart
      const { x: startPosX, y: startPosY } = parsePosition(positionRef.current);

      const handleTouchMove = (moveEvent: TouchEvent) => {
        moveEvent.preventDefault();

        const { imgW: iW, imgH: iH, cropW: cW, cropH: cH } = dimsRef.current;
        const maxLeft = iW - cW;
        const maxTop = iH - cH;

        const moveTouch = moveEvent.touches[0];
        const deltaX = moveTouch.clientX - startX;
        const deltaY = moveTouch.clientY - startY;

        const pctDeltaX = maxLeft > 0 ? (deltaX / maxLeft) * 100 : 0;
        const pctDeltaY = maxTop > 0 ? (deltaY / maxTop) * 100 : 0;

        const newX = Math.max(0, Math.min(100, startPosX + pctDeltaX));
        const newY = Math.max(0, Math.min(100, startPosY + pctDeltaY));

        onPositionChangeRef.current(`${Math.round(newX)}% ${Math.round(newY)}%`);
      };

      const handleTouchEnd = () => {
        setIsDragging(false);
        document.removeEventListener("touchmove", handleTouchMove);
        document.removeEventListener("touchend", handleTouchEnd);
      };

      document.addEventListener("touchmove", handleTouchMove, { passive: false });
      document.addEventListener("touchend", handleTouchEnd);
    },
    [] // No dependencies — we read everything from refs
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

      {/* Crop Editor - Image ALWAYS fills full width, container clips overflow */}
      <div
        ref={containerRef}
        className="relative rounded-lg overflow-hidden bg-black/80 border border-white/10"
        style={{
          width: "100%",
          height: containerHeight > 0 ? `${containerHeight}px` : "200px",
        }}
      >
        {/* Full image - always fills the container width */}
        <img
          src={displayUrl}
          alt="Full image"
          className="absolute select-none pointer-events-none"
          draggable={false}
          style={{
            width: `${imgW}px`,
            height: `${imgH}px`,
            left: 0,
            top: `${imageTop}px`,
            opacity: 0.35,
            filter: "brightness(0.7)",
            maxWidth: "none",
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
              height: `${Math.min(cropH, containerHeight)}px`,
              // Disable transition entirely during drag to prevent any visual lag/snap
              transition: isDragging ? "none" : "left 0.15s ease, top 0.15s ease",
              boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
            }}
            onMouseDown={needsCrop ? handleMouseDown : undefined}
            onTouchStart={needsCrop ? handleTouchStart : undefined}
          >
            {/* The actual cropped preview - bright version of the image */}
            <img
              src={displayUrl}
              alt="Crop preview"
              className="absolute select-none pointer-events-none"
              draggable={false}
              style={{
                width: `${imgW}px`,
                height: `${imgH}px`,
                left: `${-cropLeft}px`,
                top: `${imageTop - cropTop}px`,
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
            width: aspectRatio === "1:1" ? "120px" : "100%",
            height: aspectRatio === "1:1" ? "120px" : "0",
            paddingBottom: aspectRatio === "16:9" ? "56.25%" : undefined,
            position: "relative",
          }}
        >
          <img
            src={displayUrl}
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
