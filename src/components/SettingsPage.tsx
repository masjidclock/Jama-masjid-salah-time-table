import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MasjidConfig,
  minToHHMM,
  toMin,
  fmt12,
  saveConfigToStorage,
  clone,
  computeHijriAndRamadan,
  formatHindiRoza
} from '../utils/prayerLogic';
import {
  Save,
  ArrowLeft,
  Settings as SettingsIcon,
  Clock,
  Calendar,
  Building2,
  MapPin,
  Flame,
  Volume2,
  Check,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface SettingsPageProps {
  config: MasjidConfig;
  onSave: (newConfig: MasjidConfig) => void;
  onClose: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ config, onSave, onClose }) => {
  const [cfg, setCfg] = useState<MasjidConfig>(() => clone(config));
  const [selPage, setSelPage] = useState<'prayer' | 'other' | 'masjid' | 'loc' | 'namaz' | 'ann'>('prayer');
  const [mode, setMode] = useState<'menu' | 'page' | 'edit'>('menu');
  const [activeItemKey, setActiveItemKey] = useState<string>('nb-prayer');
  const [editKey, setEditKey] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  const markDirty = () => {
    setIsDirty(true);
  };

  const handleSave = useCallback(() => {
    saveConfigToStorage(cfg);
    onSave(cfg);
    setIsDirty(false);
    showToast("Settings saved successfully!");
  }, [cfg, onSave]);

  // Adjust numeric or time values
  const adjustValue = useCallback((key: string, delta: number) => {
    markDirty();
    setCfg(prev => {
      const next = clone(prev);
      if (key.startsWith('pr.')) {
        const parts = key.split('.');
        const pIdx = parseInt(parts[1], 10);
        const field = parts[2];
        const prayer = next.prayers[pIdx];
        if (pIdx === 3) {
          // Maghrib special logic:
          // - 'offset' is Sunset offset in minutes (Athan = Sunset + offset when auto is true)
          // - 'jo' is Jama'at offset after Athan (Jama'at = Athan + jo)
          // - 'adhan' is manual Athan time (when auto is false)
          if (field === 'offset') {
            prayer.offset = Math.max(-30, Math.min(60, (prayer.offset ?? 2) + delta));
            if (prayer.auto) {
              prayer.adhan = minToHHMM(toMin(next.sunset) + prayer.offset);
            }
            prayer.jamaat = minToHHMM(toMin(prayer.adhan) + (prayer.jo ?? 5));
          } else if (field === 'jo') {
            prayer.jo = Math.max(0, Math.min(120, (prayer.jo ?? 5) + delta));
            prayer.jamaat = minToHHMM(toMin(prayer.adhan) + prayer.jo);
          } else if (field === 'adhan') {
            const cur = toMin(prayer.adhan);
            prayer.adhan = minToHHMM(cur + delta);
            prayer.jamaat = minToHHMM(toMin(prayer.adhan) + (prayer.jo ?? 5));
          }
        } else {
          if (field === 'adhan') {
            const cur = toMin(prayer.adhan);
            prayer.adhan = minToHHMM(cur + delta);
            // if offset exists, update jamaat
            if (prayer.offset !== undefined) {
              prayer.jamaat = minToHHMM(toMin(prayer.adhan) + prayer.offset);
            }
          } else if (field === 'offset') {
            prayer.offset = Math.max(0, Math.min(120, (prayer.offset ?? 15) + delta));
            prayer.jamaat = minToHHMM(toMin(prayer.adhan) + prayer.offset);
          } else if (field === 'jo') {
            prayer.jo = Math.max(0, Math.min(60, (prayer.jo ?? 5) + delta));
          }
        }
      } else if (key.startsWith('jumuah.')) {
        const field = key.split('.')[1];
        if (field === 'adhan') {
          next.jumah.adhan = minToHHMM(toMin(next.jumah.adhan) + delta);
          if (next.jumah.offset !== undefined) {
            next.jumah.jamaat = minToHHMM(toMin(next.jumah.adhan) + next.jumah.offset);
          }
        } else if (field === 'offset') {
          next.jumah.offset = Math.max(0, Math.min(120, (next.jumah.offset ?? 30) + delta));
          next.jumah.jamaat = minToHHMM(toMin(next.jumah.adhan) + next.jumah.offset);
        }
      } else if (key.startsWith('sp.')) {
        const spKey = key.split('.')[1] as 'fitr' | 'adha' | 'tar';
        next.sp[spKey].time = minToHHMM(toMin(next.sp[spKey].time) + delta * 5);
      } else if (key.startsWith('ram.')) {
        const field = key.split('.')[1];
        if (field === 'sehri' || field === 'iftar') {
          next.ram[field] = minToHHMM(toMin(next.ram[field]) + delta);
        } else if (field === 'rozaDay') {
          const info = computeHijriAndRamadan(new Date(), next.hijriOffset);
          const cur = next.ram.rozaDayOverride ?? info.autoRozaDay;
          next.ram.autoCalc = false;
          next.ram.rozaDayOverride = Math.max(1, Math.min(30, cur + delta));
        } else if (field === 'remDays') {
          const info = computeHijriAndRamadan(new Date(), next.hijriOffset);
          const cur = next.ram.remainingDaysOverride ?? info.autoRemainingDays;
          next.ram.autoCalc = false;
          next.ram.remainingDaysOverride = Math.max(0, Math.min(355, cur + delta));
        }
      } else if (key.startsWith('cd.')) {
        const field = key.split('.')[1] as 'beforeAthanShow' | 'athanCountdown' | 'jamaatCountdown';
        next.cd[field] = Math.max(1, Math.min(60, next.cd[field] + delta));
      } else if (key.startsWith('dur.')) {
        const field = key.split('.')[1] as keyof typeof next.dur;
        next.dur[field] = Math.max(1, Math.min(60, next.dur[field] + delta));
      } else if (key.startsWith('loc.')) {
        const field = key.split('.')[1];
        if (field === 'sunriseOffsetMin') {
          next.loc.sunriseOffsetMin = Math.max(-60, Math.min(60, next.loc.sunriseOffsetMin + delta));
          next.sunriseOffsetMin = next.loc.sunriseOffsetMin;
        } else if (field === 'sunsetOffsetMin') {
          next.loc.sunsetOffsetMin = Math.max(-60, Math.min(60, next.loc.sunsetOffsetMin + delta));
          next.sunsetOffsetMin = next.loc.sunsetOffsetMin;
        } else if (field === 'lat') {
          next.loc.lat = Math.round((next.loc.lat + delta * 0.001) * 1000) / 1000;
          next.lat = next.loc.lat;
        } else if (field === 'lng') {
          next.loc.lng = Math.round((next.loc.lng + delta * 0.001) * 1000) / 1000;
          next.lon = next.loc.lng;
        }
      } else if (key === 'uiScale') {
        next.uiScale = Math.max(50, Math.min(150, next.uiScale + delta * 5));
      }
      return next;
    });
  }, []);

  // Remote keydown handler (Arrow keys, Enter, Esc/Backspace)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in standard text input unless Enter/Escape
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      if (isInput && e.key !== 'Escape' && e.key !== 'Enter') return;

      if (e.key === 'Escape' || e.key === 'Backspace') {
        e.preventDefault();
        if (mode === 'edit') {
          setMode('page');
          setEditKey(null);
        } else if (mode === 'page') {
          setMode('menu');
        } else {
          onClose();
        }
        return;
      }

      if (mode === 'edit' && editKey) {
        if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
          e.preventDefault();
          adjustValue(editKey, 1);
        } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
          e.preventDefault();
          adjustValue(editKey, -1);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          setMode('page');
          setEditKey(null);
        }
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        if (mode === 'menu') {
          setMode('page');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, editKey, adjustValue, onClose]);

  const navItems = [
    { id: 'prayer', label: 'Prayer schedule time', icon: Clock },
    { id: 'other', label: 'Other prayers & Ramadan', icon: Calendar },
    { id: 'masjid', label: 'Masjid information', icon: Building2 },
    { id: 'loc', label: 'Location & APIs', icon: MapPin },
    { id: 'namaz', label: 'Active namaz duration', icon: Flame },
    { id: 'ann', label: 'Announcements', icon: Volume2 },
  ] as const;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-[#02140f]/65 backdrop-blur-xl text-[#f3f7f4] flex flex-col font-sans select-none overflow-hidden"
      style={{
        fontFamily: "'Outfit', 'Roboto', 'Noto Sans Devanagari', sans-serif",
      }}
    >
      {/* Top Bar with Status and Quick Controls */}
      <div className="h-[60px] bg-[#05271f]/75 backdrop-blur-md border-b border-[#14584b]/60 px-6 flex items-center justify-between shrink-0 shadow-md">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#07302a]/90 hover:bg-[#0a3a32] text-amber-400 border border-[#14584b] text-sm font-semibold transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Live TV</span>
          </button>
          <div className="h-5 w-[1px] bg-[#14584b]" />
          <h1 className="text-xl font-bold flex items-center gap-2 text-white">
            <SettingsIcon className="w-5 h-5 text-amber-400" />
            <span>Masjid TV Android TV Settings</span>
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs text-[#a8c4bb] bg-[#04231d]/90 px-3 py-1 rounded-full border border-[#14584b]">
            D-Pad Navigation: <span className="text-amber-400">▲ ▼ ◀ ▶</span> | Select: <span className="text-amber-400">OK</span> | Back: <span className="text-amber-400">ESC</span>
          </div>
          <button
            onClick={handleSave}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg font-bold text-sm cursor-pointer transition shadow-lg ${
              isDirty
                ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-[#2a1c00] ring-2 ring-amber-300'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            <Save className="w-4 h-4" />
            <span>Save All Changes</span>
          </button>
        </div>
      </div>

      {/* Main Settings Body */}
      <div className="flex-1 flex min-h-0">
        {/* Left Sidebar Menu */}
        <div className="w-[225px] bg-[#03251d]/65 backdrop-blur-md border-r border-[#14584b]/60 p-3 flex flex-col gap-2 shrink-0 overflow-y-auto">

          {navItems.map(item => {
            const Icon = item.icon;
            const isSelected = selPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setSelPage(item.id);
                  setMode('page');
                }}
                className={`flex items-center gap-2.5 w-full px-3 py-3 rounded-xl text-left text-[14px] font-semibold transition cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-[#2a1c00] font-bold shadow-md'
                    : 'text-[#f3f7f4] hover:bg-[#0a3a32]'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-[#2a1c00]' : 'text-amber-400'}`} />
                <span className="leading-snug">{item.label}</span>
              </button>
            );
          })}

          <div className="mt-auto pt-4 border-t border-[#14584b] text-xs text-[#a8c4bb] text-center">
            Android TV WebView • v7.0
          </div>
        </div>

        {/* Right Content Area */}
        <div className="flex-1 bg-[#04201a]/45 backdrop-blur-md px-4 py-5 overflow-y-auto min-w-0">
          {/* 1. PRAYER SCHEDULE TIME */}
          {selPage === 'prayer' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" />
                  Daily Prayer Schedule & Offsets
                </h2>
                <p className="text-[#a8c4bb] text-sm mt-1">
                  Configure Athan times, Jamaat offsets, and special sunset-driven automatic Maghrib calculation.
                </p>
              </div>

              <div className="grid grid-cols-5 gap-3 items-start">
                {cfg.prayers.map((p, idx) => {
                  const isMaghrib = idx === 3;

                  if (isMaghrib) {
                    const sunsetTime = fmt12(cfg.sunset);
                    const athanTime = fmt12(p.adhan);
                    const jamaatTime = fmt12(p.jamaat);
                    const sunsetOff = p.offset ?? 2;
                    const jamaatOff = p.jo ?? 5;

                    return (
                      <div
                        key={p.en}
                        className="bg-[#022E24] border border-[#14584b] rounded-2xl p-3.5 flex flex-col justify-between shadow-lg"
                      >
                        {/* Title */}
                        <h3 className="font-extrabold text-[22px] text-white leading-tight mb-2">
                          Maghrib
                        </h3>

                        {/* Automatic (sunset + offset) toggle row */}
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span className="text-[12.5px] font-medium text-[#F3F7F4] leading-snug">
                            Automatic (sunset + offset)
                          </span>
                          <button
                            onClick={() => {
                              markDirty();
                              setCfg(prev => {
                                const next = clone(prev);
                                const m = next.prayers[3];
                                m.auto = !m.auto;
                                if (m.auto) {
                                  const off = m.offset ?? 2;
                                  m.adhan = minToHHMM(toMin(next.sunset) + off);
                                  m.jamaat = minToHHMM(toMin(m.adhan) + (m.jo ?? 5));
                                }
                                return next;
                              });
                            }}
                            className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 flex items-center ${
                              p.auto ? 'bg-[#F7C234]' : 'bg-[#0A4236] border border-[#14584b]'
                            }`}
                          >
                            <span
                              className={`w-4.5 h-4.5 rounded-full transition-transform ${
                                p.auto
                                  ? 'bg-[#2C1B05] translate-x-[22px]'
                                  : 'bg-[#a8c4bb] translate-x-[3px]'
                              }`}
                            />
                          </button>
                        </div>

                        {/* 1. Sunset time (today) */}
                        <div className="bg-[#063B30] rounded-xl p-2.5 mb-2">
                          <span className="text-[12px] font-medium text-[#E2ECE9] block mb-1.5">
                            Sunset time (today)
                          </span>
                          <div className="flex items-center gap-2.5">
                            <div className="bg-[#022019] px-3 py-1.5 rounded-lg">
                              <span className="text-[19px] font-extrabold text-white android-num tracking-tight">
                                {sunsetTime.time}
                              </span>
                            </div>
                            <span className="text-[15px] font-bold text-[#F7C234]">
                              {sunsetTime.period}
                            </span>
                          </div>
                        </div>

                        {/* 2. Offset (minutes) */}
                        <div
                          className={`bg-[#063B30] rounded-xl p-2.5 mb-2 transition-opacity ${
                            !p.auto ? 'opacity-50 pointer-events-none' : ''
                          }`}
                        >
                          <span className="text-[12px] font-medium text-[#E2ECE9] block mb-1.5">
                            Offset (minutes)
                          </span>
                          <div className="flex items-center gap-2">
                            <div className="bg-[#022019] px-3.5 py-1.5 rounded-lg min-w-[76px] text-center">
                              <span className="text-[19px] font-extrabold text-[#F7C234] android-num">
                                {sunsetOff >= 0 ? `+${sunsetOff}m` : `${sunsetOff}m`}
                              </span>
                            </div>
                            <div className="flex flex-col gap-1">
                              <button
                                onClick={() => adjustValue('pr.3.offset', 1)}
                                className="w-7 h-4 bg-[#135346] hover:bg-[#1b6e5d] active:bg-[#F7C234] active:text-black rounded flex items-center justify-center text-white text-[9px] font-bold cursor-pointer transition"
                              >
                                ▲
                              </button>
                              <button
                                onClick={() => adjustValue('pr.3.offset', -1)}
                                className="w-7 h-4 bg-[#135346] hover:bg-[#1b6e5d] active:bg-[#F7C234] active:text-black rounded flex items-center justify-center text-white text-[9px] font-bold cursor-pointer transition"
                              >
                                ▼
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* 3. Athan (auto / manual) */}
                        <div className="bg-[#063B30] rounded-xl p-2.5 mb-2">
                          <span className="text-[12px] font-medium text-[#E2ECE9] block mb-1.5">
                            {p.auto ? 'Athan (auto)' : 'Athan (manual)'}
                          </span>
                          <div className="bg-[#022019] px-3 py-1.5 rounded-lg flex items-center justify-between gap-2">
                            <div className="flex items-baseline gap-2">
                              <span className="text-[19px] font-extrabold text-white android-num tracking-tight">
                                {athanTime.time}
                              </span>
                              <span className="text-[15px] font-bold text-[#F7C234]">
                                {athanTime.period}
                              </span>
                            </div>
                            {!p.auto && (
                              <div className="flex flex-col gap-1">
                                <button
                                  onClick={() => adjustValue('pr.3.adhan', 1)}
                                  className="w-7 h-4 bg-[#135346] hover:bg-[#1b6e5d] active:bg-[#F7C234] active:text-black rounded flex items-center justify-center text-white text-[9px] font-bold cursor-pointer transition"
                                >
                                  ▲
                                </button>
                                <button
                                  onClick={() => adjustValue('pr.3.adhan', -1)}
                                  className="w-7 h-4 bg-[#135346] hover:bg-[#1b6e5d] active:bg-[#F7C234] active:text-black rounded flex items-center justify-center text-white text-[9px] font-bold cursor-pointer transition"
                                >
                                  ▼
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 4. Jama'at offset (after Athan) */}
                        <div className="bg-[#063B30] rounded-xl p-2.5 mb-2">
                          <span className="text-[12px] font-medium text-[#E2ECE9] block mb-1.5">
                            Jama&apos;at offset (after Athan)
                          </span>
                          <div className="flex items-center gap-2">
                            <div className="bg-[#022019] px-3.5 py-1.5 rounded-lg min-w-[76px] text-center">
                              <span className="text-[19px] font-extrabold text-[#F7C234] android-num">
                                +{jamaatOff}m
                              </span>
                            </div>
                            <div className="flex flex-col gap-1">
                              <button
                                onClick={() => adjustValue('pr.3.jo', 1)}
                                className="w-7 h-4 bg-[#135346] hover:bg-[#1b6e5d] active:bg-[#F7C234] active:text-black rounded flex items-center justify-center text-white text-[9px] font-bold cursor-pointer transition"
                              >
                                ▲
                              </button>
                              <button
                                onClick={() => adjustValue('pr.3.jo', -1)}
                                className="w-7 h-4 bg-[#135346] hover:bg-[#1b6e5d] active:bg-[#F7C234] active:text-black rounded flex items-center justify-center text-white text-[9px] font-bold cursor-pointer transition"
                              >
                                ▼
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* 5. Jama'at (Athan + offset) */}
                        <div className="bg-[#063B30] rounded-xl p-2.5">
                          <span className="text-[12px] font-medium text-[#E2ECE9] block mb-1.5">
                            Jama&apos;at (Athan + offset)
                          </span>
                          <div className="flex items-center gap-2.5">
                            <div className="bg-[#022019] px-3 py-1.5 rounded-lg">
                              <span className="text-[19px] font-extrabold text-[#F7C234] android-num tracking-tight">
                                {jamaatTime.time}
                              </span>
                            </div>
                            <span className="text-[15px] font-bold text-[#F7C234]">
                              {jamaatTime.period}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={p.en}
                      className="bg-[#07302a] border border-[#14584b] rounded-xl p-3.5 flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between mb-3 border-b border-[#14584b]/60 pb-2">
                        <div>
                          <h3 className="font-bold text-lg text-white">{p.name}</h3>
                          <span className="text-[11px] text-amber-400/90 tracking-wider font-semibold uppercase">{p.en}</span>
                        </div>
                      </div>

                      {/* Athan Time */}
                      <div className="bg-[#0a3a32] p-2.5 rounded-lg mb-2.5 border border-[#14584b]">
                        <span className="text-xs text-[#a8c4bb] block mb-1">
                          Athan Time
                        </span>
                        <div className="flex items-center justify-between bg-[#04231d] px-2.5 py-1.5 rounded-md">
                          <span className="text-lg font-bold text-amber-400 android-num">
                            {fmt12(p.adhan).time} <span className="text-xs text-[#a8c4bb] font-sans">{fmt12(p.adhan).period}</span>
                          </span>
                          <div className="flex flex-col gap-0.5">
                            <button
                              onClick={() => adjustValue(`pr.${idx}.adhan`, 1)}
                              className="w-6 h-4 bg-[#15493f] hover:bg-amber-400 hover:text-black rounded text-[10px] flex items-center justify-center font-bold"
                            >
                              ▲
                            </button>
                            <button
                              onClick={() => adjustValue(`pr.${idx}.adhan`, -1)}
                              className="w-6 h-4 bg-[#15493f] hover:bg-amber-400 hover:text-black rounded text-[10px] flex items-center justify-center font-bold"
                            >
                              ▼
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Offset to Jamaat */}
                      <div className="bg-[#0a3a32] p-2.5 rounded-lg mb-2.5 border border-[#14584b]">
                        <span className="text-xs text-[#a8c4bb] block mb-1">
                          Jamaat Offset
                        </span>
                        <div className="flex items-center justify-between bg-[#04231d] px-2.5 py-1.5 rounded-md">
                          <span className="text-base font-bold text-emerald-400">
                            +{p.offset ?? 15}m
                          </span>
                          <div className="flex flex-col gap-0.5">
                            <button
                              onClick={() => adjustValue(`pr.${idx}.offset`, 1)}
                              className="w-6 h-4 bg-[#15493f] hover:bg-amber-400 hover:text-black rounded text-[10px] flex items-center justify-center font-bold"
                            >
                              ▲
                            </button>
                            <button
                              onClick={() => adjustValue(`pr.${idx}.offset`, -1)}
                              className="w-6 h-4 bg-[#15493f] hover:bg-amber-400 hover:text-black rounded text-[10px] flex items-center justify-center font-bold"
                            >
                              ▼
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Computed Jamaat */}
                      <div className="bg-[#0a3a32] p-2.5 rounded-lg border border-[#14584b]">
                        <span className="text-xs text-[#a8c4bb] block mb-1">Calculated Jamaat</span>
                        <div className="text-base font-bold text-white android-num bg-[#04231d] px-2.5 py-1.5 rounded-md text-center">
                          {fmt12(p.jamaat).time} <span className="text-xs text-[#a8c4bb] font-sans">{fmt12(p.jamaat).period}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. OTHER PRAYERS & RAMADAN */}
          {selPage === 'other' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" />
                  Jumu'ah, Special Salah, Ramadan & Countdowns
                </h2>
                <p className="text-[#a8c4bb] text-sm mt-1">
                  Configure Friday prayer timings, Taraweeh, Eid, Ramadan Sehri/Iftar and countdown triggers.
                </p>
              </div>

              <div className="grid grid-cols-4 gap-4">
                {/* Jumuah Card */}
                <div className="bg-[#07302a] border border-[#14584b] rounded-xl p-4">
                  <h3 className="font-bold text-lg text-amber-400 mb-3 border-b border-[#14584b] pb-2">Jumu'ah (Friday)</h3>
                  <div className="space-y-3">
                    <div className="bg-[#0a3a32] p-2.5 rounded-lg border border-[#14584b]">
                      <span className="text-xs text-[#a8c4bb] block mb-1">Athan Time</span>
                      <div className="flex items-center justify-between bg-[#04231d] px-2.5 py-1.5 rounded-md">
                        <span className="text-lg font-bold text-amber-400 android-num">{fmt12(cfg.jumah.adhan).time} {fmt12(cfg.jumah.adhan).period}</span>
                        <div className="flex flex-col gap-0.5">
                          <button onClick={() => adjustValue('jumuah.adhan', 1)} className="w-6 h-4 bg-[#15493f] rounded text-[10px] flex items-center justify-center font-bold">▲</button>
                          <button onClick={() => adjustValue('jumuah.adhan', -1)} className="w-6 h-4 bg-[#15493f] rounded text-[10px] flex items-center justify-center font-bold">▼</button>
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#0a3a32] p-2.5 rounded-lg border border-[#14584b]">
                      <span className="text-xs text-[#a8c4bb] block mb-1">Jamaat Offset</span>
                      <div className="flex items-center justify-between bg-[#04231d] px-2.5 py-1.5 rounded-md">
                        <span className="text-base font-bold text-emerald-400">+{cfg.jumah.offset ?? 30}m</span>
                        <div className="flex flex-col gap-0.5">
                          <button onClick={() => adjustValue('jumuah.offset', 1)} className="w-6 h-4 bg-[#15493f] rounded text-[10px] flex items-center justify-center font-bold">▲</button>
                          <button onClick={() => adjustValue('jumuah.offset', -1)} className="w-6 h-4 bg-[#15493f] rounded text-[10px] flex items-center justify-center font-bold">▼</button>
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#0a3a32] p-2.5 rounded-lg border border-[#14584b]">
                      <span className="text-xs text-[#a8c4bb] block mb-1">Calculated Jamaat</span>
                      <div className="text-base font-bold text-white android-num bg-[#04231d] px-2.5 py-1.5 rounded-md text-center">
                        {fmt12(cfg.jumah.jamaat).time} {fmt12(cfg.jumah.jamaat).period}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Special Salah Card */}
                <div className="bg-[#07302a] border border-[#14584b] rounded-xl p-4">
                  <h3 className="font-bold text-lg text-amber-400 mb-3 border-b border-[#14584b] pb-2">Special Salah</h3>
                  <div className="space-y-3">
                    {/* Eid ul Fitr */}
                    <div className="bg-[#0a3a32] p-2.5 rounded-lg border border-[#14584b]">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-white">Eid-ul-Fitr</span>
                        <input
                          type="checkbox"
                          checked={cfg.sp.fitr.on}
                          onChange={(e) => {
                            markDirty();
                            setCfg(prev => {
                              const next = clone(prev);
                              next.sp.fitr.on = e.target.checked;
                              return next;
                            });
                          }}
                          className="accent-amber-400"
                        />
                      </div>
                      <div className="flex items-center justify-between bg-[#04231d] px-2.5 py-1.5 rounded-md">
                        <span className="text-base font-bold text-amber-400 android-num">{fmt12(cfg.sp.fitr.time).time} {fmt12(cfg.sp.fitr.time).period}</span>
                        <div className="flex flex-col gap-0.5">
                          <button onClick={() => adjustValue('sp.fitr', 1)} className="w-6 h-4 bg-[#15493f] rounded text-[10px] flex items-center justify-center font-bold">▲</button>
                          <button onClick={() => adjustValue('sp.fitr', -1)} className="w-6 h-4 bg-[#15493f] rounded text-[10px] flex items-center justify-center font-bold">▼</button>
                        </div>
                      </div>
                    </div>

                    {/* Eid ul Adha */}
                    <div className="bg-[#0a3a32] p-2.5 rounded-lg border border-[#14584b]">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-white">Eid-ul-Adha</span>
                        <input
                          type="checkbox"
                          checked={cfg.sp.adha.on}
                          onChange={(e) => {
                            markDirty();
                            setCfg(prev => {
                              const next = clone(prev);
                              next.sp.adha.on = e.target.checked;
                              return next;
                            });
                          }}
                          className="accent-amber-400"
                        />
                      </div>
                      <div className="flex items-center justify-between bg-[#04231d] px-2.5 py-1.5 rounded-md">
                        <span className="text-base font-bold text-amber-400 android-num">{fmt12(cfg.sp.adha.time).time} {fmt12(cfg.sp.adha.time).period}</span>
                        <div className="flex flex-col gap-0.5">
                          <button onClick={() => adjustValue('sp.adha', 1)} className="w-6 h-4 bg-[#15493f] rounded text-[10px] flex items-center justify-center font-bold">▲</button>
                          <button onClick={() => adjustValue('sp.adha', -1)} className="w-6 h-4 bg-[#15493f] rounded text-[10px] flex items-center justify-center font-bold">▼</button>
                        </div>
                      </div>
                    </div>

                    {/* Taraweeh */}
                    <div className="bg-[#0a3a32] p-2.5 rounded-lg border border-[#14584b]">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-white">Taraweeh</span>
                        <input
                          type="checkbox"
                          checked={cfg.sp.tar.on}
                          onChange={(e) => {
                            markDirty();
                            setCfg(prev => {
                              const next = clone(prev);
                              next.sp.tar.on = e.target.checked;
                              return next;
                            });
                          }}
                          className="accent-amber-400"
                        />
                      </div>
                      <div className="flex items-center justify-between bg-[#04231d] px-2.5 py-1.5 rounded-md">
                        <span className="text-base font-bold text-amber-400 android-num">{fmt12(cfg.sp.tar.time).time} {fmt12(cfg.sp.tar.time).period}</span>
                        <div className="flex flex-col gap-0.5">
                          <button onClick={() => adjustValue('sp.tar', 1)} className="w-6 h-4 bg-[#15493f] rounded text-[10px] flex items-center justify-center font-bold">▲</button>
                          <button onClick={() => adjustValue('sp.tar', -1)} className="w-6 h-4 bg-[#15493f] rounded text-[10px] flex items-center justify-center font-bold">▼</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ramadan Card */}
                {(() => {
                  const ramInfo = computeHijriAndRamadan(new Date(), cfg.hijriOffset);
                  const isAutoRam = cfg.ram.autoCalc !== false;
                  const curRozaDay = !isAutoRam && cfg.ram.rozaDayOverride != null
                    ? cfg.ram.rozaDayOverride
                    : ramInfo.autoRozaDay;
                  const curRemDays = !isAutoRam && cfg.ram.remainingDaysOverride != null
                    ? cfg.ram.remainingDaysOverride
                    : ramInfo.autoRemainingDays;

                  return (
                    <div className="bg-[#07302a] border border-[#14584b] rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3 border-b border-[#14584b] pb-2">
                        <h3 className="font-bold text-lg text-amber-400">Ramadan</h3>
                        <input
                          type="checkbox"
                          checked={cfg.ram.on}
                          onChange={(e) => {
                            markDirty();
                            setCfg(prev => {
                              const next = clone(prev);
                              next.ram.on = e.target.checked;
                              return next;
                            });
                          }}
                          className="accent-amber-400"
                        />
                      </div>

                      <div className="space-y-3">
                        <div className="bg-[#0a3a32] p-2.5 rounded-lg border border-[#14584b]">
                          <span className="text-xs text-[#a8c4bb] block mb-1">Sehri Ends</span>
                          <div className="flex items-center justify-between bg-[#04231d] px-2.5 py-1.5 rounded-md">
                            <span className="text-lg font-bold text-amber-400 android-num">{fmt12(cfg.ram.sehri).time} {fmt12(cfg.ram.sehri).period}</span>
                            <div className="flex flex-col gap-0.5">
                              <button onClick={() => adjustValue('ram.sehri', 1)} className="w-6 h-4 bg-[#15493f] rounded text-[10px] flex items-center justify-center font-bold">▲</button>
                              <button onClick={() => adjustValue('ram.sehri', -1)} className="w-6 h-4 bg-[#15493f] rounded text-[10px] flex items-center justify-center font-bold">▼</button>
                            </div>
                          </div>
                        </div>

                        <div className="bg-[#0a3a32] p-2.5 rounded-lg border border-[#14584b]">
                          <span className="text-xs text-[#a8c4bb] block mb-1">Iftar Time</span>
                          <div className="flex items-center justify-between bg-[#04231d] px-2.5 py-1.5 rounded-md">
                            <span className="text-lg font-bold text-amber-400 android-num">{fmt12(cfg.ram.iftar).time} {fmt12(cfg.ram.iftar).period}</span>
                            <div className="flex flex-col gap-0.5">
                              <button onClick={() => adjustValue('ram.iftar', 1)} className="w-6 h-4 bg-[#15493f] rounded text-[10px] flex items-center justify-center font-bold">▲</button>
                              <button onClick={() => adjustValue('ram.iftar', -1)} className="w-6 h-4 bg-[#15493f] rounded text-[10px] flex items-center justify-center font-bold">▼</button>
                            </div>
                          </div>
                        </div>

                        {/* Automatic Hijri Calculation Toggle */}
                        <div className="flex items-center justify-between gap-2 pt-1">
                          <span className="text-xs font-medium text-[#E2ECE9]">
                            Auto Hijri Day & Countdown
                          </span>
                          <button
                            onClick={() => {
                              markDirty();
                              setCfg(prev => {
                                const next = clone(prev);
                                const nextAuto = next.ram.autoCalc === false;
                                next.ram.autoCalc = nextAuto;
                                if (!nextAuto) {
                                  const info = computeHijriAndRamadan(new Date(), next.hijriOffset);
                                  if (next.ram.rozaDayOverride == null) next.ram.rozaDayOverride = info.autoRozaDay;
                                  if (next.ram.remainingDaysOverride == null) next.ram.remainingDaysOverride = info.autoRemainingDays;
                                }
                                return next;
                              });
                            }}
                            className={`w-10 h-5.5 rounded-full transition-colors relative cursor-pointer shrink-0 flex items-center ${
                              isAutoRam ? 'bg-[#F7C234]' : 'bg-[#0A4236] border border-[#14584b]'
                            }`}
                          >
                            <span
                              className={`w-4 h-4 rounded-full transition-transform ${
                                isAutoRam
                                  ? 'bg-[#2C1B05] translate-x-[20px]'
                                  : 'bg-[#a8c4bb] translate-x-[3px]'
                              }`}
                            />
                          </button>
                        </div>

                        {/* Current Roza Day */}
                        <div className="bg-[#0a3a32] p-2.5 rounded-lg border border-[#14584b]">
                          <span className="text-xs text-[#a8c4bb] block mb-1">
                            आज का रोज़ा ({isAutoRam ? 'Auto Hijri' : 'Manual'})
                          </span>
                          <div className="flex items-center justify-between bg-[#04231d] px-2.5 py-1.5 rounded-md">
                            <span className="text-base font-bold text-amber-400">
                              {formatHindiRoza(curRozaDay)}
                            </span>
                            {!isAutoRam && (
                              <div className="flex flex-col gap-0.5">
                                <button onClick={() => adjustValue('ram.rozaDay', 1)} className="w-6 h-4 bg-[#15493f] rounded text-[10px] flex items-center justify-center font-bold">▲</button>
                                <button onClick={() => adjustValue('ram.rozaDay', -1)} className="w-6 h-4 bg-[#15493f] rounded text-[10px] flex items-center justify-center font-bold">▼</button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Remaining Days */}
                        <div className="bg-[#0a3a32] p-2.5 rounded-lg border border-[#14584b]">
                          <span className="text-xs text-[#a8c4bb] block mb-1">
                            बाक़ी दिन ({isAutoRam ? 'Auto Hijri' : 'Manual'})
                          </span>
                          <div className="flex items-center justify-between bg-[#04231d] px-2.5 py-1.5 rounded-md">
                            <span className="text-base font-bold text-emerald-400">
                              {curRemDays} दिन
                            </span>
                            {!isAutoRam && (
                              <div className="flex flex-col gap-0.5">
                                <button onClick={() => adjustValue('ram.remDays', 1)} className="w-6 h-4 bg-[#15493f] rounded text-[10px] flex items-center justify-center font-bold">▲</button>
                                <button onClick={() => adjustValue('ram.remDays', -1)} className="w-6 h-4 bg-[#15493f] rounded text-[10px] flex items-center justify-center font-bold">▼</button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Countdown Thresholds Card */}
                <div className="bg-[#07302a] border border-[#14584b] rounded-xl p-4">
                  <h3 className="font-bold text-lg text-amber-400 mb-3 border-b border-[#14584b] pb-2">Centre Countdown</h3>
                  <div className="space-y-3">
                    <div className="bg-[#0a3a32] p-2.5 rounded-lg border border-[#14584b]">
                      <span className="text-xs text-[#a8c4bb] block mb-1">Show Athan on Clock</span>
                      <div className="flex items-center justify-between bg-[#04231d] px-2.5 py-1.5 rounded-md">
                        <span className="text-base font-bold text-white">{cfg.cd.beforeAthanShow}m before</span>
                        <div className="flex flex-col gap-0.5">
                          <button onClick={() => adjustValue('cd.beforeAthanShow', 1)} className="w-6 h-4 bg-[#15493f] rounded text-[10px] flex items-center justify-center font-bold">▲</button>
                          <button onClick={() => adjustValue('cd.beforeAthanShow', -1)} className="w-6 h-4 bg-[#15493f] rounded text-[10px] flex items-center justify-center font-bold">▼</button>
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#0a3a32] p-2.5 rounded-lg border border-[#14584b]">
                      <span className="text-xs text-[#a8c4bb] block mb-1">Athan Countdown Start</span>
                      <div className="flex items-center justify-between bg-[#04231d] px-2.5 py-1.5 rounded-md">
                        <span className="text-base font-bold text-amber-400">{cfg.cd.athanCountdown}m remaining</span>
                        <div className="flex flex-col gap-0.5">
                          <button onClick={() => adjustValue('cd.athanCountdown', 1)} className="w-6 h-4 bg-[#15493f] rounded text-[10px] flex items-center justify-center font-bold">▲</button>
                          <button onClick={() => adjustValue('cd.athanCountdown', -1)} className="w-6 h-4 bg-[#15493f] rounded text-[10px] flex items-center justify-center font-bold">▼</button>
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#0a3a32] p-2.5 rounded-lg border border-[#14584b]">
                      <span className="text-xs text-[#a8c4bb] block mb-1">Jamaat Countdown Start</span>
                      <div className="flex items-center justify-between bg-[#04231d] px-2.5 py-1.5 rounded-md">
                        <span className="text-base font-bold text-emerald-400">{cfg.cd.jamaatCountdown}m remaining</span>
                        <div className="flex flex-col gap-0.5">
                          <button onClick={() => adjustValue('cd.jamaatCountdown', 1)} className="w-6 h-4 bg-[#15493f] rounded text-[10px] flex items-center justify-center font-bold">▲</button>
                          <button onClick={() => adjustValue('cd.jamaatCountdown', -1)} className="w-6 h-4 bg-[#15493f] rounded text-[10px] flex items-center justify-center font-bold">▼</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. MASJID INFORMATION */}
          {selPage === 'masjid' && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" />
                  Masjid Details & Scaling
                </h2>
                <p className="text-[#a8c4bb] text-sm mt-1">
                  Edit the Masjid name displayed at the top of the screen and fine-tune display scaling.
                </p>
              </div>

              <div className="bg-[#07302a] border border-[#14584b] p-5 rounded-xl space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#a8c4bb] uppercase tracking-wider mb-1.5">
                    Masjid Name
                  </label>
                  <input
                    type="text"
                    value={cfg.masjid}
                    onChange={(e) => {
                      markDirty();
                      setCfg(prev => ({ ...prev, masjid: e.target.value }));
                    }}
                    className="w-full bg-[#04231d] border border-[#14584b] rounded-lg px-4 py-2.5 text-white font-semibold focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#a8c4bb] uppercase tracking-wider mb-1.5">
                    Subtitle / Area
                  </label>
                  <input
                    type="text"
                    value={cfg.masjidSub}
                    onChange={(e) => {
                      markDirty();
                      setCfg(prev => ({ ...prev, masjidSub: e.target.value }));
                    }}
                    className="w-full bg-[#04231d] border border-[#14584b] rounded-lg px-4 py-2.5 text-white font-semibold focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#a8c4bb] uppercase tracking-wider mb-1.5">
                    Full Address
                  </label>
                  <input
                    type="text"
                    value={cfg.masjidAddr}
                    onChange={(e) => {
                      markDirty();
                      setCfg(prev => ({ ...prev, masjidAddr: e.target.value }));
                    }}
                    className="w-full bg-[#04231d] border border-[#14584b] rounded-lg px-4 py-2.5 text-white font-semibold focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#a8c4bb] uppercase tracking-wider mb-1.5">
                    Display Scale ({cfg.uiScale}%)
                  </label>
                  <div className="flex items-center gap-4 bg-[#0a3a32] p-3 rounded-lg border border-[#14584b]">
                    <span className="text-lg font-bold text-amber-400">{cfg.uiScale}%</span>
                    <input
                      type="range"
                      min="75"
                      max="125"
                      step="5"
                      value={cfg.uiScale}
                      onChange={(e) => {
                        markDirty();
                        setCfg(prev => ({ ...prev, uiScale: parseInt(e.target.value, 10) }));
                      }}
                      className="flex-1 accent-amber-400"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 4. LOCATION & APIS */}
          {selPage === 'loc' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" />
                  Location, Astronomical & Weather APIs
                </h2>
                <p className="text-[#a8c4bb] text-sm mt-1">
                  Configure coordinates, calculation methods, and fine-tune sunrise/sunset minute offsets.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Location Coordinates & Offsets */}
                <div className="bg-[#07302a] border border-[#14584b] p-5 rounded-xl space-y-4">
                  <h3 className="font-bold text-lg text-amber-400 border-b border-[#14584b] pb-2">Coordinates & Offsets</h3>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-[#a8c4bb] mb-1">Latitude</label>
                      <input
                        type="number"
                        step="0.0001"
                        value={cfg.loc.lat}
                        onChange={(e) => {
                          markDirty();
                          const v = parseFloat(e.target.value);
                          setCfg(prev => ({ ...prev, lat: v, loc: { ...prev.loc, lat: v } }));
                        }}
                        className="w-full bg-[#04231d] border border-[#14584b] rounded-lg px-3 py-2 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#a8c4bb] mb-1">Longitude</label>
                      <input
                        type="number"
                        step="0.0001"
                        value={cfg.loc.lng}
                        onChange={(e) => {
                          markDirty();
                          const v = parseFloat(e.target.value);
                          setCfg(prev => ({ ...prev, lon: v, loc: { ...prev.loc, lng: v } }));
                        }}
                        className="w-full bg-[#04231d] border border-[#14584b] rounded-lg px-3 py-2 text-white font-mono"
                      />
                    </div>
                  </div>

                  <div className="bg-[#0a3a32] p-3 rounded-lg border border-[#14584b] space-y-3">
                    <span className="text-xs font-semibold text-amber-300 block">Sunrise & Sunset User Offsets (-/+ Minutes)</span>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white">Sunrise Offset:</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-amber-400">{cfg.loc.sunriseOffsetMin >= 0 ? `+${cfg.loc.sunriseOffsetMin}` : cfg.loc.sunriseOffsetMin} min</span>
                        <div className="flex gap-1">
                          <button onClick={() => adjustValue('loc.sunriseOffsetMin', 1)} className="px-2 py-0.5 bg-[#15493f] rounded text-xs font-bold">▲</button>
                          <button onClick={() => adjustValue('loc.sunriseOffsetMin', -1)} className="px-2 py-0.5 bg-[#15493f] rounded text-xs font-bold">▼</button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white">Sunset Offset:</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-amber-400">{cfg.loc.sunsetOffsetMin >= 0 ? `+${cfg.loc.sunsetOffsetMin}` : cfg.loc.sunsetOffsetMin} min</span>
                        <div className="flex gap-1">
                          <button onClick={() => adjustValue('loc.sunsetOffsetMin', 1)} className="px-2 py-0.5 bg-[#15493f] rounded text-xs font-bold">▲</button>
                          <button onClick={() => adjustValue('loc.sunsetOffsetMin', -1)} className="px-2 py-0.5 bg-[#15493f] rounded text-xs font-bold">▼</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* API Providers & Jurisprudence */}
                <div className="bg-[#07302a] border border-[#14584b] p-5 rounded-xl space-y-4">
                  <h3 className="font-bold text-lg text-amber-400 border-b border-[#14584b] pb-2">API Configurations</h3>

                  <div>
                    <label className="block text-xs text-[#a8c4bb] mb-1">Prayer API Method</label>
                    <select
                      value={cfg.api.method}
                      onChange={(e) => {
                        markDirty();
                        setCfg(prev => ({ ...prev, api: { ...prev.api, method: e.target.value } }));
                      }}
                      className="w-full bg-[#04231d] border border-[#14584b] rounded-lg px-3 py-2 text-white text-sm"
                    >
                      <option value="1">1 - University of Islamic Sciences, Karachi (India/Pakistan)</option>
                      <option value="2">2 - Islamic Society of North America (ISNA)</option>
                      <option value="3">3 - Muslim World League</option>
                      <option value="4">4 - Umm Al-Qura University, Makkah</option>
                      <option value="5">5 - Egyptian General Authority of Survey</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-[#a8c4bb] mb-1">School of Jurisprudence (Asr)</label>
                    <select
                      value={cfg.api.school}
                      onChange={(e) => {
                        markDirty();
                        setCfg(prev => ({ ...prev, api: { ...prev.api, school: e.target.value } }));
                      }}
                      className="w-full bg-[#04231d] border border-[#14584b] rounded-lg px-3 py-2 text-white text-sm"
                    >
                      <option value="1">1 - Hanafi (Standard in South Asia)</option>
                      <option value="0">0 - Shafi / Maliki / Hanbali</option>
                    </select>
                  </div>

                  <div className="text-xs text-[#a8c4bb] bg-[#0a3a32] p-3 rounded-lg border border-[#14584b]">
                    Connected APIs: <strong className="text-white">sunrise-sunset.org</strong>, <strong className="text-white">open-meteo.com</strong>, and <strong className="text-white">aladhan.com</strong>.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 5. ACTIVE NAMAZ DURATION */}
          {selPage === 'namaz' && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" />
                  Active Namaz Duration (Minutes)
                </h2>
                <p className="text-[#a8c4bb] text-sm mt-1">
                  Configure how long the "JAMAAT IN PROGRESS" screen stays displayed after each prayer's Jamaat starts.
                </p>
              </div>

              <div className="bg-[#07302a] border border-[#14584b] p-5 rounded-xl space-y-3">
                {([
                  ['fajr', 'फ़ज्र (Fajr)'],
                  ['dhuhr', 'ज़ोहर (Dhuhr)'],
                  ['asr', 'अस्र (Asr)'],
                  ['maghrib', 'मग़रिब (Maghrib)'],
                  ['isha', 'इशा (Isha)'],
                  ['jumuah', 'जुमा (Jumu\'ah)'],
                ] as const).map(([key, label]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between bg-[#0a3a32] p-3.5 rounded-lg border border-[#14584b]"
                  >
                    <span className="font-semibold text-white text-base">{label}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xl font-bold text-amber-400 android-num">
                        {cfg.dur[key]} <span className="text-xs text-[#a8c4bb] font-sans">min</span>
                      </span>
                      <div className="flex flex-col gap-0.5">
                        <button
                          onClick={() => adjustValue(`dur.${key}`, 1)}
                          className="w-7 h-5 bg-[#15493f] hover:bg-amber-400 hover:text-black rounded text-xs flex items-center justify-center font-bold"
                        >
                          ▲
                        </button>
                        <button
                          onClick={() => adjustValue(`dur.${key}`, -1)}
                          className="w-7 h-5 bg-[#15493f] hover:bg-amber-400 hover:text-black rounded text-xs flex items-center justify-center font-bold"
                        >
                          ▼
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 6. ANNOUNCEMENTS */}
          {selPage === 'ann' && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" />
                  Announcements & Ticker
                </h2>
                <p className="text-[#a8c4bb] text-sm mt-1">
                  Manage announcement messages shown on the bottom marquee ticker of the main screen.
                </p>
              </div>

              <div className="bg-[#07302a] border border-[#14584b] p-5 rounded-xl space-y-4">
                <div className="flex items-center justify-between bg-[#0a3a32] p-3 rounded-lg border border-[#14584b]">
                  <span className="font-semibold text-white">Enable Bottom Ticker Announcements</span>
                  <input
                    type="checkbox"
                    checked={cfg.annEnabled}
                    onChange={(e) => {
                      markDirty();
                      setCfg(prev => ({ ...prev, annEnabled: e.target.checked }));
                    }}
                    className="accent-amber-400 w-5 h-5 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#a8c4bb] uppercase tracking-wider mb-1.5">
                    Announcement Message
                  </label>
                  <textarea
                    rows={3}
                    maxLength={200}
                    value={cfg.annText}
                    onChange={(e) => {
                      markDirty();
                      setCfg(prev => ({ ...prev, annText: e.target.value }));
                    }}
                    className="w-full bg-[#04231d] border border-[#14584b] rounded-lg p-3 text-white font-medium focus:outline-none focus:border-amber-400 resize-none text-sm"
                  />
                  <div className="text-right text-xs text-[#a8c4bb] mt-1">
                    {cfg.annText.length}/200
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#a8c4bb] uppercase tracking-wider mb-2">
                    Quick Preset Messages
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      "Welcome to our Masjid. Please maintain silence in the mosque.",
                      "Please switch off or silence mobile phones during prayer.",
                      "Please straighten the rows and fill all gaps in the rows.",
                      "Jumu'ah khutbah will begin promptly. Please be seated.",
                      "Please keep the Masjid and ablution area clean.",
                      "Please place footwear responsibly on the shoe racks."
                    ].map(preset => (
                      <button
                        key={preset}
                        onClick={() => {
                          markDirty();
                          setCfg(prev => ({ ...prev, annText: preset }));
                        }}
                        className="text-left text-xs bg-[#0a3a32] hover:bg-[#14584b] p-2.5 rounded-lg border border-[#14584b] text-[#f3f7f4] transition"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-amber-400 text-[#2a1c00] px-6 py-2.5 rounded-xl font-bold shadow-2xl flex items-center gap-2 animate-bounce">
          <Check className="w-5 h-5" />
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
};
