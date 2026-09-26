import React from 'react';
import { Radio } from 'lucide-react';

export default function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] flex flex-col items-center justify-center p-4">
      <div className="relative flex items-center justify-center">
        <div className="w-20 h-20 rounded-full bg-blue-100/60 dark:bg-blue-900/40 animate-ping absolute" />
        <div className="w-16 h-16 border-4 border-slate-200 dark:border-slate-700 border-t-[#1E3A8A] dark:border-t-blue-500 rounded-full animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-9 h-9 rounded-xl bg-[#1E3A8A] text-white flex items-center justify-center shadow-md">
            <Radio className="w-5 h-5 text-white animate-pulse" />
          </div>
        </div>
      </div>

      <div className="mt-6 text-center">
        <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">FieldSync</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Initializing secure offline environment...</p>
      </div>
    </div>
  );
}
