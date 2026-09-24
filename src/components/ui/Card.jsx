import React from 'react';

export function Card({ children, className = '', hover = false, ...props }) {
  return (
    <div
      className={`bg-white dark:bg-[#1E293B] rounded-xl border border-[#E2E8F0] dark:border-[#334155] shadow-xs transition-colors duration-200 ${
        hover ? 'hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-200' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '', ...props }) {
  return (
    <div className={`p-5 pb-3 border-b border-[#E2E8F0] dark:border-[#334155] flex items-center justify-between gap-4 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = '', ...props }) {
  return (
    <h3 className={`font-semibold text-[#0F172A] dark:text-[#F8FAFC] text-base tracking-tight ${className}`} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({ children, className = '', ...props }) {
  return (
    <p className={`text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5 ${className}`} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ children, className = '', ...props }) {
  return (
    <div className={`p-5 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className = '', ...props }) {
  return (
    <div className={`p-5 pt-3 border-t border-[#E2E8F0] dark:border-[#334155] flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-[#1E293B]/50 rounded-b-xl ${className}`} {...props}>
      {children}
    </div>
  );
}

export default Card;
