// ============================================================================
// NMIMS AI Admission Voice Assistant - Conversation State Manager
// 11-State conversational pipeline with entity extraction and non-linear barge-in
// ============================================================================

import {
  ConversationState,
  SupportedLanguage,
  UserType,
  Lead,
  CallRecord,
  VoiceTurnResponse,
} from '../../types';
import { db } from '../../../database/db';
import { detectLanguage, MULTILINGUAL_RESPONSES } from './language';
import { generateGeminiVoiceResponse } from './gemini';

export class ConversationManager {
  /**
   * Processes a single turn of voice/text from the caller and generates the next agent response
   */
  public async handleTurn(
    call: CallRecord,
    userSpeech: string
  ): Promise<VoiceTurnResponse> {
    const rawSpeech = (userSpeech || '').trim();
    let currentLang = call.language || 'en';

    // 1. Language Detection & Switching on the fly
    const newLang = detectLanguage(rawSpeech, currentLang);
    const languageChanged = newLang !== currentLang;
    currentLang = newLang;
    call.language = currentLang;

    // Append student utterance to transcript
    call.transcript.push({
      id: `tr_${Date.now()}_student`,
      timestamp: new Date().toISOString(),
      speaker: 'STUDENT',
      text: rawSpeech,
      language: currentLang,
    });

    const leadData: Partial<Lead> = call.lead_data || {};
    leadData.preferred_language = currentLang;

    const lower = rawSpeech.toLowerCase();

    // 1b. Mid-conversation explicit language switch (e.g. "marathi madhe bola", "hindi me baat kijiye", "speak in english")
    const isExplicitLanguageSwitch =
      /\b(marathi|marathit|marathimadhe|marathi madhe|मराठी|मराठीत)\b/i.test(rawSpeech) ||
      /\b(hindi|hindime|hindi mein|हिंदी|हिन्दी)\b/i.test(rawSpeech) ||
      /\b(english|in english|speak in english|talk in english|अंग्रेजी|इंग्रजी)\b/i.test(rawSpeech);

    if (
      isExplicitLanguageSwitch &&
      call.conversation_state !== 'LANGUAGE_SELECTION' &&
      call.conversation_state !== 'GREETING'
    ) {
      const ack = MULTILINGUAL_RESPONSES.languageSwitchAck[currentLang];
      let promptInNewLang = '';

      if (call.conversation_state === 'ENGINEERING_INTEREST') {
        promptInNewLang = MULTILINGUAL_RESPONSES.askEngineering[currentLang];
      } else if (call.conversation_state === 'ACADEMIC_DETAILS_10TH') {
        promptInNewLang =
          leadData.user_type === 'parent'
            ? MULTILINGUAL_RESPONSES.askNameAnd10thParent[currentLang]
            : MULTILINGUAL_RESPONSES.askNameAnd10thStudent[currentLang];
      } else if (call.conversation_state === 'ACADEMIC_DETAILS_12TH') {
        promptInNewLang = MULTILINGUAL_RESPONSES.ask12th[currentLang];
      } else if (call.conversation_state === 'ACADEMIC_DETAILS_CET') {
        promptInNewLang = MULTILINGUAL_RESPONSES.askCet[currentLang];
      } else if (call.conversation_state === 'BRANCH_SELECTION') {
        promptInNewLang = MULTILINGUAL_RESPONSES.askBranch[currentLang];
      } else {
        promptInNewLang =
          currentLang === 'mr'
            ? 'आपल्याला कॉलेज किंवा प्रवेश प्रक्रियेबद्दल काही प्रश्न आहेत का?'
            : currentLang === 'hi'
            ? 'क्या आपके पास कॉलेज या एडमिशन के बारे में कोई सवाल है?'
            : 'Do you have any questions regarding admissions or our campus?';
      }

      const switchResponse = `${ack}${promptInNewLang}`;
      this.appendAiTranscript(call, switchResponse, currentLang);

      return {
        call_id: call.id,
        ai_speech: switchResponse,
        language: currentLang,
        new_state: call.conversation_state,
        should_transfer: false,
        updated_lead: leadData,
      };
    }

    // 2. Global Callback & Busy Intent
    if (
      lower.includes('call later') ||
      lower.includes('call tomorrow') ||
      lower.includes('busy now') ||
      lower.includes('kal phone karo') ||
      lower.includes('udyā bolू') ||
      lower.includes('nantar call kara') ||
      lower.includes('busy aaho')
    ) {
      call.conversation_state = 'CALLBACK_SCHEDULING';
      call.outcome = 'CALLBACK_REQUESTED';

      // Schedule callback for tomorrow at 11:00 AM IST
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];

      db.callbacks.set(`cb_${call.id}`, {
        id: `cb_${call.id}`,
        lead_id: call.lead_id,
        student_name: call.student_name,
        phone_number: call.phone_number,
        preferred_date: dateStr,
        preferred_time: '11:00 AM',
        reason: 'Candidate requested later call during AI conversation',
        status: 'PENDING',
        created_at: new Date().toISOString(),
      });

      const responseText = MULTILINGUAL_RESPONSES.callbackConfirmed[currentLang];
      this.appendAiTranscript(call, responseText, currentLang);

      return {
        call_id: call.id,
        ai_speech: responseText,
        language: currentLang,
        new_state: 'COMPLETED',
        should_transfer: false,
        updated_lead: leadData,
      };
    }

