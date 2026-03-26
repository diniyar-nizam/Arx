import React from 'react';
import { Mail, Database, Settings } from 'lucide-react';
import { motion } from 'motion/react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar = ({ activeTab, setActiveTab }: SidebarProps) => {
  const menuItems = [
    { id: 'mail', icon: Mail },
    { id: 'database', icon: Database },
    { id: 'settings', icon: Settings },
  ];

  return (
    <div className="fixed left-0 top-0 h-screen w-20 bg-background border-r border-card-border flex flex-col items-center justify-center z-50 transition-colors duration-300">
      <div className="flex flex-col space-y-6 relative">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className="group relative flex items-center justify-center w-12 h-12 outline-none cursor-pointer"
            >
              {/* Sliding Glassy Background */}
              {isActive && (
                <motion.div
                  layoutId="sidebar-active-pill"
                  className="absolute inset-0 bg-glass-bg border border-glass-border rounded-2xl shadow-sm z-0"
                  transition={{
                    type: "spring",
                    stiffness: 450,
                    damping: 35,
                    mass: 0.8
                  }}
                />
              )}
              
              {/* Icon with hover effect */}
              <motion.div
                animate={{
                  rotate: isActive ? 360 : 0,
                  scale: isActive ? 1.1 : 1,
                }}
                className={`relative z-10 flex items-center justify-center transition-colors duration-300 ${
                  isActive ? 'text-blue-600 dark:text-white' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <Icon 
                  size={20} 
                  strokeWidth={isActive ? 2 : 1.5} 
                />
              </motion.div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
