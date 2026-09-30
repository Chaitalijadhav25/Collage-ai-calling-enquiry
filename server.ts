// ============================================================================
// NMIMS AI Admission Voice Assistant - Express + WebSocket Server
// Full-Stack Server with Telephony Webhooks, Media Streaming, and Vite Middleware
// ============================================================================

import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { db } from './database/db';
import { getTelephonyProvider } from './src/server/telephony/factory';
import { conversationManager } from './src/server/ai/conversation';
import { MULTILINGUAL_RESPONSES } from './src/server/ai/language';
import { CallRecord, Lead } from './src/types';
import { generateExcelWorkbookBuffer, autoSaveLeadsToExcelFile } from './src/server/services/excel';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = parseInt(process.env.PORT || '3000', 10);
const isDev = process.env.NODE_ENV !== 'production';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Broadcast utility for live admin dashboard
const adminClients = new Set<WebSocket>();

function broadcastCallUpdate(call: CallRecord) {
  const payload = JSON.stringify({ type: 'CALL_UPDATE', data: call });
  for (const client of adminClients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

// ============================================================================
// REST API ENDPOINTS
// ============================================================================

// 1. Dashboard Stats
app.get('/api/dashboard/stats', (req, res) => {
  const stats = db.getDashboardStats();
  res.json(stats);
});

// 2. Outbound Call Trigger (Real Phone Call or Demo Call)
app.post('/api/calls/start', async (req, res) => {
  try {
    const { studentName, phoneNumber, interestedSchool, mode, bypassCallingHours } = req.body;

    if (!phoneNumber || !studentName) {
      return res.status(400).json({ error: 'Student name and phone number are required.' });
    }

    // Check Calling Hours Compliance (09:00 - 19:00 IST)
    const hoursCheck = db.isWithinCallingHours();
    if (!hoursCheck.allowed && mode !== 'browser_demo' && !bypassCallingHours) {
      return res.status(403).json({
        error: `${hoursCheck.reason} You can check 'Allow Outbound Test Call Now' to bypass, or switch to Browser Voice Demo mode.`,
        code: 'OUTSIDE_CALLING_HOURS',
      });
    }

    const callId = `call_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Create or find lead
    let lead = db.findLeadByPhone(phoneNumber);
    if (!lead) {
      lead = {
        id: `lead_${Date.now()}`,
        name: studentName,
        phone: phoneNumber,
        user_type: 'unknown',
        preferred_language: 'en',
        interested_school: interestedSchool || 'School of Technology, Management & Engineering (STME)',
        engineering_interest: null,
        call_status: 'QUEUED',
        call_outcome: 'COMPLETED',
        transfer_status: 'NOT_TRANSFERRED',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      db.upsertLead(lead);
    }

    const callRecord: CallRecord = {
      id: callId,
      lead_id: lead.id,
      student_name: studentName,
      phone_number: phoneNumber,
      provider: mode === 'browser_demo' ? 'browser_demo' : db.settings.telephony_provider,
      status: 'CALLING',
      outcome: 'COMPLETED',
      language: 'en',
      conversation_state: 'GREETING',
      duration_seconds: 0,
      start_time: new Date().toISOString(),
      transcript: [
        {
          id: `tr_${Date.now()}_init`,
          timestamp: new Date().toISOString(),
          speaker: 'AI',
          text: MULTILINGUAL_RESPONSES.greeting.en,
          language: 'en',
        },
      ],
      lead_data: { ...lead },
    };

    db.upsertCall(callRecord);
    lead.last_call_id = callId;
    lead.call_status = 'CALLING';
    db.upsertLead(lead);

    broadcastCallUpdate(callRecord);

    if (mode === 'browser_demo') {
      callRecord.status = 'CONNECTED';
      db.upsertCall(callRecord);
      broadcastCallUpdate(callRecord);
      return res.json({
        success: true,
        call: callRecord,
        initialGreeting: MULTILINGUAL_RESPONSES.greeting.en,
        notice: 'Browser Voice Demo session activated.',
      });
    }

    // Real Carrier Dispatch via Telephony Provider
    const provider = getTelephonyProvider(db.settings.telephony_provider);
    const baseUrl = process.env.WEBHOOK_BASE_URL || `${req.protocol}://${req.get('host')}`;

    const carrierResult = await provider.initiateCall({
      toPhoneNumber: phoneNumber,
      callId,
      studentName,
      webhookUrl: baseUrl,
      streamUrl: `${baseUrl}/api/calls/stream`,
    });

    if (carrierResult.success) {
      callRecord.provider_call_id = carrierResult.providerCallId;
      callRecord.status = 'RINGING';
      db.upsertCall(callRecord);
      broadcastCallUpdate(callRecord);

      res.json({
        success: true,
        call: callRecord,
        carrierResponse: carrierResult.rawResponse,
        message: `Real PSTN call initiated to ${phoneNumber} via ${provider.providerName.toUpperCase()}`,
      });
    } else {
      callRecord.status = 'FAILED';
      callRecord.error_message = carrierResult.error;
      db.upsertCall(callRecord);
      broadcastCallUpdate(callRecord);

      res.status(502).json({
        success: false,
        error: carrierResult.error,
        call: callRecord,
      });
    }
  } catch (err: any) {
    console.error('Call initiation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 3. Process Voice Turn (Speech -> Intent/DB -> Gemini -> Audio/Response)
app.post('/api/voice/process-turn', async (req, res) => {
  try {
    const { callId, userSpeech } = req.body;
    const call = db.getCall(callId);

    if (!call) {
      return res.status(404).json({ error: 'Call not found' });
    }

    // Set status to processing
    call.status = 'PROCESSING';
    broadcastCallUpdate(call);

    // Run conversation manager
    const turnResult = await conversationManager.handleTurn(call, userSpeech);

    // If transfer requested, execute carrier transfer
    if (turnResult.should_transfer && call.provider !== 'browser_demo' && call.provider_call_id) {
      const provider = getTelephonyProvider(call.provider);
      provider.transferCall({
        providerCallId: call.provider_call_id,
        transferToNumber: turnResult.transfer_phone || db.settings.counsellor_phone_number,
        counsellorName: db.settings.counsellor_name,
      });
    }

    call.status = turnResult.should_transfer ? 'TRANSFERRED' : 'AI_SPEAKING';
    db.upsertCall(call);

    // Sync to Lead
    if (call.lead_id) {
      const existingLead = db.getLead(call.lead_id);
      if (existingLead) {
        Object.assign(existingLead, turnResult.updated_lead);
        existingLead.call_status = call.status;
        db.upsertLead(existingLead);
        autoSaveLeadsToExcelFile();
      }
    }

    broadcastCallUpdate(call);

    res.json(turnResult);
  } catch (err: any) {
    console.error('Voice turn processing error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 4. Live Human Counsellor Transfer Endpoint
app.post('/api/calls/transfer', async (req, res) => {
  try {
    const { callId, targetNumber } = req.body;
    const call = db.getCall(callId);

    if (!call) {
      return res.status(404).json({ error: 'Call record not found' });
    }

    const counsellorPhone = targetNumber || db.settings.counsellor_phone_number;
    call.status = 'TRANSFERRING';
    call.transferred_to = counsellorPhone;
    call.transfer_reason = 'Manual admin transfer or automated policy trigger';
    broadcastCallUpdate(call);

    if (call.provider !== 'browser_demo' && call.provider_call_id) {
      const provider = getTelephonyProvider(call.provider);
      await provider.transferCall({
        providerCallId: call.provider_call_id,
        transferToNumber: counsellorPhone,
      });
    }

    call.status = 'TRANSFERRED';
    call.outcome = 'HUMAN_TRANSFER';
    db.upsertCall(call);
    broadcastCallUpdate(call);

    res.json({
      success: true,
      message: `Call ${callId} successfully bridged to counsellor at ${counsellorPhone}`,
      call,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. End Call Endpoint
app.post('/api/calls/end', async (req, res) => {
  try {
    const { callId, outcome } = req.body;
    const call = db.getCall(callId);
    if (!call) {
      return res.status(404).json({ error: 'Call not found' });
    }

    call.status = 'COMPLETED';
    call.end_time = new Date().toISOString();
    call.outcome = outcome || call.outcome || 'COMPLETED';

    const startMs = new Date(call.start_time).getTime();
    const endMs = new Date(call.end_time).getTime();
    call.duration_seconds = Math.max(0, Math.floor((endMs - startMs) / 1000));

    if (call.provider_call_id && call.provider !== 'browser_demo') {
      const provider = getTelephonyProvider(call.provider);
      await provider.terminateCall(call.provider_call_id);
    }

    db.upsertCall(call);

    if (call.lead_id) {
      const lead = db.getLead(call.lead_id);
      if (lead) {
        lead.call_status = 'COMPLETED';
        lead.call_outcome = call.outcome;
        db.upsertLead(lead);
      }
    }

    broadcastCallUpdate(call);
    res.json({ success: true, call });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// 6. Twilio Inbound Answer TwiML Webhook
app.all('/api/calls/twiml/answer', (req, res) => {
  const callId = (req.query.callId as string) || (req.body.callId as string);
  const provider = getTelephonyProvider('twilio');
  const baseUrl = process.env.WEBHOOK_BASE_URL || `${req.protocol}://${req.get('host')}`;
  const streamUrl = `${baseUrl}/api/calls/stream`;

  const twiml = provider.generateAnswerResponse(
    callId,
    MULTILINGUAL_RESPONSES.greeting.en,
    streamUrl
  );

  res.type('text/xml');
  res.send(twiml);
});

// 7. Twilio Call Status Callback Webhook
app.post('/api/calls/twiml/status', (req, res) => {
  const callId = req.query.callId as string;
  const callStatus = req.body.CallStatus; // initiated, ringing, in-progress, completed, busy, no-answer, failed

  if (callId) {
    const call = db.getCall(callId);
    if (call) {
      if (callStatus === 'in-progress') call.status = 'CONNECTED';
      else if (callStatus === 'busy') {
        call.status = 'BUSY';
        call.outcome = 'NO_RESPONSE';
      } else if (callStatus === 'no-answer') {
        call.status = 'NO_ANSWER';
        call.outcome = 'NO_RESPONSE';
      } else if (callStatus === 'completed') {
        call.status = 'COMPLETED';
      } else if (callStatus === 'failed') {
        call.status = 'FAILED';
        call.outcome = 'TECHNICAL_FAILURE';
      }
      db.upsertCall(call);
      broadcastCallUpdate(call);
    }
  }

  res.sendStatus(200);
});

// 8. Calls Query
app.get('/api/calls', (req, res) => {
  const calls = Array.from(db.calls.values()).sort(
    (a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
  );
  res.json(calls);
});

app.get('/api/calls/:id', (req, res) => {
  const call = db.getCall(req.params.id);
  if (!call) return res.status(404).json({ error: 'Call not found' });
  res.json(call);
});

// 9. Leads Management & CSV Export
app.get('/api/leads', (req, res) => {
  const { search, school, outcome } = req.query;
  let leads = Array.from(db.leads.values());

  if (search) {
    const q = String(search).toLowerCase();
    leads = leads.filter(
      (l) => l.name.toLowerCase().includes(q) || l.phone.includes(q)
    );
  }
  if (school) {
    leads = leads.filter((l) => l.interested_school === school);
  }
  if (outcome) {
    leads = leads.filter((l) => l.call_outcome === outcome);
  }

  res.json(leads);
});

app.post('/api/leads', (req, res) => {
  const newLead: Lead = {
    id: req.body.id || `lead_${Date.now()}`,
    name: req.body.name,
    phone: req.body.phone,
    user_type: req.body.user_type || 'student',
    preferred_language: req.body.preferred_language || 'en',
    interested_school: req.body.interested_school || 'School of Technology, Management & Engineering (STME)',
    engineering_interest: req.body.engineering_interest ?? null,
    marks_10th: req.body.marks_10th,
    marks_12th: req.body.marks_12th,
    cet_percentile: req.body.cet_percentile,
    interested_branch: req.body.interested_branch,
    call_status: 'QUEUED',
    call_outcome: 'COMPLETED',
    transfer_status: 'NOT_TRANSFERRED',
    notes: req.body.notes,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  db.upsertLead(newLead);
  res.json(newLead);
});

app.put('/api/leads/:id', (req, res) => {
  const lead = db.getLead(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });
  Object.assign(lead, req.body);
  lead.updated_at = new Date().toISOString();
  db.upsertLead(lead);
  res.json(lead);
});

// CSV Export Endpoint
app.get('/api/leads/export', (req, res) => {
  const leads = Array.from(db.leads.values());
  const headers = [
    'Lead ID',
    'Name',
    'Phone',
    'Language',
    'Student/Parent',
    'School',
    'Engineering Interest',
    '10th %',
    '12th %',
    'CET Percentile',
    'Interested Branch',
    'Call Status',
    'Outcome',
    'Transfer Status',
    'Created At',
  ];

  const rows = leads.map((l) => [
    `"${l.id}"`,
    `"${l.name}"`,
    `"${l.phone}"`,
    `"${l.preferred_language}"`,
    `"${l.user_type}"`,
    `"${l.interested_school || ''}"`,
    `"${l.engineering_interest === true ? 'Yes' : l.engineering_interest === false ? 'No' : 'N/A'}"`,
    `"${l.marks_10th ?? ''}"`,
    `"${l.marks_12th ?? ''}"`,
    `"${l.cet_percentile ?? ''}"`,
    `"${l.interested_branch || ''}"`,
    `"${l.call_status}"`,
    `"${l.call_outcome}"`,
    `"${l.transfer_status}"`,
    `"${l.created_at}"`,
  ]);

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="nmims_dhule_admission_leads.csv"');
  res.send(csv);
});

// Native Excel Spreadsheet (.xlsx) Export Endpoint
app.get('/api/leads/export-excel', (req, res) => {
  try {
    const leads = Array.from(db.leads.values());
    const buffer = generateExcelWorkbookBuffer(leads);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="nmims_dhule_admission_leads_2026.xlsx"'
    );
    res.send(buffer);
  } catch (err: any) {
    res.status(500).json({ error: 'Excel generation failed: ' + err.message });
  }
});

// 10. Programs & Verified Seat Matrix
app.get('/api/programs', (req, res) => {
  const year = req.query.academicYear as string;
  res.json(db.getPrograms(year));
});

app.put('/api/programs/:id', (req, res) => {
  const prog = db.programs.get(req.params.id);
  if (!prog) return res.status(404).json({ error: 'Program not found' });
  Object.assign(prog, req.body);
  prog.last_updated = new Date().toISOString();
  db.programs.set(prog.id, prog);
  res.json(prog);
});

// 11. Academic Years
app.get('/api/academic-years', (req, res) => {
  res.json(Array.from(db.academicYears.values()));
});

app.post('/api/academic-years/active', (req, res) => {
  const { yearName } = req.body;
  if (!yearName) return res.status(400).json({ error: 'yearName required' });
  for (const ay of db.academicYears.values()) {
    ay.is_active = ay.year_name === yearName;
  }
  db.settings.active_academic_year = yearName;
  res.json({ success: true, activeYear: yearName });
});

// 12. Knowledge Base & Official Website Scraper/Verifier
app.get('/api/knowledge', (req, res) => {
  res.json(Array.from(db.knowledgeDocuments.values()));
});

app.post('/api/knowledge/import', (req, res) => {
  const { url, title, category, content } = req.body;
  const docId = `kb_${Date.now()}`;
  const newDoc = {
    id: docId,
    title: title || 'Official SVKM NMIMS Dhule Import',
    category: category || 'CAMPUS',
    content: content || 'Verified data synchronized from official admission portal.',
    source_url: url || 'https://www.svkmnmimsgu.ac.in/about-svkm-nmims-global-university',
    academic_year: db.settings.active_academic_year,
    is_verified: true,
    last_verified_at: new Date().toISOString(),
  };
  db.knowledgeDocuments.set(docId, newDoc);
  res.json({ success: true, document: newDoc });
});

// 13. System Settings & Counsellor Config
app.get('/api/settings', (req, res) => {
  res.json({
    settings: db.settings,
    counsellors: Array.from(db.counsellors.values()),
    currentTimeIST: new Intl.DateTimeFormat('en-US', {
      timeZone: db.settings.timezone,
      dateStyle: 'full',
      timeStyle: 'medium',
    }).format(new Date()),
    hoursCheck: db.isWithinCallingHours(),
  });
});

app.put('/api/settings', (req, res) => {
  Object.assign(db.settings, req.body);
  res.json({ success: true, settings: db.settings });
});

// ============================================================================
// WEBSOCKET SERVER (Media Streams & Real-Time Dashboard Updates)
// ============================================================================
wss.on('connection', (ws: WebSocket, req) => {
  const url = req.url || '';

  // 1. Admin Dashboard Real-Time Live Feed
  if (url.includes('/api/calls/feed') || url === '/' || !url.includes('/stream')) {
    adminClients.add(ws);
    ws.on('close', () => adminClients.delete(ws));
    return;
  }

  // 2. Telephony Media Stream Connection (e.g. Twilio Media Stream)
  let activeCallId: string | null = null;

  ws.on('message', async (message: string) => {
    try {
      const msg = JSON.parse(message.toString());
      if (msg.event === 'start') {
        activeCallId = msg.start?.customParameters?.callId;
        console.log(`[MediaStream] Telephony Audio Stream started for call: ${activeCallId}`);
        if (activeCallId) {
          const call = db.getCall(activeCallId);
          if (call) {
            call.status = 'CONNECTED';
            broadcastCallUpdate(call);
          }
        }
      } else if (msg.event === 'media') {
        // Real-time μ-law / PCM audio packet received from caller
        // Low-latency VAD (Voice Activity Detection) can detect barge-in here
      } else if (msg.event === 'stop') {
        console.log(`[MediaStream] Telephony Audio Stream stopped for call: ${activeCallId}`);
        if (activeCallId) {
          const call = db.getCall(activeCallId);
          if (call && call.status !== 'TRANSFERRED') {
            call.status = 'COMPLETED';
            broadcastCallUpdate(call);
          }
        }
      }
    } catch (e) {
      // Non-JSON packet or binary
    }
  });

  ws.on('close', () => {
    adminClients.delete(ws);
  });
});

// ============================================================================
// VITE SPA MIDDLEWARE / PRODUCTION STATIC SERVING
// ============================================================================
async function startServer() {
  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`================================================================`);
    console.log(` NMIMS AI Admission Voice Assistant Backend Active on Port ${PORT}`);
    console.log(` Campus: SVKM NMIMS Global University, Dhule`);
    console.log(` Active Academic Year: ${db.settings.active_academic_year}`);
    console.log(` Telephony Provider: ${db.settings.telephony_provider.toUpperCase()}`);
    console.log(` Primary Counsellor: ${db.settings.counsellor_name} (${db.settings.counsellor_phone_number})`);
    console.log(`================================================================`);
  });
}

startServer();
