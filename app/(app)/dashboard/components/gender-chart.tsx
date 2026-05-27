'use client';

export function GenderChart() {
  return (
    <div className="rounded-[2rem] bg-white p-8 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800">Gênero dos Pacientes</h3>
        <button className="rounded-lg bg-[#00D094] px-4 py-1.5 text-xs font-medium text-white">
          Ver Tudo
        </button>
      </div>

      <div className="relative flex items-center justify-between">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-2.5 w-2.5 rounded-full bg-[#004AAD]" />
            <div>
              <p className="text-sm font-bold text-slate-800">4000</p>
              <p className="text-xs text-slate-400">Masculino</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-2.5 w-2.5 rounded-full bg-slate-300" />
            <div>
              <p className="text-sm font-bold text-slate-800">1000</p>
              <p className="text-xs text-slate-400">Feminino</p>
            </div>
          </div>
        </div>

        <div className="relative h-[120px] w-[120px] flex items-center justify-center">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
            {/* Background circle (Feminino - 20%) */}
            <circle
              cx="18"
              cy="18"
              r="15.915"
              fill="transparent"
              stroke="#CBD5E1"
              strokeWidth="4"
            />
            {/* Foreground circle (Masculino - 80%) */}
            <circle
              cx="18"
              cy="18"
              r="15.915"
              fill="transparent"
              stroke="#004AAD"
              strokeWidth="4"
              strokeDasharray="80 20"
              strokeDashoffset="0"
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-sm font-bold text-slate-800">80%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

