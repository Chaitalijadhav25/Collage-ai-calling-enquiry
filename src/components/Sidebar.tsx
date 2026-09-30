// ============================================================================
// NMIMS AI Admission Voice Assistant - Navigation Sidebar
// ============================================================================

import React from 'react';
import {
  LayoutDashboard,
  PhoneCall,
  Users,
  Radio,
  History,
  FileText,
  GraduationCap,
  Layers,
  Calendar,
  BookOpen,
  Headphones,
  FileSpreadsheet,
  ShieldCheck,
} from 'lucide-react';

export type NavigationPage =
  | 'dashboard'
  | 'leads'
  | 'make-call'
  | 'active-calls'
  | 'call-history'
  | 'transcripts'
  | 'programs'
  | 'seats'
  | 'knowledge-base'
  | 'counsellor-settings';

interface SidebarProps {
  currentPage: NavigationPage;
  onNavigate: (page: NavigationPage) => void;
  activeCallsCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onNavigate,
  activeCallsCount,
}) => {
  const navItems: { id: NavigationPage; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'make-call', label: 'Make Call', icon: <PhoneCall className="w-4 h-4" /> },
    {
      id: 'active-calls',
      label: 'Active Calls',
      icon: <Radio className="w-4 h-4" />,
      badge: activeCallsCount,
    },
    { id: 'leads', label: 'Leads & Excel Sheet', icon: <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> },
    { id: 'call-history', label: 'Call History', icon: <History className="w-4 h-4" /> },
    { id: 'transcripts', label: 'Call Transcripts', icon: <FileText className="w-4 h-4" /> },
    { id: 'programs', label: 'Schools & Programs', icon: <GraduationCap className="w-4 h-4" /> },
    { id: 'seats', label: 'Seat Matrix', icon: <Layers className="w-4 h-4" /> },
    { id: 'knowledge-base', label: 'Knowledge Base', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'counsellor-settings', label: 'Counsellor Desk', icon: <Headphones className="w-4 h-4" /> },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-200 flex flex-col shrink-0 border-r border-slate-800 select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-red-700 flex items-center justify-center font-bold text-white text-base tracking-wider shadow-sm">
          NM
        </div>
        <div>
          <h1 className="text-sm font-semibold text-white tracking-tight leading-tight">
            SVKM NMIMS
          </h1>
          <p className="text-xs text-slate-400">Dhule Global Campus</p>
        </div>
      </div>

      {/* Campus Tag */}
      <div className="px-4 py-2 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
        <span className="flex items-center gap-1.5 text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          Voice Agent Engine
        </span>
        <span className="font-mono text-slate-500">v2.6</span>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        <div className="px-2 py-1.5 text-[10px] uppercase font-bold tracking-wider text-slate-500">
          Operations
        </div>
        {navItems.slice(0, 6).map((item) => {
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-md transition-colors text-left ${
                isActive
                  ? 'bg-red-700 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {item.icon}
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="px-1.5 py-0.2 bg-emerald-500 text-slate-950 font-bold rounded-full text-[10px]">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        <div className="pt-3 px-2 py-1.5 text-[10px] uppercase font-bold tracking-wider text-slate-500">
          Academics & Campus
        </div>
        {navItems.slice(6).map((item) => {
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-md transition-colors text-left ${
                isActive
                  ? 'bg-red-700 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer Status */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/40 text-[11px] text-slate-400 space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Carrier PSTN</span>
          <span className="text-emerald-400 font-medium">Ready</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Gemini 3.8 Reasoning</span>
          <span className="text-emerald-400 font-medium">Active</span>
        </div>
        <div className="flex items-center gap-1.5 pt-1 text-[10px] text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
          <span>TRAI & Dynamic Shield Active</span>
        </div>
      </div>
    </aside>
  );
};
