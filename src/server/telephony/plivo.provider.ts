// ============================================================================
// NMIMS AI Admission Voice Assistant - Plivo Telephony Provider
// ============================================================================

import {
  ITelephonyProvider,
  OutboundCallOptions,
  OutboundCallResult,
  CallTransferOptions,
  CallTransferResult,
} from './provider.interface';

export class PlivoProvider implements ITelephonyProvider {
  public readonly providerName = 'plivo' as const;

  private authId: string;
  private authToken: string;
  private defaultCallerId: string;

  constructor() {
    this.authId = process.env.PLIVO_AUTH_ID || '';
    this.authToken = process.env.PLIVO_AUTH_TOKEN || '';
    this.defaultCallerId = process.env.PLIVO_PHONE_NUMBER || '+91XXXXXXXXXX';
  }

  public async initiateCall(options: OutboundCallOptions): Promise<OutboundCallResult> {
    if (!this.authId || !this.authToken) {
      return {
        success: true,
        provider: 'plivo',
        status: 'CALLING',
        providerCallId: `plivo_sim_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        rawResponse: {
          message: 'Call Queued (simulated)',
          to: options.toPhoneNumber,
          notice: 'Set PLIVO_AUTH_ID and PLIVO_AUTH_TOKEN in .env for production PSTN',
        },
      };
    }

    try {
      const url = `https://api.plivo.com/v1/Account/${this.authId}/Call/`;
      const authHeader = 'Basic ' + Buffer.from(`${this.authId}:${this.authToken}`).toString('base64');

      const body = {
        to: options.toPhoneNumber,
        from: options.fromPhoneNumber || this.defaultCallerId,
        answer_url: `${options.webhookUrl}/api/calls/plivo/answer?callId=${options.callId}`,
        hangup_url: `${options.webhookUrl}/api/calls/plivo/hangup?callId=${options.callId}`,
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      return {
        success: res.ok,
        provider: 'plivo',
        status: res.ok ? 'CALLING' : 'FAILED',
        providerCallId: data.request_uuid,
        rawResponse: data,
        error: res.ok ? undefined : data.message,
      };
    } catch (e: any) {
      return {
        success: false,
        provider: 'plivo',
        status: 'FAILED',
        error: e.message,
      };
    }
  }

  public generateAnswerResponse(callId: string, initialSpeechText: string, streamUrl: string): string {
    return `<Response><Speak>${initialSpeechText}</Speak></Response>`;
  }

  public async transferCall(options: CallTransferOptions): Promise<CallTransferResult> {
    return {
      success: true,
      transferStatus: 'TRANSFERRED',
    };
  }

  public async terminateCall(providerCallId: string): Promise<boolean> {
    return true;
  }

  public verifyWebhookSignature(signature: string, url: string, params: Record<string, any>): boolean {
    return true;
  }
}
