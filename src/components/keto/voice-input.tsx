'use client';

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  onClose: () => void;
  isProcessing: boolean;
}

export function VoiceInput({ onTranscript, onClose, isProcessing }: VoiceInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        chunksRef.current = [];
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setHasPermission(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      setHasPermission(false);
    }
  }, []);

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const sendAudio = async () => {
    if (!audioBlob) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      onTranscript(base64);
    };
    reader.readAsDataURL(audioBlob);
  };

  const resetRecording = () => {
    setAudioBlob(null);
    chunksRef.current = [];
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">Descripción por Voz</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
        {/* Recording indicator */}
        <div className={cn(
          "w-36 h-36 rounded-full flex items-center justify-center transition-all duration-300",
          isRecording 
            ? "bg-red-500/20 scale-110" 
            : audioBlob 
              ? "bg-emerald-500/20" 
              : "bg-muted"
        )}>
          {isRecording ? (
            <div className="relative">
              <Mic className="w-14 h-14 text-red-500" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />
            </div>
          ) : audioBlob ? (
            <Mic className="w-14 h-14 text-emerald-500" />
          ) : (
            <Mic className="w-14 h-14 text-muted-foreground" />
          )}
        </div>

        {/* Status text */}
        <div className="text-center">
          <p className="text-lg font-medium">
            {isRecording 
              ? 'Grabando...' 
              : audioBlob 
                ? '✓ Audio listo' 
                : 'Toca para grabar'
            }
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {isRecording 
              ? 'Toca el botón para detener' 
              : audioBlob 
                ? 'Puedes analizar o volver a grabar' 
                : 'Describe tu comida hablando'
            }
          </p>
        </div>

        {/* Recording pulse animation */}
        {isRecording && (
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse delay-75" />
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse delay-150" />
          </div>
        )}

        {/* Permission denied message */}
        {hasPermission === false && (
          <div className="text-center text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg max-w-sm">
            <p className="font-medium">Micrófono no disponible</p>
            <p className="text-sm mt-1">
              Por favor permite el acceso al micrófono en configuración, o usa la opción de escribir.
            </p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="p-6 border-t bg-muted/30 pb-safe">
        <div className="flex items-center justify-center gap-4">
          {audioBlob ? (
            <>
              <Button
                variant="outline"
                size="lg"
                onClick={resetRecording}
                disabled={isProcessing}
                className="rounded-full px-8"
              >
                Repetir
              </Button>
              <Button
                size="lg"
                onClick={sendAudio}
                disabled={isProcessing}
                className="rounded-full px-8 bg-emerald-600 hover:bg-emerald-700"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analizando...
                  </>
                ) : (
                  'Analizar'
                )}
              </Button>
            </>
          ) : (
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={cn(
                "w-24 h-24 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg",
                isRecording 
                  ? "bg-red-500 hover:bg-red-600 scale-105" 
                  : "bg-emerald-600 hover:bg-emerald-700"
              )}
            >
              {isRecording ? (
                <Square className="w-8 h-8 text-white fill-white" />
              ) : (
                <Mic className="w-10 h-10 text-white" />
              )}
            </button>
          )}
        </div>

        {/* Tips */}
        <p className="text-center text-xs text-muted-foreground mt-4 max-w-xs mx-auto">
          Ejemplo: "Comí un huevo frito con dos tiras de tocino y medio aguacate"
        </p>
      </div>
    </div>
  );
}
