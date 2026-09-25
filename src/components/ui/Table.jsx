import React from 'react';

export function Table({ children, className = '' }) {
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1E293B] shadow-subtle transition-colors duration-200">
      <table className={`w-full text-left text-sm text-slate-700 dark:text-slate-200 ${className}`}>
        {children}
      </table>
    </div>
  );
}

export function TableHeader({ children, className = '' }) {
  return (
    <thead className={`bg-slate-50/90 dark:bg-[#0F172A] border-b border-slate-200 dark:border-[#334155] text-xs uppercase font-bold text-slate-600 dark:text-slate-200 tracking-wider ${className}`}>
      {children}
    </thead>
  );
}

export function TableBody({ children, className = '' }) {
  return (
    <tbody className={`divide-y divide-slate-100 dark:divide-[#334155] ${className}`}>
      {children}
    </tbody>
  );
}

export function TableRow({ children, className = '', hover = true, onClick }) {
  return (
    <tr
      onClick={onClick}
      className={`transition-colors ${hover ? 'hover:bg-slate-50/70 dark:hover:bg-slate-800/60' : ''} ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
    >
      {children}
    </tr>
  );
}

export function TableHead({ children, className = '' }) {
  return (
    <th scope="col" className={`px-4 py-3.5 font-bold text-slate-700 dark:text-slate-200 ${className}`}>
      {children}
    </th>
  );
}

export function TableCell({ children, className = '' }) {
  return (
    <td className={`px-4 py-3.5 text-slate-700 dark:text-slate-200 align-middle ${className}`}>
      {children}
    </td>
  );
}

export function TableEmpty({ colSpan = 5, message = 'No records found', icon: Icon }) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-12 text-center text-slate-400 dark:text-slate-500">
        {Icon && <Icon className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-600" />}
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{message}</p>
      </td>
    </tr>
  );
}

export default Table;
