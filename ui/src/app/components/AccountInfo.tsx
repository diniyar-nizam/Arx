import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle } from 'lucide-react';
import { CampaignState } from './CampaignControlPanel';

interface AccountInfoProps {
  campaignState: CampaignState;
  onConfirmStop: () => void;
  onCancelStop: () => void;
  mailingState: {
    status: string;
    processed: number;
    limit: number;
  };
  accountName?: string | null;
  processed: number;
  totalProcessed: number;
  totalLimit: number;
  limit: number;
  isStopConfirmOpen: boolean;
}

export const AccountInfo = ({ campaignState, mailingState, onConfirmStop, onCancelStop, accountName, processed, totalProcessed, totalLimit, limit, isStopConfirmOpen }: AccountInfoProps) => {
  const isStopping = isStopConfirmOpen;
  const isActiveCampaign =
  mailingState.status === 'starting' ||
  mailingState.status === 'mailing';
  const accountsLeft = isActiveCampaign
  ? Math.max(
      0,
      mailingState.authorizedAccountsTotal -
      mailingState.authorizedAccountIndex -
      1
    )
  : 0;


  return (
    <div className="w-full bg-card-bg border border-card-border rounded-[24px] min-h-[58px] flex items-center shadow-xl transition-all duration-300 relative overflow-hidden">
      <AnimatePresence mode="wait">
        {!isStopping ? (
          <motion.div 
            key="stats"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="w-full flex items-center gap-5 px-4"
          >
            <div className="flex flex-col items-start px-1">
              <p className="text-[9px] text-[#4ade80] font-bold mb-0.5 uppercase tracking-tight">Active Account</p>
              <p className="text-[12px] font-bold text-text-primary tracking-tight">@{accountName || 'not selected'}</p>
            </div>


            <div className="flex flex-col items-start px-1">
              <p className="text-[9px] text-text-secondary font-bold mb-0.5 uppercase tracking-tight whitespace-nowrap">Account Usage</p>
              <p className="text-[12px] font-bold text-text-primary tracking-tight whitespace-nowrap">{isActiveCampaign ? `${processed} / ${limit}` : '0 / 0'}</p>
            </div>
            <div className="flex flex-col items-start px-1">
              <p className="text-[9px] text-text-secondary font-bold mb-0.5 uppercase tracking-tight whitespace-nowrap">Accounts Left</p>
              <p className="text-[12px] font-bold text-text-primary tracking-tight whitespace-nowrap">{accountsLeft}</p>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="warning"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="w-full flex flex-col p-4 gap-3"
          >
            <div className="flex items-start gap-2">
              <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
              <p className="text-[10px] font-medium text-text-primary leading-tight">
                If you stop the campaign, you won’t be able to run follow-ups for contacts from the active campaign.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={onConfirmStop}
                className="flex-1 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors cursor-pointer active:scale-95"
              >
                Confirm
              </button>
              <button 
                onClick={onCancelStop}
                className="flex-1 py-1.5 bg-white/5 hover:bg-white/10 text-text-primary border border-card-border rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors cursor-pointer active:scale-95"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
