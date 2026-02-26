'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, X, SwitchCamera, Loader2, Upload, Image as ImageIcon, AlertCircle, CheckCircle, CameraOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CameraCaptureProps {
  onCapture: (imageBase64: string) => void;
  onClose: () => void;
  isAnalyzing: boolean;
}

// Check if file is HEIC/HEIF
function isHeicFile(file: File): boolean {
  const fileName = file.name.toLowerCase();
  const mimeType = file.type.toLowerCase();
  return (
    fileName.endsWith('.heic') || 
    fileName.endsWith('.heif') ||
    mimeType === 'image/heic' ||
    mimeType === 'image/heif' ||
    mimeType === 'image/heic-sequence' ||
    (mimeType === '' && (fileName.endsWith('.heic') || fileName.endsWith('.heif')))
  );
}

// Convert HEIC to JPEG using heic2any
async function convertHeicToJpeg(file: File): Promise<Blob> {
  try {
    const heic2anyModule = await import('heic2any');
    const heic2any = heic2anyModule.default || heic2anyModule;
    
    const result = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.6,
      multiple: false
    });
    
    return result as Blob;
  } catch (error: any) {
    console.error('HEIC conversion failed:', error);
    throw new Error('HEIC_CONVERSION_FAILED');
  }
}

// Process and compress image
async function processImage(file: File): Promise<string> {
  return new Promise(async (resolve, reject) => {
    const isHeic = isHeicFile(file);
    console.log('Processing file:', { name: file.name, type: file.type, sizeMB: (file.size / 1024 / 1024).toFixed(2), isHeic });
    
    // For HEIC files, attempt conversion
    if (isHeic) {
      try {
        console.log('Attempting HEIC conversion...');
        const converted = await convertHeicToJpeg(file);
        console.log('HEIC converted successfully, size:', (converted.size / 1024).toFixed(0), 'KB');
        // Continue with converted blob
        processBlob(converted, resolve, reject);
      } catch (error: any) {
        console.error('HEIC conversion failed');
        reject(new Error('HEIC_NOT_SUPPORTED'));
        return;
      }
    } else {
      // Process non-HEIC directly
      processBlob(file, resolve, reject);
    }
  });
}

