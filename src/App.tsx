// ============================================================================
// NMIMS AI Admission Voice Assistant - Main Application Entry
// SVKM NMIMS Global University, Dhule Campus
// ============================================================================

import React, { useState, useEffect } from 'react';
import { Sidebar, NavigationPage } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardOverview } from './components/DashboardOverview';
import { ActiveCallsMonitor } from './components/ActiveCallsMonitor';
import { MakeCallModal } from './components/MakeCallModal';
import { LeadsView } from './components/LeadsView';
import { CallHistoryView } from './components/CallHistoryView';
import { ProgramsMatrix } from './components/ProgramsMatrix';
import { KnowledgeBaseView } from './components/KnowledgeBaseView';
import { CounsellorSettingsView } from './components/CounsellorSettingsView';
import { api } from './services/api';
import {
  CallRecord,
  Lead,
  Program,
  AcademicYear,
  SystemSettings,
  CounsellorConfig,
  KnowledgeDocument,
} from './types';

export function App() {
  const [currentPage, setCurrentPage] = useState<NavigationPage>('dashboard');
  const [isMakeCallOpen, setIsMakeCallOpen] = useState(false);

  // Core state
  const [stats, setStats] = useState<any>(null);
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [knowledgeDocs, setKnowledgeDocs] = useState<KnowledgeDocument[]>([]);
  const [settings, setSettings] = useState<SystemSettings>({
    active_academic_year: '2026-27',
    calling_hours_start: '09:00',
    calling_hours_end: '19:00',
    timezone: 'Asia/Kolkata',
    telephony_provider: 'twilio',
    counsellor_phone_number: '+919876543210',
    counsellor_name: 'NMIMS Dhule Admission Cell',
    call_recording_enabled: true,
    consent_announcement_enabled: true,
  });
  const [counsellors, setCounsellors] = useState<CounsellorConfig[]>([]);
  const [currentTimeIST, setCurrentTimeIST] = useState<string>('');
  const [hoursCheck, setHoursCheck] = useState<{ allowed: boolean; reason?: string }>({
    allowed: true,
  });

  // Load initial data
  const fetchData = async () => {
    try {
      const [s, c, l, p, ay, kb, setRes] = await Promise.all([
        api.getDashboardStats().catch(() => null),
        api.getCalls().catch(() => []),
        api.getLeads().catch(() => []),
        api.getPrograms().catch(() => []),
        api.getAcademicYears().catch(() => []),
        api.getKnowledgeDocs().catch(() => []),
        api.getSettings().catch(() => null),
      ]);

      if (s) setStats(s);
      if (c) setCalls(c);
      if (l) setLeads(l);
      if (p) setPrograms(p);
      if (ay) setAcademicYears(ay);
      if (kb) setKnowledgeDocs(kb);
      if (setRes) {
        setSettings(setRes.settings);
        setCounsellors(setRes.counsellors);
        setCurrentTimeIST(setRes.currentTimeIST);
        setHoursCheck(setRes.hoursCheck);
      }
    } catch (e) {
      console.error('Error fetching data:', e);
    }
  };

  useEffect(() => {
    fetchData();

    // WebSocket connection for real-time call updates
    let ws: WebSocket | null = null;
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/calls/feed`;
      ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'CALL_UPDATE') {
            const updatedCall: CallRecord = payload.data;
            setCalls((prev) => {
              const existingIdx = prev.findIndex((c) => c.id === updatedCall.id);
              if (existingIdx >= 0) {
                const next = [...prev];
                next[existingIdx] = updatedCall;
                return next;
              }
              return [updatedCall, ...prev];
            });

            // Update stats
            api.getDashboardStats().then((st) => setStats(st)).catch(() => {});
          }
        } catch (err) {
          // ignore
        }
      };
    } catch (e) {
      console.warn('WebSocket init error:', e);
    }

    return () => {
      if (ws) ws.close();
    };
  }, []);

  const activeCalls = calls.filter(
    (c) =>
      c.status === 'CALLING' ||
      c.status === 'RINGING' ||
      c.status === 'CONNECTED' ||
      c.status === 'AI_SPEAKING' ||
      c.status === 'LISTENING' ||
      c.status === 'PROCESSING' ||
      c.status === 'TRANSFERRING'
  );

  const handleCallInitiated = (newCall: CallRecord) => {
    setCalls((prev) => [newCall, ...prev]);
    setCurrentPage('active-calls');
    api.getDashboardStats().then((st) => setStats(st)).catch(() => {});
  };

  const handleCallUpdated = (updated: CallRecord) => {
    setCalls((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  };

  const handleCallEnded = (callId: string) => {
    setCalls((prev) =>
      prev.map((c) => (c.id === callId ? { ...c, status: 'COMPLETED' } : c))
    );
    api.getDashboardStats().then((st) => setStats(st)).catch(() => {});
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100">
      {/* Navigation Sidebar */}
      <Sidebar
        currentPage={currentPage}
        onNavigate={(p) => {
          if (p === 'make-call') {
            setIsMakeCallOpen(true);
          } else {
            setCurrentPage(p);
          }
        }}
        activeCallsCount={activeCalls.length}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header onOpenMakeCall={() => setIsMakeCallOpen(true)} />

        <main className="flex-1 overflow-y-auto p-6">
          {currentPage === 'dashboard' && (
            <DashboardOverview
              stats={stats}
              recentCalls={calls}
              leads={leads}
              onOpenMakeCall={() => setIsMakeCallOpen(true)}
              onNavigate={setCurrentPage}
            />
          )}

          {currentPage === 'active-calls' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">
                    Live Telephony Voice Monitor
                  </h2>
                  <p className="text-xs text-slate-500">
                    Real-time audio streams, conversational state machine, and live human counsellor handoffs
                  </p>
                </div>
              </div>
              <ActiveCallsMonitor
                activeCalls={activeCalls}
                onCallUpdated={handleCallUpdated}
                onCallEnded={handleCallEnded}
              />
            </div>
          )}

          {currentPage === 'leads' && (
            <LeadsView
              leads={leads}
              onLeadUpdated={(updated) =>
                setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)))
              }
              onInitiateCallToLead={(lead) => {
                setIsMakeCallOpen(true);
              }}
            />
          )}

          {(currentPage === 'call-history' || currentPage === 'transcripts') && (
            <CallHistoryView
              calls={calls}
              onOpenMakeCall={() => setIsMakeCallOpen(true)}
            />
          )}

          {(currentPage === 'programs' || currentPage === 'seats') && (
            <ProgramsMatrix
              programs={programs}
              activeAcademicYear={settings.active_academic_year}
              onProgramUpdated={(updated) =>
                setPrograms((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
              }
            />
          )}

          {currentPage === 'knowledge-base' && (
            <KnowledgeBaseView
              documents={knowledgeDocs}
              onDocumentAdded={(doc) => setKnowledgeDocs((prev) => [doc, ...prev])}
            />
          )}

          {currentPage === 'counsellor-settings' && (
            <CounsellorSettingsView
              counsellors={counsellors}
              settings={settings}
              onSettingsUpdated={setSettings}
            />
          )}
        </main>
      </div>

      {/* Outbound Make Call Dialog */}
      <MakeCallModal
        isOpen={isMakeCallOpen}
        onClose={() => setIsMakeCallOpen(false)}
        onCallInitiated={handleCallInitiated}
        isCallingHoursAllowed={hoursCheck.allowed}
        callingHoursNotice={hoursCheck.reason}
        telephonyProviderName={settings.telephony_provider}
      />
    </div>
  );
}

export default App;
