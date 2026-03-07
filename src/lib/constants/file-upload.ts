/**
 * File upload constants
 * Shared between frontend and backend for consistency
 */

// Maximum file size: 2MB
export const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB in bytes

// Maximum file size for display purposes
export const MAX_FILE_SIZE_MB = 2;

// Helper function to format file size
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

// Helper function to check if file size is valid
export function isValidFileSize(size: number): boolean {
  return size > 0 && size <= MAX_FILE_SIZE;
}

// Helper function to get file size error message
export function getFileSizeErrorMessage(size: number): string {
  if (size <= 0) {
    return 'File size must be greater than 0';
  }
  if (size > MAX_FILE_SIZE) {
    return `File size exceeds the maximum allowed size of ${MAX_FILE_SIZE_MB}MB`;
  }
  return '';
}
