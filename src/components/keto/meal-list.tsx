'use client';

import { Button } from '@/components/ui/button';
import { Trash2, Camera, Mic, Type, Utensils } from 'lucide-react';
import { cn } from '@/lib/utils';

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

interface MealListProps {
  meals: Meal[];
  onDeleteMeal: (id: string) => void;
}

const sourceIcons = {
  photo: Camera,
  voice: Mic,
  text: Type,
  manual: Utensils
};

export function MealList({ meals, onDeleteMeal }: MealListProps) {
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (meals.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Utensils className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p className="text-sm">Sin comidas registradas hoy</p>
        <p className="text-xs mt-1">Usa los botones de abajo para agregar</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {meals.map((meal) => {
        const SourceIcon = sourceIcons[meal.source as keyof typeof sourceIcons] || Utensils;
        
        return (
          <div
            key={meal.id}
            className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50"
          >
            {/* Source indicator */}
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
              <SourceIcon className="w-5 h-5 text-muted-foreground" />
            </div>

            {/* Meal info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h4 className="font-medium text-sm truncate">{meal.name}</h4>
                <span className="text-xs text-muted-foreground shrink-0">
                  {formatTime(meal.createdAt)}
                </span>
              </div>
              
              {/* Macros */}
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                <span className={cn(
                  "font-medium",
                  meal.netCarbs > 10 ? "text-red-500" : meal.netCarbs > 5 ? "text-yellow-500" : "text-green-500"
                )}>
                  {meal.netCarbs.toFixed(1)}g net
                </span>
                <span>{meal.calories.toFixed(0)} kcal</span>
                <span>P: {meal.protein.toFixed(1)}g</span>
                <span>G: {meal.fat.toFixed(1)}g</span>
              </div>
            </div>

            {/* Delete button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDeleteMeal(meal.id)}
              className="shrink-0 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}
