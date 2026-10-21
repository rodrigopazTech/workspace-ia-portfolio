import mammoth from 'mammoth';
import { ChatAttachment } from '../types/workspace';

// Maximum file size: 10MB
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

/**
 * Resizes an image if it exceeds max dimension to keep payload snappy and fast.
 */
const optimizeImage = async (file: File, maxDimension = 1920, quality = 0.85): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve(e.target?.result as string);
        }

        ctx.drawImage(img, 0, 0, width, height);
        // If PNG and has transparency, keep PNG, otherwise JPEG for smaller footprint
        const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        resolve(canvas.toDataURL(mime, quality));
      };
      img.onerror = () => {
        resolve(e.target?.result as string);
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
};

/**
 * Reads a File and transforms it into a ChatAttachment for Gemini multimodal understanding.
 */
export const processFileToAttachment = async (file: File): Promise<ChatAttachment> => {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(`File "${file.name}" exceeds the maximum 10MB limit.`);
  }

  const id = `att-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const mimeType = file.type || 'application/octet-stream';
  const name = file.name;
  const size = file.size;

  // 1. Image Files
  if (mimeType.startsWith('image/')) {
    const optimizedDataUrl = await optimizeImage(file);
    return {
      id,
      name,
      mimeType,
      size,
      dataUrl: optimizedDataUrl,
    };
  }

  // 2. PDF Files (Gemini natively supports application/pdf inlineData)
  if (mimeType === 'application/pdf' || name.toLowerCase().endsWith('.pdf')) {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    return {
      id,
      name,
      mimeType: 'application/pdf',
      size,
      dataUrl,
    };
  }

  // 3. Word Documents (.docx)
  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    name.toLowerCase().endsWith('.docx')
  ) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return {
        id,
        name,
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size,
        textExtract: result.value || '(Empty Word document)',
      };
    } catch (err) {
      console.warn('Could not extract text from docx with mammoth:', err);
      // Fallback to reading as text
      const text = await file.text();
      return {
        id,
        name,
        mimeType: 'text/plain',
        size,
        textExtract: text.slice(0, 50000),
      };
    }
  }

  // 4. Plain text / CSV / JSON / Markdown / Code files
  if (
    mimeType.startsWith('text/') ||
    name.endsWith('.txt') ||
    name.endsWith('.csv') ||
    name.endsWith('.tsv') ||
    name.endsWith('.json') ||
    name.endsWith('.md')
  ) {
    const textContent = await file.text();
    return {
      id,
      name,
      mimeType: mimeType || 'text/plain',
      size,
      textExtract: textContent,
    };
  }

  // Fallback: Read as base64 dataUrl
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  return {
    id,
    name,
    mimeType,
    size,
    dataUrl,
  };
};

/**
 * Format bytes to readable string (e.g. 1.2 MB)
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
