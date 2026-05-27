'use client';

import { ChevronDown } from 'lucide-react';

const data = [
  { name: 'Jan', value: 400, x: 0, y: 76 },
  { name: 'Fev', value: 300, x: 27.3, y: 90 },
  { name: 'Mar', value: 500, x: 54.5, y: 62 },
  { name: 'Abr', value: 450, x: 81.8, y: 69 },
  { name: 'Mai', value: 470, x: 109.1, y: 66.2 },
  { name: 'Jun', value: 600, x: 136.4, y: 48 },
  { name: 'Jul', value: 800, x: 163.6, y: 20 },
  { name: 'Ago', value: 750, x: 190.9, y: 27 },
  { name: 'Set', value: 650, x: 218.2, y: 41 },
  { name: 'Out', value: 700, x: 245.5, y: 34 },
  { name: 'Nov', value: 680, x: 272.7, y: 36.8 },
  { name: 'Dez', value: 720, x: 300, y: 31.2 },
];

export function SalaryChart() {
  const pointsPath = data.map((d) => `${d.x},${d.y}`).join(' ');
  const areaPath = `M 0,100 L ${pointsPath} L 300,100 Z`;
  const linePath = `M ${pointsPath}`;

  return (
    <div className="rounded-[2rem] bg-white p-8 shadow-sm">
      <div className="mb-8 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800">Remuneração</h3>
        <button className="flex items-center gap-2 rounded-lg bg-[#00D094] px-4 py-1.5 text-xs font-medium text-white">
          Anual <ChevronDown size={14} />
        </button>
      </div>

      <div className="w-full">
        {/* SVG Area Chart */}
        <div className="relative h-[200px] w-full">
          <svg
            viewBox="0 0 300 105"
            className="h-full w-full overflow-visible"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="salaryGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#004AAD" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#004AAD" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            {/* Grid line helper (bottom horizontal axis guide) */}
            <line x1="0" y1="100" x2="300" y2="100" stroke="#f1f5f9" strokeWidth="1" />

            {/* Filled Area */}
            <path d={areaPath} fill="url(#salaryGradient)" />

            {/* Line Path */}
            <path
              d={linePath}
              fill="none"
              stroke="#004AAD"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Data Point Dots */}
            {data.map((d, index) => (
              <circle
                key={index}
                cx={d.x}
                cy={d.y}
                r="3.5"
                fill="#ffffff"
                stroke="#004AAD"
                strokeWidth="1.8"
                className="transition-all duration-200 hover:r-[5px]"
              />
            ))}
          </svg>
        </div>

        {/* X Axis Labels */}
        <div className="mt-4 flex justify-between px-1">
          {data.map((d, index) => (
            <span key={index} className="text-[10px] font-medium text-slate-400 w-6 text-center">
              {d.name}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-8 flex justify-around">
        <div className="text-center">
          <p className="text-xs font-medium text-slate-400">Esta Semana</p>
          <p className="text-2xl font-bold text-[#004AAD]">R$ 259</p>
        </div>
        <div className="text-center">
          <p className="text-xs font-medium text-slate-400">Este Mês</p>
          <p className="text-2xl font-bold text-[#004AAD]">R$ 873</p>
        </div>
      </div>
    </div>
  );
}

