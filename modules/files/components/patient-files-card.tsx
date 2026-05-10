import { ListFilesService } from '../list-files.service';
import { FileList } from './file-list';
import { UploadButton } from './upload-button';
import type { TenantContext } from '@/lib/tenant-context';

type Props = {
  ctx: TenantContext;
  patientId: string;
};

export async function PatientFilesCard({ ctx, patientId }: Props) {
  const service = new ListFilesService(ctx);
  const files = await service.execute('patient', patientId);

  return (
    <section className="rounded-lg border p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-medium">
          Arquivos{files.length > 0 ? ` (${files.length})` : ''}
        </h2>
        <UploadButton
          tenantId={ctx.tenantId}
          entityType="patient"
          entityId={patientId}
        />
      </div>

      <FileList files={files} />
    </section>
  );
}
