'use client';

import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';

import { Transaction, DashboardStats } from '../types';

interface FinancialContextType {
  transactions: Transaction[];
  stats: DashboardStats;
  addTransactions: (newTransactions: Transaction[]) => void;
  resetData: () => void;
}

const INITIAL_MOCK_DATA: Transaction[] = [
  // April 2026
  { id: '1', date: '2026-04-01', description: 'Monthly Salary', category: 'Salary', amount: 5000, type: 'income' },
  { id: '2', date: '2026-04-02', description: 'Rent Payment', category: 'Housing', amount: 1800, type: 'expense' },
  { id: '3', date: '2026-04-05', description: 'Whole Foods', category: 'Groceries', amount: 150.50, type: 'expense' },
  { id: '4', date: '2026-04-08', description: 'Electric Bill', category: 'Utilities', amount: 85, type: 'expense' },
  { id: '5', date: '2026-04-10', description: 'Netflix', category: 'Entertainment', amount: 15.99, type: 'expense' },
  { id: '8', date: '2026-04-11', description: 'Spotify Family', category: 'Entertainment', amount: 19.99, type: 'expense' },
  { id: '9', date: '2026-04-12', description: 'Disney+', category: 'Entertainment', amount: 13.99, type: 'expense' },
  { id: '10', date: '2026-04-13', description: 'AMC Theatres', category: 'Entertainment', amount: 45.00, type: 'expense' },
  { id: '6', date: '2026-04-12', description: 'Freelance Design', category: 'Side Hustle', amount: 450, type: 'income' },
  { id: '7', date: '2026-04-14', description: 'Shell Gas Station', category: 'Transport', amount: 45.20, type: 'expense' },
];

const FinancialContext = createContext<FinancialContextType | undefined>(undefined);

export function FinancialProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_MOCK_DATA);

  const stats = useMemo<DashboardStats>(() => {
    const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    return {
      totalBalance: income - expenses,
      totalIncome: income,
      totalExpenses: expenses,
      savingsRate: income > 0 ? ((income - expenses) / income) * 100 : 0,
    };
  }, [transactions]);

  const addTransactions = (newT: Partial<Transaction>[]) => {
    const withIds = newT.map(t => ({
      ...t,
      id: t.id || Math.random().toString(36).substring(2, 9),
      amount: Number(t.amount || 0),
      date: t.date || new Date().toISOString().split('T')[0],
      description: t.description || 'No description',
      category: t.category || 'Uncategorized',
      type: t.type || 'expense'
    } as Transaction));
    setTransactions(prev => [...withIds, ...prev]);
  };

  const resetData = () => setTransactions(INITIAL_MOCK_DATA);

  return (
    <FinancialContext.Provider value={{ transactions, stats, addTransactions, resetData }}>
      {children}
    </FinancialContext.Provider>
  );
}

export const useFinancial = () => {
  const context = useContext(FinancialContext);
  if (!context) throw new Error('useFinancial must be used within FinancialProvider');
  return context;
};
