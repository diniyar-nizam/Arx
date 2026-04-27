const { app, BrowserWindow, ipcMain, screen, shell } = require("electron");
const fs = require("fs");
const path = require("path");
const isDev = !app.isPackaged;
app.commandLine.appendSwitch('no-proxy-server')
const mailingState = {
  profile: null,
  status: "idle",

  processed: 0,
  limit: 0,

  authorizedAccountsTotal: 0,
  authorizedAccountIndex: 0,

  totalProcessed: 0,
  totalLimit: 0,

  scanned: 0,
  artists: 0,
  producers: 0,
  media: 0,
  undefined: 0,
};


const playwrightBrowsersPath = app.isPackaged
  ? path.join(process.resourcesPath, "playwright-browsers")
  : path.join(process.cwd(), "playwright-core");

process.env.PLAYWRIGHT_BROWSERS_PATH = playwrightBrowsersPath;

let chromium;
const CHROME_DATA_DIR = path.join(app.getPath("userData"), "chromium-user-data");
const sqlite3 = require("sqlite3").verbose();
const { scoreProfile } = require("./scoring");
const API_URL = "https://arx.prodautomate.com/api";
const { autoUpdater } = require("electron-updater");

autoUpdater.autoDownload = false;

let browser = null;
let mainWindow = null;
let closingByApp = false;
let context = null;
let page = null;
let mode = "idle";
let CURRENT_USER_ID = null;
let CURRENT_PLAN = "LITE";
let PROFILE_LIMIT = 1;
let messageSent = false;
let viewedAccountsCount = 0;
let currentProfileIndex = 0;
let messagesSentByProfile = 0;
let scannedWithoutMessages = 0;
let MAILING_PROFILES = [];
let FOLLOW_UP_QUEUE = [];
let CURRENT_PROFILE_DIR = null;
let mailingActive = false;
let PROFILE_LIMITS = {};
let nextMessageTime = 0;
let LONG_PAUSE_NEXT_AT = 0;
let GLOBAL_PARAMS = null;
let ACCOUNT_PARAMS = {};
const { machineIdSync } = require("node-machine-id");
const DEVICE_ID = machineIdSync();
const axios = require("axios");

ipcMain.handle("get-device-id", () => {
    return DEVICE_ID;
})
function formatMinSec(totalSeconds) {
  const min = Math.floor(totalSeconds / 60);
  const sec = totalSeconds % 60;

  if (min === 0) return `${sec} сек`;
  if (sec === 0) return `${min} мин`;

  return `${min} мин ${sec} сек`;
}

function humanDelayFromMinutes(maxMinutes) {
  if (!maxMinutes || maxMinutes <= 0) return 0;

  // weighted минуты
  const minutes = weightedDelay(maxMinutes);

  // случайные секунды 0–59
  const seconds = Math.floor(Math.random() * 60);

  return minutes * 60 + seconds; // в секундах
}


function randomizePercent(base, percent) {
  const delta = base * (percent / 100);
  const min = base - delta;
  const max = base + delta;
  return Math.max(0, Math.round(min + Math.random() * (max - min)));
}

function randomizePercentForMin(base, percent) {
  const delta = base * (percent / 100);
  const min = base - delta;
  const max = base + delta;
  return Math.max(0, Math.round(min + Math.random() * (max - min)));
}

function sendStatus(type, data) {
  mainWindow?.webContents.send("update-status", { type, data });
}

autoUpdater.on("update-available", (info) => {
  sendStatus("available", info.version);
});

autoUpdater.on("update-not-available", () => {
  sendStatus("none");
});

autoUpdater.on("download-progress", (p) => {
  sendStatus("progress", p.percent);
});

autoUpdater.on("update-downloaded", () => {
  sendStatus("downloaded");
});

ipcMain.handle("install-update", () => {
sendLog("install clicked", { color: "red" });
  autoUpdater.quitAndInstall();
});
ipcMain.handle("download-update", async () => {
  return autoUpdater.downloadUpdate();
});
ipcMain.handle("open-mac-update", (_, version) => {
  const url = `https://arx.prodautomate.com/arx/mac/Arx-${version}-arm64.dmg`;
  shell.openExternal(url);
});
function weightedDelay(max) {
  if (!max || max <= 0) return 0;

  // сумма весов: n + (n-1) + ... + 1
  const totalWeight = (max * (max + 1)) / 2;

  // случайное число от 1 до totalWeight
  let rnd = Math.floor(Math.random() * totalWeight) + 1;

  // идём по "колесу"
  for (let value = 1; value <= max; value++) {
    const weight = max - value + 1;

    if (rnd <= weight) {
      return value;
    }

    rnd -= weight;
  }

  return max; // fallback
}

function randomDelayMinutes(maxMinutes) {
  return weightedDelay(maxMinutes);
}

function randomDelaySeconds(maxSec) {
  return weightedDelay(maxSec);
}

function randomMessagesPerAccount(userValue) {
  const base = Number(userValue) || 0;

  const min = Math.max(1, base - 5);
  const max = Math.min(50, base + 5);

  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function createWindow() {
//  const display = screen.getPrimaryDisplay();
//  const { width, height } = display.workAreaSize;
//  const scale = display.scaleFactor;
//
//  const winWidth = Math.round(width * 0.4);
//  const winHeight = Math.round(height * 0.5);
  app.commandLine.appendSwitch("high-dpi-support", "1");
  app.commandLine.appendSwitch("force-device-scale-factor", "1");
  mainWindow = new BrowserWindow({
    width: 1100,  //winWidth,
    height: 700,  //winHeight,
    backgroundColor: "#0f1013",
    icon: process.platform === "darwin"
  ? path.join(__dirname, "assets/icon.icns")
  : path.join(__dirname, "assets/icon.ico"),
    title: "Arx",
//    resizable: false,
//    fullscreenable: false,
//    maximizable: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
//      devTools: false,
    },
  });

//  mainWindow.setAspectRatio(15 / 10);
//  mainWindow.setMenu(null);
  const isDev = !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
  } else {
    mainWindow.loadFile(
      path.join(process.resourcesPath, "ui", "dist", "index.html")
    );
  }
}

function sendMailingState() {
  mainWindow?.webContents.send("mailing-state", mailingState);
}

function sendLog(text, options = {}) {
  const time = new Date().toLocaleTimeString("ru-RU", { hour12: false });

  mainWindow?.webContents.send("log", {
    time,
    text,
    ...options,
  });
}
function groupFollowUpsByProfile(queue) {
  const grouped = {};

  if (!Array.isArray(queue)) return grouped;

  for (const item of queue) {
    if (!item || !item.profileDir) continue;

    if (!grouped[item.profileDir]) {
      grouped[item.profileDir] = [];
    }

    grouped[item.profileDir].push(item);
  }

  return grouped;
}
function getParamsForProfile(profileDir, globalParams, accountParams) {
  const profileOverrides = accountParams?.[profileDir];
  return deepMerge(globalParams, profileOverrides);
}

