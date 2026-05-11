import { SalaryChart } from './components/salary-chart';
import { DutyHourChart } from './components/duty-hour-chart';
import { GenderChart } from './components/gender-chart';
import { UpcomingAppointments } from './components/upcoming-appointments';
import { ProfileCard } from './components/profile-card';
import { PatientFiles } from './components/patient-files';
import { LayoutGrid, List } from 'lucide-react';

export const metadata = { title: 'Doctor Dashboard | CAPS' };

export default async function DashboardPage() {
  return (
    <div className="min-h-full bg-[#F8FAFC] p-12 animate-reveal">
      <div className="mx-auto max-w-[1400px]">
        {/* Top Header */}
        <div className="mb-12 flex flex-col items-center justify-center">
           <h1 className="text-6xl font-extrabold tracking-tight text-[#004AAD] opacity-90">Doctor Dashboard</h1>
        </div>

        {/* Content Header */}
        <div className="mb-12 flex items-start justify-between">
          <div>
            <h2 className="text-4xl font-bold text-slate-800 tracking-tight">Hello James!</h2>
            <p className="mt-3 text-slate-400 max-w-md text-lg leading-relaxed">
              Welcome James to Our Platform.<br />
              Let's help patients to live a healthier and happier life
            </p>
          </div>
          
          <div className="flex gap-2 rounded-2xl bg-white p-2.5 shadow-sm border border-slate-100">
            <button className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#00D094] text-white shadow-lg shadow-[#00D094]/20">
              <LayoutGrid size={22} />
            </button>
            <button className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-300 hover:bg-slate-50 transition-colors">
              <List size={22} />
            </button>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-12 gap-10">
          {/* Left Column */}
          <div className="col-span-12 xl:col-span-5 space-y-10">
            <SalaryChart />
            <DutyHourChart />
          </div>

          {/* Middle Column */}
          <div className="col-span-12 xl:col-span-4 space-y-10">
            <GenderChart />
            <UpcomingAppointments />
          </div>

          {/* Right Column */}
          <div className="col-span-12 xl:col-span-3 space-y-10">
            <ProfileCard />
            <PatientFiles />
          </div>
        </div>
      </div>
    </div>
  );
}
