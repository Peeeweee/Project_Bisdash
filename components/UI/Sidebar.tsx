
import React from 'react';

interface SidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  isAdmin: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ currentTab, onTabChange, isAdmin }) => {
  const tabs = isAdmin
    ? [
      { id: 'overview', name: 'Dashboard', icon: '📊' },
      { id: 'customers', name: 'Customers', icon: '👥' },
      { id: 'investors', name: 'Investors', icon: '💎' },
      { id: 'transactions', name: 'Transactions', icon: '💸' },
      { id: 'analytics', name: 'Analytics', icon: '📈' },
      { id: 'settings', name: 'Settings', icon: '⚙️' }
    ]
    : [
      { id: 'overview', name: 'Public Overview', icon: '🌎' },
      { id: 'login', name: 'Admin Login', icon: '🔒' }
    ];

  return (
    <div className="w-64 h-screen bg-white border-r border-slate-200 flex flex-col fixed left-0 top-0 z-40">
      <div className="p-6">
        <h1 className="text-2xl font-black text-emerald-600 tracking-tighter">BISDASH</h1>
        <p className="text-xs text-slate-400 font-medium uppercase tracking-widest mt-1">ATM Management</p>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`w-full flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-200 ${currentTab === tab.id
                ? 'bg-emerald-50 text-emerald-600 shadow-sm shadow-emerald-100'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
          >
            <span className="text-lg mr-3">{tab.icon}</span>
            {tab.name}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-100">
        <div className="bg-slate-50 rounded-xl p-4">
          <p className="text-xs font-bold text-slate-400 uppercase mb-1">Status</p>
          <div className="flex items-center">
            <div className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse"></div>
            <p className="text-sm font-semibold text-slate-700">{isAdmin ? 'Admin Mode' : 'Partner Mode'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
