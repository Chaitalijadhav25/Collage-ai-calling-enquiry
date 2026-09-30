// ============================================================================
// NMIMS AI Admission Voice Assistant - Language Detection & Multilingual Engine
// Handles Spoken English, Hindi (हिन्दी), and Marathi (मराठी)
// ============================================================================

import { SupportedLanguage } from '../../types';

// Distinctive phonetic and textual triggers for language switching
const MARATHI_TRIGGERS = [
  'marathi',
  'marathit',
  'marathimadhe',
  'marathi madhe',
  'मराठी',
  'मराठीत',
  'मराठी मध्ये',
  'bola',
  'bolaa',
  'सांगा',
  'सांग',
  'aahe',
  'kiti',
  'pahije',
  'karaycha',
  'bolto',
  'bolte',
  'sangaa',
  'mahiti',
  'shala',
  'shikaycha',
  'kuthe',
  'kashe',
];

const HINDI_TRIGGERS = [
  'hindi',
  'hindime',
  'hindi mein',
  'हिन्दी',
  'हिंदी',
  'हिंदी में',
  'baat kijiye',
  'batao',
  'bataiye',
  'kariye',
  'kya',
  'hai',
  'hain',
  'mujhe',
  'hum',
  'chahiye',
  'karna hai',
  'pehle',
  'puchna',
  'admission lena',
];

const ENGLISH_TRIGGERS = [
  'english',
  'english please',
  'in english',
  'english is fine',
  'english is good',
  'speak in english',
  'talk in english',
];

/**
 * Detects spoken language preference from transcript or user speech
 */
export function detectLanguage(
  userSpeech: string,
  currentLanguage: SupportedLanguage = 'en'
): SupportedLanguage {
  const text = (userSpeech || '').toLowerCase().trim();

  // 1. Direct explicit language requests
  for (const trigger of MARATHI_TRIGGERS) {
    if (text.includes(trigger)) {
      return 'mr';
    }
  }

  for (const trigger of HINDI_TRIGGERS) {
    if (text.includes(trigger)) {
      return 'hi';
    }
  }

  for (const trigger of ENGLISH_TRIGGERS) {
    if (text.includes(trigger)) {
      return 'en';
    }
  }

  // 2. Devanagari script detection
  const devanagariRegex = /[\u0900-\u097F]/;
  if (devanagariRegex.test(text)) {
    // Check Marathi specific character combinations or words
    if (
      text.includes('आहे') ||
      text.includes('नाही') ||
      text.includes('किती') ||
      text.includes('पाहिजे') ||
      text.includes('करा') ||
      text.includes('सांगा') ||
      text.includes('हो')
    ) {
      return 'mr';
    }
    return 'hi';
  }

  // 3. Fallback to existing language if no strong switch detected
  return currentLanguage;
}

/**
 * Multilingual standardized phrases for system transitions
 */
