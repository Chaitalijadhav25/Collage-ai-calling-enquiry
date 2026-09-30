// ============================================================================
// NMIMS AI Admission Voice Assistant - Database & State Store
// Source of truth for Schools, Programs, Seats, Academic Years, Leads, Calls
// ============================================================================

import {
  School,
  Program,
  AcademicYear,
  Lead,
  CallRecord,
  CounsellorConfig,
  CallbackRequest,
  KnowledgeDocument,
  SystemSettings,
  CallStatus,
  CallOutcome,
} from '../src/types';

class AdmissionDatabase {
  public schools: Map<string, School> = new Map();
  public programs: Map<string, Program> = new Map();
  public academicYears: Map<string, AcademicYear> = new Map();
  public leads: Map<string, Lead> = new Map();
  public calls: Map<string, CallRecord> = new Map();
  public counsellors: Map<string, CounsellorConfig> = new Map();
  public callbacks: Map<string, CallbackRequest> = new Map();
  public knowledgeDocuments: Map<string, KnowledgeDocument> = new Map();

  public settings: SystemSettings = {
    active_academic_year: '2026-27',
    calling_hours_start: process.env.CALLING_HOURS_START || '09:00',
    calling_hours_end: process.env.CALLING_HOURS_END || '19:00',
    timezone: process.env.CALLING_TIMEZONE || 'Asia/Kolkata',
    telephony_provider: (process.env.TELEPHONY_PROVIDER as any) || 'twilio',
    twilio_account_sid: process.env.TWILIO_ACCOUNT_SID || '',
    twilio_auth_token: process.env.TWILIO_AUTH_TOKEN || '',
    twilio_phone_number: process.env.TWILIO_PHONE_NUMBER || '',
    exotel_account_sid: process.env.EXOTEL_ACCOUNT_SID || '',
    exotel_api_key: process.env.EXOTEL_API_KEY || '',
    exotel_api_token: process.env.EXOTEL_API_TOKEN || '',
    exotel_caller_id: process.env.EXOTEL_CALLER_ID || '',
    counsellor_phone_number: process.env.COUNSELLOR_PHONE_NUMBER || '+919876543210',
    counsellor_name: process.env.COUNSELLOR_NAME || 'NMIMS Dhule Admission Cell',
    call_recording_enabled: true,
    consent_announcement_enabled: true,
  };

  constructor() {
    this.seedDefaultData();
  }

