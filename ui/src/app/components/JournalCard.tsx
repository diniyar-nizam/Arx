import React, { useRef, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface JournalCardProps {
  logs: {
    time: string;
    text: string;
    color?: 'gray' | 'green' | 'red' | 'yellow' | 'purple';
  }[];
}

const colorMap = {
  gray: 'text-text-secondary',
  green: 'text-emerald-400',
  red: 'text-red-400',
  yellow: 'text-yellow-400',
  purple: 'text-purple-400',
};

export const JournalCard = ({ logs }: JournalCardProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const shouldAutoScrollRef = useRef(true);

  // 🧠 отслеживаем ручной скролл
  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;

    const threshold = 40; // px от низа
    const isAtBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight < threshold;

    shouldAutoScrollRef.current = isAtBottom;
  };

  // 🔥 автоскролл при добавлении логов
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    if (shouldAutoScrollRef.current) {
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight;
      });
    }
  }, [logs.length]);

  return (
    <div className="w-[380px] h-[501px] bg-card-bg border border-card-border rounded-[24px] p-5 flex flex-col shadow-xl overflow-hidden">
      <h2 className="text-[14px] font-bold text-text-primary tracking-wider mb-4 uppercase">
        Journal
      </h2>

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto overflow-x-hidden journal-scroll pr-3"
      >
        {logs.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center opacity-40">
            <p className="text-[11px] font-medium text-text-secondary leading-relaxed">
              Your campaign logs will appear here. <br />
              Start a campaign to see activity.
            </p>
          </div>
        ) : (
          <div className="flex flex-col space-y-1.5">
            <AnimatePresence initial={false}>
              {logs.map((log, index) => (
                <motion.div
                  key={`${log.time}-${index}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-start gap-2.5 font-mono text-[10px] leading-tight group"
                >
                  <span className="text-text-secondary opacity-60 whitespace-nowrap">
                    [{log.time}]
                  </span>
                  <span
                    className={`
                      font-medium transition-colors
                      ${colorMap[log.color ?? 'gray']}
                      group-hover:text-text-primary
                    `}
                  >
                    {log.text}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};
