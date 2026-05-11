'use client';

import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const data = [
  { name: 'Male', value: 4000 },
  { name: 'Female', value: 1000 },
];

const COLORS = ['#004AAD', '#CBD5E1'];

export function GenderChart() {
  return (
    <div className="rounded-[2rem] bg-white p-8 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800">Patient Gender</h3>
        <button className="rounded-lg bg-[#00D094] px-4 py-1.5 text-xs font-medium text-white">
          View All
        </button>
      </div>

      <div className="relative flex items-center justify-between">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-2.5 w-2.5 rounded-full bg-[#004AAD]" />
            <div>
              <p className="text-sm font-bold text-slate-800">4000</p>
              <p className="text-xs text-slate-400">Male</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-2.5 w-2.5 rounded-full bg-slate-300" />
            <div>
              <p className="text-sm font-bold text-slate-800">1000</p>
              <p className="text-xs text-slate-400">Female</p>
            </div>
          </div>
        </div>

        <div className="relative h-[120px] w-[120px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={55}
                paddingAngle={0}
                dataKey="value"
                startAngle={90}
                endAngle={450}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-bold text-slate-800">80%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
