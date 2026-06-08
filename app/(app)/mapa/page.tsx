import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { getActiveTenantContext } from '@/lib/auth/get-tenant-context';
import { getDb } from '@/lib/db/client';
import { patients } from '@/lib/db/schema';
import { PatientMap, type PatientLocation } from '@/components/maps/patient-map';
import { MapPin, Info } from 'lucide-react';
import Link from 'next/link';

export const metadata = { title: 'Mapa Estratégico | CAPS' };

export default async function MapaPage() {
  const ctx = await getActiveTenantContext();
  if (!ctx) {
    redirect('/login');
  }

  // Busca todos os pacientes do tenant para carregar no mapa
  const dbPatients = await getDb()
    .select({
      id: patients.id,
      fullName: patients.fullName,
      lat: patients.lat,
      lon: patients.lon,
      status: patients.status,
    })
    .from(patients)
    .where(eq(patients.tenantId, ctx.tenantId));

  // Filtra os pacientes que possuem coordenadas lat/lon definidas
  const patientLocations: PatientLocation[] = dbPatients
    .filter((p): p is typeof p & { lat: number; lon: number } => p.lat !== null && p.lon !== null)
    .map((p) => ({
      id: p.id,
      fullName: p.fullName,
      lat: p.lat,
      lon: p.lon,
      status: p.status,
    }));

  return (
    <div className="min-h-full bg-background/50 text-foreground selection:bg-primary/20">
      <div className="mx-auto max-w-6xl space-y-10 p-16 animate-reveal">
        {/* Header Section */}
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <div className="space-y-1">
            <h1 className="text-6xl font-medium tracking-tight text-foreground">
              Mapa Territorial
            </h1>
            <p className="text-xs font-bold uppercase tracking-[0.4em] text-muted-foreground/70">
              Rede de Serviços e Cidadãos Cadastrados
            </p>
          </div>
        </div>

        {/* Info card premium */}
        <div className="flex gap-4 rounded-3xl border border-blue-500/10 bg-blue-500/5 p-6 shadow-sm">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-[1rem] bg-blue-500/10 text-blue-500">
            <Info size={20} />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-[0.1em] text-blue-500">Visão Integrada do Território</h3>
            <p className="mt-1 text-[11px] font-medium leading-relaxed text-slate-500 uppercase tracking-widest">
              Este mapa exibe a distribuição espacial dos cidadãos atendidos em relação às Unidades Básicas de Saúde (UBS), Centros de Referência de Assistência Social (CRAS) e CAPS do município. Use os filtros laterais para ligar/desligar marcadores.
            </p>
          </div>
        </div>

        {/* Map Container or Empty State */}
        {patientLocations.length === 0 ? (
          <div className="rounded-[2.5rem] border border-slate-200 bg-white p-16 text-center shadow-sm flex flex-col items-center justify-center">
            <div className="size-16 rounded-[1.25rem] bg-slate-50 text-slate-400 flex items-center justify-center mb-6">
              <MapPin size={32} />
            </div>
            <h2 className="text-base font-black uppercase tracking-wider text-slate-700">
              Nenhum cidadão geolocalizado
            </h2>
            <p className="text-xs font-medium text-slate-400 mt-2 max-w-sm">
              Não existem cidadãos com latitude e longitude cadastradas no momento. Cadastre ou edite as coordenadas geográficas dos pacientes para visualizá-los aqui.
            </p>
            <div className="mt-6">
              <Link
                href="/patients"
                className="rounded-xl bg-primary px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-md transition hover:scale-105 active:scale-95"
              >
                Ver Pacientes
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-[2.5rem] border border-white/5 bg-card shadow-diffusion premium-bevel">
            <PatientMap patients={patientLocations} />
          </div>
        )}
      </div>
    </div>
  );
}
