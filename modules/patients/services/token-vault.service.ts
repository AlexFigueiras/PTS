import { and, eq, sql } from 'drizzle-orm';
import { identifierTokens, patients } from '@/lib/db/schema';
import type { TenantContext } from '@/lib/tenant-context';
import { decrypt } from '@/lib/crypto/field-cipher';

export class TokenVaultService {
  constructor(
    private readonly ctx: TenantContext,
    private readonly tx: any
  ) {}

  /**
   * Obtém ou gera um token persistente e determinístico no formato Cidadao_XXXX
   * para uma dada identidade do paciente.
   */
  async getOrCreateToken(patientId: string, identifierType: string): Promise<string> {
    // 1. Verifica se já existe um token para este tipo de identificador do paciente
    const [existing] = await this.tx
      .select({ token: identifierTokens.token })
      .from(identifierTokens)
      .where(
        and(
          eq(identifierTokens.patientId, patientId),
          eq(identifierTokens.tenantId, this.ctx.tenantId),
          eq(identifierTokens.identifierType, identifierType)
        )
      )
      .limit(1);

    if (existing) return existing.token;

    // 2. Multi-request-safe: consome o próximo valor da sequence
    const [seqRow] = await this.tx.execute(sql`SELECT nextval('cidadao_token_seq')`);
    const nextVal = seqRow.nextval ?? seqRow.nextVal ?? 1;
    const token = `Cidadao_${String(nextVal).padStart(4, '0')}`;

    // 3. Persiste o vínculo no Vault
    await this.tx.insert(identifierTokens).values({
      token,
      tenantId: this.ctx.tenantId,
      patientId,
      identifierType,
    });

    return token;
  }

  /**
   * Substitui tokens por seus valores de identidade reais (decifrados)
   * em saídas processadas no servidor.
   */
  async rehydrateText(text: string): Promise<string> {
    const tokens = text.match(/Cidadao_\d{4}/g);
    if (!tokens || tokens.length === 0) return text;

    const uniqueTokens = [...new Set(tokens)];
    let rehydrated = text;

    for (const token of uniqueTokens) {
      const [bond] = await this.tx
        .select()
        .from(identifierTokens)
        .where(and(eq(identifierTokens.token, token), eq(identifierTokens.tenantId, this.ctx.tenantId)))
        .limit(1);

      if (!bond) continue;

      const [patient] = await this.tx
        .select()
        .from(patients)
        .where(and(eq(patients.id, bond.patientId), eq(patients.tenantId, this.ctx.tenantId)))
        .limit(1);

      if (!patient) continue;

      // Obtém o valor original e decifra se for campo criptografado
      let rawValue = (patient as any)[bond.identifierType] ?? '';
      if (['cpf', 'cns', 'nis'].includes(bond.identifierType)) {
        rawValue = decrypt(rawValue) ?? '';
      }

      const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      rehydrated = rehydrated.replace(new RegExp(escaped, 'g'), rawValue);
    }

    return rehydrated;
  }
}
