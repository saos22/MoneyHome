'use client';

import React, { useMemo, useState, useEffect, useCallback, Suspense, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useFinancial } from '../context/FinancialContext';
import { Transaction } from '../types';
import { cn } from '../lib/utils';
import { TrendingDown, TrendingUp, Scissors, Sparkles, Plus, Check, Percent, DollarSign, AlertCircle } from 'lucide-react';

const DISCRETIONARY_CATEGORIES = [
  'entertainment', 
  'dining', 
  'shopping', 
  'subscriptions', 
  'takeout', 
  'travel', 
  'unnecessary',
  'side hustle' 
];

const DISCRETIONARY_KEYWORDS = [
  'netflix', 'spotify', 'hulu', 'disney', 'amazon prime', 'uber eats', 'door dash', 
  'starbucks', 'cafe', 'bar', 'restaurant', 'cinema', 'game', 'steam', 'playstation'
];

function ExpenseOptimizationContent() {
  const { transactions, stats } = useFinancial();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Helper to update URL params with debounce
  const updateQuery = useCallback((params: Record<string, string | number | boolean | null>) => {
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      const current = new URLSearchParams(Array.from(searchParams.entries()));
      let hasChanged = false;
      
      Object.entries(params).forEach(([key, value]) => {
        const stringValue = (value === null || value === undefined || value === false || value === '' || value === 0) ? null : String(value);
        if (current.get(key) !== stringValue) {
          if (stringValue === null) {
            current.delete(key);
          } else {
            current.set(key, stringValue);
          }
          hasChanged = true;
        }
      });

      if (hasChanged) {
        const query = current.toString();
        const url = query ? `${pathname}?${query}` : pathname;
        router.replace(url, { scroll: false });
      }
    }, 500);
  }, [searchParams, router, pathname]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const [selectedCuts, setSelectedCuts] = useState<Set<string>>(() => {
    const cuts = searchParams.get('cuts');
    return cuts ? new Set(cuts.split(',')) : new Set();
  });
  const [yearsToInvest, setYearsToInvest] = useState(() => Number(searchParams.get('ey')) || 10);
  const [returnRate, setReturnRate] = useState(() => {
    const val = searchParams.get('er');
    return val !== null ? Number(val) : 7;
  });
  const [customMonthly, setCustomMonthly] = useState(() => Number(searchParams.get('cm')) || 0);
  const [customOneTime, setCustomOneTime] = useState(() => Number(searchParams.get('cot')) || 0);

  // Sync state changes to URL
  useEffect(() => {
    updateQuery({
      cuts: selectedCuts.size > 0 ? Array.from(selectedCuts).join(',') : null,
      ey: yearsToInvest,
      er: returnRate,
      cm: customMonthly,
      cot: customOneTime
    });
  }, [selectedCuts, yearsToInvest, returnRate, customMonthly, customOneTime, updateQuery]);

  const categoryStats = useMemo(() => {
    const expenses = transactions.filter(t => t.type === 'expense');
    const categories: Record<string, { amount: number; count: number; transactions: Transaction[] }> = {};

    expenses.forEach(t => {
      const cat = t.category.toLowerCase() || 'uncategorized';
      if (!categories[cat]) {
        categories[cat] = { amount: 0, count: 0, transactions: [] };
      }
      categories[cat].amount += t.amount;
      categories[cat].count += 1;
      categories[cat].transactions.push(t);
    });

    return Object.entries(categories)
      .map(([name, data]) => ({
        name,
        ...data,
        isLikelyDiscretionary: DISCRETIONARY_CATEGORIES.includes(name) || 
          data.transactions.some(t => DISCRETIONARY_KEYWORDS.some(k => t.description.toLowerCase().includes(k)))
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [transactions]);

  const toggleCut = (cat: string) => {
    const next = new Set(selectedCuts);
    if (next.has(cat)) next.delete(cat);
    else next.add(cat);
    setSelectedCuts(next);
  };

  const monthlyDelta = useMemo(() => {
    const savingsFromCuts = Array.from(selectedCuts).reduce((sum, cat) => {
      const data = categoryStats.find(c => c.name === cat);
      return sum + (data?.amount || 0);
    }, 0);
    return savingsFromCuts - customMonthly;
  }, [selectedCuts, categoryStats, customMonthly]);

  const investmentGrowth = useMemo(() => {
    const ratePerMonth = returnRate / 100 / 12;
    const months = yearsToInvest * 12;
    
    let fvMonthly = 0;
    if (ratePerMonth === 0) {
      fvMonthly = monthlyDelta * months;
    } else {
      fvMonthly = monthlyDelta * ((Math.pow(1 + ratePerMonth, months) - 1) / ratePerMonth);
    }

    const fvOneTime = customOneTime * Math.pow(1 + (returnRate / 100), yearsToInvest);
    
    return fvMonthly - fvOneTime;
  }, [monthlyDelta, yearsToInvest, returnRate, customOneTime]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  const isPositive = investmentGrowth > 0;
  const isNeutral = investmentGrowth === 0;

  return (
    <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800/50 space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="bg-rose-500/10 p-2 rounded-lg text-rose-400">
            <Scissors size={20} />
          </div>
          <h3 className="text-xl font-bold text-slate-100">Expense Optimizer</h3>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 rounded-full text-emerald-400 text-xs font-bold uppercase tracking-wider">
          <Sparkles size={12} />
          Marginal Impact Mode
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <p className="text-sm text-slate-400 font-medium">Select categories to &quot;cut&quot; and redirect to investments:</p>
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {categoryStats.map(cat => {
              const isSelected = selectedCuts.has(cat.name);
              return (
                <button
                  key={cat.name}
                  onClick={() => toggleCut(cat.name)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                    isSelected 
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-100' 
                      : 'bg-slate-950/50 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-800 text-slate-500'}`}>
                      {isSelected ? <Check size={14} /> : <Plus size={14} />}
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold capitalize">{cat.name}</p>
                      {cat.isLikelyDiscretionary && !isSelected && (
                        <p className="text-[10px] text-rose-500/60 font-black uppercase tracking-widest">Suggested Cut</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-mono text-sm font-bold ${isSelected ? 'text-rose-400' : 'text-slate-100'}`}>
                      {formatCurrency(cat.amount)}
                    </p>
                    <p className="text-[10px] text-slate-500">Across {cat.count} items</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Net Monthly Delta</p>
                <h4 className={cn("text-3xl font-black transition-colors", monthlyDelta < 0 ? "text-amber-500" : "text-emerald-400")}>
                  {monthlyDelta >= 0 ? '+' : ''}{formatCurrency(monthlyDelta)}
                </h4>
              </div>
              <div className={cn("p-2 rounded-xl", monthlyDelta < 0 ? "bg-amber-500/10 text-amber-500" : "bg-emerald-500/10 text-emerald-400")}>
                {monthlyDelta < 0 ? <AlertCircle size={24} /> : <TrendingUp size={24} />}
              </div>
            </div>

            {/* Custom Inputs */}
            <div className="grid grid-cols-2 gap-4 py-4 border-t border-slate-800/50">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">New Monthly Expense</label>
                <div className="relative">
                  <DollarSign size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-600" />
                  <input 
                    type="number" 
                    placeholder="e.g. Car Loan"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 pl-6 pr-2 text-xs text-slate-200 focus:outline-none focus:border-rose-500/50"
                    value={customMonthly === 0 ? '' : customMonthly}
                    onChange={(e) => setCustomMonthly(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">One-Time Purchase</label>
                <div className="relative">
                  <DollarSign size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-600" />
                  <input 
                    type="number" 
                    placeholder="e.g. Down Payment"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 pl-6 pr-2 text-xs text-slate-200 focus:outline-none focus:border-rose-500/50"
                    value={customOneTime === 0 ? '' : customOneTime}
                    onChange={(e) => setCustomOneTime(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800/50">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Years to Project</label>
                <input 
                  type="number" 
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                  value={yearsToInvest === 0 ? '' : yearsToInvest}
                  placeholder="0"
                  onChange={(e) => setYearsToInvest(Math.max(1, parseInt(e.target.value) || 0))}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Market Return (%)</label>
                <div className="relative">
                  <Percent size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input 
                    type="number" 
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                    value={returnRate === 0 ? '' : returnRate}
                    placeholder="0"
                    onChange={(e) => setReturnRate(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className={cn("p-5 rounded-2xl border transition-all flex-1 flex flex-col justify-center items-center text-center space-y-2", (!isPositive && !isNeutral) ? "bg-amber-500/5 border-amber-500/20" : "bg-emerald-500/5 border-emerald-500/20")}>
            <div className={cn("p-3 rounded-full mb-2", (!isPositive && !isNeutral) ? "bg-amber-500/10 text-amber-500" : "bg-emerald-500/10 text-emerald-400")}>
              {(!isPositive && !isNeutral) ? <TrendingDown size={32} /> : <TrendingUp size={32} />}
            </div>
            <p className="text-sm font-medium text-slate-400">
              {(!isPositive && !isNeutral) ? 'Projected Future Cost:' : `If invested at ${returnRate}% for ${yearsToInvest} years:`}
            </p>
            <h3 className={cn("text-4xl font-black", (!isPositive && !isNeutral) ? "text-amber-500" : "text-emerald-400")}>
              {formatCurrency(Math.abs(investmentGrowth))}
            </h3>
            <p className="text-xs text-slate-500 max-w-[200px]">
              {(!isPositive && !isNeutral)
                ? "This expense reduces your future wealth by this amount." 
                : isNeutral ? "No marginal impact on future wealth." : "By cutting these expenses, you&apos;re effectively buying back your future freedom."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ExpenseOptimizationWidget() {
  return (
    <Suspense fallback={<div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800/50 h-64 animate-pulse" />}>
      <ExpenseOptimizationContent />
    </Suspense>
  );
}
