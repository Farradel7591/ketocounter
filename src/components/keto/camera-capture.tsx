'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, X, SwitchCamera, Loader2, Upload, Info } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (imageBase64: string) => void;
  onClose: () => void;
  isAnalyzing: boolean;
}

function isHeicFile(file: File): boolean {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return name.endsWith('.heic') || name.endsWith('.heif') || type === 'image/heic' || type === 'image/heif';
}

async function convertHeicToJpeg(file: File): Promise<Blob> {
  const mod = await import('heic2any') as any;
  const convert = mod.default || mod;
  return await convert({ blob: file, toType: 'image/jpeg', quality: 0.7 });
}

async function processImage(file: File): Promise<string> {
  return new Promise(async (resolve, reject) => {
    let blob: Blob = file;
    if (isHeicFile(file)) {
      try { blob = await convertHeicToJpeg(file); } catch { reject(new Error('HEIC_ERROR')); return; }
    }
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const max = 640;
      let w = img.width, h = img.height;
      if (w > h && w > max) { h = Math.round(h * max / w); w = max; }
      else if (h > max) { w = Math.round(w * max / h); h = max; }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('CANVAS_ERROR')); return; }
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('LOAD_ERROR')); };
    img.src = url;
  });
}

export function CameraCapture({ onCapture, onClose, isAnalyzing }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [captured, setCaptured] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    let active = true;
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        if (!active) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setCameraReady(true);
      } catch (e) { if (active) setCameraReady(false); }
    }
    startCamera();
    return () => { active = false; streamRef.current?.getTracks().forEach(t => t.stop()); };
  }, []);

  const takePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current, canvas = canvasRef.current;
    let w = video.videoWidth, h = video.videoHeight;
    const max = 640;
    if (w > h && w > max) { h = Math.round(h * max / w); w = max; }
    else if (h > max) { w = Math.round(w * max / h); h = max; }
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (ctx) { ctx.drawImage(video, 0, 0, w, h); setCaptured(canvas.toDataURL('image/jpeg', 0.7)); }
  }, []);

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProcessing(true);
    try { const result = await processImage(file); setCaptured(result); }
    catch { alert('Error procesando imagen. Intenta con la cámara.'); }
    finally { setProcessing(false); if (fileRef.current) fileRef.current.value = ''; }
  }, []);

  const confirm = useCallback(() => { if (captured) onCapture(captured); }, [captured, onCapture]);
  const retake = useCallback(() => { setCaptured(null); }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <button onClick={onClose} className="absolute top-4 right-4 z-30 p-3 rounded-full bg-black/50 text-white"><X className="w-6 h-6" /></button>
      <div className="flex-1 relative">
        {captured ? <img src={captured} alt="Foto" className="w-full h-full object-contain" /> : <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />}
        {!cameraReady && !captured && <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-white" /></div>}
      </div>
      <canvas ref={canvasRef} className="hidden" />
      <div className="p-4 bg-gradient-to-t from-black/90 to-transparent">
        {captured ? (
          <div className="flex justify-center gap-4">
            <Button onClick={retake} variant="outline" className="rounded-full px-6 bg-white/10 border-white/30 text-white" disabled={isAnalyzing}>Cambiar</Button>
            <Button onClick={confirm} className="rounded-full px-6 bg-emerald-600 hover:bg-emerald-700" disabled={isAnalyzing}>{isAnalyzing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analizando...</> : 'Analizar'}</Button>
          </div>
        ) : (
          <div className="flex justify-center items-center gap-6">
            <button onClick={() => fileRef.current?.click()} className="flex flex-col items-center text-white"><div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mb-1"><Upload className="w-6 h-6" /></div><span className="text-xs">Subir</span></button>
            <input ref={fileRef} type="file" accept="image/*,.heic,.heif" onChange={handleFile} className="hidden" />
            <button onClick={takePhoto} disabled={!cameraReady} className="flex flex-col items-center text-white disabled:opacity-50"><div className="w-20 h-20 rounded-full border-4 border-white bg-white/20 flex items-center justify-center"><div className="w-14 h-14 rounded-full bg-white" /></div><span className="text-xs mt-1">Foto</span></button>
            <button onClick={() => { if (videoRef.current && streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } }).then(s => { streamRef.current = s; if (videoRef.current) videoRef.current.srcObject = s; }); }}} disabled={!cameraReady} className="flex flex-col items-center text-white disabled:opacity-50"><div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mb-1"><SwitchCamera className="w-6 h-6" /></div><span className="text-xs">Girar</span></button>
          </div>
        )}
        {processing && <div className="absolute inset-0 flex items-center justify-center bg-black/50"><Loader2 className="w-8 h-8 animate-spin text-white" /></div>}
      </div>
    </div>
  );
}
