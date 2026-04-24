'use client';

import React, { useState, useMemo, useEffect, useCallback, Suspense, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useFinancial } from '../context/FinancialContext';
import { cn } from '../lib/utils';
import { XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, ReferenceLine, Label } from 'recharts';
import { Calculator, Settings, ChevronDown, ChevronUp, DollarSign, Target, Percent, Coffee, BarChart3, Table as TableIcon, ChevronLeft, ChevronRight } from 'lucide-react';

const FREQUENCIES = {
  weekly: 52,
  biweekly: 26,
  monthly: 12,
  annually: 1,
};

type Frequency = keyof typeof FREQUENCIES;

function CompoundInterestContent() {
  const { stats } = useFinancial();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 10;

  // Helper to update URL params with debounce
  const updateQuery = useCallback((params: Record<string, string | number | boolean | null>) => {
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      const current = new URLSearchParams(Array.from(searchParams.entries()));
      let hasChanged = false;
      
      Object.entries(params).forEach(([key, value]) => {
        const stringValue = (value === null || value === undefined || value === false || value === '') ? null : String(value);
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

  // Core Investment State
  const [initialPrincipal, setInitialPrincipal] = useState<number>(() => Number(searchParams.get('p')) || 10000);
  const [years, setYears] = useState<number>(() => Number(searchParams.get('y')) || 30);
  
  const [manualContributionYears, setManualContributionYears] = useState<number | null>(() => {
    const val = searchParams.get('cy');
    return val !== null ? Number(val) : null;
  });
  
  const contributionYears = useMemo(() => {
    const y = years || 0;
    const cy = manualContributionYears !== null ? manualContributionYears : y;
    return Math.min(y, cy);
  }, [years, manualContributionYears]);

  const [returnRate, setReturnRate] = useState<number>(() => {
    const val = searchParams.get('r');
    return val !== null ? Number(val) : 7;
  });
  
  const [manualBaseContribution, setManualBaseContribution] = useState<number | null>(() => {
    const val = searchParams.get('c');
    return val !== null ? Number(val) : null;
  });
  const baseContribution = manualBaseContribution !== null ? manualBaseContribution : Math.round(stats.totalBalance * 100) / 100;

  const [frequency, setFrequency] = useState<Frequency>(() => (searchParams.get('f') as Frequency) || 'monthly');
  const [yearlyOverrides, setYearlyOverrides] = useState<Record<number, number>>({});

  // FIRE State
  const [targetAnnualSpend, setTargetAnnualSpend] = useState<number>(() => Number(searchParams.get('tas')) || 100000);
  const [swr, setSwr] = useState<number>(() => {
    const val = searchParams.get('swr');
    return val !== null ? Number(val) : 4;
  });
  const [showFireCalc, setShowFireCalc] = useState(() => searchParams.get('fire') === 'true');

  // Reset page when years change
  useEffect(() => {
    setCurrentPage(0);
  }, [years]);

  // Sync state changes to URL
  useEffect(() => {
    updateQuery({
      p: initialPrincipal,
      y: years,
      cy: manualContributionYears,
      r: returnRate,
      c: manualBaseContribution,
      f: frequency,
      tas: targetAnnualSpend,
      swr: swr,
      fire: showFireCalc
    });
  }, [initialPrincipal, years, manualContributionYears, returnRate, manualBaseContribution, frequency, targetAnnualSpend, swr, showFireCalc, updateQuery]);

  // UI State
  const [showYearlyAdjustments, setShowYearlyAdjustments] = useState(false);

  const fireNumber = useMemo(() => {
    const spend = targetAnnualSpend || 0;
    const rate = swr || 4;
    return (spend / (rate / 100));
  }, [targetAnnualSpend, swr]);

  const chartData = useMemo(() => {
    let currentBalance = Math.max(0, initialPrincipal || 0);
    let totalContributions = Math.max(0, initialPrincipal || 0);
    const data = [];

    data.push({
      year: 0,
      balance: currentBalance,
      contributions: totalContributions,
      interest: 0,
      yearlyInterest: 0
    });

    const safeYears = Math.max(1, years || 0);
    const ratePerPeriod = (returnRate || 0) / 100 / FREQUENCIES[frequency];

    for (let y = 1; y <= safeYears; y++) {
      const periodsThisYear = FREQUENCIES[frequency];
      const isContributing = y <= contributionYears;
      const basePeriodic = isContributing ? (baseContribution || 0) : 0;
      const periodicContribution = yearlyOverrides[y] !== undefined ? yearlyOverrides[y] : basePeriodic;
      
      let interestThisYear = 0;
      for (let p = 0; p < periodsThisYear; p++) {
        const interestThisPeriod = currentBalance * ratePerPeriod;
        interestThisYear += interestThisPeriod;
        const balanceBeforePeriodic = currentBalance + interestThisPeriod;
        currentBalance = Math.max(0, balanceBeforePeriodic + periodicContribution);
        
        if (periodicContribution >= 0) {
          totalContributions += periodicContribution;
        } else {
          const withdrawalAmount = Math.abs(periodicContribution);
          const currentInterestAccumulated = balanceBeforePeriodic - totalContributions;
          if (currentInterestAccumulated > 0) {
            const principalHit = Math.max(0, withdrawalAmount - currentInterestAccumulated);
            totalContributions = Math.max(0, totalContributions - principalHit);
          } else {
            totalContributions = Math.max(0, totalContributions - withdrawalAmount);
          }
        }
      }

      data.push({
        year: y,
        balance: Math.round(currentBalance),
        contributions: Math.round(totalContributions),
        interest: Math.round(Math.max(0, currentBalance - totalContributions)),
        yearlyInterest: Math.round(interestThisYear)
      });
    }
    return data;
  }, [initialPrincipal, years, contributionYears, returnRate, baseContribution, frequency, yearlyOverrides]);

  const paginatedData = useMemo(() => {
    // Skip Year 0 for the table view
    const tableData = chartData.slice(1);
    const start = currentPage * itemsPerPage;
    return tableData.slice(start, start + itemsPerPage);
  }, [chartData, currentPage]);

  const totalPages = Math.ceil((chartData.length - 1) / itemsPerPage);

  const requiredContribution = useMemo(() => {
    const target = fireNumber;
    const n = (contributionYears || 0) * FREQUENCIES[frequency];
    const r = (returnRate || 0) / 100 / FREQUENCIES[frequency];
    const p = Math.max(0, initialPrincipal || 0);

    if (n === 0) return 0;
    if (r === 0) return (target - p) / n;

    const fvOfPrincipalAfterC = p * Math.pow(1 + r, n);
    const denominator = (Math.pow(1 + r, n) - 1) / r;
    const remainingYears = (years || 0) - (contributionYears || 0);
    const finalGrowthFactor = Math.pow(1 + ((returnRate || 0) / 100), remainingYears);
    const adjustedTarget = target / finalGrowthFactor;
    const needed = (adjustedTarget - fvOfPrincipalAfterC) / denominator;
    return Math.max(0, needed);
  }, [fireNumber, years, contributionYears, frequency, returnRate, initialPrincipal]);

  const handleOverrideChange = (year: number, amount: string) => {
    if (amount === '') {
      const newOverrides = { ...yearlyOverrides };
      delete newOverrides[year];
      setYearlyOverrides(newOverrides);
      return;
    }
    const val = parseFloat(amount);
    if (!isNaN(val)) setYearlyOverrides({ ...yearlyOverrides, [year]: val });
  };

  const clearOverrides = () => setYearlyOverrides({});
  const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800/50 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-500/10 p-2 rounded-lg text-indigo-400">
            <Calculator size={20} />
          </div>
          <h3 className="text-xl font-bold text-slate-100">Financial Growth & FIRE</h3>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowFireCalc(!showFireCalc)}
            className={`px-4 py-1.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${showFireCalc ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'}`}
          >
            <Target size={16} />
            {showFireCalc ? 'Hide FIRE Goals' : 'Show FIRE Goals'}
          </button>
          
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button 
              onClick={() => setViewMode('chart')}
              className={cn("p-1.5 rounded-lg transition-all", viewMode === 'chart' ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-slate-300")}
            >
              <BarChart3 size={18} />
            </button>
            <button 
              onClick={() => setViewMode('table')}
              className={cn("p-1.5 rounded-lg transition-all", viewMode === 'table' ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-slate-300")}
            >
              <TableIcon size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-5">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Current Holdings</label>
              <div className="relative">
                <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input 
                  type="number" 
                  min="0"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-9 pr-3 text-slate-200 focus:outline-none focus:border-indigo-500"
                  value={initialPrincipal === 0 ? '' : initialPrincipal}
                  placeholder="0"
                  onChange={(e) => setInitialPrincipal(e.target.value === '' ? 0 : parseFloat(e.target.value))}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Return Rate (%)</label>
                <div className="relative">
                  <Percent size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input 
                    type="number" 
                    min="0"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 focus:outline-none focus:border-indigo-500"
                    value={returnRate === 0 ? '' : returnRate}
                    placeholder="0"
                    step="0.1"
                    onChange={(e) => setReturnRate(e.target.value === '' ? 0 : parseFloat(e.target.value))}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Total Years</label>
                <input 
                  type="number" 
                  min="0"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 focus:outline-none focus:border-indigo-500"
                  value={years === 0 ? '' : years}
                  placeholder="0"
                  onChange={(e) => setYears(e.target.value === '' ? 0 : parseFloat(e.target.value))}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Contribution Years</label>
              <div className="relative">
                <Coffee size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input 
                  type="number" 
                  min="0"
                  max={years || 0}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-9 pr-3 text-slate-200 focus:outline-none focus:border-indigo-500"
                  value={contributionYears === 0 ? '' : contributionYears}
                  placeholder="0"
                  onChange={(e) => setManualContributionYears(e.target.value === '' ? 0 : parseFloat(e.target.value))}
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1 italic">Stop contributions after year {contributionYears}</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Periodic Contribution</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input 
                    type="number" 
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-9 pr-3 text-slate-200 focus:outline-none focus:border-indigo-500"
                    value={baseContribution === 0 ? '' : baseContribution}
                    placeholder="0"
                    onChange={(e) => setManualBaseContribution(e.target.value === '' ? 0 : parseFloat(e.target.value))}
                  />
                </div>
                <select 
                  className="bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 focus:outline-none focus:border-indigo-500"
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as Frequency)}
                >
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Bi-weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="annually">Annually</option>
                </select>
              </div>
            </div>
          </div>

          {showFireCalc && (
            <div className="p-4 bg-orange-500/5 border border-orange-500/10 rounded-2xl space-y-4">
              <h4 className="text-sm font-bold text-orange-400 flex items-center gap-2">
                <Target size={16} />
                FIRE Strategy
              </h4>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Target Annual Spend</label>
                <div className="relative">
                  <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input 
                    type="number" 
                    min="0"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 pl-8 pr-3 text-sm text-slate-200 focus:outline-none focus:border-orange-500/50"
                    value={targetAnnualSpend === 0 ? '' : targetAnnualSpend}
                    placeholder="0"
                    onChange={(e) => setTargetAnnualSpend(e.target.value === '' ? 0 : parseFloat(e.target.value))}
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Safe Withdrawal Rate (%)</label>
                <div className="relative">
                  <Percent size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input 
                    type="number" 
                    min="0"
                    step="0.1"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-sm text-slate-200 focus:outline-none focus:border-orange-500/50"
                    value={swr === 0 ? '' : swr}
                    placeholder="0"
                    onChange={(e) => setSwr(e.target.value === '' ? 0.1 : parseFloat(e.target.value))}
                  />
                </div>
              </div>
              <div className="pt-2 border-t border-orange-500/10">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Target Net Worth</p>
                <p className="text-xl font-black text-orange-400">{formatCurrency(fireNumber)}</p>
              </div>
            </div>
          )}

          <div className="pt-2 border-t border-slate-800">
            <button 
              onClick={() => setShowYearlyAdjustments(!showYearlyAdjustments)}
              className="flex items-center justify-between w-full text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Settings size={16} />
                Adjust Specific Years
              </span>
              {showYearlyAdjustments ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            
            {showYearlyAdjustments && (
              <div className="mt-4 space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                <div className="flex justify-end mb-2">
                  <button onClick={clearOverrides} className="text-xs text-slate-500 hover:text-rose-400 transition-colors">Clear All</button>
                </div>
                {Array.from({ length: years || 1 }).map((_, i) => {
                  const year = i + 1;
                  const isOverridden = yearlyOverrides[year] !== undefined;
                  const isPostRetirement = year > contributionYears;
                  const overrideVal = isOverridden ? yearlyOverrides[year] : 0;
                  return (
                    <div key={year} className="flex items-center justify-between gap-3 text-sm">
                      <span className={cn("text-slate-400 w-16", isPostRetirement && "text-slate-600 italic")}>Year {year}</span>
                      <div className="relative flex-1">
                        <DollarSign size={14} className={`absolute left-2 top-1/2 -translate-y-1/2 ${isOverridden ? 'text-indigo-400' : 'text-slate-600'}`} />
                        <input 
                          type="number"
                          placeholder={isPostRetirement ? "0" : baseContribution.toString()}
                          value={isOverridden && overrideVal !== 0 ? overrideVal : (isOverridden && overrideVal === 0 ? '0' : '')}
                          onChange={(e) => handleOverrideChange(year, e.target.value)}
                          className={cn(
                            "w-full bg-slate-950 border rounded-lg py-1 pl-7 pr-2 focus:outline-none focus:border-indigo-500 text-sm",
                            isOverridden ? "border-indigo-500 text-indigo-200" : "border-slate-800 text-slate-400",
                            isPostRetirement && !isOverridden && "opacity-50"
                          )}
                        />
                      </div>
                      <span className="text-xs text-slate-600 w-16 text-right">/{frequency.replace('ly', '')}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Projected {years || 0}y Balance</p>
              <h4 className="text-2xl font-black text-emerald-400">{formatCurrency(chartData[chartData.length - 1]?.balance || 0)}</h4>
              <p className="text-xs text-slate-500 mt-1">Interest: <span className="text-indigo-400">+{formatCurrency(chartData[chartData.length - 1]?.interest || 0)}</span></p>
            </div>
            {showFireCalc && (
              <div className="bg-orange-500/5 p-4 rounded-2xl border border-orange-500/20">
                <p className="text-[10px] font-bold text-orange-500/60 uppercase tracking-widest mb-1">Required to hit FIRE in {years || 0}y</p>
                <h4 className="text-2xl font-black text-orange-400">{formatCurrency(requiredContribution)}</h4>
                <p className="text-xs text-slate-500 mt-1">per <span className="text-slate-400">{frequency.replace('ly', '')}</span> (for {contributionYears}y)</p>
              </div>
            )}
          </div>

          <div className="flex-1 min-h-[350px] bg-slate-950/30 p-4 rounded-2xl border border-slate-800/50 flex flex-col overflow-hidden">
            {viewMode === 'chart' ? (
              <div className="flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#34d399" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#34d399" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorContributions" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="year" stroke="#475569" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `Yr ${value}`} />
                    <YAxis stroke="#475569" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value >= 1000 ? (value / 1000).toFixed(0) + 'k' : value}`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '0.75rem', color: '#f8fafc' }}
                      itemStyle={{ fontSize: '0.875rem', fontWeight: 600 }}
                      formatter={(value: any) => formatCurrency(Number(value || 0))}
                      labelFormatter={(label) => `Year ${label}`}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                    <Area type="monotone" dataKey="contributions" name="Principal & Contributions" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorContributions)" />
                    <Area type="monotone" dataKey="balance" name="Total Balance" stroke="#34d399" strokeWidth={2} fillOpacity={1} fill="url(#colorBalance)" />
                    {contributionYears > 0 && contributionYears < (years || 0) && (
                      <ReferenceLine x={contributionYears} stroke="#475569" strokeDasharray="3 3">
                        <Label position="top" value="Retire" fill="#475569" fontSize={10} fontWeight="bold" />
                      </ReferenceLine>
                    )}
                    {showFireCalc && <Area type="monotone" dataKey={() => fireNumber} stroke="#fb923c" strokeDasharray="5 5" strokeWidth={2} fill="none" name="FIRE Goal" />}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  <table className="w-full text-left text-sm">
                    <thead className="sticky top-0 bg-slate-950/90 backdrop-blur-sm z-10 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-2">Year</th>
                        <th className="py-3 px-2">Yearly Int.</th>
                        <th className="py-3 px-2">Total Int.</th>
                        <th className="py-3 px-2 text-right">Total Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {paginatedData.map((row) => (
                        <tr key={row.year} className="hover:bg-slate-800/20 transition-colors">
                          <td className="py-3 px-2 font-bold text-slate-400">Yr {row.year}</td>
                          <td className="py-3 px-2 text-indigo-400/80 font-mono">+{formatCurrency(row.yearlyInterest)}</td>
                          <td className="py-3 px-2 text-indigo-400 font-mono">{formatCurrency(row.interest)}</td>
                          <td className="py-3 px-2 text-right text-emerald-400 font-black font-mono">{formatCurrency(row.balance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {totalPages > 1 && (
                  <div className="mt-4 flex items-center justify-between p-2 border-t border-slate-800">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Page {currentPage + 1} of {totalPages}</p>
                    <div className="flex gap-2">
                      <button onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))} disabled={currentPage === 0} className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                        <ChevronLeft size={16} />
                      </button>
                      <button onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))} disabled={currentPage === totalPages - 1} className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function CompoundInterestWidget() {
  return (
    <Suspense fallback={<div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800/50 h-96 animate-pulse" />}>
      <CompoundInterestContent />
    </Suspense>
  );
}
