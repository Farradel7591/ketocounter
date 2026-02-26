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
  CheckCircle,
  Pencil,
  X,
  TrendingUp,
  Calendar
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
}

interface DayStats {
  date: string;
  totalCalories: number;
  totalNetCarbs: number;
  totalProtein: number;
  totalFat: number;
  totalFiber: number;
  mealCount: number;
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
    return { dailyCalories: 2000, dailyCarbs: 20, dailyProtein: 100, dailyFat: 150, dailyFiber: 30 };
  }
  const data = localStorage.getItem(SETTINGS_KEY);
  return data ? JSON.parse(data) : { dailyCalories: 2000, dailyCarbs: 20, dailyProtein: 100, dailyFat: 150, dailyFiber: 30 };
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

// Get stats for the last N days
function getWeekStats(): DayStats[] {
  if (typeof window === 'undefined') return [];
  
  const stats: DayStats[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const key = `${MEALS_KEY}_${dateStr}`;
    const data = localStorage.getItem(key);
    const meals: Meal[] = data ? JSON.parse(data) : [];
    
    stats.push({
      date: dateStr,
      totalCalories: meals.reduce((sum, m) => sum + m.calories, 0),
      totalNetCarbs: meals.reduce((sum, m) => sum + m.netCarbs, 0),
      totalProtein: meals.reduce((sum, m) => sum + m.protein, 0),
      totalFat: meals.reduce((sum, m) => sum + m.fat, 0),
      totalFiber: meals.reduce((sum, m) => sum + m.fiber, 0),
      mealCount: meals.length
    });
  }
  return stats;
}

