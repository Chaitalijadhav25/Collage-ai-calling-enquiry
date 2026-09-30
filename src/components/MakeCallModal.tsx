// ============================================================================
// NMIMS AI Admission Voice Assistant - Make Call Modal
// Supports Real Outbound PSTN Calling & Browser Audio Voice Demo Mode
// ============================================================================

import React, { useState } from 'react';
import {
  PhoneCall,
  X,
  Phone,
  User,
  GraduationCap,
  FileText,
  AlertCircle,
  Radio,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';
import { api } from '../services/api';
import { playAiVoice } from '../utils/voicePlayer';

interface MakeCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCallInitiated: (callData: any) => void;
  isCallingHoursAllowed: boolean;
  callingHoursNotice?: string;
  telephonyProviderName: string;
}

export const MakeCallModal: React.FC<MakeCallModalProps> = ({
  isOpen,
  onClose,
  onCallInitiated,
  isCallingHoursAllowed,
  callingHoursNotice,
  telephonyProviderName,
}) => {
  const [studentName, setStudentName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('+91');
  const [interestedSchool, setInterestedSchool] = useState(
    'School of Technology, Management & Engineering (STME)'
  );
  const [notes, setNotes] = useState('');
  const [callMode, setCallMode] = useState<'telephony' | 'browser_demo'>('telephony');
  const [bypassCallingHours, setBypassCallingHours] = useState(!isCallingHoursAllowed);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate name
    if (!studentName.trim()) {
      setError('Please provide the candidate or parent name.');
      return;
    }

    // Validate phone number format (Indian +91 standard)
    const cleanPhone = phoneNumber.replace(/\s+/g, '');
    if (!/^\+91[6-9]\d{9}$/.test(cleanPhone) && callMode === 'telephony') {
      setError('Please enter a valid 10-digit Indian mobile number starting with +91 (e.g. +919823456789).');
      return;
    }

    setLoading(true);

    try {
      const res = await api.startCall({
        studentName: studentName.trim(),
        phoneNumber: cleanPhone,
        interestedSchool,
        mode: callMode,
        bypassCallingHours: bypassCallingHours || !isCallingHoursAllowed,
      });

      onCallInitiated(res.call);

      // Play AI greeting speech immediately with browser user gesture
      const greetingText =
        res.initialGreeting ||
        res.call?.transcript?.[0]?.text ||
        'Hello! I am the AI admission assistant from SVKM NMIMS Global University, Dhule. Am I speaking with the student or a parent?';
      playAiVoice(greetingText, res.call?.language || 'en');

      onClose();
    } catch (err: any) {
      setError(err.message || 'Call dispatch failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto">
        {/* Modal Header */}
        <div className="shrink-0 bg-slate-900 px-5 sm:px-6 py-3.5 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-red-700 text-white">
              <PhoneCall className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold tracking-tight">Initiate AI Admission Call</h3>
              <p className="text-[11px] text-slate-300">
                SVKM NMIMS Dhule · Autonomous Voice Outbound Engine
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form with Scrollable Content + Pinned Footer */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Mode Switcher */}
            <div className="p-1 bg-slate-100 rounded-lg flex items-center gap-1 text-xs">
              <button
                type="button"
                onClick={() => setCallMode('telephony')}
                className={`flex-1 py-2 px-3 rounded-md font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  callMode === 'telephony'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Phone className="w-3.5 h-3.5 text-red-700" />
                <span>Real Phone Call (PSTN)</span>
              </button>
              <button
                type="button"
                onClick={() => setCallMode('browser_demo')}
                className={`flex-1 py-2 px-3 rounded-md font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  callMode === 'browser_demo'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Radio className="w-3.5 h-3.5 text-blue-600" />
                <span>Browser Voice Demo</span>
              </button>
            </div>

            {callMode === 'telephony' ? (
              <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-2">
                <div className="flex items-center justify-between font-medium text-slate-700">
                  <span>Active Carrier: {telephonyProviderName.toUpperCase()}</span>
                  <span className="text-emerald-600 font-semibold">PSTN Outbound Layer</span>
                </div>
                <p className="leading-relaxed">
                  Initiates an outbound phone call to an Indian mobile number. The call connects to our bidirectional media streaming pipeline and transfers live if requested.
                </p>
                {!isCallingHoursAllowed && (
                  <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-md text-amber-900 space-y-1.5">
                    <div className="flex items-center gap-1.5 font-semibold text-[11px]">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                      <span>Outside Indian Calling Hours (09:00 – 19:00 IST)</span>
                    </div>
                    <p className="text-[10px] text-amber-700 leading-normal">
                      TRAI regulations standardly restrict promotional calls at night. For testing and development, you can bypass this restriction below.
                    </p>
                    <label className="flex items-center gap-2 pt-1 text-slate-800 font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={bypassCallingHours}
                        onChange={(e) => setBypassCallingHours(e.target.checked)}
                        className="rounded text-red-700 focus:ring-red-500 h-3.5 w-3.5"
                      />
                      <span className="text-[11px]">Allow Test Call Now (Bypass Calling Hours)</span>
                    </label>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-[11px] text-slate-600 bg-blue-50/70 p-3 rounded-lg border border-blue-200">
                <span className="font-semibold text-blue-900">Browser Voice Demo Mode: </span>
                Uses your device microphone and speaker to test conversational turns, language detection (Marathi/Hindi/English), and seat lookups directly without consuming carrier balance.
              </div>
            )}

            {/* Student Name */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Student / Parent Name *</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Rahul Patil or Sanjay Sharma (Parent)"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600/30 focus:border-red-600"
              />
            </div>

            {/* Phone Number */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>Indian Mobile Number (+91) *</span>
              </label>
              <input
                type="tel"
                required
                placeholder="+919823456789"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600/30 focus:border-red-600"
              />
              <span className="text-[10px] text-slate-400 block">
                Format: +91 followed by 10 digits (Standard Indian cellular prefix)
              </span>
            </div>

            {/* Interested School */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                <span>Initial School Focus</span>
              </label>
              <select
                value={interestedSchool}
                onChange={(e) => setInterestedSchool(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600/30 focus:border-red-600 bg-white"
              >
                <option value="School of Technology, Management & Engineering (STME)">
                  School of Technology, Management & Engineering (STME)
                </option>
                <option value="School of Commerce">School of Commerce (BBA / B.Com)</option>
                <option value="School of Pharmacy & Technology Management (SPTM)">
                  School of Pharmacy & Technology Management (SPTM)
                </option>
              </select>
            </div>

            {/* Optional Notes */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>Notes for Counsellor (Optional)</span>
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Inquired via web form about Computer Engineering"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600/30 focus:border-red-600 resize-none"
              />
            </div>
          </div>

          {/* Pinned Action Footer (Always Visible!) */}
          <div className="shrink-0 bg-slate-50 border-t border-slate-200 px-5 sm:px-6 py-3.5 flex items-center justify-between gap-3">
            <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
              {callMode === 'telephony' ? 'Outbound PSTN Call' : 'Browser WebRTC Demo'}
            </span>
            <div className="flex items-center justify-end gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 bg-red-700 hover:bg-red-800 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin"></span>
                    <span>Initiating Carrier Call...</span>
                  </>
                ) : (
                  <>
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span>Start AI Call</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
