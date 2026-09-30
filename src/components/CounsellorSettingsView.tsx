// ============================================================================
// NMIMS AI Admission Voice Assistant - Counsellor Transfer Settings
// ============================================================================

import React, { useState } from 'react';
import {
  Headphones,
  Phone,
  ShieldCheck,
  User,
  ArrowRightLeft,
  CheckCircle2,
  AlertCircle,
  Save,
} from 'lucide-react';
import { CounsellorConfig, SystemSettings } from '../types';
import { api } from '../services/api';

interface CounsellorSettingsViewProps {
  counsellors: CounsellorConfig[];
  settings: SystemSettings;
  onSettingsUpdated: (newSettings: SystemSettings) => void;
}

export const CounsellorSettingsView: React.FC<CounsellorSettingsViewProps> = ({
  counsellors,
  settings,
  onSettingsUpdated,
}) => {
  const [primaryPhone, setPrimaryPhone] = useState(settings.counsellor_phone_number);
  const [primaryName, setPrimaryName] = useState(settings.counsellor_name);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setNotice(null);

    try {
      const res = await api.updateSettings({
        counsellor_phone_number: primaryPhone,
        counsellor_name: primaryName,
      });

      onSettingsUpdated(res.settings);
      setNotice('Primary human admission counsellor transfer destination updated successfully.');
    } catch (e: any) {
      setNotice('Failed to update counsellor transfer configuration.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Overview Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
          <Headphones className="w-4 h-4 text-red-700" />
          <span>Human Admission Counsellor Call Bridging</span>
        </h2>
        <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
          When candidates ask about dynamic information (fees, cutoffs, deadlines, scholarships) or request a real human, the live telephony engine immediately bridges the call to the configured counsellor number below.
        </p>

        {notice && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{notice}</span>
          </div>
        )}
      </div>

      {/* Primary Transfer Setup Card */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div className="border-b border-slate-100 pb-3 mb-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-amber-600" />
            <span>Active Live Transfer Destination</span>
          </h3>
          <p className="text-xs text-slate-500">
            Carrier calls are bridged live to this number without disconnecting the student
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-4 max-w-lg text-xs">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Primary Admission Counsellor Name *
            </label>
            <input
              type="text"
              required
              value={primaryName}
              onChange={(e) => setPrimaryName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600/30"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Counsellor Indian Mobile / Landline (+91) *
            </label>
            <input
              type="tel"
              required
              value={primaryPhone}
              onChange={(e) => setPrimaryPhone(e.target.value)}
              placeholder="+919876543210"
              className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600/30"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              Format: Standard Indian cellular with +91 country code (e.g. +919876543210)
            </span>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 bg-red-700 hover:bg-red-800 disabled:opacity-50 text-white rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Updating...' : 'Save Transfer Destination'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Verified Counsellors Directory */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Configured Admission Desks ({counsellors.length})
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {counsellors.map((c) => (
            <div
              key={c.id}
              className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">{c.name}</span>
                {c.is_primary_transfer && (
                  <span className="px-2 py-0.5 bg-red-100 text-red-800 text-[10px] font-bold rounded">
                    Primary Route
                  </span>
                )}
              </div>
              <div className="text-xs font-mono text-slate-600 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>{c.phone_number}</span>
              </div>
              <div className="text-[11px] text-slate-500">{c.department}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
