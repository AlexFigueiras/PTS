import { RECORD_STATUS_LABELS, type RecordStatus } from '../record.dto';

const STATUS_STYLES: Record<RecordStatus, string> = {
  draft: 'bg-yellow-50 text-yellow-700 ring-yellow-200',
  finalized: 'bg-gray-50 text-gray-600 ring-gray-200',
};

export function RecordStatusBadge({ status }: { status: RecordStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_STYLES[status]}`}
    >
      {RECORD_STATUS_LABELS[status]}
    </span>
  );
}
