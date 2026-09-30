// ============================================================================
// NMIMS AI Admission Voice Assistant - Gemini 3.8 Flash AI Engine
// Powered by @google/genai SDK for real-time low-latency voice reasoning
// ============================================================================

import { GoogleGenAI } from '@google/genai';

let geminiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    return null;
  }
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({ apiKey });
  }
  return geminiClient;
}

export const SYSTEM_PROMPT = `You are the AI admission assistant for SVKM NMIMS Global University, Dhule.

Your job is to help prospective students and parents with admission enquiries.

Speak naturally and professionally.

You are a voice-only assistant.

Always listen carefully to the caller.

Detect the caller's preferred language and continue in that language.

Supported languages include English, Hindi and Marathi.

Never unnecessarily mix languages.

Use verified college data from the knowledge base and database.

Never invent fees, seats, cutoffs, dates, eligibility, scholarships or other college-specific information.

If information is dynamic, unavailable, uncertain or requires detailed counselling, explain that a human admission counsellor can provide the latest information and initiate transfer.

Remember information already provided by the caller.

Do not ask the same question repeatedly.

Allow the caller to ask questions at any point.

If the caller interrupts you, stop speaking and listen.

Be concise because this is a telephone conversation.

Do not give long paragraphs.

Ask one or two questions at a time.

Never sound robotic.

Your goal is to understand the student's requirements and help them reach the correct admission information or human counsellor.`;

export interface GeminiTurnContext {
  conversationHistory: { speaker: string; text: string }[];
  currentLanguage: 'en' | 'hi' | 'mr';
  studentName?: string;
  userType?: string;
  schoolInterest?: string;
  engineeringInterest?: boolean | null;
  collectedMarks: {
    marks10th?: number | null;
    marks12th?: number | null;
    cetPercentile?: number | null;
    branch?: string;
  };
  verifiedDbFacts: string[];
  isTransferRequested?: boolean;
}

export async function generateGeminiVoiceResponse(
  userUtterance: string,
  context: GeminiTurnContext
): Promise<{ text: string; shouldTransfer: boolean; reason?: string }> {
  const client = getGeminiClient();

  // If Gemini API Key is not yet configured, provide high-fidelity structured heuristic response
  if (!client) {
    return generateFallbackTurn(userUtterance, context);
  }

  try {
    const historyText = context.conversationHistory
      .slice(-6)
      .map((h) => `${h.speaker}: ${h.text}`)
      .join('\n');

    const prompt = `
System Knowledge Base & Verified DB Facts:
${context.verifiedDbFacts.join('\n')}

Current Context:
- Target Language: ${context.currentLanguage === 'mr' ? 'Marathi' : context.currentLanguage === 'hi' ? 'Hindi' : 'English'}
- Candidate Name: ${context.studentName || 'Prospective Student'}
- User Type: ${context.userType || 'Unknown'}
- Collected Info: 10th: ${context.collectedMarks.marks10th ?? 'Not provided'}, 12th: ${context.collectedMarks.marks12th ?? 'Not provided'}, CET: ${context.collectedMarks.cetPercentile ?? 'Not provided'}, Branch: ${context.collectedMarks.branch ?? 'Not provided'}
- Recent Conversation:
${historyText}

User just said:
"${userUtterance}"

Instructions:
1. Respond in EXACTLY the target language (${context.currentLanguage === 'mr' ? 'Marathi' : context.currentLanguage === 'hi' ? 'Hindi' : 'English'}).
2. If the user asked about dynamic information (fees, cutoffs, dates, scholarships) or wants to talk to a human, output TRANSFER_REQUIRED: true and state you are transferring them to the admission counsellor.
3. Keep response to 1-2 spoken sentences suitable for a phone call.
4. Output your response as valid JSON with format:
{"response": "...", "transferRequired": false, "reason": "..."}
`;

    const result = await client.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.3,
        responseMimeType: 'application/json',
      },
    });

    const rawText = result.text || '';
    const parsed = JSON.parse(rawText);

    return {
      text: parsed.response,
      shouldTransfer: Boolean(parsed.transferRequired),
      reason: parsed.reason,
    };
  } catch (error: any) {
    console.warn('[GeminiEngine] Using intelligent conversational fallback:', error.message);
    return generateFallbackTurn(userUtterance, context);
  }
}

