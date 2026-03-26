import React from 'react';
import { LayoutGrid } from 'lucide-react';
interface DashboardCardProps {
  scanned: number;
  sent: number;
  artists: number;
  producers: number;
  media: number;
  undefined: number;
}

export const DashboardCard: React.FC<DashboardCardProps> = ({
  scanned,
  sent,
  artists,
  producers,
  media,
  undefined
}) => {


  return (
    <div className="w-full bg-card-bg border border-card-border rounded-[24px] p-5 flex flex-col shadow-xl transition-all duration-300">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-7 h-7 bg-sub-card-bg rounded-lg border border-sub-card-border flex items-center justify-center">
          <LayoutGrid size={12} className="text-text-primary" />
        </div>
        <h1 className="text-[14px] font-bold text-text-primary tracking-tight">Dashboard</h1>
      </div>

      {/* Main Stats Row */}
      <div className="flex flex-col border-b border-card-border pb-4 mb-4 space-y-3">
        <div className="flex gap-8">
          <div className="text-left">
            <p className="text-[10px] text-text-secondary mb-0.5 font-medium uppercase tracking-wider">Scanned</p>
            <p className="text-[18px] font-bold text-text-primary tracking-tight leading-none">{scanned}</p>
          </div>
          <div className="text-left">
            <p className="text-[10px] text-text-secondary mb-0.5 font-medium uppercase tracking-wider">Sent</p>
            <p className="text-[18px] font-bold text-text-primary tracking-tight leading-none">{sent}</p>
          </div>
        </div>
      </div>

      {/* Found Section */}
      <div className="flex flex-col space-y-2">
        <h2 className="text-[11px] font-bold text-text-primary uppercase tracking-wider opacity-50">Found</h2>
        <div className="flex items-start gap-6">
          <div className="text-left">
            <p className="text-[10px] text-text-secondary mb-0.5 font-medium">Artists</p>
            <p className="text-[15px] font-bold text-text-primary tracking-tight">{artists}</p>
          </div>
          <div className="text-left">
            <p className="text-[10px] text-text-secondary mb-0.5 font-medium">Producers</p>
            <p className="text-[15px] font-bold text-text-primary tracking-tight">{producers}</p>
          </div>
          <div className="text-left">
            <p className="text-[10px] text-text-secondary mb-0.5 font-medium">Media</p>
            <p className="text-[15px] font-bold text-text-primary tracking-tight">{media}</p>
          </div>
          <div className="text-left">
            <p className="text-[10px] text-text-secondary mb-0.5 font-medium">Undefined</p>
            <p className="text-[15px] font-bold text-text-primary tracking-tight">{undefined}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