    // 3. Dynamic Information Shielding (Fees, Cutoffs, Scholarships, Direct Counsellor request)
    const dynamicKeywords = [
      'fee',
      'fees',
      'kharch',
      'paisa',
      'cutoff',
      'cut off',
      'scholarship',
      'counsellor',
      'counselor',
      'human',
      'person',
      'process',
      'documents',
      'फीस',
      'फी',
      'कटऑफ',
      'शिष्यवृत्ती',
      'काउन्सिलर',
    ];

    const isDynamicQuery = dynamicKeywords.some((k) => lower.includes(k));

    if (isDynamicQuery) {
      call.conversation_state = 'HUMAN_TRANSFER';
      call.status = 'TRANSFERRING';
      call.outcome = 'HUMAN_TRANSFER';

      const transferCounsellor = db.getPrimaryCounsellor();
      call.transferred_to = transferCounsellor.phone_number;
      call.transfer_reason = `User asked about dynamic admission detail: "${rawSpeech}"`;

      leadData.transfer_status = 'IN_TRANSFER';
      leadData.call_outcome = 'HUMAN_TRANSFER';

      const responseText = MULTILINGUAL_RESPONSES.humanTransferPrompt[currentLang];
      this.appendAiTranscript(call, responseText, currentLang);

      return {
        call_id: call.id,
        ai_speech: responseText,
        language: currentLang,
        new_state: 'HUMAN_TRANSFER',
        should_transfer: true,
        transfer_phone: transferCounsellor.phone_number,
        transfer_reason: call.transfer_reason,
        updated_lead: leadData,
      };
    }

    // 4. Branch Seat Lookup (Verified Database Query)
    const isSeatQuery =
      lower.includes('seat') ||
      lower.includes('seats') ||
      lower.includes('जागा') ||
      lower.includes('सीट') ||
      lower.includes('intake');

    if (isSeatQuery) {
      const activeYear = db.settings.active_academic_year;
      // Search database for branch mentioned
      let matchedProgram = db.findProgramByName(lower);
      if (!matchedProgram && leadData.interested_branch) {
        matchedProgram = db.findProgramByName(leadData.interested_branch);
      }
      if (!matchedProgram) {
        matchedProgram = db.findProgramByName('Computer Engineering');
      }

      let seatResponse = '';
      if (matchedProgram && matchedProgram.total_seats !== null) {
        if (currentLang === 'mr') {
          seatResponse = `${matchedProgram.program_name} मध्ये एकूण ${matchedProgram.total_seats} जागा आहेत आणि सध्या ${matchedProgram.available_seats ?? 'काही'} जागा उपलब्ध आहेत.`;
        } else if (currentLang === 'hi') {
          seatResponse = `${matchedProgram.program_name} में कुल ${matchedProgram.total_seats} सीटें हैं, और वर्तमान में ${matchedProgram.available_seats ?? 'कुछ'} सीटें उपलब्ध हैं।`;
        } else {
          seatResponse = `${matchedProgram.program_name} has ${matchedProgram.total_seats} total seats, and ${matchedProgram.available_seats ?? 'several'} seats are currently available.`;
        }
      } else {
        if (currentLang === 'mr') {
          seatResponse = 'सध्या माझ्याकडे नवीनतम पडताळलेली जागा माहिती नाही. मी आपल्याला ॲडमिशन कौन्सिलरशी जोडू शकेन.';
        } else if (currentLang === 'hi') {
          seatResponse = 'मेरे पास वर्तमान में सत्यापित सीट संख्या उपलब्ध नहीं है। मैं आपको हमारे एडमिशन काउंसलर से कनेक्ट कर सकता हूँ।';
        } else {
          seatResponse = 'I do not have the latest verified seat numbers at hand. I can connect you with an admission counsellor.';
        }
      }

      this.appendAiTranscript(call, seatResponse, currentLang);

      return {
        call_id: call.id,
        ai_speech: seatResponse,
        language: currentLang,
        new_state: call.conversation_state,
        should_transfer: false,
        updated_lead: leadData,
      };
    }

