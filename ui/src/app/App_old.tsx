import { useState, useEffect, useRef } from 'react';

type MenuItem = 'log' | 'params' | 'database';
type TabView = 'mail' | 'params' | 'log' | 'accounts' | 'texts' | 'usernames';
type DatabaseView = 'artists' | 'producers' | 'media';
type TextMode = 'main' | 'followup';
type LogItem = {
  time: string;
  text: string;
  color?: 'gray' | 'green' | 'red' | 'yellow' | 'purple';
  extra?: string;
  extraColor?: 'orange' | 'red';
};

type MailingState = {
  profile: string | null;
  status: string;
  processed: number;
  limit: number;
  totalProcessed: number,
  totalLimit: number,
};

type CurrentParams = {
  audience: { artists: boolean; producers: boolean };
  filters: {
    parseStudios: boolean;
    skipIfDialogExists: boolean;
    followers: {
      enabled: boolean;
      from: number;
      to: number;
    };
  };
  limits: {
    messagesPerAccount: number;
    delayBetweenMessagesMin: number;
    followUpDelaySec: number;
    longPause: {
      minutes: number;
      everyAccounts: number;
    };
  };
};

type TextsType = {
  artists: { main: string[]; followup: string[]; comments: string[] };
  producers: { main: string[]; followup: string[]; comments: string[] };
};



type SavedConfig = {
  id: string;
  name: string;
  date: string;
  params: CurrentParams;
  texts: TextsType;
};


const SERVER_URL = "http://147.45.141.101:8000/api";
const POLL_INTERVAL = 60_000; // 1 минута

