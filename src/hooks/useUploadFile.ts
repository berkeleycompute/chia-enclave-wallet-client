import { useState, useCallback, useRef } from 'react';
import { ChiaCloudWalletClient, type UploadFileResponse } from '../client/ChiaCloudWalletClient';

// Upload result interface
export interface UploadResult {
  success: boolean;
  hash?: string;
  url?: string;
  error?: string;
  details?: string[];
}

// Hook configuration interface
export interface UseUploadFileConfig {
  client?: ChiaCloudWalletClient;
  baseUrl?: string;
  enableLogging?: boolean;
  onUploadStart?: (file: File) => void;
  onUploadSuccess?: (result: UploadResult) => void;
  onUploadError?: (error: string) => void;
  onUploadComplete?: (result: UploadResult) => void;
}

// Hook result interface
export interface UseUploadFileResult {
  // State
  isUploading: boolean;
  uploadProgress: number; // For future enhancement
  uploadError: string | null;
  lastUploadResult: UploadResult | null;
  
  // Actions
  uploadFile: (file: File) => Promise<UploadResult>;
  cancelUpload: () => void;
  reset: () => void;
  
  // Utilities
  validateFile: (file: File) => { valid: boolean; error?: string };
  isValidFileType: (file: File, allowedTypes?: string[]) => boolean;
}

// Default file type validation
const DEFAULT_ALLOWED_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'video/mp4',
  'video/webm',
  'audio/mp3',
  'audio/wav',
  'application/pdf',
  'text/plain'
];

// Maximum file size (50MB as defined in ChiaCloudWalletClient)
const MAX_FILE_SIZE = 50 * 1024 * 1024;

/**
 * Hook for uploading files to IPFS using the ChiaCloudWalletClient
 * Provides state management for upload operations and file validation
 */
export function useUploadFile(config: UseUploadFileConfig = {}): UseUploadFileResult {
  const {
    client,
    baseUrl,
    enableLogging = true,
    onUploadStart,
    onUploadSuccess,
    onUploadError,
    onUploadComplete
  } = config;

  // State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress] = useState(0); // For future enhancement
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [lastUploadResult, setLastUploadResult] = useState<UploadResult | null>(null);

  // Refs for cleanup
  const uploadAbortController = useRef<AbortController | null>(null);

  // Create or use provided client
  const walletClient = client || new ChiaCloudWalletClient({ 
    baseUrl, 
    enableLogging 
  });

  // File validation utility
  const validateFile = useCallback((file: File): { valid: boolean; error?: string } => {
    if (!file) {
      return { valid: false, error: 'No file provided' };
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return { 
        valid: false, 
        error: `File size too large: ${(file.size / (1024 * 1024)).toFixed(1)}MB (max: ${MAX_FILE_SIZE / (1024 * 1024)}MB)` 
      };
    }

    // Check if file size is zero
    if (file.size === 0) {
      return { valid: false, error: 'File is empty' };
    }

    return { valid: true };
  }, []);

  // File type validation utility
  const isValidFileType = useCallback((file: File, allowedTypes: string[] = DEFAULT_ALLOWED_TYPES): boolean => {
    return allowedTypes.includes(file.type);
  }, []);

  // Main upload function
  const uploadFile = useCallback(async (file: File): Promise<UploadResult> => {
    // Clear previous state
    setUploadError(null);
    setLastUploadResult(null);

    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      const error = validation.error || 'Invalid file';
      setUploadError(error);
      const errorResult: UploadResult = { success: false, error };
      setLastUploadResult(errorResult);
      onUploadError?.(error);
      onUploadComplete?.(errorResult);
      return errorResult;
    }

    // Start upload
    setIsUploading(true);
    uploadAbortController.current = new AbortController();
    
    try {
      onUploadStart?.(file);

      if (enableLogging) {
        console.log('[useUploadFile] Starting file upload:', {
          name: file.name,
          type: file.type,
          size: `${(file.size / (1024 * 1024)).toFixed(2)}MB`
        });
      }

      // Call the client upload method
      const result = await walletClient.uploadFile(file);

      if (result.success) {
        const successResult: UploadResult = {
          success: true,
          hash: result.data.hash,
          url: result.data.url,
          details: result.data.details
        };
        
        setLastUploadResult(successResult);
        onUploadSuccess?.(successResult);
        onUploadComplete?.(successResult);

        if (enableLogging) {
          console.log('[useUploadFile] Upload successful:', successResult);
        }

        return successResult;
      } else {
        const error = result.error || 'Upload failed';
        setUploadError(error);
        const errorResult: UploadResult = { 
          success: false, 
          error,
          details: result.details as string[]
        };
        
        setLastUploadResult(errorResult);
        onUploadError?.(error);
        onUploadComplete?.(errorResult);

        if (enableLogging) {
          console.error('[useUploadFile] Upload failed:', error);
        }

        return errorResult;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown upload error';
      setUploadError(errorMessage);
      const errorResult: UploadResult = { success: false, error: errorMessage };
      
      setLastUploadResult(errorResult);
      onUploadError?.(errorMessage);
      onUploadComplete?.(errorResult);

      if (enableLogging) {
        console.error('[useUploadFile] Upload error:', error);
      }

      return errorResult;
    } finally {
      setIsUploading(false);
      uploadAbortController.current = null;
    }
  }, [walletClient, validateFile, enableLogging, onUploadStart, onUploadSuccess, onUploadError, onUploadComplete]);

  // Cancel upload (for future enhancement)
  const cancelUpload = useCallback(() => {
    if (uploadAbortController.current) {
      uploadAbortController.current.abort();
      uploadAbortController.current = null;
    }
    
    setIsUploading(false);
    setUploadError('Upload cancelled by user');
    
    const cancelledResult: UploadResult = { success: false, error: 'Upload cancelled by user' };
    setLastUploadResult(cancelledResult);
    onUploadError?.('Upload cancelled by user');
    onUploadComplete?.(cancelledResult);

    if (enableLogging) {
      console.log('[useUploadFile] Upload cancelled');
    }
  }, [enableLogging, onUploadError, onUploadComplete]);

  // Reset hook state
  const reset = useCallback(() => {
    setIsUploading(false);
    setUploadError(null);
    setLastUploadResult(null);
    
    if (uploadAbortController.current) {
      uploadAbortController.current.abort();
      uploadAbortController.current = null;
    }

    if (enableLogging) {
      console.log('[useUploadFile] State reset');
    }
  }, [enableLogging]);

  return {
    // State
    isUploading,
    uploadProgress,
    uploadError,
    lastUploadResult,
    
    // Actions
    uploadFile,
    cancelUpload,
    reset,
    
    // Utilities
    validateFile,
    isValidFileType
  };
}

// Types are exported inline with their definitions above
