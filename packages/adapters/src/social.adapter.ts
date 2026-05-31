import type { DimensionAdapter } from './index';
import type { Dimension } from '@pts/domain';

export type SocialRecord = {
  id: string;
  unitLabel: string;
  rawText: string;
  recordedAt: string;
};

/**
 * Adapter de ingestão — esfera Assistência Social.
 * Normaliza registros-fonte de assistência (CRAS/CREAS/PAIF/PAEFI) para o
 * modelo normalizado de Dimensão. O núcleo nunca importa este adapter
 * diretamente — só o contrato DimensionAdapter.
 */
export class SocialAdapter implements DimensionAdapter {
  readonly source = 'social';

  async normalize(raw: unknown): Promise<ReadonlyArray<{ dimension: Dimension; payload: unknown }>> {
    const records = raw as SocialRecord[];

    const combinedText = records
      .map((r) => `[${r.unitLabel} — ${r.recordedAt}]\n${r.rawText}`)
      .join('\n\n');

    return [
      {
        dimension: 'social' as Dimension,
        payload: { rawText: combinedText, recordIds: records.map((r) => r.id), source: 'social' },
      },
      {
        dimension: 'juridico' as Dimension,
        payload: { rawText: combinedText, recordIds: records.map((r) => r.id), source: 'social' },
      },
    ];
  }
}
