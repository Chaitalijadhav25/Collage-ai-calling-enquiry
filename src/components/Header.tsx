// ============================================================================
// NMIMS AI Admission Voice Assistant - Header
// ============================================================================

import React, { useState, useEffect } from 'react';
import { PhoneCall, Clock, Calendar, CheckCircle2, AlertTriangle } from 'lucide-react';

interface HeaderProps {
  onOpenMakeCall: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenMakeCall,
}) => {
  const [istTime, setIstTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setIstTime(
        new Intl.DateTimeFormat('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        }).format(now)
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0">
      <div>
        <h2 className="text-base font-semibold text-slate-900 tracking-tight flex items-center gap-2">
          <span>AI Admission Calling System</span>
          <span className="text-xs font-normal text-slate-500">· Dhule Campus Admissions Central</span>
        </h2>
        <p className="text-xs text-slate-500">
          STME Engineering · School of Commerce · School of Pharmacy
        </p>
      </div>

      <div className="flex items-center gap-4 text-xs">
        {/* IST Time */}
        <div className="flex items-center gap-1.5 text-slate-600 font-mono bg-slate-50 px-2.5 py-1 rounded border border-slate-200">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>{istTime || 'IST (Asia/Kolkata)'}</span>
        </div>

        {/* Start AI Call Primary Action */}
        <button
          onClick={onOpenMakeCall}
          className="flex items-center gap-2 px-3.5 py-2 bg-red-700 hover:bg-red-800 text-white font-medium rounded-md shadow-sm transition-colors text-xs cursor-pointer"
        >
          <PhoneCall className="w-3.5 h-3.5" />
          <span>Call Student</span>
        </button>
      </div>
    </header>
  );
};
