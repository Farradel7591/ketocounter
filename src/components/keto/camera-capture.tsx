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

// Compress and convert image to JPEG
async function processImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    
    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    
    img.onload = () => {
      // Max dimensions for API
      const MAX_WIDTH = 1024;
      const MAX_HEIGHT = 1024;
      
      let width = img.width;
      let height = img.height;
      
      // Calculate new dimensions
      if (width > height) {
        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width = Math.round((width * MAX_HEIGHT) / height);
          height = MAX_HEIGHT;
        }
      }
      
      // Create canvas and resize
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      // Draw resized image
      ctx.drawImage(img, 0, 0, width, height);
      
      // Convert to JPEG with compression (0.7 quality = ~70% compression)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
      
      // Check final size (max ~500KB for API)
      const base64Length = dataUrl.length - 'data:image/jpeg;base64,'.length;
      const sizeInKB = Math.round((base64Length * 3) / 4 / 1024);
      
      if (sizeInKB > 500) {
        // Re-compress with lower quality
        const lowerQuality = canvas.toDataURL('image/jpeg', 0.5);
        resolve(lowerQuality);
      } else {
        resolve(dataUrl);
      }
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image'));
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
      const maxSize = 1024;
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
    
    // Validate file type (accept HEIC too)
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif'];
    const isHeic = file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif');
    
    if (!validTypes.includes(file.type) && !isHeic) {
      alert('Por favor selecciona una imagen válida (JPG, PNG, HEIC)');
      return;
    }
    
    // Check file size (max 50MB for original)
    if (file.size > 50 * 1024 * 1024) {
      alert('La imagen es muy grande. Intenta con una más pequeña.');
      return;
    }
    
    setIsProcessingImage(true);
    
    try {
      // Process and compress image
      const processedImage = await processImage(file);
      setCapturedImage(processedImage);
    } catch (error) {
      console.error('Error processing image:', error);
      alert('Error al procesar la imagen. Intenta con otra foto.');
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
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (hasPermission === false) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-6">
        <div className="text-white text-center space-y-4 max-w-sm">
          <Camera className="w-16 h-16 mx-auto opacity-50" />
          <p className="text-lg font-medium">Acceso a cámara denegado</p>
          <p className="text-sm opacity-70">
            Pero puedes subir una foto desde tu galería
          </p>
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
            <Button variant="outline" onClick={onClose} className="w-full">
              Cerrar
            </Button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.heic,.heif"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
        
        {capturedImage && (
          <div className="fixed inset-0 z-50 bg-black">
            <img 
              src={capturedImage} 
              alt="Uploaded" 
              className="w-full h-full object-contain"
            />
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent pb-safe">
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={retake}
                  className="rounded-full px-8"
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
    <div className="fixed inset-0 z-50 bg-black">
      {/* Loading indicator */}
      {(isLoading || isProcessingImage) && !capturedImage && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
          <div className="text-white text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
            <p className="text-sm">{isProcessingImage ? 'Procesando imagen...' : 'Iniciando cámara...'}</p>
          </div>
        </div>
      )}
      
      {/* Video or captured image */}
      <div className="relative w-full h-full">
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
        "absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent",
        capturedImage ? "pb-safe" : ""
      )}>
        {capturedImage ? (
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="outline"
              size="lg"
              onClick={retake}
              className="rounded-full px-8 bg-white/10 border-white/30 text-white hover:bg-white/20"
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
        ) : (
          <div className="flex items-center justify-center gap-6">
            {/* Upload button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-4 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
              title="Subir foto"
            >
              <Upload className="w-6 h-6" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.heic,.heif"
              onChange={handleFileUpload}
              className="hidden"
            />

            {/* Capture button */}
            <button
              onClick={capturePhoto}
              className="w-20 h-20 rounded-full border-4 border-white bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <div className="w-16 h-16 rounded-full bg-white" />
            </button>

            {/* Switch camera */}
            <button
              onClick={switchCamera}
              className="p-4 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
              title="Cambiar cámara"
            >
              <SwitchCamera className="w-6 h-6" />
            </button>
          </div>
        )}
      </div>
      
      {/* Hint text */}
      {!capturedImage && (
        <p className="absolute bottom-28 left-0 right-0 text-center text-white/60 text-xs px-4">
          Toma una foto o súbelas desde tu galería (soporta HEIC)
        </p>
      )}
    </div>
  );
}
