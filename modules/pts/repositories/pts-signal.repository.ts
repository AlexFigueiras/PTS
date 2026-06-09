import { and, eq, inArray, desc } from 'drizzle-orm';
import { BaseTenantRepository } from '@/repositories/base.repository';
import type { TenantContext } from '@/lib/tenant-context';
import { ptsSignals, ptsPlans, ptsCases, type PtsSignal } from '@/lib/db/schema';
import type { SignalStatus, SignalPriority, SignalSubtype } from '@pts/domain';

/**
 * Estados em que uma sinalização aguarda ação da unidade destino — base da
 * caixa de entrada (inbox) do dashboard.
 */
const INBOX_PENDING_STATUSES: SignalStatus[] = ['encaminhada', 'recebida', 'em_tratamento'];

export type CreateSignalData = {
  caseId: string;
  authorId: string | null;
  sourceUnitId: string;
  needTypeId: string;
  destinationComponent: string;
  destinationUnitId: string | null;
  priority: SignalPriority;
  abstractReason: string;
  signalSubtype?: SignalSubtype | null;
  sourceRecordId?: string | null;
};

export type UpdateSignalStatusExtras = {
  resolvedAt?: Date | null;
  resolutionNotes?: string | null;
  assignedProfessionalId?: string | null;
  rtValidatorId?: string | null;
};

export class PtsSignalRepository extends BaseTenantRepository {
  private readonly tx?: any;

  constructor(ctx: TenantContext, tx?: any) {
    super(ctx);
    this.tx = tx;
  }

  protected override get db() {
    return this.tx ?? super.db;
  }

  async create(data: CreateSignalData): Promise<PtsSignal> {
    const [row] = await this.db
      .insert(ptsSignals)
      .values({
        tenantId: this.tenantId,
        caseId: data.caseId,
        authorId: data.authorId,
        sourceUnitId: data.sourceUnitId,
        sourceRecordId: data.sourceRecordId ?? null,
        needTypeId: data.needTypeId,
        destinationComponent: data.destinationComponent,
        destinationUnitId: data.destinationUnitId,
        priority: data.priority,
        status: 'sugerida',
        signalSubtype: data.signalSubtype ?? null,
        abstractReason: data.abstractReason,
      })
      .returning();
    return row;
  }

  async findById(id: string): Promise<PtsSignal | undefined> {
    const [row] = await this.db
      .select()
      .from(ptsSignals)
      .where(and(eq(ptsSignals.id, id), eq(ptsSignals.tenantId, this.tenantId)))
      .limit(1);
    return row;
  }

  async findByCaseId(caseId: string): Promise<PtsSignal[]> {
    return this.db
      .select()
      .from(ptsSignals)
      .where(and(eq(ptsSignals.caseId, caseId), eq(ptsSignals.tenantId, this.tenantId)))
      .orderBy(desc(ptsSignals.createdAt));
  }

  /**
   * Sinalizações direcionadas a uma unidade em estados pendentes — caixa de
   * entrada da unidade destino.
   */
  async findPendingForUnit(unitId: string): Promise<PtsSignal[]> {
    return this.db
      .select()
      .from(ptsSignals)
      .where(
        and(
          eq(ptsSignals.destinationUnitId, unitId),
          eq(ptsSignals.tenantId, this.tenantId),
          inArray(ptsSignals.status, INBOX_PENDING_STATUSES),
        ),
      )
      .orderBy(desc(ptsSignals.createdAt));
  }

  /**
   * Sinalizações em estado `sugerida` cuja autoria é do profissional — a caixa
   * de sugestões da IA. O autor (profissional que originou o relato, vinculado
   * por matrícula) confirma ou descarta cada sugestão (gate `actorIsAuthor` da FSM).
   */
  async findSuggestedForAuthor(authorUserId: string) {
    return this.db
      .select({
        id: ptsSignals.id,
        caseId: ptsSignals.caseId,
        patientId: ptsCases.patientId,
        status: ptsSignals.status,
        priority: ptsSignals.priority,
        needTypeId: ptsSignals.needTypeId,
        abstractReason: ptsSignals.abstractReason,
        createdAt: ptsSignals.createdAt,
      })
      .from(ptsSignals)
      .innerJoin(ptsCases, eq(ptsCases.id, ptsSignals.caseId))
      .where(
        and(
          eq(ptsSignals.tenantId, this.tenantId),
          eq(ptsSignals.authorId, authorUserId),
          eq(ptsSignals.status, 'sugerida'),
        ),
      )
      .orderBy(desc(ptsSignals.createdAt));
  }

  /**
   * Sinalizações em `aguardando_validacao_rt` de casos cujo plano tem o
   * `rtUserId` como owner (Técnico de Referência).
   */
  async findAwaitingRtValidation(rtUserId: string): Promise<PtsSignal[]> {
    return this.db
      .select({
        id: ptsSignals.id,
        tenantId: ptsSignals.tenantId,
        caseId: ptsSignals.caseId,
        sourceRecordId: ptsSignals.sourceRecordId,
        sourceUnitId: ptsSignals.sourceUnitId,
        authorId: ptsSignals.authorId,
        needTypeId: ptsSignals.needTypeId,
        destinationComponent: ptsSignals.destinationComponent,
        destinationUnitId: ptsSignals.destinationUnitId,
        assignedProfessionalId: ptsSignals.assignedProfessionalId,
        rtValidatorId: ptsSignals.rtValidatorId,
        priority: ptsSignals.priority,
        status: ptsSignals.status,
        signalSubtype: ptsSignals.signalSubtype,
        abstractReason: ptsSignals.abstractReason,
        resolutionNotes: ptsSignals.resolutionNotes,
        resolvedAt: ptsSignals.resolvedAt,
        createdAt: ptsSignals.createdAt,
        updatedAt: ptsSignals.updatedAt,
      })
      .from(ptsSignals)
      .innerJoin(ptsPlans, eq(ptsPlans.caseId, ptsSignals.caseId))
      .where(
        and(
          eq(ptsSignals.tenantId, this.tenantId),
          eq(ptsSignals.status, 'aguardando_validacao_rt'),
          eq(ptsPlans.ownerId, rtUserId),
        ),
      )
      .orderBy(desc(ptsSignals.createdAt));
  }

  async updateStatus(
    id: string,
    status: SignalStatus,
    extras: UpdateSignalStatusExtras = {},
  ): Promise<PtsSignal | undefined> {
    const [row] = await this.db
      .update(ptsSignals)
      .set({
        status,
        ...(extras.resolvedAt !== undefined && { resolvedAt: extras.resolvedAt }),
        ...(extras.resolutionNotes !== undefined && { resolutionNotes: extras.resolutionNotes }),
        ...(extras.assignedProfessionalId !== undefined && {
          assignedProfessionalId: extras.assignedProfessionalId,
        }),
        ...(extras.rtValidatorId !== undefined && { rtValidatorId: extras.rtValidatorId }),
        updatedAt: new Date(),
      })
      .where(and(eq(ptsSignals.id, id), eq(ptsSignals.tenantId, this.tenantId)))
      .returning();
    return row;
  }

  async assignProfessional(id: string, professionalId: string): Promise<PtsSignal | undefined> {
    const [row] = await this.db
      .update(ptsSignals)
      .set({ assignedProfessionalId: professionalId, updatedAt: new Date() })
      .where(and(eq(ptsSignals.id, id), eq(ptsSignals.tenantId, this.tenantId)))
      .returning();
    return row;
  }
}
