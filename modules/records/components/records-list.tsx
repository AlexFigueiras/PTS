import Link from 'next/link';
import type { RecordDto } from '../record.dto';
import type { PaginatedResult } from '@/lib/pagination';
import { RecordTypeBadge } from './record-type-badge';
import { RecordStatusBadge } from './record-status-badge';

type Props = {
  result: PaginatedResult<RecordDto>;
  patientId: string;
};

function formatDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR');
}

function contentPreview(content: string, max = 100) {
  return content.length > max ? content.slice(0, max) + '…' : content;
}

export function RecordsList({ result, patientId }: Props) {
  if (result.data.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        Nenhum registro clínico ainda.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <ul className="divide-y rounded-lg border">
        {result.data.map((record) => (
          <li key={record.id}>
            <Link
              href={`/patients/${patientId}/records/${record.id}`}
              className="hover:bg-muted/50 flex items-start gap-4 px-4 py-3 transition-colors"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{formatDate(record.sessionDate)}</span>
                  <RecordTypeBadge type={record.type} />
                  <RecordStatusBadge status={record.status} />
                </div>
                {record.title && (
                  <p className="truncate text-sm font-medium">{record.title}</p>
                )}
                <p className="text-muted-foreground text-xs">{contentPreview(record.content)}</p>
              </div>
              <span className="text-muted-foreground mt-0.5 shrink-0 text-xs">→</span>
            </Link>
          </li>
        ))}
      </ul>

      {result.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {result.total} registro{result.total !== 1 ? 's' : ''} · página {result.page} de{' '}
            {result.totalPages}
          </span>
          <div className="flex gap-2">
            {result.page > 1 && (
              <Link
                href={`/patients/${patientId}/records?page=${result.page - 1}`}
                className="border-input hover:bg-muted rounded-md border px-3 py-1.5"
              >
                ← Anterior
              </Link>
            )}
            {result.page < result.totalPages && (
              <Link
                href={`/patients/${patientId}/records?page=${result.page + 1}`}
                className="border-input hover:bg-muted rounded-md border px-3 py-1.5"
              >
                Próxima →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
