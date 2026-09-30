// ============================================================================
// NMIMS AI Admission Voice Assistant - Frontend API Client
// Connects UI to backend telephony endpoints, leads, programs, and settings
// ============================================================================

import {
  CallRecord,
  Lead,
  Program,
  AcademicYear,
  SystemSettings,
  CounsellorConfig,
  KnowledgeDocument,
  VoiceTurnResponse,
} from '../types';

export const api = {
  // Stats
  async getDashboardStats() {
    const res = await fetch('/api/dashboard/stats');
    if (!res.ok) throw new Error('Failed to fetch stats');
    return res.json();
  },

  // Calls
  async getCalls(): Promise<CallRecord[]> {
    const res = await fetch('/api/calls');
    if (!res.ok) throw new Error('Failed to fetch calls');
    return res.json();
  },

  async getCall(id: string): Promise<CallRecord> {
    const res = await fetch(`/api/calls/${id}`);
    if (!res.ok) throw new Error('Failed to fetch call details');
    return res.json();
  },

  async startCall(payload: {
    studentName: string;
    phoneNumber: string;
    interestedSchool?: string;
    mode?: 'telephony' | 'browser_demo';
    bypassCallingHours?: boolean;
  }) {
    const res = await fetch('/api/calls/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to initiate call');
    return data;
  },

  async processVoiceTurn(payload: {
    callId: string;
    userSpeech: string;
  }): Promise<VoiceTurnResponse> {
    const res = await fetch('/api/voice/process-turn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to process voice turn');
    return data;
  },

  async transferCall(payload: { callId: string; targetNumber?: string }) {
    const res = await fetch('/api/calls/transfer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to transfer call');
    return data;
  },

  async endCall(payload: { callId: string; outcome?: string }) {
    const res = await fetch('/api/calls/end', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  // Leads
  async getLeads(params?: { search?: string; school?: string; outcome?: string }): Promise<Lead[]> {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.school) query.append('school', params.school);
    if (params?.outcome) query.append('outcome', params.outcome);

    const res = await fetch(`/api/leads?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch leads');
    return res.json();
  },

  async updateLead(id: string, updates: Partial<Lead>): Promise<Lead> {
    const res = await fetch(`/api/leads/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return res.json();
  },

  // Programs & Seats
  async getPrograms(academicYear?: string): Promise<Program[]> {
    const q = academicYear ? `?academicYear=${encodeURIComponent(academicYear)}` : '';
    const res = await fetch(`/api/programs${q}`);
    return res.json();
  },

  async updateProgram(id: string, updates: Partial<Program>): Promise<Program> {
    const res = await fetch(`/api/programs/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return res.json();
  },

  // Academic Years
  async getAcademicYears(): Promise<AcademicYear[]> {
    const res = await fetch('/api/academic-years');
    return res.json();
  },

  async setActiveAcademicYear(yearName: string) {
    const res = await fetch('/api/academic-years/active', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ yearName }),
    });
    return res.json();
  },

  // Knowledge Base
  async getKnowledgeDocs(): Promise<KnowledgeDocument[]> {
    const res = await fetch('/api/knowledge');
    return res.json();
  },

  async importKnowledgeDoc(payload: {
    url?: string;
    title: string;
    category: string;
    content: string;
  }) {
    const res = await fetch('/api/knowledge/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  // Settings
  async getSettings(): Promise<{
    settings: SystemSettings;
    counsellors: CounsellorConfig[];
    currentTimeIST: string;
    hoursCheck: { allowed: boolean; reason?: string };
  }> {
    const res = await fetch('/api/settings');
    return res.json();
  },

  async updateSettings(settings: Partial<SystemSettings>) {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    return res.json();
  },
};
