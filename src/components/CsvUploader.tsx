'use client';

import React, { useRef, useState } from 'react';
import { useFinancial } from '../context/FinancialContext';
import Papa from 'papaparse';
import { Transaction, TransactionType } from '../types';
import { Upload, FileText, X, CheckCircle2, RotateCcw } from 'lucide-react';
import { cn } from '../lib/utils';

export function CsvUploader() {
  const { addTransactions, resetData } = useFinancial();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<'idle' | 'parsing' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleFile = (file: File) => {
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      setStatus('error');
      setErrorMsg('Please upload a valid CSV file.');
      return;
    }

    setStatus('parsing');
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const parsedTransactions: Transaction[] = results.data.map((row: any) => {
            // Flexible header mapping
            const date = row.Date || row.date || new Date().toISOString().split('T')[0];
            const description = row.Description || row.description || 'Unknown';
            const category = row.Category || row.category || 'General';
            const amount = parseFloat(String(row.Amount || row.amount || '0').replace(/[^0-9.-]+/g, ''));
            const type = (String(row.Type || row.type || 'expense').toLowerCase() === 'income' ? 'income' : 'expense') as TransactionType;

            return {
              id: Math.random().toString(36).substring(2, 9),
              date,
              description,
              category,
              amount: Math.abs(amount),
              type
            };
          });

          if (parsedTransactions.length === 0) {
            throw new Error('No valid transactions found in the file.');
          }

          addTransactions(parsedTransactions);
          setStatus('success');
          setTimeout(() => setStatus('idle'), 3000);
        } catch (err: any) {
          setStatus('error');
          setErrorMsg(err.message || 'Failed to parse CSV file.');
        }
      },
      error: (err) => {
        setStatus('error');
        setErrorMsg('Error reading the file.');
      }
    });
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Import Data</h3>
          <p className="text-sm text-slate-500">Upload your CSV transactions file</p>
        </div>
        <button 
          onClick={resetData}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-indigo-600 transition-colors bg-slate-50 rounded-lg"
        >
          <RotateCcw className="w-3 h-3" />
          Reset to Demo
        </button>
      </div>

      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "relative border-2 border-dashed rounded-xl p-8 transition-all cursor-pointer flex flex-col items-center justify-center text-center",
          isDragging ? "border-indigo-500 bg-indigo-50" : "border-slate-200 hover:border-slate-300 bg-slate-50/50",
          status === 'success' && "border-emerald-500 bg-emerald-50",
          status === 'error' && "border-rose-500 bg-rose-50"
        )}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          className="hidden"
          accept=".csv"
        />

        {status === 'idle' || status === 'parsing' ? (
          <>
            <div className="p-4 bg-white rounded-full shadow-sm mb-4">
              <Upload className={cn("w-8 h-8", status === 'parsing' ? "text-indigo-500 animate-bounce" : "text-slate-400")} />
            </div>
            <p className="text-sm font-medium text-slate-900 mb-1">
              {status === 'parsing' ? 'Parsing your file...' : 'Click to upload or drag and drop'}
            </p>
            <p className="text-xs text-slate-500">CSV files only (Max 10MB)</p>
          </>
        ) : status === 'success' ? (
          <>
            <div className="p-4 bg-white rounded-full shadow-sm mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
            <p className="text-sm font-medium text-emerald-900 mb-1">Upload Successful!</p>
            <p className="text-xs text-emerald-600">Transactions have been added to your dashboard.</p>
          </>
        ) : (
          <>
            <div className="p-4 bg-white rounded-full shadow-sm mb-4 text-rose-500">
              <X className="w-8 h-8" />
            </div>
            <p className="text-sm font-medium text-rose-900 mb-1">Upload Failed</p>
            <p className="text-xs text-rose-600">{errorMsg}</p>
            <button 
              onClick={(e) => { e.stopPropagation(); setStatus('idle'); }}
              className="mt-4 text-xs font-semibold text-rose-700 underline"
            >
              Try Again
            </button>
          </>
        )}
      </div>
      
      <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-100">
        <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-slate-700">
          <FileText className="w-4 h-4" />
          CSV FORMAT GUIDE
        </div>
        <p className="text-[10px] text-slate-500 leading-relaxed uppercase tracking-wider">
          Required Columns: <span className="font-bold text-slate-700">Date, Description, Category, Amount, Type</span> (Income/Expense)
        </p>
      </div>
    </div>
  );
}
