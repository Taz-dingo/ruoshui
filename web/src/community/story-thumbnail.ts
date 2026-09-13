interface StoryThumbnailResult {
  file: File;
  height: number;
  sourceHeight: number;
  sourceWidth: number;
  width: number;
}

const thumbnailMaxEdge = 640;
const thumbnailMaxBytes = 512 * 1024;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Image could not be decoded for thumbnail generation.'));
    };
    image.src = url;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, mimeType, quality));
}

function extensionForMimeType(mimeType: string) {
  if (mimeType === 'image/jpeg') return 'jpg';
  if (mimeType === 'image/png') return 'png';
  return 'webp';
}

async function createStoryThumbnail(file: File): Promise<StoryThumbnailResult | null> {
  if (!file.type.startsWith('image/')) {
    return null;
  }

  try {
    const image = await loadImage(file);
    const sourceWidth = image.naturalWidth;
    const sourceHeight = image.naturalHeight;
    if (!sourceWidth || !sourceHeight) {
      return null;
    }

    const scale = Math.min(1, thumbnailMaxEdge / Math.max(sourceWidth, sourceHeight));
    const width = Math.max(1, Math.round(sourceWidth * scale));
    const height = Math.max(1, Math.round(sourceHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) {
      return null;
    }

    context.drawImage(image, 0, 0, width, height);

    let blob = await canvasToBlob(canvas, 'image/webp', 0.72);
    if (blob && blob.size > thumbnailMaxBytes) {
      blob = await canvasToBlob(canvas, 'image/webp', 0.56);
    }
    if (!blob || blob.size <= 0 || blob.size > thumbnailMaxBytes) {
      return null;
    }

    const mimeType = blob.type || 'image/webp';
    const baseName = file.name.replace(/\.[^.]+$/, '') || 'story-photo';
    return {
      file: new File(
        [blob],
        `${baseName}.thumbnail.${extensionForMimeType(mimeType)}`,
        { type: mimeType },
      ),
      height,
      sourceHeight,
      sourceWidth,
      width,
    };
  } catch {
    return null;
  }
}

export { createStoryThumbnail };
export type { StoryThumbnailResult };
