import Link from 'next/link';
import type { PaginatedResult } from '@/lib/pagination';
import type { PatientDto } from '../patient.dto';
import { PatientStatusBadge } from './patient-status-badge';
import { Search } from 'lucide-react';

type Props = {
  result: PaginatedResult<PatientDto>;
  search?: string;
};

export function PatientsTable({ result, search }: Props) {
  const { data, page, totalPages, total } = result;

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-20 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-[2rem] bg-secondary/30 text-muted-foreground/30 shadow-inner">
          <Search size={32} />
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/50">
            {search
              ? `Sem resultados para "${search}"`
              : 'Nenhum paciente cadastrado'}
          </p>
          {!search && (
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/20">
              Comece adicionando um novo registro
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-8">
      <div className="flex items-center justify-between border-b border-border/80 pb-6">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
          Total de <span className="text-foreground">{total}</span> paciente{total !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/80">
              <th className="pb-6 text-left text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Nome</th>
              <th className="hidden pb-6 text-left text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 md:table-cell">CPF</th>
              <th className="hidden pb-6 text-left text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 sm:table-cell">Telefone</th>
              <th className="pb-6 text-left text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {data.map((patient) => (
              <tr key={patient.id} className="group transition-all duration-300 hover:bg-primary/[0.02]">
                <td className="py-6 pr-4">
                  <Link
                    href={`/patients/${patient.id}`}
                    className="text-sm font-bold tracking-tight text-foreground/90 transition-colors group-hover:text-primary"
                  >
                    {patient.preferredName ?? patient.fullName}
                  </Link>
                  {patient.preferredName && (
                    <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40">{patient.fullName}</p>
                  )}
                </td>
                <td className="hidden py-6 pr-4 md:table-cell">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70">{patient.cpf ?? '—'}</span>
                </td>
                <td className="hidden py-6 pr-4 sm:table-cell">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70">{patient.phone ?? '—'}</span>
                </td>
                <td className="py-6">
                  <PatientStatusBadge status={patient.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border/50 pt-8">
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/30">
            Página {page} de {totalPages}
          </span>
          <div className="flex gap-4">
            {page > 1 && (
              <Link
                href={`?page=${page - 1}${search ? `&search=${encodeURIComponent(search)}` : ''}`}
                className="rounded-xl border border-border bg-background/30 px-6 py-3 text-[9px] font-black uppercase tracking-widest text-muted-foreground transition-all hover:bg-secondary active:scale-95"
              >
                Anterior
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`?page=${page + 1}${search ? `&search=${encodeURIComponent(search)}` : ''}`}
                className="rounded-xl bg-primary px-6 py-3 text-[9px] font-black uppercase tracking-widest text-primary-foreground shadow-lg transition-all hover:scale-105 active:scale-95"
              >
                Próxima
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
