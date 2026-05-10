'use client';

import dynamic from 'next/dynamic';
import type { PatientLocation } from './patient-map-inner';

const PatientMapInner = dynamic(
  () => import('./patient-map-inner').then((m) => m.PatientMapInner),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[420px] w-full items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
          Carregando mapa…
        </p>
      </div>
    ),
  },
);

export function PatientMap({ patients }: { patients: PatientLocation[] }) {
  return <PatientMapInner patients={patients} />;
}

export type { PatientLocation };
