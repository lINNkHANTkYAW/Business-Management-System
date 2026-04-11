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

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside className={cn(
        "w-64 bg-slate-900 text-white h-screen fixed left-0 top-0 flex flex-col z-50 transition-transform duration-300 ease-in-out lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <h1 className="text-xl font-bold text-blue-400">BMS Myanmar</h1>
          <button onClick={onClose} className="lg:hidden p-2 hover:bg-slate-800 rounded-lg text-slate-400">
            <LogOut size={20} className="rotate-180" />
          </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => {
                if (window.innerWidth < 1024) onClose();
              }}
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
          onClick={() => {
            supabase.auth.signOut();
            onClose();
          }}
          className="flex items-center gap-3 px-4 py-3 w-full text-slate-400 hover:bg-slate-800 hover:text-white rounded-lg transition-colors"
        >
          <LogOut size={20} />
          <span className="font-medium">{BURMESE_LABELS.sidebar.logout}</span>
        </button>
      </div>
    </aside>
    </>
  );
}
