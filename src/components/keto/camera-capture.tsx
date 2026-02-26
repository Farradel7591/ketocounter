'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, X, SwitchCamera, Loader2, Upload, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CameraCaptureProps {
  onCapture: (imageBase64: string) => void;
  onClose: () => void;
  isAnalyzing: boolean;
}

// Compress image with aggressive resizing for large files
async function processImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    
    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    
    img.onload = () => {
      // Aggressive resize for large images (like 48MP HEIC)
      const MAX_WIDTH = 800;
      const MAX_HEIGHT = 800;
      const MAX_FILE_SIZE_KB = 300; // Target size
      
      let width = img.width;
      let height = img.height;
      
      // Calculate scale factor for very large images
      const scaleFactor = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height, 1);
      width = Math.round(width * scaleFactor);
      height = Math.round(height * scaleFactor);
      
      // Create canvas and resize
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      // Enable image smoothing for better quality
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      // Draw resized image
      ctx.drawImage(img, 0, 0, width, height);
      
      // Try different compression levels until we get under target size
      let quality = 0.7;
      let dataUrl = canvas.toDataURL('image/jpeg', quality);
      let base64Length = dataUrl.length - 'data:image/jpeg;base64,'.length;
      let sizeInKB = Math.round((base64Length * 3) / 4 / 1024);
      
      // Reduce quality if still too large
      while (sizeInKB > MAX_FILE_SIZE_KB && quality > 0.1) {
        quality -= 0.1;
        dataUrl = canvas.toDataURL('image/jpeg', quality);
        base64Length = dataUrl.length - 'data:image/jpeg;base64,'.length;
        sizeInKB = Math.round((base64Length * 3) / 4 / 1024);
      }
      
      console.log(`Image processed: ${width}x${height}, ${sizeInKB}KB, quality: ${quality.toFixed(1)}`);
      resolve(dataUrl);
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image - may be unsupported format'));
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsDataURL(file);
  });
}

