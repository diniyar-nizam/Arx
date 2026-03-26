import React, { useState, useEffect, useRef } from 'react';
import { Trash2, Plus, LogIn, Save, UploadCloud, Check, RefreshCw, X, Sun, Moon, Settings, ArrowLeft, Lock, LockOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '@/app/context/ThemeContext';
import { useAppLogic } from '@/app/App_old'; // путь свой поставь

type TextType = 'Main' | 'Follow-Up' | 'Comments';

const CustomToggle = ({ active, onClick }: { active: boolean, onClick: () => void }) => {
  const { theme } = useTheme();
  return (
    <div
      onClick={onClick}
      className={`w-8 h-4.5 rounded-full relative cursor-pointer transition-colors duration-300 flex items-center px-1 ${active ? 'bg-blue-600' : (theme === 'dark' ? 'bg-[#1a1a1a] border border-white/10' : 'bg-neutral-200 border border-black/5')}`}
    >
      <motion.div
        animate={{ x: active ? 14 : 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className="w-2.5 h-2.5 bg-white rounded-full shadow-sm"
      />
    </div>
  );
};

export const SettingsView = ({ logic }) => {
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('Texts');
  const [activeCategory, setActiveCategory] = useState<'Artists' | 'Producers'>('Artists');
  const [textType, setTextType] = useState<TextType>('Main');
const textareaRef = useRef<HTMLTextAreaElement | null>(null);
const [isDirty, setIsDirty] = useState(false);
const [isSaving, setIsSaving] = useState(false);
const [selectedAccountForConfig, setSelectedAccountForConfig] =
  useState<null | { dir: string; name: string }>(null);
  // States
const {
  currentTexts,
  setCurrentTexts,
  textView,
  setTextView,
  textMode,
  setTextMode,
  usernames,
  setUsernames,
  handleSave,
  profiles,
  selectedAccount,
  setSelectedAccount,
  loadProfiles,
  handleAddProfile,
  currentParams,
  setCurrentParams,
  savedConfigs,
  handleSaveConfig,
  handleLoadConfig,
  handleDeleteConfig,
  setLoadConfigOpen,
  loadConfigOpen,
  configName,
  setConfigName,
  saveConfigState,
  cancelSaveConfig,
  showSaveDialog,
  setShowSaveDialog,
  showLoadPanel,
  setShowLoadPanel,
  plan,
  profileLimit,
  canAddProfile,
  accountParams,
  setAccountParams,
  isSameParams,
  lockedAccounts,
  setLockedAccounts,
} = logic;
const brainCategory = activeCategory === 'Artists' ? 'artists' : 'producers';
const brainMode =
  textType === 'Main'
    ? 'main'
    : textType === 'Follow-Up'
    ? 'followup'
    : 'comments';


const currentList =
  currentTexts[brainCategory][brainMode] ?? [];
const toggleLock = (e: React.MouseEvent, profileDir: string) => {
  e.stopPropagation();

  setLockedAccounts(prev =>
    prev.includes(profileDir)
      ? prev.filter(p => p !== profileDir)
      : [...prev, profileDir]
  );

  // если залочили выбранный — сбрасываем выбор
  if (selectedAccount === profileDir) {
    setSelectedAccount(null);
  }
};
const [draftUsernames, setDraftUsernames] = useState("");
  const [newTextValue, setNewTextValue] = useState('');
  const [isSuccessFeedback, setIsSuccessFeedback] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
    const activeParams = selectedAccountForConfig
      ? accountParams[selectedAccountForConfig.dir] ?? currentParams
      : currentParams;
  const tabs = ['Texts', 'Usernames', 'Accounts', 'Config'];
  const isDualTabActive = !!selectedAccountForConfig;

  const handleRefresh = async () => {
  setIsRefreshing(true);
  await loadProfiles();
  setTimeout(() => setIsRefreshing(false), 300);
};

useEffect(() => {
  if (activeTab === 'Usernames') {
    setDraftUsernames(usernames);
    setIsDirty(false);
  }
}, [activeTab]);

const setActiveParams = (
  updater: (prev: typeof currentParams) => typeof currentParams
) => {
  // 🔹 РЕДАКТИРУЕМ КОНКРЕТНЫЙ АККАУНТ
  if (selectedAccountForConfig) {
    const accId = selectedAccountForConfig.dir;

    setAccountParams(prev => {
      const base = prev[accId] ?? currentParams; // наследуем глобальные
      return {
        ...prev,
        [accId]: updater(structuredClone(base)),
      };
    });

  // 🔹 РЕДАКТИРУЕМ ГЛОБАЛЬНЫЕ
  } else {
    setCurrentParams(prev => updater(structuredClone(prev)));
  }
};
const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
  e.preventDefault();
};

const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
  e.preventDefault();
  e.stopPropagation();

  const file = e.dataTransfer.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    const text = event.target?.result as string;
    const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    setDraftUsernames(prev =>
      prev ? prev + '\n' + normalized : normalized
    );
    setIsDirty(true)
  };

  reader.readAsText(file);
};
const handleUsernameSave = () => {
  if (!isDirty) return;

  setUsernames(draftUsernames);
  handleSave(draftUsernames);

  setIsSaving(true);
  setIsDirty(false);

  setTimeout(() => {
    setIsSaving(false);
  }, 900);

  requestAnimationFrame(() => {
    textareaRef.current?.focus();
  });
};
const usedProfiles = profiles.length;
const limitReached =
  profileLimit !== Infinity && usedProfiles >= profileLimit;

  const [isSavingConfig, setIsSavingConfig] = useState(false);

  return (
    <div className="w-[650px] h-[540px] flex flex-col space-y-5 animate-in fade-in duration-500 relative">

      {/* Top Tabs + Theme Toggle */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="flex-1 flex bg-card-bg border border-card-border rounded-[28px] p-1.5 h-[44px] relative overflow-hidden">

          {/* Unified highlight pill */}
          <motion.div
          initial={false}
          animate={{
            left: isDualTabActive
              ? 'calc(50% + 8px)'
              : `calc(${tabs.indexOf(activeTab) * 25}% + 8px)`,
            width: isDualTabActive
              ? 'calc(50% - 16px)'
              : 'calc(25% - 16px)',
          }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="absolute top-1 bottom-1 bg-glass-bg border border-glass-border rounded-[20px] z-0"
        />

          {tabs.map((tab) => {
            const isTabActive = activeTab === tab;
            const isTabHighlighted = isTabActive || (isDualTabActive && (tab === 'Accounts' || tab === 'Config'));

            return (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  if (tab !== 'Accounts' && tab !== 'Config') {
                    setSelectedAccountForConfig(null);
                  }
                }}
                className={`relative flex-1 rounded-xl text-[11px] font-bold transition-colors duration-300 z-10 cursor-pointer ${
                  isTabHighlighted
                    ? (theme === 'dark' ? 'text-white' : 'text-blue-600')
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>

        <button
          onClick={toggleTheme}
          className="w-[44px] h-[44px] flex items-center justify-center rounded-[20px] bg-card-bg border border-card-border text-text-secondary hover:text-text-primary cursor-pointer transition-all duration-300 active:scale-95 shadow-sm"
        >
          {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} className="text-amber-500" />}
        </button>
      </div>


      {/* Content Container */}
      <div className="flex-1 bg-card-bg border border-card-border rounded-[28px] p-6 flex flex-col overflow-hidden relative transition-all duration-300 shadow-xl">

        {/* TEXTS TAB */}
        {activeTab === 'Texts' && (
          <div className="flex flex-col h-full animate-in fade-in duration-300">
            <div className="flex items-center justify-between mb-6 flex-shrink-0">
              <div className="flex items-center gap-2">
                {(['Artists', 'Producers'] as const).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-4 py-1 rounded-full text-[11px] font-bold transition-all duration-300 cursor-pointer h-[28px] flex items-center justify-center ${
                      activeCategory === cat
                        ? (theme === 'dark' ? 'bg-blue-600 text-white border border-white/10' : 'bg-blue-600 text-white border border-white/10')
                        : 'text-text-secondary border border-transparent hover:text-text-primary'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="flex bg-input-background rounded-xl p-0.5 border border-card-border w-[200px] relative">
                {(['Main', 'Follow-Up', 'Comments'] as TextType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setTextType(type)}
                    className={`relative flex-1 py-1.5 rounded-lg text-[9px] font-bold transition-colors duration-300 z-10 cursor-pointer ${
                      textType === type ? (theme === 'dark' ? 'text-white' : 'text-blue-600') : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {type}
                    {textType === type && (
                      <motion.div
                        layoutId="text-type-pill"
                        className={`absolute inset-0 ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-white shadow-sm'} rounded-lg -z-10`}
                        transition={{ type: "spring", stiffness: 450, damping: 35 }}
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto hide-scroll space-y-3 pr-1">
              <AnimatePresence initial={false}>
                {currentList.map((text, i) => (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    key={i}
                    className="bg-sub-card-bg border border-sub-card-border rounded-2xl p-4 flex items-start gap-4 group transition-colors duration-300"
                  >
                    <p className="flex-1 text-[12px] text-text-secondary font-medium leading-relaxed">{text}</p>
                    <button
                      onClick={() => {
                        setCurrentTexts(prev => ({
                          ...prev,
                          [brainCategory]: {
                            ...prev[brainCategory],
                            [brainMode]: prev[brainCategory][brainMode].filter((_, idx) => idx !== i)
                          }
                        }));
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-text-secondary hover:text-red-500 cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>

                  </motion.div>
                ))}
              </AnimatePresence>

              <div className="bg-input-background border border-dashed border-card-border rounded-2xl p-4 flex flex-col gap-3">
                <textarea
                  placeholder="New message text..."
                  value={newTextValue}
                  onChange={(e) => setNewTextValue(e.target.value)}
                  className="w-full bg-transparent border-none outline-none resize-none text-[12px] text-text-primary placeholder:text-text-secondary/50 font-medium h-16 overflow-y-auto hide-scroll"
                />
                <div className="flex justify-end gap-2">
                   <button
                      onClick={() => {
                        if (!newTextValue.trim()) return;

                        setCurrentTexts(prev => ({
                          ...prev,
                          [brainCategory]: {
                            ...prev[brainCategory],
                            [brainMode]: [
                              ...prev[brainCategory][brainMode],
                              newTextValue
                            ]
                          }
                        }));

                        setNewTextValue('');
                      }}
                      className={`p-2 rounded-xl transition-colors cursor-pointer ${
                        newTextValue.trim()
                          ? 'bg-blue-600/20 text-blue-400'
                          : 'text-text-secondary/20 pointer-events-none'
                      }`}
                    >
                      <Check size={14} />
                    </button>

                </div>
              </div>
            </div>
          </div>
        )}

        {/* ACCOUNTS TAB */}
        {activeTab === 'Accounts' && !selectedAccountForConfig && (
          <div className="flex flex-col h-full animate-in fade-in duration-300">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[14px] font-bold text-text-primary uppercase tracking-wider">
                Mailing Accounts
              </h2>

              <div className="flex gap-2">
                {/* REFRESH */}
                <button
                  onClick={handleRefresh}
                  className="w-8 h-8 rounded-xl bg-sub-card-bg border border-card-border flex items-center justify-center cursor-pointer"
                >
                  <motion.div
                    animate={isRefreshing ? { rotate: 360 } : { rotate: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <RefreshCw size={14} />
                  </motion.div>
                </button>

                {/* ADD PROFILE */}
                <button
                  onClick={handleAddProfile}
                  disabled={limitReached}
                  className={`
                    w-8 h-8 rounded-xl flex items-center justify-center transition-all
                    ${
                      limitReached
                        ? 'bg-neutral-700 cursor-not-allowed opacity-40'
                        : 'bg-blue-600 hover:bg-blue-500 cursor-pointer'
                    }
                  `}
                >
                  <Plus size={16} className="text-white" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto hide-scroll">
              <div className="grid grid-cols-2 gap-3 pb-4">
              {profiles.map((profile) => {
                const isSelected = selectedAccount === profile.dir;
                const accParams = accountParams[profile.dir];
                const isLocked = lockedAccounts.includes(profile.dir);
                const isCustom =
                  accParams && !isSameParams(accParams, currentParams);
                return (
                  <div key={profile.dir} className="relative">
                    <div
                      onClick={() => !isLocked && setSelectedAccount(isSelected ? null : profile.dir)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer group relative
                        ${isLocked ? 'opacity-30 grayscale cursor-not-allowed' : ''}
                        ${
                          isSelected
                            ? (theme === 'dark'
                                ? 'bg-[#1a1a1a] border-blue-500/50'
                                : 'bg-blue-50 border-blue-200 shadow-sm')
                            : 'bg-sub-card-bg border-sub-card-border hover:border-card-border'
                        }
                      `}
                    >
                      <p className="text-[12px] font-bold mb-0.5">
                        @{profile.name}
                      </p>

                      <p
                        className={`text-[10px] font-medium ${
                          profile.status === 'logged_in'
                            ? 'text-green-500'
                            : 'text-red-500'
                        }`}
                      >
                        {profile.status === 'logged_in'
                          ? 'Session active'
                          : 'Instagram session required'}
                      </p>
                        {/* CONFIG INDICATORS */}
                        {isCustom && (
                          <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 animate-in fade-in duration-300">
                            <div className="px-1.5 py-0.5 bg-blue-600/10 border border-blue-500/20 rounded-md text-[8px] font-black text-blue-500 leading-none">
                              {accParams.filters.followers.from} - {accParams.filters.followers.to}
                            </div>

                            <div className="px-1.5 py-0.5 bg-blue-600/10 border border-blue-500/20 rounded-md text-[8px] font-black text-blue-500 leading-none">
                              {accParams.limits.messagesPerAccount} msg
                            </div>
                          </div>
                        )}
                        {isLocked && (
                          <button
                            onClick={(e) => toggleLock(e, profile.dir)}
                            className="
                              absolute top-2 right-2
                              w-7 h-7 rounded-lg
                              flex items-center justify-center

                              /* LIGHT THEME */
                              bg-white/80
                              border border-black/15
                              text-black/60
                              shadow-sm

                              hover:bg-green-500
                              hover:border-green-600
                              hover:text-white

                              /* DARK THEME */
                              dark:bg-black/40
                              dark:border-white/20
                              dark:text-white/60

                              dark:hover:bg-green-500/90
                              dark:hover:border-green-400
                              dark:hover:text-white

                              backdrop-blur-sm
                              transition-all duration-200
                            "
                          >
                            <LockOpen size={12} />
                          </button>
                        )}
                      {isSelected && !isLocked && (
                        <div className="absolute top-2 right-2 flex gap-1 animate-in slide-in-from-right-2 duration-200">
                          {/* OPEN */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              window.api.openProfile(profile.dir);
                            }}
                            className="w-7 h-7 bg-card-bg rounded-lg flex items-center justify-center text-text-secondary hover:text-text-primary border border-card-border"
                          >
                            <LogIn size={12} />
                          </button>
                          <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedAccountForConfig(profile);
                              }}
                              className="w-7 h-7 bg-card-bg rounded-lg flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors cursor-pointer border border-card-border shadow-sm"
                            >
                              <Settings size={12} />
                          </button>
                          <button
                              onClick={(e) => toggleLock(e, profile.dir)}
                              className="w-7 h-7 bg-card-bg rounded-lg flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors cursor-pointer border border-card-border shadow-sm"
                            >
                              <Lock size={12} />
                            </button>

                          {/* DELETE */}
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              await window.api.deleteProfile(profile.dir);
                              await loadProfiles();
                              setSelectedAccount(null);
                            }}
                            className="w-7 h-7 bg-red-500/10 rounded-lg flex items-center justify-center text-red-500 hover:bg-red-500/20"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            </div>
          </div>
        )}


        {/* CONFIG TAB */}
        {(activeTab === 'Config' ||
  (activeTab === 'Accounts' && selectedAccountForConfig)) && (
          <div className="flex flex-col h-full animate-in fade-in duration-300 relative">
            {/* Main Config View */}
            <div className={`flex flex-col h-full transition-all duration-300 ${showSaveDialog ? 'blur-md pointer-events-none opacity-50' : ''}`}>
              <div className="flex items-center justify-between mb-5 flex-shrink-0">
                <h2 className="text-[14px] font-bold text-text-primary uppercase tracking-wider">{selectedAccountForConfig
                                                                ? `MAILING CONFIGURATION FOR @${selectedAccountForConfig.name}`
                                                                : 'Mailing Configuration'}</h2>
                <div className="flex gap-2">
                {selectedAccountForConfig ? (
                  <button
                    onClick={() => {
                        setSelectedAccountForConfig(null);
                        setActiveTab('Accounts');
                      }}
                    className="px-4 h-8 rounded-xl bg-blue-600 text-white flex items-center gap-2 text-[10px] font-black uppercase hover:bg-blue-500 transition-all cursor-pointer shadow-lg shadow-blue-600/20"
                  >
                  <ArrowLeft size={14} />
                    Back
                  </button>
                ) : (
                    <>
                  <button
                    onClick={() => setShowSaveDialog(true)}
                    className="w-8 h-8 rounded-xl bg-sub-card-bg border border-card-border flex items-center justify-center text-text-secondary hover:text-text-primary transition-all cursor-pointer shadow-sm"
                  >
                    <Save size={14} />
                  </button>
                  <button
                    onClick={() => setShowLoadPanel(true)}
                    className="w-8 h-8 rounded-xl bg-sub-card-bg border border-card-border flex items-center justify-center text-text-secondary hover:text-text-primary transition-all cursor-pointer shadow-sm"
                  >
                    <UploadCloud size={14} />
                  </button>
                  </>
                 )}
                </div>
              </div>

              <div className="flex flex-col gap-3 flex-1">
                <div className="flex items-center gap-6">
                  <span className="text-[11px] font-bold text-text-secondary uppercase w-32">Target audience</span>
                  <div className="flex gap-6">
                     <label className="flex items-center gap-2 cursor-pointer group">
                        <input type="checkbox" className="hidden" checked={activeParams.audience.artists} onChange={() =>
                          setActiveParams(prev => ({
                            ...prev,
                            audience: {
                              ...prev.audience,
                              artists: !prev.audience.artists
                            }
                          }))
                        }
                         />
                        <div
                          className={`w-4 h-4 border border-white/10 rounded-md flex items-center justify-center transition-colors
                            ${activeParams.audience.artists ? 'bg-blue-600 border-blue-600' : 'border-card-border bg-sub-card-bg'}
                          `}
                        >
                          {activeParams.audience.artists && <Check size={10} className="text-white" />}
                        </div>

                                                <span
                          className={`text-[11px] font-bold transition-colors ${
                            activeParams.audience.artists
                              ? (theme === 'dark' ? 'text-text-secondary' : 'text-blue-600')
                              : 'text-text-secondary'
                          }`}
                        >
                          Artists
                        </span>

                                             </label>
                                             <label className="flex items-center gap-2 cursor-pointer group">
                                                <input type="checkbox" className="hidden" checked={activeParams.audience.producers} onChange={() =>
                          setActiveParams(prev => ({
                            ...prev,
                            audience: {
                              ...prev.audience,
                              producers: !prev.audience.producers
                            }
                          }))
                        } />
                                                <div
                          className={`w-4 h-4 border border-white/10 rounded-md flex items-center justify-center transition-colors
                            ${activeParams.audience.producers ? 'bg-blue-600 border-blue-600' : 'border-card-border bg-sub-card-bg'}
                          `}
                        >
                          {activeParams.audience.producers && <Check size={10} className="text-white" />}
                        </div>

                                                <span
                          className={`text-[11px] font-bold transition-colors ${
                            activeParams.audience.producers
                              ? (theme === 'dark' ? 'text-text-secondary' : 'text-blue-600')
                              : 'text-text-secondary'
                          }`}
                        >
                          Producers
                        </span>

                     </label>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <span className="text-[11px] font-bold text-text-secondary uppercase w-32">Skip if in database</span>
                  <CustomToggle
                  active={activeParams.filters.skipIfDialogExists}
                  onClick={() =>
                    setActiveParams(prev => ({
                      ...prev,
                      filters: {
                        ...prev.filters,
                        skipIfDialogExists: !prev.filters.skipIfDialogExists
                      }
                    }))
                  }
                />
                </div>

                <div className="flex items-center gap-6">
                  <span className="text-[11px] font-bold text-text-secondary uppercase w-32">Parse media</span>
                  <CustomToggle
                  active={activeParams.filters.parseStudios}
                  onClick={() =>
                    setActiveParams(prev => ({
                      ...prev,
                      filters: {
                        ...prev.filters,
                        parseStudios: !prev.filters.parseStudios
                      }
                    }))
                  }
                />
                </div>

                <div className="grid grid-cols-2 gap-5 pt-2 border-t border-white/[0.02]">
                  <div className="space-y-2">
                      <div className="flex items-center gap-1.5 ">
                        <label className="text-[10px] font-bold text-neutral-600 uppercase">
                          FOLLOWERS RANGE
                        </label>
                      </div>
                    <div className="flex gap-3">
                        <input
                          type="number"
                          min={0}
                          placeholder="From"
                          onKeyDown={(e) => {
                            if (e.key === '-' || e.key === 'e') e.preventDefault();
                          }}
                          value={activeParams.filters.followers.from === 0
                              ? ''
                              : activeParams.filters.followers.from}
                          onChange={(e) => {
                            const val = e.target.value === '' ? 0 : Math.max(0, Number(e.target.value));
                            setActiveParams(prev => ({
                              ...prev,
                              filters: {
                                ...prev.filters,
                                followers: {
                                  ...prev.filters.followers,
                                  from: val
                                }
                              }
                            }));
                          }}
                          className="no-arrows w-full bg-input-background border border-card-border rounded-xl p-2.5 text-[11px] text-text-primary outline-none focus:border-blue-500/50 transition-colors"
                        />
                        <input
                          type="number"
                          min={0}
                          placeholder="To"
                          onKeyDown={(e) => {
                            if (e.key === '-' || e.key === 'e') e.preventDefault();
                          }}
                          value={activeParams.filters.followers.to === 0
                              ? ''
                              : activeParams.filters.followers.to}
                          onChange={(e) => {
                            const val = e.target.value === '' ? 0 : Math.max(0, Number(e.target.value));
                            setActiveParams(prev => ({
                              ...prev,
                              filters: {
                                ...prev.filters,
                                followers: {
                                  ...prev.filters.followers,
                                  to: val
                                }
                              }
                            }));
                          }}
                          className="no-arrows w-full bg-input-background border border-card-border rounded-xl p-2.5 text-[11px] text-text-primary outline-none focus:border-blue-500/50 transition-colors"
                        />
                    </div>
                  </div>

                  <div className="space-y-2">
                      <div className="flex items-center gap-1.5 ">
                        <label className="text-[10px] font-bold text-neutral-600">
                          MESSAGES PER ACCOUNT
                        </label>
                        <div className="px-1 py-0.5 bg-pink-600/10 border border-pink-500/20 rounded text-[8px] font-black text-pink-500 leading-none">±5</div>
                      </div>
                    <input
                      type="number"
                      min={0}
                      placeholder="50"
                      onKeyDown={(e) => {
                        if (e.key === '-' || e.key === 'e') e.preventDefault();
                      }}
                      value={activeParams.limits.messagesPerAccount === 0
                          ? ''
                          : activeParams.limits.messagesPerAccount}
                      onChange={(e) => {
                        const val = e.target.value === '' ? 0 : Math.max(0, Number(e.target.value))
                        setActiveParams(prev => ({
                          ...prev,
                          limits: {
                            ...prev.limits,
                            messagesPerAccount: val
                          }
                        }))
                        }
                      }
                      className="no-arrows w-full bg-input-background border border-card-border rounded-xl p-2.5 text-[11px] text-text-primary outline-none focus:border-blue-500/50 transition-colors"
                    />

                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">

                      {/* MESSAGE DELAY MIN */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5">
                          <label className="text-[10px] font-bold text-neutral-600 uppercase">
                            MESSAGE DELAY – UP TO X (MIN)
                          </label>
                        </div>
                        <input
                          type="number"
                          min={0}
                          placeholder="2"
                          onKeyDown={(e) => {
                            if (e.key === '-' || e.key === 'e') e.preventDefault();
                          }}
                          value={
                            activeParams.limits.delayBetweenMessagesMin === 0
                              ? ''
                              : activeParams.limits.delayBetweenMessagesMin
                          }
                          onChange={(e) => {
                            const val = e.target.value === '' ? 0 : Math.max(0, Number(e.target.value));
                            setActiveParams(prev => ({
                              ...prev,
                              limits: {
                                ...prev.limits,
                                delayBetweenMessagesMin: val
                              }
                            }));
                          }}
                          className="no-arrows w-full bg-input-background border border-card-border rounded-xl p-2.5 text-[11px] text-text-primary outline-none focus:border-blue-500/50 transition-colors"
                        />
                      </div>

                      {/* FOLLOW UP DELAY SEC */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5">
                          <label className="text-[10px] font-bold text-neutral-600 uppercase">
                            FOLLOW-UP DELAY – UP TO X (SEC)
                          </label>
                        </div>
                        <input
                          type="number"
                          min={0}
                          placeholder="60"
                          onKeyDown={(e) => {
                            if (e.key === '-' || e.key === 'e') e.preventDefault();
                          }}
                          value={
                            activeParams.limits.followUpDelaySec === 0
                              ? ''
                              : activeParams.limits.followUpDelaySec
                          }
                          onChange={(e) => {
                            const val = e.target.value === '' ? 0 : Math.max(0, Number(e.target.value));
                            setActiveParams(prev => ({
                              ...prev,
                              limits: {
                                ...prev.limits,
                                followUpDelaySec: val
                              }
                            }));
                          }}
                          className="no-arrows w-full bg-input-background border border-card-border rounded-xl p-2.5 text-[11px] text-text-primary outline-none focus:border-blue-500/50 transition-colors"
                        />
                      </div>

                    </div>


                  <div className="space-y-3 pt-2 border-t border-white/[0.02]">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[11px] font-bold text-neutral-400 uppercase">Long pause</span>
                      <span className="text-[9px] text-neutral-700">Pause after account batch</span>
                    </div>

                    <CustomToggle
                      active={activeParams.limits.longPause.minutes > 0 || activeParams.limits.longPause.everyAccounts > 0}
                      onClick={() =>
                        setActiveParams(prev => ({
                          ...prev,
                          limits: {
                            ...prev.limits,
                            longPause: {
                              ...prev.limits.longPause,
                              minutes: prev.limits.longPause.minutes > 0 || prev.limits.longPause.everyAccounts > 0 ? 0 : 20,
                              everyAccounts: prev.limits.longPause.everyAccounts > 0 || prev.limits.longPause.minutes > 0 ? 0 : 15
                            }
                          }
                        }))
                      }
                    />
                  </div>

                  <div className="relative">
                    <div
                      className={`grid grid-cols-2 gap-4 transition-all duration-300
                        ${activeParams.limits.longPause.minutes === 0 && activeParams.limits.longPause.everyAccounts === 0 ? 'opacity-20 pointer-events-none' : ''}
                      `}
                    >
                      <div className="space-y-2">
                          <div className="flex items-center gap-1.5 ">
                            <span className="text-[10px] font-bold uppercase text-neutral-600">
                              Pause duration (min)
                            </span>
                            <div className="px-1 py-0.5 bg-pink-600/10 border border-pink-500/20 rounded text-[8px] font-black text-pink-500 leading-none">±30%</div>
                          </div>
                        <input
                          type="number"
                          min={0}
                          placeholder="20"
                          onKeyDown={(e) => {
                            if (e.key === '-' || e.key === 'e') e.preventDefault();
                          }}
                          value={activeParams.limits.longPause.minutes === 0
                              ? ''
                              : activeParams.limits.longPause.minutes}
                          onChange={(e) => {
                            const val = e.target.value === '' ? 0 : Math.max(0, Number(e.target.value))
                            setActiveParams(prev => ({
                              ...prev,
                              limits: {
                                ...prev.limits,
                                longPause: {
                                  ...prev.limits.longPause,
                                  minutes: val
                                }
                              }
                            }))
                            }
                          }
                          className="no-arrows w-full bg-input-background border border-card-border rounded-xl p-2.5 text-[11px] text-text-primary outline-none focus:border-blue-500/50 transition-colors"
                        />
                      </div>

                      <div className="space-y-2">
                          <div className="flex items-center gap-1.5 ">
                            <span className="text-[10px] font-bold uppercase text-neutral-600">
                              After every X accounts
                            </span>
                            <div className="px-1 py-0.5 bg-pink-600/10 border border-pink-500/20 rounded text-[8px] font-black text-pink-500 leading-none">±30%</div>
                          </div>
                        <input
                          type="number"
                          min={0}
                          placeholder="15"
                          onKeyDown={(e) => {
                            if (e.key === '-' || e.key === 'e') e.preventDefault();
                          }}
                          value={activeParams.limits.longPause.everyAccounts === 0
                              ? ''
                              : activeParams.limits.longPause.everyAccounts}
                          onChange={(e) => {
                            const val = e.target.value === '' ? 0 : Math.max(0, Number(e.target.value))
                            setActiveParams(prev => ({
                              ...prev,
                              limits: {
                                ...prev.limits,
                                longPause: {
                                  ...prev.limits.longPause,
                                  everyAccounts: val
                                }
                              }
                            }))
                            }
                          }
                          className="no-arrows w-full bg-input-background border border-card-border rounded-xl p-2.5 text-[11px] text-text-primary outline-none focus:border-blue-500/50 transition-colors"
                        />
                      </div>
                    </div>
                    {activeParams.limits.longPause.minutes === 0 && activeParams.limits.longPause.everyAccounts === 0 && (
                       <p className="text-[9px] text-red-500/80 font-bold uppercase italic mt-1.5 tracking-wider absolute -bottom-4">Long pause disabled. Limits not applied.</p>
                    )}
                  </div>
                </div>

                </div>
              </div>
            {/* Save Overlay Centered */}
            <AnimatePresence>
              {showSaveDialog && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute inset-0 z-30 flex items-center justify-center p-6"
                >
                  <div className="bg-[#1a1a1a] border border-white/10 rounded-[24px] p-6 w-[280px] shadow-2xl">
                    <h4 className="text-[12px] font-bold text-white mb-4 uppercase tracking-widest text-center">Config Name</h4>
                    <input
                      autoFocus
                      value={configName}
                      onChange={(e) => setConfigName(e.target.value)}
                      className="w-full bg-[#090909] border border-white/5 rounded-xl p-3 text-[12px] text-white outline-none mb-6 text-center"
                    />
                    <div className="flex gap-3">
                       <button
                         onClick={() => setShowSaveDialog(false)}
                         disabled={isSavingConfig}
                         className={`flex-1 h-9 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${isSavingConfig ? 'opacity-20 pointer-events-none' : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'}`}
                       >
                         <X size={16} />
                       </button>
                       <button
                         onClick={async () => {
                            if (!configName.trim()) return;

                            setIsSavingConfig(true);       // ВКЛЮЧИЛИ АНИМАЦИЮ
                            await handleSaveConfig();      // сохранили
                            setTimeout(() => {
                              setIsSavingConfig(false);    // ВЫКЛЮЧИЛИ
                            }, 800); }}
                         disabled={isSavingConfig}
                         className={`flex-1 h-9 rounded-xl flex items-center justify-center text-white transition-all duration-300 cursor-pointer ${
                           isSavingConfig
                             ? 'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.4)]'
                             : 'bg-blue-600 hover:bg-blue-500'
                         }`}
                       >
                         <AnimatePresence mode="wait">
                           {isSavingConfig ? (
                             <motion.div
                               key="check"
                               initial={{ scale: 0, rotate: -45 }}
                               animate={{ scale: 1, rotate: 0 }}
                               exit={{ scale: 0 }}
                             >
                               <Check size={16} />
                             </motion.div>
                           ) : (
                             <motion.div
                               key="save"
                               initial={{ scale: 0 }}
                               animate={{ scale: 1 }}
                               exit={{ scale: 0 }}
                             >
                               <Save size={16} />
                             </motion.div>
                           )}
                         </AnimatePresence>
                       </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Load Panel Full Area */}
            <AnimatePresence>
              {showLoadPanel && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute -inset-3 bg-card-bg border border-card-border z-40 flex flex-col p-6 rounded-[28px] shadow-2xl"
                >
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-[14px] font-bold text-text-primary uppercase tracking-wider">Load Config</h3>
                    <button onClick={() => setShowLoadPanel(false)} className="w-8 h-8 rounded-xl bg-sub-card-bg border border-card-border flex items-center justify-center text-text-secondary hover:text-text-primary cursor-pointer">
                      <X size={18} />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto hide-scroll">
                  <div className="flex flex-col gap-3 pr-1 h-full">
                    {savedConfigs.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center opacity-20 text-text-secondary">
                        <UploadCloud size={48} className="mb-2" />
                        <p className="text-[11px] font-bold uppercase tracking-widest">No saved configs</p>
                      </div>
                    ) : (
                      savedConfigs.map(cfg => (
                        <div key={cfg.id} onClick={() => handleLoadConfig(cfg.id)} className="bg-sub-card-bg border border-sub-card-border rounded-xl p-3 flex justify-between items-center hover:border-card-border cursor-pointer group transition-all duration-200">
                           <div>
                             <p className="text-[11px] font-bold text-text-primary uppercase">{cfg.name}</p>
                             <p className="text-[9px] text-text-secondary">{cfg.date}</p>
                           </div>
                           <button onClick={(e) => { e.stopPropagation(); handleDeleteConfig(cfg.id); }} className="text-text-secondary hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer">
                             <Trash2 size={14} />
                           </button>
                        </div>
                      ))
                    )}
                  </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
        {/* USERNAMES TAB */}
        {activeTab === 'Usernames' && (
          <div className="flex flex-col h-full animate-in fade-in duration-300" onDrop={handleFileDrop}
  onDragOver={handleDragOver}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[14px] font-bold text-text-primary uppercase tracking-wider">
                Usernames
              </h2>

              <button
                  onClick={handleUsernameSave}
                  className={`
                    p-2 rounded-xl border transition-all duration-300 cursor-pointer
                    ${
                      isSaving
                        ? 'bg-green-500/10 border-green-500/50 text-green-500'
                        : isDirty
                        ? 'bg-sub-card-bg border-card-border text-green-500 hover:border-green-500/40'
                        : 'bg-sub-card-bg border-card-border text-text-secondary'
                    }
                  `}
                >
                  <Check
                    size={14}
                    className={`transition-transform duration-300 ${
                      isSaving ? 'scale-100' : 'scale-100'
                    }`}
                  />
              </button>
            </div>

            <textarea
              ref={textareaRef}
              value={draftUsernames}
              onChange={(e) => {
                  setDraftUsernames(e.target.value);
                  setIsDirty(true);
              }}
              placeholder="Paste usernames here or drop .txt file..."
              className="flex-1 w-full bg-input-background border border-card-border rounded-2xl p-5 outline-none resize-none text-[12px] text-text-primary placeholder:text-text-secondary/30 font-mono hide-scroll "
            />


          </div>
        )}

      <style dangerouslySetInnerHTML={{ __html: `
        .no-arrows::-webkit-inner-spin-button,
        .no-arrows::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .no-arrows {
          -moz-appearance: textfield;
        }
      `}} />
      </div>
      </div>
  );
};
