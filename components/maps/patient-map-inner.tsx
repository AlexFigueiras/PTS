'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useRouter } from 'next/navigation';
import { FileText, MapPin, Maximize, X, Stethoscope } from 'lucide-react';

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

import { PUBLIC_SERVICES } from '@/lib/health-services';
import type { HealthService } from '@/lib/health-services';
import { Skeleton } from '@/components/ui/skeleton';

const DefaultIcon = L.icon({
  iconUrl: icon.src ?? (icon as unknown as string),
  shadowUrl: iconShadow.src ?? (iconShadow as unknown as string),
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

// Custom icons for different types
const patientIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const serviceIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

export function PatientMapSkeleton() {
  return (
    <div className="relative z-0 mb-8 h-[450px] w-full overflow-hidden rounded-[2.5rem] border border-white/5 bg-slate-900 shadow-diffusion">
      <div className="flex h-full flex-col lg:flex-row">
        {/* Sidebar Skeleton */}
        <div className="hidden w-[400px] flex-col border-r border-white/5 bg-slate-950/60 p-8 backdrop-blur-2xl lg:flex">
          <div className="mb-8 space-y-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-2 w-24" />
          </div>
          <div className="mb-8 flex gap-3">
            <Skeleton className="h-10 flex-1 rounded-2xl" />
            <Skeleton className="h-10 flex-1 rounded-2xl" />
          </div>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-4 rounded-2xl border border-white/5 bg-white/5 p-5">
                <Skeleton className="h-10 w-10 rounded-[1rem]" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-2 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Map Skeleton */}
        <div className="relative flex-1 bg-slate-950/20">
          <div className="absolute right-6 top-6">
            <Skeleton className="h-12 w-32 rounded-2xl" />
          </div>
          <div className="flex h-full items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-[1.5rem]" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export interface PatientLocation {
  id: string;
  fullName: string;
  lat: number;
  lon: number;
  status: string;
}

function MapController({
  center,
  isFullscreen,
}: {
  center: [number, number] | null;
  isFullscreen: boolean;
}) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, 16, { animate: true, duration: 1.5 });
  }, [center, map]);
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 200);
    return () => clearTimeout(t);
  }, [isFullscreen, map]);
  return null;
}