export function CameraCapture({ onCapture, onClose, isAnalyzing }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Start camera when facing mode changes
  useEffect(() => {
    let mounted = true;
    
    async function initCamera() {
      try {
        setIsLoading(true);
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
        
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });
        
        if (!mounted) {
          newStream.getTracks().forEach(track => track.stop());
          return;
        }
        
        streamRef.current = newStream;
        
        if (videoRef.current) {
          videoRef.current.srcObject = newStream;
        }
        setIsLoading(false);
      } catch (error) {
        console.error('Error accessing camera:', error);
        if (mounted) {
          setHasPermission(false);
          setIsLoading(false);
        }
      }
    }
    
    initCamera();
    
    return () => {
      mounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [facingMode]);

  const switchCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Limit capture size
      const maxSize = 800;
      let width = video.videoWidth;
      let height = video.videoHeight;
      
      if (width > height && width > maxSize) {
        height = Math.round((height * maxSize) / width);
        width = maxSize;
      } else if (height > maxSize) {
        width = Math.round((width * maxSize) / height);
        height = maxSize;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, width, height);
        const imageBase64 = canvas.toDataURL('image/jpeg', 0.7);
        setCapturedImage(imageBase64);
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setErrorMsg(null);
    
    // Check file size - accept up to 100MB original file
    if (file.size > 100 * 1024 * 1024) {
      setErrorMsg('La imagen es muy grande. Intenta con una más pequeña.');
      return;
    }
    
    setIsProcessingImage(true);
    
    try {
      // Process and compress image
      const processedImage = await processImage(file);
      setCapturedImage(processedImage);
    } catch (error: any) {
      console.error('Error processing image:', error);
      setErrorMsg('No pude procesar esta imagen. Intenta con otra foto o usa la cámara.');
    } finally {
      setIsProcessingImage(false);
    }
  };

  const confirmCapture = () => {
    if (capturedImage) {
      onCapture(capturedImage);
    }
  };

  const retake = () => {
    setCapturedImage(null);
    setErrorMsg(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // No camera permission - show upload option
  if (hasPermission === false) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-6">
        <div className="text-white text-center space-y-4 max-w-sm">
          <Camera className="w-16 h-16 mx-auto opacity-50" />
          <p className="text-lg font-medium">Acceso a cámara denegado</p>
          <p className="text-sm opacity-70">
            Puedes subir una foto desde tu galería
          </p>
          
          {errorMsg && (
            <div className="bg-red-500/20 text-red-300 p-3 rounded-lg text-sm">
              {errorMsg}
            </div>
          )}
          
          <div className="flex flex-col gap-3 mt-6">
            <Button 
              onClick={() => fileInputRef.current?.click()}
              className="w-full gap-2"
              disabled={isProcessingImage}
            >
              {isProcessingImage ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <ImageIcon className="w-4 h-4" />
                  Subir Foto
                </>
              )}
            </Button>
            <Button variant="outline" onClick={onClose} className="w-full text-white border-white/30">
              Cerrar
            </Button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
        
        {capturedImage && (
          <div className="fixed inset-0 z-50 bg-black flex flex-col">
            <img 
              src={capturedImage} 
              alt="Uploaded" 
              className="flex-1 object-contain"
            />
            <div className="p-4 bg-black/80 pb-safe">
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={retake}
                  className="rounded-full px-8 text-white border-white/30"
                  disabled={isAnalyzing}
                >
                  Cambiar
                </Button>
                <Button
                  size="lg"
                  onClick={confirmCapture}
                  className="rounded-full px-8 bg-emerald-600 hover:bg-emerald-700"
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analizando...
                    </>
                  ) : (
                    'Analizar'
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Loading indicator */}
      {(isLoading || isProcessingImage) && !capturedImage && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
          <div className="text-white text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
            <p className="text-sm">{isProcessingImage ? 'Procesando imagen...' : 'Iniciando cámara...'}</p>
          </div>
        </div>
      )}
      
      {/* Error message */}
      {errorMsg && !capturedImage && (
        <div className="absolute top-16 left-4 right-4 bg-red-500/90 text-white p-3 rounded-lg text-sm z-20">
          {errorMsg}
          <button onClick={() => setErrorMsg(null)} className="float-right font-bold">×</button>
        </div>
      )}
      
      {/* Video or captured image */}
      <div className="relative flex-1">
        {capturedImage ? (
          <img 
            src={capturedImage} 
            alt="Captured" 
            className="w-full h-full object-contain"
          />
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        )}
      </div>

      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-3 rounded-full bg-black/50 text-white z-20"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Controls */}
      <div className={cn(
        "p-4 bg-gradient-to-t from-black/80 to-transparent",
        capturedImage ? "pb-safe" : ""
      )}>
        {capturedImage ? (
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="outline"
              size="lg"
              onClick={retake}
              className="rounded-full px-6 bg-white/10 border-white/30 text-white hover:bg-white/20"
              disabled={isAnalyzing}
            >
              Cambiar
            </Button>
            <Button
              size="lg"
              onClick={confirmCapture}
              className="rounded-full px-6 bg-emerald-600 hover:bg-emerald-700"
              disabled={isAnalyzing}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analizando...
                </>
              ) : (
                'Analizar'
              )}
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-4">
            {/* Upload button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center gap-1 p-3 rounded-xl bg-white/20 text-white hover:bg-white/30 transition-colors"
            >
              <Upload className="w-6 h-6" />
              <span className="text-xs">Subir</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />

            {/* Capture button */}
            <button
              onClick={capturePhoto}
              className="w-16 h-16 rounded-full border-4 border-white bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-white" />
            </button>

            {/* Switch camera */}
            <button
              onClick={switchCamera}
              className="flex flex-col items-center gap-1 p-3 rounded-xl bg-white/20 text-white hover:bg-white/30 transition-colors"
            >
              <SwitchCamera className="w-6 h-6" />
              <span className="text-xs">Girar</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
