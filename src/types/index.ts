// ============================================================================
// NMIMS AI Admission Voice Assistant - Core Types & Data Contracts
// ============================================================================

export type SupportedLanguage = 'en' | 'hi' | 'mr';

export type UserType = 'student' | 'parent' | 'unknown';

export type CallStatus =
  | 'QUEUED'
  | 'CALLING'
  | 'RINGING'
  | 'CONNECTED'
  | 'AI_SPEAKING'
  | 'LISTENING'
  | 'PROCESSING'
  | 'TRANSFERRING'
  | 'TRANSFERRED'
  | 'COMPLETED'
  | 'FAILED'
  | 'BUSY'
  | 'NO_ANSWER'
  | 'CANCELLED';

export type CallOutcome =
  | 'INTERESTED'
  | 'NOT_INTERESTED'
  | 'CALLBACK_REQUESTED'
  | 'HUMAN_TRANSFER'
  | 'WRONG_NUMBER'
  | 'NO_RESPONSE'
  | 'COMPLETED'
  | 'TECHNICAL_FAILURE';

export type ConversationState =
  | 'GREETING'
  | 'USER_TYPE'
  | 'LANGUAGE_SELECTION'
  | 'SCHOOL_INTEREST'
  | 'ENGINEERING_INTEREST'
  | 'ACADEMIC_DETAILS_10TH'
  | 'ACADEMIC_DETAILS_12TH'
  | 'ACADEMIC_DETAILS_CET'
  | 'BRANCH_SELECTION'
  | 'SEAT_QUERY'
  | 'DYNAMIC_INFO_SHIELD'
  | 'HUMAN_TRANSFER'
  | 'CALLBACK_SCHEDULING'
  | 'GENERAL_QUESTION'
  | 'COMPLETED';

export interface School {
  id: string;
  name: string;
  short_code: string;
  description: string;
  is_active: boolean;
}

export interface Program {
  id: string;
  school_id: string;
  school_name: string;
  program_name: string;
  degree: string;
  specialization?: string;
  total_seats: number | null; // Null if pending official verified publication
  available_seats: number | null; // Null if pending official verified publication
  academic_year: string;
  admission_status: 'OPEN' | 'CLOSING_SOON' | 'CLOSED' | 'COUNSELLING';
  eligibility: string;
  is_active: boolean;
  last_updated: string;
}

export interface AcademicYear {
  id: string;
  year_name: string; // e.g. "2026-27"
  is_active: boolean;
  start_date: string;
  end_date: string;
  notes?: string;
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  user_type: UserType;
  preferred_language: SupportedLanguage;
  interested_school: string;
  engineering_interest: boolean | null;
  marks_10th?: number | null;
  marks_12th?: number | null;
  cet_percentile?: number | null;
  interested_branch?: string;
  call_status: CallStatus;
  call_outcome: CallOutcome;
  transfer_status: 'NOT_TRANSFERRED' | 'IN_TRANSFER' | 'TRANSFERRED' | 'FAILED';
  last_call_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface TranscriptEntry {
  id: string;
  timestamp: string;
  speaker: 'AI' | 'STUDENT' | 'SYSTEM' | 'COUNSELLOR';
  text: string;
  language?: SupportedLanguage;
}

export interface CallRecord {
  id: string;
  lead_id?: string;
  student_name: string;
  phone_number: string;
  provider: 'twilio' | 'exotel' | 'plivo' | 'browser_demo';
  provider_call_id?: string;
  status: CallStatus;
  outcome: CallOutcome;
  language: SupportedLanguage;
  conversation_state: ConversationState;
  duration_seconds: number;
  start_time: string;
  end_time?: string;
  transferred_to?: string;
  transfer_reason?: string;
  recording_url?: string;
  error_message?: string;
  transcript: TranscriptEntry[];
  lead_data: Partial<Lead>;
}

export interface CounsellorConfig {
  id: string;
  name: string;
  phone_number: string;
  department: string;
  is_active: boolean;
  is_primary_transfer: boolean;
}

export interface CallbackRequest {
  id: string;
  lead_id?: string;
  student_name: string;
  phone_number: string;
  preferred_date: string;
  preferred_time: string;
  reason: string;
  status: 'PENDING' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
  created_at: string;
}

export interface KnowledgeDocument {
  id: string;
  title: string;
  category: 'CAMPUS' | 'HOSTEL' | 'FACULTY' | 'PLACEMENTS' | 'ACCREDITATION' | 'WEBSITE_IMPORT' | 'FACILITIES' | 'LOCATION';
  content: string;
  source_url?: string;
  academic_year: string;
  is_verified: boolean;
  last_verified_at: string;
}

export interface SystemSettings {
  active_academic_year: string;
  calling_hours_start: string; // e.g. "09:00"
  calling_hours_end: string;   // e.g. "19:00"
  timezone: string;            // "Asia/Kolkata"
  telephony_provider: 'twilio' | 'exotel' | 'plivo';
  twilio_account_sid?: string;
  twilio_auth_token?: string;
  twilio_phone_number?: string;
  exotel_account_sid?: string;
  exotel_api_key?: string;
  exotel_api_token?: string;
  exotel_caller_id?: string;
  counsellor_phone_number: string;
  counsellor_name: string;
  call_recording_enabled: boolean;
  consent_announcement_enabled: boolean;
}

export interface VoiceTurnRequest {
  call_id: string;
  user_speech: string;
  detected_language?: SupportedLanguage;
}

export interface VoiceTurnResponse {
  call_id: string;
  ai_speech: string;
  language: SupportedLanguage;
  new_state: ConversationState;
  should_transfer: boolean;
  transfer_phone?: string;
  transfer_reason?: string;
  updated_lead: Partial<Lead>;
  audio_url?: string;
}
