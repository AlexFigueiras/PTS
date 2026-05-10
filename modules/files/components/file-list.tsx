import { deleteFileFormAction } from '../file.actions';
import type { FileDto } from '../file.dto';

type Props = { files: FileDto[] };

const MIME_LABEL: Record<string, string> = {
  'image/jpeg': 'JPEG',
  'image/png': 'PNG',
  'image/webp': 'WebP',
  'image/gif': 'GIF',
  'application/pdf': 'PDF',
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DeleteButton({ fileId }: { fileId: string }) {
  return (
    <form action={deleteFileFormAction}>
      <input type="hidden" name="fileId" value={fileId} />
      <button
        type="submit"
        className="text-destructive hover:text-destructive/80 text-xs transition-colors"
      >
        Remover
      </button>
    </form>
  );
}

export function FileList({ files }: Props) {
  if (files.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">Nenhum arquivo anexado ainda.</p>
    );
  }

  return (
    <ul className="divide-y rounded-lg border">
      {files.map((file) => (
        <li key={file.id} className="flex items-center justify-between gap-4 px-4 py-3">
          <div className="min-w-0 flex-1">
            {file.publicUrl ? (
              <a
                href={file.publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary truncate text-sm font-medium hover:underline"
              >
                {file.originalName}
              </a>
            ) : (
              <span className="truncate text-sm font-medium">{file.originalName}</span>
            )}
            <p className="text-muted-foreground text-xs">
              {MIME_LABEL[file.mimeType] ?? file.mimeType} · {formatBytes(file.size)} ·{' '}
              {new Date(file.createdAt).toLocaleDateString('pt-BR')}
            </p>
          </div>
          <DeleteButton fileId={file.id} />
        </li>
      ))}
    </ul>
  );
}
