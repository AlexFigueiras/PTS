'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { uploadFile } from '@/lib/storage/upload-file';
import { ALLOWED_MIME_TYPES } from '@/modules/storage/storage.dto';
import { createFileAction } from '../file.actions';

type Props = {
  tenantId: string;
  entityType: string;
  entityId: string;
};

const ACCEPT = ALLOWED_MIME_TYPES.join(',');

export function UploadButton({ tenantId, entityType, entityId }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // reset input so the same file can be re-uploaded if needed
    if (inputRef.current) inputRef.current.value = '';

    setError(null);

    startTransition(async () => {
      let storageKey: string;
      try {
        const result = await uploadFile({ tenantId, file, entity: entityType });
        storageKey = result.key;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Falha ao enviar arquivo para o storage.');
        return;
      }

      const formData = new FormData();
      formData.set('storageKey', storageKey);
      formData.set('originalName', file.name);
      formData.set('mimeType', file.type);
      formData.set('size', String(file.size));
      formData.set('entityType', entityType);
      formData.set('entityId', entityId);

      const state = await createFileAction({ error: null, file: null }, formData);

      if (state.error) {
        setError(state.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-1.5">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        onChange={handleFileChange}
        disabled={isPending}
        className="sr-only"
        id="file-upload"
      />
      <label
        htmlFor="file-upload"
        className={[
          'inline-flex cursor-pointer items-center rounded-md border px-3 py-1.5 text-sm font-medium transition-colors',
          isPending
            ? 'border-border text-muted-foreground cursor-not-allowed opacity-60'
            : 'border-border hover:bg-muted',
        ].join(' ')}
        aria-disabled={isPending}
      >
        {isPending ? 'Enviando…' : '+ Anexar arquivo'}
      </label>
      {error && (
        <p role="alert" className="text-destructive text-xs">
          {error}
        </p>
      )}
      <p className="text-muted-foreground text-xs">
        PDF, JPEG, PNG, WebP ou GIF · máx. 10 MB
      </p>
    </div>
  );
}
