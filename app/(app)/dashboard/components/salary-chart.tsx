'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { ChevronDown } from 'lucide-react';

const data = [
  { name: 'Jan', value: 400 },
  { name: 'Feb', value: 300 },
  { name: 'Mar', value: 500 },
  { name: 'Apr', value: 450 },
  { name: 'May', value: 470 },
  { name: 'Jun', value: 600 },
  { name: 'Jul', value: 800 },
  { name: 'Aug', value: 750 },
  { name: 'Sep', value: 650 },
  { name: 'Oct', value: 700 },
  { name: 'Nov', value: 680 },
  { name: 'Dec', value: 720 },
];

export function SalaryChart() {
  return (
    <div className="rounded-[2rem] bg-white p-8 shadow-sm">
      <div className="mb-8 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800">Doctor Salary</h3>
        <button className="flex items-center gap-2 rounded-lg bg-[#00D094] px-4 py-1.5 text-xs font-medium text-white">
          Yearly <ChevronDown size={14} />
        </button>
      </div>

      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#004AAD" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#004AAD" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <Tooltip 
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            />
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke="#004AAD" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorValue)" 
              dot={{ r: 4, fill: '#fff', stroke: '#004AAD', strokeWidth: 2 }}
              activeDot={{ r: 6 }}
            />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              dy={10}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-8 flex justify-around">
        <div className="text-center">
          <p className="text-xs font-medium text-slate-400">This Week</p>
          <p className="text-2xl font-bold text-[#004AAD]">$259</p>
        </div>
        <div className="text-center">
          <p className="text-xs font-medium text-slate-400">This Month</p>
          <p className="text-2xl font-bold text-[#004AAD]">$873</p>
        </div>
      </div>
    </div>
  );
}
