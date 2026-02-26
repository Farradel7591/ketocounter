'use client';

import { cn } from '@/lib/utils';

interface MacroRingProps {
  value: number;
  max: number;
  label: string;
  unit: string;
  color: string;
  size?: number;
  strokeWidth?: number;
  showValue?: boolean;
}

export function MacroRing({
  value,
  max,
  label,
  unit,
  color,
  size = 100,
  strokeWidth = 8,
  showValue = true
}: MacroRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const percentage = Math.min((value / max) * 100, 100);
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        {/* Background circle */}
        <svg
          width={size}
          height={size}
          className="transform -rotate-90"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-muted/20"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-500 ease-out"
          />
        </svg>
        {showValue && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-bold" style={{ color }}>
              {Math.round(value)}
            </span>
            <span className="text-xs text-muted-foreground">{unit}</span>
          </div>
        )}
      </div>
      <span className={cn(
        "text-xs font-medium",
        percentage >= 100 ? "text-destructive" : "text-foreground"
      )}>
        {label}
      </span>
      <span className="text-[10px] text-muted-foreground">
        {Math.round(percentage)}%
      </span>
    </div>
  );
}
