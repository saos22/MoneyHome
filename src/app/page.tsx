'use client';

import React from 'react';
import { FinancialProvider, useFinancial } from '../context/FinancialContext';
import { StatCard } from '../components/StatCard';
import { TransactionsTable } from '../components/TransactionsTable';
import { SmartUploader } from '../components/SmartUploader';
import { CompoundInterestWidget } from '../components/CompoundInterestWidget';
import { ExpenseOptimizationWidget } from '../components/ExpenseOptimizationWidget';
import { Wallet, TrendingUp, TrendingDown, PiggyBank } from 'lucide-react';

function DashboardContent() {
  const { stats } = useFinancial();

  return (
    <div className="min-h-screen bg-slate-950 p-6 md:p-12 text-slate-100 selection:bg-indigo-500/30">
      <div className="max-w-[1600px] mx-auto w-full">
        <header className="mb-12 flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-black text-slate-50 tracking-tight flex items-center gap-3">
              <span className="bg-indigo-600 px-3 py-1 rounded-xl shadow-lg shadow-indigo-600/20">M</span>
              MoneyHome
            </h1>
            <p className="text-slate-500 mt-2 font-medium">Midnight Edition • AI-Powered Insights</p>
          </div>
          <div className="hidden md:block text-right">
            <p className="text-xs font-bold text-slate-600 uppercase tracking-widest">System Status</p>
            <p className="text-sm font-semibold text-emerald-500 flex items-center gap-2 justify-end">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              Live Analysis Active
            </p>
          </div>
        </header>

        <div className="space-y-8">
          <CompoundInterestWidget />
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard title="Liquidity" value={stats.totalBalance} icon={Wallet} iconClassName="bg-indigo-500/10 text-indigo-400" />
            <StatCard title="Revenue" value={stats.totalIncome} icon={TrendingUp} iconClassName="bg-emerald-500/10 text-emerald-400" />
            <StatCard title="Burn" value={stats.totalExpenses} icon={TrendingDown} iconClassName="bg-rose-500/10 text-rose-400" />
            <StatCard title="Efficiency" value={stats.savingsRate} icon={PiggyBank} isCurrency={false} iconClassName="bg-amber-500/10 text-amber-400" />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <div className="xl:col-span-2">
              <TransactionsTable />
            </div>
            <div className="xl:col-span-1 space-y-6">
              <SmartUploader />
              <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800/50">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Security Protocol</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  All statement data is processed in a transient local state. Files are purged from temporary memory immediately following agentic parsing.
                </p>
              </div>
            </div>
          </div>

          <ExpenseOptimizationWidget />
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <FinancialProvider>
      <DashboardContent />
    </FinancialProvider>
  );
}
