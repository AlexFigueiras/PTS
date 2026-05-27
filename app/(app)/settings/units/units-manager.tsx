'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Building2, Pencil, Trash2, Phone, MapPin, Map } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UnitForm } from './unit-form';
import { deleteUnitAction } from '@/modules/units/unit.actions';
import type { UnitDto } from '@/modules/units/unit.dto';

const SECTOR_LABELS: Record<string, string> = {
  HEALTH: 'Saúde',
  SOCIAL: 'Assistência Social',
  LEGAL: 'Jurídico / Direitos',
  EDUCATION: 'Educação',
};

const SECTOR_BADGES: Record<string, string> = {
  HEALTH: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-300 dark:border-sky-800',
  SOCIAL: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-300 dark:border-indigo-800',
  LEGAL: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800',
  EDUCATION: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800',
};

function getSectorBadge(type: string): string {
  if (type === 'HEALTH') return SECTOR_BADGES.HEALTH;
  if (type === 'SOCIAL') return SECTOR_BADGES.SOCIAL;
  if (type === 'LEGAL') return SECTOR_BADGES.LEGAL;
  if (type === 'EDUCATION') return SECTOR_BADGES.EDUCATION;
  return 'bg-slate-50 text-slate-700';
}

function getSectorLabel(type: string): string {
  if (type === 'HEALTH') return SECTOR_LABELS.HEALTH;
  if (type === 'SOCIAL') return SECTOR_LABELS.SOCIAL;
  if (type === 'LEGAL') return SECTOR_LABELS.LEGAL;
  if (type === 'EDUCATION') return SECTOR_LABELS.EDUCATION;
  return type;
}

export function UnitsManager({ initialUnits }: { initialUnits: UnitDto[] }) {
  const [editingUnit, setEditingUnit] = useState<UnitDto | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  const handleDelete = async (id: string, name: string) => {
    if (
      confirm(
        `Tem certeza que deseja excluir a unidade "${name}"?\nEsta ação removerá permanentemente os vínculos dos profissionais com ela.`
      )
    ) {
      startDeleteTransition(async () => {
        const res = await deleteUnitAction(id);
        if (res.success) {
          toast.success(res.success);
          if (editingUnit?.id === id) {
            setEditingUnit(null);
          }
        } else if (res.error) {
          toast.error(res.error);
        }
      });
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-5">
      {/* Coluna da Listagem (esquerda) */}
      <div className="space-y-4 md:col-span-3">
        <h2 className="text-sm font-semibold tracking-tight text-muted-foreground uppercase">
          Unidades Cadastradas ({initialUnits.length})
        </h2>

        {initialUnits.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-10 text-center">
            <Building2 className="h-10 w-10 text-muted-foreground/60 mb-3 animate-pulse" />
            <p className="text-sm font-medium">Nenhuma unidade disponível</p>
            <p className="text-xs text-muted-foreground max-w-[280px] mt-1">
              Cadastre a primeira unidade intersetorial ao lado para habilitar convites de equipe.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {initialUnits.map((u) => {
              const isSelected = editingUnit?.id === u.id;
              return (
                <div
                  key={u.id}
                  className={`group relative flex flex-col justify-between gap-4 rounded-xl border p-4 transition-all duration-200 hover:shadow-md ${
                    isSelected
                      ? 'border-primary/45 bg-primary/5 shadow-sm ring-1 ring-primary/20'
                      : 'bg-card hover:border-muted-foreground/35'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="truncate text-sm font-semibold tracking-tight group-hover:text-primary transition-colors">
                        {u.name}
                      </h3>
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide transition-all ${
                          getSectorBadge(u.type)
                        }`}
                      >
                        {getSectorLabel(u.type)}
                      </span>
                    </div>

                    <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                      {u.fullAddress && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                          <span className="truncate">{u.fullAddress}</span>
                        </div>
                      )}
                      
                      {u.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                          <span>{u.phone}</span>
                        </div>
                      )}

                      {(u.lat !== null || u.lon !== null) && (
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground/80">
                          <Map className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                          <span>
                            Coord: {u.lat?.toFixed(5) ?? 'N/A'}, {u.lon?.toFixed(5) ?? 'N/A'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-1.5 border-t pt-3 mt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingUnit(u)}
                      className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted"
                    >
                      <Pencil className="mr-1.5 h-3.5 w-3.5" />
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(u.id, u.name)}
                      disabled={isDeleting}
                      className="h-8 px-2.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                      Excluir
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Coluna do Formulário (direita) */}
      <div className="md:col-span-2">
        <div className="sticky top-6 rounded-xl border bg-card p-5 shadow-sm transition-all duration-300">
          <h2 className="mb-1 text-sm font-semibold tracking-tight">
            {editingUnit ? 'Editar Unidade' : 'Nova Unidade Intersetorial'}
          </h2>
          <p className="text-xs text-muted-foreground mb-4">
            {editingUnit
              ? 'Atualize os dados cadastrais da unidade selecionada.'
              : 'Cadastre uma nova unidade da rede para vincular profissionais.'}
          </p>

          <UnitForm
            key={editingUnit?.id ?? 'new'}
            initialData={editingUnit}
            onCancel={() => setEditingUnit(null)}
          />
        </div>
      </div>
    </div>
  );
}
