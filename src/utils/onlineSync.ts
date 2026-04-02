import { type MediaItem } from '../store/useProjectStore';

export interface OnlineProject {
  id: string;
  name: string;
  hasPhysicalAlbum: boolean;
  status: 'active' | 'archived';
  photos?: string[]; // URLs
}

export async function fetchOnlineProjects(endpoint: string, token: string): Promise<OnlineProject[]> {
  try {
    const response = await fetch(`${endpoint}/api/projects`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) throw new Error('Falha ao buscar projetos');
    return await response.json();
  } catch (error) {
    console.error('Error fetching online projects:', error);
    throw error;
  }
}

export async function fetchProjectPhotos(endpoint: string, token: string, projectId: string): Promise<string[]> {
  try {
    const response = await fetch(`${endpoint}/api/projects/${projectId}/media`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) throw new Error('Falha ao buscar fotos do projeto');
    const data = await response.json();
    return data.photos || []; // Esperamos um array de URLs
  } catch (error) {
    console.error('Error fetching project photos:', error);
    throw error;
  }
}

interface DownloadProgress {
  total: number;
  completed: number;
}

export async function importOnlineMedia(
  photoUrls: string[],
  destDir: string,
  onProgress?: (progress: DownloadProgress) => void
): Promise<MediaItem[]> {
  const mediaItems: MediaItem[] = [];
  let completed = 0;

  for (const url of photoUrls) {
    const fileName = url.split('/').pop() || `photo_${Date.now()}.jpg`;
    // Em Windows, Join-Path style
    const fullPath = `${destDir}\\${fileName}`.replace(/\//g, '\\');
    
    // Chamada nativa para download
    const success = await window.electronAPI.downloadMedia(url, fullPath);
    
    if (success) {
      mediaItems.push({
        path: `file:///${fullPath.replace(/\\/g, '/')}`,
        aspect: 'H'
      });
    }

    completed++;
    if (onProgress) onProgress({ total: photoUrls.length, completed });
  }

  return mediaItems;
}
