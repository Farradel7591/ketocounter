'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Camera, 
  Mic, 
  Type, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  Utensils,
  Flame,
  Droplets,
  Wheat,
  Trash2,
  Moon,
  Sun,
  Loader2,
  Key,
  ExternalLink,
  CheckCircle
} from 'lucide-react';
import { MacroRing } from '@/components/keto/macro-ring';
import { CameraCapture } from '@/components/keto/camera-capture';
import { VoiceInput } from '@/components/keto/voice-input';
import { TextInputModal } from '@/components/keto/text-input-modal';
import { AnalysisResult } from '@/components/keto/analysis-result';
import { cn } from '@/lib/utils';

// Types
interface Meal {
  id: string;
  name: string;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  fiber: number;
  netCarbs: number;
  source: string;
  createdAt: string;
}

interface UserSettings {
  dailyCalories: number;
  dailyCarbs: number;
  dailyProtein: number;
  dailyFat: number;
  dailyFiber: number;
  groqApiKey?: string;
}

// LocalStorage keys
const MEALS_KEY = 'ketocounter_meals';
const SETTINGS_KEY = 'ketocounter_settings';
const API_KEY_KEY = 'ketocounter_groq_api_key';

function getStorageKey(date: Date): string {
  return `${MEALS_KEY}_${date.toISOString().split('T')[0]}`;
}

function loadMeals(date: Date): Meal[] {
  if (typeof window === 'undefined') return [];
  const key = getStorageKey(date);
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
}

function saveMeals(date: Date, meals: Meal[]): void {
  const key = getStorageKey(date);
  localStorage.setItem(key, JSON.stringify(meals));
}

function loadSettings(): UserSettings {
  if (typeof window === 'undefined') {
    return { dailyCalories: 2000, dailyCarbs: 20, dailyProtein: 100, dailyFat: 150, dailyFiber: 25 };
  }
  const data = localStorage.getItem(SETTINGS_KEY);
  return data ? JSON.parse(data) : { dailyCalories: 2000, dailyCarbs: 20, dailyProtein: 100, dailyFat: 150, dailyFiber: 25 };
}