function useSubscription() {
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [daysLeft, setDaysLeft] = useState<number>(0);
  const [plan, setPlan] = useState<'LITE' | 'STANDARD' | 'ULTIMATE'>('LITE');

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const checkSubscription = async (uid: string) => {
    try {
      const res = await fetch(
        `http://147.45.141.101:8000/api/me?user_id=${uid}`
      );
      const data = await res.json();

      if (!data.active || !data.expires_at) {
        setActive(false);
        setDaysLeft(0);
        return;
      }

      const expires = new Date(data.expires_at);
      const now = new Date();

      const diffMs = expires.getTime() - now.getTime();
      const diffDays = Math.max(
        0,
        Math.ceil(diffMs / (1000 * 60 * 60 * 24))
      );

      setDaysLeft(diffDays);
      setActive(diffDays > 0);
      setPlan(data.plan ?? 'LITE');
    } catch {
      // если сервер временно недоступен — НЕ выкидываем
    }
  };

  useEffect(() => {
    const init = async () => {
      let uid = localStorage.getItem("user_id");

      // 🔥 если user_id нет — пробуем восстановить
      if (!uid) {
        try {
          const deviceId = await window.api.getDeviceId();

            const res = await fetch(
              `http://147.45.141.101:8000/api/restore-by-device?device_id=${deviceId}`
            );

          const data = await res.json();

          if (data.found) {
            uid = data.user_id.toString();
            localStorage.setItem("user_id", uid);
          }
        } catch {
          // просто не логиним
        }
      }

      if (!uid) {
        setLoading(false);
        return;
      }

      setUserId(uid);

      await checkSubscription(uid);
      setLoading(false);

      // 🔥 периодический опрос
      timerRef.current = setInterval(() => {
        checkSubscription(uid!);
      }, POLL_INTERVAL);
    };

    init();

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  return { loading, active, userId, daysLeft, plan };
}

export function useAppLogic() {
    const [isStopConfirmOpen, setIsStopConfirmOpen] = useState(false);
    const [contacts, setContacts] = useState<Contact[]>([]);
  const [activeMenuItem, setActiveMenuItem] = useState<MenuItem>('log');
  const [activeView, setActiveView] = useState<TabView>('mail' as TabView);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [campaignRequested, setCampaignRequested] = useState(false);
  const campaignRequestedRef = useRef(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [showProfile, setShowProfile] = useState(false);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const { loading, active, userId, daysLeft, plan } = useSubscription();
    const PLAN_LIMITS: Record<string, number> = {
      LITE: 1,
      STANDARD: 3,
      ULTIMATE: Infinity,
    };
const [accountParams, setAccountParams] = useState<
  Record<string, CurrentParams>
>({});

    const profileLimit = PLAN_LIMITS[plan] ?? 1;


  const [savedConfigs, setSavedConfigs] = useState<SavedConfig[]>(() => {
    const raw = localStorage.getItem('mailing_configs');
    return raw ? JSON.parse(raw) : [];
  });

  const [saveConfigState, setSaveConfigState] = useState<'idle' | 'input' | 'confirming'>('idle');
  const [configName, setConfigName] = useState('');
  const [loadConfigOpen, setLoadConfigOpen] = useState(false);
const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadPanel, setShowLoadPanel] = useState(false);
  // База данных
  const [databaseView, setDatabaseView] = useState<DatabaseView>('artists');
  const [textView, setTextView] = useState<'artists' | 'producers'>('artists');
  const [textMode, setTextMode] = useState<TextMode>('main');

  const [usernames, setUsernames] = useState("");
  const [profiles, setProfiles] = useState<any[]>([]);
  const canAddProfile =
  profileLimit === Infinity || profiles.length < profileLimit;

  const profilesIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadProfiles = async () => {
  if (!userId) return;
  const list = await window.api.getChromiumProfiles(userId);
  setProfiles(list);
};

const addLog = (log: Omit<LogItem, 'time'>) => {
  const time = new Date().toLocaleTimeString('ru-RU', { hour12: false });

  setLogs(prev => [
    ...prev,
    { time, ...log }
  ]);
};


const [currentParams, setCurrentParams] = useState<CurrentParams>(() => {
  const raw = localStorage.getItem('current_params');
  return raw
    ? JSON.parse(raw)
    : {
        audience: {
          artists: true,
          producers: true,
        },
        filters: {
          parseStudios: false,
          skipIfDialogExists: true,
          followers: {
            enabled: true,
            from: 100,
            to: 10000,
          },
        },
        limits: {
          messagesPerAccount: 20,
          delayBetweenMessagesMin: 5,
          followUpDelaySec: 60,
          longPause: {
            minutes: 20,
            everyAccounts: 15,
          },
        },
      };
});

const [mailingState, setMailingState] = useState({
  profile: null,
  status: "idle",
  processed: 0,
  limit: currentParams.limits.messagesPerAccount,
  totalProcessed: 0,
  totalLimit: 0,

  scanned: 0,
  artists: 0,
  producers: 0,
  media: 0,
  undefined: 0,
});



const [currentTexts, setCurrentTexts] = useState<TextsType>(() => {
  const raw = localStorage.getItem('mailing_texts');

  const empty = {
    artists: { main: [], followup: [], comments: [] },
    producers: { main: [], followup: [], comments: [] },
  };

  if (!raw) return empty;

  try {
    const parsed = JSON.parse(raw);

    return {
      artists: {
        main: parsed?.artists?.main ?? [],
        followup: parsed?.artists?.followup ?? [],
        comments: parsed?.artists?.comments ?? [],
      },
      producers: {
        main: parsed?.producers?.main ?? [],
        followup: parsed?.producers?.followup ?? [],
        comments: parsed?.producers?.comments ?? [],
      },
    };
  } catch {
    return empty;
  }
});


const paramsRef = useRef(currentParams);
const textsRef = useRef(currentTexts);
useEffect(() => {
  paramsRef.current = currentParams;
}, [currentParams]);

useEffect(() => {
  textsRef.current = currentTexts;
}, [currentTexts]);

useEffect(() => {
  if (!window.api?.onMailingState) return;

  const off = window.api.onMailingState((state) => {
    setMailingState(state);
  });

  return () => off?.();
}, []);

const handleSaveConfig = () => {
  if (!configName.trim()) return;

  const newConfig = {
    id: crypto.randomUUID(),
    name: configName.trim(),
    date: new Date().toLocaleString(),
    params: structuredClone(currentParams),
    texts: structuredClone(currentTexts),
  };

  setSavedConfigs(prev => [...prev, newConfig]);

  setTimeout(() => {
      setConfigName('');
      setShowSaveDialog(false);
    }, 1700);
};

const [lockedAccounts, setLockedAccounts] = useState<string[]>(() => {
  const raw = localStorage.getItem('locked_accounts');
  return raw ? JSON.parse(raw) : [];
});
useEffect(() => {
  localStorage.setItem(
    'locked_accounts',
    JSON.stringify(lockedAccounts)
  );
}, [lockedAccounts]);
const handleLoadConfig = (id: string) => {
  const config = savedConfigs.find(c => c.id === id);
  if (!config) return;

  setCurrentParams(structuredClone(config.params));
  setCurrentTexts(structuredClone(config.texts));
  setShowLoadPanel(false);
};


const handleDeleteConfig = (id: string) => {
  setSavedConfigs(prev => prev.filter(c => c.id !== id));
};


useEffect(() => {
  localStorage.setItem(
    'current_params',
    JSON.stringify(currentParams)
  );
}, [currentParams]);

useEffect(() => {
  localStorage.setItem(
    'mailing_configs',
    JSON.stringify(savedConfigs)
  );
}, [savedConfigs]);

useEffect(() => {
  if (!window.api?.onLog) return;

  const off = window.api.onLog((log: LogItem) => {
    setLogs(prev => [...prev, log]);
  });

  return () => {
    off?.(); // ← КЛЮЧЕВО
  };
}, []);

useEffect(() => {
  setMailingState(prev => ({
    ...prev,
    limit: currentParams.limits.messagesPerAccount
  }));
}, [currentParams.limits.messagesPerAccount]);


useEffect(() => {
  localStorage.setItem(
    'mailing_texts',
    JSON.stringify(currentTexts)
  );
}, [currentTexts]);


  useEffect(() => {
     if (activeView === "accounts") {
      loadProfiles();
    }
  }, [activeView]);


useEffect(() => {
  loadProfiles();
}, []);
useEffect(() => {
  if (!userId) return;
  loadProfiles();
}, [userId]);


const handleFollowUp = async () => {
  if (!isRunning) {
    addLog({
      text: "Нельзя запустить Follow-up — рассылка не активна",
      color: "yellow",
    });
    return;
  }

  addLog({
    text: "Запуск Follow-up",
    color: "purple",
  });

  const effectiveParams =
  selectedAccount && accountParams[selectedAccount]
    ? accountParams[selectedAccount]
    : currentParams;

await window.api.startFollowUp({
  texts: currentTexts,
  params:
    typeof structuredClone === 'function'
      ? structuredClone(effectiveParams)
      : JSON.parse(JSON.stringify(effectiveParams)),
});
};
    useEffect(() => {
      if (!window.api?.onUsernamesUpdated) return;

      const off = window.api.onUsernamesUpdated(() => {
        loadUsernames();
      });

      return () => off?.();
    }, []);

  const handleStartStop = async () => {
      if (isRunning) {
        // НЕ останавливаем, только открываем подтверждение
        setIsStopConfirmOpen(true);
        return;
      }

      // ----------- START ЛОГИКА -----------
      setCampaignRequested(true);
      campaignRequestedRef.current = true;
      setIsRunning(true);

      addLog({
        text: "Запрос на запуск рассылки",
        color: "gray",
      });

  // 1️⃣ список доступных (НЕ залоченных) аккаунтов
const availableProfiles = profiles
  .map(p => p.dir)
  .filter(dir => !lockedAccounts.includes(dir));

if (!availableProfiles.length) {
  addLog({
    text: "Нет доступных аккаунтов (все заблокированы)",
    color: "red",
  });
  setIsRunning(false);
  setCampaignRequested(false);
  return;
}

// 2️⃣ определяем аккаунт для запуска
let profileToOpen = selectedAccount;

// если выбранный залочен — сбрасываем
if (profileToOpen && lockedAccounts.includes(profileToOpen)) {
  addLog({
    text: `Аккаунт ${getProfileName(profileToOpen)} заблокирован и пропущен`,
    color: "yellow",
  });
  profileToOpen = null;
  setSelectedAccount(null);
}

// если не выбран — берём первый доступный
if (!profileToOpen) {
  profileToOpen = availableProfiles[0];
  setSelectedAccount(profileToOpen);

  addLog({
    text: `Профиль не выбран — используется ${getProfileName(profileToOpen)}`,
    color: "yellow",
  });
} else {
  addLog({
    text: `Выбран профиль: ${getProfileName(profileToOpen)}`,
    color: "purple",
  });
}

  let usernamesList: string[] | null = null;

try {
  usernamesList = await fetchUsernamesFromDB();
} catch {
  usernamesList = null;
}

  if (usernamesList === null) {
    // только если реально ошибка запроса
    usernamesList = usernames
      .split("\n")
      .map(u => u.trim())
      .filter(Boolean);
  }


  if (!usernamesList.length) {
    addLog({
      text: "Список юзернеймов пуст",
      color: "red",
    });
    setIsRunning(false);
    setCampaignRequested(false);
    return;
  }
  addLog({
  text: `Юзернеймов к обработке: ${usernamesList.length}`,
  color: "gray",
});

  const globalParams = structuredClone(paramsRef.current);

  const textsSnapshot = JSON.parse(JSON.stringify(textsRef.current));
  await window.api.startMailing({
    profileDir: profileToOpen,
    usernames: usernamesList,
    params: globalParams,
    accountParams,
    texts: textsSnapshot,
    lockedAccounts,
    userId: Number(localStorage.getItem("user_id")),
  });
};
const getProfileName = (dir: string | null) => {
  if (!dir) return "—";
  const profile = profiles.find(p => p.dir === dir);
  return profile?.name || dir;
};
const fetchUsernamesFromDB = async (): Promise<string[]> => {
  const userId = localStorage.getItem("user_id");
  if (!userId) return [];

  try {
    const res = await fetch(`${SERVER_URL}/usernames?user_id=${userId}`);
    const data = await res.json();
    return data.usernames ?? [];
  } catch {
    return [];
  }
};

const confirmStopCampaign = async () => {
  setIsStopConfirmOpen(false);

  setIsRunning(false);
  setCampaignRequested(false);
  campaignRequestedRef.current = false;

  addLog({
    text: "Остановка рассылки подтверждена пользователем",
    color: "yellow",
  });

  await window.api?.stopBrowser();
};

const cancelStopCampaign = () => {
  setIsStopConfirmOpen(false);

  addLog({
    text: "Остановка отменена",
    color: "gray",
  });
};

  const handleSave = async (text?: string) => {
  const userId = localStorage.getItem("user_id");
  if (!userId) return;
  try {
    const source = text ?? usernames;

      const list = (source ?? "")
      .split("\n")
      .map(u => u.trim())
      .filter(Boolean);

    console.log("SAVE CLICKED");
    console.log("USERNAMES:", list);

    if (!list.length) {
        console.warn("EMPTY LIST — CLEAR DB");
    }


    const res = await fetch(`${SERVER_URL}/usernames`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: userId,
        usernames: list,
      }),
    });


    console.log("RESPONSE STATUS:", res.status);

    const data = await res.json();
    console.log("RESPONSE DATA:", data);

  } catch (err) {
    console.error("SAVE ERROR:", err);
  }
};

