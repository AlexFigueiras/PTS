'use client';

import { FileText, MoreVertical } from 'lucide-react';

const files = [
  { name: 'Linda Pres***.pdf' },
  { name: 'John Checkup.pdf' },
  { name: 'James Pres***.pdf' },
  { name: 'Nelly X-ray result.pdf' },
];

export function PatientFiles() {
  return (
    <div className="rounded-[2rem] bg-white p-8 shadow-sm">
      <div className="mb-8 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800">Patient File</h3>
        <button className="rounded-lg bg-[#00D094] px-4 py-1.5 text-xs font-medium text-white">
          View All
        </button>
      </div>

      <div className="space-y-4">
        {files.map((file, i) => (
          <div key={i} className="flex items-center justify-between rounded-2xl border border-slate-50 p-4 transition-colors hover:bg-slate-50">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#004AAD]/10 text-[#004AAD]">
                <FileText size={20} />
              </div>
              <span className="text-sm font-medium text-slate-700">{file.name}</span>
            </div>
            <div className="flex items-center gap-2">
               <button className="h-8 w-8 flex items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                <FileText size={16} />
               </button>
               <button className="h-8 w-8 flex items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                <MoreVertical size={16} />
               </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
