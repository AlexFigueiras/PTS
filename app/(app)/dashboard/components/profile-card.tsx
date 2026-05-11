'use client';

import { Star, Users } from 'lucide-react';

export function ProfileCard() {
  return (
    <div className="rounded-[2rem] bg-white p-8 shadow-sm text-center">
      <h3 className="mb-6 text-left text-lg font-semibold text-slate-800">Profile</h3>
      
      <div className="mx-auto mb-4 h-24 w-24 rounded-full bg-slate-200" />
      <h4 className="text-lg font-bold text-slate-800">Dr James Smith</h4>
      <p className="mb-8 text-sm text-slate-400">Cardiologists doctors</p>

      <div className="flex justify-between border-b border-slate-100 pb-8">
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-1 text-[#004AAD]">
            <Star size={16} fill="currentColor" />
            <span className="font-bold">4.5</span>
          </div>
          <span className="text-xs text-slate-400">Rating</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-1 text-[#004AAD]">
            <Users size={16} />
            <span className="font-bold">115</span>
          </div>
          <span className="text-xs text-slate-400">Patient</span>
        </div>
      </div>

      <div className="mt-8 space-y-6 text-left">
        {[
          { name: 'Linda Brown', msg: 'Dr. James is a great doctor!' },
          { name: 'John Doe', msg: 'Dr. James is my favourite' },
          { name: 'James Vane', msg: 'Thanks Doc!' },
        ].map((rev, i) => (
          <div key={i} className="flex gap-4">
            <div className="h-8 w-8 shrink-0 rounded-full bg-slate-200" />
            <div>
              <p className="text-sm font-bold text-slate-800">{rev.name}</p>
              <p className="text-xs text-slate-400 line-clamp-1">{rev.msg}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