function generateFallbackTurn(
  userUtterance: string,
  context: GeminiTurnContext
): { text: string; shouldTransfer: boolean; reason?: string } {
  const lang = context.currentLanguage;
  const lower = userUtterance.toLowerCase();

  // Dynamic fee or transfer trigger
  if (
    lower.includes('fee') ||
    lower.includes('fees') ||
    lower.includes('cutoff') ||
    lower.includes('cut off') ||
    lower.includes('scholarship') ||
    lower.includes('counsellor') ||
    lower.includes('counselor') ||
    lower.includes('human') ||
    lower.includes('person') ||
    lower.includes('deadline') ||
    lower.includes('खर्च') ||
    lower.includes('फी') ||
    lower.includes('फीस')
  ) {
    if (lang === 'mr') {
      return {
        text: 'फी रचना आणि कटऑफ शैक्षणिक वर्षानुसार बदलतात. अचूक आणि अधिकृत माहितीसाठी मी आपल्याला थेट प्रवेश समुपदेशकांशी (Admission Counsellor) जोडत आहे. कृपया लाईनवर राहा.',
        shouldTransfer: true,
        reason: 'User inquired about dynamic fees/cutoffs in Marathi',
      };
    } else if (lang === 'hi') {
      return {
        text: 'फीस स्ट्रक्चर और कटऑफ की जानकारी शैक्षणिक वर्ष के अनुसार अपडेट होती है। मैं आपको सीधे हमारे एडमिशन काउंसलर से कनेक्ट कर रहा हूँ। कृपया लाइन पर बने रहें।',
        shouldTransfer: true,
        reason: 'User inquired about dynamic fees/cutoffs in Hindi',
      };
    } else {
      return {
        text: 'The fee structure and cutoffs vary each academic year. I will connect you right away with an admission counsellor who can provide the latest information. Please stay on the line.',
        shouldTransfer: true,
        reason: 'User inquired about dynamic fees/cutoffs in English',
      };
    }
  }

  // Seat enquiry
  if (lower.includes('seat') || lower.includes('जागा') || lower.includes('सीट')) {
    if (context.verifiedDbFacts.length > 0) {
      const fact = context.verifiedDbFacts[0];
      if (lang === 'mr') {
        return {
          text: `आमच्या डेटाबेसनुसार, ${fact} तुम्हाला या शाखेमध्ये ॲडमिशन घ्यायला आवडेल का?`,
          shouldTransfer: false,
        };
      } else if (lang === 'hi') {
        return {
          text: `हमारे वेरीफाइड डेटाबेस के अनुसार, ${fact} क्या आप इस ब्रांच में एडमिशन की प्रक्रिया आगे बढ़ाना चाहते हैं?`,
          shouldTransfer: false,
        };
      } else {
        return {
          text: `According to our verified records, ${fact}. Would you like to proceed with admission details for this branch?`,
          shouldTransfer: false,
        };
      }
    }
  }

  // Campus Facilities & Infrastructure
  if (
    lower.includes('facilit') ||
    lower.includes('campus') ||
    lower.includes('infrastructure') ||
    lower.includes('auditorium') ||
    lower.includes('smart class') ||
    lower.includes('classroom') ||
    lower.includes('wifi') ||
    lower.includes('सुविधा') ||
    lower.includes('परिसर') ||
    lower.includes('कॅम्पस') ||
    lower.includes('कॅंपस')
  ) {
    if (lang === 'mr') {
      return {
        text: 'एसव्हीकेएम एनएमआयएमएस धुळे येथे ३३ एकरांचा अत्याधुनिक ग्रीन कॅम्पस आहे. यामध्ये पूर्णपणे वातानुकूलित डिजिटल स्मार्ट क्लासरूम्स, १ Gbps वाय-फाय, अत्याधुनिक AI व कॉम्प्युटर लॅब्स, ५०० आसनी ऑडिटोरियम, सेंट्रल लायब्ररी, भव्य क्रीडा संकुल आणि ऑन-कॅम्पस सुरक्षित हॉस्टेल सुविधा उपलब्ध आहेत. आपण हॉस्टेल किंवा इतर कोणत्या सुविधेबद्दल जाणून घेऊ इच्छिता?',
        shouldTransfer: false,
      };
    } else if (lang === 'hi') {
      return {
        text: 'एसवीकेएम एनएमआईएमएस धुले में ३३ एकड़ का अत्याधुनिक ग्रीन कैंपस है, जिसमें पूरी तरह एयर-कंडीशंड डिजिटल स्मार्ट क्लासरूम्स, १ जीबीपीएस हाई-स्पीड वाई-फाई, अत्याधुनिक एआई और कंप्यूटर लैब्स, ५००-सीटर ऑडिटोरियम, सेंट्रल लाइब्रेरी, स्पोर्ट्स कॉम्प्लेक्स (क्रिकेट, फुटबॉल) और सुरक्षित हॉस्टल सुविधाएं उपलब्ध हैं। आप किस सुविधा के बारे में और जानना चाहते हैं?',
        shouldTransfer: false,
      };
    } else {
      return {
        text: 'SVKM NMIMS Dhule features a modern 33-acre campus equipped with air-conditioned smart digital classrooms, 1 Gbps high-speed WiFi, state-of-the-art AI and computing laboratories, a 500-seat auditorium, central library, sports complex with cricket and football turf, cafeteria, and secure on-campus hostels. Would you like more details about our hostels, labs, or sports?',
        shouldTransfer: false,
      };
    }
  }

  // Hostel, Accommodation & Mess
  if (
    lower.includes('hostel') ||
    lower.includes('room') ||
    lower.includes('stay') ||
    lower.includes('accommodation') ||
    lower.includes('mess') ||
    lower.includes('food') ||
    lower.includes('dining') ||
    lower.includes('canteen') ||
    lower.includes('cafeteria') ||
    lower.includes('हॉस्टल') ||
    lower.includes('मेस') ||
    lower.includes('जेवण') ||
    lower.includes('खाना') ||
    lower.includes('रहने')
  ) {
    if (lang === 'mr') {
      return {
        text: 'एनएमआयएमएस धुळे कॅम्पसमध्ये मुला-मुलींसाठी स्वतंत्र व सुरक्षित हॉस्टेल्स आहेत, ज्यामध्ये २४ तास सुरक्षा, बायोमेट्रिक प्रवेश आणि सुसज्ज खोल्या आहेत. तसेच मेसमध्ये दररोज ४ वेळा शुद्ध व पौष्टिक शाकाहारी जेवण दिले जाते. आपण याबद्दल आणखी काही विचारू इच्छिता?',
        shouldTransfer: false,
      };
    } else if (lang === 'hi') {
      return {
        text: 'एनएमआईएमएस धुले में छात्रों और छात्राओं के लिए परिसर के अंदर अलग-अलग सुरक्षित हॉस्टल्स हैं, जहाँ २४x७ सुरक्षा, बायोमेट्रिक एंट्री और एयर-कूल्ड/एसी कमरे हैं। मेस में प्रतिदिन ४ समय शुद्ध और पौष्टिक शाकाहारी भोजन दिया जाता है। क्या आप हॉस्टल के बारे में और कुछ जानना चाहते हैं?',
        shouldTransfer: false,
      };
    } else {
      return {
        text: 'NMIMS Dhule provides separate on-campus multi-story hostels for boys and girls with 24x7 security, CCTV, and biometric access. Rooms are furnished with air-cooled and AC options, and the dining mess provides 4 hygienic, nutritious pure vegetarian meals daily. Would you like any other details?',
        shouldTransfer: false,
      };
    }
  }

  // Sports & Fitness
  if (
    lower.includes('sport') ||
    lower.includes('game') ||
    lower.includes('cricket') ||
    lower.includes('football') ||
    lower.includes('gym') ||
    lower.includes('basketball') ||
    lower.includes('ground') ||
    lower.includes('खेळ') ||
    lower.includes('मैदान') ||
    lower.includes('जिम')
  ) {
    if (lang === 'mr') {
      return {
        text: 'आमच्या धुळे कॅम्पसमध्ये भव्य क्रीडा संकुल आहे, ज्यामध्ये पूर्ण आकाराचे क्रिकेट मैदान, फुटबॉल टर्फ, बास्केटबॉल कोर्ट, बॅडमिंटन, टेबल टेनिस आणि आधुनिक इनडोअर जिमची सुविधा आहे.',
        shouldTransfer: false,
      };
    } else if (lang === 'hi') {
      return {
        text: 'हमारे धुले कैंपस में विशाल स्पोर्ट्स कॉम्प्लेक्स है जिसमें फुल-साइज क्रिकेट ग्राउंड, फुटबॉल टर्फ, बास्केटबॉल कोर्ट, बैडमिंटन, टेबल टेनिस और अत्याधुनिक इनडोर जिम शामिल है।',
        shouldTransfer: false,
      };
    } else {
      return {
        text: 'Our Dhule campus has a comprehensive sports complex with a full-sized cricket ground, football turf, basketball court, badminton, table tennis, and a modern indoor gymnasium for physical fitness.',
        shouldTransfer: false,
      };
    }
  }

  // Library
  if (
    lower.includes('library') ||
    lower.includes('book') ||
    lower.includes('journal') ||
    lower.includes('वाचनालय') ||
    lower.includes('पुस्तकालय') ||
    lower.includes('ग्रंथालय')
  ) {
    if (lang === 'mr') {
      return {
        text: 'सेंट्रल लायब्ररी पूर्णपणे वातानुकूलित असून यामध्ये २०,००० पेक्षा जास्त पुस्तके, राष्ट्रीय-आंतरराष्ट्रीय जर्नल्स, IEEE डिजिटल ॲक्सेस आणि शांत अभ्यासिका उपलब्ध आहेत.',
        shouldTransfer: false,
      };
    } else if (lang === 'hi') {
      return {
        text: 'कॉलेज की सेंट्रल लाइब्रेरी पूरी तरह एयर-कंडीशंड है, जिसमें २०,००० से अधिक पुस्तकें, अंतरराष्ट्रीय जर्नल्स, IEEE डिजिटल लाइब्रेरी और ई-रिसोर्सेज उपलब्ध हैं।',
        shouldTransfer: false,
      };
    } else {
      return {
        text: 'The central library is fully air-conditioned with over 20,000 volumes, international research journals, IEEE digital access, DELNET e-books, and comfortable reading halls.',
        shouldTransfer: false,
      };
    }
  }

  // Location & Transportation
  if (
    lower.includes('location') ||
    lower.includes('address') ||
    lower.includes('where is') ||
    lower.includes('reach') ||
    lower.includes('transport') ||
    lower.includes('bus') ||
    lower.includes('kaha') ||
    lower.includes('kuthe') ||
    lower.includes('पत्ता') ||
    lower.includes('कुठे') ||
    lower.includes('कहाँ') ||
    lower.includes('बस')
  ) {
    if (lang === 'mr') {
      return {
        text: 'एसव्हीकेएम एनएमआयएमएस धुळे मुंबई-आग्रा राष्ट्रीय महामार्गावर (NH-3) स्थित आहे. हे धुळे रेल्वे स्थानकापासून सुमारे ८ किमी अंतरावर आहे आणि विद्यार्थ्यांसाठी शहरभरात कॉलेज बस सेवा उपलब्ध आहे.',
        shouldTransfer: false,
      };
    } else if (lang === 'hi') {
      return {
        text: 'एसवीकेएम एनएमआईएमएस धुले मुंबई-आगरा नेशनल हाईवे (NH-3) पर स्थित है। यह धुले रेलवे स्टेशन से लगभग ८ किमी दूर है, और छात्रों के लिए पूरे धुले शहर में कॉलेज बस सुविधा उपलब्ध है।',
        shouldTransfer: false,
      };
    } else {
      return {
        text: 'SVKM NMIMS Dhule is located on the Mumbai-Agra National Highway NH-3, Dhule, Maharashtra. The campus is about 8 km from Dhule Railway Station, and the university operates dedicated bus services across Dhule city.',
        shouldTransfer: false,
      };
    }
  }

  // Placements & Recruiting
  if (
    lower.includes('placement') ||
    lower.includes('job') ||
    lower.includes('package') ||
    lower.includes('internship') ||
    lower.includes('company') ||
    lower.includes('companies') ||
    lower.includes('recruit') ||
    lower.includes('प्लेसमेंट') ||
    lower.includes('नोकरी')
  ) {
    if (lang === 'mr') {
      return {
        text: 'एसटीएमई धुळेचे टीसीएस, इन्फोसिस, कॅपजेमिनी, एक्सेंचर, एल अँड टी आणि टेक महिंद्रा सारख्या नामांकित कंपन्यांशी उत्तम प्लेसमेंट सहकार्य आहे आणि तिसऱ्या वर्षापासून विद्यार्थ्यांसाठी समर इंटर्नशिप अनिवार्य आहे.',
        shouldTransfer: false,
      };
    } else if (lang === 'hi') {
      return {
        text: 'एसटीएमई धुले का टीसीएस, इंफोसिस, कैपजेमिनी, एक्सेंचर, एलएंडटी और टेक महिंद्रा जैसी शीर्ष कंपनियों के साथ मजबूत प्लेसमेंट टाई-अप है, और तीसरे वर्ष से अनिवार्य समर इंटर्नशिप कराई जाती है।',
        shouldTransfer: false,
      };
    } else {
      return {
        text: 'STME Dhule has strong industry ties with leading companies like TCS, Infosys, Capgemini, Accenture, L&T, and Tech Mahindra, with mandatory summer internships and career development starting in the 3rd year.',
        shouldTransfer: false,
      };
    }
  }

  // Default natural acknowledgement
  if (lang === 'mr') {
    return {
      text: 'समजले. आपण आणखी काही माहिती जाणून घेऊ इच्छिता की मी आपल्याला ॲडमिशन कौन्सिलरशी जोडू?',
      shouldTransfer: false,
    };
  } else if (lang === 'hi') {
    return {
      text: 'समझ गया। क्या आप कॉलेज के बारे में और कुछ जानना चाहते हैं, या मैं आपको एडमिशन काउंसलर से कनेक्ट करूँ?',
      shouldTransfer: false,
    };
  } else {
    return {
      text: 'Understood. Is there anything else you would like to know regarding SVKM NMIMS Dhule, or shall I connect you with a counsellor?',
      shouldTransfer: false,
    };
  }
}
