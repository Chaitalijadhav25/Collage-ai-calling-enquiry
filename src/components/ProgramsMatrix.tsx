// ============================================================================
// NMIMS AI Admission Voice Assistant - Programs & Verified Seat Matrix
// Source of truth queried live by the AI during voice calls
// ============================================================================

import React, { useState } from 'react';
import {
  GraduationCap,
  Layers,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Save,
  X,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { Program } from '../types';
import { api } from '../services/api';

interface ProgramsMatrixProps {
  programs: Program[];
  activeAcademicYear: string;
  onProgramUpdated: (updated: Program) => void;
}

export const ProgramsMatrix: React.FC<ProgramsMatrixProps> = ({
  programs,
  activeAcademicYear,
  onProgramUpdated,
}) => {
  const [selectedSchool, setSelectedSchool] = useState<string>('all');
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const filteredPrograms = programs.filter((p) => {
    if (selectedSchool === 'all') return true;
    return p.school_name.toLowerCase().includes(selectedSchool.toLowerCase());
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProgram) return;

    setIsSaving(true);
    try {
      const updated = await api.updateProgram(editingProgram.id, editingProgram);
      onProgramUpdated(updated);
      setEditingProgram(null);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <span>Verified Seat Matrix & Academic Intake</span>
            <span className="text-xs bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded">
              Academic Year: {activeAcademicYear}
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            The AI assistant directly references this database when answering caller seat availability questions.
          </p>
        </div>

        {/* Filter by School */}
        <div className="flex items-center gap-2">
          <select
            value={selectedSchool}
            onChange={(e) => setSelectedSchool(e.target.value)}
            className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-600/30"
          >
            <option value="all">All Dhule Schools</option>
            <option value="Technology">School of Technology (STME)</option>
            <option value="Commerce">School of Commerce</option>
            <option value="Pharmacy">School of Pharmacy (SPTM)</option>
          </select>
        </div>
      </div>

      {/* Program Cards / Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-[11px] uppercase font-bold tracking-wider text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Program / Branch</th>
                <th className="py-3 px-3">School</th>
                <th className="py-3 px-3">Degree</th>
                <th className="py-3 px-3 text-center">Total Verified Seats</th>
                <th className="py-3 px-3 text-center">Available Seats</th>
                <th className="py-3 px-3">Admission Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPrograms.map((prog) => (
                <tr key={prog.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900">{prog.program_name}</div>
                    {prog.specialization && (
                      <div className="text-[11px] text-slate-400">{prog.specialization}</div>
                    )}
                  </td>

                  <td className="py-3 px-3 text-slate-600">
                    <span className="truncate block max-w-[200px]" title={prog.school_name}>
                      {prog.school_name.includes('Technology')
                        ? 'STME (Engineering)'
                        : prog.school_name.includes('Commerce')
                        ? 'Commerce'
                        : 'Pharmacy (SPTM)'}
                    </span>
                  </td>

                  <td className="py-3 px-3 font-medium text-slate-700">{prog.degree}</td>

                  <td className="py-3 px-3 text-center font-mono font-bold text-slate-900">
                    {prog.total_seats !== null ? (
                      prog.total_seats
                    ) : (
                      <span className="text-amber-600 italic text-[11px]">Unverified</span>
                    )}
                  </td>

                  <td className="py-3 px-3 text-center font-mono font-bold text-emerald-600">
                    {prog.available_seats !== null ? (
                      prog.available_seats
                    ) : (
                      <span className="text-slate-400 italic text-[11px]">—</span>
                    )}
                  </td>

                  <td className="py-3 px-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold tracking-wide ${
                        prog.admission_status === 'OPEN'
                          ? 'bg-emerald-100 text-emerald-800'
                          : prog.admission_status === 'CLOSING_SOON'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {prog.admission_status}
                    </span>
                  </td>

                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => setEditingProgram({ ...prog })}
                      className="p-1.5 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-900 transition-colors cursor-pointer inline-flex items-center gap-1"
                      title="Update Seats or Status"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span className="text-[11px] font-medium">Edit Seats</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Program & Seat Matrix Modal */}
      {editingProgram && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden my-auto">
            <div className="shrink-0 bg-slate-900 px-5 py-3 text-white flex items-center justify-between border-b border-slate-800">
              <div>
                <h3 className="text-sm font-semibold">{editingProgram.program_name}</h3>
                <p className="text-[11px] text-slate-300">Update verified seats for {editingProgram.academic_year}</p>
              </div>
              <button
                onClick={() => setEditingProgram(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex-1 flex flex-col min-h-0 overflow-hidden text-xs">
              <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Total Verified Seats</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g. 60"
                      value={editingProgram.total_seats ?? ''}
                      onChange={(e) =>
                        setEditingProgram({
                          ...editingProgram,
                          total_seats: e.target.value ? parseInt(e.target.value, 10) : null,
                        })
                      }
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-md font-mono"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Available Seats</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g. 18"
                      value={editingProgram.available_seats ?? ''}
                      onChange={(e) =>
                        setEditingProgram({
                          ...editingProgram,
                          available_seats: e.target.value ? parseInt(e.target.value, 10) : null,
                        })
                      }
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-md font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Admission Status</label>
                  <select
                    value={editingProgram.admission_status}
                    onChange={(e) =>
                      setEditingProgram({
                        ...editingProgram,
                        admission_status: e.target.value as any,
                      })
                    }
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-md bg-white"
                  >
                    <option value="OPEN">OPEN</option>
                    <option value="CLOSING_SOON">CLOSING_SOON</option>
                    <option value="COUNSELLING">COUNSELLING</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Eligibility Criteria</label>
                  <textarea
                    rows={3}
                    value={editingProgram.eligibility}
                    onChange={(e) =>
                      setEditingProgram({
                        ...editingProgram,
                        eligibility: e.target.value,
                      })
                    }
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-md resize-none"
                  />
                </div>
              </div>

              <div className="shrink-0 bg-slate-50 border-t border-slate-200 px-5 py-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingProgram(null)}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-1.5 bg-red-700 hover:bg-red-800 text-white rounded-md font-medium cursor-pointer"
                >
                  {isSaving ? 'Updating...' : 'Save Database Seats'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
