/**
 * Utility to scan an image (JPG/PNG) and attempt to detect album dimensions and bleeds.
 * Based on visual heuristics and standard print DPI (300).
 */

export interface ScanResult {
  spreadWidth: number;
  spreadHeight: number;
  bleedMm: number;
  dpi: number;
  pixelWidth: number;
  pixelHeight: number;
}

export const scanTemplateImage = (file: File): Promise<ScanResult> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject('Could not get canvas context');
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        // Standard DPI for professional albums is usually 300
        const dpi = 300;
        const pxToMm = (px: number) => Math.round((px / dpi) * 25.4 * 100) / 100;

        const widthMm = pxToMm(img.width);
        const heightMm = pxToMm(img.height);

        // Heuristic for bleed:
        // Many templates have a red border (#FF0000) or safe area guides.
        // We'll scan from the edges inward to find the first significant non-edge color 
        // OR a specific "cut line" color if we can detect it.
        // For now, let's assume a standard 5mm if the image is exactly some round number + small margin,
        // or try to find a "cut line" frame.
        
        const bleedMm = detectBleed(ctx, img.width, img.height, dpi);

        resolve({
          spreadWidth: widthMm,
          spreadHeight: heightMm,
          bleedMm,
          dpi,
          pixelWidth: img.width,
          pixelHeight: img.height
        });
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

function detectBleed(ctx: CanvasRenderingContext2D, w: number, h: number, dpi: number): number {
  const imageData = ctx.getImageData(0, 0, w, h).data;
  
  // Try to find a "red line" (#FF0000) which is common for cut lines
  // We'll check at 10% and 90% of width/height to find vertical/horizontal lines
  
  const isRed = (r: number, g: number, b: number) => r > 200 && g < 50 && b < 50;
  
  let foundX = -1;
  // Scan from left to middle at y = h/2
  const midY = Math.floor(h / 2);
  for (let x = 0; x < w / 4; x++) {
    const idx = (midY * w + x) * 4;
    if (isRed(imageData[idx], imageData[idx+1], imageData[idx+2])) {
      foundX = x;
      break;
    }
  }

  if (foundX !== -1) {
    const bleedMm = (foundX / dpi) * 25.4;
    return Math.round(bleedMm * 10) / 10; // Round to 1 decimal
  }

  // Fallback: common bleeds are 3mm or 5mm
  return 5; 
}
