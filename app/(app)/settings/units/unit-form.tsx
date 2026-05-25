'use client';

import { useActionState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  createUnitAction,
  updateUnitAction,
  type UnitActionState,
} from '@/modules/units/unit.actions';
import type { UnitDto } from '@/modules/units/unit.dto';

const initialState: UnitActionState = { error: null, success: null };

const inputClass =
  'border-input bg-background focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 disabled:opacity-50';

export function UnitForm({
  initialData,
  onCancel,
}: {
  initialData?: UnitDto | null;
  onCancel?: () => void;
}) {
  const isEditing = !!initialData;
  const formRef = useRef<HTMLFormElement>(null);
  const submittedRef = useRef(false);

  // Seleciona a Server Action apropriada
  const activeAction = isEditing ? updateUnitAction : createUnitAction;
  const [state, action, pending] = useActionState(activeAction, initialState);

  // Efeito para tratar retornos das Server Actions
  useEffect(() => {
    if (submittedRef.current && !pending) {
      if (state.success) {
        toast.success(state.success);
        if (!isEditing) {
          formRef.current?.reset();
        }
      } else if (state.error) {
        toast.error(state.error);
      }
      submittedRef.current = false;
    }
  }, [pending, state.error, state.success, isEditing]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    submittedRef.current = true;
    const formData = new FormData(e.currentTarget);
    action(formData);
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
      {isEditing && <input type="hidden" name="id" value={initialData.id} />}

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Nome da unidade</label>
        <input
          name="name"
          className={inputClass}
          required
          placeholder="Ex.: CAPS II Leste, CRAS Vila Maria"
          defaultValue={initialData?.name ?? ''}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Setor / Tipo</label>
          <select
            name="type"
            className={inputClass}
            defaultValue={initialData?.type ?? 'HEALTH'}
            required
          >
            <option value="HEALTH">Saúde (CAPS, UBS)</option>
            <option value="SOCIAL">Assistência Social (CRAS, CREAS)</option>
            <option value="LEGAL">Setor Jurídico / Direitos (Conselhos, MP)</option>
            <option value="EDUCATION">Educação (Escolas, NAAPA)</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Telefone</label>
          <input
            name="phone"
            className={inputClass}
            placeholder="Ex.: (11) 5555-1234"
            defaultValue={initialData?.phone ?? ''}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Endereço completo</label>
        <input
          name="fullAddress"
          className={inputClass}
          placeholder="Rua, número, bairro, cidade - UF"
          defaultValue={initialData?.fullAddress ?? ''}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Latitude</label>
          <input
            name="lat"
            type="number"
            step="any"
            className={inputClass}
            placeholder="Ex.: -23.5505"
            defaultValue={initialData?.lat ?? ''}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Longitude</label>
          <input
            name="lon"
            type="number"
            step="any"
            className={inputClass}
            placeholder="Ex.: -46.6333"
            defaultValue={initialData?.lon ?? ''}
          />
        </div>
      </div>

      <div className="flex gap-2 justify-end pt-2">
        {isEditing && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={pending}>
          {pending ? 'Salvando…' : isEditing ? 'Salvar alterações' : 'Cadastrar unidade'}
        </Button>
      </div>
    </form>
  );
}