ipcMain.handle("start-mailing", async (_, payload) => {
  const { profileDir, usernames, params: globalParams, accountParams = {}, texts, lockedAccounts = [], userId } = payload;
  if (!userId) {
    sendLog("❌ user_id не передан из UI", { color: "red" });
    return;
  }
  GLOBAL_PARAMS = structuredClone(globalParams);
  ACCOUNT_PARAMS = structuredClone(accountParams);
  await fetchUserPlan(userId);
  mailingState.scanned = 0;
  scannedWithoutMessages = 0;
mailingState.processed = 0;
mailingState.totalProcessed = 0;
mailingState.artists = 0;
mailingState.producers = 0;
mailingState.media = 0;
FOLLOW_UP_QUEUE = [];
mailingState.undefined = 0;
console.log("PARAMS RECEIVED", {
  global: GLOBAL_PARAMS,
  accounts: ACCOUNT_PARAMS
});
currentProfileIndex = 0;
mailingState.authorizedAccountIndex = 0;
sendMailingState();
  messagesSentByProfile = 0;
  viewedAccountsCount = 0;
  const baseEvery = GLOBAL_PARAMS.limits?.longPause?.everyAccounts || 0;
LONG_PAUSE_NEXT_AT = randomizePercent(baseEvery, 30);
 const profiles = readChromiumProfiles();

MAILING_PROFILES = [];
for (const p of profiles) {
  if (lockedAccounts.includes(p.dir)) {
    sendLog(`🔒 Аккаунт ${p.dir} залочен — пропуск`, { color: "yellow" });
    continue;
  }

  const loggedIn = await isInstagramLoggedIn(p.dir);
  if (loggedIn) {
    MAILING_PROFILES.push({
      ...p,
      status: "logged_in",
    });
  }
}
// если UI указал конкретный профиль — ставим его первым
if (profileDir) {
  MAILING_PROFILES.sort((a, b) => {
    if (a.dir === profileDir) return -1;
    if (b.dir === profileDir) return 1;
    return 0;
  });
}
if (!MAILING_PROFILES.length) {
    sendLog("❌ Нет Chromium профилей", { color: "red" });
    return;
  }
  const loggedProfiles = MAILING_PROFILES.filter(
  p => p.status === "logged_in"
);

if (!loggedProfiles.length) {
  sendLog("❌ Сначала войдите хотя бы в один аккаунт", { color: "red" });
  return;
}

  MAILING_PROFILES = loggedProfiles;
  mailingState.authorizedAccountsTotal = Math.min(
      MAILING_PROFILES.length,
      PROFILE_LIMIT === Infinity ? MAILING_PROFILES.length : PROFILE_LIMIT
    );

mailingState.authorizedAccountIndex = 0;
sendMailingState();

currentProfileIndex = 0;
PROFILE_LIMITS = {};

for (const p of MAILING_PROFILES) {
  const pParams = getParamsForProfile(
    p.dir,
    GLOBAL_PARAMS,
    ACCOUNT_PARAMS
  );

  PROFILE_LIMITS[p.dir] = randomMessagesPerAccount(
    pParams.limits.messagesPerAccount
  );
}

  CURRENT_USER_ID = userId;
  mailingState.status = "starting";
  mainWindow?.webContents.send("mailing-state", mailingState);
  mailingState.processed = 0;
  mailingState.totalProcessed = 0;
  mainWindow?.webContents.send("mailing-state", mailingState);


  sendLog(`Запуск рассылки`, { color: "green" });
  const profileName = getProfileDisplayName(profileDir);
  sendLog(`Профиль: ${profileName}`, { color: "purple" });
  mailingState.profile = profileName;
  mainWindow?.webContents.send("mailing-state", mailingState);
  sendLog(`Юзернеймов: ${usernames.length}`, { color: "gray" });


  mailingActive = true;
  mode = "mailing"
  await openProfileContext(profileDir);
  for (const username of usernames) {
    if (!mailingActive) break;
    await processUsername(username, texts);
  }
  mailingActive = false

  mainWindow?.webContents.send("mailing-state", mailingState);
});
function getProfileDisplayName(profileDir) {
  const profiles = readChromiumProfiles();
  const profile = profiles.find(p => p.dir === profileDir);
  return profile?.name || profileDir;
}
ipcMain.handle("open-profile", async (_, profileDir) => {
  if (mailingActive) {
    sendLog("❌ Нельзя открывать профиль во время рассылки", { color: "red" });
    return;
  }

  mode = "idle";
  mailingActive = false;

  await openProfileContext(profileDir);

  mainWindow.webContents.send("mode-changed", mode);
});

ipcMain.handle("start-followup", async (_, { texts }) => {
  if (!FOLLOW_UP_QUEUE.length) {
    sendLog("Нет follow-up очереди", { color: "yellow" });
    return;
  }


  const grouped = groupFollowUpsByProfile(FOLLOW_UP_QUEUE);

  for (const profileDir of Object.keys(grouped)) {
  const profileName = getProfileDisplayName(profileDir);
    sendLog(`🟢 Follow-up профиль: ${profileName}`, { color: "green" });
    await cleanup();
    mailingActive = true;
    await openProfileContext(profileDir);
    if (CURRENT_PROFILE_DIR !== profileDir) {
      await openProfileContext(profileDir);
    }


    const users = grouped[profileDir];

    for (const user of users) {
      const activeParams = getParamsForProfile(
          profileDir,
          GLOBAL_PARAMS,
          ACCOUNT_PARAMS
        );

        await processFollowUpUser(user, texts, activeParams);

      // РАНДОМ ПАУЗА СЕК
      const delaySec = randomDelaySeconds(activeParams.limits.followUpDelaySec);

      if (delaySec > 0) {
        sendLog(`⏳ Follow-up delay ${delaySec}s`, { color: "gray" });
        await page.waitForTimeout(delaySec * 1000);
      }

      // LONG PAUSE
      viewedAccountsCount++;
    }
  }

  FOLLOW_UP_QUEUE = [];
  sendLog("Follow-up завершён", { color: "green" });
});

async function getInboxScrollBox() {
  return await page.evaluate(() => {
    const root =
      document.querySelector('div[data-pagelet="IGDInboxThreadListScrollableAreaPagelet"]');

    if (!root) return null;

    const box = root.getBoundingClientRect();

    return {
      x: box.left + box.width / 2,
      y: box.top + box.height / 2,
    };
  });
}

async function humanScrollInboxStep() {
  const pos = await getInboxScrollBox();
  if (!pos) return false;

  // наводим курсор ВНУТРЬ inbox
  await page.mouse.move(
    pos.x + (Math.random() * 40 - 20),
    pos.y + (Math.random() * 40 - 20),
    { steps: 5 }
  );

  await page.waitForTimeout(100 + Math.random() * 150);

  // маленький wheel
  await page.mouse.wheel(0, 120 + Math.random() * 100);

  return true;
}

async function humanScrollInbox({ maxSteps = 25 } = {}) {
  let idle = 0;
  let lastCount = 0;

  for (let i = 0; i < maxSteps; i++) {
    await humanScrollInboxStep();

    await page.waitForTimeout(700 + Math.random() * 600);

    const count = await page.evaluate(
      () => document.querySelectorAll('div[role="button"]').length
    );

    if (count === lastCount) {
      idle++;
    } else {
      idle = 0;
    }

    lastCount = count;

    // реально дошли до конца
    if (idle >= 3) {
      return false;
    }
  }

  return true;
}

async function processFollowUpUser(user, texts, params) {
  try {
    sendLog(`Follow-up @${user.username}`, { color: "purple" });

    await page.goto("https://www.instagram.com/direct/inbox/");
    await page.waitForTimeout(5000);

    if (user.type === "ARTIST") {
      followPool = texts?.artists?.followup;
    }

    if (user.type === "PRODUCER") {
      followPool = texts?.producers?.followup;
    }

    if (!Array.isArray(followPool) || !followPool.length) {
      sendLog(`Нет follow-up текста`, { color: "gray" });
      return;
    }

    const message =
      followPool[Math.floor(Math.random() * followPool.length)];
    const opened = await openDialogFromInbox(user.username, user.profileData);

    if (opened === "REPLIED") {
      sendLog(`Ответил — пропуск`, { color: "gray" });
      return;
    }

    if (!opened) {
      sendLog(`Диалог не найден`, { color: "gray" });
      return;
    }
    const isBlocked = await detectDirectBlock();

    if (isBlocked) {
      sendLog(`🚫 ЛС закрыта`, { color: "yellow" });
      return;
    }
    await sendHumanMessage(message);

    sendLog(`Follow-up отправлен`, { color: "green" });

  } catch (e) {
    sendLog(`Ошибка follow-up: ${e.message}`, { color: "red" });
  }
}

async function openDialogFromInbox(username, profileData) {

  const targetUser = normalizeName(username);
  const targetNick = normalizeName(profileData?.nickname || "");

  for (let attempt = 0; attempt < 40; attempt++) {

    const result = await page.evaluate(({ targetUser, targetNick }) => {

      const rows = Array.from(document.querySelectorAll('div[role="button"]'));

      for (const row of rows) {

        const text = row.innerText || "";

        const normalized = text
          .toLowerCase()
          .replace(/[@\s]/g, "")
          .replace(/[^\p{L}\p{N}]/gu, "");

        if (
          (targetUser && normalized.includes(targetUser)) ||
          (targetNick && normalized.includes(targetNick))
        ) {

          // 🔴 ПРОВЕРКА UNREAD
          const unread =
            row.querySelector('[data-visualcompletion="ignore"]') ||
            Array.from(row.querySelectorAll("div")).find(el =>
              el.textContent?.toLowerCase().includes("unread")
            );

          if (unread) {
            return "REPLIED";
          }

          row.scrollIntoView({ block: "center" });
          row.click();

          return "OPENED";
        }
      }

      return "NOT_FOUND";

    }, { targetUser, targetNick });


    if (result === "REPLIED") {
      return "REPLIED";
    }

    if (result === "OPENED") {
      sendLog(`💬 Диалог найден (${username})`, { color: "green" });
      return true;
    }

    const canScroll = await humanScrollInbox({ maxSteps: 1 });

    if (!canScroll) break;
  }

  sendLog(`⛔ Диалог не найден`, { color: "yellow" });

  return false;
}

