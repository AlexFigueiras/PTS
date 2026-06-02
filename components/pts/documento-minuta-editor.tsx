'use client';

import { useState } from 'react';
import { Printer, Edit3, Eye, FileText, Check } from 'lucide-react';

type PatientData = {
  fullName: string;
  cpf: string | null;
  birthDate: string | null;
  fullAddress: string | null;
};

type AcaoPactuada = {
  id: string;
  unidadeResponsavel: string;
  descricao: string;
  prazo: string;
};

type Props = {
  patient: PatientData;
  planoTipo: string;
  initialMinuta: string;
  acoesPactuadas: AcaoPactuada[];
};

export function DocumentoMinutaEditor({ patient, planoTipo, initialMinuta, acoesPactuadas }: Props) {
  const [minutaText, setMinutaText] = useState(initialMinuta);
  const [isEditing, setIsEditing] = useState(false);

  const birthDateFormatted = patient.birthDate
    ? new Date(patient.birthDate + 'T00:00:00').toLocaleDateString('pt-BR')
    : 'Não informada';

  function handlePrint() {
    window.print();
  }

  return (
    <div className="space-y-6">
      {/* Barra de Ações - Oculta na Impressão */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-border bg-card p-4 shadow-diffusion no-print">
        <div className="flex items-center gap-2">
          <FileText className="text-primary size-5" />
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
              Minuta do {planoTipo === 'PIA' ? 'PIA' : 'PTS'} Formal
            </h3>
            <p className="text-[10px] text-muted-foreground">
              Revise o texto, pactue na rede e faça a impressão oficial.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-700 transition hover:bg-slate-50 active:scale-95"
          >
            {isEditing ? (
              <>
                <Check size={12} className="text-emerald-600" />
                Concluir Edição
              </>
            ) : (
              <>
                <Edit3 size={12} />
                Editar Minuta
              </>
            )}
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-primary/20 transition hover:bg-primary/95 active:scale-95"
          >
            <Printer size={12} />
            Imprimir / PDF
          </button>
        </div>
      </div>

      {/* Documento Legal - Formatado para Impressão */}
      <div className="print-container overflow-hidden rounded-3xl border border-border bg-white p-12 shadow-diffusion font-serif text-slate-900 leading-relaxed max-w-[800px] mx-auto min-h-[1000px] flex flex-col justify-between">
        
        {/* Cabeçalho do Documento */}
        <div className="text-center space-y-2 border-b-2 border-slate-900 pb-6 mb-8">
          <h1 className="text-sm font-black uppercase tracking-widest text-slate-900">
            Prefeitura Municipal de Referência
          </h1>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Coordenação de Governança Intersetorial (Saúde e Assistência Social)
          </h2>
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            Documento Técnico Legal · {planoTipo === 'PIA' ? 'Plano Individual de Atendimento (PIA)' : 'Projeto Terapêutico Singular (PTS)'}
          </div>
        </div>

        {/* Ficha do Cidadão */}
        <div className="mb-8 rounded-xl border border-slate-300 bg-slate-50/50 p-6 text-xs font-sans space-y-2">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-800 mb-4 border-b border-slate-200 pb-1">
            Qualificação do Cidadão
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[9px] block">Nome do Beneficiário</span>
              <span className="font-black text-slate-900 text-sm">{patient.fullName}</span>
            </div>
            <div>
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[9px] block">CPF</span>
              <span className="font-bold text-slate-900">{patient.cpf ?? 'Não cadastrado'}</span>
            </div>
            <div>
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[9px] block">Data de Nascimento</span>
              <span className="font-bold text-slate-900">{birthDateFormatted}</span>
            </div>
            <div>
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[9px] block">Endereço de Referência</span>
              <span className="font-bold text-slate-900">{patient.fullAddress ?? 'Não cadastrado'}</span>
            </div>
          </div>
        </div>

        {/* Corpo da Minuta (Texto do Parecer Técnico) */}
        <div className="flex-1 space-y-6 text-sm text-justify antialiased leading-relaxed mb-10">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-800 mb-2 font-sans border-b border-slate-200 pb-1">
            Parecer e Estudo de Caso
          </h3>
          {isEditing ? (
            <textarea
              value={minutaText}
              onChange={(e) => setMinutaText(e.target.value)}
              className="w-full min-h-[400px] rounded-xl border border-slate-300 p-4 font-sans text-xs text-slate-900 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none leading-relaxed shadow-inner no-print"
            />
          ) : (
            <div className="whitespace-pre-wrap leading-loose">
              {minutaText}
            </div>
          )}
        </div>

        {/* Compromissos Pactuados pela Rede (Item 3) */}
        <div className="mb-10 space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-800 font-sans border-b border-slate-200 pb-1">
            Compromissos Pactuados
          </h3>
          
          {acoesPactuadas.length === 0 ? (
            <p className="text-xs text-slate-500 italic font-sans">
              Nenhuma ação com status &quot;pactuada&quot; registrada para este caso no momento.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-300">
              <table className="min-w-full divide-y divide-slate-300 font-sans text-xs text-left">
                <thead className="bg-slate-50">
                  <tr className="divide-x divide-slate-300">
                    <th scope="col" className="px-4 py-3 text-[9px] font-black uppercase tracking-wider text-slate-700 w-1/3">
                      Unidade Responsável
                    </th>
                    <th scope="col" className="px-4 py-3 text-[9px] font-black uppercase tracking-wider text-slate-700 w-1/2">
                      Ação Acordada
                    </th>
                    <th scope="col" className="px-4 py-3 text-[9px] font-black uppercase tracking-wider text-slate-700 text-center">
                      Prazo
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300 bg-white">
                  {acoesPactuadas.map((acao) => (
                    <tr key={acao.id} className="divide-x divide-slate-300">
                      <td className="px-4 py-3 font-bold text-slate-900">
                        {acao.unidadeResponsavel}
                      </td>
                      <td className="px-4 py-3 text-slate-700 whitespace-pre-wrap">
                        {acao.descricao}
                      </td>
                      <td className="px-4 py-3 text-slate-900 text-center font-bold">
                        {acao.prazo}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Rodapé e Assinaturas */}
        <div className="pt-12 border-t border-slate-300 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center text-[10px] font-sans text-slate-600">
          <div className="space-y-1">
            <div className="h-px bg-slate-400 mx-auto w-3/4 mb-1" />
            <p className="font-bold text-slate-800">Referência Técnica</p>
            <p className="text-[9px]">Responsável pelo Plano</p>
          </div>
          <div className="space-y-1">
            <div className="h-px bg-slate-400 mx-auto w-3/4 mb-1" />
            <p className="font-bold text-slate-800">Profissional Técnico</p>
            <p className="text-[9px]">Ponto de Rede Co-responsável</p>
          </div>
          <div className="space-y-1">
            <div className="h-px bg-slate-400 mx-auto w-3/4 mb-1" />
            <p className="font-bold text-slate-800">Cidadão / Familiar</p>
            <p className="text-[9px]">Ciência e Pactuação</p>
          </div>
        </div>

      </div>

      {/* Estilos para impressão local */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
            font-size: 11pt !important;
          }
          .no-print {
            display: none !important;
          }
          .print-container {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            background: transparent !important;
          }
          textarea.no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
