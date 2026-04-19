'use client';

import React, { useState } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { cn } from '../lib/utils';
import { ArrowDownLeft, ArrowUpRight, ChevronDown, ChevronUp } from 'lucide-react';

export function TransactionsTable() {
  const { transactions } = useFinancial();
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const latest = [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10);

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
      <div 
        className="p-6 border-b border-slate-800 flex justify-between items-center cursor-pointer hover:bg-slate-800/30 transition-colors"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <h3 className="font-semibold text-slate-100 flex items-center gap-2">
          Recent Activity
          <span className="text-xs font-bold text-slate-600 bg-slate-800 px-2 py-0.5 rounded-full">
            {transactions.length}
          </span>
        </h3>
        <button className="text-slate-500 hover:text-slate-300 transition-colors">
          {isCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
        </button>
      </div>
      
      {!isCollapsed && (
        <div className="overflow-x-auto animate-in fade-in slide-in-from-top-2 duration-300">
          <table className="w-full text-left">
            <tbody className="divide-y divide-slate-800">
              {latest.map((t) => (
                <tr key={t.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={cn("p-2 rounded-lg", t.type === 'income' ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400")}>
                        {t.type === 'income' ? <ArrowUpRight size={16}/> : <ArrowDownLeft size={16}/>}
                      </div>
                      <span className="font-medium text-slate-200 text-sm">{t.description}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <span className="px-2 py-0.5 bg-slate-800 rounded-full">{t.category}</span>
                  </td>
                  <td className={cn("px-6 py-4 text-right font-mono font-bold text-sm", t.type === 'income' ? "text-emerald-400" : "text-rose-400")}>
                    {t.type === 'income' ? '+' : '-'}${Math.abs(t.amount).toLocaleString()}
                  </td>
                </tr>
              ))}
              {latest.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-slate-500 italic">
                    No recent activity found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {transactions.length > 10 && (
            <div className="p-4 text-center border-t border-slate-800">
              <p className="text-xs text-slate-600 font-bold uppercase tracking-widest">
                Showing latest 10 of {transactions.length} transactions
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
