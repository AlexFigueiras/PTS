import Link from 'next/link';
import type { PaginatedResult } from '@/lib/pagination';
import type { PatientDto } from '../patient.dto';
import { PatientStatusBadge } from './patient-status-badge';

type Props = {
  result: PaginatedResult<PatientDto>;
  search?: string;
};

export function PatientsTable({ result, search }: Props) {
  const { data, page, totalPages, total } = result;

  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center">
        <p className="text-muted-foreground text-sm font-medium">
          {search
            ? `Nenhum paciente encontrado para "${search}"`
            : 'Nenhum paciente cadastrado ainda.'}
        </p>
        {!search && (
          <p className="text-muted-foreground mt-1 text-xs">
            Clique em &ldquo;Novo paciente&rdquo; para começar.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-xs">
        {total} paciente{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}
      </p>

      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">Nome</th>
              <th className="hidden px-4 py-3 text-left font-medium md:table-cell">CPF</th>
              <th className="hidden px-4 py-3 text-left font-medium sm:table-cell">Telefone</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.map((patient) => (
              <tr key={patient.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <Link
                    href={`/patients/${patient.id}`}
                    className="text-primary font-medium hover:underline"
                  >
                    {patient.preferredName ?? patient.fullName}
                  </Link>
                  {patient.preferredName && (
                    <p className="text-muted-foreground text-xs">{patient.fullName}</p>
                  )}
                </td>
                <td className="text-muted-foreground hidden px-4 py-3 md:table-cell">
                  {patient.cpf ?? '—'}
                </td>
                <td className="text-muted-foreground hidden px-4 py-3 sm:table-cell">
                  {patient.phone ?? '—'}
                </td>
                <td className="px-4 py-3">
                  <PatientStatusBadge status={patient.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            Página {page} de {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`?page=${page - 1}${search ? `&search=${encodeURIComponent(search)}` : ''}`}
                className="text-primary hover:underline"
              >
                Anterior
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`?page=${page + 1}${search ? `&search=${encodeURIComponent(search)}` : ''}`}
                className="text-primary hover:underline"
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
