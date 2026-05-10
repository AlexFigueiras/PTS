import { RECORD_TYPE_LABELS, type RecordType } from '../record.dto';

const TYPE_STYLES: Record<RecordType, string> = {
  session_note: 'bg-blue-50 text-blue-700 ring-blue-200',
  assessment: 'bg-purple-50 text-purple-700 ring-purple-200',
  evolution: 'bg-green-50 text-green-700 ring-green-200',
};

export function RecordTypeBadge({ type }: { type: RecordType }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${TYPE_STYLES[type]}`}
    >
      {RECORD_TYPE_LABELS[type]}
    </span>
  );
}
