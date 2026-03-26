import React, { useState, useEffect, useRef } from 'react';
import { Search, Download, ExternalLink, ArrowRightLeft, User, Music, Globe, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { useTheme } from '@/app/context/ThemeContext';

type Status = 'none' | 'green' | 'yellow' | 'red';

interface Contact {
  username: string;
  email: string;
  phone: string;
  followers: string;
  links: string;
  status: Status;
}
interface DatabaseViewProps {
  databaseView: string;
  setDatabaseView: (v: string) => void;
}


export const DatabaseView = ({
  databaseView,
  setDatabaseView
}: DatabaseViewProps) => {
  const [searchQuery, setSearchQuery] = useState('');
const [userFlags, setUserFlags] = useState<{[key: string]: string}>({});
const [profiles, setProfiles] = useState<any[]>([]);
const SERVER_URL = "http://147.45.141.101:8000/api";
const [movingRowId, setMovingRowId] = useState<number | null>(null);
const [movingContactId, setMovingContactId] = useState<number | null>(null);
const viewToProfileType: Record<string, string | null> = {
  artists: "ARTIST",
  producers: "PRODUCER",
  media: "MEDIA",
  undefined: "UNDEFINED",
};
const safeHostname = (link: string) => {
  try {
    const url = link.startsWith("http")
      ? new URL(link)
      : new URL("https://" + link);
    return url.hostname.replace("www.", "");
  } catch {
    return null;
  }
};
const moveProfileTo = async (
  profileId: number,
  target: 'ARTIST' | 'PRODUCER' | 'MEDIA'
) => {
  try {
    const userId = localStorage.getItem('user_id');
    if (!userId) return;

    await fetch(`${SERVER_URL}/profiles/${profileId}/type`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: Number(userId),
        profile_type: target // ✅ ВОТ ТУТ
      })
    });

    // сразу убираем из текущей таблицы
    setProfiles(prev => prev.filter(p => p.id !== profileId));

    setMovingContactId(null);
  } catch (e) {
    console.error('Move profile error', e);
  }
};
const loadProfilesFromDB = async () => {
  const userId = localStorage.getItem("user_id");
  if (!userId) return;

  const type = viewToProfileType[databaseView];

  const url =
    `${SERVER_URL}/profiles?user_id=${userId}` +
    (type ? `&profile_type=${type}` : "");

  const res = await fetch(url);
  const data = await res.json();

  setProfiles([...data]); // ВАЖНО
};

useEffect(() => {
  loadProfilesFromDB();

  const interval = setInterval(() => {
    loadProfilesFromDB();
  }, 2500);

  return () => clearInterval(interval);
}, [databaseView]);
const toggleFlag = (userId: string) => {
  setUserFlags(prev => {
    const cycle: Status[] = ['none', 'green', 'yellow', 'red'];
    const current = (prev[userId] as Status) ?? 'none';
    const next = cycle[(cycle.indexOf(current) + 1) % cycle.length];

    if (next === 'none') {
      const copy = { ...prev };
      delete copy[userId];
      return copy;
    }

    return { ...prev, [userId]: next };
  });
};



