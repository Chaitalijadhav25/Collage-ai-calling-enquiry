# NMIMS AI Admission Voice Assistant
**Autonomous PSTN Voice Agent & Admission Management System for SVKM NMIMS Global University, Dhule**

---

## 1. Project Overview

The **NMIMS AI Admission Voice Assistant** is an end-to-end, production-grade telephone calling and admission intelligence platform designed specifically for **SVKM NMIMS Global University, Dhule Campus**. 

Rather than a text-based chatbot, this system conducts **real two-way voice telephone calls to Indian mobile numbers (+91)**. It converses naturally in **English, Hindi, and Marathi**, qualifies student interests across engineering and other schools, queries verified seat counts directly from the university database, protects sensitive dynamic policies (fees, cutoffs, deadlines) from AI hallucination, and **transfers live calls to human admission counsellors** in real time.

---

## 2. Core Architecture

```
                                 [ Indian Cellular Network ]
                                              │ PSTN / Mobile (+91)
                                              ▼
                         [ Carrier Gateway: Exotel / Twilio / Plivo ]
                                 │ Webhooks & Audio Stream (WebSocket)
                                 ▼
                     ┌──────────────────────────────────────────────┐
                     │           Node.js / Express Server           │
                     │  - Outbound Caller Dispatch Engine           │
                     │  - WebSocket Telephony Media Stream          │
                     │  - Realtime Admin Live Event Feed            │
                     └──────────────────────┬───────────────────────┘
                                            │
                     ┌──────────────────────┴───────────────────────┐
                     │         Multilingual Voice AI Pipeline       │
                     │  1. Streaming Speech-to-Text                 │
                     │  2. Dynamic Spoken Language Detector         │
                     │     (English / हिन्दी / मराठी)              │
                     │  3. 11-State Conversational State Machine    │
                     │  4. Verified SQL / Database Query Engine     │
                     │  5. Dynamic Info Shield (Fees & Cutoffs)     │
                     │  6. Google Gemini 3.8 Flash Reasoning Engine │
                     │  7. Text-to-Speech (TTS) Indian Synthesis    │
                     │  8. Live Call Transfer Dispatcher (<Dial>)   │
                     └──────────────────────┬───────────────────────┘
                                            │
               ┌────────────────────────────┴─────────────────────────────┐
               ▼                                                          ▼
   [ Verified Database & RAG ]                                [ Human Admission Counsellor ]
   - School of Technology (STME)                              - Direct PSTN Call Bridging
   - School of Commerce (SOC)                                 - Counsellor Mobile / Landline
   - School of Pharmacy (SPTM)                                - No Disconnection of Candidate
   - Verified Seat Matrix (60 seats/prog)
```

---

## 3. Supported Schools & Verified Programs (Dhule Campus)

1. **School of Technology, Management & Engineering (STME)**:
   - B.Tech in Computer Engineering
   - B.Tech in CSE (Artificial Intelligence & Machine Learning)
   - B.Tech in CSE (Data Science)
   - B.Tech in Information Technology
   - B.Tech in Mechanical Engineering
   - B.Tech in Civil Engineering
   - B.Tech in Electrical Engineering
2. **School of Commerce (SOC)**:
   - BBA (Bachelor of Business Administration)
   - B.Com (Hons.)
3. **School of Pharmacy & Technology Management (SPTM)**:
   - B.Pharm + MBA (Pharma Tech) Dual Degree (5 Years)
   - B.Pharm (Bachelor of Pharmacy)

---

## 4. Key Capabilities & Behavioral Rules

- **Spoken Language Detection**: Detects spoken phrasing without keypad prompts.
  - *"Marathi madhe bola"* $\rightarrow$ switches immediately to Marathi voice and semantics.
  - *"Hindi mein baat kijiye"* $\rightarrow$ switches to Hindi.
  - *"English is fine"* $\rightarrow$ switches to English.
- **Dynamic Information Shielding**: Sensitive dynamic data (fees, cutoffs, deadlines, scholarships) are never hallucinated. The assistant acknowledges the question and states:
  > *"The fee structure and cutoffs change each academic year. I will connect you right away with an admission counsellor who can provide the latest verified details. Please stay on the line."*
- **Live Human Call Transfer**: When triggered, the carrier bridges the active live call directly to `COUNSELLOR_PHONE_NUMBER` using `<Dial>` / Exotel call bridging.
- **Calling Hours Window**: Strictly enforces **09:00 to 19:00 IST** (`Asia/Kolkata`). Any attempt to call outside permitted hours is converted into a scheduled callback request.
- **Seat Queries**: Answers live from database records (e.g. *"Computer Engineering has 60 total seats, and 18 seats are currently available"*).

