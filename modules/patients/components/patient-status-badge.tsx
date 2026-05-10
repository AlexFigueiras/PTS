import { cn } from '@/lib/utils';

type Props = { status: string; className?: string };

export function PatientStatusBadge({ status, className }: Props) {
  const isActive = status === 'active';
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500',
        className,
      )}
    >
      {isActive ? 'Ativo' : 'Inativo'}
    </span>
  );
}