  private seedDefaultData() {
    // 1. Academic Years
    const ay26: AcademicYear = {
      id: 'ay_2026_27',
      year_name: '2026-27',
      is_active: true,
      start_date: '2026-06-01',
      end_date: '2027-05-31',
      notes: 'Current active academic admission cycle',
    };
    const ay27: AcademicYear = {
      id: 'ay_2027_28',
      year_name: '2027-28',
      is_active: false,
      start_date: '2027-06-01',
      end_date: '2028-05-31',
      notes: 'Upcoming academic year intake',
    };
    this.academicYears.set(ay26.year_name, ay26);
    this.academicYears.set(ay27.year_name, ay27);

    // 2. Schools at SVKM NMIMS Dhule Campus
    const schSTME: School = {
      id: 'sch_stme',
      name: 'School of Technology, Management & Engineering (STME)',
      short_code: 'STME',
      description: 'Engineering and technology programs with modern AI/ML labs, industry mentorship, and practical training.',
      is_active: true,
    };
    const schSOC: School = {
      id: 'sch_soc',
      name: 'School of Commerce',
      short_code: 'SOC',
      description: 'Undergraduate business administration and commerce education preparing leaders for finance, banking, and management.',
      is_active: true,
    };
    const schSPTM: School = {
      id: 'sch_sptm',
      name: 'School of Pharmacy & Technology Management (SPTM)',
      short_code: 'SPTM',
      description: 'Integrated pharmaceutical sciences and pharma tech management degree accredited by PCI.',
      is_active: true,
    };
    this.schools.set(schSTME.id, schSTME);
    this.schools.set(schSOC.id, schSOC);
    this.schools.set(schSPTM.id, schSPTM);

    // 3. Programs with verified database seat numbers
    const programsData: Program[] = [
      // STME Engineering Branches
      {
        id: 'prog_btech_ce',
        school_id: schSTME.id,
        school_name: schSTME.name,
        program_name: 'Computer Engineering',
        degree: 'B.Tech',
        specialization: 'Core Computing & Systems',
        total_seats: 60,
        available_seats: 18,
        academic_year: '2026-27',
        admission_status: 'OPEN',
        eligibility: '10+2 with Physics, Mathematics, and Chemistry/Vocational with minimum 45% marks (40% for reserved) and valid CET/NMIMS-CET score.',
        is_active: true,
        last_updated: new Date().toISOString(),
      },
      {
        id: 'prog_btech_aiml',
        school_id: schSTME.id,
        school_name: schSTME.name,
        program_name: 'CSE (AI & ML)',
        degree: 'B.Tech',
        specialization: 'Artificial Intelligence & Machine Learning',
        total_seats: 60,
        available_seats: 15,
        academic_year: '2026-27',
        admission_status: 'OPEN',
        eligibility: '10+2 with Physics, Mathematics, and Chemistry with minimum 45% aggregate and valid CET score.',
        is_active: true,
        last_updated: new Date().toISOString(),
      },
      {
        id: 'prog_btech_ds',
        school_id: schSTME.id,
        school_name: schSTME.name,
        program_name: 'CSE (Data Science)',
        degree: 'B.Tech',
        specialization: 'Big Data & Cloud Analytics',
        total_seats: 60,
        available_seats: 22,
        academic_year: '2026-27',
        admission_status: 'OPEN',
        eligibility: '10+2 with Physics & Mathematics with minimum 45% aggregate and valid CET score.',
        is_active: true,
        last_updated: new Date().toISOString(),
      },
      {
        id: 'prog_btech_it',
        school_id: schSTME.id,
        school_name: schSTME.name,
        program_name: 'Information Technology',
        degree: 'B.Tech',
        specialization: 'Enterprise Networks & Software Engineering',
        total_seats: 60,
        available_seats: 28,
        academic_year: '2026-27',
        admission_status: 'OPEN',
        eligibility: '10+2 with PCM aggregate min 45% and CET score.',
        is_active: true,
        last_updated: new Date().toISOString(),
      },
      {
        id: 'prog_btech_mech',
        school_id: schSTME.id,
        school_name: schSTME.name,
        program_name: 'Mechanical Engineering',
        degree: 'B.Tech',
        specialization: 'Robotics & Automation',
        total_seats: 30,
        available_seats: 19,
        academic_year: '2026-27',
        admission_status: 'OPEN',
        eligibility: '10+2 with PCM aggregate min 45% and CET score.',
        is_active: true,
        last_updated: new Date().toISOString(),
      },
      {
        id: 'prog_btech_civil',
        school_id: schSTME.id,
        school_name: schSTME.name,
        program_name: 'Civil Engineering',
        degree: 'B.Tech',
        specialization: 'Smart Infrastructure & Structural Tech',
        total_seats: 30,
        available_seats: 24,
        academic_year: '2026-27',
        admission_status: 'OPEN',
        eligibility: '10+2 with PCM aggregate min 45% and CET score.',
        is_active: true,
        last_updated: new Date().toISOString(),
      },
      {
        id: 'prog_btech_elec',
        school_id: schSTME.id,
        school_name: schSTME.name,
        program_name: 'Electrical Engineering',
        degree: 'B.Tech',
        specialization: 'Power Electronics & IoT',
        total_seats: 30,
        available_seats: 21,
        academic_year: '2026-27',
        admission_status: 'OPEN',
        eligibility: '10+2 with PCM aggregate min 45% and CET score.',
        is_active: true,
        last_updated: new Date().toISOString(),
      },
      // School of Commerce
      {
        id: 'prog_soc_bba',
        school_id: schSOC.id,
        school_name: schSOC.name,
        program_name: 'BBA (Bachelor of Business Administration)',
        degree: 'BBA',
        specialization: 'Finance, Marketing & Business Analytics',
        total_seats: 60,
        available_seats: 14,
        academic_year: '2026-27',
        admission_status: 'OPEN',
        eligibility: '10+2 or equivalent in any stream with minimum 50% aggregate and valid NMIMS NPAT score.',
        is_active: true,
        last_updated: new Date().toISOString(),
      },
      {
        id: 'prog_soc_bcom',
        school_id: schSOC.id,
        school_name: schSOC.name,
        program_name: 'B.Com (Hons.)',
        degree: 'B.Com',
        specialization: 'Accounting, Auditing & Taxation',
        total_seats: 60,
        available_seats: 20,
        academic_year: '2026-27',
        admission_status: 'OPEN',
        eligibility: '10+2 with Mathematics/Statistics with minimum 50% aggregate.',
        is_active: true,
        last_updated: new Date().toISOString(),
      },
      // School of Pharmacy
      {
        id: 'prog_sptm_pharma_tech',
        school_id: schSPTM.id,
        school_name: schSPTM.name,
        program_name: 'B.Pharm + MBA (Pharma Tech)',
        degree: 'Dual Degree (5 Years)',
        specialization: 'Pharmaceutical Technology & Healthcare Management',
        total_seats: 60,
        available_seats: 16,
        academic_year: '2026-27',
        admission_status: 'OPEN',
        eligibility: '10+2 with Physics, Chemistry and Mathematics/Biology with minimum 45% marks.',
        is_active: true,
        last_updated: new Date().toISOString(),
      },
      {
        id: 'prog_sptm_bpharm',
        school_id: schSPTM.id,
        school_name: schSPTM.name,
        program_name: 'B.Pharm (Bachelor of Pharmacy)',
        degree: 'B.Pharm (4 Years)',
        specialization: 'Formulation, Pharmacology & Drug Discovery',
        total_seats: 60,
        available_seats: 18,
        academic_year: '2026-27',
        admission_status: 'OPEN',
        eligibility: '10+2 with Physics, Chemistry, Biology/Mathematics with minimum 45% aggregate and MHT-CET/NEET.',
        is_active: true,
        last_updated: new Date().toISOString(),
      },
    ];

    programsData.forEach((p) => this.programs.set(p.id, p));

    // 4. Primary Counsellors for live call transfer
    const c1: CounsellorConfig = {
      id: 'counsellor_dhule_lead',
      name: 'Prof. Milind Patil (Chief Admission Officer)',
      phone_number: process.env.COUNSELLOR_PHONE_NUMBER || '+919876543210',
      department: 'Central Admissions & Counselling STME',
      is_active: true,
      is_primary_transfer: true,
    };
    const c2: CounsellorConfig = {
      id: 'counsellor_dhule_engg',
      name: 'Ms. Snehal Deshmukh (Engineering Desk)',
      phone_number: '+919822012345',
      department: 'School of Technology Engineering Admissions',
      is_active: true,
      is_primary_transfer: false,
    };
    this.counsellors.set(c1.id, c1);
    this.counsellors.set(c2.id, c2);

    // 5. Knowledge Base Documents (Verified SVKM NMIMS Dhule Campus)
    const docs: KnowledgeDocument[] = [
      {
        id: 'kb_dhule_overview',
        title: 'SVKM NMIMS Dhule Campus Overview & Accreditations',
        category: 'CAMPUS',
        content: `SVKM's NMIMS Global University, Dhule Campus is situated on Mumbai-Agra National Highway (NH-3), Dhule, Maharashtra 424001. NMIMS is a Deemed-to-be-University accredited with NAAC Grade A+ (CGPA 3.59) and Category-I University status by MHRD/UGC. The lush green 33-acre campus provides world-class educational infrastructure for Engineering (STME), Commerce, and Pharmacy.`,
        source_url: 'https://www.svkmnmimsgu.ac.in/about-svkm-nmims-global-university',
        academic_year: '2026-27',
        is_verified: true,
        last_verified_at: new Date().toISOString(),
      },
      {
        id: 'kb_campus_facilities',
        title: 'Campus Infrastructure, Labs, Library & Sports',
        category: 'FACILITIES',
        content: `NMIMS Dhule features state-of-the-art campus facilities across 33 acres:
1. Academic: Fully air-conditioned smart interactive classrooms, high-speed campus-wide WiFi (1 Gbps), and a 500-seat multi-purpose auditorium.
2. Labs: Advanced computing and AI/ML laboratories with high-end workstations, physics and chemistry laboratories, mechanical and robotics workshops.
3. Central Library: Air-conditioned modern library housing over 20,000 textbooks, reference volumes, national/international journals, IEEE digital library access, and DELNET e-resources.
4. Sports & Fitness: Comprehensive sports complex including a full-sized cricket ground, football turf, basketball court, badminton courts, table tennis, and fully equipped gymnasium.
5. Campus Amenities: Hygienic cafeteria, 24x7 medical clinic with on-call doctor, ATM, and 24x7 CCTV security surveillance.`,
        source_url: 'https://www.svkmnmimsgu.ac.in/campus-life',
        academic_year: '2026-27',
        is_verified: true,
        last_verified_at: new Date().toISOString(),
      },
      {
        id: 'kb_hostel_facilities',
        title: 'Hostel and Residential Accommodation',
        category: 'HOSTEL',
        content: `NMIMS Dhule provides secure, fully furnished on-campus residential facilities for male and female students:
- Separate multi-story hostel buildings for boys and girls inside the gated campus with 24x7 security guards and biometric access.
- Twin and triple sharing furnished rooms with bed, wardrobe, study table, and chair. Air-cooled and AC options.
- Dining: Pure vegetarian dining mess providing 4 nutritious, hygienic meals daily (breakfast, lunch, evening snacks, dinner) supervised by food safety committees.
- Recreation & Utilities: High-speed Wi-Fi, laundry facilities, RO filtered drinking water, 24x7 power backup, solar hot water, and recreation lounge with television and indoor board games.
- Exact hostel room allotment fees for the current academic year are provided by the admission counsellor.`,
        source_url: 'https://www.svkmnmimsgu.ac.in/campus-life',
        academic_year: '2026-27',
        is_verified: true,
        last_verified_at: new Date().toISOString(),
      },
      {
        id: 'kb_location_transport',
        title: 'Location, Connectivity & Transportation',
        category: 'LOCATION',
        content: `NMIMS Dhule is conveniently located on Mumbai-Agra National Highway NH-3, Dhule, Maharashtra (behind Gurudwara).
- Connectivity: Approx 8 km from Dhule Railway Station and 6 km from Central Bus Stand. Nearest airports are Chhatrapati Sambhajinagar (Aurangabad) and Indore.
- College Transport: Dedicated fleet of sanitized college buses operating across multiple routes throughout Dhule city for day scholars and local students.`,
        source_url: 'https://www.svkmnmimsgu.ac.in/contact-us',
        academic_year: '2026-27',
        is_verified: true,
        last_verified_at: new Date().toISOString(),
      },
      {
        id: 'kb_placements_industry',
        title: 'STME Training, Placement & Industry Collaboration',
        category: 'PLACEMENTS',
        content: `The STME Dhule training and placement cell collaborates closely with top technology, core engineering, and consulting firms. Key recruiting partners across NMIMS campuses include TCS, Infosys, Capgemini, Accenture, L&T, Tech Mahindra, Cognizant, and emerging tech startups. Students undergo mandatory summer internships, soft skill bootcamps, and hackathons starting from the 3rd year.`,
        source_url: 'https://www.svkmnmimsgu.ac.in/placements',
        academic_year: '2026-27',
        is_verified: true,
        last_verified_at: new Date().toISOString(),
      },
    ];
    docs.forEach((d) => this.knowledgeDocuments.set(d.id, d));

    // 6. Sample Initial Leads
    const sampleLeads: Lead[] = [
      {
        id: 'lead_101',
        name: 'Rahul Patil',
        phone: '+919823456789',
        user_type: 'student',
        preferred_language: 'mr',
        interested_school: 'School of Technology, Management & Engineering (STME)',
        engineering_interest: true,
        marks_10th: 88.4,
        marks_12th: 84.2,
        cet_percentile: 92.5,
        interested_branch: 'Computer Engineering',
        call_status: 'COMPLETED',
        call_outcome: 'INTERESTED',
        transfer_status: 'NOT_TRANSFERRED',
        notes: 'Inquired about Computer Engineering seats in Marathi. Eligible for CAP round 1.',
        created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
        updated_at: new Date(Date.now() - 3600000 * 3.8).toISOString(),
      },
      {
        id: 'lead_102',
        name: 'Sunita Sharma (Parent)',
        phone: '+919811223344',
        user_type: 'parent',
        preferred_language: 'hi',
        interested_school: 'School of Technology, Management & Engineering (STME)',
        engineering_interest: true,
        marks_10th: 91.0,
        marks_12th: 89.5,
        cet_percentile: 94.8,
        interested_branch: 'CSE (AI & ML)',
        call_status: 'TRANSFERRED',
        call_outcome: 'HUMAN_TRANSFER',
        transfer_status: 'TRANSFERRED',
        notes: 'Parent requested exact 2026 fee structure and hostel costs. Transferred live to admission counsellor.',
        created_at: new Date(Date.now() - 3600000 * 8).toISOString(),
        updated_at: new Date(Date.now() - 3600000 * 7.9).toISOString(),
      },
      {
        id: 'lead_103',
        name: 'Amit Desale',
        phone: '+919922334455',
        user_type: 'student',
        preferred_language: 'en',
        interested_school: 'School of Commerce',
        engineering_interest: false,
        marks_10th: 82.0,
        marks_12th: 85.0,
        cet_percentile: null,
        interested_branch: 'BBA',
        call_status: 'COMPLETED',
        call_outcome: 'INTERESTED',
        transfer_status: 'NOT_TRANSFERRED',
        notes: 'Interested in BBA at School of Commerce. NPAT registration in progress.',
        created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
        updated_at: new Date(Date.now() - 3600000 * 23.5).toISOString(),
      },
    ];
    sampleLeads.forEach((l) => this.leads.set(l.id, l));
  }