const handleExport = () => {
  const data = profiles.map((p: any) => ({
    Username: p.username ?? '',
    Email: p.email ?? '',
    Phone: p.phone ?? '',
    Followers: p.followers ?? '',
    Links: (p.links || []).join(' | '),
    Flag: userFlags[p.id] ?? 'none'
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Database');
  XLSX.writeFile(workbook, 'database.xlsx');
};
const { theme } = useTheme()

  const getStatusColor = (status: Status) => {
    switch (status) {
      case 'green': return 'bg-[#4ade80] shadow-[0_0_8px_rgba(74,222,128,0.4)]';
      case 'yellow': return 'bg-[#facc15] shadow-[0_0_8px_rgba(250,204,21,0.4)]';
      case 'red': return 'bg-[#f87171] shadow-[0_0_8px_rgba(248,113,113,0.4)]';
      default: return theme === 'dark' ? 'bg-white/10 ring ring-white/20' : 'bg-neutral-200 ring ring-neutral-300';
    }
  };

const filteredProfiles = profiles.filter((p) => {
  if (!searchQuery) return true;

  const q = searchQuery.toLowerCase();

  return (
    p.username?.toLowerCase().includes(q) ||
    (p.email || "").toLowerCase().includes(q) ||
    (p.phone || "").includes(q)
  );
});

  return (
    <div className="w-full max-w-[750px] bg-card-bg border border-card-border rounded-[24px] p-6 flex flex-col shadow-2xl animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[16px] font-bold text-text-primary tracking-tight uppercase">Database</h1>
        <button onClick={handleExport} className="p-2 bg-sub-card-bg rounded-xl border border-card-border hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors cursor-pointer">
          <Download size={14} className="text-text-secondary" />
        </button>
      </div>

      <div className="flex gap-2.5 mb-6 overflow-x-auto pb-2 custom-scrollbar">
        {['Artists', 'Producers', 'Media', 'Undefined'].map((filter) => (
          <button
            key={filter}
            onClick={() => setDatabaseView(filter.toLowerCase())}
            className={`px-4 py-1 rounded-full text-[11px] font-bold transition-all duration-300 cursor-pointer h-[28px] flex items-center justify-center ${
              databaseView === filter.toLowerCase()
                ? 'bg-blue-600 text-white border border-white/10'
                : 'text-text-secondary border border-transparent hover:text-text-primary'
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary/50" size={14} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by username, email or phone..."
          className="w-full bg-input-background border border-card-border rounded-xl py-2.5 pl-11 pr-4 text-[11px] text-text-primary placeholder:text-text-secondary/30 focus:outline-none focus:border-blue-500/30 transition-colors"
        />
      </div>

      <div className="overflow-hidden border border-white/[0.03] rounded-2xl flex flex-col h-[320px]">
        <div className="overflow-y-auto hide-scroll flex-1">
          <table className="w-full text-left border-collapse table-fixed">
            <thead className="sticky top-0 z-10">
              <tr className="bg-sub-card-bg border-b border-card-border">
                <th className="w-10 px-3 py-2 text-[9px] font-bold text-text-secondary uppercase tracking-wider"></th>
                <th className="px-4 py-2 text-[9px] font-bold text-text-secondary uppercase tracking-wider">User</th>
                <th className="px-4 py-2 text-[9px] font-bold text-text-secondary uppercase tracking-wider">Email</th>
                <th className="px-4 py-2 text-[9px] font-bold text-text-secondary uppercase tracking-wider">Phone</th>
                <th className="px-4 py-2 text-[9px] font-bold text-text-secondary uppercase tracking-wider">Follow</th>
                <th className="px-4 py-2 text-[9px] font-bold text-text-secondary uppercase tracking-wider">Links</th>
              </tr>
            </thead>
            <tbody>
              {filteredProfiles.map((row: any, i: number) => (
                <tr key={row.id ?? i} className="border-b border-card-border last:border-0 hover:bg-glass-bg transition-colors group">
                  <td className="w-10 px-4 py-1.5 py-0 align-middle">
                    <div className="flex justify-center items-center h-full">
                      {databaseView === 'undefined' ? (
                      <div className="relative">
                        <button
                          onClick={() =>
                            setMovingContactId(
                              movingContactId === row.id ? null : row.id
                            )
                          }
                          className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-300 cursor-pointer border ${
                            movingContactId === row.id
                              ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/30'
                              : 'bg-sub-card-bg border-card-border text-text-secondary hover:text-text-primary hover:border-card-border'
                          }`}
                          title="Move to category"
                        >
                          <ArrowRightLeft size={12} />
                        </button>

                        <AnimatePresence>
                          {movingContactId === row.id && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.9, x: 10 }}
                              animate={{ opacity: 1, scale: 1, x: 25 }}
                              exit={{ opacity: 0, scale: 0.9, x: 10 }}
                              className="absolute left-0 top-1/2 -translate-y-1/2 z-50 bg-card-bg border border-card-border rounded-xl p-1 shadow-2xl flex items-center gap-1 min-w-[120px]"
                            >
                              {(['Artists', 'Producers', 'Media'] as const).map((cat) => (
                                <button
                                  key={cat}
                                  onClick={() => {
                                      moveProfileTo(
                                        row.id,
                                        cat === 'Artists'
                                          ? 'ARTIST'
                                          : cat === 'Producers'
                                          ? 'PRODUCER'
                                          : 'MEDIA'
                                      );
                                    }}
                                  className="p-1.5 hover:bg-blue-600/10 rounded-lg text-text-secondary hover:text-blue-500 transition-colors cursor-pointer group/cat relative"
                                >
                                  {cat === 'Artists' && <User size={14} />}
                                  {cat === 'Producers' && <Music size={14} />}
                                  {cat === 'Media' && <Globe size={14} />}
                                </button>
                              ))}
                              <div className="w-[1px] h-4 bg-card-border mx-0.5" />
                              <button
                                onClick={() => setMovingContactId(null)}
                                className="p-1.5 hover:bg-red-500/10 rounded-lg text-text-secondary hover:text-red-500 transition-colors cursor-pointer"
                              >
                                <X size={14} />
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                        </div>
                      ) : (
                      <button
                        onClick={() => toggleFlag(String(row.id))}
                        className={`w-2 h-2 rounded-full transition-all duration-300 cursor-pointer ${getStatusColor(userFlags[row.id] ?? 'none')}`}

                      />
                    )}
                    </div>
                  </td>
                  <td className="px-4 py-1.5 text-[10px] font-bold text-text-primary truncate">{row.username}</td>
                  <td className="px-4 py-1.5 text-[9px] text-text-secondary truncate">{row.email || "—"}</td>
                  <td className="px-4 py-1.5 text-[9px] text-text-secondary truncate">{row.phone || "—"}</td>
                  <td className="px-4 py-1.5 text-[10px] text-text-primary/70 font-bold">{row.followers ?? "—"}</td>
                  <td className="px-4 py-1.5">
                    {row.links !== '—' ? (
                      <div className="flex items-center gap-1.5 text-[9px] text-blue-400/80 font-medium truncate">
                      <div className="w-3 h-3 flex items-center justify-center shrink-0">
                        <ExternalLink size={9} />
                      </div>
                        {(row.links || []).length > 0 ? (
                          <div className="flex gap-1 flex-wrap">
                            {(row.links || []).map((link: string, i: number) => {
                              const host = safeHostname(link);
                              if (!host) return null;

                              return (
                                <a
                                  key={i}
                                  href={link.startsWith("http") ? link : `https://${link}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-blue-400 text-[9px]"
                                >
                                  {host}
                                </a>
                              );
                            })}
                          </div>
                        ) : (
                          "—"
                        )}
                      </div>
                    ) : (
                      <span className="text-text-secondary/30 text-[9px]">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