function normalizeName(str = "") {
  return str
    .toLowerCase()
    .replace(/[@\s]/g, "")
    .replace(/[^\p{L}\p{N}]/gu, ""); // убираем emoji и спецсимволы
}

async function detectDirectBlock() {
  try {
    await page.waitForTimeout(15000);

    const blocked = await page.evaluate(() => {
      const container = document.querySelector('[data-pagelet="IGDMessagesList"]');
      if (!container) return false;

      const texts = Array.from(container.querySelectorAll('div, span'))
        .map(el => el.innerText?.toLowerCase() || '');

      return texts.some(t =>
        t.includes("can't receive your message") ||
        t.includes("don't allow new message") ||
        t.includes("unless they follow you") ||
        t.includes("не может получать ваши сообщения") ||
        t.includes("не принимает новые сообщения") ||
        t.includes("не разрешает новые запросы") ||
        t.includes("пока он не подпишется на вас") ||
        t.includes("вы не можете отправить сообщение этому аккаунту")
      );
    });

    return blocked;
  } catch {
    return false;
  }
}
function deepMerge(base, override) {
  if (!override) return structuredClone(base);

  const result = structuredClone(base);

  for (const key of Object.keys(override)) {
    if (
      typeof override[key] === "object" &&
      override[key] !== null &&
      !Array.isArray(override[key]) &&
      typeof result[key] === "object"
    ) {
      result[key] = deepMerge(result[key], override[key]);
    } else {
      result[key] = override[key];
    }
  }

  return result;
}

const API_KEY = "sk-aPXp28GBsLliy9nvuktNUg";
const BASE_URL = "https://api.timeweb.ai/v1";

