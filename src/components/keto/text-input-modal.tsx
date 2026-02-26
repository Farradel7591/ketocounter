'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { X, Loader2, Sparkles, Utensils } from 'lucide-react';

interface TextInputModalProps {
  onAnalyze: (text: string) => void;
  onClose: () => void;
  isProcessing: boolean;
}

export function TextInputModal({ onAnalyze, onClose, isProcessing }: TextInputModalProps) {
  const [text, setText] = useState('');

  const handleAnalyze = () => {
    if (text.trim()) {
      onAnalyze(text.trim());
    }
  };

  const suggestions = [
    '2 huevos fritos con tocino',
    'Ensalada César con pollo',
    'Salmón con espárragos',
    'Tostada con aguacate',
    'Pollo a la plancha con brócoli',
    'Omelette de queso y jamón'
  ];

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">Describir Comida</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 flex flex-col gap-4 overflow-y-auto">
        {/* Info */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
          <Sparkles className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>La IA analizará tu descripción y calculará los macros</span>
        </div>

        {/* Text input */}
        <Textarea
          placeholder="Ejemplo: Comí 2 huevos fritos con 3 tiras de tocino y medio aguacate..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="flex-1 text-base resize-none min-h-[150px] border-2 focus:border-emerald-500"
          autoFocus
        />

        {/* Quick suggestions */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Utensils className="w-3 h-3" />
            Sugerencias rápidas:
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => setText(prev => prev ? `${prev}, ${suggestion.toLowerCase()}` : suggestion)}
                className="px-3 py-1.5 text-xs rounded-full bg-muted hover:bg-emerald-100 hover:text-emerald-700 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-400 transition-colors border border-transparent hover:border-emerald-300 dark:hover:border-emerald-700"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t bg-muted/30 pb-safe">
        <Button
          size="lg"
          onClick={handleAnalyze}
          disabled={!text.trim() || isProcessing}
          className="w-full rounded-xl h-12"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Analizando...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Analizar Comida
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