function saveSettings(settings: UserSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function loadApiKey(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(API_KEY_KEY) || '';
}

function saveApiKey(key: string): void {
  localStorage.setItem(API_KEY_KEY, key);
}

export default function KetoCounterApp() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [settings, setSettings] = useState<UserSettings>({ dailyCalories: 2000, dailyCarbs: 20, dailyProtein: 100, dailyFat: 150, dailyFiber: 25 });
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [darkMode, setDarkMode] = useState(false);
  
  const [showCamera, setShowCamera] = useState(false);
  const [showVoice, setShowVoice] = useState(false);
  const [showText, setShowText] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [showApiKeySetup, setShowApiKeySetup] = useState(false);

  useEffect(() => {
    const loadedSettings = loadSettings();
    const loadedApiKey = loadApiKey();
    setMeals(loadMeals(currentDate));
    setSettings(loadedSettings);
    setApiKey(loadedApiKey);
    const isDark = localStorage.getItem('darkMode') === 'true';
    setDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!loading) {
      saveMeals(currentDate, meals);
    }
  }, [meals, currentDate, loading]);

  const totals = meals.reduce((acc, meal) => ({
    calories: acc.calories + meal.calories,
    carbs: acc.carbs + meal.carbs,
    protein: acc.protein + meal.protein,
    fat: acc.fat + meal.fat,
    fiber: acc.fiber + meal.fiber,
    netCarbs: acc.netCarbs + meal.netCarbs
  }), { calories: 0, carbs: 0, protein: 0, fat: 0, fiber: 0, netCarbs: 0 });

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    setCurrentDate(newDate);
    setMeals(loadMeals(newDate));
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    if (date.toDateString() === today.toDateString()) return 'Hoy';
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return 'Ayer';
    return date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('darkMode', String(newMode));
    if (newMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handlePhotoCapture = async (imageBase64: string) => {
    if (!apiKey) {
      setShowApiKeySetup(true);
      return;
    }
    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/analyze-photo', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Groq-API-Key': apiKey
        },
        body: JSON.stringify({ imageBase64 })
      });
      const result = await response.json();
      if (result.success && result.data?.foods?.length > 0) {
        setAnalysisResult(result.data);
        setShowResult(true);
        setShowCamera(false);
      } else {
        alert(result.error || 'No se detectaron alimentos. Intenta con texto.');
      }
    } catch (error) {
      alert('Error al analizar la imagen.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleVoiceTranscript = async (audioBase64: string) => {
    if (!apiKey) {
      setShowApiKeySetup(true);
      return;
    }
    setIsAnalyzing(true);
    try {
      const transcribeResponse = await fetch('/api/analyze-voice', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Groq-API-Key': apiKey
        },
        body: JSON.stringify({ audioBase64 })
      });
      const transcribeResult = await transcribeResponse.json();
      if (transcribeResult.success && transcribeResult.transcription) {
        const analyzeResponse = await fetch('/api/analyze-text', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-Groq-API-Key': apiKey
          },
          body: JSON.stringify({ description: transcribeResult.transcription })
        });
        const analyzeResult = await analyzeResponse.json();
        if (analyzeResult.success && analyzeResult.data?.foods?.length > 0) {
          setAnalysisResult(analyzeResult.data);
          setShowResult(true);
          setShowVoice(false);
        } else {
          alert(analyzeResult.error || 'No se pudo analizar.');
        }
      } else {
        alert(transcribeResult.error || 'No se pudo transcribir.');
      }
    } catch (error) {
      alert('Error al procesar.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleTextAnalyze = async (text: string) => {
    if (!apiKey) {
      setShowApiKeySetup(true);
      return;
    }
    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/analyze-text', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Groq-API-Key': apiKey
        },
        body: JSON.stringify({ description: text })
      });
      const result = await response.json();
      if (result.success && result.data?.foods?.length > 0) {
        setAnalysisResult(result.data);
        setShowResult(true);
        setShowText(false);
      } else {
        alert(result.error || 'No se pudo analizar.');
      }
    } catch (error) {
      alert('Error al analizar.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAddFood = (food: any) => {
    const newMeal: Meal = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      name: food.name,
      calories: food.calories || 0,
      carbs: food.carbs || 0,
      protein: food.protein || 0,
      fat: food.fat || 0,
      fiber: food.fiber || 0,
      netCarbs: food.netCarbs || 0,
      source: 'photo',
      createdAt: new Date().toISOString()
    };
    setMeals(prev => [...prev, newMeal]);
  };

  const handleAddAllFoods = (foods?: any[]) => {
    const toAdd = foods || analysisResult?.foods;
    if (!toAdd) return;
    toAdd.forEach(food => handleAddFood(food));
    setShowResult(false);
    setAnalysisResult(null);
  };

  const handleDeleteMeal = (id: string) => {
    setMeals(prev => prev.filter(m => m.id !== id));
  };

  const handleSaveSettings = (newSettings: UserSettings, newApiKey?: string) => {
    setSettings(newSettings);
    saveSettings(newSettings);
    if (newApiKey !== undefined) {
      setApiKey(newApiKey);
      saveApiKey(newApiKey);
    }
    setShowSettings(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b w-full">
        <div className="px-4 py-3 flex items-center justify-between w-full box-border">
          <h1 className="text-xl font-bold text-emerald-600">KetoCounter</h1>
          <div className="flex items-center gap-1">
            {!apiKey && (
              <Button variant="ghost" size="icon" onClick={() => setShowApiKeySetup(true)} className="text-amber-500">
                <Key className="w-5 h-5" />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={toggleDarkMode}>
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setShowSettings(true)}>
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </div>
        <div className="px-4 pb-3 flex items-center justify-center gap-4 w-full box-border">
          <Button variant="ghost" size="icon" onClick={() => navigateDate('prev')}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <span className="text-sm font-medium">{formatDate(currentDate)}</span>
          <Button variant="ghost" size="icon" onClick={() => navigateDate('next')} disabled={currentDate.toDateString() === new Date().toDateString()}>
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 overflow-y-auto p-4 w-full box-border">
        {/* Macros */}
        <Card className="shadow-lg w-full box-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-around">
              <MacroRing value={totals.netCarbs} max={settings.dailyCarbs} label="Net Carbs" unit="g" color="#10b981" size={80} />
              <MacroRing value={totals.calories} max={settings.dailyCalories} label="Cal" unit="kcal" color="#f59e0b" size={70} />
              <MacroRing value={totals.protein} max={settings.dailyProtein} label="Prot" unit="g" color="#3b82f6" size={70} />
              <MacroRing value={totals.fat} max={settings.dailyFat} label="Grasa" unit="g" color="#8b5cf6" size={70} />
            </div>
            <div className={cn(
              "mt-3 p-2 rounded-lg text-center text-sm",
              totals.netCarbs <= settings.dailyCarbs ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
            )}>
              {totals.netCarbs <= settings.dailyCarbs ? `✓ Cetosis: ${totals.netCarbs.toFixed(1)}g / ${settings.dailyCarbs}g` : `⚠ Excediste: ${totals.netCarbs.toFixed(1)}g`}
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 mt-3 w-full">
          <Card className="p-2 text-center"><Wheat className="w-4 h-4 mx-auto text-yellow-500" /><p className="text-base font-bold">{totals.carbs.toFixed(0)}g</p><p className="text-[10px] text-muted-foreground">Carbs</p></Card>
          <Card className="p-2 text-center"><Droplets className="w-4 h-4 mx-auto text-purple-500" /><p className="text-base font-bold">{totals.fat.toFixed(0)}g</p><p className="text-[10px] text-muted-foreground">Grasa</p></Card>
          <Card className="p-2 text-center"><Flame className="w-4 h-4 mx-auto text-orange-500" /><p className="text-base font-bold">{totals.fiber.toFixed(0)}g</p><p className="text-[10px] text-muted-foreground">Fibra</p></Card>
          <Card className="p-2 text-center"><Utensils className="w-4 h-4 mx-auto text-blue-500" /><p className="text-base font-bold">{meals.length}</p><p className="text-[10px] text-muted-foreground">Comidas</p></Card>
        </div>

        {/* Meals */}
        <Card className="mt-3 w-full box-border">
          <CardHeader className="pb-2 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <Utensils className="w-4 h-4" /> Comidas
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 max-h-48 overflow-y-auto">
            {meals.length === 0 ? (
              <p className="text-center text-muted-foreground py-4 text-sm">Sin comidas</p>
            ) : (
              <div className="space-y-2">
                {meals.map(meal => (
                  <div key={meal.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{meal.name}</p>
                      <p className="text-xs text-muted-foreground">{meal.calories.toFixed(0)} kcal | {meal.netCarbs.toFixed(1)}g net</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteMeal(meal.id)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="sticky bottom-0 bg-background border-t p-4 w-full box-border pb-safe">
        <div className="flex items-center justify-center gap-3 w-full">
          <Button variant="outline" className="flex-1 rounded-xl flex flex-col h-auto py-2" onClick={() => setShowCamera(true)}>
            <Camera className="w-5 h-5" /><span className="text-xs">Foto</span>
          </Button>
          <Button variant="outline" className="flex-1 rounded-xl flex flex-col h-auto py-2" onClick={() => setShowVoice(true)}>
            <Mic className="w-5 h-5" /><span className="text-xs">Voz</span>
          </Button>
          <Button className="flex-1 rounded-xl flex flex-col h-auto py-2" onClick={() => setShowText(true)}>
            <Type className="w-5 h-5" /><span className="text-xs">Escribir</span>
          </Button>
        </div>
      </footer>

      {/* Modals */}
      {showCamera && <CameraCapture onCapture={handlePhotoCapture} onClose={() => setShowCamera(false)} isAnalyzing={isAnalyzing} />}
      {showVoice && <VoiceInput onTranscript={handleVoiceTranscript} onClose={() => setShowVoice(false)} isProcessing={isAnalyzing} />}
      {showText && <TextInputModal onAnalyze={handleTextAnalyze} onClose={() => setShowText(false)} isProcessing={isAnalyzing} />}
      
      {/* API Key Setup Modal */}
      {showApiKeySetup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Key className="w-5 h-5 text-emerald-500" />
                Configurar API Key
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Necesitas una API key gratuita de Groq para analizar comidas.
              </p>
              <Button 
                variant="outline" 
                className="w-full flex items-center gap-2"
                onClick={() => window.open('https://console.groq.com/keys', '_blank')}
              >
                <ExternalLink className="w-4 h-4" />
                Obtener API Key gratis
              </Button>
              <div>
                <label className="text-xs">Tu API Key (gsk_...)</label>
                <input 
                  type="password" 
                  className="w-full border rounded p-2 mt-1 bg-background text-sm"
                  placeholder="gsk_..."
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button 
                  className="flex-1" 
                  onClick={() => {
                    saveApiKey(apiKey);
                    setShowApiKeySetup(false);
                  }}
                  disabled={!apiKey.startsWith('gsk_')}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Guardar
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setShowApiKeySetup(false)}>
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-sm max-h-[90vh] overflow-y-auto">
            <CardHeader><CardTitle className="text-base">Configuración</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-xs font-medium">API Key de Groq</label>
                <input 
                  type="password" 
                  className="w-full border rounded p-2 mt-1 bg-background text-sm"
                  placeholder="gsk_..."
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Consigue tu key gratis en console.groq.com
                </p>
              </div>
              <hr className="my-2" />
              <div>
                <label className="text-xs">Calorías diarias</label>
                <input type="number" className="w-full border rounded p-2 mt-1 bg-background text-sm" value={settings.dailyCalories} onChange={e => setSettings(s => ({ ...s, dailyCalories: Number(e.target.value) }))} />
              </div>
              <div>
                <label className="text-xs">Carbs netos máx (g)</label>
                <input type="number" className="w-full border rounded p-2 mt-1 bg-background text-sm" value={settings.dailyCarbs} onChange={e => setSettings(s => ({ ...s, dailyCarbs: Number(e.target.value) }))} />
              </div>
              <div>
                <label className="text-xs">Proteína (g)</label>
                <input type="number" className="w-full border rounded p-2 mt-1 bg-background text-sm" value={settings.dailyProtein} onChange={e => setSettings(s => ({ ...s, dailyProtein: Number(e.target.value) }))} />
              </div>
              <div>
                <label className="text-xs">Grasa (g)</label>
                <input type="number" className="w-full border rounded p-2 mt-1 bg-background text-sm" value={settings.dailyFat} onChange={e => setSettings(s => ({ ...s, dailyFat: Number(e.target.value) }))} />
              </div>
              <div className="flex gap-2 pt-2">
                <Button className="flex-1" onClick={() => handleSaveSettings(settings, apiKey)}>Guardar</Button>
                <Button variant="outline" className="flex-1" onClick={() => setShowSettings(false)}>Cancelar</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {showResult && analysisResult && (
        <AnalysisResult
          data={analysisResult}
          onAddFood={handleAddFood}
          onAddAll={handleAddAllFoods}
          onClose={() => { setShowResult(false); setAnalysisResult(null); }}
        />
      )}
    </div>
  );
}