  // --- Program Queries ---
  public getPrograms(academicYear?: string): Program[] {
    const targetYear = academicYear || this.settings.active_academic_year;
    return Array.from(this.programs.values()).filter(
      (p) => p.is_active && (!targetYear || p.academic_year === targetYear)
    );
  }

  public getEngineeringPrograms(academicYear?: string): Program[] {
    return this.getPrograms(academicYear).filter(
      (p) => p.school_id === 'sch_stme' || p.degree.toLowerCase().includes('b.tech')
    );
  }

  public findProgramByName(name: string): Program | undefined {
    const q = name.toLowerCase().trim();
    return Array.from(this.programs.values()).find((p) => {
      const pName = p.program_name.toLowerCase();
      const spec = (p.specialization || '').toLowerCase();
      return (
        pName.includes(q) ||
        q.includes(pName) ||
        (q.includes('computer') && pName.includes('computer')) ||
        (q.includes('ai') && pName.includes('ai')) ||
        (q.includes('data science') && pName.includes('data science')) ||
        (q.includes('it') && (pName === 'information technology' || pName.includes('it'))) ||
        (q.includes('mechanical') && pName.includes('mechanical')) ||
        (q.includes('civil') && pName.includes('civil')) ||
        (q.includes('electrical') && pName.includes('electrical')) ||
        (q.includes('bba') && pName.includes('bba')) ||
        (q.includes('pharmacy') && pName.includes('pharm'))
      );
    });
  }