    // 4b. Query for listing all branches / programs available
    const isBranchListQuery =
      /\b(which branches|what branches|list of branches|available branches|all branches|show branches)\b/i.test(rawSpeech) ||
      /\b(sabhi branch|sabhi branches|saari branch|konsi branch|kaun si branch|kon si branch|kaun kaun si branch|kya kya branch|branch ke naam|branch batao|branches batao|branch bataiye|branches bataiye|branch list)\b/i.test(rawSpeech) ||
      /\b(kontya branch|kontya shakha|konte courses|branch chi nave|shakha chi nave|branches dakhva)\b/i.test(rawSpeech) ||
      /(ब्रांच.*नाम|शाखा.*नाव|कोणत्या शाखा|सर्व शाखा|सभी ब्रांच|कौन सी ब्रांच)/.test(rawSpeech);

    if (isBranchListQuery) {
      const branchesResponse = MULTILINGUAL_RESPONSES.allBranchesList[currentLang];
      this.appendAiTranscript(call, branchesResponse, currentLang);

      const targetState =
        call.conversation_state === 'BRANCH_SELECTION' ||
        call.conversation_state === 'ENGINEERING_INTEREST' ||
        call.conversation_state === 'GREETING' ||
        call.conversation_state === 'LANGUAGE_SELECTION'
          ? 'BRANCH_SELECTION'
          : call.conversation_state;

      call.conversation_state = targetState;

      return {
        call_id: call.id,
        ai_speech: branchesResponse,
        language: currentLang,
        new_state: targetState,
        should_transfer: false,
        updated_lead: leadData,
      };
    }

    // 4c. Global Query for Campus Facilities, Infrastructure, Hostel, Mess, Library, Sports, Location, Placements
    const isCampusOrFacilityQuery =
      /\b(facilit|facility|facilities|campus|infrastructure|hostel|room|accommodation|mess|food|dining|canteen|cafeteria|library|sports|gym|cricket|football|ground|location|address|where is|transport|bus|placement|package|recruiting)\b/i.test(rawSpeech) ||
      /\b(kaha hai|kuthe ahe|kuthe aahe|suvidha|subidha|rehne|khana|jevan|vachanalay|khel|maidan)\b/i.test(rawSpeech) ||
      /(सुविधा|हॉस्टल|कॅम्पस|कॅंपस|लायब्ररी|मेस|जेवण|खाना|कहाँ स्थित|कुठे आहे|खेळ|मैदान|प्लेसमेंट)/.test(rawSpeech);

    if (isCampusOrFacilityQuery) {
      const facilityRes = await generateGeminiVoiceResponse(rawSpeech, {
        conversationHistory: call.transcript.map((t) => ({ speaker: t.speaker, text: t.text })),
        currentLanguage: currentLang,
        studentName: call.student_name,
        userType: leadData.user_type,
        schoolInterest: leadData.interested_school,
        engineeringInterest: leadData.engineering_interest,
        collectedMarks: {
          marks10th: leadData.marks_10th,
          marks12th: leadData.marks_12th,
          cetPercentile: leadData.cet_percentile,
          branch: leadData.interested_branch,
        },
        verifiedDbFacts: db.getAllKnowledgeFacts(),
      });

      this.appendAiTranscript(call, facilityRes.text, currentLang);

      return {
        call_id: call.id,
        ai_speech: facilityRes.text,
        language: currentLang,
        new_state: call.conversation_state,
        should_transfer: facilityRes.shouldTransfer,
        transfer_phone: facilityRes.shouldTransfer ? db.getPrimaryCounsellor().phone_number : undefined,
        transfer_reason: facilityRes.reason,
        updated_lead: leadData,
      };
    }

    // 5. State Machine Progression
    let aiSpeech = '';
    let nextState: ConversationState = call.conversation_state;

