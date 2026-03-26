import React from 'react';
import { Play, Repeat, Square } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '@/app/context/ThemeContext';

interface CampaignControlPanelProps {
  isRunning: boolean;
  onStartStop: () => void;
  isFollowUpActive: boolean;
  setIsFollowUpActive: (active: boolean) => void;
  onFollowUp: () => void;
}


export const CampaignControlPanel = (
  {
    isRunning,
    onStartStop,
    isFollowUpActive,
    setIsFollowUpActive,
    onFollowUp
  }: CampaignControlPanelProps
) => {

  const { theme } = useTheme();

  return (
    <div className="w-full flex items-center gap-2">
      <button
        onClick={() => {
          onStartStop();
          if (!isRunning) {
            setIsFollowUpActive(false); // 🔥 сброс
          }
        }}
        className={`
          flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black transition-all duration-300 active:scale-95 cursor-pointer uppercase tracking-tight border w-[130px] justify-center
          ${isRunning
            ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
            : 'bg-blue-600/10 hover:bg-blue-600/20 border-blue-500/20 text-blue-500'
          }
        `}
      >
        <div className="relative w-2.5 h-2.5 flex items-center justify-center">
          <AnimatePresence mode="wait">
            {isRunning ? (
              <motion.div
                key="stop"
                initial={{ scale: 0, opacity: 0, rotate: -90 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                exit={{ scale: 0, opacity: 0, rotate: 90 }}
                transition={{ duration: 0.2 }}
              >
                <Square size={10} fill="currentColor" />
              </motion.div>
            ) : (
              <motion.div
                key="play"
                initial={{ scale: 0, opacity: 0, rotate: 90 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                exit={{ scale: 0, opacity: 0, rotate: -90 }}
                transition={{ duration: 0.2 }}
              >
                <Play size={10} fill="currentColor" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        <span className="text-center">
          {isRunning ? 'Stop Campaign' : 'Start Campaign'}
        </span>
      </button>
      
      <button 
        disabled={!isRunning }
        onClick={() => {
          const newValue = !isFollowUpActive;
          setIsFollowUpActive(newValue);

          if (newValue) {
            onFollowUp();
          }
        }}
        className={`
          relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black transition-all duration-300 uppercase tracking-tight border overflow-hidden
          ${isRunning
            ? (isFollowUpActive 
                ? 'bg-purple-600 border-purple-500 text-white shadow-[0_0_20px_rgba(147,51,234,0.5)]' 
                : (theme === 'dark' ? 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10' : 'bg-black/5 border-black/10 text-black/80 hover:bg-black/10')
              ) + ' cursor-pointer active:scale-95'
            : (theme === 'dark' ? 'bg-[#1a1a1a] border-white/5 text-neutral-600' : 'bg-black/[0.03] border-black/5 text-neutral-400') + ' cursor-not-allowed opacity-40'
          }
        `}
      >
        {isFollowUpActive && isRunning && (
          <motion.div
            className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent"
            animate={{
              x: ['-100%', '200%'],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        )}
        <Repeat size={10} />
        <span className="relative z-10">Follow-up</span>
        {isFollowUpActive && isRunning && (
          <motion.div 
            className="absolute inset-0 rounded-xl"
            animate={{
              boxShadow: [
                'inset 0 0 0px rgba(255,255,255,0)',
                'inset 0 0 10px rgba(255,255,255,0.3)',
                'inset 0 0 0px rgba(255,255,255,0)'
              ]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
            }}
          />
        )}
      </button>
    </div>
  );
};
