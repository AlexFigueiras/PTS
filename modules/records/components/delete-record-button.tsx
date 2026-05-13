'use client';

import { deleteRecordFormAction } from '../record.actions';

interface DeleteRecordButtonProps {
  recordId: string;
  patientId: string;
}

export function DeleteRecordButton({ recordId, patientId }: DeleteRecordButtonProps) {
  return (
    <form action={deleteRecordFormAction}>
      <input type="hidden" name="id" value={recordId} />
      <input type="hidden" name="patientId" value={patientId} />
      <button
        type="submit"
        className="text-destructive hover:text-destructive/80 rounded-md px-3 py-2 text-sm font-medium transition-colors"
        onClick={(e) => {
          if (!confirm('Tem certeza que deseja excluir este registro?')) {
            e.preventDefault();
          }
        }}
      >
        Excluir
      </button>
    </form>
  );
}
