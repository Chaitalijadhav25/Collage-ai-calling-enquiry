// ============================================================================
// NMIMS AI Admission Voice Assistant - Excel Sheet Export & Auto-Saver
// Automatically saves student marks, interested branch, call timestamp & scores
// ============================================================================

import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { Lead, CallRecord } from '../../types';
import { db } from '../../../database/db';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const EXCEL_FILE_PATH = path.join(DATA_DIR, 'nmims_admission_leads.xlsx');

export function formatLeadsForExcel(leads: Lead[]): any[] {
  return leads.map((l, index) => {
    // Look up matching call record if available for precise call duration & time
    const lastCall: CallRecord | undefined = l.last_call_id
      ? db.getCall(l.last_call_id)
      : undefined;

    const callTime = lastCall?.start_time || l.updated_at || l.created_at;
    let formattedDateTime = '';
    try {
      formattedDateTime = new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(callTime));
    } catch (e) {
      formattedDateTime = new Date(callTime).toLocaleString();
    }

    return {
      'Sr. No': index + 1,
      'Lead ID': l.id,
      'Student / Parent Name': l.name,
      'Contact Number': l.phone,
      'Caller Type': l.user_type === 'parent' ? 'Parent' : 'Student',
      'Preferred Language':
        l.preferred_language === 'mr'
          ? 'Marathi'
          : l.preferred_language === 'hi'
          ? 'Hindi'
          : 'English',
      'Interested Branch': l.interested_branch || 'Not Specified',
      'Interested School': l.interested_school || 'STME Engineering',
      '10th Marks (%)': l.marks_10th !== null && l.marks_10th !== undefined ? `${l.marks_10th}%` : 'Pending',
      '12th Marks (%)': l.marks_12th !== null && l.marks_12th !== undefined ? `${l.marks_12th}%` : 'Pending',
      'CET Score / Percentile':
        l.cet_percentile !== null && l.cet_percentile !== undefined ? l.cet_percentile : 'Pending',
      'Engineering Interest':
        l.engineering_interest === true
          ? 'Yes'
          : l.engineering_interest === false
          ? 'No'
          : 'Enquired',
      'Call Date & Time (IST)': formattedDateTime,
      'Call Duration (Sec)': lastCall?.duration_seconds ?? 0,
      'Call Outcome': l.call_outcome,
      'Live Counsellor Transfer':
        l.transfer_status === 'TRANSFERRED'
          ? `Transferred (${lastCall?.transferred_to || 'Admission Desk'})`
          : l.transfer_status === 'IN_TRANSFER'
          ? 'In Transfer'
          : 'Completed on AI',
      'Admission Notes': l.notes || lastCall?.transfer_reason || '',
    };
  });
}

/**
 * Builds an XLSX workbook buffer containing all leads with marks, branch, and time
 */
export function generateExcelWorkbookBuffer(leads: Lead[]): Buffer {
  const records = formatLeadsForExcel(leads);
  const worksheet = XLSX.utils.json_to_sheet(records);

  // Configure column widths for neat Excel rendering
  worksheet['!cols'] = [
    { wch: 8 },  // Sr. No
    { wch: 16 }, // Lead ID
    { wch: 25 }, // Candidate Name
    { wch: 18 }, // Contact Number
    { wch: 14 }, // Caller Type
    { wch: 18 }, // Preferred Language
    { wch: 30 }, // Interested Branch
    { wch: 36 }, // Interested School
    { wch: 16 }, // 10th Marks
    { wch: 16 }, // 12th Marks
    { wch: 22 }, // CET Score
    { wch: 20 }, // Engineering Interest
    { wch: 24 }, // Call Date & Time
    { wch: 20 }, // Call Duration
    { wch: 20 }, // Call Outcome
    { wch: 26 }, // Counsellor Transfer
    { wch: 35 }, // Notes
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'NMIMS Dhule Admission Leads');

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

/**
 * Automatically saves all admission data into the local Excel file on disk
 */
export function autoSaveLeadsToExcelFile(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const leads = Array.from(db.leads.values());
    const buffer = generateExcelWorkbookBuffer(leads);
    fs.writeFileSync(EXCEL_FILE_PATH, buffer);
  } catch (err) {
    console.error('[ExcelAutoSave] Error saving leads to Excel:', err);
  }
}
