import { useState, useCallback } from 'react';
import { toast } from 'sonner';

interface UseFileDragDropOptions {
  onFileDrop: (file: File) => void;
  accept?: string; // e.g., "image/*" or "image/*,.pdf"
  maxSize?: number; // in bytes
  disabled?: boolean;
}

interface UseFileDragDropReturn {
  isDragging: boolean;
  dragHandlers: {
    onDragOver: (e: React.DragEvent) => void;
    onDragLeave: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
  };
}

/**
 * Custom hook for handling file drag & drop functionality
 *
 * @param options - Configuration options
 * @param options.onFileDrop - Callback function when a valid file is dropped
 * @param options.accept - Accepted file types (MIME types or extensions)
 * @param options.maxSize - Maximum file size in bytes
 * @param options.disabled - Whether drag & drop is disabled
 *
 * @returns Object containing isDragging state and drag event handlers
 *
 * @example
 * const { isDragging, dragHandlers } = useFileDragDrop({
 *   onFileDrop: (file) => handleFileUpload(file),
 *   accept: 'image/*',
 *   maxSize: 2 * 1024 * 1024, // 2MB
 *   disabled: false
 * });
 *
 * <div {...dragHandlers} className={isDragging ? 'border-blue-500' : 'border-gray-300'}>
 *   Drop zone
 * </div>
 */
export function useFileDragDrop({
  onFileDrop,
  accept,
  maxSize,
  disabled = false,
}: UseFileDragDropOptions): UseFileDragDropReturn {
  const [isDragging, setIsDragging] = useState(false);

  /**
   * Validates file type against accepted types
   */
  const validateFileType = useCallback(
    (file: File): boolean => {
      if (!accept) return true;

      const acceptedTypes = accept.split(',').map((type) => type.trim());

      // Check MIME type or extension
      return acceptedTypes.some((acceptedType) => {
        if (acceptedType.startsWith('.')) {
          // Extension check (e.g., ".pdf")
          return file.name.toLowerCase().endsWith(acceptedType.toLowerCase());
        } else if (acceptedType.endsWith('/*')) {
          // Wildcard MIME type check (e.g., "image/*")
          const baseType = acceptedType.slice(0, -2);
          return file.type.startsWith(baseType);
        } else {
          // Exact MIME type check (e.g., "image/jpeg")
          return file.type === acceptedType;
        }
      });
    },
    [accept]
  );

  /**
   * Validates file size against maximum size
   */
  const validateFileSize = useCallback(
    (file: File): boolean => {
      if (!maxSize) return true;
      return file.size <= maxSize;
    },
    [maxSize]
  );

  /**
   * Gets human-readable file size
   */
  const getFileSizeString = useCallback((bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }, []);

  /**
   * Gets human-readable accepted file types
   */
  const getAcceptedTypesString = useCallback((): string => {
    if (!accept) return 'any file type';

    const types = accept.split(',').map((type) => type.trim());
    const extensions = types
      .filter((t) => t.startsWith('.'))
      .map((t) => t.toUpperCase().slice(1));
    const mimeTypes = types
      .filter((t) => !t.startsWith('.'))
      .map((t) => {
        if (t === 'image/*') return 'images';
        if (t === 'video/*') return 'videos';
        if (t === 'audio/*') return 'audio';
        if (t === 'application/pdf') return 'PDF';
        return t;
      });

    const allTypes = [...extensions, ...mimeTypes];
    if (allTypes.length === 0) return 'any file type';
    if (allTypes.length === 1) return allTypes[0];
    if (allTypes.length === 2) return `${allTypes[0]} or ${allTypes[1]}`;
    return `${allTypes.slice(0, -1).join(', ')}, or ${allTypes[allTypes.length - 1]}`;
  }, [accept]);

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (disabled) return;
      setIsDragging(true);
    },
    [disabled]
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (disabled) return;
      setIsDragging(false);
    },
    [disabled]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      if (disabled) return;

      const file = e.dataTransfer.files?.[0];
      if (!file) {
        toast.error('No file was dropped');
        return;
      }

      // Validate file type
      if (!validateFileType(file)) {
        toast.error(`Invalid file type. Please upload ${getAcceptedTypesString()}`);
        return;
      }

      // Validate file size
      if (!validateFileSize(file)) {
        const maxSizeStr = maxSize ? getFileSizeString(maxSize) : '';
        toast.error(`File size must be less than ${maxSizeStr}`);
        return;
      }

      // File is valid, call the callback
      onFileDrop(file);
    },
    [
      disabled,
      onFileDrop,
      validateFileType,
      validateFileSize,
      getAcceptedTypesString,
      getFileSizeString,
      maxSize,
    ]
  );

  return {
    isDragging,
    dragHandlers: {
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop,
    },
  };
}
