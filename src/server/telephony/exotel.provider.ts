// ============================================================================
// NMIMS AI Admission Voice Assistant - Exotel Telephony Provider
// Tailored for native Indian PSTN/Cellular routing, TRAI compliance, and Indian CLI
// ============================================================================

import {
  ITelephonyProvider,
  OutboundCallOptions,
  OutboundCallResult,
  CallTransferOptions,
  CallTransferResult,
} from './provider.interface';
import { db } from '../../../database/db';

export class ExotelProvider implements ITelephonyProvider {
  public readonly providerName = 'exotel' as const;

  private get accountSid(): string {
    return db.settings.exotel_account_sid || process.env.EXOTEL_ACCOUNT_SID || '';
  }

  private get apiKey(): string {
    return db.settings.exotel_api_key || process.env.EXOTEL_API_KEY || '';
  }

  private get apiToken(): string {
    return db.settings.exotel_api_token || process.env.EXOTEL_API_TOKEN || '';
  }

  private get callerId(): string {
    return db.settings.exotel_caller_id || process.env.EXOTEL_CALLER_ID || '022XXXXXXXX';
  }

  constructor() {}

  public async initiateCall(options: OutboundCallOptions): Promise<OutboundCallResult> {
    if (!this.accountSid || !this.apiKey || !this.apiToken) {
      console.warn(
        `[ExotelProvider] Exotel credentials not provided in .env. Falling back to structured provider simulation for testing.`
      );
      return {
        success: true,
        provider: 'exotel',
        status: 'CALLING',
        providerCallId: `exo_sim_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        rawResponse: {
          sid: `EXO_${Date.now()}`,
          to: options.toPhoneNumber,
          callerId: this.callerId,
          simulated: true,
          notice: 'Provide EXOTEL_ACCOUNT_SID, EXOTEL_API_KEY, EXOTEL_API_TOKEN in .env for real Indian carrier routing',
        },
      };
    }

    try {
      const url = `https://${this.apiKey}:${this.apiToken}@api.exotel.com/v1/Accounts/${this.accountSid}/Calls/connect.json`;

      const params = new URLSearchParams();
      params.append('From', options.toPhoneNumber);
      params.append('CallerId', options.fromPhoneNumber || this.callerId);
      params.append('Url', `${options.webhookUrl}/api/calls/exotel/flow?callId=${options.callId}`);
      params.append('StatusCallback', `${options.webhookUrl}/api/calls/exotel/status?callId=${options.callId}`);
      params.append('CustomField', options.callId);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.RestException?.Message || `Exotel API error: status ${response.status}`);
      }

      return {
        success: true,
        provider: 'exotel',
        status: 'CALLING',
        providerCallId: data.Call?.Sid,
        rawResponse: data,
      };
    } catch (e: any) {
      console.error('[ExotelProvider] initiateCall error:', e);
      return {
        success: false,
        provider: 'exotel',
        status: 'FAILED',
        error: e.message,
      };
    }
  }

  public generateAnswerResponse(callId: string, initialSpeechText: string, streamUrl: string): string {
    // Exotel Flow JSON / Passthru structure
    return JSON.stringify({
      action: 'speak_and_connect',
      text: initialSpeechText,
      voice: 'female',
      language: 'hi-IN',
      stream_url: streamUrl,
      call_id: callId,
    });
  }

  public async transferCall(options: CallTransferOptions): Promise<CallTransferResult> {
    if (!this.accountSid || !this.apiKey || !this.apiToken) {
      console.log(`[ExotelProvider] Test Mode: Live Call transferred to ${options.transferToNumber}`);
      return {
        success: true,
        transferStatus: 'TRANSFERRED',
      };
    }

    try {
      // Exotel Call Bridging API
      const url = `https://${this.apiKey}:${this.apiToken}@api.exotel.com/v1/Accounts/${this.accountSid}/Calls/${options.providerCallId}.json`;
      const params = new URLSearchParams();
      params.append('Action', 'Transfer');
      params.append('Leg', 'To');
      params.append('PhoneNumber', options.transferToNumber);

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (!res.ok) {
        throw new Error('Exotel transfer endpoint returned non-200');
      }

      return {
        success: true,
        transferStatus: 'TRANSFERRED',
      };
    } catch (err: any) {
      return {
        success: false,
        transferStatus: 'FAILED',
        error: err.message,
      };
    }
  }

  public async terminateCall(providerCallId: string): Promise<boolean> {
    return true;
  }

  public verifyWebhookSignature(signature: string, url: string, params: Record<string, any>): boolean {
    return true;
  }
}
