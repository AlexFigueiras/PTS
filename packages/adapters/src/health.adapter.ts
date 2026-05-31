import type { DimensionAdapter } from './index';
import type { Dimension } from '@pts/domain';

export type HealthRecord = {
  id: string;
  unitLabel: string;
  rawText: string;
  recordedAt: string;
};

/**
 * Adapter de ingestão — esfera Saúde.
 * Normaliza registros-fonte de saúde (prontuário/UBS/CAPS/UPA) para o
 * modelo normalizado de Dimensão. O núcleo nunca importa este adapter
 * diretamente — só o contrato DimensionAdapter.
 */
export class HealthAdapter implements DimensionAdapter {
  readonly source = 'health';

  async normalize(raw: unknown): Promise<ReadonlyArray<{ dimension: Dimension; payload: unknown }>> {
    const records = raw as HealthRecord[];

    const combinedText = records
      .map((r) => `[${r.unitLabel} — ${r.recordedAt}]\n${r.rawText}`)
      .join('\n\n');

    // O adapter entrega o texto concatenado e os metadados de origem.
    // O DimensionDerivationService fará a derivação real via IA + regras.
    return [
      {
        dimension: 'saude' as Dimension,
        payload: { rawText: combinedText, recordIds: records.map((r) => r.id), source: 'health' },
      },
      {
        dimension: 'psiquico' as Dimension,
        payload: { rawText: combinedText, recordIds: records.map((r) => r.id), source: 'health' },
      },
    ];
  }
}
