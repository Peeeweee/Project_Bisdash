
import React from 'react';

interface SidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  isAdmin: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ currentTab, onTabChange, isAdmin }) => {
  const tabs = isAdmin
    ? [
      { id: 'overview', name: 'Home', icon: '📊' },
      { id: 'customers', name: 'Users', icon: '👥' },
      { id: 'investors', name: 'Pools', icon: '💎' },
      { id: 'transactions', name: 'Ledger', icon: '💸' },
      { id: 'analytics', name: 'Data', icon: '📈' },
    ]
    : [
      { id: 'overview', name: 'View', icon: '🌎' },
      { id: 'login', name: 'Login', icon: '🔒' }
    ];

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-64 h-screen bg-white border-r border-slate-200 flex-col fixed left-0 top-0 z-40">
        <div className="p-8">
          <h1 className="text-2xl font-black text-emerald-600 tracking-tighter italic">BISDASH</h1>
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em] mt-1 italic">ATM Management</p>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`w-full flex items-center px-5 py-4 text-sm font-black rounded-[1.5rem] transition-all duration-300 italic ${currentTab === tab.id
                ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-200 translate-x-1'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
            >
              <span className="text-xl mr-4">{tab.icon}</span>
              {tab.name}
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-slate-100">
          <div className="bg-slate-50 rounded-3xl p-5 border border-slate-100">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 italic">Session Status</p>
            <div className="flex items-center">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-3 animate-pulse"></div>
              <p className="text-xs font-black text-slate-700 italic">{isAdmin ? 'Admin Mode' : 'Partner Mode'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-2xl border-t border-slate-100 px-6 py-4 z-50 flex justify-around items-center rounded-t-[2.5rem] shadow-[0_-15px_50px_-15px_rgba(0,0,0,0.15)]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex flex-col items-center gap-1.5 transition-all duration-500 ${currentTab === tab.id ? 'scale-110' : 'opacity-30 grayscale'}`}
          >
            <div className={`p-2 rounded-2xl transition-all duration-500 ${currentTab === tab.id ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' : ''}`}>
              <span className="text-2xl">{tab.icon}</span>
            </div>
          </button>
        ))}
      </div>
    </>
  );
};

export default Sidebar;
