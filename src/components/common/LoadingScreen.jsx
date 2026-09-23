// src/components/common/LoadingScreen.jsx – Enterprise Branded Loading Screen

import React from 'react';
import { Radio } from 'lucide-react';

export default function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
      <div className="relative flex items-center justify-center">
        {/* Outer pulse animation */}
        <div className="w-20 h-20 rounded-full bg-blue-100/60 animate-ping absolute" />
        
        {/* Spinning ring */}
        <div className="w-16 h-16 border-4 border-slate-200 border-t-[#1E3A8A] rounded-full animate-spin" />
        
        {/* Center brand logo */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-9 h-9 rounded-xl bg-[#1E3A8A] text-white flex items-center justify-center shadow-md">
            <Radio className="w-5 h-5 text-white animate-pulse" />
          </div>
        </div>
      </div>
      
      <div className="mt-6 text-center">
        <h3 className="text-base font-bold text-slate-900 tracking-tight">FieldSync</h3>
        <p className="text-xs text-slate-500 mt-1">Initializing secure offline environment...</p>
      </div>
    </div>
  );
}