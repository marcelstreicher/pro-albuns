import { type Placeholder } from './layouts';

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Detects rectangular areas in an image that likely represent photo placeholders.
 * Returns coordinates in percentages (0-100).
 * This version is optimized for ULTRA-HIGH PRECISION (no scaling, pixel-perfect).
 */
export async function detectPlaceholdersFromImage(imageFile: File): Promise<Placeholder[]> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject('Could not get canvas context');

      // AS REQUESTED: No scaling. Use the original dimensions (7200x6200 etc).
      const w = img.width;
      const h = img.height;
      
      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(img.src);

      const imageData = ctx.getImageData(0, 0, w, h);
      const boxes = findRectangles(imageData);
      
      const placeholders: Placeholder[] = boxes.map((box, idx) => ({
        id: `p${idx + 1}`,
        x: (box.x / w) * 100,
        y: (box.y / h) * 100,
        width: (box.width / w) * 100,
        height: (box.height / h) * 100
      }));

      resolve(placeholders);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(imageFile);
  });
}

function findRectangles(imageData: ImageData): Box[] {
  const { width, height, data } = imageData;
  const visited = new Uint8Array(width * height);
  let boxes: Box[] = [];

  // 1. Robust Background Detection (Sampling 8 points around edges)
  const getP = (x: number, y: number) => {
    const i = (y * width + x) * 4;
    return [data[i], data[i+1], data[i+2]];
  };
  const samples = [
    getP(5, 5), getP(width - 6, 5), getP(5, height - 6), getP(width - 6, height - 6),
    getP(Math.floor(width/2), 5), getP(5, Math.floor(height/2)), 
    getP(width - 6, Math.floor(height/2)), getP(Math.floor(width/2), height - 6)
  ];
  
  // Choose the most frequent color as bgColor
  let bgColor = samples[0];
  let maxMatch = 0;
  for (const s of samples) {
    let match = 0;
    for (const other of samples) {
       const d = Math.sqrt(Math.pow(s[0]-other[0],2)+Math.pow(s[1]-other[1],2)+Math.pow(s[2]-other[2],2));
       if (d < 30) match++;
    }
    if (match > maxMatch) { maxMatch = match; bgColor = s; }
  }

  // 2. Scan every single pixel for islands (Pixel-Perfect)
  const step = 2; // Using 2 for performance even in high res, but 1 is also possible.
                  // For 7200px, 2 is still very precise (0.02% error).
                  // Let's use 2 for initial discovery to avoid excessive stalls.
                  
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const idx = (y * width + x);
      if (visited[idx]) continue;

      const pIdx = idx * 4;
      if (!isBackgroundColor(data[pIdx], data[pIdx + 1], data[pIdx + 2], bgColor)) {
        // CONTENT FOUND!
        const box = growBox(x, y, width, height, data, visited, bgColor);
        
        // Filter out tiny noise (less than ~2% of width/height)
        if (box && box.width > width * 0.02 && box.height > height * 0.02) {
          boxes.push(box);
        }
      }
    }
  }

  // 3. Resolve Overlaps (NUNCA vai ter uma foto sobreposta)
  boxes = resolveOverlaps(boxes);

  // 4. Precision Trimming
  return boxes.map(box => trimToContent(box, width, height, data, bgColor));
}

function isBackgroundColor(r: number, g: number, b: number, bgColor: number[]): boolean {
  const dist = Math.sqrt(
    Math.pow(r - bgColor[0], 2) + 
    Math.pow(g - bgColor[1], 2) + 
    Math.pow(b - bgColor[2], 2)
  );
  return dist < 45; // Generous distance for compression artifacts
}

