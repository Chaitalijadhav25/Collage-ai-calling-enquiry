// ============================================================================
// NMIMS AI Admission Voice Assistant - Telephony Provider Factory
// ============================================================================

import { ITelephonyProvider } from './provider.interface';
import { TwilioProvider } from './twilio.provider';
import { ExotelProvider } from './exotel.provider';
import { PlivoProvider } from './plivo.provider';

export function getTelephonyProvider(override?: string): ITelephonyProvider {
  const providerName = (override || process.env.TELEPHONY_PROVIDER || 'twilio').toLowerCase();

  switch (providerName) {
    case 'exotel':
      return new ExotelProvider();
    case 'plivo':
      return new PlivoProvider();
    case 'twilio':
    default:
      return new TwilioProvider();
  }
}