async function classifyWithAI(profile) {
  const prompt = `
Classify Instagram account.

Return ONLY ONE letter:
A = artist (rapper, singer, performer)
P = producer (beatmaker, producer, engineer)
M = media (blog, label, studio, promo)
U = undefined (music-related but unclear)
T = trash (not related to music)

Rules:
- If there is NO clear evidence of music activity → T
- Random bios, aesthetics, emojis, personal pages → T
- Mentions of music must be explicit (artist, producer, track, etc.)
- If clearly music but role unclear → U
- Do not explain
- Do not add extra text

username: ${profile.username}
name: ${profile.nickname}
activity: ${profile.activity}
bio: ${profile.bio?.slice(0, 200) || ""}
links: ${Array.isArray(profile.links) ? profile.links.join(", ") : ""}
highlights: ${Array.isArray(profile.highlights) ? profile.highlights.join(", ") : ""}
posts: ${Array.isArray(profile.posts)
  ? profile.posts.slice(0, 3).map(p => p.caption || "").join(" | ")
  : ""}
`;

  try {
    const res = await axios.post(
      `${BASE_URL}/chat/completions`,
      {
        model: "gemini/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0,
        max_tokens: 5,
      },
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const text = res.data.choices?.[0]?.message?.content?.trim();

    console.log("AI RAW:", text);

    return mapAIResult(text);
  } catch (err) {
    console.error("AI ERROR:", err.response?.data || err.message);
    return { type: "UNDEFINED" };
  }
}

function mapAIResult(letter) {
  const clean = letter?.toUpperCase().trim();

  if (clean.startsWith("A")) return { type: "ARTIST" };
  if (clean.startsWith("P")) return { type: "PRODUCER" };
  if (clean.startsWith("M")) return { type: "MEDIA" };
  if (clean.startsWith("T")) return { type: "TRASH" };

  return { type: "UNDEFINED" };
}

function hasRussianInProfile(profile) {
  return (
    containsCyrillic(profile.username) ||
    containsCyrillic(profile.nickname) ||
    containsCyrillic(profile.bio) ||
    (Array.isArray(profile.bioLinks) && profile.bioLinks.some(containsCyrillic)) ||
    (Array.isArray(profile.highlights) && profile.highlights.some(containsCyrillic)) ||
    (Array.isArray(profile.posts) &&
      profile.posts.some(p => containsCyrillic(p.caption)))
  );
}

function containsCyrillic(text = "") {
  return /[а-яё]/i.test(text);
}

async function processUsername(username, texts) {
  let shouldRemoveFromQueue = false;
  const pParams = getParamsForProfile(
  CURRENT_PROFILE_DIR,
  GLOBAL_PARAMS,
  ACCOUNT_PARAMS
);
if (scannedWithoutMessages >= 100) {
  sendLog(`⛔ 100 подряд без сообщений — стоп рассылки`, { color: "red" });
  softStopMailing();
  return;
}

if (mailingState.scanned >= 2000) {
  sendLog(`⛔ Достигнут лимит 2000 сканов — стоп рассылки`, { color: "red" });
  softStopMailing();
  return;
}
const paramsSnapshot = structuredClone(pParams);
  try {
  if (!mailingActive) return;
  if (!context || !page) {
      return;
    }

  if (pParams.filters?.skipIfDialogExists) {
      const existsInDB = await isUserInDB(username, CURRENT_USER_ID);

      if (existsInDB) {
        sendLog(`Пропуск @${username}: уже есть в базе`, { color: "gray" });
        shouldRemoveFromQueue = true;
        return;
      }
    }
  sendLog(`Открытие профиля @${username}`, { color: "gray" });

  const loaded = await safeGoto(
  `https://www.instagram.com/${username}/`
);

if (!loaded) {
  sendLog(`❌ Не удалось загрузить профиль @${username}`, { color: "red" });

  shouldRemoveFromQueue = true;

  // 💥 ВАЖНО — перезапуск контекста
  await cleanup();
  await openProfileContext(CURRENT_PROFILE_DIR);

  return;
}
  if (!mailingActive) return;

  const profile = await parseInstagramProfile(username);
  if (!mailingActive) return;
  if (profile.unavailable) {
    sendLog(
      `⚠ Профиль @${username} недоступен — пропуск`,
      { color: "yellow" }
    );
    shouldRemoveFromQueue = true;
    return;
  }

  sendLog(`Username: @${profile.username}`, { color: "gray" });

  sendLog(
    `Никнейм: ${profile.nickname || "—"}`,
    { color: "gray" }
  );

  sendLog(
    `Подписчики: ${profile.followers ?? 0}`,
    profile.followers >= pParams.filters.followers.from &&
    profile.followers <= pParams.filters.followers.to
      ? { color: "green" }
      : { color: "red" }
  );

  sendLog(
    `Род деятельности: ${profile.category || "—"}`,
    { color: "purple" }
  );

  sendLog(
    `Био: ${profile.bio && profile.bio.trim() ? profile.bio : "—"}`,
    { color: "gray" }
  );


  if (Array.isArray(profile.bioLinks) && profile.bioLinks.length) {
    sendLog(`[LINKS]`, { color: "yellow" });

    profile.bioLinks.forEach((link, index) => {
      sendLog(`  ${index + 1}. ${link}`, { color: "yellow" });
    });
  } else {
    sendLog(`[LINKS] —`, { color: "gray" });
  }


  if (Array.isArray(profile.highlights) && profile.highlights.length) {
    sendLog(`[HIGHLIGHTS]`, { color: "purple" });

    profile.highlights.forEach((h, index) => {
      sendLog(`  ${index + 1}. ${h}`, { color: "purple" });
    });
  } else {
    sendLog(`[HIGHLIGHTS] —`, { color: "gray" });
  }


  if (Array.isArray(profile.posts) && profile.posts.length) {
    sendLog(`[POSTS]`, { color: "gray" });

    profile.posts.slice(0, 5).forEach((post, index) => {
      const text = post.caption?.trim() || "—";
      sendLog(`  ${index + 1}. ${text}`, { color: "gray" });
    });
  } else {
    sendLog(`[POSTS] —`, { color: "gray" });
  }

if (hasRussianInProfile(profile)) {
  sendLog(`Русский текст — TRASH`, { color: "red" });

  shouldRemoveFromQueue = true;
  return;
}

  const scoringResult = await classifyWithAI({
    username: profile.username,
    nickname: profile.nickname,
    bio: profile.bio,
    activity: profile.category,
    links: profile.bioLinks,
    highlights: profile.highlights,
    posts: profile.posts,
  });

  sendLog(
    `Классификация: ${scoringResult.type}`,
    {
      color:
        scoringResult.type === "ARTIST" ? "green" :
        scoringResult.type === "PRODUCER" ? "purple" :
        scoringResult.type === "MEDIA" ? "yellow" :
        scoringResult.type === "TRASH" ? "red" :
        "gray",
    }
  );

if (scoringResult.type === "MEDIA") {
  if (pParams.filters?.parseStudios) {
    await saveProfileToDB(profile, scoringResult, null, CURRENT_USER_ID);
    sendLog(`MEDIA сохранён`, { color: "gray" });
  } else {
    sendLog(`MEDIA пропущен (parseStudios выключен)`, { color: "gray" });
  }
  mailingState.media++;
  shouldRemoveFromQueue = true;
  return;
}

if (scoringResult.type === "UNDEFINED") {
  await saveProfileToDB(profile, scoringResult, null, CURRENT_USER_ID);
  sendLog(`UNDEFINED сохранён`, { color: "gray" });
  mailingState.undefined++;
  shouldRemoveFromQueue = true;
  return;
}

if (scoringResult.type === "TRASH") {
  sendLog(`TRASH — пропуск`, { color: "gray" });
  shouldRemoveFromQueue = true;
  return;
}

let textPool = null;

if (scoringResult.type === "ARTIST") {
  textPool = texts?.artists?.main;
  mailingState.artists++;
}

if (scoringResult.type === "PRODUCER") {
  textPool = texts?.producers?.main;
  mailingState.producers++;
}
sendMailingState();
if (
  (scoringResult.type === "ARTIST" || scoringResult.type === "PRODUCER") &&
  (!Array.isArray(textPool) || textPool.length === 0)
) {
  sendLog(`Нет текста для @${username}`, { color: "yellow" });
  shouldRemoveFromQueue = true;
  return;
}


const randomItem =
  textPool[Math.floor(Math.random() * textPool.length)];

const messageText =
  typeof randomItem === "string"
    ? randomItem
    : randomItem?.text;

if (!messageText) {
  sendLog(`Текст найден, но пустой / неверный формат`, { color: "yellow" });
  shouldRemoveFromQueue = true;
  return;
}

sendLog(
  `Выбран текст: "${messageText.substring(0, 60)}..."`,
  { color: "green" }
);

if (pParams.filters?.followers?.enabled) {
  const from = pParams.filters.followers.from;
  const to = pParams.filters.followers.to;

  if (profile.followers < from || profile.followers > to) {
    sendLog(
      `Пропуск @${username}: ${profile.followers} подписчиков вне диапазона`,
      { color: "gray" }
    );
    shouldRemoveFromQueue = true;
    return;
  }
}

if (
  scoringResult.type === "ARTIST" &&
  !pParams.audience?.artists
) {
  sendLog(`Пропуск @${username}: артист (галочка снята)`, { color: "gray" });
  shouldRemoveFromQueue = true;
  return;
}

if (
  scoringResult.type === "PRODUCER" &&
  !pParams.audience?.producers
) {
  sendLog(`Пропуск @${username}: продюсер (галочка снята)`, { color: "gray" });
  shouldRemoveFromQueue = true;
  return;
}

sendLog(
  `👉 Подходит для рассылки (${scoringResult.type})`,
  { color: "green" }
);


let contact = { email: null, phone: null };

if (
  scoringResult.type === "ARTIST" ||
  scoringResult.type === "PRODUCER"
) {
  sendLog(`🔍 Поиск контактов...`, { color: "gray" });
  if (!mailingActive) return;
  contact = await parseContactFromExtension();
  if (!mailingActive) return;
  sendLog(
    `📧 Email: ${contact.email || "—"}`,
    { color: contact.email ? "green" : "gray" }
  );

  sendLog(
    `📱 Phone: ${contact.phone || "—"}`,
    { color: contact.phone ? "green" : "gray" }
  );
}
if (!mailingActive) return;
const chatOpened = await openChatSmart(page, username);

if (!chatOpened) {
  sendLog(`Пропуск @${username}: не удалось открыть диалог`, { color: "gray" });
  shouldRemoveFromQueue = true;
  return;
}

await page.waitForTimeout(1000);

if (pParams.filters?.skipIfDialogExists) {
  const exists = await hasExistingDialog();
  if (exists) {
    sendLog(`Пропуск @${username}: уже есть диалог`, { color: "gray" });
    shouldRemoveFromQueue = true;
    return;
  }
}

const now = Date.now();

if (nextMessageTime > now) {
  const waitMs = nextMessageTime - now;

  sendLog(
    `⏳ Ожидание остатка паузы ${formatMinSec(Math.ceil(waitMs / 1000))}`,
    { color: "gray" }
  );

  await page.waitForTimeout(waitMs);
}
await sendHumanMessage(messageText);
shouldRemoveFromQueue = true;
sendLog(`Сообщение отправлено @${username}`, { color: "green" });
messageSent = true;
mailingState.processed++;
scannedWithoutMessages = 0;
mailingState.totalProcessed++;
FOLLOW_UP_QUEUE.push({
  username,
  type: scoringResult.type,
  profileDir: CURRENT_PROFILE_DIR,
  profileData: profile
});
sendMailingState();
messagesSentByProfile++;
mainWindow?.webContents.send("mailing-state", mailingState);

sendLog(
  `📤 Сообщений этим профилем: ${messagesSentByProfile}`,
  { color: "purple" }
);
await saveProfileToDB(
  profile,
  scoringResult,
  contact,
  CURRENT_USER_ID
);
if (!mailingActive) return;
const isBlocked = await detectDirectBlock();
if (!mailingActive) return;

if (isBlocked) {
  sendLog(`🚫 ЛС закрыта — переход в комментарии`, { color: "yellow" });

  await fallbackToComments(username, profile, scoringResult, texts);
}

if (messageSent) {
  const delaySec = humanDelayFromMinutes(
    pParams.limits.delayBetweenMessagesMin
  );

  nextMessageTime = Date.now() + delaySec * 1000;

  sendLog(
    `⏱ Следующее сообщение не раньше чем через ${formatMinSec(delaySec)}`,
    { color: "gray" }
  );
}

const limit = PROFILE_LIMITS[CURRENT_PROFILE_DIR];
const VIEW_LIMIT = 2000;
const NO_MESSAGE_LIMIT = 100;

if (
  (limit && messagesSentByProfile >= limit) ||
  mailingState.scanned >= VIEW_LIMIT ||
  scannedWithoutMessages >= NO_MESSAGE_LIMIT
  ) {
  sendLog(
    `🔄 Лимит достигнут — смена профиля`,
    { color: "yellow" }
  );
  mailingState.processed = 0;
  nextMessageTime = 0;


  currentProfileIndex++;
  mailingState.authorizedAccountIndex = currentProfileIndex;
  sendMailingState();

  if (currentProfileIndex >= MAILING_PROFILES.length) {
    sendLog(
      `❌ Все Chromium профили использованы — рассылка остановлена`,
      { color: "red" }
    );
    softStopMailing();
    return;
  }

  messagesSentByProfile = 0;

  const nextProfile = MAILING_PROFILES[currentProfileIndex].dir;
  const profileName = getProfileDisplayName(nextProfile);
  sendLog(
    `🟢 Запуск следующего профиля: ${profileName}`,
    { color: "green" }
  );
  await cleanup();
  mailingActive = true;
  await openProfileContext(nextProfile);
  mailingState.profile = profileName;
sendMailingState();

const newParams = getParamsForProfile(
  nextProfile,
  GLOBAL_PARAMS,
  ACCOUNT_PARAMS
);


  mailingState.status = "mailing";
sendMailingState();

}
} catch (err) {
    sendLog(
      `❌ Ошибка при обработке @${username}: ${err.message}`,
      { color: "red" }
    );

    if (
    err.message.includes("ERR_INTERNET_DISCONNECTED") ||
    err.message.includes("ENOTFOUND") ||
    err.message.includes("fetch failed")
  ) {
    sendLog(`🌐 Проблема с сетью — перезапуск профиля`, { color: "yellow" });

    await cleanup();
    await openProfileContext(CURRENT_PROFILE_DIR);

    return;
  }

    await removeUsernameFromQueue(username, CURRENT_USER_ID);
    mailingState.scanned++;
    scannedWithoutMessages++;
    sendMailingState();
  } finally {
  if (shouldRemoveFromQueue) {
      viewedAccountsCount++;
      mailingState.scanned++;
      scannedWithoutMessages++;
      sendMailingState();
      await removeUsernameFromQueue(username, CURRENT_USER_ID);
        if (scannedWithoutMessages >= 100) {
          sendLog(`⛔ 100 подряд без сообщений — стоп`, { color: "red" });
          softStopMailing();
          return;
        }

        if (mailingState.scanned >= 2000) {
          sendLog(`⛔ 2000 сканов — стоп`, { color: "red" });
          softStopMailing();
          return;
        }
      await checkLongPause(paramsSnapshot);
  }}
}

async function hasUnreadReply(username) {
  return await page.evaluate((username) => {

    const rows = Array.from(document.querySelectorAll('div[role="button"]'));

    const row = rows.find(el => {
      const name = el.querySelector('span[dir="auto"]');
      if (!name) return false;
      return name.textContent.toLowerCase().includes(username.toLowerCase());
    });

    if (!row) return false;

    const unreadIndicator =
      row.querySelector('[data-visualcompletion="ignore"]') ||
      Array.from(row.querySelectorAll('div')).find(el =>
        el.textContent?.toLowerCase().includes("unread")
      );

    return !!unreadIndicator;

  }, username);
}

async function openChatWithUser(username) {
  await page.goto("https://www.instagram.com/direct/inbox/");
  await page.waitForTimeout(5000);

  await page.waitForFunction(() => {
    const input = document.querySelector(
      'input[placeholder*="Поиск"], input[placeholder*="Search"]'
    );
    return input && input.offsetParent !== null;
  }, { timeout: 10000 });

  await page.click(
    'input[placeholder*="Поиск"], input[placeholder*="Search"]'
  );

  await page.waitForTimeout(500);

  const searchInput = await page.$(
    'input[placeholder*="Поиск"], input[placeholder*="Search"]'
  );

  if (!searchInput) {
    sendLog(`❌ Не найдено поле поиска в Direct`, { color: "red" });
    return false;
  }

  await searchInput.fill("");
  await searchInput.type(username, { delay: 90 });

  await page.waitForTimeout(3500);

await page.waitForFunction(
  () => document.querySelectorAll('div[role="button"]').length > 0,
  { timeout: 7000 }
);


const userButton = await page.evaluateHandle((username) => {
  const lower = username.toLowerCase().trim();

  const buttons = Array.from(
    document.querySelectorAll('div[role="button"]')
  );
  // 1. Точное совпадение юзернейма
  for (const btn of buttons) {
    const spans = btn.querySelectorAll("span");
    for (const span of spans) {
      const text = span.innerText?.toLowerCase().trim();
      if (text === lower) {
        return btn; // НАШЛИ ТОЧНЫЙ ЮЗ
      }
    }
  }

  // 2. Фоллбек — старая логика
  return buttons.find(btn => {
    const text = btn.innerText?.toLowerCase() || "";
    return text.startsWith(lower);
  }) || null;

}, username);

if (!userButton) {
  return false;
}

await userButton.asElement().click();
await page.waitForTimeout(2500);

sendLog(`💬 Диалог с @${username} открыт`, { color: "green" });
return true;

}

async function openChatSmart(page, username) {
  // 1. Открываем профиль
  const loaded = await safeGoto(`https://www.instagram.com/${username}/`);
if (!loaded) return false;
  await page.waitForTimeout(4000);

  // ===== ИЩЕМ КНОПКУ MESSAGE =====
  const messageBtn = await page.evaluateHandle(() => {
    const buttons = Array.from(document.querySelectorAll("div[role='button'], a"));

    return buttons.find(btn => {
      const text = btn.innerText?.toLowerCase() || "";
      return (
        /\bmessage\b/.test(text) ||
        text.includes("сообщение") ||
        text.includes("написать")
      );
    }) || null;
  });

  if (messageBtn) {
  const el = messageBtn.asElement();
  if (el) {
    await el.click();
    await page.waitForTimeout(3000);

    sendLog(`✅ Открыли чат`, { color: "green" });
    return true;
  }
}

  // ===== 2. ФОЛЛБЕК — ЧЕРЕЗ DIRECT =====
  sendLog(`⚠️ Нет кнопки, идем через direct`, { color: "yellow" });

  const opened = await openChatWithUser(username);
  if (!opened) return false;

  // ===== 3. ПРОВЕРКА ОШИБКИ =====
  const hasError = await page.evaluate(() => {
    const text = document.body.innerText.toLowerCase();
    return text.includes("что-то не работает") ||
           text.includes("something went wrong");
  });

  if (hasError) {
    sendLog(`❌ Ошибка в direct, пробуем через профиль`, { color: "red" });

    // ищем кнопку "смотреть профиль"
    const profileBtn = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll("a, div[role='button']"));

      return buttons.find(btn => {
        const text = btn.innerText?.toLowerCase() || "";
        return (
          text.includes("смотреть профиль") ||
          text.includes("view profile")
        );
      }) || null;
    });

    if (profileBtn) {
      await profileBtn.asElement().click();
      await page.waitForTimeout(3000);

     sendLog(`✅ Открыли чат`, { color: "green" });
     return true;
    }

    return false;
  }

  return true;
}

