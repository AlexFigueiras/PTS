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
    <div className="min-h-full bg-background p-12 animate-reveal">
      <div className="mx-auto max-w-[1400px] space-y-12">
        {/* Top Header */}
        <div className="flex flex-col items-center justify-center py-6">
           <h1 className="text-6xl font-medium tracking-tight text-primary">Doctor Dashboard</h1>
        </div>

        {/* Content Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <h2 className="text-4xl font-semibold tracking-tight text-foreground">Hello James!</h2>
            <p className="max-w-md text-lg leading-relaxed text-muted-foreground/80">
              Welcome James to Our Platform.<br />
              Let's help patients to live a healthier and happier life
            </p>
          </div>
          
          <div className="flex gap-2 rounded-2xl bg-card p-2.5 shadow-diffusion premium-bevel">
            <button className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95">
              <LayoutGrid size={22} />
            </button>
            <button className="flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground/30 transition-all hover:bg-secondary hover:text-foreground active:scale-95">
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
