import React from 'react';
import { useProjectStore, type Spread, type AlbumConfig, type LayoutTemplate } from '../store/useProjectStore';

interface SpreadRendererProps {
  spread: Spread;
  layout: LayoutTemplate | undefined;
  albumConfig: AlbumConfig;
  className?: string;
  showBleed?: boolean;
}

const SpreadRenderer: React.FC<SpreadRendererProps> = ({ 
  spread, layout, albumConfig, className = '', showBleed = false 
}) => {
  if (!layout) return <div className={`bg-surface-container-low flex items-center justify-center ${className}`}>Layout Indisponível</div>;

  const spreadW = albumConfig.spreadWidth || 600;
  const spreadH = albumConfig.spreadHeight || 300;
  const spreadRatio = spreadW / (spreadH || 1);

  return (
    <div 
      className={`relative overflow-hidden bg-white ${className}`} 
      style={{ aspectRatio: `${spreadW}/${spreadH}` }}
    >
      {layout.placeholders.map(ph => {
        const image = spread.images[ph.id];
        
        // 1. Placeholder logical aspect ratio
        const phAspect = (ph.width / ph.height) * spreadRatio;
        
        // 2. Image aspect ratio (fallback if not discovered)
        const imgAspect = image?.aspectRatio || (image?.aspect === 'V' ? 0.66 : 1.5);
        
        // 3. Manual Cover Math (Mx/My factors)
        const Mx = Math.max(1, imgAspect / phAspect);
        const My = Math.max(1, phAspect / imgAspect);
        
        // 4. Safe transform values (avoid complex calc in template literals)
        const tx = -50 + ((image?.cropX || 0) / Mx);
        const ty = -50 + ((image?.cropY || 0) / My);

        return (
          <div
            key={ph.id}
            style={{
              position: 'absolute',
              left: `${ph.x}%`,
              top: `${ph.y}%`,
              width: `calc(${ph.width}% + 1px)`, 
              height: `calc(${ph.height}% + 1px)`,
              backgroundColor: '#ffffff', // Unified with spread background to hide minor gaps
              overflow: 'hidden',
              ...(showBleed ? { border: '1px dashed rgba(0,0,0,0.1)' } : { border: 'none' })
            }}
          >
            {image ? (
              <img
                className="absolute pointer-events-none select-none"
                src={image.path}
                onLoad={(e) => {
                  const { naturalWidth, naturalHeight } = e.currentTarget;
                  if (naturalWidth && naturalHeight) {
                    const ratio = naturalWidth / naturalHeight;
                    if (!image.aspectRatio || Math.abs(image.aspectRatio - ratio) > 0.01) {
                      useProjectStore.getState().updatePhotoAspect(spread.id, ph.id, ratio);
                    }
                  }
                }}
                style={{
                  top: '50%',
                  left: '50%',
                  width: `${Mx * 101}%`,
                  height: `${My * 101}%`,
                  objectFit: 'cover',
                  transformOrigin: 'center',
                  transform: `translate(${tx}%, ${ty}%) scale(${image.cropScale || 1})`,
                }}
              />
            ) : null}
          </div>
        );
      })}

      {/* Spine effect (Subtle) */}
      <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-black/5 z-20 pointer-events-none"></div>
      
      {/* Bleed Area Mask */}
      {!showBleed && albumConfig.bleed && (
        <div 
          className="absolute inset-0 pointer-events-none border-black/40 z-30 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]" 
          style={{ borderWidth: `${albumConfig.bleed}px` }}
        />
      )}
    </div>
  );
};

export default SpreadRenderer;
