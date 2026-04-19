import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '../lib/utils';

interface StatCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  isCurrency?: boolean;
  className?: string;
  iconClassName?: string;
}

export function StatCard({ title, value, icon: Icon, isCurrency = true, className, iconClassName }: StatCardProps) {
  return (
    <div className={cn("bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl", className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-400">{title}</p>
          <h3 className="text-2xl font-bold text-slate-50 mt-1 font-mono">
            {isCurrency ? `$${value.toLocaleString()}` : `${value.toFixed(1)}%`}
          </h3>
        </div>
        <div className={cn("p-3 rounded-xl", iconClassName)}><Icon className="w-6 h-6" /></div>
      </div>
    </div>
  );
}