function isSameParams(a: CurrentParams, b: CurrentParams): boolean {
  return (
    a.audience.artists === b.audience.artists &&
    a.audience.producers === b.audience.producers &&

    a.filters.parseStudios === b.filters.parseStudios &&
    a.filters.skipIfDialogExists === b.filters.skipIfDialogExists &&

    a.filters.followers.enabled === b.filters.followers.enabled &&
    a.filters.followers.from === b.filters.followers.from &&
    a.filters.followers.to === b.filters.followers.to &&

    a.limits.messagesPerAccount === b.limits.messagesPerAccount &&
    a.limits.delayBetweenMessagesMin === b.limits.delayBetweenMessagesMin &&
    a.limits.followUpDelaySec === b.limits.followUpDelaySec &&

    a.limits.longPause.minutes === b.limits.longPause.minutes &&
    a.limits.longPause.everyAccounts === b.limits.longPause.everyAccounts
  );
}
const handleAddProfile = async () => {
    if (!canAddProfile) {
    addLog({
      text: "Достигнут лимит профилей для текущего тарифа",
      color: "yellow",
    });
    return;
  }
  await window.api.openProfileManager();

  if (profilesIntervalRef.current) return;

  profilesIntervalRef.current = setInterval(async () => {
    const list = await window.api.getChromiumProfiles(userId);
    setProfiles(list);
  }, 1000);
};


