
import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon: string;
  trend?: 'up' | 'down' | 'neutral';
}

const StatCard: React.FC<StatCardProps> = ({ label, value, subtext, icon, trend }) => {
  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="p-3 bg-emerald-50 rounded-2xl text-2xl">
          {icon}
        </div>
        {trend && (
          <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${trend === 'up' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
            }`}>
            {trend === 'up' ? '↑ High' : '↓ Low'}
          </span>
        )}
      </div>
      <h3 className="text-slate-400 text-xs md:text-sm font-black italic uppercase tracking-wider">{label}</h3>
      <p className="text-2xl md:text-3xl font-black text-slate-900 mt-1 italic tabular-nums">{value}</p>
      {subtext && <p className="text-[10px] md:text-xs text-slate-400 mt-2 font-black italic uppercase tracking-wider">{subtext}</p>}
    </div>
  );
};

export default StatCard;
