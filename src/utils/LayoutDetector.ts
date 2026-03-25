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
 */
export async function detectPlaceholdersFromImage(imageFile: File): Promise<Placeholder[]> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject('Could not get canvas context');

      // Resize or limit size for performance
      const maxDim = 800;
      let w = img.width;
      let h = img.height;
      if (w > maxDim || h > maxDim) {
        if (w > h) {
          h = (h / w) * maxDim;
          w = maxDim;
        } else {
          w = (w / h) * maxDim;
          h = maxDim;
        }
      }
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
  const boxes: Box[] = [];

  // 1. Pre-process: Thresholding
  // We assume photos are distinct from background (usually white or dark)
  const isDark = (r: number, g: number, b: number) => (r + g + b) / 3 < 128;
  
  // 2. Scan for "islands"
  for (let y = 0; y < height; y += 4) { // Sample every few pixels for speed
    for (let x = 0; x < width; x += 4) {
      const idx = (y * width + x);
      if (visited[idx]) continue;

      const pIdx = idx * 4;
      if (isDark(data[pIdx], data[pIdx + 1], data[pIdx + 2])) {
        // Potential rectangle found
        const box = growBox(x, y, width, height, data, visited);
        if (box && box.width > width * 0.05 && box.height > height * 0.05) {
          boxes.push(box);
        }
      }
    }
  }

  return boxes;
}

function growBox(startX: number, startY: number, width: number, height: number, data: Uint8ClampedArray, visited: Uint8Array): Box | null {
  const isDark = (x: number, y: number) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return false;
    const pIdx = (y * width + x) * 4;
    return (data[pIdx] + data[pIdx + 1] + data[pIdx + 2]) / 3 < 128;
  };

  let minX = startX, maxX = startX;
  let minY = startY, maxY = startY;

  // Simple Breadth-First-Search or Flood-Fill to find bounds
  const queue = [[startX, startY]];
  visited[startY * width + startX] = 1;
  
  let count = 0;
  const maxPixels = 10000; // Safety limit

  while (queue.length > 0 && count < maxPixels) {
    const [currX, currY] = queue.shift()!;
    count++;

    minX = Math.min(minX, currX);
    maxX = Math.max(maxX, currX);
    minY = Math.min(minY, currY);
    maxY = Math.max(maxY, currY);

    // Check 4 neighbors
    const neighbors = [[currX+4, currY], [currX-4, currY], [currX, currY+4], [currX, currY-4]];
    for (const [nx, ny] of neighbors) {
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const nIdx = ny * width + nx;
        if (!visited[nIdx] && isDark(nx, ny)) {
          visited[nIdx] = 1;
          queue.push([nx, ny]);
        }
      }
    }
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
}
