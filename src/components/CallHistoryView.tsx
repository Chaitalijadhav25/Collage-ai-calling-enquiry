// ============================================================================
// NMIMS AI Admission Voice Assistant - Call History & Detailed Transcripts
// ============================================================================

import React, { useState } from 'react';
import {
  History,
  Phone,
  Clock,
  Calendar,
  MessageSquare,
  ArrowRightLeft,
  ChevronDown,
  ChevronUp,
  Volume2,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { CallRecord } from '../types';

interface CallHistoryViewProps {
  calls: CallRecord[];
  onOpenMakeCall: () => void;
}

export const CallHistoryView: React.FC<CallHistoryViewProps> = ({ calls, onOpenMakeCall }) => {
  const [expandedCallId, setExpandedCallId] = useState<string | null>(calls[0]?.id || null);

  const toggleExpand = (id: string) => {
    setExpandedCallId(expandedCallId === id ? null : id);
  };

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">PSTN & Voice Call Archive</h2>
          <p className="text-xs text-slate-500">
            Complete call transcripts, carrier status logs, and counsellor transfers
          </p>
        </div>
        <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-3 py-1 rounded-md">
          {calls.length} Total Records
        </span>
      </div>

      {/* Calls List */}
      <div className="space-y-3">
        {calls.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-xs text-slate-400">
            No call records found.
          </div>
        ) : (
          calls.map((call) => {
            const isExpanded = expandedCallId === call.id;
            return (
              <div
                key={call.id}
                className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden transition-all"
              >
                {/* Header Row */}
                <div
                  onClick={() => toggleExpand(call.id)}
                  className="p-4 flex items-center justify-between hover:bg-slate-50/70 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                        call.status === 'COMPLETED'
                          ? 'bg-slate-100 text-slate-700'
                          : call.status === 'TRANSFERRED'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-red-50 text-red-700'
                      }`}
                    >
                      <Phone className="w-4 h-4" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">
                          {call.student_name}
                        </span>
                        <span className="text-xs font-mono text-slate-500">
                          {call.phone_number}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(call.start_time).toLocaleDateString()}</span>
                        </span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(call.start_time).toLocaleTimeString()}</span>
                        </span>
                        <span>·</span>
                        <span>Duration: {call.duration_seconds}s</span>
                        <span>·</span>
                        <span className="uppercase text-[10px] font-bold bg-slate-100 text-slate-700 px-1 rounded">
                          {call.language}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span
                      className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                        call.outcome === 'INTERESTED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : call.outcome === 'HUMAN_TRANSFER'
                          ? 'bg-amber-100 text-amber-800'
                          : call.outcome === 'CALLBACK_REQUESTED'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {call.outcome}
                    </span>

                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Details & Full Dialogue Transcript */}
                {isExpanded && (
                  <div className="border-t border-slate-200 bg-slate-50/50 p-5 space-y-4">
                    {/* Metadata Strip */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs bg-white p-3 rounded-lg border border-slate-200">
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase font-bold block">
                          Provider
                        </span>
                        <span className="font-semibold text-slate-800 uppercase">
                          {call.provider}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase font-bold block">
                          Final State
                        </span>
                        <span className="font-semibold text-slate-800">
                          {call.conversation_state}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase font-bold block">
                          Human Transfer
                        </span>
                        <span className="font-semibold text-slate-800">
                          {call.transferred_to ? (
                            <span className="text-amber-800 flex items-center gap-1">
                              <ArrowRightLeft className="w-3 h-3" />
                              <span>{call.transferred_to}</span>
                            </span>
                          ) : (
                            'None'
                          )}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase font-bold block">
                          Carrier SID
                        </span>
                        <span className="font-mono text-slate-600 text-[11px] truncate block">
                          {call.provider_call_id || 'N/A'}
                        </span>
                      </div>
                    </div>

                    {/* Verbatim Transcript */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                        <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                        <span>Verbatim Audio Transcript</span>
                      </div>

                      <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-3 max-h-[360px] overflow-y-auto">
                        {call.transcript.map((t, idx) => (
                          <div
                            key={t.id || idx}
                            className={`flex flex-col text-xs ${
                              t.speaker === 'AI' ? 'items-start' : 'items-end'
                            }`}
                          >
                            <div className="text-[10px] text-slate-400 font-medium mb-0.5">
                              {t.speaker === 'AI' ? 'NMIMS Voice AI' : call.student_name} ·{' '}
                              {new Date(t.timestamp).toLocaleTimeString()}
                            </div>
                            <div
                              className={`p-3 rounded-lg max-w-lg leading-relaxed ${
                                t.speaker === 'AI'
                                  ? 'bg-slate-100 text-slate-900'
                                  : 'bg-red-700 text-white shadow-xs'
                              }`}
                            >
                              {t.text}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
