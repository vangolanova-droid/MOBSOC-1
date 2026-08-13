/**
 * Sanitizes and normalizes image URLs from various sources:
 * - Direct HTTP/HTTPS image links
 * - Base64 Data URLs (data:image/...)
 * - Google Drive share/view links -> converted to direct lh3 image URLs
 * - Dropbox links -> converted to direct dl links
 */
export function sanitizeImageUrl(rawUrl?: string | null): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  let clean = rawUrl.trim().replace(/^["']|["']$/g, '');

  if (!clean) return '';

  // Data URLs or blob URLs can be returned directly
  if (clean.startsWith('data:') || clean.startsWith('blob:')) {
    return clean;
  }

  // Google Drive link handler (convert share links to direct display image URL)
  if (clean.includes('drive.google.com')) {
    const fileIdMatch = clean.match(/\/d\/([a-zA-Z0-9_-]+)/) || clean.match(/id=([a-zA-Z0-9_-]+)/);
    if (fileIdMatch && fileIdMatch[1]) {
      return `https://lh3.googleusercontent.com/d/${fileIdMatch[1]}`;
    }
  }

  // Dropbox link handler
  if (clean.includes('dropbox.com')) {
    return clean.replace('www.dropbox.com', 'dl.dropboxusercontent.com').replace('?dl=0', '');
  }

  // Ensure protocol exists if user pasted www...
  if (clean.startsWith('www.')) {
    return `https://${clean}`;
  }

  return clean;
}

/**
 * Converts a selected image File from device input to a compressed Data URL
 */
export function convertFileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('O ficheiro selecionado não é uma imagem válida.'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (!result) {
        reject(new Error('Erro ao ler o ficheiro de imagem.'));
        return;
      }

      // Compress large images using Canvas to prevent memory bloat in Firestore
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Max dimension 1200px
        const MAX_DIM = 1200;
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
          resolve(compressedDataUrl);
        } else {
          resolve(result);
        }
      };
      img.onerror = () => resolve(result);
      img.src = result;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}