async function sendHumanMessage(text) {
  const inputSelector = 'div[contenteditable="true"]';

  await humanType(page, inputSelector, text);

  await page.keyboard.press("Enter");
  await page.waitForTimeout(2000 + Math.random() * 2000);
}

async function fallbackToComments(username, profile, scoringResult, texts) {
  try {
    await page.goto(`https://www.instagram.com/${username}/`);
    await page.waitForTimeout(3000);

    if (!profile.posts || !profile.posts.length) {
      sendLog(`Нет постов для коммента`, { color: "gray" });
      return;
    }

    const randomPost =
      profile.posts[Math.floor(Math.random() * profile.posts.length)];

    await page.goto(`https://www.instagram.com${randomPost.url}`);
    await page.waitForTimeout(3000);

    let commentPool = null;

    if (scoringResult.type === "ARTIST") {
      commentPool = texts?.artists?.comments;
    }

    if (scoringResult.type === "PRODUCER") {
      commentPool = texts?.producers?.comments;
    }

    if (!Array.isArray(commentPool) || !commentPool.length) {
      sendLog(`Нет комментариев для fallback`, { color: "gray" });
      return;
    }

    const comment =
      commentPool[Math.floor(Math.random() * commentPool.length)];

    await leaveComment(comment);

    sendLog(`💬 Комментарий оставлен`, { color: "green" });

  } catch (e) {
    sendLog(`Ошибка fallback: ${e.message}`, { color: "red" });
  }
}

async function leaveComment(text) {
  try {
    // 1. ждём форму
    await page.waitForSelector('form textarea', { timeout: 5000 });

    // 2. клик по textarea
    await page.click('form textarea');

    // 3. ждём ререндер
    await page.waitForTimeout(600);

    // 4. заново ищем textarea
    const textarea = await page.waitForSelector(
      'textarea[aria-label*="Add a comment"], textarea[aria-label*="Добав"]',
      { timeout: 5000 }
    );

    // 5. печатаем как человек
    await textarea.type(text, { delay: 70 });

    // 6. ждём активации кнопки
    await page.waitForTimeout(800);

    // 7. отправка
    await page.keyboard.press("Enter");

    await page.waitForTimeout(1200);

    sendLog("Комментарий отправлен", { color: "green" });

  } catch (e) {
    sendLog(`Не удалось оставить комментарий: ${e.message}`, { color: "yellow" });
  }
}


async function isUserInDB(username, userId) {
  try {
    const normalized =
      "@" + username.replace(/^@/, "").trim().toLowerCase();

    const res = await axios.get(`${API_URL}/profiles/exists`, {
      params: {
        user_id: userId,
        username: normalized,
      },
      timeout: 10000,
    });

    return !!res.data?.exists;

  } catch (e) {
    sendLog(`DB check error: ${e.message}`, { color: "red" });
    return false;
  }
}



async function saveProfileToDB(profile, scoringResult, contact, userId) {
  if (scoringResult.type === "TRASH") return;

  const payload = {
    user_id: userId,
    username: `@${profile.username}`,
    profile_type: scoringResult.type,
    links: Array.isArray(profile.bioLinks)
      ? profile.bioLinks
      : [],
  };

  if (["ARTIST", "PRODUCER"].includes(scoringResult.type)) {
    payload.email = contact?.email ?? null;
    payload.phone = contact?.phone ?? null;
    payload.followers =
      typeof profile.followers === "number"
        ? profile.followers
        : null;
  }

  try {
    await axios.post(`${API_URL}/profiles`, payload, {
      timeout: 10000,
    });
  } catch (e) {
    sendLog(`Save profile error: ${e.message}`, { color: "red" });
  }
}

