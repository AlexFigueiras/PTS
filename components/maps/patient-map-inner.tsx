'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useRouter } from 'next/navigation';
import { FileText, MapPin, Maximize, X } from 'lucide-react';

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: icon.src ?? (icon as unknown as string),
  shadowUrl: iconShadow.src ?? (iconShadow as unknown as string),
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});
L.Marker.prototype.options.icon = DefaultIcon;

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
  const geolocated = patients.filter((p) => p.lat && p.lon);

  if (patients.length === 0) return null;

  return (
    <div
      className={
        isFullscreen
          ? 'fixed inset-0 z-[100] flex bg-white'
          : 'relative z-0 mb-8 h-[420px] w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg'
      }
    >
      {isFullscreen && (
        <div className="flex h-full w-80 flex-col overflow-y-auto border-r border-slate-200 bg-slate-50 p-6 lg:w-96">
          <div className="mb-6 flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-lg font-black uppercase italic tracking-widest text-slate-800">
                Mapa de Pacientes
              </h2>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Presidente Prudente
              </p>
            </div>
            <button
              onClick={() => setIsFullscreen(false)}
              className="rounded-xl bg-slate-200 p-3 text-slate-600 transition-colors hover:bg-slate-300 hover:text-red-500"
            >
              <X size={20} />
            </button>
          </div>
          <div className="flex-1 space-y-3 px-1">
            {geolocated.map((p) => (
              <div
                key={p.id}
                onClick={() => setActiveCenter([p.lat, p.lon])}
                className="group cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:border-blue-500 hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                    <MapPin size={16} />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <h4 className="truncate text-sm font-black uppercase tracking-tight text-slate-800 transition-colors group-hover:text-blue-600">
                      {p.fullName}
                    </h4>
                    <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      Clique para localizar
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="relative h-full flex-1">
        {!isFullscreen && (
          <button
            onClick={() => setIsFullscreen(true)}
            className="absolute right-4 top-4 z-[400] flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700 shadow-md transition-all hover:scale-105 hover:text-blue-600 active:scale-95"
          >
            <Maximize size={16} />
            <span className="text-xs font-black uppercase tracking-widest italic">Expandir</span>
          </button>
        )}

        <MapContainer
          center={[-22.1264, -51.385]}
          zoom={isFullscreen ? 13 : 12}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          <MapController center={activeCenter} isFullscreen={isFullscreen} />
          {geolocated.map((p) => (
            <Marker key={p.id} position={[p.lat, p.lon]}>
              <Popup closeButton={false}>
                <div className="min-w-[160px] p-3 text-center">
                  <h4 className="mb-1 font-black uppercase tracking-tight text-slate-800">
                    {p.fullName}
                  </h4>
                  <span
                    className={`mb-3 inline-block rounded-md px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${
                      p.status === 'active'
                        ? 'bg-emerald-100 text-emerald-600'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {p.status === 'active' ? 'Ativo' : 'Inativo'}
                  </span>
                  <button
                    onClick={() => router.push(`/patients/${p.id}/pts`)}
                    className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-[10px] font-black uppercase tracking-widest text-white shadow-md transition-all hover:bg-blue-700 active:scale-95"
                  >
                    <FileText size={14} /> Abrir PTS
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {geolocated.length === 0 && !isFullscreen && (
          <div className="pointer-events-none absolute inset-0 z-[1000] flex items-center justify-center bg-white/40 backdrop-blur-sm">
            <div className="flex max-w-xs flex-col items-center gap-4 rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-2xl">
              <MapPin size={32} className="text-blue-500" />
              <p className="text-xs font-bold uppercase tracking-widest text-slate-600">
                Nenhum endereço geolocalizado ainda.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
