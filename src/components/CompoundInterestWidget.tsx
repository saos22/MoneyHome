'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { cn } from '../lib/utils';
import { XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, ReferenceLine, Label } from 'recharts';
import { Calculator, Settings, ChevronDown, ChevronUp, DollarSign, Target, Percent, Coffee } from 'lucide-react';

const FREQUENCIES = {
  weekly: 52,
  biweekly: 26,
  monthly: 12,
  annually: 1,
};

type Frequency = keyof typeof FREQUENCIES;

export function CompoundInterestWidget() {
  const { stats } = useFinancial();

  // Core Investment State
  const [initialPrincipal, setInitialPrincipal] = useState<number>(10000);
  const [years, setYears] = useState<number>(30);
  const [contributionYears, setContributionYears] = useState<number>(30);
  const [returnRate, setReturnRate] = useState<number>(7);
  const [baseContribution, setBaseContribution] = useState<number>(stats.totalBalance);
  const [frequency, setFrequency] = useState<Frequency>('monthly');
  const [hasManuallyEdited, setHasManuallyEdited] = useState(false);
  const [yearlyOverrides, setYearlyOverrides] = useState<Record<number, number>>({});

  // Sync contribution years if it matches total years
  useEffect(() => {
    if (contributionYears > years) {
      setContributionYears(years);
    }
  }, [years, contributionYears]);

  // Sync with real potential on initial load or if user hasn't touched it
  useEffect(() => {
    if (!hasManuallyEdited) {
      setBaseContribution(Math.round(stats.totalBalance * 100) / 100);
    }
  }, [stats.totalBalance, hasManuallyEdited]);

  // FIRE State
  const [targetAnnualSpend, setTargetAnnualSpend] = useState<number>(100000);
  const [swr, setSwr] = useState<number>(4);
  const [showFireCalc, setShowFireCalc] = useState(false);

  // UI State
  const [showYearlyAdjustments, setShowYearlyAdjustments] = useState(false);

  // Derived FIRE values
  const fireNumber = useMemo(() => (targetAnnualSpend / (swr / 100)), [targetAnnualSpend, swr]);

  const chartData = useMemo(() => {
    let currentBalance = Math.max(0, initialPrincipal);
    let totalContributions = Math.max(0, initialPrincipal);
    const data = [];

    data.push({
      year: 0,
      balance: currentBalance,
      contributions: totalContributions,
      interest: 0,
    });

    const ratePerPeriod = returnRate / 100 / FREQUENCIES[frequency];

    for (let y = 1; y <= years; y++) {
      const periodsThisYear = FREQUENCIES[frequency];
      
      // If we are past contribution years, contribution is 0
      const isContributing = y <= contributionYears;
      const basePeriodic = isContributing ? baseContribution : 0;
      const periodicContribution = yearlyOverrides[y] !== undefined ? yearlyOverrides[y] : basePeriodic;
      
      for (let p = 0; p < periodsThisYear; p++) {
        const interestThisPeriod = currentBalance * ratePerPeriod;
        // Balance can be negative if withdrawals exceed interest+principal
        currentBalance = Math.max(0, currentBalance + interestThisPeriod + periodicContribution);
        totalContributions += periodicContribution;
      }

      data.push({
        year: y,
        balance: Math.round(currentBalance),
        contributions: Math.round(totalContributions),
        interest: Math.round(Math.max(0, currentBalance - totalContributions)),
      });
    }

    return data;
  }, [initialPrincipal, years, contributionYears, returnRate, baseContribution, frequency, yearlyOverrides]);

  const requiredContribution = useMemo(() => {
    const target = fireNumber;
    const n = contributionYears * FREQUENCIES[frequency];
    const r = returnRate / 100 / FREQUENCIES[frequency];
    const p = Math.max(0, initialPrincipal);

    if (r === 0 || n === 0) return 0;

    // FV of principal after contribution years
    const fvOfPrincipalAfterC = p * Math.pow(1 + r, n);
    // FV factor of contributions after contribution years
    const denominator = (Math.pow(1 + r, n) - 1) / r;
    
    // Growth factor for years without contributions
    const remainingYears = years - contributionYears;
    const finalGrowthFactor = Math.pow(1 + (returnRate / 100), remainingYears);
    
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
    if (!isNaN(val)) {
      setYearlyOverrides({ ...yearlyOverrides, [year]: val });
    }
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
        <button 
          onClick={() => setShowFireCalc(!showFireCalc)}
          className={`px-4 py-1.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${showFireCalc ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'}`}
        >
          <Target size={16} />
          {showFireCalc ? 'Hide FIRE Goals' : 'Show FIRE Goals'}
        </button>
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
                  onChange={(e) => setInitialPrincipal(parseFloat(e.target.value) || 0)}
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
                    onChange={(e) => setReturnRate(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Total Years</label>
                <input 
                  type="number" 
                  min="1"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 focus:outline-none focus:border-indigo-500"
                  value={years === 0 ? '' : years}
                  placeholder="0"
                  onChange={(e) => setYears(Math.max(1, parseFloat(e.target.value) || 0))}
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
                  max={years}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-9 pr-3 text-slate-200 focus:outline-none focus:border-indigo-500"
                  value={contributionYears === 0 ? '' : contributionYears}
                  placeholder="0"
                  onChange={(e) => setContributionYears(Math.min(years, Math.max(0, parseFloat(e.target.value) || 0)))}
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
                    onChange={(e) => {
                      setBaseContribution(parseFloat(e.target.value) || 0);
                      setHasManuallyEdited(true);
                    }}
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
                    onChange={(e) => setTargetAnnualSpend(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Safe Withdrawal Rate (%)</label>
                <div className="relative">
                  <Percent size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input 
                    type="number" 
                    min="0.1"
                    step="0.1"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-sm text-slate-200 focus:outline-none focus:border-orange-500/50"
                    value={swr === 0 ? '' : swr}
                    placeholder="0"
                    onChange={(e) => setSwr(parseFloat(e.target.value) || 0)}
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
                {Array.from({ length: years }).map((_, i) => {
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
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Projected {years}y Balance</p>
              <h4 className="text-2xl font-black text-emerald-400">{formatCurrency(chartData[chartData.length - 1]?.balance || 0)}</h4>
              <p className="text-xs text-slate-500 mt-1">Interest: <span className="text-indigo-400">+{formatCurrency(chartData[chartData.length - 1]?.interest || 0)}</span></p>
            </div>
            {showFireCalc && (
              <div className="bg-orange-500/5 p-4 rounded-2xl border border-orange-500/20">
                <p className="text-[10px] font-bold text-orange-500/60 uppercase tracking-widest mb-1">Required to hit FIRE in {years}y</p>
                <h4 className="text-2xl font-black text-orange-400">{formatCurrency(requiredContribution)}</h4>
                <p className="text-xs text-slate-500 mt-1">per <span className="text-slate-400">{frequency.replace('ly', '')}</span> (for {contributionYears}y)</p>
              </div>
            )}
          </div>

          <div className="flex-1 min-h-[350px] bg-slate-950/30 p-4 rounded-2xl border border-slate-800/50 relative">
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
                  formatter={(value: number) => formatCurrency(value)}
                  labelFormatter={(label) => `Year ${label}`}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                <Area type="monotone" dataKey="contributions" name="Principal & Contributions" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorContributions)" />
                <Area type="monotone" dataKey="balance" name="Total Balance" stroke="#34d399" strokeWidth={2} fillOpacity={1} fill="url(#colorBalance)" />
                
                {contributionYears < years && (
                  <ReferenceLine x={contributionYears} stroke="#475569" strokeDasharray="3 3">
                    <Label position="top" value="Retire" fill="#475569" fontSize={10} fontWeight="bold" />
                  </ReferenceLine>
                )}

                {showFireCalc && (
                  <Area
                    type="monotone"
                    dataKey={() => fireNumber}
                    stroke="#fb923c"
                    strokeDasharray="5 5"
                    strokeWidth={2}
                    fill="none"
                    name="FIRE Goal"
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