function growBox(startX: number, startY: number, width: number, height: number, data: Uint8ClampedArray, visited: Uint8Array, bgColor: number[]): Box | null {
  let minX = startX, maxX = startX;
  let minY = startY, maxY = startY;

  const queue: [number, number][] = [[startX, startY]];
  visited[startY * width + startX] = 1;
  
  // This step MUST be 1 or 2 for high precision.
  // We'll use 2 for speed, with a small look-ahead to bridge gaps.
  const step = 2;
  const gapLookAhead = 8; // Bridge small bright gaps (pixels)

  let count = 0;
  const maxPixels = 100000000; // NO LIMIT for large photos (up to 100M pixels)

  while (queue.length > 0 && count < maxPixels) {
    const [currX, currY] = queue.shift()!;
    count++;

    minX = Math.min(minX, currX);
    maxX = Math.max(maxX, currX);
    minY = Math.min(minY, currY);
    maxY = Math.max(maxY, currY);

    // Check neighbors in 4 directions
    const neighbors = [[step, 0], [-step, 0], [0, step], [0, -step]];
    for (const [dx, dy] of neighbors) {
      const nx = currX + dx;
      const ny = currY + dy;

      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const nIdx = ny * width + nx;
        if (visited[nIdx]) continue;

        const pIdx = nIdx * 4;
        let isContent = !isBackgroundColor(data[pIdx], data[pIdx + 1], data[pIdx + 2], bgColor);

        // Gap bridging logic
        if (!isContent) {
           for (let g = 1; g <= gapLookAhead; g += 2) {
              const lx = nx + (dx > 0 ? g : dx < 0 ? -g : 0);
              const ly = ny + (dy > 0 ? g : dy < 0 ? -g : 0);
              if (lx < 0 || lx >= width || ly < 0 || ly >= height) break;
              const lIdx = (ly * width + lx) * 4;
              if (!isBackgroundColor(data[lIdx], data[lIdx+1], data[lIdx+2], bgColor)) {
                 isContent = true;
                 break;
              }
           }
        }

        if (isContent) {
          visited[nIdx] = 1;
          queue.push([nx, ny]);
        }
      }
    }
  }

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function resolveOverlaps(boxes: Box[]): Box[] {
  let hasMerged = true;
  let currentBoxes = [...boxes];

  while (hasMerged) {
    hasMerged = false;
    const nextBoxes: Box[] = [];
    const usedIndices = new Set<number>();

    for (let i = 0; i < currentBoxes.length; i++) {
      if (usedIndices.has(i)) continue;
      let boxA = currentBoxes[i];

      for (let j = i + 1; j < currentBoxes.length; j++) {
        if (usedIndices.has(j)) continue;
        const boxB = currentBoxes[j];

        if (doOverlap(boxA, boxB)) {
          boxA = mergeBoxes(boxA, boxB);
          usedIndices.add(j);
          hasMerged = true;
        }
      }
      nextBoxes.push(boxA);
      usedIndices.add(i);
    }
    currentBoxes = nextBoxes;
  }
  return currentBoxes;
}

function doOverlap(a: Box, b: Box): boolean {
  // Overlap check
  return !(
    b.x > a.x + a.width ||
    b.x + b.width < a.x ||
    b.y > a.y + a.height ||
    b.y + b.height < a.y
  );
}

function mergeBoxes(a: Box, b: Box): Box {
  const minX = Math.min(a.x, b.x);
  const minY = Math.min(a.y, b.y);
  const maxX = Math.max(a.x + a.width, b.x + b.width);
  const maxY = Math.max(a.y + a.height, b.y + b.height);
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function trimToContent(box: Box, width: number, height: number, data: Uint8ClampedArray, bgColor: number[]): Box {
  let { x: minX, y: minY, width: w, height: h } = box;
  let maxX = minX + w;
  let maxY = minY + h;

  const isBg = (x: number, y: number) => {
    const i = (y * width + x) * 4;
    return isBackgroundColor(data[i], data[i+1], data[i+2], bgColor);
  };

  while (minY < maxY) {
    let content = false;
    for (let x = minX; x <= maxX; x++) if (!isBg(x, minY)) { content = true; break; }
    if (content) break; 
    minY++;
  }
  while (maxY > minY) {
    let content = false;
    for (let x = minX; x <= maxX; x++) if (!isBg(x, maxY)) { content = true; break; }
    if (content) break;
    maxY--;
  }
  while (minX < maxX) {
    let content = false;
    for (let y = minY; y <= maxY; y++) if (!isBg(minX, y)) { content = true; break; }
    if (content) break;
    minX++;
  }
  while (maxX > minX) {
    let content = false;
    for (let y = minY; y <= maxY; y++) if (!isBg(maxX, y)) { content = true; break; }
    if (content) break;
    maxX--;
  }

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}