function randomFromArray(arr) {
  if (!Array.isArray(arr) || !arr.length) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

async function hasExistingDialog() {
  try {
    return await page.evaluate(() => {
      // 🔥 1. СНАЧАЛА проверяем через grid (это важно для мини-окна)
      const grids = document.querySelectorAll('[role="grid"]');

      for (const grid of grids) {
        const rows = grid.querySelectorAll('[role="row"]');

        for (const row of rows) {
          const messageText = row.querySelector('[dir="auto"]');

          if (messageText && messageText.innerText.trim().length > 0) {
            return true;
          }
        }
      }

      // ⚡️ 2. Если не нашли — используем старый способ (для обычного DM)
      const oldElements = document.querySelectorAll(
        'div[role="presentation"] div[dir="auto"]'
      );

      for (const el of oldElements) {
        if (el.innerText && el.innerText.trim().length > 0) {
          return true;
        }
      }

      return false;
    });
  } catch {
    return false;
  }
}

async function safeGoto(url, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 15000,
      });
      return true;
    } catch (e) {
      const isLast = i === retries;

      sendLog(
        `⚠️ Ошибка загрузки (${i + 1}): ${e.message}`,
        { color: "yellow" }
      );

      if (isLast) return false;

      await page.waitForTimeout(2000);
    }
  }
}

async function removeUsernameFromQueue(username, userId) {
  const maxRetries = 3;

  for (let i = 0; i < maxRetries; i++) {
    try {
      await axios.delete(`${API_URL}/usernames`, {
        params: {
          user_id: userId,
          username: username,
        },
        timeout: 10000,
      });

      sendLog(`🗑 @${username} удалён из очереди`, { color: "gray" });
      mainWindow.webContents.send("usernames-updated");

      return; // ✅ успех — выходим

    } catch (e) {
      const isLast = i === maxRetries - 1;

      sendLog(
        `⚠ Ошибка удаления @${username} (попытка ${i + 1}): ${e.message}`,
        { color: "yellow" }
      );

      // если последняя попытка — уже финально логируем
      if (isLast) {
        sendLog(
          `❌ Не удалось удалить @${username} после ${maxRetries} попыток`,
          { color: "red" }
        );
        return;
      }

      // небольшая пауза перед retry
      await new Promise(res => setTimeout(res, 1000));
    }
  }
}

async function openProfileContext(profileDir) {
  CURRENT_PROFILE_DIR = profileDir;


  const extensionPath = isDev
  ? path.join(__dirname, "extensions", "inse-mail-finder")
  : path.join(process.resourcesPath, "app.asar.unpacked", "extensions", "inse-mail-finder");

context = await chromium.launchPersistentContext(CHROME_DATA_DIR, {
  headless: false,
  args: [
    "--no-sandbox",
    `--profile-directory=${profileDir}`,
    "--disable-popup-blocking",
    `--disable-extensions-except=${extensionPath}`,
    `--load-extension=${extensionPath}`,
  ],
});
await context.grantPermissions([], {
      origin: "https://www.instagram.com",
    });

//    await context.route("**/*", route => {
//      const type = route.request().resourceType();
//
//      if (
//        type === "image" ||
//        type === "media" ||
//        type === "font"
//      ) {
//        route.abort();
//      } else {
//        route.continue();
//      }
//    });
    mailingState.limit = PROFILE_LIMITS[profileDir];
    mailingState.totalLimit = Object.values(PROFILE_LIMITS)
        .reduce((a, b) => a + b, 0);
    mailingState.processed = 0;
    sendMailingState();

  page = context.pages()[0] || await context.newPage();
  await page.addInitScript(() => {
  if ("Notification" in window) {
    Notification.requestPermission = () => Promise.resolve("denied");
  }
});
await page.addInitScript(() => {
  // Отключаем install / engagement API
  Object.defineProperty(navigator, "standalone", {
    get: () => false,
  });

  if ("getInstalledRelatedApps" in navigator) {
    navigator.getInstalledRelatedApps = () => Promise.resolve([]);
  }
});
await page.addStyleTag({
  content: `
    /* Диалоги уведомлений */
    div[role="dialog"] {
      display: none !important;
    }

    /* Toast / popups */
    div[data-testid="toast"] {
      display: none !important;
    }
  `
});


  await page.goto("https://www.instagram.com/", { waitUntil: "domcontentloaded" });

  await waitForInstagramReady(page);

  attachContextCloseHandlers();

  mainWindow?.webContents.send("browser-started");
}

async function waitForInstagramReady(page) {
  // даём инсте чуть пожить
  await page.waitForTimeout(3000);

  // 1️⃣ если редиректит на логин — значит НЕ залогинен
  if (page.url().includes("/accounts/login")) {
    throw new Error("Instagram: аккаунт не залогинен");
  }

  // 2️⃣ пробуем открыть inbox — самый стабильный маркер
  try {
    await page.goto("https://www.instagram.com/direct/inbox/", {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });

    await page.waitForFunction(() => {
      return (
        document.querySelector('div[role="button"]') ||
        document.querySelector('[data-pagelet*="Inbox"]') ||
        document.querySelector('input[placeholder*="Поиск"]')
      );
    }, { timeout: 15000 });

    return; // ✅ ГОТОВО
  } catch {
    // fallback ниже
  }

  // 3️⃣ fallback: профильная страница
  await page.goto("https://www.instagram.com/", {
    waitUntil: "domcontentloaded",
  });

  await page.waitForFunction(() => {
    // любой из этих признаков
    return (
      document.querySelector('img[data-testid="user-avatar"]') ||
      document.querySelector('svg[aria-label="Home"]') ||
      document.querySelector('a[href="/direct/inbox/"]') ||
      !document.querySelector('input[name="username"]') // нет логин формы
    );
  }, { timeout: 15000 });
}
async function checkLongPause(params) {
  const baseEvery = params.limits?.longPause?.everyAccounts;
  const baseMinutes = params.limits?.longPause?.minutes;

  if (!baseEvery || !baseMinutes) return;

  if (viewedAccountsCount < LONG_PAUSE_NEXT_AT) return;

  // СКОЛЬКО ПАУЗА
  const randomizedMinutes = randomizePercentForMin(baseMinutes, 30);
  const delaySec = humanDelayFromMinutes(randomizedMinutes);

  sendLog(
    `⏸ Длинная пауза ${formatMinSec(delaySec)} (аккаунт ${viewedAccountsCount})`,
    { color: "yellow" }
  );

  await page.waitForTimeout(delaySec * 1000);

  // СДВИГАЕМ СЛЕДУЮЩУЮ ТОЧКУ
  LONG_PAUSE_NEXT_AT += randomizePercent(baseEvery, 30);
}




