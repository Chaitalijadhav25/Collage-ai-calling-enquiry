// ============================================================================
// NMIMS AI Admission Voice Assistant - Knowledge Base & Official Website Scraper
// RAG documents with verification status and official website synchronization
// ============================================================================

import React, { useState } from 'react';
import {
  BookOpen,
  Globe,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Plus,
  ShieldCheck,
  Search,
  Upload,
} from 'lucide-react';
import { KnowledgeDocument } from '../types';
import { api } from '../services/api';

interface KnowledgeBaseViewProps {
  documents: KnowledgeDocument[];
  onDocumentAdded: (doc: KnowledgeDocument) => void;
}

export const KnowledgeBaseView: React.FC<KnowledgeBaseViewProps> = ({
  documents,
  onDocumentAdded,
}) => {
  const [importUrl, setImportUrl] = useState(
    'https://www.svkmnmimsgu.ac.in/about-svkm-nmims-global-university'
  );
  const [importTitle, setImportTitle] = useState('');
  const [importContent, setImportContent] = useState('');
  const [importCategory, setImportCategory] = useState('CAMPUS');
  const [isImporting, setIsImporting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importTitle.trim() || !importContent.trim()) {
      alert('Please provide a document title and verified factual content.');
      return;
    }

    setIsImporting(true);
    setNotice(null);

    try {
      const res = await api.importKnowledgeDoc({
        url: importUrl,
        title: importTitle.trim(),
        category: importCategory,
        content: importContent.trim(),
      });

      onDocumentAdded(res.document);
      setImportTitle('');
      setImportContent('');
      setNotice('Knowledge article verified and added to the admission reasoning pipeline.');
    } catch (e: any) {
      console.error(e);
      setNotice('Failed to import document.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-red-700" />
            <span>Verified Knowledge Base & Official Website Synchronization</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            RAG source of truth for SVKM NMIMS Dhule. Dynamic details (fees, cutoffs) are strictly gated from AI hallucination and directed to live counsellors.
          </p>
        </div>

        <a
          href="https://www.svkmnmimsgu.ac.in/about-svkm-nmims-global-university"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors"
        >
          <Globe className="w-3.5 h-3.5 text-slate-500" />
          <span>Official University Portal</span>
          <ExternalLink className="w-3 h-3 text-slate-400" />
        </a>
      </div>

      {notice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Two Column Layout: Import Form & Verified Articles */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Import / Add Document Card */}
        <div className="lg:col-span-1 bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5 text-red-700" />
              <span>Import Official Information</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Synchronize official website pages or policy bulletins
            </p>
          </div>

          <form onSubmit={handleImport} className="space-y-3 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Source URL</label>
              <input
                type="url"
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                placeholder="https://www.svkmnmimsgu.ac.in/..."
                className="w-full px-3 py-1.5 border border-slate-300 rounded-md font-mono text-[11px]"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Document Title *</label>
              <input
                type="text"
                required
                value={importTitle}
                onChange={(e) => setImportTitle(e.target.value)}
                placeholder="e.g. STME Robotics & Automation Laboratory"
                className="w-full px-3 py-1.5 border border-slate-300 rounded-md"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Category</label>
              <select
                value={importCategory}
                onChange={(e) => setImportCategory(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-md bg-white"
              >
                <option value="CAMPUS">Campus & Infrastructure</option>
                <option value="HOSTEL">Hostel & Dining Facilities</option>
                <option value="PLACEMENTS">Placements & Recruiters</option>
                <option value="FACULTY">Faculty & Research</option>
                <option value="ACCREDITATION">Accreditations & Approvals</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Verified Factual Content *
              </label>
              <textarea
                rows={4}
                required
                value={importContent}
                onChange={(e) => setImportContent(e.target.value)}
                placeholder="Paste the official verified campus information..."
                className="w-full px-3 py-1.5 border border-slate-300 rounded-md resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={isImporting}
              className="w-full py-2 bg-red-700 hover:bg-red-800 disabled:opacity-50 text-white rounded-md font-medium transition-colors cursor-pointer"
            >
              {isImporting ? 'Validating & Indexing...' : 'Publish to Voice Agent'}
            </button>
          </form>
        </div>

        {/* Existing Verified Knowledge Documents */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Active Verified Knowledge Documents ({documents.length})
            </h3>
            <span className="text-[11px] text-emerald-600 flex items-center gap-1 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>RAG Guard Active</span>
            </span>
          </div>

          <div className="space-y-3">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">{doc.title}</span>
                    <span className="px-2 py-0.2 bg-slate-100 text-slate-700 rounded text-[10px] font-semibold uppercase">
                      {doc.category}
                    </span>
                  </div>

                  <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Verified</span>
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                  {doc.content}
                </p>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="truncate max-w-sm">Source: {doc.source_url}</span>
                  <span>Verified: {new Date(doc.last_verified_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