useEffect(() => {
  if (!window.api?.onChromiumClosed) return;

  const off = window.api.onChromiumClosed(() => {
    if (profilesIntervalRef.current) {
      clearInterval(profilesIntervalRef.current);
      profilesIntervalRef.current = null;
    }
  });

  return () => off?.();
}, []);

useEffect(() => {
  localStorage.setItem(
    'account_params',
    JSON.stringify(accountParams)
  );
}, [accountParams]);
useEffect(() => {
  const raw = localStorage.getItem('account_params');
  if (raw) {
    setAccountParams(JSON.parse(raw));
  }
}, []);
  useEffect(() => {
  if (!window.api) return;

  const offStarted = window.api.onBrowserStarted(() => {
    if (campaignRequestedRef.current) {
      setIsRunning(true);
    }
  });

  const offStopped = window.api.onBrowserStopped(() => {
    if (campaignRequestedRef.current) return;

    setIsRunning(false);
    setCampaignRequested(false);
    campaignRequestedRef.current = false;
  });

  return () => {
    offStarted?.();
    offStopped?.();
  };
}, []);




const loadUsernames = async () => {
    const userId = localStorage.getItem("user_id");
  if (!userId) return;
  try {
    const res = await fetch(`${SERVER_URL}/usernames?user_id=${userId}`);
    const data = await res.json();

    setUsernames((data.usernames ?? []).join("\n"));
  } catch (e) {
    console.error("LOAD USERNAMES ERROR", e);
  }
};

  useEffect(() => {
  if (activeView === "usernames") {
    loadUsernames();
  }
}, [activeView]);

