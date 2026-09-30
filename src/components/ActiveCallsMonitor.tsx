// ============================================================================
// NMIMS AI Admission Voice Assistant - Active Calls Monitor
// Real-time live telephony voice stream, continuous speech recognition,
// contextual 1-tap voice responses, and direct speech input bar.
// ============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Radio,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  Clock,
  ArrowRightLeft,
  AlertCircle,
  Globe,
  Send,
} from 'lucide-react';
import { CallRecord, SupportedLanguage } from '../types';
import { api } from '../services/api';
import { playAiVoice, stopAiVoice } from '../utils/voicePlayer';

interface ActiveCallsMonitorProps {
  activeCalls: CallRecord[];
  onCallUpdated: (call: CallRecord) => void;
  onCallEnded: (callId: string) => void;
}

export const ActiveCallsMonitor: React.FC<ActiveCallsMonitorProps> = ({
  activeCalls,
  onCallUpdated,
  onCallEnded,
}) => {
  const [selectedCallId, setSelectedCallId] = useState<string | null>(
    activeCalls[0]?.id || null
  );
  const [isProcessingTurn, setIsProcessingTurn] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isAiSpeakingAudio, setIsAiSpeakingAudio] = useState(false);
  const [speechDetected, setSpeechDetected] = useState(false);
  const [currentSpeechTranscript, setCurrentSpeechTranscript] = useState('');
  const [studentInputText, setStudentInputText] = useState('');
  const [speechRecognitionSupported, setSpeechRecognitionSupported] = useState(true);
  const [micErrorMessage, setMicErrorMessage] = useState<string | null>(null);
  const [lastSpokenId, setLastSpokenId] = useState<string | null>(null);
  const [recognitionLang, setRecognitionLang] = useState<SupportedLanguage>('en');
  const [waitingPromptNotice, setWaitingPromptNotice] = useState<string | null>(null);

  // References for reliable state tracking in async speech recognition events
  const recognitionRef = useRef<any>(null);
  const shouldBeListeningRef = useRef<boolean>(true);
  const turnInProgressRef = useRef<boolean>(false);
  const aiSpeakingRef = useRef<boolean>(false);
  const isMicMutedRef = useRef<boolean>(false);
  const activeCallRef = useRef<CallRecord | null>(null);

  // Timers for VAD (Voice Activity Detection) and 4-second waiting prompt
  const speechDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const accumulatedSpeechRef = useRef<string>('');
  const waitingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const waitingPromptCountRef = useRef<number>(0);

  useEffect(() => {
    if (!selectedCallId && activeCalls.length > 0) {
      setSelectedCallId(activeCalls[0].id);
    }
  }, [activeCalls, selectedCallId]);

  const activeCall = activeCalls.find((c) => c.id === selectedCallId) || activeCalls[0];
  activeCallRef.current = activeCall || null;
  isMicMutedRef.current = isMicMuted;

  // Sync recognition language with active call language
  useEffect(() => {
    if (activeCall?.language) {
      setRecognitionLang(activeCall.language);
    }
  }, [activeCall?.language]);

  // Request browser microphone permission without locking the audio hardware
  const requestMicPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // IMPORTANT: Release all tracks immediately so SpeechRecognition has 100% exclusive access!
      stream.getTracks().forEach((track) => track.stop());
      setMicErrorMessage(null);
    } catch (err: any) {
      console.warn('[VoiceHardware] Mic permission notice:', err);
      setMicErrorMessage(
        'Browser microphone blocked. Please allow mic in address bar or use quick response buttons.'
      );
    }
  }, []);

  useEffect(() => {
    requestMicPermission();
  }, [requestMicPermission]);

  // Clear 4-second waiting prompt timer
  const clearWaitingTimer = useCallback(() => {
    if (waitingTimerRef.current) {
      clearTimeout(waitingTimerRef.current);
      waitingTimerRef.current = null;
    }
    setWaitingPromptNotice(null);
  }, []);

  // Stop recognition instance safely
  const stopListeningInstance = useCallback(() => {
    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    } catch (e) {}
    setIsListening(false);
    setSpeechDetected(false);
  }, []);

  // Trigger 4-Second Waiting Prompt: "I am waiting for your response..."
  const triggerWaitingPrompt = useCallback(() => {
    if (
      turnInProgressRef.current ||
      aiSpeakingRef.current ||
      isMicMutedRef.current ||
      accumulatedSpeechRef.current.trim().length > 0 ||
      waitingPromptCountRef.current >= 2
    ) {
      return;
    }

    waitingPromptCountRef.current += 1;
    const currentLang = activeCallRef.current?.language || 'en';

    const promptText =
      currentLang === 'mr'
        ? 'मी आपल्या उत्तराची वाट पाहत आहे, कृपया सांगा.'
        : currentLang === 'hi'
        ? 'मैं आपके उत्तर की प्रतीक्षा कर रही हूँ, कृपया बताइए।'
        : 'I am waiting for your response. Please let me know your details.';

    setWaitingPromptNotice(promptText);

    // Stop listening temporarily while AI speaks waiting prompt
    stopListeningInstance();
    aiSpeakingRef.current = true;
    setIsAiSpeakingAudio(true);

    playAiVoice(promptText, currentLang, {
      onStart: () => {
        aiSpeakingRef.current = true;
        setIsAiSpeakingAudio(true);
      },
      onEnd: () => {
        aiSpeakingRef.current = false;
        setIsAiSpeakingAudio(false);
        setWaitingPromptNotice(null);

        // Resume continuous listening immediately after waiting prompt!
        if (shouldBeListeningRef.current && !isMicMutedRef.current) {
          startListeningInstance();

          if (waitingPromptCountRef.current < 2) {
            waitingTimerRef.current = setTimeout(() => {
              triggerWaitingPrompt();
            }, 5000);
          }
        }
      },
      onError: () => {
        aiSpeakingRef.current = false;
        setIsAiSpeakingAudio(false);
        setWaitingPromptNotice(null);
        if (shouldBeListeningRef.current && !isMicMutedRef.current) {
          startListeningInstance();
        }
      },
    });
  }, [stopListeningInstance]);

  // Arm 4-second waiting timer after AI finishes speaking
  const armWaitingTimer = useCallback(() => {
    clearWaitingTimer();
    waitingPromptCountRef.current = 0;
    waitingTimerRef.current = setTimeout(() => {
      triggerWaitingPrompt();
    }, 4500);
  }, [clearWaitingTimer, triggerWaitingPrompt]);

  // Process a speech turn from caller
  const handleSimulateStudentTurn = useCallback(
    async (spokenText: string) => {
      const call = activeCallRef.current;
      const textToSend = spokenText.trim();
      if (!textToSend || !call || turnInProgressRef.current) return;

      // User has spoken: cancel waiting timer and debounce
      clearWaitingTimer();
      if (speechDebounceTimerRef.current) {
        clearTimeout(speechDebounceTimerRef.current);
        speechDebounceTimerRef.current = null;
      }
      accumulatedSpeechRef.current = '';
      setStudentInputText('');

      // Stop speech recognition while processing and playing voice response
      stopListeningInstance();
      turnInProgressRef.current = true;
      setIsProcessingTurn(true);
      setCurrentSpeechTranscript('');

      // Stop any existing AI speech (barge-in interruption)
      stopAiVoice();
      aiSpeakingRef.current = false;
      setIsAiSpeakingAudio(false);

      try {
        const res = await api.processVoiceTurn({
          callId: call.id,
          userSpeech: textToSend,
        });

        // Play synthesized AI response
        aiSpeakingRef.current = true;
        setIsAiSpeakingAudio(true);

        playAiVoice(res.ai_speech, res.language, {
          onStart: () => {
            aiSpeakingRef.current = true;
            setIsAiSpeakingAudio(true);
          },
          onEnd: () => {
            aiSpeakingRef.current = false;
            setIsAiSpeakingAudio(false);
            turnInProgressRef.current = false;
            setIsProcessingTurn(false);

            // Automatically resume listening immediately!
            if (shouldBeListeningRef.current && !isMicMutedRef.current) {
              startListeningInstance();
              armWaitingTimer();
            }
          },
          onError: () => {
            aiSpeakingRef.current = false;
            setIsAiSpeakingAudio(false);
            turnInProgressRef.current = false;
            setIsProcessingTurn(false);
            if (shouldBeListeningRef.current && !isMicMutedRef.current) {
              startListeningInstance();
            }
          },
        });
      } catch (e) {
        console.error('Voice Turn Error:', e);
        aiSpeakingRef.current = false;
        setIsAiSpeakingAudio(false);
        turnInProgressRef.current = false;
        setIsProcessingTurn(false);
        if (shouldBeListeningRef.current && !isMicMutedRef.current) {
          startListeningInstance();
        }
      }
    },
    [armWaitingTimer, clearWaitingTimer, stopListeningInstance]
  );

  // Start speech recognition loop with native voice activity events and fallback debounce
  const startListeningInstance = useCallback(() => {
    if (
      typeof window === 'undefined' ||
      !shouldBeListeningRef.current ||
      isMicMutedRef.current ||
      aiSpeakingRef.current ||
      turnInProgressRef.current
    ) {
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechRecognitionSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      // Select dialect
      const lang = recognitionLang || activeCallRef.current?.language || 'en';
      recognition.lang =
        lang === 'mr' ? 'mr-IN' : lang === 'hi' ? 'hi-IN' : 'en-IN';

      recognition.onstart = () => {
        setIsListening(true);
        setMicErrorMessage(null);
      };

      recognition.onspeechstart = () => {
        setSpeechDetected(true);
        clearWaitingTimer();
        if (aiSpeakingRef.current) {
          stopAiVoice();
          aiSpeakingRef.current = false;
          setIsAiSpeakingAudio(false);
        }
      };

      recognition.onspeechend = () => {
        setSpeechDetected(false);
      };

      recognition.onresult = (event: any) => {
        clearWaitingTimer();

        let fullTranscript = '';
        let hasFinalResult = false;

        for (let i = 0; i < event.results.length; ++i) {
          const res = event.results[i];
          fullTranscript += res[0].transcript;
          if (res.isFinal) {
            hasFinalResult = true;
          }
        }

        const trimmed = fullTranscript.trim();
        if (!trimmed) return;

        accumulatedSpeechRef.current = trimmed;
        setCurrentSpeechTranscript(trimmed);
        setStudentInputText(trimmed);

        // Barge-in: If user speaks while AI voice is playing, stop AI voice instantly
        if (aiSpeakingRef.current) {
          stopAiVoice();
          aiSpeakingRef.current = false;
          setIsAiSpeakingAudio(false);
        }

        if (speechDebounceTimerRef.current) {
          clearTimeout(speechDebounceTimerRef.current);
          speechDebounceTimerRef.current = null;
        }

        if (hasFinalResult) {
          handleSimulateStudentTurn(trimmed);
        } else {
          // VAD 1.2s debounce to handle browser delays
          speechDebounceTimerRef.current = setTimeout(() => {
            if (accumulatedSpeechRef.current.trim() && !turnInProgressRef.current) {
              const textToSend = accumulatedSpeechRef.current.trim();
              accumulatedSpeechRef.current = '';
              handleSimulateStudentTurn(textToSend);
            }
          }, 1200);
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setMicErrorMessage(
            'Browser microphone restricted. Click "Tap to Speak" or use quick options below.'
          );
          setIsListening(false);
        } else if (event.error !== 'no-speech') {
          console.warn('[VoiceMic] Speech recognition event:', event.error);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        setSpeechDetected(false);
        if (
          shouldBeListeningRef.current &&
          !isMicMutedRef.current &&
          !aiSpeakingRef.current &&
          !turnInProgressRef.current
        ) {
          setTimeout(() => {
            if (
              shouldBeListeningRef.current &&
              !isMicMutedRef.current &&
              !aiSpeakingRef.current &&
              !turnInProgressRef.current
            ) {
              startListeningInstance();
            }
          }, 300);
        }
      };

      recognition.start();
    } catch (e: any) {
      console.warn('[VoiceMic] Failed to start recognition:', e);
      setIsListening(false);
    }
  }, [clearWaitingTimer, handleSimulateStudentTurn, recognitionLang]);

  // When call loads or greeting plays, trigger speech and continuous loop
  useEffect(() => {
    if (!activeCall || !activeCall.transcript.length) return;
    const lastItem = activeCall.transcript[activeCall.transcript.length - 1];

    if (lastItem && lastItem.speaker === 'AI' && lastItem.id !== lastSpokenId) {
      setLastSpokenId(lastItem.id);
      aiSpeakingRef.current = true;
      setIsAiSpeakingAudio(true);

      playAiVoice(lastItem.text, lastItem.language || activeCall.language || 'en', {
        onStart: () => {
          aiSpeakingRef.current = true;
          setIsAiSpeakingAudio(true);
        },
        onEnd: () => {
          aiSpeakingRef.current = false;
          setIsAiSpeakingAudio(false);
          if (shouldBeListeningRef.current && !isMicMutedRef.current) {
            startListeningInstance();
            armWaitingTimer();
          }
        },
        onError: () => {
          aiSpeakingRef.current = false;
          setIsAiSpeakingAudio(false);
          if (shouldBeListeningRef.current && !isMicMutedRef.current) {
            startListeningInstance();
          }
        },
      });
    }
  }, [activeCall?.transcript, activeCall?.id, lastSpokenId, startListeningInstance, armWaitingTimer]);

  // Clean up on component unmount
  useEffect(() => {
    shouldBeListeningRef.current = true;
    startListeningInstance();

    return () => {
      shouldBeListeningRef.current = false;
      clearWaitingTimer();
      if (speechDebounceTimerRef.current) clearTimeout(speechDebounceTimerRef.current);
      stopListeningInstance();
      stopAiVoice();
    };
  }, [startListeningInstance, stopListeningInstance, clearWaitingTimer]);

  // Direct Tap to Speak button (guarantees user gesture for browser permissions)
  const handleDirectTapToSpeak = () => {
    clearWaitingTimer();
    stopListeningInstance();
    setIsMicMuted(false);
    isMicMutedRef.current = false;
    shouldBeListeningRef.current = true;
    setTimeout(() => {
      startListeningInstance();
    }, 150);
  };

  // Toggle Mute / Unmute
  const handleToggleMute = () => {
    clearWaitingTimer();
    if (isMicMuted) {
      setIsMicMuted(false);
      isMicMutedRef.current = false;
      shouldBeListeningRef.current = true;
      startListeningInstance();
      armWaitingTimer();
    } else {
      setIsMicMuted(true);
      isMicMutedRef.current = true;
      shouldBeListeningRef.current = false;
      stopListeningInstance();
    }
  };

  const handleReplayLatestAiSpeech = () => {
    if (!activeCall) return;
    clearWaitingTimer();
    const aiMessages = activeCall.transcript.filter((t) => t.speaker === 'AI');
    const latestAi = aiMessages[aiMessages.length - 1];
    if (latestAi) {
      aiSpeakingRef.current = true;
      setIsAiSpeakingAudio(true);
      stopListeningInstance();

      playAiVoice(latestAi.text, latestAi.language || activeCall.language || 'en', {
        onStart: () => {
          aiSpeakingRef.current = true;
          setIsAiSpeakingAudio(true);
        },
        onEnd: () => {
          aiSpeakingRef.current = false;
          setIsAiSpeakingAudio(false);
          if (shouldBeListeningRef.current && !isMicMutedRef.current) {
            startListeningInstance();
            armWaitingTimer();
          }
        },
        onError: () => {
          aiSpeakingRef.current = false;
          setIsAiSpeakingAudio(false);
          if (shouldBeListeningRef.current && !isMicMutedRef.current) {
            startListeningInstance();
          }
        },
      });
    }
  };

  const handleTransferToCounsellor = async () => {
    if (!activeCall) return;
    clearWaitingTimer();
    try {
      await api.transferCall({ callId: activeCall.id });
    } catch (e: any) {
      alert(e.message || 'Transfer failed');
    }
  };

  const handleEndCall = async () => {
    if (!activeCall) return;
    clearWaitingTimer();
    if (speechDebounceTimerRef.current) clearTimeout(speechDebounceTimerRef.current);
    shouldBeListeningRef.current = false;
    stopListeningInstance();
    stopAiVoice();
    try {
      await api.endCall({ callId: activeCall.id });
      onCallEnded(activeCall.id);
    } catch (e: any) {
      console.error(e);
    }
  };

  // Determine smart contextual response chips based on conversation state
  const getContextualResponses = () => {
    const state = activeCall?.conversation_state;
    if (state === 'LANGUAGE_SELECTION' || state === 'GREETING') {
      return [
        { label: 'मराठीत बोला', text: 'मराठी मध्ये बोला' },
        { label: 'हिंदी में बात करें', text: 'हिंदी में बात कीजिए' },
        { label: 'Speak in English', text: 'Please speak in English' },
      ];
    }
    if (state === 'ENGINEERING_INTEREST') {
      return [
        { label: 'Yes, B.Tech Engineering', text: 'Yes, I want to take admission in engineering' },
        { label: 'होय, इंजिनिअरिंग करायचे आहे', text: 'हो, मला इंजिनिअरिंग करायचे आहे' },
        { label: 'No, Commerce/Pharmacy', text: 'No, I want information about other courses' },
      ];
    }
    if (state === 'ACADEMIC_DETAILS_10TH') {
      return [
        { label: 'Rahul Patil, 88%', text: 'My name is Rahul Patil and I got 88 percent in 10th' },
        { label: 'Pooja Sharma, 91%', text: 'मेरा नाम पूजा शर्मा है और 10वीं में 91% हैं' },
        { label: 'Aarav Jadhav, 85%', text: 'माझे नाव आरव जाधव आणि 10वीत 85 टक्के आहेत' },
      ];
    }
    if (state === 'ACADEMIC_DETAILS_12TH') {
      return [
        { label: '12th Science PCM (82%)', text: '12th Science with PCM, scored 82 percent' },
        { label: '12th Appearing this year', text: 'I am appearing for 12th board exams this year' },
      ];
    }
    if (state === 'BRANCH_SELECTION') {
      return [
        { label: 'Computer Engineering', text: 'I am interested in Computer Engineering' },
        { label: 'AI & Machine Learning', text: 'Computer Science with AI and Machine Learning' },
        { label: 'Data Science', text: 'CSE in Data Science' },
        { label: 'Information Technology (IT)', text: 'Information Technology IT branch' },
      ];
    }
    return [
      { label: 'Campus Facilities', text: 'Tell me about campus facilities and infrastructure' },
      { label: 'Hostel & Mess', text: 'Hostel and mess kaisa hai?' },
      { label: 'Fees kiti aahe? (Transfer)', text: 'College chi fees kiti aahe?' },
      { label: 'मराठीत बोला', text: 'Marathi madhe bola' },
    ];
  };

  if (activeCalls.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs">
        <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
          <Radio className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-slate-800">No Active Calls at this Moment</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 leading-relaxed">
          The voice engine is idle and ready. Start an outbound call to a student or parent to monitor real-time conversation and live audio flow.
        </p>
      </div>
    );
  }

  const contextualChips = getContextualResponses();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Left List of Active Calls */}
      <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
        <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
            Active Calls ({activeCalls.length})
          </span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
        </div>

        <div className="divide-y divide-slate-100 overflow-y-auto max-h-[560px]">
          {activeCalls.map((call) => {
            const isSelected = call.id === activeCall?.id;
            return (
              <button
                key={call.id}
                onClick={() => setSelectedCallId(call.id)}
                className={`w-full p-3.5 text-left transition-colors cursor-pointer ${
                  isSelected ? 'bg-red-50/70 border-l-4 border-l-red-700' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-900 truncate">
                    {call.student_name}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">{call.phone_number}</span>
                </div>
                <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500">
                  <span className="capitalize">{call.status.toLowerCase()}</span>
                  <span className="uppercase text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded">
                    {call.language}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Call Monitor Console */}
      <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
        {/* Call Banner */}
        <div className="bg-slate-900 text-white p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold tracking-tight">{activeCall.student_name}</h2>
              <span className="text-xs font-mono text-slate-300">({activeCall.phone_number})</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-800 text-white">
                {activeCall.provider}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>Started: {new Date(activeCall.start_time).toLocaleTimeString()}</span>
              </span>
              <span>·</span>
              <span>Language: <strong className="text-white uppercase">{activeCall.language}</strong></span>
              <span>·</span>
              <span>State: <strong className="text-amber-300">{activeCall.conversation_state}</strong></span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleTransferToCounsellor}
              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Bridge to Counsellor</span>
            </button>
            <button
              onClick={handleEndCall}
              className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <PhoneOff className="w-3.5 h-3.5" />
              <span>End Call</span>
            </button>
          </div>
        </div>

        {/* Real-time Audio Stream Bar */}
        <div className="px-6 py-3 bg-slate-800 text-slate-200 flex items-center justify-between text-xs border-t border-slate-700">
          <div className="flex items-center gap-3">
            <span className="font-semibold uppercase tracking-wider text-[11px] text-slate-400">
              Voice Line:
            </span>
            <div className="flex items-center gap-1 h-5">
              <span className={`soundwave-bar w-1 rounded-full ${isAiSpeakingAudio ? 'bg-red-500' : speechDetected ? 'bg-emerald-400' : isListening ? 'bg-emerald-600' : 'bg-slate-600'}`}></span>
              <span className={`soundwave-bar w-1 rounded-full ${isAiSpeakingAudio ? 'bg-red-400' : speechDetected ? 'bg-emerald-300' : isListening ? 'bg-emerald-500' : 'bg-slate-600'}`}></span>
              <span className={`soundwave-bar w-1 rounded-full ${isAiSpeakingAudio ? 'bg-amber-400' : speechDetected ? 'bg-emerald-400' : isListening ? 'bg-emerald-600' : 'bg-slate-600'}`}></span>
              <span className={`soundwave-bar w-1 rounded-full ${isAiSpeakingAudio ? 'bg-emerald-400' : speechDetected ? 'bg-emerald-500' : isListening ? 'bg-emerald-500' : 'bg-slate-600'}`}></span>
              <span className={`soundwave-bar w-1 rounded-full ${isAiSpeakingAudio ? 'bg-blue-400' : speechDetected ? 'bg-emerald-400' : isListening ? 'bg-emerald-600' : 'bg-slate-600'}`}></span>
            </div>
            <span className={`font-semibold ${isAiSpeakingAudio ? 'text-blue-400' : speechDetected ? 'text-emerald-300 animate-pulse' : isListening ? 'text-emerald-400' : isMicMuted ? 'text-amber-400' : 'text-slate-300'}`}>
              {isAiSpeakingAudio
                ? 'AI Speaking (Female Voice)...'
                : isProcessingTurn
                ? 'AI is verifying database records...'
                : speechDetected
                ? 'Hearing Your Voice Aloud...'
                : isListening
                ? 'Microphone Listening — Speak freely'
                : isMicMuted
                ? 'Microphone Muted'
                : 'Click "Tap to Speak" Below'}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleReplayLatestAiSpeech}
              className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded text-[11px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Click to replay AI speech"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Hear AI Speech</span>
            </button>
            <span className="text-[11px] text-slate-400 font-mono">
              ID: {activeCall.id}
            </span>
          </div>
        </div>

        {/* Live Conversation Transcript Display */}
        <div className="flex-1 p-5 overflow-y-auto space-y-3.5 min-h-[320px] max-h-[440px] bg-slate-50/50">
          {activeCall.transcript.map((item, idx) => (
            <div
              key={item.id || idx}
              className={`flex flex-col ${
                item.speaker === 'AI'
                  ? 'items-start'
                  : item.speaker === 'STUDENT'
                  ? 'items-end'
                  : 'items-center'
              }`}
            >
              <div className="text-[10px] font-semibold text-slate-400 mb-0.5 flex items-center gap-1.5 px-1">
                <span>{item.speaker === 'AI' ? 'NMIMS Admission AI Assistant (Female Voice)' : activeCall.student_name}</span>
                <span>·</span>
                <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
                {item.language && (
                  <span className="uppercase text-[9px] bg-slate-200 text-slate-700 px-1 rounded">
                    {item.language}
                  </span>
                )}
                {item.speaker === 'AI' && (
                  <button
                    onClick={() => playAiVoice(item.text, item.language || activeCall.language || 'en')}
                    className="ml-1 text-[10px] text-red-700 hover:text-red-900 bg-red-50 hover:bg-red-100 px-1.5 py-0.2 rounded flex items-center gap-1 cursor-pointer transition-colors font-medium"
                    title="Click to play this voice aloud"
                  >
                    <Volume2 className="w-2.5 h-2.5" />
                    <span>Play</span>
                  </button>
                )}
              </div>
              <div
                className={`max-w-xl p-3.5 rounded-xl text-xs leading-relaxed ${
                  item.speaker === 'AI'
                    ? 'bg-white border border-slate-200 text-slate-900 shadow-xs'
                    : item.speaker === 'STUDENT'
                    ? 'bg-red-700 text-white shadow-xs'
                    : 'bg-amber-100 text-amber-900 border border-amber-200 text-center text-[11px]'
                }`}
              >
                {item.text}
              </div>
            </div>
          ))}

          {waitingPromptNotice && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs animate-pulse">
              <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>
                <strong>4-Sec Silence Reminder:</strong> "{waitingPromptNotice}"
              </span>
            </div>
          )}

          {isProcessingTurn && (
            <div className="flex items-center gap-2 text-xs text-slate-500 italic py-2">
              <span className="w-3.5 h-3.5 rounded-full border-2 border-red-700 border-t-transparent animate-spin"></span>
              <span>AI is thinking & synthesizing speech response...</span>
            </div>
          )}
        </div>

        {/* Dynamic Contextual 1-Tap Voice Chips (Guarantees user is NEVER stuck!) */}
        <div className="px-4 py-2.5 bg-slate-100/80 border-t border-slate-200 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Quick Responses:
          </span>
          {contextualChips.map((chip, idx) => (
            <button
              key={idx}
              onClick={() => handleSimulateStudentTurn(chip.text)}
              className="px-3 py-1 bg-white hover:bg-red-50 hover:text-red-700 hover:border-red-300 text-slate-700 border border-slate-200 rounded-full font-medium transition-all shadow-2xs cursor-pointer text-[11px]"
              title={`Click to say: "${chip.text}"`}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Telephony Voice Control Bar & Spoken Input Transmitter */}
        <div className="p-4 bg-white border-t border-slate-200 flex flex-col gap-3">
          {/* Permission error warning if browser mic failed */}
          {micErrorMessage && (
            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between text-xs text-amber-800">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{micErrorMessage}</span>
              </div>
              <button
                onClick={handleDirectTapToSpeak}
                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded font-medium text-xs cursor-pointer"
              >
                Retry Mic
              </button>
            </div>
          )}

          {/* Dual Action: Voice Input Transmitter + Direct Mic Button */}
          <div className="flex items-center gap-2">
            {/* Direct Tap to Speak button */}
            <button
              type="button"
              onClick={handleDirectTapToSpeak}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs shrink-0 ${
                isListening
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white ring-4 ring-emerald-100 animate-pulse'
                  : 'bg-red-700 hover:bg-red-800 text-white'
              }`}
              title="Click to activate voice microphone"
            >
              <Mic className="w-4 h-4" />
              <span>{isListening ? 'Mic Live (बोलिए)' : 'Tap to Speak (माइक चालू करें)'}</span>
            </button>

            {/* Live Utterance Input Bar (Auto-fills when you speak, or lets you type/send instantly!) */}
            <div className="flex-1 relative flex items-center">
              <input
                type="text"
                value={studentInputText}
                onChange={(e) => setStudentInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && studentInputText.trim()) {
                    handleSimulateStudentTurn(studentInputText);
                  }
                }}
                placeholder={
                  isListening
                    ? 'Listening... (Speak now or type here if mic is quiet)'
                    : 'Speak using mic or type your answer here...'
                }
                className="w-full pl-3.5 pr-10 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600/30 focus:border-red-600 text-slate-800"
              />

              <button
                type="button"
                onClick={() => {
                  if (studentInputText.trim()) {
                    handleSimulateStudentTurn(studentInputText);
                  }
                }}
                disabled={!studentInputText.trim() || isProcessingTurn}
                className="absolute right-1.5 p-1.5 bg-red-700 hover:bg-red-800 disabled:opacity-40 text-white rounded-lg transition-colors cursor-pointer"
                title="Send response"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Language Dialect selector */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-2.5 py-2 rounded-xl text-xs shrink-0">
              <Globe className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={recognitionLang}
                onChange={(e) => {
                  const lang = e.target.value as SupportedLanguage;
                  setRecognitionLang(lang);
                  stopListeningInstance();
                  setTimeout(startListeningInstance, 100);
                }}
                className="bg-transparent text-xs text-slate-700 font-medium focus:outline-none cursor-pointer"
                title="Change microphone speech dialect"
              >
                <option value="en">English (en-IN)</option>
                <option value="hi">हिन्दी (hi-IN)</option>
                <option value="mr">मराठी (mr-IN)</option>
              </select>
            </div>

            {/* Mute Toggle */}
            <button
              type="button"
              onClick={handleToggleMute}
              className={`p-2.5 rounded-xl border transition-colors cursor-pointer shrink-0 ${
                isMicMuted
                  ? 'bg-amber-100 border-amber-300 text-amber-800'
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
              }`}
              title={isMicMuted ? 'Unmute microphone' : 'Mute microphone'}
            >
              {isMicMuted ? <MicOff className="w-4 h-4 text-amber-700" /> : <Mic className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