async function parseInstagramProfile(username) {
  const data = {
      username,
      followers: 0,
      bio: "",
      category: null,
      bioLinks: [],
      nickname: null,
      highlights: [],
      posts: [],
    };


await page.waitForTimeout(1500);

  await humanScroll();


const isProfile = await page.evaluate(() => {
  if (document.querySelector('a[href*="/followers/"]')) return true;

  const buttons = Array.from(document.querySelectorAll("button"));
  if (buttons.some(b =>
    /follow|подписаться|following|requested/i.test(b.innerText)
  )) return true;

  if (document.querySelector("section.xqui205")) return true;

  if (document.querySelector("header h2")) return true;

  return false;
});

if (!isProfile) {
  return {
    username,
    unavailable: true,
  };
}

  try {
    const followersText = await page.evaluate(() => {
      const linkSpan = document.querySelector(
        'a[href*="/followers/"] span[title]'
      );
      if (linkSpan) return linkSpan.getAttribute("title");

      const anySpan = Array.from(document.querySelectorAll("span[title]"))
        .find(s => {
          const t = s.getAttribute("title");
          return t && /^[\d\s\u00A0]+$/.test(t);
        });

      return anySpan ? anySpan.getAttribute("title") : null;
    });

    if (followersText) {
      data.followers = parseFollowers(
        followersText.replace(/\u00A0/g, " ")
      );
    }
  } catch {
    data.followers = 0;
  }

  try {
    data.category = await page.evaluate(() => {
      const el = document.querySelector(
        'div._ap3a._aaco._aacu._aacy'
      );
      return el ? el.textContent.trim() : null;
    });
  } catch {}

    try {
      data.nickname = await page.evaluate(() => {
  const spans = Array.from(document.querySelectorAll('header span[dir="auto"]'));
  return spans.length ? spans[0].innerText.trim() : null;
});

    } catch {}

try {
  data.bio = await page.evaluate(() => {
    const bioSpan = document.querySelector(
      'header [role="button"] span[dir="auto"]'
    );

    if (!bioSpan) return "";

    const text =
      bioSpan.getAttribute("title") ||
      bioSpan.getAttribute("aria-label") ||
      bioSpan.innerText ||
      "";

    return text.trim();
  });
} catch {
  data.bio = "";
}
try {
  if (data.bio) {
    const bioLinks =
      data.bio.match(
        /(https?:\/\/[^\s]+|(?:www\.)?[a-z0-9-]+\.[a-z]{2,}[^\s]*)/gi
      ) || [];

    data.bioLinks.push(...bioLinks);
  }
} catch {}


try {
  const directLinks = await page.$$eval(
    'a[href^="https://l.instagram.com/"]',
    els => els.map(a => a.href)
  );
  data.bioLinks.push(...directLinks);

  const groupButton = await page.$(
    'button svg[aria-label*="ссыл"] , button svg[aria-label*="Link"]'
  );

  if (groupButton) {
    await groupButton.click();
    await page.waitForTimeout(1000);

    const modalLinks = await page.$$eval(
      'div[role="dialog"] a[href^="https://l.instagram.com/"]',
      els => els.map(a => a.href)
    );

    data.bioLinks.push(...modalLinks);

    const closeBtn = await page.$('div[role="dialog"] svg[aria-label*="Закры"]');
    if (closeBtn) await closeBtn.click();
  }
} catch {}


    data.bioLinks = [
  ...new Set(
    data.bioLinks
      .map(cleanInstagramLink)
      .filter(Boolean)
  )
];

try {
  data.highlights = await page.evaluate(() => {
  return Array.from(
    document.querySelectorAll('a[href*="/stories/highlights/"] span[dir="auto"]')
  )
    .map(e => e.innerText.trim())
    .filter(Boolean);
});

} catch {
  data.highlights = [];
}
try {
  await page.waitForSelector('a[href*="/reel/"], a[href*="/p/"]', {
    timeout: 5000,
  });

  data.posts = await page.evaluate(() => {
    const links = Array.from(
      document.querySelectorAll('a[href*="/reel/"], a[href*="/p/"]')
    );

    return links
      .slice(0, 5)
      .map(a => {
        const img = a.querySelector("img");
        return {
          caption: img?.alt?.trim() || "",
          url: a.getAttribute("href"),
        };
      });
  });
} catch {
  data.posts = [];
}


  return data;
}

async function parseContactFromExtension() {
  try {
    const findBtn = await page.waitForSelector(
      'button:has-text("Find Contact")',
      { timeout: 3000 }
    );

    if (!findBtn) {
      return { email: null, phone: null };
    }

    await findBtn.click();
    await page.waitForTimeout(3000);
    await page.waitForSelector('.el-dialog', { timeout: 5000 });

    const result = await page.evaluate(() => {
      const dialog = document.querySelector(".el-dialog");
      if (!dialog) return null;

      const noData = dialog.innerText.includes("No public contact information");
      if (noData) {
        return { email: null, phone: null };
      }

      let email = null;
      let phone = null;

      const rows = dialog.querySelectorAll("tr");
      rows.forEach(row => {
        const label = row.querySelector("td")?.innerText?.toLowerCase();
        const value = row.querySelectorAll("td")[1]?.innerText?.trim();

        if (label?.includes("email")) email = value;
        if (label?.includes("phone")) phone = value;
      });

      return { email, phone };
    });

    const closeBtn = await page.$('.el-dialog__headerbtn');
    if (closeBtn) await closeBtn.click();

    return result || { email: null, phone: null };

  } catch (e) {
    return { email: null, phone: null };
  }
}

function cleanInstagramLink(raw) {
  try {
    let url = raw;

    if (url.includes("l.instagram.com/?u=")) {
      url = decodeURIComponent(url.split("?u=")[1].split("&")[0]);
    }

    url = url.split("#")[0];

    url = url.split("?")[0];

    url = url.replace(/\/$/, "");

    return url;
  } catch {
    return raw;
  }
}

function parseFollowers(text) {
  if (!text) return 0;

  text = text.replace(/\s/g, "").toLowerCase();

  if (text.includes("тыс")) {
    return Math.round(parseFloat(text) * 1000);
  }

  if (text.includes("k")) {
    return Math.round(parseFloat(text) * 1000);
  }

  return parseInt(text.replace(/\D/g, ""), 10);
}

async function humanScroll() {
  const moves = Math.floor(Math.random() * 3) + 3;

  for (let i = 0; i < moves; i++) {
    const direction = Math.random() > 0.25 ? 1 : -1;
    const distance = 200 + Math.random() * 400;
    const steps = 10 + Math.floor(Math.random() * 10);

    for (let s = 0; s < steps; s++) {
      await page.mouse.wheel(0, (distance / steps) * direction);
      await page.waitForTimeout(40 + Math.random() * 40);
    }

    await page.waitForTimeout(500 + Math.random() * 900);
  }

  await page.evaluate(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  await page.waitForTimeout(600 + Math.random() * 600);
}

async function humanType(page, selector, text) {
  const input = await page.waitForSelector(selector, { timeout: 5000 });

  await input.focus();

  await page.waitForTimeout(600 + Math.random() * 1200);

  const typoChars = "abcdefghijklmnopqrstuvwxyz";

  const chars = [...text]; // 🔥 фикс для emoji

  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];

    if (Math.random() < 0.08) {
      await page.waitForTimeout(300 + Math.random() * 700);
    }

    if (Math.random() < 0.07) {
      const typo =
        typoChars[Math.floor(Math.random() * typoChars.length)];
      await page.keyboard.type(typo, {
        delay: 40 + Math.random() * 70,
      });
      await page.waitForTimeout(80 + Math.random() * 120);
      await page.keyboard.press("Backspace");
    }

    await page.keyboard.type(char, {
      delay: 50 + Math.random() * 120,
    });

    if (Math.random() < 0.04 && i > 2) {
      await page.waitForTimeout(60);
      await page.keyboard.press("Backspace");
      await page.keyboard.type(char, {
        delay: 40 + Math.random() * 80,
      });
    }
  }

  await page.waitForTimeout(500 + Math.random() * 1000);
}

function applyFiltersStub(profile, params) {
  const reasons = [];

  if (params.filters.followers.enabled) {
    if (
      profile.followers < params.filters.followers.from ||
      profile.followers > params.filters.followers.to
    ) {
      return {
        passed: false,
        reason: `Подписчики ${profile.followers} вне диапазона`,
      };
    }

    reasons.push("Подписчики подходят");
  }

  if (params.filters.skipIfDialogExists && profile.hasDialog) {
    return {
      passed: false,
      reason: "Уже есть диалог",
    };
  }

  if (params.audience.producers) {
    if (!producerStub(profile)) {
      return {
        passed: false,
        reason: "Не похож на продюсера",
      };
    }
    reasons.push("Похож на продюсера");
  }

  if (params.audience.artists) {
    if (!artistStub(profile)) {
      return {
        passed: false,
        reason: "Не похож на артиста",
      };
    }
    reasons.push("Похож на артиста");
  }

  return {
    passed: true,
    reason: reasons.join(", "),
  };
}

function producerStub(profile) {
  const keywords = [
    "producer",
    "beat",
    "beats",
    "prod",
    "instrumental",
  ];

  return (
    keywords.some(k =>
      profile.bio?.toLowerCase().includes(k)
    ) ||
    profile.bioLink?.includes("linktr.ee") ||
    profile.category?.toLowerCase().includes("producer")
  );
}

function artistStub(profile) {
  const keywords = [
    "artist",
    "rapper",
    "singer",
    "music",
    "official",
  ];

  return keywords.some(k =>
    profile.bio?.toLowerCase().includes(k)
  );
}

