import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ZoomIn, ZoomOut, Move } from 'lucide-react';

interface ImageCropperProps {
  imageSrc: string;
  isOpen: boolean;
  onClose: () => void;
  onCrop: (croppedImage: string) => void;
  aspectRatio?: number;
}

export function ImageCropper({
  imageSrc,
  isOpen,
  onClose,
  onCrop,
  aspectRatio = 16 / 9,
}: ImageCropperProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  }, [position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({
      x: touch.clientX - position.x,
      y: touch.clientY - position.y,
    });
  }, [position]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    setPosition({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y,
    });
  }, [isDragging, dragStart]);

  const handleCrop = useCallback(() => {
    if (!containerRef.current || !imageRef.current) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const container = containerRef.current.getBoundingClientRect();
    const cropWidth = container.width;
    const cropHeight = container.height;

    // Set canvas size to crop area
    canvas.width = cropWidth;
    canvas.height = cropHeight;

    const img = imageRef.current;
    const imgWidth = img.naturalWidth;
    const imgHeight = img.naturalHeight;

    // Calculate the displayed size of the image
    const displayedWidth = imgWidth * scale;
    const displayedHeight = imgHeight * scale;

    // Calculate the source coordinates based on the position offset
    // The position is relative to the center of the container
    const centerX = cropWidth / 2;
    const centerY = cropHeight / 2;

    // Where the image is drawn (top-left corner of the scaled image)
    const imgDrawX = centerX - (displayedWidth / 2) + position.x;
    const imgDrawY = centerY - (displayedHeight / 2) + position.y;

    // Draw the image onto the canvas
    ctx.drawImage(
      img,
      0,
      0,
      imgWidth,
      imgHeight,
      imgDrawX,
      imgDrawY,
      displayedWidth,
      displayedHeight
    );

    // Convert to base64
    const croppedImage = canvas.toDataURL('image/jpeg', 0.9);
    onCrop(croppedImage);
    
    // Reset state
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [scale, position, onCrop]);

  const handleClose = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <Move className="w-5 h-5" />
            Ajustar imagen
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Arrastra la imagen para posicionarla y usa el control para ajustar el zoom.
          </p>

          {/* Crop area */}
          <div
            ref={containerRef}
            className="relative overflow-hidden rounded-lg border-2 border-primary/50 bg-muted cursor-move"
            style={{ 
              height: 250,
              aspectRatio: aspectRatio,
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleMouseUp}
          >
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{
                transform: `translate(${position.x}px, ${position.y}px)`,
              }}
            >
              <img
                ref={imageRef}
                src={imageSrc}
                alt="Imagen a recortar"
                className="max-w-none select-none pointer-events-none"
                style={{
                  transform: `scale(${scale})`,
                  transformOrigin: 'center center',
                }}
                draggable={false}
              />
            </div>

            {/* Overlay guides */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 border-2 border-dashed border-primary/30" />
              {/* Center crosshair */}
              <div className="absolute top-1/2 left-0 right-0 h-px bg-primary/20" />
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-primary/20" />
            </div>
          </div>

          {/* Zoom control */}
          <div className="flex items-center gap-4 px-2">
            <ZoomOut className="w-4 h-4 text-muted-foreground" />
            <Slider
              value={[scale]}
              onValueChange={([value]) => setScale(value)}
              min={0.5}
              max={3}
              step={0.1}
              className="flex-1"
            />
            <ZoomIn className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground w-12 text-right">
              {Math.round(scale * 100)}%
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button variant="gradient" onClick={handleCrop}>
            Aplicar recorte
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