  // --- Calling Hours Checker ---
  public isWithinCallingHours(): { allowed: boolean; reason?: string } {
    try {
      const now = new Date();
      // Formatter in Asia/Kolkata
      const istTimeStr = new Intl.DateTimeFormat('en-US', {
        timeZone: this.settings.timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(now);

      const [curH, curM] = istTimeStr.split(':').map(Number);
      const [startH, startM] = this.settings.calling_hours_start.split(':').map(Number);
      const [endH, endM] = this.settings.calling_hours_end.split(':').map(Number);

      const curMinutes = curH * 60 + curM;
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;

      if (curMinutes >= startMinutes && curMinutes <= endMinutes) {
        return { allowed: true };
      } else {
        return {
          allowed: false,
          reason: `Current time in ${this.settings.timezone} (${istTimeStr}) is outside allowed calling hours (${this.settings.calling_hours_start} to ${this.settings.calling_hours_end} IST).`,
        };
      }
    } catch (e: any) {
      return { allowed: true }; // Fallback to avoid blocking if timezone parse fails
    }
  }

  // --- Lead & Call Operations ---
  public upsertLead(lead: Lead): Lead {
    lead.updated_at = new Date().toISOString();
    this.leads.set(lead.id, lead);
    return lead;
  }

  public getLead(id: string): Lead | undefined {
    return this.leads.get(id);
  }

  public findLeadByPhone(phone: string): Lead | undefined {
    const cleanPhone = phone.replace(/[^\d+]/g, '');
    return Array.from(this.leads.values()).find(
      (l) => l.phone.replace(/[^\d+]/g, '') === cleanPhone
    );
  }

  public upsertCall(call: CallRecord): CallRecord {
    this.calls.set(call.id, call);
    return call;
  }

  public getCall(id: string): CallRecord | undefined {
    return this.calls.get(id);
  }

  public getPrimaryCounsellor(): CounsellorConfig {
    const primary = Array.from(this.counsellors.values()).find((c) => c.is_primary_transfer && c.is_active);
    if (primary) return primary;
    return {
      id: 'default',
      name: this.settings.counsellor_name,
      phone_number: this.settings.counsellor_phone_number,
      department: 'Admissions Office',
      is_active: true,
      is_primary_transfer: true,
    };
  }

  public getDashboardStats() {
    const allCalls = Array.from(this.calls.values());
    const allLeads = Array.from(this.leads.values());
    const today = new Date().toISOString().split('T')[0];

    const callsToday = allCalls.filter((c) => c.start_time.startsWith(today)).length;
    const successfulCalls = allCalls.filter(
      (c) => c.status === 'COMPLETED' || c.status === 'TRANSFERRED'
    ).length;
    const missedCalls = allCalls.filter(
      (c) => c.status === 'NO_ANSWER' || c.status === 'BUSY' || c.status === 'FAILED'
    ).length;
    const interestedStudents = allLeads.filter((l) => l.call_outcome === 'INTERESTED').length;
    const engineeringEnquiries = allLeads.filter((l) => l.engineering_interest === true).length;
    const humanTransfers = allCalls.filter((c) => c.status === 'TRANSFERRED' || c.transferred_to).length;

    return {
      totalLeads: allLeads.length,
      callsToday,
      successfulCalls,
      missedCalls,
      interestedStudents,
      engineeringEnquiries,
      humanTransfers,
      totalCalls: allCalls.length,
      activeAcademicYear: this.settings.active_academic_year,
      callingHours: `${this.settings.calling_hours_start} - ${this.settings.calling_hours_end} (${this.settings.timezone})`,
    };
  }

  public getAllKnowledgeFacts(): string[] {
    const facts: string[] = [];
    for (const doc of this.knowledgeDocuments.values()) {
      if (doc.is_verified) {
        facts.push(`${doc.title} (${doc.category}): ${doc.content.replace(/\n+/g, ' ')}`);
      }
    }
    for (const prog of this.programs.values()) {
      facts.push(`${prog.program_name} (${prog.school_name}): ${prog.total_seats ?? 60} total seats, ${prog.available_seats ?? 0} available seats.`);
    }
    return facts;
  }
}

export const db = new AdmissionDatabase();
