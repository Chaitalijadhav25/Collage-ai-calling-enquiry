// ============================================================================
// NMIMS AI Admission Voice Assistant - Robust Speech Synthesis Player
// Fixes browser speech audio playback, Indian accent selection, and Chrome GC bug
// ============================================================================

import { SupportedLanguage } from '../types';

let activeUtterance: SpeechSynthesisUtterance | null = null;
let voicesLoaded = false;
let availableVoices: SpeechSynthesisVoice[] = [];

// Initialize voices eagerly
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  const loadVoices = () => {
    availableVoices = window.speechSynthesis.getVoices();
    if (availableVoices.length > 0) {
      voicesLoaded = true;
    }
  };

  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
}

/**
 * Checks if a voice is a female voice based on platform naming conventions
 */
function isFemaleVoice(v: SpeechSynthesisVoice): boolean {
  const name = v.name.toLowerCase();
  const uri = (v.voiceURI || '').toLowerCase();
  const combined = `${name} ${uri}`;

  const MALE_INDICATORS = /\b(male|david|mark|george|ravi|hemant|madhav|pradeep|tarun|ajay|sunil|rishi|tom|daniel|oliver|arthur|alex|fred|guy)\b/i;
  if (MALE_INDICATORS.test(combined)) {
    return false;
  }

  const FEMALE_INDICATORS = /\b(female|woman|zira|swara|kalpana|aarohi|veena|heera|neerja|samantha|victoria|karen|serena|moira|fiona|tessa|priya|aditi|lekha|sangeeta|geeta|shweta|ava|allison|susan|kathy|vicki|natasha)\b/i;
  if (FEMALE_INDICATORS.test(combined)) {
    return true;
  }

  // Google voices often mark female without explicit tag (e.g. "Google हिन्दी", "Google UK English Female")
  if (combined.includes('female')) return true;

  // If not explicitly male, treat neutral/standard voices as acceptable fallback
  return !MALE_INDICATORS.test(combined);
}

/**
 * Finds the best natural female voice matching language
 */
function getBestVoiceForLanguage(lang: SupportedLanguage): SpeechSynthesisVoice | null {
  if (!availableVoices.length && typeof window !== 'undefined' && 'speechSynthesis' in window) {
    availableVoices = window.speechSynthesis.getVoices();
  }

  const langCode = lang === 'mr' ? 'mr-IN' : lang === 'hi' ? 'hi-IN' : 'en-IN';

  // 1. Exact language match + Explicitly Female
  const exactFemale = availableVoices.find(
    (v) => v.lang.toLowerCase() === langCode.toLowerCase() && isFemaleVoice(v)
  );
  if (exactFemale) return exactFemale;

  // 2. Exact language match (any non-male)
  const exactMatch = availableVoices.find(
    (v) => v.lang.toLowerCase() === langCode.toLowerCase()
  );
  if (exactMatch && isFemaleVoice(exactMatch)) return exactMatch;

  // 3. For Marathi: If Marathi voice is not installed in OS, fallback to Indian Hindi Female or Indian English Female
  if (lang === 'mr') {
    const hindiFemale = availableVoices.find(
      (v) => v.lang.toLowerCase().startsWith('hi') && isFemaleVoice(v)
    );
    if (hindiFemale) return hindiFemale;

    const indianEngFemale = availableVoices.find(
      (v) =>
        (v.lang.toLowerCase().includes('en-in') || v.name.toLowerCase().includes('india')) &&
        isFemaleVoice(v)
    );
    if (indianEngFemale) return indianEngFemale;
  }

  // 4. For Hindi: Indian English Female fallback if needed
  if (lang === 'hi') {
    const hindiVoice = availableVoices.find((v) => v.lang.toLowerCase().startsWith('hi'));
    if (hindiVoice) return hindiVoice;
  }

  // 5. Indian English Female
  const englishIndianFemale = availableVoices.find(
    (v) =>
      (v.lang.toLowerCase().includes('en-in') || v.name.toLowerCase().includes('india')) &&
      isFemaleVoice(v)
  );
  if (englishIndianFemale) return englishIndianFemale;

  // 6. Any English Female voice (e.g. Zira, Samantha, Karen, Google UK/US Female)
  const generalEnglishFemale = availableVoices.find(
    (v) => v.lang.toLowerCase().startsWith('en') && isFemaleVoice(v)
  );
  if (generalEnglishFemale) return generalEnglishFemale;

  // 7. General exact match fallback
  return exactMatch || availableVoices[0] || null;
}

export interface VoicePlaybackOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: any) => void;
}

/**
 * Speaks text out loud with browser compatibility fixes
 */
export function playAiVoice(
  text: string,
  lang: SupportedLanguage = 'en',
  options?: VoicePlaybackOptions
): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    console.warn('[VoicePlayer] SpeechSynthesis not supported in this environment');
    return false;
  }

  try {
    // 1. Cancel previous speech and resume audio context if paused
    window.speechSynthesis.cancel();
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    const cleanText = (text || '').trim();
    if (!cleanText) return false;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    activeUtterance = utterance; // Keep global reference to prevent garbage collection bug in Chrome
    (window as any).__nmims_activeUtterance = utterance;

    // 2. Select voice and language
    const voice = getBestVoiceForLanguage(lang);
    if (voice) {
      utterance.voice = voice;
    }
    utterance.lang = lang === 'mr' ? 'mr-IN' : lang === 'hi' ? 'hi-IN' : 'en-IN';
    utterance.rate = options?.rate ?? 0.96; // Intelligible, clear pace
    utterance.pitch = options?.pitch ?? 1.08; // Clear, pleasant female pitch
    utterance.volume = options?.volume ?? 1.0;

    utterance.onstart = () => {
      console.log(`[VoicePlayer] Started speaking (${lang}): "${cleanText.substring(0, 40)}..."`);
      options?.onStart?.();
    };

    utterance.onend = () => {
      activeUtterance = null;
      (window as any).__nmims_activeUtterance = null;
      options?.onEnd?.();
    };

    utterance.onerror = (e) => {
      console.error('[VoicePlayer] Synthesis error:', e);
      activeUtterance = null;
      (window as any).__nmims_activeUtterance = null;
      options?.onError?.(e);
    };

    // 3. Dispatch to audio hardware
    window.speechSynthesis.speak(utterance);

    // Chrome resume watchdog (Chrome sometimes pauses after 15 seconds)
    const interval = setInterval(() => {
      if (!window.speechSynthesis.speaking) {
        clearInterval(interval);
      } else if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    }, 1000);

    return true;
  } catch (err) {
    console.error('[VoicePlayer] Fatal playback exception:', err);
    return false;
  }
}

/**
 * Stops active voice speech immediately (barge-in support)
 */
export function stopAiVoice(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    activeUtterance = null;
    (window as any).__nmims_activeUtterance = null;
  }
}