export const MULTILINGUAL_RESPONSES = {
  greeting: {
    en: 'Hello! I am the AI admission assistant from SVKM NMIMS Global University, Dhule. Am I speaking with the student or a parent?',
    hi: 'नमस्ते! मैं एसवीकेएम एनएमआईएमएस ग्लोबल यूनिवर्सिटी, धुले से एआई एडमिशन असिस्टेंट बात कर रहा हूँ। क्या मेरी बात छात्र से हो रही है या माता-पिता से?',
    mr: 'नमस्कार! मी एसव्हीकेएम एनएमआयएमएस ग्लोबल युनिव्हर्सिटी, धुळे येथून एआय ॲडमिशन असिस्टंट बोलत आहे. मी विद्यार्थ्यांशी बोलत आहे की पालकांशी?',
  },
  askLanguage: {
    en: 'Which language are you comfortable speaking in? You can choose English, Hindi, or Marathi.',
    hi: 'आप किस भाषा में बात करना पसंद करेंगे? आप हिंदी, मराठी या अंग्रेजी चुन सकते हैं।',
    mr: 'आपण कोणत्या भाषेत बोलणे पसंत कराल? आपण मराठी, हिंदी किंवा इंग्रजीमध्ये बोलू शकता.',
  },
  askEngineering: {
    en: 'Are you interested in engineering admission at our Dhule campus?',
    hi: 'क्या आप हमारे धुले कैंपस में इंजीनियरिंग एडमिशन में रुचि रखते हैं?',
    mr: 'आपण आमच्या धुळे कॅम्पसमध्ये इंजिनिअरिंग ॲडमिशनसाठी इच्छुक आहात का?',
  },
  engineeringConfirmedAndAsk10th: {
    en: 'Great! SVKM NMIMS Dhule STME offers B.Tech programs in Computer Engineering, AI & Machine Learning, Data Science, and core branches. To check your eligibility, could you please tell me your 10th standard percentage?',
    hi: 'बहुत बढ़िया! हमारे STME धुले कैंपस में कंप्यूटर इंजीनियरिंग, AI & ML, डेटा साइंस और अन्य B.Tech प्रोग्राम्स उपलब्ध हैं। पात्रता चेक करने के लिए, क्या आप मुझे अपना 10वीं का प्रतिशत बता सकते हैं?',
    mr: 'उत्तम! आमच्या STME धुळे कॅम्पसमध्ये कॉम्प्युटर इंजिनिअरिंग, AI & ML, डेटा सायन्स आणि इतर B.Tech शाखा उपलब्ध आहेत. प्रवेश पात्रतेसाठी, कृपया मला तुमचे 10वीचे टक्के सांगू शकाल का?',
  },
  languageSwitchAck: {
    en: 'Certainly! We can now continue in English. ',
    hi: 'बिल्कुल! अब हम हिंदी में बात करते हैं। ',
    mr: 'नक्कीच! आपण आता मराठीत बोलूया. ',
  },
  askNameAnd10thStudent: {
    en: 'To check your eligibility, could you please tell me your full name and your 10th standard percentage?',
    hi: 'पात्रता चेक करने के लिए, क्या आप मुझे अपना पूरा नाम और 10वीं कक्षा का प्रतिशत बता सकते हैं?',
    mr: 'प्रवेश पात्रतेसाठी, कृपया मला तुमचे पूर्ण नाव आणि 10वीचे टक्के सांगू शकाल का?',
  },
  askNameAnd10thParent: {
    en: "To check your child's eligibility, could you please tell me your child's name and their 10th standard percentage?",
    hi: 'अपने बच्चे की पात्रता चेक करने के लिए, क्या आप मुझे अपने बच्चे का नाम और उनका 10वीं कक्षा का प्रतिशत बता सकते हैं?',
    mr: 'आपल्या पाल्याच्या प्रवेश पात्रतेसाठी, कृपया मला तुमच्या पाल्याचे नाव आणि त्यांचे 10वीचे टक्के सांगू शकाल का?',
  },
  askNameOnlyStudent: {
    en: 'Thank you! And may I know your full name?',
    hi: 'धन्यवाद! और क्या मैं आपका पूरा नाम जान सकता हूँ?',
    mr: 'धन्यवाद! आणि मला तुमचे पूर्ण नाव समजू शकेल का?',
  },
  askNameOnlyParent: {
    en: "Thank you! And may I know your child's full name?",
    hi: 'धन्यवाद! और क्या मैं आपके बच्चे का पूरा नाम जान सकता हूँ?',
    mr: 'धन्यवाद! आणि मला तुमच्या पाल्याचे नाव समजू शकेल का?',
  },
  ask10th: {
    en: 'Could you please tell me your 10th standard percentage?',
    hi: 'क्या आप मुझे अपने 10वीं कक्षा का प्रतिशत बता सकते हैं?',
    mr: 'कृपया मला तुमचे 10वीचे टक्के सांगू शकाल का?',
  },
  ask12th: {
    en: 'And what was your 12th standard percentage?',
    hi: 'और आपका 12वीं कक्षा में कितना प्रतिशत था?',
    mr: 'आणि तुमचे 12वीचे टक्के किती होते?',
  },
  askCet: {
    en: 'What is your MHT-CET or NMIMS-CET percentile?',
    hi: 'आपका सीईटी परसेंटाइल कितना है?',
    mr: 'तुमचा सीईटी पर्सेंटाईल किती आहे?',
  },
  askBranch: {
    en: 'Which branch are you interested in? At STME Dhule, we offer Computer Engineering, CSE in AI & ML, CSE in Data Science, Information Technology, Mechanical, Civil, and Electrical Engineering.',
    hi: 'आप किस ब्रांच में रुचि रखते हैं? हमारे पास कंप्यूटर इंजीनियरिंग, सीएसई (एआई और एमएल), सीएसई (डेटा साइंस), आईटी, मैकेनिकल, सिविल, और इलेक्ट्रिकल इंजीनियरिंग उपलब्ध हैं।',
    mr: 'आपण कोणत्या शाखेत प्रवेश घेऊ इच्छिता? आमच्याकडे कॉम्प्युटर इंजिनिअरिंग, सीएसई (एआय आणि एमएल), सीएसई (डेटा सायन्स), आयटी, मेकॅनिकल, सिव्हिल, आणि इलेक्ट्रिकल इंजिनिअरिंग उपलब्ध आहेत.',
  },
  allBranchesList: {
    en: 'At SVKM NMIMS Dhule STME, we offer 7 B.Tech engineering branches: 1. Computer Engineering, 2. CSE in AI & Machine Learning, 3. CSE in Data Science, 4. Information Technology, 5. Mechanical Engineering, 6. Civil Engineering, and 7. Electrical Engineering. We also offer BBA and B.Com in Commerce, and B.Pharm in Pharmacy. Which branch would you like to know more about?',
    hi: 'एसवीकेएम एनएमआईएमएस धुले STME में कुल ७ बी.टेक इंजीनियरिंग ब्रांचेस उपलब्ध हैं: १. कंप्यूटर इंजीनियरिंग, २. सीएसई (एआई और मशीन लर्निंग), ३. सीएसई (डेटा साइंस), ४. इंफॉर्मेशन टेक्नोलॉजी (आईटी), ५. मैकेनिकल इंजीनियरिंग, ६. सिविल इंजीनियरिंग, और ७. इलेक्ट्रिकल इंजीनियरिंग। इसके अलावा स्कूल ऑफ कॉमर्स में BBA और B.Com, तथा स्कूल ऑफ फार्मेसी में B.Pharm भी उपलब्ध हैं। आप किस ब्रांच में रुचि रखते हैं?',
    mr: 'एसव्हीकेएम एनएमआयएमएस धुळे STME मध्ये एकूण ७ बी.टेक इंजिनिअरिंग शाखा उपलब्ध आहेत: १. कॉम्प्युटर इंजिनिअरिंग, २. सीएसई (एआय आणि मशीन लर्निंग), ३. सीएसई (डेटा सायन्स), ४. इन्फॉर्मेशन टेक्नॉलॉजी (आयटी), ५. मेकॅनिकल इंजिनिअरिंग, ६. सिव्हिल इंजिनिअरिंग, आणि ७. इलेक्ट्रिकल इंजिनिअरिंग. याशिवाय स्कूल ऑफ कॉमर्समध्ये BBA आणि B.Com, तसेच स्कूल ऑफ फार्मसीमध्ये B.Pharm उपलब्ध आहेत. आपल्याला कोणत्या शाखेबद्दल अधिक जाणून घ्यायचे आहे?',
  },
  humanTransferPrompt: {
    en: 'The fee structure, cutoffs, and scholarship details vary by academic year. I will connect you right away with an admission counsellor who can provide the latest verified details. Please stay on the line.',
    hi: 'फीस स्ट्रक्चर, कटऑफ और स्कॉलरशिप की जानकारी हर शैक्षणिक वर्ष के अनुसार अपडेट होती है। मैं आपको अभी हमारे एडमिशन काउंसलर से कनेक्ट कर रहा हूँ। कृपया लाइन पर बने रहें।',
    mr: 'फी रचना, कटऑफ आणि शिष्यवृत्तीची माहिती शैक्षणिक वर्षानुसार बदलते. मी आपल्याला थेट प्रवेश समुपदेशकांशी (Admission Counsellor) जोडत आहे. कृपया कॉलवर राहा.',
  },
  callbackConfirmed: {
    en: 'Understood. We have scheduled a callback for you during college admission hours. Our admission team will contact you. Have a great day!',
    hi: 'समझ गया। हमने आपके लिए एडमिशन समय में कॉलबैक शेड्यूल कर दिया है। हमारी टीम आपसे संपर्क करेगी। धन्यवाद!',
    mr: 'नक्कीच. आम्ही तुमच्यासाठी कॉलबॅक नोंदवला आहे. आमचे ॲडमिशन कौन्सिलर तुम्हाला संपर्क करतील. धन्यवाद!',
  },
  schoolsInfoAndEngineeringInterest: {
    en: 'At SVKM NMIMS Dhule, we offer 3 premier schools: 1. School of Technology, Management & Engineering (STME) for B.Tech degrees, 2. School of Commerce for BBA and B.Com, and 3. School of Pharmacy for B.Pharm. Are you interested in Engineering (B.Tech) admissions?',
    hi: 'एसवीकेएम एनएमआईएमएस धुले में ३ मुख्य स्कूल्स हैं: १. स्कूल ऑफ टेक्नोलॉजी, मैनेजमेंट एंड इंजीनियरिंग (STME) बी.टेक के लिए, २. स्कूल ऑफ कॉमर्स (BBA और B.Com), और ३. स्कूल ऑफ फार्मेसी (B.Pharm)। क्या आप इंजीनियरिंग (B.Tech) एडमिशन में रुचि रखते हैं?',
    mr: 'एसव्हीकेएम एनएमआयएमएस धुळे येथे ३ प्रमुख स्कूल्स आहेत: १. स्कूल ऑफ टेक्नॉलॉजी, मॅनेजमेंट अँड इंजिनिअरिंग (STME) बी.टेक साठी, २. स्कूल ऑफ कॉमर्स (BBA आणि B.Com साठी), आणि ३. स्कूल ऑफ फार्मसी (B.Pharm साठी). आपण इंजिनिअरिंग (B.Tech) प्रवेशामध्ये इच्छुक आहात का?',
  },
  askQuestionsForNonEngineering: {
    en: 'Understood! We have noted that you are not looking for Engineering. Do you have any specific questions regarding our Commerce or Pharmacy programs, or campus facilities?',
    hi: 'समझ गया! हमने नोट कर लिया है कि आप इंजीनियरिंग में रुचि नहीं रखते हैं। क्या आपके पास हमारे कॉमर्स, फार्मेसी कोर्सेज या कैंपस सुविधाओं के बारे में कोई सवाल है?',
    mr: 'समजले! आम्ही नोंद घेतली आहे की आपल्याला इंजिनिअरिंगमध्ये रस नाही. आपल्याकडे आमच्या कॉमर्स, फार्मसी अभ्यासक्रम किंवा कॅम्पसबद्दल काही प्रश्न आहेत का?',
  },
  generalAdmissionWrapUp: {
    en: 'Thank you for your inquiry! Our admission cell is always here to assist you. Have a wonderful day!',
    hi: 'जानकारी प्राप्त करने के लिए धन्यवाद! हमारी एडमिशन टीम आपकी सहायता के लिए हमेशा उपलब्ध है। आपका दिन शुभ हो!',
    mr: 'चौकशी केल्याबद्दल धन्यवाद! आमची ॲडमिशन टीम आपल्या मदतीसाठी नेहमी उपलब्ध आहे. आपला दिवस चांगला जावो!',
  },
  nonEngineeringSchools: {
    en: 'At SVKM NMIMS Dhule, we also have the School of Commerce (BBA, B.Com Hons) and School of Pharmacy (B.Pharm, MBA Pharma Tech). Which one would you like to explore?',
    hi: 'एसवीकेएम एनएमआईएमएस धुले में स्कूल ऑफ कॉमर्स (बीबीए, बीकॉम) और स्कूल ऑफ फार्मेसी भी उपलब्ध हैं। आप किसमें एडमिशन लेना चाहते हैं?',
    mr: 'एसव्हीकेएम एनएमआयएमएस धुळे येथे स्कूल ऑफ कॉमर्स (BBA, B.Com) आणि स्कूल ऑफ फार्मसी देखील उपलब्ध आहेत. आपण कशामध्ये रस घेता?',
  },
  waitingForResponse: {
    en: 'I am waiting for your response. Please let me know your details.',
    hi: 'मैं आपके उत्तर की प्रतीक्षा कर रही हूँ, कृपया बताइए।',
    mr: 'मी आपल्या उत्तराची वाट पाहत आहे, कृपया सांगा.',
  },
};