// Helper to process blob into compressed image
function processBlob(blob: Blob, resolve: (value: string) => void, reject: (reason: any) => void) {
  const img = new Image();
  const url = URL.createObjectURL(blob);
  
  img.onload = () => {
    URL.revokeObjectURL(url);
    
    if (img.width === 0 || img.height === 0) {
      reject(new Error('INVALID_IMAGE'));
      return;
    }
    
    // Aggressive resize for large images
    const MAX_SIZE = 800;
    const MAX_FILE_KB = 180;
    
    let width = img.width;
    let height = img.height;
    const pixels = width * height;
    
    // Calculate scale - extra compression for large images (48MP)
    let scale = Math.min(MAX_SIZE / width, MAX_SIZE / height, 1);
    if (pixels > 5000000) scale = Math.min(scale, 0.4);
    
    width = Math.round(width * scale);
    height = Math.round(height * scale);
    
    console.log(`Image: ${img.width}x${img.height} -> ${width}x${height}`);
    
    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('CANVAS_ERROR'));
      return;
    }
    
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, width, height);
    
    // Compress with quality adjustment
    let quality = 0.6;
    let dataUrl = canvas.toDataURL('image/jpeg', quality);
    let sizeKB = Math.round((dataUrl.length * 3) / 4 / 1024);
    
    while (sizeKB > MAX_FILE_KB && quality > 0.15) {
      quality -= 0.1;
      dataUrl = canvas.toDataURL('image/jpeg', quality);
      sizeKB = Math.round((dataUrl.length * 3) / 4 / 1024);
    }
    
    console.log(`Final: ${width}x${height}, ${sizeKB}KB, quality=${quality.toFixed(1)}`);
    resolve(dataUrl);
  };
  
  img.onerror = () => {
    URL.revokeObjectURL(url);
    reject(new Error('LOAD_FAILED'));
  };
  
  img.src = url;
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
  const [showHeicError, setShowHeicError] = useState(false);

  useEffect(() => {
    let mounted = true;
    
    async function initCamera() {
      try {
        setIsLoading(true);
        streamRef.current?.getTracks().forEach(t => t.stop());
        
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        
        if (!mounted) return;
        
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setHasPermission(true);
        setIsLoading(false);
      } catch {
        if (mounted) { setHasPermission(false); setIsLoading(false); }
      }
    }
    
    initCamera();
    
    return () => {
      mounted = false;
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [facingMode]);

  const switchCamera = useCallback(() => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
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
      setCapturedImage(canvas.toDataURL('image/jpeg', 0.6));
    }
  }, []);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setErrorMsg(null);
    setShowHeicError(false);
    setIsProcessingImage(true);
    
    try {
      const processed = await processImage(file);
      setCapturedImage(processed);
    } catch (error: any) {
      console.error('Processing error:', error.message);
      if (error.message === 'HEIC_NOT_SUPPORTED') {
        setShowHeicError(true);
      } else {
        setErrorMsg('No pude procesar la imagen. Intenta con otra foto.');
      }
    } finally {
      setIsProcessingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, []);

  const confirmCapture = useCallback(() => {
    if (capturedImage) onCapture(capturedImage);
  }, [capturedImage, onCapture]);

  const retake = useCallback(() => {
    setCapturedImage(null);
    setErrorMsg(null);
    setShowHeicError(false);
  }, []);

  // HEIC Error Modal - Shows when HEIC can't be converted
  if (showHeicError && !capturedImage) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center p-6">
        <div className="bg-card rounded-2xl p-6 max-w-sm w-full text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8 text-amber-500" />
          </div>
          
          <h3 className="text-lg font-bold">Formato HEIC</h3>
          
          <p className="text-sm text-muted-foreground">
            Tu iPhone guarda fotos en formato HEIC que no es compatible con navegadores web.
          </p>
          
          <div className="bg-muted/50 rounded-xl p-4 text-left space-y-3">
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 text-white text-xs font-bold">1</div>
              <div>
                <p className="text-sm font-medium">Usa la cámara de la app</p>
                <p className="text-xs text-muted-foreground">El botón blanco grande captura directamente en JPEG</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center shrink-0 text-white text-xs font-bold">2</div>
              <div>
                <p className="text-sm font-medium">Cambia tu iPhone</p>
                <p className="text-xs text-muted-foreground">Ajustes → Cámara → Formatos → Compatible</p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col gap-2 pt-2">
            <Button onClick={retake} className="w-full gap-2">
              <Camera className="w-4 h-4" />
              Usar Cámara
            </Button>
            <Button variant="outline" onClick={onClose} className="w-full">
              Cerrar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // No permission view
  if (hasPermission === false) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center p-6">
        <div className="text-white text-center space-y-4 max-w-sm">
          <CameraOff className="w-16 h-16 mx-auto opacity-50" />
          <p className="text-lg font-medium">Sin acceso a cámara</p>
          <p className="text-sm opacity-70">Sube una foto desde tu galería</p>
          
          {errorMsg && (
            <div className="bg-red-500/20 text-red-200 p-4 rounded-xl text-sm">
              {errorMsg}
            </div>
          )}
          
          <div className="flex flex-col gap-3 mt-6">
            <Button onClick={() => fileInputRef.current?.click()} className="w-full gap-2 rounded-xl" disabled={isProcessingImage}>
              {isProcessingImage ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Procesando...</>
              ) : (
                <><ImageIcon className="w-4 h-4" /> Subir Foto</>
              )}
            </Button>
            <Button variant="outline" onClick={onClose} className="w-full text-white border-white/30 rounded-xl">
              Cerrar
            </Button>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*,.heic,.heif" onChange={handleFileUpload} className="hidden" />
        </div>
        
        {capturedImage && (
          <div className="fixed inset-0 bg-black flex flex-col">
            <img src={capturedImage} alt="Preview" className="flex-1 object-contain" />
            <div className="p-4 bg-black/80 pb-safe">
              <div className="flex justify-center gap-4">
                <Button variant="outline" size="lg" onClick={retake} className="rounded-full px-6 text-white border-white/30" disabled={isAnalyzing}>Cambiar</Button>
                <Button size="lg" onClick={confirmCapture} className="rounded-full px-6 bg-emerald-600 hover:bg-emerald-700" disabled={isAnalyzing}>
                  {isAnalyzing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analizando...</> : 'Analizar'}
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
      {(isLoading || isProcessingImage) && !capturedImage && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
          <div className="text-white text-center p-6">
            <Loader2 className="w-10 h-10 animate-spin mx-auto mb-3" />
            <p className="text-base">{isProcessingImage ? 'Procesando imagen...' : 'Iniciando cámara...'}</p>
          </div>
        </div>
      )}
      
      {errorMsg && !capturedImage && (
        <div className="absolute top-16 left-4 right-4 bg-red-500/90 text-white p-4 rounded-xl text-sm z-20 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="absolute right-3 font-bold text-lg">×</button>
        </div>
      )}
      
      <div className="relative flex-1">
        {capturedImage ? (
          <img src={capturedImage} alt="Captured" className="w-full h-full object-contain" />
        ) : (
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      <button onClick={onClose} className="absolute top-4 right-4 p-3 rounded-full bg-black/50 text-white z-20">
        <X className="w-6 h-6" />
      </button>

      <div className={cn("p-4 bg-gradient-to-t from-black/80 to-transparent", capturedImage && "pb-safe")}>
        {capturedImage ? (
          <div className="flex justify-center gap-4">
            <Button variant="outline" size="lg" onClick={retake} className="rounded-full px-6 bg-white/10 border-white/30 text-white" disabled={isAnalyzing}>Cambiar</Button>
            <Button size="lg" onClick={confirmCapture} className="rounded-full px-6 bg-emerald-600 hover:bg-emerald-700" disabled={isAnalyzing}>
              {isAnalyzing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analizando...</> : 'Analizar'}
            </Button>
          </div>
        ) : (
          <div className="flex justify-center gap-4">
            <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-1 p-3 rounded-xl bg-white/20 text-white">
              <Upload className="w-6 h-6" />
              <span className="text-xs">Subir</span>
            </button>
            <input ref={fileInputRef} type="file" accept="image/*,.heic,.heif" onChange={handleFileUpload} className="hidden" />
            <button onClick={capturePhoto} className="w-16 h-16 rounded-full border-4 border-white bg-white/20 flex items-center justify-center active:scale-95 transition-transform">
              <div className="w-12 h-12 rounded-full bg-white" />
            </button>
            <button onClick={switchCamera} className="flex flex-col items-center gap-1 p-3 rounded-xl bg-white/20 text-white">
              <SwitchCamera className="w-6 h-6" />
              <span className="text-xs">Girar</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
