import React from 'react';
import { ShieldCheck, Info, Zap } from 'lucide-react';
import { useTheme } from '@/app/context/ThemeContext';
interface MyAccountCardProps {
  userId: string | null;
  daysLeft: number;
  active: boolean;
  plan: 'LITE' | 'STANDARD' | 'ULTIMATE';
}

export const MyAccountCard = ({ userId, daysLeft, active, plan }: MyAccountCardProps) => {
  const { theme } = useTheme();
    const PLAN_UI = {
      LITE: {
        label: 'Lite',
        badge: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500',
        dot: 'bg-emerald-500',
        icon: ShieldCheck,
      },
      STANDARD: {
        label: 'Standard',
        badge: 'bg-blue-500/10 border-blue-500/20 text-blue-500',
        dot: 'bg-blue-500',
        icon: Zap,
      },
      ULTIMATE: {
        label: 'Ultimate Pro',
        badge: 'bg-purple-500/10 border-purple-500/20 text-purple-500',
        dot: 'bg-purple-500',
        icon: Zap,
      },
    } as const;

    const planData = PLAN_UI[plan];
    const Icon = planData.icon;

  return (
    <div className="w-full bg-card-bg border border-card-border rounded-[24px] p-5 flex flex-col shadow-xl transition-all duration-300">
      <h2 className="text-[14px] font-bold text-text-primary tracking-tight mb-4 uppercase tracking-wider">My Account</h2>
      
      <div className="flex flex-col space-y-4">
        {/* UID Section */}
        <div>
          <p className="text-[9px] text-text-secondary font-bold mb-1 uppercase tracking-tight">Your Identifier (UID)</p>
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-bold text-text-primary">#{userId ?? '—'}</span>
            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-500/10 rounded-md border border-emerald-500/20">
              <ShieldCheck size={10} className="text-emerald-500" />
              <span className="text-[8px] font-black text-emerald-500 uppercase tracking-tighter">Verified user</span>
            </div>
          </div>
          <div className="flex items-center gap-1 mt-1 opacity-60">
            <Info size={10} className="text-text-secondary" />
            <p className="text-[8px] text-text-secondary font-medium">Share this ID with support if you have any issues</p>
          </div>
        </div>

        {/* Subscription Section */}
        <div className="grid grid-cols-[auto_32px_140px] mb-1 items-end">
          <p className="text-[9px] text-text-secondary font-bold uppercase tracking-tight">
            Subscription status
          </p>

          <div />

          <p className="text-[9px] text-text-secondary font-bold uppercase tracking-tight">
            Time remaining
          </p>
        </div>
          {/* VALUES */}
         <div className="grid grid-cols-[auto_32px_140px] items-center">
          {/* Subscription badge */}
          <div
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border shadow-sm w-fit justify-self-start ${planData.badge}`}
          >
            <div
              className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${planData.dot}`}
            >
              <Icon size={8} className="text-white fill-white" />
            </div>

            <span className="text-[9px] font-black uppercase tracking-tighter whitespace-nowrap">
              {planData.label}
            </span>
          </div>

          {/* spacer */}
          <div />

          {/* Time remaining */}
          <p className="text-[11px] font-bold text-text-primary tabular-nums whitespace-nowrap">
            {daysLeft} days
          </p>
        </div>
      </div>
    </div>
  );
};
