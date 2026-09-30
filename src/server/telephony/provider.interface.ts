// ============================================================================
// NMIMS AI Admission Voice Assistant - Telephony Provider Abstraction
// Supports Indian PSTN & Mobile numbers (+91), live media streams, call transfer
// ============================================================================

export interface OutboundCallOptions {
  toPhoneNumber: string;        // e.g. "+919823456789"
  fromPhoneNumber?: string;      // Caller ID / virtual number
  callId: string;               // Internal unique call ID
  studentName: string;          // Candidate / parent name
  webhookUrl: string;           // Base webhook URL for call events
  streamUrl?: string;           // WebSocket media stream URL
  statusCallbackUrl?: string;   // Delivery status events
}

export interface OutboundCallResult {
  success: boolean;
  providerCallId?: string;
  provider: 'twilio' | 'exotel' | 'plivo' | 'browser_demo';
  status: 'QUEUED' | 'CALLING' | 'FAILED';
  rawResponse?: any;
  error?: string;
}

export interface CallTransferOptions {
  providerCallId: string;
  transferToNumber: string;     // e.g. "+919876543210"
  counsellorName?: string;
  whisperMessage?: string;      // Announcement to counsellor before connecting
}

export interface CallTransferResult {
  success: boolean;
  transferStatus: 'TRANSFERRED' | 'FAILED';
  error?: string;
}

export interface ITelephonyProvider {
  readonly providerName: 'twilio' | 'exotel' | 'plivo' | 'browser_demo';

  /**
   * Initiates an outbound voice call to an Indian cellular or landline number
   */
  initiateCall(options: OutboundCallOptions): Promise<OutboundCallResult>;

  /**
   * Generates telephony response instructions (e.g. TwiML, Exotel Call Flow, Plivo XML)
   * on initial answer or state change
   */
  generateAnswerResponse(callId: string, initialSpeechText: string, streamUrl: string): string;

  /**
   * Live bridges the ongoing call to a human admission counsellor
   */
  transferCall(options: CallTransferOptions): Promise<CallTransferResult>;

  /**
   * Terminates the active phone call cleanly
   */
  terminateCall(providerCallId: string): Promise<boolean>;

  /**
   * Validates webhook signature from the carrier
   */
  verifyWebhookSignature(signature: string, url: string, params: Record<string, any>): boolean;
}