export function PatientMapInner({ patients }: { patients: PatientLocation[] }) {
  const router = useRouter();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeCenter, setActiveCenter] = useState<[number, number] | null>(null);
  const [showPatients, setShowPatients] = useState(true);
  const [showServices, setShowServices] = useState(true);

  const geolocated = patients.filter((p) => p.lat && p.lon);

  if (patients.length === 0) return null;

  return (
    <div
      className={
        isFullscreen
          ? 'fixed inset-0 z-[100] flex flex-col lg:flex-row bg-slate-950'
          : 'relative z-0 mb-8 h-[450px] w-full overflow-hidden rounded-[2.5rem] border border-white/5 bg-slate-900 shadow-diffusion animate-reveal'
      }
    >
      {isFullscreen && (
        <aside className="z-50 flex h-1/3 w-full flex-col overflow-y-auto border-b border-white/5 bg-slate-950/60 p-8 backdrop-blur-2xl lg:h-full lg:w-[400px] lg:border-b-0 lg:border-r">
          <div className="mb-8 flex items-center justify-between border-b border-white/5 pb-6">
            <div>
              <h2 className="text-sm font-black uppercase italic tracking-[0.2em] text-white">
                Mapa Estratégico
              </h2>
              <p className="mt-1 text-[8px] font-bold uppercase tracking-[0.3em] text-slate-500 italic">
                Rede Territorial CAPS
              </p>
            </div>
            <button
              onClick={() => setIsFullscreen(false)}
              className="rounded-2xl bg-white/5 p-3.5 text-slate-400 transition-all hover:bg-white/10 hover:text-red-500 active:scale-95"
            >
              <X size={20} />
            </button>
          </div>

          <div className="mb-8 flex gap-3">
            <button
              onClick={() => setShowPatients(!showPatients)}
              className={`flex-1 rounded-2xl border px-4 py-3 text-[9px] font-black uppercase tracking-[0.15em] transition-all active:scale-95 ${
                showPatients ? 'border-blue-500/30 bg-blue-500/10 text-blue-400' : 'border-white/5 bg-white/5 text-slate-600'
              }`}
            >
              Pacientes
            </button>
            <button
              onClick={() => setShowServices(!showServices)}
              className={`flex-1 rounded-2xl border px-4 py-3 text-[9px] font-black uppercase tracking-[0.15em] transition-all active:scale-95 ${
                showServices ? 'border-amber-500/30 bg-amber-500/10 text-amber-400' : 'border-white/5 bg-white/5 text-slate-600'
              }`}
            >
              Rede de Saúde
            </button>
          </div>

          <div className="flex-1 space-y-3 px-1 custom-scrollbar">
            {showPatients && geolocated.map((p) => (
              <div
                key={p.id}
                onClick={() => setActiveCenter([p.lat, p.lon])}
                className="group cursor-pointer rounded-2xl border border-white/5 bg-white/5 p-5 transition-all hover:bg-white/10 hover:border-blue-500/30"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem] bg-blue-500/10 text-blue-500 transition-transform group-hover:scale-110">
                    <MapPin size={18} />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <h4 className="truncate text-[11px] font-black uppercase tracking-tight text-white transition-colors group-hover:text-blue-400">
                      {p.fullName}
                    </h4>
                    <p className="mt-1 text-[8px] font-bold uppercase tracking-[0.2em] text-slate-500">
                      Paciente Atendido
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {showServices && PUBLIC_SERVICES.map((s) => (
              <div
                key={s.id}
                onClick={() => setActiveCenter([s.lat, s.lon])}
                className="group cursor-pointer rounded-2xl border border-white/5 bg-white/[0.02] p-5 transition-all hover:bg-white/5 hover:border-amber-500/30"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem] bg-amber-500/10 text-amber-500 transition-transform group-hover:scale-110">
                    <Stethoscope size={18} />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <h4 className="truncate text-[11px] font-black uppercase tracking-tight text-slate-300 transition-colors group-hover:text-amber-400">
                      {s.name}
                    </h4>
                    <p className="mt-1 text-[8px] font-bold uppercase tracking-[0.2em] text-slate-600">
                      {s.type}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </aside>
      )}

      <div className="relative h-full flex-1 overflow-hidden">
        {!isFullscreen && (
          <div className="absolute right-6 top-6 z-[400]">
            <button
              onClick={() => setIsFullscreen(true)}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/60 px-5 py-3 text-white shadow-2xl backdrop-blur-xl transition-all hover:bg-slate-800 hover:-translate-y-0.5 active:scale-95"
            >
              <Maximize size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest italic">Visão Global</span>
            </button>
          </div>
        )}

        <MapContainer
          center={[-22.1264, -51.385]}
          zoom={isFullscreen ? 13 : 12}
          style={{ height: '100%', width: '100%', background: 'var(--color-slate-950)' }}
          scrollWheelZoom
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          <MapController center={activeCenter} isFullscreen={isFullscreen} />
          
          {showPatients && geolocated.map((p) => (
            <Marker key={p.id} position={[p.lat, p.lon]} icon={patientIcon}>
              <Popup closeButton={false}>
                <div className="min-w-[180px] overflow-hidden rounded-[1.5rem] bg-slate-900/90 p-4 text-center text-white backdrop-blur-xl">
                  <h4 className="mb-2 text-xs font-black uppercase tracking-tight text-white">
                    {p.fullName}
                  </h4>
                  <div className="mb-4">
                    <span
                      className={`inline-block rounded-lg px-3 py-1 text-[8px] font-black uppercase tracking-[0.2em] ${
                        p.status === 'active'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-slate-500/20 text-slate-400'
                      }`}
                    >
                      {p.status === 'active' ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  <button
                    onClick={() => router.push(`/patients/${p.id}/pts`)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-[9px] font-black uppercase tracking-widest text-white shadow-lg transition-all hover:bg-blue-500 active:scale-95"
                  >
                    <FileText size={14} /> Abrir PTS
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}

          {showServices && PUBLIC_SERVICES.map((s) => (
            <Marker key={s.id} position={[s.lat, s.lon]} icon={serviceIcon}>
              <Popup closeButton={false}>
                <div className="min-w-[180px] overflow-hidden rounded-[1.5rem] bg-slate-900/90 p-4 text-center text-white backdrop-blur-xl">
                  <div className="mb-3 flex items-center justify-center gap-2 text-amber-400">
                    <Stethoscope size={16} />
                    <span className="text-[9px] font-black uppercase tracking-[0.2em]">{s.type}</span>
                  </div>
                  <h4 className="mb-2 text-xs font-black uppercase tracking-tight text-white">
                    {s.name}
                  </h4>
                  <p className="text-[8px] font-bold uppercase leading-relaxed tracking-[0.1em] text-slate-500">
                    {s.address}
                  </p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {geolocated.length === 0 && !isFullscreen && (
          <div className="pointer-events-none absolute inset-0 z-[1000] flex items-center justify-center bg-slate-950/20 backdrop-blur-md">
            <div className="flex max-w-xs flex-col items-center gap-6 rounded-[2.5rem] border border-white/5 bg-slate-900 p-10 text-center shadow-2xl">
              <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-blue-500/10 text-blue-500">
                <MapPin size={32} />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-white">Geolocalização Ausente</p>
                <p className="mt-2 text-[9px] font-medium uppercase tracking-widest text-slate-500">Nenhum endereço identificado para este paciente.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
