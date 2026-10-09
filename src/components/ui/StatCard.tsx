import React from 'react';

export interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  subtext?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ icon, label, value, subtext }) => (
  <div className="bg-white/70 backdrop-blur-md border border-tea-200/80 rounded-xl px-5 py-3.5 flex items-center gap-4 shadow-sm min-w-[170px] transition-all hover:shadow-md hover:border-accent/40">
    <div className="w-11 h-11 rounded-xl bg-tea-100/70 border border-tea-200/50 flex items-center justify-center text-accent shrink-0">
      {icon}
    </div>
    <div>
      <div className="text-[11px] text-tea-500 font-bold uppercase tracking-wider mb-0.5">
        {label}
      </div>
      <div className="text-xl font-bold text-tea-900 font-serif leading-tight">{value}</div>
      {subtext && <div className="text-[11px] text-tea-400 mt-0.5">{subtext}</div>}
    </div>
  </div>
);
