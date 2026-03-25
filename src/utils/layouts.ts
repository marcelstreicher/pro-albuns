export interface Placeholder {
  id: string;
  x: number; // % from left
  y: number; // % from top
  width: number; // % width
  height: number; // % height
}

export interface LayoutTemplate {
  id: string;
  name: string;
  photoCount: number;
  placeholders: Placeholder[];
  format?: 'square' | 'landscape' | 'portrait' | 'all';
}

export const layoutsDictionary: Record<string, LayoutTemplate> = {
  'auto': {
    id: 'auto',
    name: 'Auto Backup (1 Photo Full)',
    photoCount: 1,
    placeholders: [
      { id: 'p1', x: 2, y: 2, width: 96, height: 96 }
    ],
    format: 'all'
  },
  
  // 1 Photo Layouts
  '1-full-spread': {
    id: '1-full-spread',
    name: 'Full Spread Panorama',
    photoCount: 1,
    placeholders: [
      { id: 'p1', x: 0, y: 0, width: 100, height: 100 }
    ],
    format: 'all'
  },
  '1-right-page': {
    id: '1-right-page',
    name: 'Right Page Full',
    photoCount: 1,
    placeholders: [
      { id: 'p1', x: 50, y: 0, width: 50, height: 100 }
    ]
  },
  '1-center-margin': {
    id: '1-center-margin',
    name: 'Center with Margins',
    photoCount: 1,
    placeholders: [
      { id: 'p1', x: 10, y: 10, width: 80, height: 80 }
    ]
  },

  // 2 Photos Layouts
  '2-split-equal': {
    id: '2-split-equal',
    name: '50/50 Split',
    photoCount: 2,
    placeholders: [
      { id: 'p1', x: 2, y: 2, width: 47, height: 96 },
      { id: 'p2', x: 51, y: 2, width: 47, height: 96 }
    ],
    format: 'all'
  },
  '2-vertical-stack': {
    id: '2-vertical-stack',
    name: 'Stacked Right',
    photoCount: 2,
    placeholders: [
      { id: 'p1', x: 55, y: 5, width: 40, height: 43 },
      { id: 'p2', x: 55, y: 52, width: 40, height: 43 }
    ]
  },

  // 3 Photos Layouts
  '3-left-focus': {
    id: '3-left-focus',
    name: 'Left Focus',
    photoCount: 3,
    placeholders: [
      { id: 'p1', x: 2, y: 2, width: 46, height: 96 }, // Left page
      { id: 'p2', x: 52, y: 2, width: 46, height: 46 }, // Right page top
      { id: 'p3', x: 52, y: 52, width: 46, height: 46 } // Right page bot
    ],
    format: 'all'
  },
  '3-row': {
    id: '3-row',
    name: 'Horizontal Strip',
    photoCount: 3,
    placeholders: [
      { id: 'p1', x: 2, y: 20, width: 30, height: 60 },
      { id: 'p2', x: 35, y: 20, width: 30, height: 60 },
      { id: 'p3', x: 68, y: 20, width: 30, height: 60 }
    ]
  },

  // 4 Photos Layouts
  '4-grid': {
    id: '4-grid',
    name: 'Symmetric Grid',
    photoCount: 4,
    placeholders: [
      { id: 'p1', x: 2, y: 2, width: 46, height: 46 },
      { id: 'p2', x: 52, y: 2, width: 46, height: 46 },
      { id: 'p3', x: 2, y: 52, width: 46, height: 46 },
      { id: 'p4', x: 52, y: 52, width: 46, height: 46 }
    ],
    format: 'all'
  },
  
  // 5 Photos
  '5-dynamic': {
    id: '5-dynamic',
    name: 'Mosaic 5',
    photoCount: 5,
    placeholders: [
      { id: 'p1', x: 2, y: 2, width: 46, height: 96 },    // Left huge
      { id: 'p2', x: 50, y: 2, width: 23, height: 46 },  // Right quad
      { id: 'p3', x: 75, y: 2, width: 23, height: 46 },
      { id: 'p4', x: 50, y: 52, width: 23, height: 46 },
      { id: 'p5', x: 75, y: 52, width: 23, height: 46 }
    ],
    format: 'all'
  },

  // Specific Landscape Layouts
  '2-landscape-strip': {
    id: '2-landscape-strip',
    name: 'Landscape Strip',
    photoCount: 2,
    placeholders: [
      { id: 'p1', x: 2, y: 10, width: 46, height: 80 },
      { id: 'p2', x: 52, y: 10, width: 46, height: 80 }
    ],
    format: 'landscape'
  },

  // Specific Portrait Layouts
  '2-portrait-stack': {
    id: '2-portrait-stack',
    name: 'Portrait Stack',
    photoCount: 2,
    placeholders: [
      { id: 'p1', x: 25, y: 2, width: 50, height: 46 },
      { id: 'p2', x: 25, y: 52, width: 50, height: 46 }
    ],
    format: 'portrait'
  }
};
