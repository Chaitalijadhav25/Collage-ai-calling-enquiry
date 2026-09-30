// ============================================================================
// NMIMS AI Admission Voice Assistant - Test Suite
// Validates Language Detection, State Progression, Dynamic Shielding, and DB Queries
// ============================================================================

import { detectLanguage } from '../src/server/ai/language';
import { conversationManager } from '../src/server/ai/conversation';
import { db } from '../database/db';
import { CallRecord } from '../src/types';

async function runTestSuite() {
  console.log('--- Starting NMIMS AI Voice Agent Verification ---');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`);
      failed++;
    }
  }

  // 1. Language Detection Tests
  assert(detectLanguage('Marathi madhe bola') === 'mr', 'Detect explicit Marathi switch');
  assert(detectLanguage('मराठी मध्ये सांगा') === 'mr', 'Detect Devanagari Marathi');
  assert(detectLanguage('Hindi mein baat kijiye') === 'hi', 'Detect explicit Hindi switch');
  assert(detectLanguage('हिंदी में बताओ') === 'hi', 'Detect Devanagari Hindi');
  assert(detectLanguage('Please speak in English') === 'en', 'Detect English');

  // 2. Database & Verified Branch Lookup
  const compEngg = db.findProgramByName('Computer Engineering');
  assert(compEngg !== undefined && compEngg.total_seats === 60, 'DB Query: Computer Engineering verified total seats');
  assert(compEngg !== undefined && compEngg.available_seats === 18, 'DB Query: Computer Engineering verified available seats');

  const aimlEngg = db.findProgramByName('AI & ML');
  assert(aimlEngg !== undefined && aimlEngg.program_name.includes('AI & ML'), 'DB Query: AI & ML branch lookup');

  // 3. Dynamic Fee Shielding & Live Transfer Trigger
  const mockCall: CallRecord = {
    id: 'test_call_001',
    student_name: 'Rahul Patil',
    phone_number: '+919823456789',
    provider: 'browser_demo',
    status: 'CONNECTED',
    outcome: 'COMPLETED',
    language: 'mr',
    conversation_state: 'BRANCH_SELECTION',
    duration_seconds: 45,
    start_time: new Date().toISOString(),
    transcript: [],
    lead_data: {
      name: 'Rahul Patil',
      phone: '+919823456789',
      preferred_language: 'mr',
      engineering_interest: true,
      interested_branch: 'Computer Engineering',
    },
  };

  // Test dynamic fees inquiry -> Must trigger human transfer
  const feeTurn = await conversationManager.handleTurn(mockCall, 'College chi fees kiti aahe?');
  assert(feeTurn.should_transfer === true, 'Dynamic Shield: Fee inquiry triggers transfer');
  assert(feeTurn.transfer_phone !== undefined, 'Dynamic Shield: Counsellor phone supplied');
  assert(feeTurn.new_state === 'HUMAN_TRANSFER', 'Dynamic Shield: State transitions to HUMAN_TRANSFER');

  // 4. Calling Hours Validation
  const hoursCheck = db.isWithinCallingHours();
  assert(typeof hoursCheck.allowed === 'boolean', 'Calling hours compliance check returns valid status');

  // 5. Test: Language selection gives schools info and asks engineering interest
  const langCall: CallRecord = {
    id: 'test_call_lang',
    student_name: 'Amit Shah',
    phone_number: '+919811122233',
    provider: 'browser_demo',
    status: 'CONNECTED',
    outcome: 'COMPLETED',
    language: 'en',
    conversation_state: 'LANGUAGE_SELECTION',
    duration_seconds: 10,
    start_time: new Date().toISOString(),
    transcript: [],
    lead_data: { name: 'Amit Shah', phone: '+919811122233' },
  };

  const schoolInfoTurn = await conversationManager.handleTurn(langCall, 'Hindi');
  assert(schoolInfoTurn.ai_speech.includes('STME') || schoolInfoTurn.ai_speech.includes('टेक्नोलॉजी'), 'Schools Info: Gives schools info after language selection');
  assert(schoolInfoTurn.new_state === 'ENGINEERING_INTEREST', 'Schools Info: Transitions to ENGINEERING_INTEREST');

  // 6. Test: If NOT interested in engineering -> directly ask for any questions
  const nonEngTurn = await conversationManager.handleTurn(langCall, 'Nahi, mujhe engineering nahi chahiye');
  assert(nonEngTurn.new_state === 'GENERAL_QUESTION', 'Non-Engineering: Transitions to GENERAL_QUESTION directly');
  assert(nonEngTurn.updated_lead.engineering_interest === false, 'Non-Engineering: Lead marked as engineering_interest false');
  assert(nonEngTurn.ai_speech.includes('सवाल') || nonEngTurn.ai_speech.includes('questions'), 'Non-Engineering: Directly asks for any questions');

  // 7. Test: If INTERESTED in engineering (Saying "Yes")
  const engCallYes: CallRecord = {
    id: 'test_call_yes',
    student_name: 'Pooja Sharma',
    phone_number: '+919833445566',
    provider: 'browser_demo',
    status: 'CONNECTED',
    outcome: 'COMPLETED',
    language: 'en',
    conversation_state: 'ENGINEERING_INTEREST',
    duration_seconds: 15,
    start_time: new Date().toISOString(),
    transcript: [],
    lead_data: { name: 'Pooja Sharma', phone: '+919833445566' },
  };

  const yesTurn = await conversationManager.handleTurn(engCallYes, 'Yes');
  assert(yesTurn.new_state === 'ACADEMIC_DETAILS_10TH', 'Engineering Yes: Transitions to ACADEMIC_DETAILS_10TH');
  assert(yesTurn.updated_lead.engineering_interest === true, 'Engineering Yes: Lead marked as engineering_interest true');
  assert(yesTurn.ai_speech.includes('B.Tech') || yesTurn.ai_speech.includes('STME'), 'Engineering Yes: Confirms B.Tech / STME engineering programs');

  // 8. Test: Phrase with "know" (e.g. "Yes I want to know about engineering") does not trigger false negative
  const engCallKnow: CallRecord = {
    id: 'test_call_know',
    student_name: 'Vikas Jadhav',
    phone_number: '+919877665544',
    provider: 'browser_demo',
    status: 'CONNECTED',
    outcome: 'COMPLETED',
    language: 'en',
    conversation_state: 'ENGINEERING_INTEREST',
    duration_seconds: 15,
    start_time: new Date().toISOString(),
    transcript: [],
    lead_data: { name: 'Vikas Jadhav', phone: '+919877665544' },
  };

  const knowTurn = await conversationManager.handleTurn(engCallKnow, 'Yes I want to know about engineering');
  assert(knowTurn.new_state === 'ACADEMIC_DETAILS_10TH', 'Engineering "know": Does not trigger false negative, transitions to 10th details');
  assert(knowTurn.updated_lead.engineering_interest === true, 'Engineering "know": Correctly sets engineering_interest = true');

  // 9. Test: Hindi "Haanji engineering karni hai"
  const engCallHindi: CallRecord = {
    id: 'test_call_hi',
    student_name: 'Rohan Gupta',
    phone_number: '+919877665511',
    provider: 'browser_demo',
    status: 'CONNECTED',
    outcome: 'COMPLETED',
    language: 'hi',
    conversation_state: 'ENGINEERING_INTEREST',
    duration_seconds: 15,
    start_time: new Date().toISOString(),
    transcript: [],
    lead_data: { name: 'Rohan Gupta', phone: '+919877665511' },
  };

  const hindiTurn = await conversationManager.handleTurn(engCallHindi, 'Haanji engineering karni hai');
  assert(hindiTurn.new_state === 'ACADEMIC_DETAILS_10TH', 'Engineering Hindi: Transitions to ACADEMIC_DETAILS_10TH');
  assert(hindiTurn.updated_lead.engineering_interest === true, 'Engineering Hindi: Sets engineering_interest = true');

  // 10. Test: Inquiry asking for all branch names
  const branchListCall: CallRecord = {
    id: 'test_call_branch_list',
    student_name: 'Anita Deshmukh',
    phone_number: '+919822334455',
    provider: 'browser_demo',
    status: 'CONNECTED',
    outcome: 'COMPLETED',
    language: 'hi',
    conversation_state: 'ENGINEERING_INTEREST',
    duration_seconds: 15,
    start_time: new Date().toISOString(),
    transcript: [],
    lead_data: { name: 'Anita Deshmukh', phone: '+919822334455' },
  };

  const branchListTurn = await conversationManager.handleTurn(branchListCall, 'sabhi branches ka naam batao');
  assert(branchListTurn.ai_speech.includes('कंप्यूटर इंजीनियरिंग') && branchListTurn.ai_speech.includes('मैकेनिकल') && branchListTurn.ai_speech.includes('सिविल'), 'Branch List: Accurately speaks all branch names in Hindi');

  // 11. Test: Inquiry asking about campus facilities (even with messy voice speech)
  const facilityCall: CallRecord = {
    id: 'test_call_facility',
    student_name: 'Rajesh Varma',
    phone_number: '+919822339900',
    provider: 'browser_demo',
    status: 'CONNECTED',
    outcome: 'COMPLETED',
    language: 'en',
    conversation_state: 'ENGINEERING_INTEREST',
    duration_seconds: 20,
    start_time: new Date().toISOString(),
    transcript: [],
    lead_data: { name: 'Rajesh Varma', phone: '+919822339900' },
  };

  const facilityTurn = await conversationManager.handleTurn(facilityCall, 'tell me about argument information about campus facilities');
  assert(
    facilityTurn.ai_speech.includes('33-acre') &&
    (facilityTurn.ai_speech.includes('hostel') || facilityTurn.ai_speech.includes('laborator') || facilityTurn.ai_speech.includes('library')),
    'Campus Facilities: Responds with comprehensive 33-acre campus infrastructure and hostel details'
  );
  assert(
    !facilityTurn.ai_speech.includes('Understood. Is there anything else you would like to know regarding SVKM NMIMS Dhule, or shall I connect you with a counsellor?'),
    'Campus Facilities: Does NOT give empty generic fallback'
  );

  // 12. Test: Mid-conversation explicit language switch ("marathi madhe bola")
  const switchCall: CallRecord = {
    id: 'test_call_mid_switch',
    student_name: 'Karan Patil',
    phone_number: '+919877001122',
    provider: 'browser_demo',
    status: 'CONNECTED',
    outcome: 'COMPLETED',
    language: 'en',
    conversation_state: 'ACADEMIC_DETAILS_10TH',
    duration_seconds: 25,
    start_time: new Date().toISOString(),
    transcript: [],
    lead_data: { name: 'Karan Patil', phone: '+919877001122', user_type: 'student' },
  };

  const switchTurn = await conversationManager.handleTurn(switchCall, 'marathi madhe bola');
  assert(switchTurn.language === 'mr', 'Mid-call Switch: Language shifted to Marathi');
  assert(switchTurn.ai_speech.includes('मराठीत बोलूया') || switchTurn.ai_speech.includes('मराठी'), 'Mid-call Switch: Acknowledges Marathi switch warmly');
  assert(switchTurn.ai_speech.includes('नाव') || switchTurn.ai_speech.includes('10वी'), 'Mid-call Switch: Preserves current state prompt in Marathi');

  // 13. Test: Parent caller asks for child's name
  const parentCall: CallRecord = {
    id: 'test_call_parent',
    student_name: 'Suresh Kulkarni (Parent)',
    phone_number: '+919877998877',
    provider: 'browser_demo',
    status: 'CONNECTED',
    outcome: 'COMPLETED',
    language: 'en',
    conversation_state: 'ENGINEERING_INTEREST',
    duration_seconds: 20,
    start_time: new Date().toISOString(),
    transcript: [],
    lead_data: { user_type: 'parent' },
  };

  const parentTurn = await conversationManager.handleTurn(parentCall, 'Yes, interested in B.Tech');
  assert(parentTurn.ai_speech.toLowerCase().includes("child's name") || parentTurn.ai_speech.toLowerCase().includes("child"), 'Parent Name Check: Asks for child name for parent');

  // 14. Test: Student caller asks for full name
  const studentCall: CallRecord = {
    id: 'test_call_student',
    student_name: 'Prospective Student',
    phone_number: '+919877112233',
    provider: 'browser_demo',
    status: 'CONNECTED',
    outcome: 'COMPLETED',
    language: 'en',
    conversation_state: 'ENGINEERING_INTEREST',
    duration_seconds: 20,
    start_time: new Date().toISOString(),
    transcript: [],
    lead_data: { user_type: 'student' },
  };

  const studentTurn = await conversationManager.handleTurn(studentCall, 'Yes, I want engineering');
  assert(studentTurn.ai_speech.toLowerCase().includes('full name') || studentTurn.ai_speech.toLowerCase().includes('your name'), 'Student Name Check: Asks for student own full name');

  console.log(`\nTest Summary: ${passed} passed, ${failed} failed.`);
  return failed === 0;
}

runTestSuite().then((success) => {
  if (!success) process.exit(1);
});