---

## 5. Telephony Provider Setup for Indian Calling

### Provider Abstraction
The system provides a unified `ITelephonyProvider` abstraction supporting:
- **Exotel**: Recommended for Indian enterprise production (direct TRAI/DoT compliance, Indian virtual DID, local Indian media servers).
- **Twilio**: Ideal for rapid prototyping and global SIP routing with bi-directional `<Connect><Stream>` WebSocket audio.
- **Plivo**: Alternative enterprise voice carrier.
- **Browser Voice Demo**: Development audio test harness inside the Admin UI for zero-cost testing.

### Environment Variables
Configure `.env` using `.env.example`:
```bash
# Server & Ports
PORT=3000
NODE_ENV=development

# Google Gemini API
GEMINI_API_KEY=your_gemini_api_key_here

# Telephony Carrier (twilio | exotel | plivo)
TELEPHONY_PROVIDER=twilio

# Twilio Credentials (if TELEPHONY_PROVIDER=twilio)
TWILIO_ACCOUNT_SID=ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1XXXXXXXXXX

# Exotel Credentials (if TELEPHONY_PROVIDER=exotel)
EXOTEL_ACCOUNT_SID=your_exotel_sid
EXOTEL_API_KEY=your_exotel_api_key
EXOTEL_API_TOKEN=your_exotel_api_token
EXOTEL_CALLER_ID=022XXXXXXXX

# Human Admission Counsellor Transfer
COUNSELLOR_PHONE_NUMBER=+919876543210
COUNSELLOR_NAME=NMIMS Dhule Admission Cell

# Calling Hours
CALLING_HOURS_START=09:00
CALLING_HOURS_END=19:00
CALLING_TIMEZONE=Asia/Kolkata
```

---

## 6. Local Development & Running

### Prerequisites
- Node.js $\ge 20.x$
- npm $\ge 10.x$

### Setup & Launch
```bash
# 1. Install dependencies
npm install

# 2. Copy environment variables
cp .env.example .env

# 3. Start full-stack dev server (Express + WebSocket + Vite)
npm run dev
```

Open your browser at `http://localhost:3000`.

---

## 7. Carrier Webhook Routing

When deploying to a public server (or using an HTTPS tunnel like ngrok during local development):

| Webhook Route | Purpose | Carrier Event |
| :--- | :--- | :--- |
| `POST /api/calls/start` | Initiates real outbound cellular call | Admin UI Dispatch |
| `POST /api/calls/twiml/answer` | Answers call with TwiML greeting & connects stream | Twilio Inbound Answer |
| `POST /api/calls/twiml/status` | Receives carrier ring/answer/hangup status | Twilio Status Callback |
| `WS /api/calls/stream` | Bidirectional μ-law / PCM audio streaming | Twilio Media Stream |
| `POST /api/calls/transfer` | Bridges the active call to the human counsellor | Admin or Automated Policy |
| `POST /api/calls/end` | Hangs up and finalizes call transcript & outcome | End Call |

---

## 8. Admin Dashboard Features

1. **Dashboard Overview**: 8 key cards (Total Leads, Calls Today, Successful, Missed, Interested, Engineering, Human Transfers, Completed).
2. **Make Call**: Outbound dialer supporting Real Phone Call (PSTN) and Browser Voice Demo.
3. **Active Calls Monitor**: Real-time status visualizer (`CALLING`, `CONNECTED`, `AI_SPEAKING`, `TRANSFERRING`), audio soundwave animation, and verbatim dialogue feed.
4. **Leads Directory**: Full candidate search, school filtering, outcome tracking, and 1-click CSV export.
5. **Call History & Transcripts**: Verbatim historical transcripts of every candidate conversation.
6. **Seat Matrix Editor**: Live database seat matrix editor for all engineering, commerce, and pharmacy branches.
7. **Academic Year Switcher**: Switch between active academic cycles (e.g. 2026-27).
8. **Knowledge Base**: Verified Dhule campus documents and official portal importer.
9. **Counsellor Settings**: Configurable `COUNSELLOR_PHONE_NUMBER` destination.
10. **Telephony & API**: Provider switcher, calling hours configuration, and webhook status.

---

## 9. Verification & Automated Tests

A dedicated test suite validates language detection, conversation state transitions, seat queries, and dynamic fee shields:
```bash
npm run test
```
