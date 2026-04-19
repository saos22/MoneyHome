'use client';

import React, { useRef, useState } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { Sparkles, Upload, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';

export function SmartUploader() {
  const { addTransactions } = useFinancial();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSmartAnalyze = async (file: File) => {
    setStatus('analyzing');
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/analyze', { method: 'POST', body: formData });
      if (!response.ok) throw new Error('Failed to analyze the file.');
      const data = await response.json();
      if (data.transactions && data.transactions.length > 0) {
        addTransactions(data.transactions);
        setStatus('success');
        setTimeout(() => setStatus('idle'), 3000);
      } else {
        throw new Error('No transactions found.');
      }
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.message);
    }
  };

  return (
    <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-indigo-400" />
        <h3 className="font-bold text-slate-100">Smart Import</h3>
      </div>
      
      <div
        onClick={() => status !== 'analyzing' && fileInputRef.current?.click()}
        className={cn(
          "relative border-2 border-dashed rounded-xl p-8 transition-all cursor-pointer flex flex-col items-center justify-center text-center",
          status === 'analyzing' ? "border-indigo-500 bg-slate-950 animate-pulse" : "border-slate-700 hover:border-indigo-500 bg-slate-950 hover:shadow-2xl hover:shadow-indigo-500/10",
          status === 'success' && "border-emerald-500 bg-emerald-500/5",
          status === 'error' && "border-rose-500 bg-rose-500/5"
        )}
      >
        <input type="file" ref={fileInputRef} onChange={(e) => e.target.files?.[0] && handleSmartAnalyze(e.target.files[0])} className="hidden" />

        {status === 'analyzing' ? (
          <>
            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mb-3" />
            <p className="text-sm font-semibold text-slate-200">AI Processing...</p>
          </>
        ) : status === 'success' ? (
          <>
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mb-3" />
            <p className="text-sm font-bold text-emerald-400">Import Complete</p>
          </>
        ) : (
          <>
            <Upload className="w-8 h-8 text-slate-500 mb-3" />
            <p className="text-sm font-semibold text-slate-300">Drop messy files</p>
            <p className="text-xs text-slate-500 mt-1 italic">PDF, PNG, CSV</p>
          </>
        )}
      </div>
    </div>
  );
}