function mediaStub(profile) {
  const keywords = [
    "media",
    "studio",
    "label",
    "records",
    "production",
  ];

  return (
    keywords.some(k =>
      profile.bio?.toLowerCase().includes(k)
    ) ||
    profile.category?.toLowerCase().includes("studio")
  );
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

ipcMain.handle("start-browser", async () => {
  if (browser || context) {
    sendLog("Браузер уже запущен", { color: "yellow" });
    return { status: "already-running" };
  }

  sendLog("Запуск браузера...", { color: "gray" });

  browser = await chromium.launch({ headless: false });
  context = await browser.newContext();
  page = await context.newPage();

  page.on("close", async () => {
    mailingState.status = "stopping";
    mainWindow?.webContents.send("mailing-state", mailingState);
    await cleanup();
  });
  sendLog("Браузер успешно запущен", { color: "green" });
  await page.goto("https://www.instagram.com/");
  mainWindow?.webContents.send("browser-started");

  return { status: "started" };
});

ipcMain.handle("is-browser-running", () => {
  return !!browser || !!context;
});

ipcMain.handle("stop-browser", async () => {
  console.log("STOP browser");
  sendLog("Остановка браузера...", { color: "gray" });
  try {
    if (browser) {
      await browser.close();
      browser = null;
    }

    if (context) {
      await context.close();
      context = null;
    }

    page = null;
    mailingActive = false;
    mailingState.status = "stopping";
    mainWindow?.webContents.send("mailing-state", mailingState);
    await cleanup();

    mainWindow?.webContents.send("browser-stopped");
    return { status: "stopped" };
  } catch (e) {
    sendLog("Ошибка закрытия браузера", { color: "yellow" });
    console.error("STOP ERROR:", e);
    return { status: "error" };
  }
});

function generateNewChromiumProfileName() {
  return `Profile_${Date.now()}`;
}


ipcMain.handle("openProfileManager", async () => {
  if (PROFILE_LIMIT !== Infinity) {
    const profiles = readChromiumProfiles();
    if (profiles.length >= PROFILE_LIMIT) {
      return { status: "limit-reached" };
    }
  }

  if (context) {
    return { status: "already-open" };
  }

  mode = "idle";

  const newProfileName = generateNewChromiumProfileName();

  context = await chromium.launchPersistentContext(CHROME_DATA_DIR, {
    headless: false,
    args: [
      "--no-sandbox",
      `--profile-directory=${newProfileName}`,
      "--disable-popup-blocking",
    ],
  });

  page = context.pages()[0] || await context.newPage();

  // ❗ НЕ chrome://settings/manageProfile
  // просто пустой Chromium-профиль
  await page.goto("chrome://settings/manageProfile");

  attachContextCloseHandlers();

  return {
    status: "created",
    profileDir: newProfileName, // ← ВАЖНО вернуть в UI
  };
});


function readChromiumProfiles() {
  const statePath = path.join(CHROME_DATA_DIR, "Local State");
  if (!fs.existsSync(statePath)) return [];

  const data = JSON.parse(fs.readFileSync(statePath, "utf-8"));
  const cache = data?.profile?.info_cache || {};

  const allProfiles = Object.entries(cache).map(([dir, info]) => ({
    dir,
    name: info.name,
  }));

  if (PROFILE_LIMIT === Infinity) {
    return allProfiles;
  }

  return allProfiles.slice(0, PROFILE_LIMIT);
}


ipcMain.handle("getChromiumProfiles", async (_, userId) => {
  if (userId) {
    await fetchUserPlan(userId);
  }

  const profiles = readChromiumProfiles();

  const result = [];
  for (const p of profiles) {
    const loggedIn = await isInstagramLoggedIn(p.dir);
    result.push({
      ...p,
      status: loggedIn ? "logged_in" : "not_logged_in",
    });
  }

  return result;
});


ipcMain.handle("openProfile", async (_, profileDir) => {
  const profileName = getProfileDisplayName(profileDir);
  sendLog(`Открытие профиля ${profileName}...`, { color: "gray" });
  if (context) {
    return { status: "already-open" };
  }

  mode = "idle";

  const extensionPath = isDev
  ? path.join(__dirname, "extensions", "inse-mail-finder")
  : path.join(process.resourcesPath, "app.asar.unpacked", "extensions", "inse-mail-finder");

context = await chromium.launchPersistentContext(CHROME_DATA_DIR, {
  headless: false,
  args: [
    "--no-sandbox",
    `--profile-directory=${profileDir}`,
    "--disable-popup-blocking",

    `--disable-extensions-except=${extensionPath}`,
    `--load-extension=${extensionPath}`,
  ],
});


  page = context.pages()[0] || await context.newPage();

  try {
    await page.goto("https://www.instagram.com/");
    sendLog(`Профиль ${profileName} успешно открыт`, { color: "green" });
  } catch (e) {
    console.error("Failed to open Instagram:", e);
    sendLog(`Не удалось открыть профиль ${profileName}`, { color: "green" });
    mailingState.status = "stopping";
    mainWindow?.webContents.send("mailing-state", mailingState);
    await cleanup();
    throw e;
  }
  attachContextCloseHandlers();
  mainWindow?.webContents.send("browser-started");
  return { status: "opened" };
});


ipcMain.handle("deleteProfile", async (_, profileDir) => {
  const statePath = path.join(CHROME_DATA_DIR, "Local State");
  const profilePath = path.join(CHROME_DATA_DIR, profileDir);

  if (context) {
    await context.close();
    context = null;
  }

  if (fs.existsSync(profilePath)) {
    fs.rmSync(profilePath, { recursive: true, force: true });
  }

  if (fs.existsSync(statePath)) {
    const data = JSON.parse(fs.readFileSync(statePath, "utf-8"));

    if (data?.profile?.info_cache?.[profileDir]) {
      delete data.profile.info_cache[profileDir];
      fs.writeFileSync(statePath, JSON.stringify(data, null, 2));
    }
  }

  return { status: "deleted" };
});

function isInstagramLoggedIn(profileDir) {
  return new Promise((resolve) => {
    try {
      const cookiesPath = fs.existsSync(
      path.join(CHROME_DATA_DIR, profileDir, "Network", "Cookies")
    )
      ? path.join(CHROME_DATA_DIR, profileDir, "Network", "Cookies")
      : path.join(CHROME_DATA_DIR, profileDir, "Cookies");

      if (!fs.existsSync(cookiesPath)) {
        return resolve(false);
      }

      const db = new sqlite3.Database(
        cookiesPath,
        sqlite3.OPEN_READONLY,
        (err) => {
          if (err) return resolve(false);
        }
      );

      db.get(
        `
        SELECT value
        FROM cookies
        WHERE host_key LIKE '%instagram.com%'
          AND name = 'sessionid'
        LIMIT 1
        `,
        (err, row) => {
          db.close();
          resolve(!!row);
        }
      );
    } catch (e) {
      resolve(false);
    }
  });
}

async function cleanup() {
  try {
    if (context) {
      await context.close();
    }
    if (browser) {
      await browser.close();
    }
  } catch {}

  browser = null;
  context = null;
  page = null;
  mode = "idle";
  nextMessageTime = 0;
  mailingActive = false;

  mainWindow?.webContents.send("browser-stopped");
  mailingState.status = "stopped";
  mainWindow?.webContents.send("mailing-state", mailingState);
  mainWindow?.webContents.send("chromium-closed");
}

function softStopMailing() {
  mailingActive = false;
  mode = "idle";
  nextMessageTime = 0;

  mailingState.status = "stopped";
  sendMailingState();

  sendLog("Рассылка завершена.", { color: "green" });
}

async function fetchUserPlan(userId) {
  try {
    const res = await axios.get(`${API_URL}/me`, {
      params: { user_id: userId },
      timeout: 10000,
    });

    const data = res.data;

    CURRENT_PLAN = data.plan || "LITE";

    const PLAN_LIMITS = {
      LITE: 1,
      STANDARD: 3,
      ULTIMATE: Infinity,
    };

    PROFILE_LIMIT = PLAN_LIMITS[CURRENT_PLAN] ?? 1;

  } catch (e) {
    CURRENT_PLAN = "LITE";
    PROFILE_LIMIT = 1;
  }
}

function attachContextCloseHandlers() {
  const onPageClose = async () => {
    if (context && context.pages().length === 0) {
      mailingState.status = "stopping";
      mainWindow?.webContents.send("mailing-state", mailingState);
      await cleanup();
    }
  };

  context.pages().forEach(p => p.on("close", onPageClose));
  context.on("page", p => p.on("close", onPageClose));
  context.on("close", async () => {
      console.log("CONTEXT CLOSED");
      browser = null;
      context = null;
      page = null;

      mailingState.status = "stopped";
      sendMailingState();
    });


}
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
app.commandLine.appendSwitch("disable-quic");
app.whenReady().then(() => {
  const playwrightBrowsersPath = app.isPackaged
    ? path.join(process.resourcesPath, "playwright-browsers")
    : path.join(process.cwd(), "playwright-browsers");

  process.env.PLAYWRIGHT_BROWSERS_PATH = playwrightBrowsersPath;

  ({ chromium } = require("playwright-core"));

  createWindow();

  // updater
  autoUpdater.checkForUpdates();

  setInterval(() => {
    autoUpdater.checkForUpdates();
  }, 1 * 60 * 1000);

});
