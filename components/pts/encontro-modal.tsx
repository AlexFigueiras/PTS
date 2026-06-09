'use client';

import { useState, useTransition, useEffect } from 'react';
import { createEncontroAction } from '@/modules/pts/actions';
import { X, Calendar, Users, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type Professional = {
  id: string;
  fullName: string;
};

type EncontroModalProps = {
  planId: string;
  professionals: Professional[];
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
};

export function EncontroModal({ planId, professionals, isOpen, onClose, onCreated }: EncontroModalProps) {
  const [tipo, setTipo] = useState<'articulacao_rede' | 'reuniao_pts'>('articulacao_rede');
  const [data, setData] = useState('');
  const [usuarioPresente, setUsuarioPresente] = useState(false);
  const [ata, setAta] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isUsuarioPresente = tipo === 'reuniao_pts' ? true : usuarioPresente;

  if (!isOpen) return null;

  function toggleParticipant(id: string) {
    setSelectedParticipants((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (selectedParticipants.length === 0) {
      setError('Selecione pelo menos um profissional participante.');
      return;
    }

    startTransition(async () => {
      const result = await createEncontroAction({
        planoId: planId,
        tipo,
        data,
        participantes: selectedParticipants,
        usuarioPresente: isUsuarioPresente,
        ata: ata.trim() || null,
      });

      if (result.error) {
        setError(result.error);
      } else {
        // Reset form
        setTipo('articulacao_rede');
        setData('');
        setUsuarioPresente(false);
        setAta('');
        setSelectedParticipants([]);
        onCreated();
        onClose();
      }
    });
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative w-full max-w-lg overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white shadow-2xl animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Users size={16} />
            </div>
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-800">
              Registrar Encontro / Reunião
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Tipo de Encontro (Estilizado Premium com Cards) */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Tipo de Encontro *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTipo('articulacao_rede')}
                className={cn(
                  'flex flex-col items-start rounded-2xl border p-3.5 text-left transition-all active:scale-[0.98]',
                  tipo === 'articulacao_rede'
                    ? 'border-primary bg-primary/5 text-primary shadow-sm'
                    : 'border-border bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                )}
              >
                <span className="text-[10px] font-black uppercase tracking-wider">Articulação</span>
                <span className="mt-1 text-[8px] opacity-80 leading-normal">
                  Discussão de caso entre os profissionais da rede de apoio.
                </span>
              </button>

              <button
                type="button"
                onClick={() => setTipo('reuniao_pts')}
                className={cn(
                  'flex flex-col items-start rounded-2xl border p-3.5 text-left transition-all active:scale-[0.98]',
                  tipo === 'reuniao_pts'
                    ? 'border-primary bg-primary/5 text-primary shadow-sm'
                    : 'border-border bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                )}
              >
                <span className="text-[10px] font-black uppercase tracking-wider">Pactuação PTS</span>
                <span className="mt-1 text-[8px] opacity-80 leading-normal">
                  Pactuação formal de metas diretamente com o cidadão.
                </span>
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Data e hora */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                <Calendar size={11} /> Data e Hora *
              </label>
              <input
                type="datetime-local"
                required
                value={data}
                onChange={(e) => setData(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {/* Presença do Usuário */}
            <div className="space-y-1 flex flex-col justify-end">
              <div className="flex items-center justify-between rounded-xl border border-border bg-slate-50/50 p-2.5">
                <div className="space-y-0.5">
                  <span className="block text-[10px] font-black uppercase tracking-wider text-slate-700">
                    Cidadão Presente?
                  </span>
                  {tipo === 'reuniao_pts' && (
                    <span className="block text-[8px] text-primary/80 font-bold">
                      Obrigatório para PTS
                    </span>
                  )}
                </div>
                <input
                  type="checkbox"
                  disabled={tipo === 'reuniao_pts'}
                  checked={isUsuarioPresente}
                  onChange={(e) => setUsuarioPresente(e.target.checked)}
                  className="size-4 rounded border-slate-300 text-primary focus:ring-primary disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          {/* Participantes da Rede (Múltipla Seleção) */}
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
              Profissionais Participantes *
            </label>
            <div className="max-h-[140px] overflow-y-auto rounded-xl border border-border p-2 space-y-1 scrollbar-thin">
              {professionals.length === 0 ? (
                <p className="p-3 text-center text-xs text-muted-foreground italic">
                  Nenhum profissional disponível.
                </p>
              ) : (
                professionals.map((p) => {
                  const isSelected = selectedParticipants.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => toggleParticipant(p.id)}
                      className={cn(
                        'flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors text-left',
                        isSelected
                          ? 'bg-primary/5 text-primary font-semibold'
                          : 'hover:bg-slate-50 text-slate-600'
                      )}
                    >
                      <span>{p.fullName}</span>
                      <div
                        className={cn(
                          'flex size-4 items-center justify-center rounded border transition-colors',
                          isSelected
                            ? 'border-primary bg-primary text-white'
                            : 'border-slate-300 bg-white'
                        )}
                      >
                        {isSelected && <CheckCircle2 size={10} />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Ata: pauta e decisões da reunião */}
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Ata — Pauta e Decisões
            </label>
            <textarea
              value={ata}
              onChange={(e) => setAta(e.target.value)}
              rows={3}
              placeholder="O que foi discutido e pactuado nesta reunião..."
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {error && (
            <p className="flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200/50 rounded-xl px-3 py-2 animate-reveal">
              <AlertTriangle size={11} className="shrink-0" /> {error}
            </p>
          )}

          {/* Footer */}
          <div className="flex gap-2 border-t border-slate-100 pt-4 justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="rounded-xl px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2 text-[10px] font-black uppercase tracking-wider text-primary-foreground shadow transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              {isPending ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
              Salvar Encontro
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
