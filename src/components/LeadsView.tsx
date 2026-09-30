// ============================================================================
// NMIMS AI Admission Voice Assistant - Leads Directory & Export
// ============================================================================

import React, { useState } from 'react';
import {
  Users,
  Search,
  Filter,
  Download,
  Edit2,
  Phone,
  GraduationCap,
  Calendar,
  X,
  Save,
  CheckCircle2,
  Clock,
  ArrowRightLeft,
} from 'lucide-react';
import { Lead } from '../types';
import { api } from '../services/api';

interface LeadsViewProps {
  leads: Lead[];
  onLeadUpdated: (lead: Lead) => void;
  onInitiateCallToLead: (lead: Lead) => void;
}

export const LeadsView: React.FC<LeadsViewProps> = ({
  leads,
  onLeadUpdated,
  onInitiateCallToLead,
}) => {
  const [search, setSearch] = useState('');
  const [schoolFilter, setSchoolFilter] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState('');
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      !search ||
      lead.name.toLowerCase().includes(search.toLowerCase()) ||
      lead.phone.includes(search) ||
      (lead.interested_branch &&
        lead.interested_branch.toLowerCase().includes(search.toLowerCase()));

    const matchesSchool = !schoolFilter || lead.interested_school === schoolFilter;
    const matchesOutcome = !outcomeFilter || lead.call_outcome === outcomeFilter;

    return matchesSearch && matchesSchool && matchesOutcome;
  });

  const handleExportCsv = () => {
    window.location.href = '/api/leads/export';
  };

  const handleExportExcel = () => {
    window.location.href = '/api/leads/export-excel';
  };

  const handleSaveLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLead) return;

    setIsSaving(true);
    try {
      const updated = await api.updateLead(editingLead.id, editingLead);
      onLeadUpdated(updated);
      setEditingLead(null);
    } catch (err) {
      console.error('Update error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Auto-Save Excel Banner */}
      <div className="bg-emerald-900 text-white p-4 rounded-xl shadow-xs border border-emerald-800 flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-300">
              Automatic Excel Sheet Synchronization Active
            </h3>
          </div>
          <p className="text-xs text-emerald-100">
            Student Marks (10th %, 12th %, CET Score), Interested Branch, Phone Number, and Call Date/Time are automatically captured and saved directly into the admission Excel sheet.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Excel (.xlsx)</span>
          </button>
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-950/60 hover:bg-emerald-950 text-emerald-200 border border-emerald-700 rounded-lg text-xs font-medium transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Top Controls Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search Input */}
          <div className="relative min-w-[240px] flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by student name, phone (+91), or branch..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600/30 focus:border-red-600"
            />
          </div>

          {/* School Filter */}
          <select
            value={schoolFilter}
            onChange={(e) => setSchoolFilter(e.target.value)}
            className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600/30 bg-white text-slate-700"
          >
            <option value="">All Schools</option>
            <option value="School of Technology, Management & Engineering (STME)">
              School of Technology (STME)
            </option>
            <option value="School of Commerce">School of Commerce</option>
            <option value="School of Pharmacy & Technology Management (SPTM)">
              School of Pharmacy (SPTM)
            </option>
          </select>

          {/* Outcome Filter */}
          <select
            value={outcomeFilter}
            onChange={(e) => setOutcomeFilter(e.target.value)}
            className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600/30 bg-white text-slate-700"
          >
            <option value="">All Outcomes</option>
            <option value="INTERESTED">Interested</option>
            <option value="HUMAN_TRANSFER">Human Transfer</option>
            <option value="CALLBACK_REQUESTED">Callback Requested</option>
            <option value="COMPLETED">Completed</option>
            <option value="NOT_INTERESTED">Not Interested</option>
          </select>
        </div>

        {/* Export Button */}
        <button
          onClick={handleExportCsv}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-colors shadow-xs cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Leads (CSV)</span>
        </button>
      </div>

      {/* Leads Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-[11px] uppercase font-bold tracking-wider text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Candidate & Phone</th>
                <th className="py-3 px-3">Type & Lang</th>
                <th className="py-3 px-3">School / Branch</th>
                <th className="py-3 px-3">10th %</th>
                <th className="py-3 px-3">12th %</th>
                <th className="py-3 px-3">CET %ile</th>
                <th className="py-3 px-3">Call Time (IST)</th>
                <th className="py-3 px-3">Outcome</th>
                <th className="py-3 px-3">Transfer Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-slate-400">
                    No leads match your search criteria.
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{lead.name}</div>
                      <div className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        <span>{lead.phone}</span>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <div className="capitalize font-medium text-slate-800">{lead.user_type}</div>
                      <div className="uppercase text-[10px] text-slate-500">
                        {lead.preferred_language === 'mr'
                          ? 'Marathi'
                          : lead.preferred_language === 'hi'
                          ? 'Hindi'
                          : 'English'}
                      </div>
                    </td>

                    <td className="py-3 px-3 max-w-[200px]">
                      <div className="truncate font-medium text-slate-900">
                        {lead.interested_branch || lead.interested_school || 'General Enquiry'}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {lead.interested_school}
                      </div>
                    </td>

                    <td className="py-3 px-3 font-mono">
                      {lead.marks_10th ? `${lead.marks_10th}%` : '—'}
                    </td>
                    <td className="py-3 px-3 font-mono">
                      {lead.marks_12th ? `${lead.marks_12th}%` : '—'}
                    </td>
                    <td className="py-3 px-3 font-mono font-semibold text-slate-900">
                      {lead.cet_percentile ? `${lead.cet_percentile}` : '—'}
                    </td>

                    <td className="py-3 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {new Date(lead.updated_at || lead.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>

                    <td className="py-3 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide ${
                          lead.call_outcome === 'INTERESTED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : lead.call_outcome === 'HUMAN_TRANSFER'
                            ? 'bg-amber-100 text-amber-800'
                            : lead.call_outcome === 'CALLBACK_REQUESTED'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {lead.call_outcome}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-[11px]">
                      {lead.transfer_status === 'TRANSFERRED' ? (
                        <span className="flex items-center gap-1 text-emerald-600 font-medium">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Transferred</span>
                        </span>
                      ) : lead.transfer_status === 'IN_TRANSFER' ? (
                        <span className="flex items-center gap-1 text-amber-600 font-medium">
                          <ArrowRightLeft className="w-3 h-3 animate-spin" />
                          <span>Bridging</span>
                        </span>
                      ) : (
                        <span className="text-slate-400">None</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setEditingLead({ ...lead })}
                          className="p-1.5 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                          title="Edit lead details"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onInitiateCallToLead(lead)}
                          className="p-1.5 bg-red-50 hover:bg-red-100 rounded text-red-700 transition-colors cursor-pointer"
                          title="Call Student Now"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Lead Modal */}
      {editingLead && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden my-auto">
            <div className="shrink-0 bg-slate-900 px-5 py-3 text-white flex items-center justify-between border-b border-slate-800">
              <h3 className="text-sm font-semibold">Edit Lead: {editingLead.name}</h3>
              <button
                onClick={() => setEditingLead(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveLead} className="flex-1 flex flex-col min-h-0 overflow-hidden text-xs">
              <div className="flex-1 overflow-y-auto p-5 space-y-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Student / Parent Name</label>
                <input
                  type="text"
                  value={editingLead.name}
                  onChange={(e) => setEditingLead({ ...editingLead, name: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-md"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Phone Number</label>
                <input
                  type="text"
                  value={editingLead.phone}
                  onChange={(e) => setEditingLead({ ...editingLead, phone: e.target.value })}
                  className="w-full px-3 py-1.5 font-mono border border-slate-300 rounded-md"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">10th %</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingLead.marks_10th ?? ''}
                    onChange={(e) =>
                      setEditingLead({
                        ...editingLead,
                        marks_10th: e.target.value ? parseFloat(e.target.value) : null,
                      })
                    }
                    className="w-full px-2 py-1.5 border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">12th %</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingLead.marks_12th ?? ''}
                    onChange={(e) =>
                      setEditingLead({
                        ...editingLead,
                        marks_12th: e.target.value ? parseFloat(e.target.value) : null,
                      })
                    }
                    className="w-full px-2 py-1.5 border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">CET %ile</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingLead.cet_percentile ?? ''}
                    onChange={(e) =>
                      setEditingLead({
                        ...editingLead,
                        cet_percentile: e.target.value ? parseFloat(e.target.value) : null,
                      })
                    }
                    className="w-full px-2 py-1.5 border border-slate-300 rounded-md"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Interested Branch</label>
                <input
                  type="text"
                  value={editingLead.interested_branch || ''}
                  onChange={(e) =>
                    setEditingLead({ ...editingLead, interested_branch: e.target.value })
                  }
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-md"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Outcome</label>
                <select
                  value={editingLead.call_outcome}
                  onChange={(e) =>
                    setEditingLead({ ...editingLead, call_outcome: e.target.value as any })
                  }
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-md bg-white"
                >
                  <option value="INTERESTED">INTERESTED</option>
                  <option value="HUMAN_TRANSFER">HUMAN_TRANSFER</option>
                  <option value="CALLBACK_REQUESTED">CALLBACK_REQUESTED</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="NOT_INTERESTED">NOT_INTERESTED</option>
                </select>
              </div>
            </div>

            <div className="shrink-0 bg-slate-50 border-t border-slate-200 px-5 py-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingLead(null)}
                className="px-3 py-1.5 text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-1.5 bg-red-700 hover:bg-red-800 text-white rounded-md font-medium cursor-pointer"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
          </div>
        </div>
      )}
    </div>
  );
};
