'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, XCircle, Plus, X, Flame, Wheat, Droplets, Leaf } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Food {
  name: string;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  fiber: number;
  netCarbs: number;
  servingSize: number;
  unit: string;
}

interface AnalysisResultProps {
  data: {
    foods: Food[];
    totalNutrition: {
      calories: number;
      carbs: number;
      protein: number;
      fat: number;
      fiber: number;
      netCarbs: number;
    };
  };
  onAddFood: (food: Food) => void;
  onAddAll: () => void;
  onClose: () => void;
}

export function AnalysisResult({ data, onAddFood, onAddAll, onClose }: AnalysisResultProps) {
  const { foods, totalNutrition } = data;

  const getKetoStatus = (netCarbs: number) => {
    if (netCarbs <= 5) return { icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10', label: 'Keto' };
    if (netCarbs <= 10) return { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'Moderado' };
    return { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10', label: 'Alto' };
  };

  const isKetoFriendly = totalNutrition.netCarbs <= 20;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-background sticky top-0 z-10">
        <h2 className="text-lg font-bold">Análisis</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4 pb-28">
        {/* Keto Status Banner */}
        <div className={cn(
          "rounded-xl p-4 mb-4 flex items-center gap-3",
          isKetoFriendly ? "bg-emerald-500/10" : "bg-red-500/10"
        )}>
          {isKetoFriendly ? (
            <>
              <CheckCircle className="w-8 h-8 text-emerald-500 shrink-0" />
              <div>
                <p className="font-semibold text-emerald-700 dark:text-emerald-400">¡Keto Friendly!</p>
                <p className="text-sm text-emerald-600 dark:text-emerald-500">
                  {totalNutrition.netCarbs.toFixed(1)}g net carbs - Apto para cetosis
                </p>
              </div>
            </>
          ) : (
            <>
              <AlertTriangle className="w-8 h-8 text-red-500 shrink-0" />
              <div>
                <p className="font-semibold text-red-700 dark:text-red-400">Alto en Carbohidratos</p>
                <p className="text-sm text-red-600 dark:text-red-500">
                  {totalNutrition.netCarbs.toFixed(1)}g net carbs - Excede el límite keto
                </p>
              </div>
            </>
          )}
        </div>

        {/* Total Nutrition Card - Now with Fiber */}
        <Card className="mb-4 shadow-sm">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Estimado</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="grid grid-cols-5 gap-1 text-center">
              <div className="space-y-1">
                <div className="w-9 h-9 rounded-full bg-orange-500/10 flex items-center justify-center mx-auto">
                  <Flame className="w-4 h-4 text-orange-500" />
                </div>
                <p className="text-lg font-bold">{totalNutrition.calories.toFixed(0)}</p>
                <p className="text-[9px] text-muted-foreground">kcal</p>
              </div>
              <div className="space-y-1">
                <div className="w-9 h-9 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
                  <Wheat className="w-4 h-4 text-emerald-500" />
                </div>
                <p className={cn(
                  "text-lg font-bold",
                  totalNutrition.netCarbs > 20 ? "text-red-500" : "text-emerald-600"
                )}>
                  {totalNutrition.netCarbs.toFixed(1)}g
                </p>
                <p className="text-[9px] text-muted-foreground">net carbs</p>
              </div>
              <div className="space-y-1">
                <div className="w-9 h-9 rounded-full bg-teal-500/10 flex items-center justify-center mx-auto">
                  <Leaf className="w-4 h-4 text-teal-500" />
                </div>
                <p className="text-lg font-bold text-teal-600">{totalNutrition.fiber.toFixed(1)}g</p>
                <p className="text-[9px] text-muted-foreground">fibra</p>
              </div>
              <div className="space-y-1">
                <div className="w-9 h-9 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto">
                  <Droplets className="w-4 h-4 text-blue-500" />
                </div>
                <p className="text-lg font-bold">{totalNutrition.protein.toFixed(0)}g</p>
                <p className="text-[9px] text-muted-foreground">proteína</p>
              </div>
              <div className="space-y-1">
                <div className="w-9 h-9 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto">
                  <Droplets className="w-4 h-4 text-purple-500" />
                </div>
                <p className="text-lg font-bold">{totalNutrition.fat.toFixed(0)}g</p>
                <p className="text-[9px] text-muted-foreground">grasa</p>
              </div>
            </div>
            <div className="mt-3 p-2 bg-muted/50 rounded-lg text-center text-xs text-muted-foreground">
              Net Carbs = Carbohidratos ({(totalNutrition.netCarbs + totalNutrition.fiber).toFixed(1)}g) - Fibra ({totalNutrition.fiber.toFixed(1)}g)
            </div>
          </CardContent>
        </Card>

        {/* Foods List */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground px-1">
            Alimentos detectados ({foods.length})
          </h3>
          {foods.map((food, index) => {
            const status = getKetoStatus(food.netCarbs);
            const StatusIcon = status.icon;
            
            return (
              <Card key={index} className="overflow-hidden shadow-sm">
                <CardContent className="p-0">
                  <div className="flex items-start gap-3 p-4">
                    <div className={cn("mt-0.5 p-1.5 rounded-full", status.bg)}>
                      <StatusIcon className={cn("w-4 h-4", status.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium truncate">{food.name}</h3>
                          {food.servingSize > 0 && (
                            <p className="text-xs text-muted-foreground">
                              {food.servingSize}{food.unit}
                            </p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => onAddFood(food)}
                          className="shrink-0 h-8"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Agregar
                        </Button>
                      </div>

                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <Badge variant="secondary" className="text-[10px] px-2">
                          {food.calories.toFixed(0)} kcal
                        </Badge>
                        <Badge variant="secondary" className="text-[10px] px-2">
                          {food.netCarbs.toFixed(1)}g net
                        </Badge>
                        <Badge variant="secondary" className="text-[10px] px-2 bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400">
                          {food.fiber.toFixed(1)}g fibra
                        </Badge>
                        <Badge variant="secondary" className="text-[10px] px-2">
                          P: {food.protein.toFixed(0)}g
                        </Badge>
                        <Badge variant="secondary" className="text-[10px] px-2">
                          G: {food.fat.toFixed(0)}g
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Fixed Bottom Button */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-background border-t pb-safe">
        <Button
          onClick={onAddAll}
          className="w-full rounded-xl h-12 text-base"
          size="lg"
        >
          <Plus className="w-5 h-5 mr-2" />
          Agregar Todo al Registro
        </Button>
      </div>
    </div>
  );
}