    switch (call.conversation_state) {
      case 'GREETING': {
        // Am I speaking with student or parent?
        const isParent =
          lower.includes('parent') ||
          lower.includes('palak') ||
          lower.includes('father') ||
          lower.includes('mother') ||
          lower.includes('aai') ||
          lower.includes('vadil') ||
          lower.includes('पिता') ||
          lower.includes('माता');
        const isStudent =
          lower.includes('student') ||
          lower.includes('vidyarthi') ||
          lower.includes('main') ||
          lower.includes('mi') ||
          lower.includes('myself');

        if (isParent) {
          leadData.user_type = 'parent';
        } else if (isStudent) {
          leadData.user_type = 'student';
        }

        // Detect if caller already mentioned engineering interest at greeting
        const earlyEnggRegex = /\b(engineering|engineer|engg|btech|b\.tech|stme|computer|cse|cs)\b/i;
        if (earlyEnggRegex.test(rawSpeech)) {
          leadData.engineering_interest = true;
          leadData.interested_school = 'School of Technology, Management & Engineering (STME)';
        }

        // If user already specified or switched language in greeting, provide next step
        if (
          languageChanged ||
          lower.includes('marathi') ||
          lower.includes('hindi') ||
          lower.includes('english')
        ) {
          if (leadData.engineering_interest) {
            nextState = 'ACADEMIC_DETAILS_10TH';
            aiSpeech = MULTILINGUAL_RESPONSES.engineeringConfirmedAndAsk10th[currentLang];
          } else {
            nextState = 'ENGINEERING_INTEREST';
            aiSpeech = MULTILINGUAL_RESPONSES.schoolsInfoAndEngineeringInterest[currentLang];
          }
        } else {
          nextState = 'LANGUAGE_SELECTION';
          aiSpeech = MULTILINGUAL_RESPONSES.askLanguage[currentLang];
        }
        break;
      }

      case 'LANGUAGE_SELECTION': {
        const earlyEnggRegex = /\b(engineering|engineer|engg|btech|b\.tech|stme|computer|cse|cs)\b/i;
        if (earlyEnggRegex.test(rawSpeech) || leadData.engineering_interest) {
          leadData.engineering_interest = true;
          leadData.interested_school = 'School of Technology, Management & Engineering (STME)';
          nextState = 'ACADEMIC_DETAILS_10TH';
          aiSpeech = MULTILINGUAL_RESPONSES.engineeringConfirmedAndAsk10th[currentLang];
        } else {
          nextState = 'ENGINEERING_INTEREST';
          aiSpeech = MULTILINGUAL_RESPONSES.schoolsInfoAndEngineeringInterest[currentLang];
        }
        break;
      }

      case 'USER_TYPE': {
        nextState = 'ENGINEERING_INTEREST';
        aiSpeech = MULTILINGUAL_RESPONSES.schoolsInfoAndEngineeringInterest[currentLang];
        break;
      }

      case 'ENGINEERING_INTEREST': {
        // Specific checks for rejecting engineering
        const rejectsEngineering =
          /\b(no engineering|not engineering|engineering nahi|engineering nako|dont want engineering|don't want engineering|nahi chahiye|nako aahe|not interested)\b/i.test(rawSpeech) ||
          /\b(no|nope|nah|nahi|nahin|naahi|nako)\b.*(engineering|btech|b\.tech)/i.test(rawSpeech) ||
          /(engineering|btech|b\.tech).*\b(nahi|nahin|nako|naahi|nahi chahiye)\b/i.test(rawSpeech) ||
          /(इंजीनियरिंग.*नहीं|इंजिनिअरिंग.*नाही|नाही.*इंजिनिअरिंग|नहीं.*इंजीनियरिंग)/.test(rawSpeech);

        const explicitNegativeRegex =
          /\b(no|nope|nah|nahi|nahin|naahi|nako|not interested|dont want|don't want|never|nahi chahiye|nako aahe|dusra|dusre|non[- ]?engineering)\b/i;
        const nonEngSchoolRegex =
          /\b(commerce|bba|bcom|b\.com|pharmacy|bpharm|b\.pharm|pharma)\b/i;
        const devanagariNegative =
          /(नाही|नको|नकोय|नहीं|ना|रुचि नहीं|कॉमर्स|फार्मेसी)/;

        const isGeneralNegative =
          explicitNegativeRegex.test(rawSpeech) ||
          nonEngSchoolRegex.test(rawSpeech) ||
          devanagariNegative.test(rawSpeech);

        // Explicit engineering keywords
        const enggKeywordsRegex =
          /\b(engineering|engineer|engg|btech|b\.tech|stme|computer|cse|cs|it|mechanical|civil|electrical|ai|ml|data science|datascience)\b/i;
        const devanagariEngg =
          /(इंजीनियरिंग|इंजिनिअरिंग|बीटेक|बी\.टेक|कॉम्प्युटर|अभियांत्रिकी)/;

        // Affirmative words (yes, haan, ho, interested, sure, definitely, etc.)
        const affirmativeRegex =
          /\b(yes|yeah|yep|yup|ya|ha|haan|haa|haanji|ji|ji haan|sahi|bilkul|zaroor|sure|definitely|interested|interest|admission|admissions|apply|want|karna hai|chahiye|ho|nakki|hoye|karaycha|ahe|aahe|hoy)\b/i;
        const devanagariAffirmative =
          /(हाँ|हां|जी हाँ|जी हां|बिलकुल|ज़रूर|करना है|चाहिए|हो|नक्की|पाहिजे|करायचे|करायचं|प्रवेश|घेणार)/;

        const hasEnggKeywords = enggKeywordsRegex.test(rawSpeech) || devanagariEngg.test(rawSpeech);
        const hasAffirmative = affirmativeRegex.test(rawSpeech) || devanagariAffirmative.test(rawSpeech);

        if (rejectsEngineering || (isGeneralNegative && !hasAffirmative && !hasEnggKeywords)) {
          // Explicitly not interested in engineering
          leadData.engineering_interest = false;
          leadData.interested_branch = 'Non-Engineering / Other';
          nextState = 'GENERAL_QUESTION';
          aiSpeech = MULTILINGUAL_RESPONSES.askQuestionsForNonEngineering[currentLang];
        } else if (hasAffirmative || hasEnggKeywords || !isGeneralNegative) {
          // YES / Interested in Engineering!
          leadData.engineering_interest = true;
          leadData.interested_school = 'School of Technology, Management & Engineering (STME)';

          // Extract branch if mentioned together (e.g., "Yes, computer engineering")
          const foundBranch = db.findProgramByName(rawSpeech);
          if (foundBranch) {
            leadData.interested_branch = foundBranch.program_name;
          }

          // Check if candidate also stated their 10th percentage in this turn
          const extracted10th = this.extractPercentage(rawSpeech);
          const possibleName = this.extractName(rawSpeech);
          if (possibleName) {
            leadData.name = possibleName;
            call.student_name = possibleName;
          }

          if (extracted10th !== null) {
            leadData.marks_10th = extracted10th;
            nextState = 'ACADEMIC_DETAILS_12TH';
            aiSpeech = currentLang === 'mr'
              ? `उत्तम! मी ${leadData.name ? leadData.name + ' चे ' : ''}10वीचे ${extracted10th}% नोंदवले आहेत. आणि तुमचे 12वीचे टक्के किती होते?`
              : currentLang === 'hi'
              ? `बहुत बढ़िया! मैंने ${leadData.name ? leadData.name + ' का ' : ''}10वीं का ${extracted10th}% दर्ज कर लिया है। और आपका 12वीं कक्षा में कितना प्रतिशत था?`
              : `Great! I have recorded ${leadData.name ? leadData.name + "'s " : ''}${extracted10th}% in 10th standard. And what was your 12th standard percentage?`;
          } else {
            nextState = 'ACADEMIC_DETAILS_10TH';
            if (leadData.user_type === 'parent') {
              aiSpeech = currentLang === 'mr'
                ? 'उत्तम! आमच्या STME धुळे कॅम्पसमध्ये B.Tech शाखा उपलब्ध आहेत. आपल्या पाल्याच्या प्रवेश पात्रतेसाठी, कृपया मला तुमच्या पाल्याचे (विद्यार्थ्याचे) नाव आणि त्यांचे 10वीचे टक्के सांगू शकाल का?'
                : currentLang === 'hi'
                ? 'बहुत बढ़िया! हमारे STME धुले कैंपस में B.Tech प्रोग्राम्स उपलब्ध हैं। आपके बच्चे की पात्रता चेक करने के लिए, क्या आप मुझे अपने बच्चे का नाम और उनका 10वीं कक्षा का प्रतिशत बता सकते हैं?'
                : "Great! SVKM NMIMS Dhule STME offers B.Tech programs in Computer Engineering, AI & Machine Learning, Data Science, and core branches. To check your child's eligibility, could you please tell me your child's name and their 10th standard percentage?";
            } else {
              aiSpeech = currentLang === 'mr'
                ? 'उत्तम! आमच्या STME धुळे कॅम्पसमध्ये B.Tech शाखा उपलब्ध आहेत. प्रवेश पात्रतेसाठी, कृपया मला तुमचे पूर्ण नाव आणि 10वीचे टक्के सांगू शकाल का?'
                : currentLang === 'hi'
                ? 'बहुत बढ़िया! हमारे STME धुले कैंपस में B.Tech प्रोग्राम्स उपलब्ध हैं। आपकी पात्रता चेक करने के लिए, क्या आप मुझे अपना पूरा नाम और 10वीं का प्रतिशत बता सकते हैं?'
                : 'Great! SVKM NMIMS Dhule STME offers B.Tech programs in Computer Engineering, AI & Machine Learning, Data Science, and core branches. To check your eligibility, could you please tell me your full name and your 10th standard percentage?';
            }
          }
        } else {
          // Fallback if truly negative/unclear
          leadData.engineering_interest = false;
          nextState = 'GENERAL_QUESTION';
          aiSpeech = MULTILINGUAL_RESPONSES.askQuestionsForNonEngineering[currentLang];
        }
        break;
      }

      case 'GENERAL_QUESTION': {
        const negativeClosing =
          lower.includes('no') ||
          lower.includes('nahi') ||
          lower.includes('nahin') ||
          lower.includes('kahi nahi') ||
          lower.includes('nothing') ||
          lower.includes('no question') ||
          lower.includes('thats all') ||
          lower.includes('that is all') ||
          lower.includes('bas') ||
          lower.includes('dhanyawad') ||
          lower.includes('thank');

        if (negativeClosing) {
          nextState = 'COMPLETED';
          call.outcome = 'COMPLETED';
          leadData.call_outcome = 'COMPLETED';
          aiSpeech = MULTILINGUAL_RESPONSES.generalAdmissionWrapUp[currentLang];
        } else {
          // Answer user question about Commerce, Pharmacy, Hostels, etc. using Gemini reasoning
          const geminiRes = await generateGeminiVoiceResponse(rawSpeech, {
            conversationHistory: call.transcript.map((t) => ({ speaker: t.speaker, text: t.text })),
            currentLanguage: currentLang,
            studentName: call.student_name,
            userType: leadData.user_type,
            schoolInterest: leadData.interested_school,
            engineeringInterest: leadData.engineering_interest,
            collectedMarks: {
              marks10th: leadData.marks_10th,
              marks12th: leadData.marks_12th,
              cetPercentile: leadData.cet_percentile,
              branch: leadData.interested_branch,
            },
            verifiedDbFacts: db.getAllKnowledgeFacts(),
          });

          aiSpeech = `${geminiRes.text} ${
            currentLang === 'mr'
              ? 'आणखी काही प्रश्न आहेत का?'
              : currentLang === 'hi'
              ? 'क्या आपके पास कोई और सवाल है?'
              : 'Do you have any other questions?'
          }`;
          nextState = 'GENERAL_QUESTION';
        }
        break;
      }

      case 'ACADEMIC_DETAILS_10TH': {
        const extracted = this.extractPercentage(rawSpeech);
        const extractedName = this.extractName(rawSpeech);
        if (extractedName) {
          leadData.name = extractedName;
          call.student_name = extractedName;
        }

        if (extracted !== null) {
          leadData.marks_10th = extracted;
        }

        nextState = 'ACADEMIC_DETAILS_12TH';
        const isParent = leadData.user_type === 'parent';
        const displayName = leadData.name;

        if (displayName && extracted !== null) {
          if (currentLang === 'mr') {
            aiSpeech = isParent
              ? `धन्यवाद! मी ${displayName} चे 10वीचे ${extracted}% नोंदवले आहेत. आणि त्यांचे 12वीचे टक्के किती होते?`
              : `धन्यवाद ${displayName}! मी तुमचे 10वीचे ${extracted}% नोंदवले आहेत. आणि तुमचे 12वीचे टक्के किती होते?`;
          } else if (currentLang === 'hi') {
            aiSpeech = isParent
              ? `धन्यवाद! मैंने ${displayName} का 10वीं का ${extracted}% दर्ज कर लिया है। और उनका 12वीं कक्षा में कितना प्रतिशत था?`
              : `धन्यवाद ${displayName}! मैंने आपका 10वीं का ${extracted}% दर्ज कर लिया है। और आपका 12वीं कक्षा में कितना प्रतिशत था?`;
          } else {
            aiSpeech = isParent
              ? `Thank you! I have recorded ${displayName}'s 10th standard marks (${extracted}%). And what was their 12th standard percentage?`
              : `Thank you, ${displayName}! I have recorded ${extracted}% in 10th standard. And what was your 12th standard percentage?`;
          }
        } else if (extracted !== null) {
          if (currentLang === 'mr') {
            aiSpeech = isParent
              ? `मी 10वीचे ${extracted}% नोंदवले आहेत. कृपया तुमच्या पाल्याचे नाव आणि त्यांचे 12वीचे टक्के सांगू शकाल का?`
              : `मी तुमचे 10वीचे ${extracted}% नोंदवले आहेत. कृपया तुमचे नाव आणि 12वीचे टक्के सांगू शकाल का?`;
          } else if (currentLang === 'hi') {
            aiSpeech = isParent
              ? `मैंने 10वीं का ${extracted}% दर्ज कर लिया है। कृपया अपने बच्चे का नाम और उनका 12वीं का प्रतिशत बताएं?`
              : `मैंने आपका 10वीं का ${extracted}% दर्ज कर लिया है। कृपया अपना नाम और 12वीं का प्रतिशत बताएं?`;
          } else {
            aiSpeech = isParent
              ? `I have recorded ${extracted}% in 10th standard. Could you please tell me your child's name and their 12th standard percentage?`
              : `I have recorded ${extracted}% in 10th standard. Could you please tell me your full name and your 12th standard percentage?`;
          }
        } else {
          // If only name was given
          if (displayName) {
            aiSpeech = isParent
              ? (currentLang === 'mr'
                  ? `धन्यवाद! कृपया ${displayName} चे 10वीचे टक्के सांगू शकाल का?`
                  : currentLang === 'hi'
                  ? `धन्यवाद! कृपया ${displayName} का 10वीं का प्रतिशत बताएं?`
                  : `Thank you! Could you please tell me ${displayName}'s 10th standard percentage?`)
              : (currentLang === 'mr'
                  ? `धन्यवाद ${displayName}! कृपया तुमचे 10वीचे टक्के सांगू शकाल का?`
                  : currentLang === 'hi'
                  ? `धन्यवाद ${displayName}! कृपया अपना 10वीं का प्रतिशत बताएं?`
                  : `Thank you, ${displayName}! Could you please tell me your 10th standard percentage?`);
            nextState = 'ACADEMIC_DETAILS_10TH';
          } else {
            aiSpeech = isParent
              ? MULTILINGUAL_RESPONSES.askNameAnd10thParent[currentLang]
              : MULTILINGUAL_RESPONSES.askNameAnd10thStudent[currentLang];
            nextState = 'ACADEMIC_DETAILS_10TH';
          }
        }
        break;
      }

      case 'ACADEMIC_DETAILS_12TH': {
        const extracted = this.extractPercentage(rawSpeech);
        if (extracted !== null) {
          leadData.marks_12th = extracted;
        }
        nextState = 'ACADEMIC_DETAILS_CET';
        aiSpeech = MULTILINGUAL_RESPONSES.askCet[currentLang];
        break;
      }

      case 'ACADEMIC_DETAILS_CET': {
        const extracted = this.extractPercentage(rawSpeech);
        if (extracted !== null) {
          leadData.cet_percentile = extracted;
        }
        nextState = 'BRANCH_SELECTION';
        aiSpeech = MULTILINGUAL_RESPONSES.askBranch[currentLang];
        break;
      }

      case 'BRANCH_SELECTION': {
        const foundBranch = db.findProgramByName(rawSpeech);
        if (foundBranch) {
          leadData.interested_branch = foundBranch.program_name;
        } else {
          leadData.interested_branch = rawSpeech;
        }

        leadData.call_outcome = 'INTERESTED';
        call.outcome = 'INTERESTED';
        nextState = 'COMPLETED';

        if (currentLang === 'mr') {
          aiSpeech = `छान! मी तुमची ${leadData.interested_branch} साठीची पसंती नोंदवली आहे. कॉलेज कॅम्पस भेट आणि पुढील प्रवेश प्रक्रियेसाठी आमचे कौन्सिलर तुम्हाला मार्गदर्शन करतील. काही शंका आहे का?`;
        } else if (currentLang === 'hi') {
          aiSpeech = `बहुत अच्छा! मैंने ${leadData.interested_branch} के लिए आपकी पसंद दर्ज कर ली है। हमारी टीम आपको आगे की एडमिशन प्रोसेस में पूरी सहायता करेगी। क्या आपके कोई और प्रश्न हैं?`;
        } else {
          aiSpeech = `Great! I have recorded your interest in ${leadData.interested_branch}. Our admission team will assist you with counseling and campus visits. Do you have any other questions?`;
        }
        break;
      }

      default: {
        // Fallback through Gemini reasoning
        const geminiRes = await generateGeminiVoiceResponse(rawSpeech, {
          conversationHistory: call.transcript.map((t) => ({ speaker: t.speaker, text: t.text })),
          currentLanguage: currentLang,
          studentName: call.student_name,
          userType: leadData.user_type,
          schoolInterest: leadData.interested_school,
          engineeringInterest: leadData.engineering_interest,
          collectedMarks: {
            marks10th: leadData.marks_10th,
            marks12th: leadData.marks_12th,
            cetPercentile: leadData.cet_percentile,
            branch: leadData.interested_branch,
          },
          verifiedDbFacts: [
            'SVKM NMIMS Dhule Campus: 33-acre campus behind Gurudwara on Mumbai-Agra Highway',
            'Computer Engineering: 60 total seats, 18 available seats',
            'CSE (AI & ML): 60 total seats, 15 available seats',
            'CSE (Data Science): 60 total seats, 22 available seats',
            'Information Technology: 60 total seats, 28 available seats',
            'BBA & B.Com: 60 seats each in School of Commerce',
          ],
        });

        aiSpeech = geminiRes.text;
        if (geminiRes.shouldTransfer) {
          nextState = 'HUMAN_TRANSFER';
          call.status = 'TRANSFERRING';
          const transferCounsellor = db.getPrimaryCounsellor();
          call.transferred_to = transferCounsellor.phone_number;
          call.transfer_reason = geminiRes.reason || 'Gemini detected transfer required';
          leadData.transfer_status = 'IN_TRANSFER';

          return {
            call_id: call.id,
            ai_speech: aiSpeech,
            language: currentLang,
            new_state: nextState,
            should_transfer: true,
            transfer_phone: transferCounsellor.phone_number,
            transfer_reason: call.transfer_reason,
            updated_lead: leadData,
          };
        }
        break;
      }
    }

    call.conversation_state = nextState;
    call.lead_data = { ...call.lead_data, ...leadData };
    this.appendAiTranscript(call, aiSpeech, currentLang);

    return {
      call_id: call.id,
      ai_speech: aiSpeech,
      language: currentLang,
      new_state: nextState,
      should_transfer: false,
      updated_lead: leadData,
    };
  }

  private appendAiTranscript(call: CallRecord, text: string, lang: SupportedLanguage) {
    call.transcript.push({
      id: `tr_${Date.now()}_ai`,
      timestamp: new Date().toISOString(),
      speaker: 'AI',
      text,
      language: lang,
    });
  }

  private extractPercentage(text: string): number | null {
    const match = text.match(/(\d{1,2}(?:\.\d{1,2})?)\s*(?:%|percent|टक्के|प्रतिशत)?/);
    if (match) {
      const num = parseFloat(match[1]);
      if (num >= 35 && num <= 100) {
        return num;
      }
    }
    return null;
  }

  private extractName(text: string): string | null {
    if (!text) return null;
    const cleanText = text.trim();

    // 1. Phrasal patterns: "My name is X", "Mera naam X hai", "Maaza naav X", "I am X", "Child name is X"
    const patterns = [
      /(?:my name is|i am|this is|name is)\s+([A-Za-z\u0900-\u097F]+(?:\s+[A-Za-z\u0900-\u097F]+)?)/i,
      /(?:mera naam|naam hai|mera nam|nam hai)\s+([A-Za-z\u0900-\u097F]+(?:\s+[A-Za-z\u0900-\u097F]+)?)/i,
      /(?:maze naav|maaza naav|majhe naav|naav aahe|nav ahe|naav)\s+([A-Za-z\u0900-\u097F]+(?:\s+[A-Za-z\u0900-\u097F]+)?)/i,
      /(?:child name is|son name is|daughter name is|bachhe ka naam|mulyache naav|palyaache naav)\s+([A-Za-z\u0900-\u097F]+(?:\s+[A-Za-z\u0900-\u097F]+)?)/i,
      /([A-Za-z\u0900-\u097F]+(?:\s+[A-Za-z\u0900-\u097F]+)?)\s+(?:here|speaking|bol raha|boltoy|bolte)/i,
    ];

    for (const pat of patterns) {
      const match = cleanText.match(pat);
      if (match && match[1]) {
        const candidate = match[1].trim();
        const fillers = ['student', 'parent', 'yes', 'no', 'sir', 'madam', 'admission', 'engineering', 'marathi', 'hindi', 'english', 'vidyarthi', 'palak', 'percent', 'percentage'];
        if (!fillers.includes(candidate.toLowerCase()) && candidate.length >= 2) {
          return candidate;
        }
      }
    }

    return null;
  }
}

export const conversationManager = new ConversationManager();