useEffect(() => {
  loadUsernames();
}, []);





  const cancelSaveConfig = () => {
    setSaveConfigState('idle');
    setConfigName('');
  };



useEffect(() => {
  const raw = localStorage.getItem('mailing_configs');
  if (raw) setSavedConfigs(JSON.parse(raw));
}, []);

      return {
      // лицензия
      loading,
      active,
      userId,
      daysLeft,

      // меню
      activeMenuItem,
      setActiveMenuItem,
      activeView,
      setActiveView,

      // аккаунты
      selectedAccount,
      setSelectedAccount,
      profiles,
      loadProfiles,
      handleAddProfile,
      plan,
      profileLimit,
      canAddProfile,
      lockedAccounts,
      setLockedAccounts,


      // состояние рассылки
      isRunning,
      setIsRunning,
      mailingState,
      handleStartStop,
      handleFollowUp,
      isStopConfirmOpen,
      confirmStopCampaign,
      cancelStopCampaign,

      // тексты
      currentTexts,
      setCurrentTexts,

      // параметры
      currentParams,
      setCurrentParams,
      accountParams,
      setAccountParams,
      isSameParams,

      // юзернеймы
      usernames,
      setUsernames,
      loadUsernames,
      handleSave,
      getProfileName,

      // логи
      logs,
      addLog,

      // конфиги
      savedConfigs,
      setSavedConfigs,
      handleSaveConfig,
      handleLoadConfig,
      cancelSaveConfig,
      handleDeleteConfig,
      saveConfigState,
      configName,
      setConfigName,
      loadConfigOpen,
      setLoadConfigOpen,
      showSaveDialog,
      setShowSaveDialog,
      showLoadPanel,
      setShowLoadPanel,

      // база
      databaseView,
      setDatabaseView,
      textView,
      setTextView,
      textMode,
      setTextMode,
      contacts,
      setContacts,


      // UI состояния (даже если UI их читает)
      isDarkMode,
      setIsDarkMode,
      showProfile,
      setShowProfile,
    };
}


