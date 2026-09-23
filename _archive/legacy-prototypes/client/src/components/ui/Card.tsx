import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  noPadding = false,
  ...props
}) => {
  return (
    <div
      className={`bg-white border border-slate-200 rounded-xl shadow-xs transition-shadow hover:shadow-sm ${
        noPadding ? '' : 'p-5 md:p-6'
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<{
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}> = ({ title, subtitle, action, className = '' }) => (
  <div className={`flex items-start justify-between pb-4 border-b border-slate-100 ${className}`}>
    <div>
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
    </div>
    {action && <div className="ml-4 shrink-0">{action}</div>}
  </div>
);

export default Card;
