import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Building2, 
  CarFront, 
  Bell, 
  BarChart3, 
  Settings, 
  LogOut 
} from 'lucide-react';
import { BURMESE_LABELS, cn } from '@/lib/utils';

import { supabase } from '@/lib/supabase';

const navItems = [
  { icon: LayoutDashboard, label: BURMESE_LABELS.sidebar.dashboard, path: '/' },
  { icon: Building2, label: BURMESE_LABELS.sidebar.realEstate, path: '/real-estate' },
  { icon: CarFront, label: BURMESE_LABELS.sidebar.taxiHijet, path: '/taxi-hijet' },
  { icon: Bell, label: BURMESE_LABELS.sidebar.reminders, path: '/reminders' },
  { icon: BarChart3, label: BURMESE_LABELS.sidebar.reports, path: '/reports' },
  { icon: Settings, label: BURMESE_LABELS.sidebar.settings, path: '/settings' },
];

export function Sidebar() {
  return (
    <aside className="w-64 bg-slate-900 text-white h-screen fixed left-0 top-0 flex flex-col">
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-xl font-bold text-blue-400">BMS Myanmar</h1>
      </div>
      
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
              isActive ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"
            )}
          >
            <item.icon size={20} />
            <span className="font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <button 
          onClick={() => supabase.auth.signOut()}
          className="flex items-center gap-3 px-4 py-3 w-full text-slate-400 hover:bg-slate-800 hover:text-white rounded-lg transition-colors"
        >
          <LogOut size={20} />
          <span className="font-medium">{BURMESE_LABELS.sidebar.logout}</span>
        </button>
      </div>
    </aside>
  );
}
