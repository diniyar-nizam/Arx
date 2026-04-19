import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/app/components/Sidebar';
import { DashboardCard } from '@/app/components/DashboardCard';
import { AccountInfo } from '@/app/components/AccountInfo';
import { JournalCard } from '@/app/components/JournalCard';
import { DatabaseView } from '@/app/components/DatabaseView';
import { SettingsView } from '@/app/components/SettingsView';
import { CampaignControlPanel, CampaignState } from '@/app/components/CampaignControlPanel';
import { MyAccountCard } from '@/app/components/MyAccountCard';
import { motion, AnimatePresence } from 'motion/react';
import { ThemeProvider, useTheme } from '@/app/context/ThemeContext';
import { useAppLogic } from './App_old';
import RegistrationForm from '@/app/components/RegistrationForm';
import { AnimatedBackground } from '@/app/components/AnimatedBackground';

function AppContent() {

  const logic = useAppLogic();

  const {
    isRunning,
    handleStartStop,
    loading,
    active,
    activeView,
    setActiveView,
    mailingState,
    profiles,
    handleFollowUp

  } = logic;

  const [campaignState, setCampaignState] = useState<CampaignState>('idle');
  const [isFollowUpActive, setIsFollowUpActive] = useState(false);
  const { theme } = useTheme();
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);
const [updateState, setUpdateState] = useState<"idle" | "downloading" | "downloaded">("idle");
const [progress, setProgress] = useState(0);
const [newVersion, setNewVersion] = useState<string | null>(null);
useEffect(() => {
  window.api.onUpdateStatus((data) => {
    if (data.type === "available") {
      setShowUpdateBanner(true);
      setNewVersion(data.data);
    }

    if (data.type === "progress") {
      setUpdateState("downloading");
      setProgress(data.data);
    }

    if (data.type === "downloaded") {
      setUpdateState("downloaded");
    }
  });
}, []);
const handleUpdate = () => {
  if (!newVersion) return;
  window.api.openMacUpdate(newVersion);
};

  // === ПРОВЕРКА ЛИЦЕНЗИИ ===

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        License check...
      </div>
    );
  }

  if (!active) {
    return (
      <div className="relative min-h-screen">
        <AnimatedBackground />
        <div className="relative z-10">
          <RegistrationForm onSuccess={() => window.location.reload()} />
        </div>
      </div>
    );
  }


  return (
    <div className={`h-screen w-screen flex font-sans overflow-hidden transition-colors duration-500 ${theme === 'dark' ? 'bg-[#0a0a0a] text-white' : 'bg-[#F4F7FE] text-[#1a1a1a]'}`}>
      {/* Sidebar */}
      <Sidebar activeTab={activeView} setActiveTab={setActiveView} />

      {/* Main Content */}
      <main className="flex-1 ml-20 h-full flex flex-col items-center p-8 overflow-hidden relative">
        {/* Top Banner */}
        <AnimatePresence>
          {showUpdateBanner && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                className="flex items-center gap-3 px-4 py-2 bg-blue-600 rounded-full shadow-lg shadow-blue-600/20 border border-blue-500/50"
              >
                <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                  New version available
                </span>
                <button
                  onClick={handleUpdate}
                  className="relative overflow-hidden px-3 py-1 bg-white text-blue-600 rounded-full text-[9px] font-black uppercase cursor-pointer"
                >
                  {/* прогресс фон */}
                  {updateState === "downloading" && (
                    <motion.div
                      className="absolute left-0 top-0 h-full bg-blue-200"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ ease: "linear" }}
                    />
                  )}

                  {/* текст */}
                  <span className="relative z-10">
                    Update now
                    {/*{updateState === "idle" && "Update now"}*/}
                    {/*{updateState === "downloading" && "Downloading..."}*/}
                    {/*{updateState === "downloaded" && "UPDATE & RESTART"}*/}
                  </span>
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>


        <div className="w-full h-full flex items-center justify-center relative mt-4">

          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{
                duration: 0.15,
                ease: "easeOut"
              }}
              className="w-full h-full flex items-center justify-center"
            >
              {activeView === 'mail' && (
                <div className="flex flex-col space-y-4 h-fit max-h-[90vh]">
                  {/* Top: Control Panel */}
                  <div className="w-[420px]">
                    <CampaignControlPanel
                      isRunning={isRunning}
                      onStartStop={handleStartStop}
                      isFollowUpActive={isFollowUpActive}
                      setIsFollowUpActive={setIsFollowUpActive}
                      onFollowUp={handleFollowUp}
                    />
                  </div>

                  {/* Bottom: Left Column (Account + Dashboard + MyAccount) and Right Column (Journal) */}
                  <div className="flex items-stretch gap-4">
                    <div className="flex flex-col space-y-4 w-[320px]">
                      <AccountInfo 
                        campaignState={campaignState}
                        mailingState={logic.mailingState}
                        accountName={logic.getProfileName(logic.selectedAccount)}
                        processed={logic.mailingState.processed}
                        totalProcessed={logic.mailingState.totalProcessed}
                        totalLimit={logic.mailingState.totalLimit}
                        limit={logic.mailingState.limit}
                        isStopConfirmOpen={logic.isStopConfirmOpen}
                        onConfirmStop={logic.confirmStopCampaign}
                        onCancelStop={logic.cancelStopCampaign}
                      />
                      <DashboardCard
                          scanned={mailingState.scanned}
                          sent={mailingState.totalProcessed}
                          artists={mailingState.artists}
                          producers={mailingState.producers}
                          media={mailingState.media}
                          undefined={mailingState.undefined}
                      />
                      <MyAccountCard
                          userId={logic.userId}
                          daysLeft={logic.daysLeft}
                          active={logic.active}
                          plan={logic.plan}
                      />
                    </div>

                    <div className="flex w-[380px]">
                      <JournalCard logs={logic.logs} />

                    </div>
                  </div>
                </div>
              )}

              {activeView === 'database' && (
                <div className="w-full flex flex-col items-center justify-center">
                   <DatabaseView
                      databaseView={logic.databaseView}
                      setDatabaseView={logic.setDatabaseView}
                    />

                </div>
              )}

              {activeView === 'settings' && (
                <div className="w-full flex flex-col items-center justify-center">
                   <SettingsView logic={logic} />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
          
        </div>
      </main>

      <style dangerouslySetInnerHTML={{ __html: `
  /* GLOBAL THIN SCROLLBAR */


  ::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  ::-webkit-scrollbar-track {
    background: transparent;
  }

  ::-webkit-scrollbar-thumb {
    background: #2A2A2A;
    border-radius: 999px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: #3A3A3A;
  }

  * {
    scrollbar-width: thin;
    scrollbar-color: #2A2A2A transparent;
  }
`}} />


    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
