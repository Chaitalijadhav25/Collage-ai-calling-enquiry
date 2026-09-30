// ============================================================================
// NMIMS AI Admission Voice Assistant - Dashboard Overview
// 8 core admission metrics, real-time activity feed, and conversion rates
// ============================================================================

import React from 'react';
import {
  Users,
  PhoneIncoming,
  CheckCircle2,
  PhoneMissed,
  Sparkles,
  Cpu,
  ArrowRightLeft,
  CheckCheck,
  TrendingUp,
  PhoneCall,
  ExternalLink,
} from 'lucide-react';
import { CallRecord, Lead } from '../types';

interface DashboardOverviewProps {
  stats: any;
  recentCalls: CallRecord[];
  leads: Lead[];
  onOpenMakeCall: () => void;
  onNavigate: (page: any) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  stats,
  recentCalls,
  leads,
  onOpenMakeCall,
  onNavigate,
}) => {
  const cards = [
    {
      title: 'Total Leads',
      value: stats?.totalLeads ?? 0,
      sub: 'Enquiries recorded',
      icon: <Users className="w-5 h-5 text-blue-600" />,
      color: 'border-l-4 border-l-blue-600',
    },
    {
      title: 'Calls Today',
      value: stats?.callsToday ?? 0,
      sub: 'Dispatched outbound',
      icon: <PhoneIncoming className="w-5 h-5 text-indigo-600" />,
      color: 'border-l-4 border-l-indigo-600',
    },
    {
      title: 'Successful Calls',
      value: stats?.successfulCalls ?? 0,
      sub: 'Connected & completed',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
      color: 'border-l-4 border-l-emerald-600',
    },
    {
      title: 'Missed / Busy',
      value: stats?.missedCalls ?? 0,
      sub: 'Unanswered or busy',
      icon: <PhoneMissed className="w-5 h-5 text-rose-500" />,
      color: 'border-l-4 border-l-rose-500',
    },
    {
      title: 'Interested Students',
      value: stats?.interestedStudents ?? 0,
      sub: 'High conversion intent',
      icon: <Sparkles className="w-5 h-5 text-amber-500" />,
      color: 'border-l-4 border-l-amber-500',
    },
    {
      title: 'Engineering Inquiries',
      value: stats?.engineeringEnquiries ?? 0,
      sub: 'STME B.Tech programs',
      icon: <Cpu className="w-5 h-5 text-purple-600" />,
      color: 'border-l-4 border-l-purple-600',
    },
    {
      title: 'Human Transfers',
      value: stats?.humanTransfers ?? 0,
      sub: 'Bridged to counsellors',
      icon: <ArrowRightLeft className="w-5 h-5 text-teal-600" />,
      color: 'border-l-4 border-l-teal-600',
    },
    {
      title: 'Total Completed',
      value: stats?.totalCalls ?? 0,
      sub: 'All-time lifetime calls',
      icon: <CheckCheck className="w-5 h-5 text-slate-700" />,
      color: 'border-l-4 border-l-slate-700',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-xl p-6 shadow-sm border border-slate-700 flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-red-400">
            <span>SVKM NMIMS Global University · Dhule Admissions</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight">
            Autonomous Voice Admission Desk
          </h1>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Direct PSTN calling engine with trilingual voice reasoning (English, Hindi, Marathi), verified database seat verification, dynamic info shielding, and live human counsellor handoff.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenMakeCall}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-700 hover:bg-red-800 text-white text-xs font-medium rounded-lg shadow transition-colors cursor-pointer"
          >
            <PhoneCall className="w-4 h-4" />
            <span>Launch Outbound Call</span>
          </button>
        </div>
      </div>

      {/* 8 Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c, i) => (
          <div
            key={i}
            className={`bg-white rounded-lg p-4 border border-slate-200 shadow-xs ${c.color} flex items-center justify-between`}
          >
            <div>
              <p className="text-xs font-medium text-slate-500">{c.title}</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5 tracking-tight">
                {c.value}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">{c.sub}</p>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-lg">{c.icon}</div>
          </div>
        ))}
      </div>

      {/* Quick Two-Column View: Recent Calls & Verified School Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Calls Feed */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Recent Voice Calls</h3>
              <p className="text-xs text-slate-500">Live call outcomes and counsellor transfers</p>
            </div>
            <button
              onClick={() => onNavigate('call-history')}
              className="text-xs font-medium text-red-700 hover:text-red-800 flex items-center gap-1 cursor-pointer"
            >
              <span>View All History</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 mt-2">
            {recentCalls.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No calls made yet today. Click "Call Student" to initiate the first AI admission call.
              </div>
            ) : (
              recentCalls.slice(0, 5).map((call) => (
                <div key={call.id} className="py-3 flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">{call.student_name}</span>
                      <span className="font-mono text-slate-500">{call.phone_number}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <span>{new Date(call.start_time).toLocaleTimeString()}</span>
                      <span>·</span>
                      <span className="uppercase">{call.language}</span>
                      <span>·</span>
                      <span>{call.duration_seconds}s</span>
                      {call.transferred_to && (
                        <>
                          <span>·</span>
                          <span className="text-amber-700 font-medium">
                            Transferred to {call.transferred_to}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div>
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide ${
                        call.status === 'COMPLETED'
                          ? 'bg-slate-100 text-slate-700'
                          : call.status === 'TRANSFERRED'
                          ? 'bg-amber-100 text-amber-800'
                          : call.status === 'CALLING' || call.status === 'AI_SPEAKING'
                          ? 'bg-emerald-100 text-emerald-800 animate-pulse'
                          : 'bg-red-50 text-red-700'
                      }`}
                    >
                      {call.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Academic Snapshot */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">Dhule Campus Schools</h3>
              <span className="text-xs text-slate-400 font-medium">3 Schools Active</span>
            </div>

            <div className="mt-4 space-y-3.5">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                  <span>School of Technology (STME)</span>
                  <span className="text-red-700 font-mono text-[11px]">B.Tech</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Computer Engg, CSE (AI/ML), Data Science, IT, Mechanical, Civil, Electrical.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                  <span>School of Commerce (SOC)</span>
                  <span className="text-blue-700 font-mono text-[11px]">BBA / B.Com</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Management, Finance, NPAT entrance preparation.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                  <span>School of Pharmacy (SPTM)</span>
                  <span className="text-teal-700 font-mono text-[11px]">Pharma Tech</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  B.Pharm and 5-Year Integrated B.Pharm + MBA (Pharma Tech).
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 mt-4">
            <button
              onClick={() => onNavigate('seats')}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Manage Seat Matrix & Quotas</span>
              <TrendingUp className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