export default function KetoCounterApp() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [settings, setSettings] = useState<UserSettings>({ dailyCalories: 2000, dailyCarbs: 20, dailyProtein: 100, dailyFat: 150, dailyFiber: 30 });
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [darkMode, setDarkMode] = useState(false);
  
  const [showCamera, setShowCamera] = useState(false);
  const [showVoice, setShowVoice] = useState(false);
  const [showText, setShowText] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [showWeeklyStats, setShowWeeklyStats] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [showApiKeySetup, setShowApiKeySetup] = useState(false);
  
  // Edit state
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

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
        // Ensure netCarbs = carbs - fiber
        result.data.foods = result.data.foods.map((f: any) => ({
          ...f,
          netCarbs: Math.max(0, (f.carbs || 0) - (f.fiber || 0))
        }));
        setAnalysisResult(result.data);
        setShowResult(true);
        setShowCamera(false);
      } else {
        alert(result.error || 'No se detectaron alimentos.');
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
          analyzeResult.data.foods = analyzeResult.data.foods.map((f: any) => ({
            ...f,
            netCarbs: Math.max(0, (f.carbs || 0) - (f.fiber || 0))
          }));
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
        result.data.foods = result.data.foods.map((f: any) => ({
          ...f,
          netCarbs: Math.max(0, (f.carbs || 0) - (f.fiber || 0))
        }));
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
      netCarbs: Math.max(0, (food.carbs || 0) - (food.fiber || 0)),
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

  const handleEditMeal = (meal: Meal) => {
    setEditingMeal({ ...meal });
    setShowEditModal(true);
  };

  const handleSaveEdit = () => {
    if (editingMeal) {
      // Recalculate netCarbs
      const updatedMeal = {
        ...editingMeal,
        netCarbs: Math.max(0, editingMeal.carbs - editingMeal.fiber)
      };
      setMeals(prev => prev.map(m => m.id === updatedMeal.id ? updatedMeal : m));
      setEditingMeal(null);
      setShowEditModal(false);
    }
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
            <Button variant="ghost" size="icon" onClick={() => setShowWeeklyStats(true)} title="Progreso semanal">
              <TrendingUp className="w-5 h-5" />
            </Button>
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
        {/* Macros - Now with Fiber */}
        <Card className="shadow-lg w-full box-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-around flex-wrap gap-2">
              <MacroRing value={totals.netCarbs} max={settings.dailyCarbs} label="Net Carbs" unit="g" color="#10b981" size={70} />
              <MacroRing value={totals.calories} max={settings.dailyCalories} label="Cal" unit="kcal" color="#f59e0b" size={65} />
              <MacroRing value={totals.protein} max={settings.dailyProtein} label="Prot" unit="g" color="#3b82f6" size={65} />
              <MacroRing value={totals.fat} max={settings.dailyFat} label="Grasa" unit="g" color="#8b5cf6" size={65} />
              <MacroRing value={totals.fiber} max={settings.dailyFiber} label="Fibra" unit="g" color="#14b8a6" size={65} />
            </div>
            <div className={cn(
              "mt-3 p-2 rounded-lg text-center text-sm",
              totals.netCarbs <= settings.dailyCarbs ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
            )}>
              {totals.netCarbs <= settings.dailyCarbs ? `✓ Cetosis: ${totals.netCarbs.toFixed(1)}g / ${settings.dailyCarbs}g` : `⚠ Excediste: ${totals.netCarbs.toFixed(1)}g`}
            </div>
          </CardContent>
        </Card>

        {/* Stats Row */}
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
              <Utensils className="w-4 h-4" /> Comidas de {formatDate(currentDate)}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 max-h-48 overflow-y-auto">
            {meals.length === 0 ? (
              <p className="text-center text-muted-foreground py-4 text-sm">Sin comidas registradas</p>
            ) : (
              <div className="space-y-2">
                {meals.map(meal => (
                  <div key={meal.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                    <div className="flex-1 min-w-0" onClick={() => handleEditMeal(meal)}>
                      <p className="font-medium text-sm truncate">{meal.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {meal.calories.toFixed(0)} kcal | {meal.netCarbs.toFixed(1)}g net | {meal.fiber.toFixed(1)}g fibra
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEditMeal(meal)}>
                        <Pencil className="w-4 h-4 text-blue-500" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteMeal(meal.id)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
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
      
      {/* Edit Meal Modal */}
      {showEditModal && editingMeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-sm max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                Editar Comida
                <Button variant="ghost" size="icon" onClick={() => setShowEditModal(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-xs">Nombre</label>
                <input 
                  type="text" 
                  className="w-full border rounded p-2 mt-1 bg-background text-sm"
                  value={editingMeal.name}
                  onChange={e => setEditingMeal(prev => prev ? { ...prev, name: e.target.value } : null)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs">Calorías</label>
                  <input 
                    type="number" 
                    className="w-full border rounded p-2 mt-1 bg-background text-sm"
                    value={editingMeal.calories}
                    onChange={e => setEditingMeal(prev => prev ? { ...prev, calories: Number(e.target.value) } : null)}
                  />
                </div>
                <div>
                  <label className="text-xs">Carbohidratos (g)</label>
                  <input 
                    type="number" 
                    step="0.1"
                    className="w-full border rounded p-2 mt-1 bg-background text-sm"
                    value={editingMeal.carbs}
                    onChange={e => setEditingMeal(prev => prev ? { ...prev, carbs: Number(e.target.value) } : null)}
                  />
                </div>
                <div>
                  <label className="text-xs">Proteína (g)</label>
                  <input 
                    type="number" 
                    step="0.1"
                    className="w-full border rounded p-2 mt-1 bg-background text-sm"
                    value={editingMeal.protein}
                    onChange={e => setEditingMeal(prev => prev ? { ...prev, protein: Number(e.target.value) } : null)}
                  />
                </div>
                <div>
                  <label className="text-xs">Grasa (g)</label>
                  <input 
                    type="number" 
                    step="0.1"
                    className="w-full border rounded p-2 mt-1 bg-background text-sm"
                    value={editingMeal.fat}
                    onChange={e => setEditingMeal(prev => prev ? { ...prev, fat: Number(e.target.value) } : null)}
                  />
                </div>
                <div>
                  <label className="text-xs">Fibra (g)</label>
                  <input 
                    type="number" 
                    step="0.1"
                    className="w-full border rounded p-2 mt-1 bg-background text-sm"
                    value={editingMeal.fiber}
                    onChange={e => setEditingMeal(prev => prev ? { ...prev, fiber: Number(e.target.value) } : null)}
                  />
                </div>
                <div>
                  <label className="text-xs">Net Carbs (g)</label>
                  <div className="w-full border rounded p-2 mt-1 bg-muted text-sm">
                    {Math.max(0, editingMeal.carbs - editingMeal.fiber).toFixed(1)}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button className="flex-1" onClick={handleSaveEdit}>Guardar</Button>
                <Button variant="outline" className="flex-1" onClick={() => setShowEditModal(false)}>Cancelar</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Weekly Stats Modal */}
      {showWeeklyStats && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col">
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              Progreso Semanal
            </h2>
            <Button variant="ghost" size="icon" onClick={() => setShowWeeklyStats(false)}>
              <X className="w-5 h-5" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <WeeklyStats settings={settings} />
          </div>
        </div>
      )}
      
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
              <div>
                <label className="text-xs">Fibra diaria (g)</label>
                <input type="number" className="w-full border rounded p-2 mt-1 bg-background text-sm" value={settings.dailyFiber} onChange={e => setSettings(s => ({ ...s, dailyFiber: Number(e.target.value) }))} />
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

// Weekly Stats Component
function WeeklyStats({ settings }: { settings: UserSettings }) {
  const [stats, setStats] = useState<DayStats[]>([]);
  
  useEffect(() => {
    setStats(getWeekStats());
  }, []);
  
  const avgNetCarbs = stats.length > 0 
    ? (stats.reduce((sum, s) => sum + s.totalNetCarbs, 0) / stats.length).toFixed(1)
    : '0';
  
  const avgCalories = stats.length > 0 
    ? Math.round(stats.reduce((sum, s) => sum + s.totalCalories, 0) / stats.length)
    : 0;
  
  const ketoDays = stats.filter(s => s.totalNetCarbs <= settings.dailyCarbs && s.mealCount > 0).length;
  
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  
  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="p-3 text-center">
          <p className="text-2xl font-bold text-emerald-500">{avgNetCarbs}g</p>
          <p className="text-[10px] text-muted-foreground">Promedio Net Carbs</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-2xl font-bold text-orange-500">{avgCalories}</p>
          <p className="text-[10px] text-muted-foreground">Promedio Calorías</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-2xl font-bold text-blue-500">{ketoDays}/7</p>
          <p className="text-[10px] text-muted-foreground">Días en Cetosis</p>
        </Card>
      </div>
      
      {/* Bar Chart */}
      <Card className="p-4">
        <h3 className="text-sm font-medium mb-3">Net Carbs por Día</h3>
        <div className="flex items-end justify-between gap-1 h-32">
          {stats.map((day, index) => {
            const height = Math.min((day.totalNetCarbs / settings.dailyCarbs) * 100, 100);
            const dayDate = new Date(day.date);
            const isToday = day.date === new Date().toISOString().split('T')[0];
            const isKeto = day.totalNetCarbs <= settings.dailyCarbs;
            
            return (
              <div key={index} className="flex flex-col items-center flex-1">
                <div className="w-full flex flex-col items-center justify-end h-24">
                  {day.mealCount > 0 ? (
                    <div 
                      className={`w-full max-w-[30px] rounded-t transition-all ${isKeto ? 'bg-emerald-500' : 'bg-red-500'}`}
                      style={{ height: `${Math.max(height, 5)}%` }}
                    />
                  ) : (
                    <div className="w-full max-w-[30px] h-1 bg-muted rounded" />
                  )}
                </div>
                <p className={`text-[10px] mt-1 ${isToday ? 'font-bold text-emerald-500' : 'text-muted-foreground'}`}>
                  {dayNames[dayDate.getDay()]}
                </p>
                <p className="text-[9px] text-muted-foreground">
                  {day.totalNetCarbs.toFixed(0)}g
                </p>
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-center gap-4 mt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-emerald-500 rounded" />
            <span>En cetosis</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-500 rounded" />
            <span>Excedido</span>
          </div>
        </div>
      </Card>
      
      {/* Daily Details */}
      <Card className="p-4">
        <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Detalle por Día
        </h3>
        <div className="space-y-2">
          {stats.slice().reverse().map((day, index) => {
            const dayDate = new Date(day.date);
            const isToday = day.date === new Date().toISOString().split('T')[0];
            const isKeto = day.totalNetCarbs <= settings.dailyCarbs;
            
            return (
              <div 
                key={index} 
                className={`flex items-center justify-between p-2 rounded-lg ${isToday ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-muted/50'}`}
              >
                <div>
                  <p className={`text-sm font-medium ${isToday ? 'text-emerald-600' : ''}`}>
                    {dayNames[dayDate.getDay()]} {dayDate.getDate()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {day.mealCount} {day.mealCount === 1 ? 'comida' : 'comidas'}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${isKeto ? 'text-emerald-500' : 'text-red-500'}`}>
                    {day.totalNetCarbs.toFixed(1)}g net
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {day.totalCalories} kcal
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
