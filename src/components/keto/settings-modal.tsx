'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Save } from 'lucide-react';

interface UserSettings {
  dailyCalories: number;
  dailyCarbs: number;
  dailyProtein: number;
  dailyFat: number;
  dailyFiber: number;
}

interface SettingsModalProps {
  settings: UserSettings | null;
  onClose: () => void;
  onSave: (settings: UserSettings) => void;
}

export function SettingsModal({ settings, onClose, onSave }: SettingsModalProps) {
  const [values, setValues] = useState<UserSettings>({
    dailyCalories: settings?.dailyCalories || 2000,
    dailyCarbs: settings?.dailyCarbs || 20,
    dailyProtein: settings?.dailyProtein || 100,
    dailyFat: settings?.dailyFat || 150,
    dailyFiber: settings?.dailyFiber || 25
  });

  const handleSave = () => {
    onSave(values);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm overflow-y-auto">
      <div className="min-h-full p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Configuración</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Keto Info Card */}
        <Card className="mb-6 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-emerald-600 dark:text-emerald-400">
              Guía Keto
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-1">
            <p>• Carbohidratos netos: 20-50g/día</p>
            <p>• Proteína: 1.5-2g por kg de peso</p>
            <p>• Grasas: 70-80% de calorías totales</p>
            <p>• Mantente en cetosis consumiendo bajo en carbs</p>
          </CardContent>
        </Card>

        {/* Settings Form */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="calories">Calorías Diarias</Label>
                <Input
                  id="calories"
                  type="number"
                  value={values.dailyCalories}
                  onChange={(e) => setValues({ ...values, dailyCalories: Number(e.target.value) })}
                  className="text-lg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="carbs">Carbohidratos Netos (g)</Label>
                <Input
                  id="carbs"
                  type="number"
                  value={values.dailyCarbs}
                  onChange={(e) => setValues({ ...values, dailyCarbs: Number(e.target.value) })}
                  className="text-lg"
                />
                <p className="text-xs text-muted-foreground">
                  Keto estándar: 20g | Keto moderado: 50g
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="protein">Proteína (g)</Label>
                <Input
                  id="protein"
                  type="number"
                  value={values.dailyProtein}
                  onChange={(e) => setValues({ ...values, dailyProtein: Number(e.target.value) })}
                  className="text-lg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fat">Grasa (g)</Label>
                <Input
                  id="fat"
                  type="number"
                  value={values.dailyFat}
                  onChange={(e) => setValues({ ...values, dailyFat: Number(e.target.value) })}
                  className="text-lg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fiber">Fibra (g)</Label>
                <Input
                  id="fiber"
                  type="number"
                  value={values.dailyFiber}
                  onChange={(e) => setValues({ ...values, dailyFiber: Number(e.target.value) })}
                  className="text-lg"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Save Button */}
        <div className="mt-6">
          <Button
            size="lg"
            onClick={handleSave}
            className="w-full rounded-xl"
          >
            <Save className="w-4 h-4 mr-2" />
            Guardar Configuración
          </Button>
        </div>
      </div>
    </div>
  );
}
