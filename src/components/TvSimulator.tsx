import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  MasjidConfig,
  toMin,
  fmt12,
  minToHHMM,
  untilSeconds,
  getPrayerIndices,
  PrayerTime,
  fetchSunriseSunset,
  fetchOpenMeteoWeather,
  fetchAlAdhanTimings,
  WeatherData,
  saveConfigToStorage,
  loadConfigFromStorage,
  computeHijriAndRamadan,
  formatHindiRoza
} from '../utils/prayerLogic';
import { tvAudio } from '../utils/audioEngine';
import { SettingsPage } from './SettingsPage';
import {
  Volume2,
  VolumeX,
  Tv,
  RotateCcw,
  Sparkles,
  ShieldAlert,
  Play,
  Clock,
  Compass,
  Info,
  Settings as SettingsIcon,
  Moon,
  Sun,
  Wind,
  Droplets,
  Thermometer,
  Layers,
  Sliders,
  Smartphone,
  CheckCircle2,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';

export const SunriseIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="sunriseSunGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#FFF785" />
        <stop offset="100%" stopColor="#FFA000" />
      </linearGradient>
    </defs>
    {/* Horizon line */}
    <path
      d="M2.5 19h19"
      stroke="#FFC933"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
    {/* Rising Sun Disk */}
    <path
      d="M6.5 19a5.5 5.5 0 0 1 11 0Z"
      fill="url(#sunriseSunGrad)"
      stroke="#FFC933"
      strokeWidth="1.2"
    />
    {/* Radiant Morning Sunbeams */}
    <path
      d="M4 14l2 1m14-1l-2 1M5 9l2 1.8m12-1.8l-2 1.8"
      stroke="#FFD54F"
      strokeWidth="1.9"
      strokeLinecap="round"
    />
    {/* Prominent UP Rising Arrow */}
    <path
      d="M12 11.5V3m-3.2 3.2L12 3l3.2 3.2"
      stroke="#FFF9A6"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const SunsetIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="sunsetSunGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#FFB075" />
        <stop offset="100%" stopColor="#FF4D00" />
      </linearGradient>
    </defs>
    {/* Horizon line */}
    <path
      d="M2.5 19h19"
      stroke="#FF7A30"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
    {/* Setting Sun Disk */}
    <path
      d="M6.5 19a5.5 5.5 0 0 1 11 0Z"
      fill="url(#sunsetSunGrad)"
      stroke="#FF7A30"
      strokeWidth="1.2"
    />
    {/* Sinking Twilight Sunbeams */}
    <path
      d="M4 14l2 1m14-1l-2 1M5 9l2 1.8m12-1.8l-2 1.8"
      stroke="#FF9E66"
      strokeWidth="1.9"
      strokeLinecap="round"
    />
    {/* Prominent DOWN Setting Arrow pointing into horizon */}
    <path
      d="M12 3v8.5m-3.2-3.2L12 11.5l3.2-3.2"
      stroke="#FFD1B3"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

interface TvSimulatorProps {
  config: MasjidConfig;
  onOpenConfig?: () => void;
}

export const TvSimulator: React.FC<TvSimulatorProps> = ({ config: propConfig, onOpenConfig }) => {
  // Live Config loaded from localStorage or props
  const [config, setConfig] = useState<MasjidConfig>(() => loadConfigFromStorage());

  // Keep synced if prop changes
  useEffect(() => {
    setConfig(loadConfigFromStorage());
  }, []);

  // Simulator operational mode:
  // 0: Live normal dashboard (runs authentic 20m Athan notice -> 3m countdown -> active namaz sequence)
  // 1: 1:30 Countdown (90 seconds demo)
  // 2: Jamaat in progress preview
  // 3: Rapid 30s demo countdown (looping with tick & bell)
  // 4: Splash screen preview
  const [mode, setMode] = useState<number>(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [showRemoteBar, setShowRemoteBar] = useState<boolean>(false);

  const [countdown90Secs, setCountdown90Secs] = useState<number>(90);
  const [splashVisible, setSplashVisible] = useState<boolean>(false);
  const [splashAnimPhase, setSplashAnimPhase] = useState<number>(0);
  const [showSafeZone, setShowSafeZone] = useState<boolean>(false);
  const [showDimensions, setShowDimensions] = useState<boolean>(false);
  const [enableDust, setEnableDust] = useState<boolean>(true);
  const [frontDustLevel, setFrontDustLevel] = useState<number>(50);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [timeMultiplier, setTimeMultiplier] = useState<number>(1);
  const [manualTimeOffsetSec, setManualTimeOffsetSec] = useState<number>(0);
  const [cardOpacity, setCardOpacity] = useState<number>(85);
  const cardBgStyle = useMemo(() => ({ backgroundColor: `rgba(7, 24, 18, ${cardOpacity / 100})` }), [cardOpacity]);

  // Real API states
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [alAdhanData, setAlAdhanData] = useState<any>(null);
  const [rawSunrise, setRawSunrise] = useState<string>("05:48");
  const [rawSunset, setRawSunset] = useState<string>("17:14");

  // Left card auto-cycling slide index
  const [leftSlideIndex, setLeftSlideIndex] = useState<number>(0);

  // Container dimensions for 960x540 DP scaling
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState<number>(1);

  useEffect(() => {
    const updateScale = () => {
      if (frameRef.current) {
        const rect = frameRef.current.getBoundingClientRect();
        const s = rect.width / 960;
        setScale(s);
      }
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  // Keyboard shortcut to open settings (Key 'S', 'M', or F2)
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 's' || e.key === 'S' || e.key === 'm' || e.key === 'M' || e.key === 'F2') {
        e.preventDefault();
        setIsSettingsOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // Simulated live clock
  const [simulatedDate, setSimulatedDate] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setSimulatedDate((prev) => {
        const next = new Date(prev.getTime() + 1000);
        return next;
      });
    }, Math.max(33, Math.round(1000 / timeMultiplier)));
    return () => clearInterval(timer);
  }, [timeMultiplier]);

  // Fetch real Sunrise & Sunset API (https://api.sunrise-sunset.org/v2)
  useEffect(() => {
    let active = true;
    async function loadSunTimes() {
      const data = await fetchSunriseSunset(
        config.loc.lat,
        config.loc.lng,
        config.loc.sunriseOffsetMin,
        config.loc.sunsetOffsetMin
      );
      if (data && active) {
        setRawSunrise(data.rawSunrise);
        setRawSunset(data.rawSunset);
        setConfig(prev => {
          const next = { ...prev, sunrise: data.sunrise, sunset: data.sunset };
          // If Maghrib is in auto mode, update Maghrib Athan and Jamaat according to sunset + configured offset
          if (next.prayers[3]?.auto) {
            const ssMin = toMin(data.sunset);
            const maghribOffset = next.prayers[3].offset ?? 2;
            const athanMin = ssMin + maghribOffset;
            next.prayers[3].adhan = minToHHMM(athanMin);
            const jo = next.prayers[3].jo ?? 5;
            next.prayers[3].jamaat = minToHHMM(athanMin + jo);
          }
          return next;
        });
      }
    }
    loadSunTimes();
    const interval = setInterval(loadSunTimes, 60 * 60 * 1000); // Hourly check
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [config.loc.lat, config.loc.lng, config.loc.sunriseOffsetMin, config.loc.sunsetOffsetMin]);

  // Fetch real Open-Meteo Weather API
  useEffect(() => {
    let active = true;
    async function loadWeather() {
      const wx = await fetchOpenMeteoWeather(config.loc.lat, config.loc.lng);
      if (wx && active) {
        setWeatherData(wx);
      }
    }
    loadWeather();
    const interval = setInterval(loadWeather, 15 * 60 * 1000); // 15 mins check
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [config.loc.lat, config.loc.lng]);

  // Fetch real AlAdhan API prayer start/end timings
  useEffect(() => {
    let active = true;
    async function loadAlAdhan() {
      const res = await fetchAlAdhanTimings(config.loc.lat, config.loc.lng, config.api.method, config.api.school);
      if (res && active) {
        setAlAdhanData(res);
      }
    }
    loadAlAdhan();
    const interval = setInterval(loadAlAdhan, 60 * 60 * 1000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [config.loc.lat, config.loc.lng, config.api.method, config.api.school]);

  const toggleMute = () => {
    tvAudio.unlock();
    const next = !isMuted;
    setIsMuted(next);
    tvAudio.setMuted(next);
  };

  // Active time in seconds of day
  const nowSec = useMemo(() => {
    const s =
      simulatedDate.getHours() * 3600 +
      simulatedDate.getMinutes() * 60 +
      simulatedDate.getSeconds() +
      manualTimeOffsetSec;
    return ((s % 86400) + 86400) % 86400;
  }, [simulatedDate, manualTimeOffsetSec]);

  const nowMin = nowSec / 60;
  const isFriday = simulatedDate.getDay() === 5;

  // Prayer calculations
  const prayers = config.prayers;
  const { currentIndex: curIndex, nextIndex: nxtIndex } = useMemo(
    () => getPrayerIndices(prayers, nowMin),
    [prayers, nowMin]
  );
  const curPrayer = prayers[curIndex];
  const nxtPrayer = prayers[nxtIndex];

  // Nearest Jamaat
  const nearestJamaat = useMemo(() => {
    let best = prayers[0];
    let minDiff = Infinity;
    prayers.forEach((p) => {
      const diff = untilSeconds(p.jamaat, nowSec);
      if (diff < minDiff) {
        minDiff = diff;
        best = p;
      }
    });
    return { prayer: best, diff: minDiff };
  }, [prayers, nowSec]);

  // Center card event: follows sequence
  // 1. When next prayer's Athan is <= beforeAthanShow mins away (and before next Jamaat): display Athan & countdown to Athan.
  // 2. Otherwise: display Jamaat & countdown to Jamaat.
  // On Fridays: Jumu'ah replaces Dhuhr!
  const centerEvent = useMemo(() => {
    const activePrayers = isFriday
      ? prayers.map((p, idx) => (idx === 1 ? config.jumah : p))
      : prayers;

    let bestJamaat = activePrayers[0];
    let bestAthan = activePrayers[0];
    let minJ = Infinity;
    let minA = Infinity;
    activePrayers.forEach((p) => {
      const dj = (toMin(p.jamaat) * 60 - nowSec + 86400) % 86400;
      if (dj < minJ) {
        minJ = dj;
        bestJamaat = p;
      }
      const da = (toMin(p.adhan) * 60 - nowSec + 86400) % 86400;
      if (da < minA) {
        minA = da;
        bestAthan = p;
      }
    });

    const useAthan = minA <= config.cd.beforeAthanShow * 60 && (minA < minJ || minA === 0);
    return {
      prayer: useAthan ? bestAthan : bestJamaat,
      seconds: useAthan ? minA : minJ,
      type: useAthan ? ('ATHAN' as const) : ('JAMAAT' as const),
      timeStr: useAthan ? bestAthan.adhan : bestJamaat.jamaat,
    };
  }, [prayers, nowSec, isFriday, config.jumah, config.cd.beforeAthanShow]);

  // Active Namaz Duration for current prayer
  const curPrayerKey = (['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'][curIndex] || 'dhuhr') as keyof typeof config.dur;
  const activeDurationMinutes = isFriday && curPrayerKey === 'dhuhr'
    ? config.dur.jumuah
    : (config.dur[curPrayerKey] ?? 5);
  const jamaatDurationSec = activeDurationMinutes * 60;

  // Natural Active Namaz Detection
  const naturalActive = useMemo(() => {
    const prayerList = isFriday
      ? prayers.map(p => p.en === 'DHUHR' ? config.jumah : p)
      : prayers;

    for (const p of prayerList) {
      const elapsed = ((nowSec - toMin(p.jamaat) * 60 + 86400) % 86400);
      // Start active screen 2 seconds after Jamaat hits 00:00 so 00:00 is clearly displayed and the bell chime plays on the Countdown screen
      if (elapsed >= 2 && elapsed <= jamaatDurationSec) {
        return { prayer: p, remaining: jamaatDurationSec - elapsed + 1 };
      }
    }
    return null;
  }, [prayers, nowSec, jamaatDurationSec, isFriday, config.jumah]);

  // Natural Countdown Detection based on thresholds
  // 1. Athan Countdown: When athanCountdown minutes remain until Athan (down to 00:00), show countdown clock
  // 2. Jamaat Countdown: When jamaatCountdown minutes remain until Jamaat (down to 00:00), show countdown clock
  const naturalCountdown = useMemo(() => {
    if (naturalActive) return null;
    const athanLeadSec = config.cd.athanCountdown * 60;
    const jamaatLeadSec = config.cd.jamaatCountdown * 60;

    const prayerList = isFriday
      ? prayers.map(p => p.en === 'DHUHR' ? config.jumah : p)
      : prayers;

    let bestMatch: { prayer: PrayerTime; type: 'ATHAN' | 'JAMAAT'; remainingSecs: number; spanSecs: number } | null = null;

    for (const p of prayerList) {
      const athanSec = toMin(p.adhan) * 60;
      const jamaatSec = toMin(p.jamaat) * 60;
      const diffA = (athanSec - nowSec + 86400) % 86400;
      const elapsedA = (nowSec - athanSec + 86400) % 86400;
      const diffJ = (jamaatSec - nowSec + 86400) % 86400;
      const elapsedJ = (nowSec - jamaatSec + 86400) % 86400;

      // Hold ATHAN at 00:00 for 1-2 seconds when Athan hits 00:00 so 00:00 is always displayed and bell always rings
      if (elapsedA === 0 || elapsedA === 1) {
        return { prayer: p, type: 'ATHAN' as const, remainingSecs: 0, spanSecs: athanLeadSec };
      }
      // Hold JAMAAT at 00:00 for 1-2 seconds when Jamaat hits 00:00 before Active Namaz starts
      if (elapsedJ === 0 || elapsedJ === 1) {
        return { prayer: p, type: 'JAMAAT' as const, remainingSecs: 0, spanSecs: jamaatLeadSec };
      }
      // Check Athan first when Athan is within lead window and before Jamaat
      if (diffA <= athanLeadSec && diffA <= diffJ) {
        if (!bestMatch || diffA < bestMatch.remainingSecs) {
          bestMatch = { prayer: p, type: 'ATHAN' as const, remainingSecs: diffA, spanSecs: athanLeadSec };
        }
      } else if (diffJ <= jamaatLeadSec) {
        if (!bestMatch || diffJ < bestMatch.remainingSecs) {
          bestMatch = { prayer: p, type: 'JAMAAT' as const, remainingSecs: diffJ, spanSecs: jamaatLeadSec };
        }
      }
    }
    return bestMatch;
  }, [naturalActive, config.cd.athanCountdown, config.cd.jamaatCountdown, prayers, isFriday, config.jumah, nowSec]);

  // 1:30 Countdown Timer (90 seconds live countdown demo)
  useEffect(() => {
    if (mode !== 1) return;
    const interval = setInterval(() => {
      setCountdown90Secs((prev) => {
        if (prev <= 0) {
          return 90; // Loops after 0:00 chime
        }
        return prev - 1;
      });
    }, 1000 / timeMultiplier);
    return () => clearInterval(interval);
  }, [mode, timeMultiplier]);

  const [demo30Secs, setDemo30Secs] = useState<number>(30);
  useEffect(() => {
    if (mode !== 3) return;
    const interval = setInterval(() => {
      setDemo30Secs((prev) => {
        if (prev <= 0) {
          return 30;
        }
        return prev - 1;
      });
    }, 1000 / timeMultiplier);
    return () => clearInterval(interval);
  }, [mode, timeMultiplier]);

  // Screen selection logic:
  // Mode 0: Locked to Main Dashboard (never kicked off by prayer schedules)
  // Mode 5: Live Auto-Sequence (automatically switches to Countdown & Jamaat Active when clock matches prayer times)
  // Mode 1: 1:30 Countdown Preview
  // Mode 2: Jamaat Active Preview
  // Mode 3: 30s Countdown Test
  const isCountdownActive =
    mode === 1 ||
    mode === 3 ||
    (mode === 5 && !!naturalCountdown);

  const isActiveScreen = mode === 2 || (mode === 5 && !!naturalActive);

  const countdownTargetPrayer = naturalCountdown ? naturalCountdown.prayer : centerEvent.prayer;
  const countdownType = naturalCountdown ? naturalCountdown.type : centerEvent.type;

  const countdownRemaining = useMemo(() => {
    if (mode === 3) return demo30Secs;
    if (mode === 1) return countdown90Secs;
    if (naturalCountdown) return naturalCountdown.remainingSecs;
    return centerEvent.seconds;
  }, [mode, demo30Secs, countdown90Secs, naturalCountdown, centerEvent.seconds]);

  const countdownSpan = mode === 3 ? 30 : mode === 1 ? 90 : (naturalCountdown ? naturalCountdown.spanSecs : config.cd.jamaatCountdown * 60);
  const isLastMinute = countdownRemaining <= 60;

  const activeRemainingSecs = useMemo(() => {
    if (mode === 2) return countdown90Secs;
    if (naturalActive) return naturalActive.remaining;
    return activeDurationMinutes * 60;
  }, [mode, countdown90Secs, naturalActive, activeDurationMinutes]);

  // Synchronized audio for tick and double bell chime at 00:00 (for both Athan and Jamaat in all modes)
  const lastTickRef = useRef<number>(-1);
  const prevSecRef = useRef<number>(-1);
  const prevTypeRef = useRef<string>('');
  const prevCenterSecRef = useRef<number>(-1);
  const prevCenterTypeRef = useRef<string>('');
  const prevNowSecRef = useRef<number>(-1);

  // 1. Countdown Page tick & zero-hit bell (Auto Mode, 1:30 Countdown, 30s Test)
  useEffect(() => {
    if (!isCountdownActive) {
      if (prevSecRef.current >= 1 && prevSecRef.current <= 10) {
        tvAudio.playBell();
      }
      lastTickRef.current = -1;
      prevSecRef.current = -1;
      prevTypeRef.current = '';
      return;
    }
    const s = countdownRemaining;
    // Play bell if countdown reached 0, or wrapped/switched right after reaching final seconds
    if (
      (s === 0 && prevSecRef.current !== 0) ||
      (prevSecRef.current >= 1 && prevSecRef.current <= 10 && s > prevSecRef.current) ||
      (prevTypeRef.current !== '' && prevTypeRef.current !== countdownType && prevSecRef.current >= 1 && prevSecRef.current <= 10)
    ) {
      tvAudio.playBell();
    }
    if (s >= 1 && s <= 59 && s !== lastTickRef.current) {
      tvAudio.playTick(s % 2 === 0);
      lastTickRef.current = s;
    }
    prevSecRef.current = s;
    prevTypeRef.current = countdownType;
  }, [isCountdownActive, countdownRemaining, countdownType]);

  // 2. Main Screen Center Card countdown clock zero-hit bell (for both Athan and Jamaat)
  useEffect(() => {
    const cs = centerEvent.seconds;
    const ct = centerEvent.type;
    if (
      (cs === 0 && prevCenterSecRef.current !== 0) ||
      (prevCenterSecRef.current >= 1 && prevCenterSecRef.current <= 10 && cs > prevCenterSecRef.current) ||
      (prevCenterTypeRef.current !== '' && prevCenterTypeRef.current !== ct && prevCenterSecRef.current >= 1 && prevCenterSecRef.current <= 10)
    ) {
      tvAudio.playBell();
    }
    prevCenterSecRef.current = cs;
    prevCenterTypeRef.current = ct;
  }, [centerEvent.seconds, centerEvent.type]);

  // 3. Universal prayer schedule Athan & Jamaat exact zero-crossing bell detector across all modes
  useEffect(() => {
    const prev = prevNowSecRef.current;
    prevNowSecRef.current = nowSec;
    if (prev === -1) return;
    const delta = (nowSec - prev + 86400) % 86400;
    if (delta === 0 || delta > 15) return;

    const prayerList = isFriday
      ? prayers.map((p, idx) => (idx === 1 ? config.jumah : p))
      : prayers;

    for (const p of prayerList) {
      const athanSec = toMin(p.adhan) * 60;
      const jamaatSec = toMin(p.jamaat) * 60;
      const elapsedA = (nowSec - athanSec + 86400) % 86400;
      const elapsedJ = (nowSec - jamaatSec + 86400) % 86400;
      if (elapsedA < delta || elapsedJ < delta) {
        tvAudio.playBell();
        break;
      }
    }
  }, [nowSec, prayers, isFriday, config.jumah]);

  // Hijri calendar & Ramadan calculation
  const hijriInfo = useMemo(
    () => computeHijriAndRamadan(simulatedDate, config.hijriOffset, alAdhanData?.hijri),
    [simulatedDate, config.hijriOffset, alAdhanData]
  );
  const hijriText = hijriInfo.text;

  const gregText = useMemo(() => {
    return simulatedDate.toLocaleDateString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, [simulatedDate]);

  // Jumu'ah & Ramadan Slides for Left Card
  const leftSlides = useMemo(() => {
    const list: {
      type: 'jumah' | 'ramadan' | 'ram_count' | 'ram_countdown' | 'tar' | 'fitr' | 'adha';
      title: string;
      enTitle: string;
      color: string;
      rows: Array<{ label: string; val: string; period: string }>;
    }[] = [];

    // 1. Jumuah Slide
    list.push({
      type: 'jumah',
      title: config.jumah.name,
      enTitle: 'JUMU\'AH',
      color: '#F5C518',
      rows: [
        { label: 'अज़ान', val: fmt12(config.jumah.adhan).time, period: fmt12(config.jumah.adhan).period },
        { label: 'जमात', val: fmt12(config.jumah.jamaat).time, period: fmt12(config.jumah.jamaat).period },
      ],
    });

    // 2. Ramadan Sehri & Iftar Schedule
    if (config.ram.on) {
      const useAuto = config.ram.autoCalc !== false;
      const effectiveRozaDay =
        !useAuto && config.ram.rozaDayOverride != null
          ? config.ram.rozaDayOverride
          : hijriInfo.autoRozaDay;
      const effectiveRemainingDays =
        !useAuto && config.ram.remainingDaysOverride != null
          ? config.ram.remainingDaysOverride
          : hijriInfo.autoRemainingDays;

      list.push({
        type: 'ramadan',
        title: 'रमज़ानुल मुबारक',
        enTitle: 'RAMADAN SCHEDULE',
        color: '#2FE6A1',
        rows: [
          { label: 'सेहरी आख़िरी', val: fmt12(config.ram.sehri).time, period: fmt12(config.ram.sehri).period },
          { label: 'इफ़्तार वक़्त', val: fmt12(config.ram.iftar).time, period: fmt12(config.ram.iftar).period },
        ],
      });

      // 3. Ramadan Day Counter (live Hijri day or manual override)
      list.push({
        type: 'ram_count',
        title: 'रमज़ानुल मुबारक',
        enTitle: 'RAMADAN COUNTER',
        color: '#FFA028',
        rows: [
          {
            label: 'आज का रोज़ा',
            val: formatHindiRoza(effectiveRozaDay),
            period: '',
          },
        ],
      });

      // 4. Remaining days of Ramadan countdown (live Hijri countdown or manual override)
      list.push({
        type: 'ram_countdown',
        title: 'रमज़ान की आमद',
        enTitle: 'RAMADAN COUNTDOWN',
        color: '#2FE6A1',
        rows: [
          {
            label: 'बाक़ी दिन',
            val: `${effectiveRemainingDays} दिन`,
            period: '',
          },
        ],
      });
    }

    // 5. Taraweeh (write only time, no Athan / Jamaat)
    if (config.sp.tar.on) {
      list.push({
        type: 'tar',
        title: 'नमाज़-ए-तरावीह',
        enTitle: 'TARAWEEH',
        color: '#FFF0A0',
        rows: [
          { label: 'नमाज़ वक़्त', val: fmt12(config.sp.tar.time).time, period: fmt12(config.sp.tar.time).period },
        ],
      });
    }

    // 6. Eid-ul-Fitr (write only time of namaz, no place name)
    if (config.sp.fitr.on) {
      list.push({
        type: 'fitr',
        title: 'ईद-उल-फ़ित्र',
        enTitle: 'EID-UL-FITR',
        color: '#2FE6A1',
        rows: [
          { label: 'नमाज़ वक़्त', val: fmt12(config.sp.fitr.time).time, period: fmt12(config.sp.fitr.time).period },
        ],
      });
    }

    // 7. Eid-ul-Adha (write only time of namaz, no place name)
    if (config.sp.adha.on) {
      list.push({
        type: 'adha',
        title: 'ईद-उल-अज़हा',
        enTitle: 'EID-UL-ADHA',
        color: '#F5C518',
        rows: [
          { label: 'नमाज़ वक़्त', val: fmt12(config.sp.adha.time).time, period: fmt12(config.sp.adha.time).period },
        ],
      });
    }

    return list;
  }, [config, hijriText]);


  // Auto-cycle the Left Card slides every 7 seconds
  useEffect(() => {
    if (leftSlides.length <= 1) return;
    const interval = setInterval(() => {
      setLeftSlideIndex(prev => (prev + 1) % leftSlides.length);
    }, 7000);
    return () => clearInterval(interval);
  }, [leftSlides.length]);

  const activeLeftSlide = leftSlides[leftSlideIndex % leftSlides.length] || leftSlides[0];

  const triggerSplash = () => {
    setSplashVisible(true);
    setSplashAnimPhase(0);
    const t1 = setTimeout(() => setSplashAnimPhase(1), 200);
    const t2 = setTimeout(() => setSplashAnimPhase(2), 500);
    const t3 = setTimeout(() => setSplashAnimPhase(3), 1300);
    const t4 = setTimeout(() => setSplashAnimPhase(4), 2000);
    const t5 = setTimeout(() => {
      setSplashVisible(false);
      setSplashAnimPhase(0);
    }, 4200);
    return () => {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); clearTimeout(t5);
    };
  };

  return (
    <div className="flex flex-col items-center w-full">
      {/* Settings Modal (Page 5: Settings Page) */}
      {isSettingsOpen && (
        <SettingsPage
          config={config}
          onSave={(newCfg) => {
            setConfig(newCfg);
            saveConfigToStorage(newCfg);
          }}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}

      {/* Simulator Control Bar */}
      <div className="w-full max-w-[960px] bg-slate-900 border border-slate-800 rounded-t-xl px-4 py-3 flex flex-wrap items-center justify-between gap-2 shadow-lg">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Tv className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>Masjid TV Android Emulator</span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                960 × 540 DP Canvas
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              5 Core Pages • Real APIs (Sunrise-Sunset, Open-Meteo, AlAdhan) • Remote Settings
            </p>
          </div>
        </div>

        {/* Operational Mode Selectors */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => {
              tvAudio.unlock();
              setSplashVisible(false);
              setMode(0);
            }}
            className={`px-3 py-1.5 rounded-md font-bold text-xs transition-colors flex items-center gap-1.5 ${
              mode === 0 && !splashVisible
                ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-400'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title="Always display Main Dashboard (5 prayers, analog clock, Jumu'ah slides, widgets)"
          >
            <span>🏠 Main Screen</span>
          </button>
          <button
            onClick={() => {
              tvAudio.unlock();
              setSplashVisible(false);
              setMode(5);
            }}
            className={`px-2.5 py-1.5 rounded-md font-medium text-xs transition-colors flex items-center gap-1 ${
              mode === 5 && !splashVisible
                ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-400 font-bold'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title="Live automatic sequence (auto transitions to countdown & namaz when clock matches prayer times)"
          >
            <span>🔄 Auto Mode</span>
          </button>
          <button
            onClick={() => {
              tvAudio.unlock();
              setSplashVisible(false);
              setMode(1);
            }}
            className={`px-2.5 py-1.5 rounded-md font-medium text-xs transition-colors flex items-center gap-1 ${
              mode === 1 && !splashVisible
                ? 'bg-amber-600 text-white shadow-sm ring-1 ring-amber-400 font-bold'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <span>⏱️ Countdown</span>
            <span className="text-[10px] font-mono opacity-80">{fmt12(minToHHMM(countdown90Secs)).time}</span>
          </button>
          <button
            onClick={() => {
              tvAudio.unlock();
              setSplashVisible(false);
              setMode(2);
            }}
            className={`px-2.5 py-1.5 rounded-md font-medium text-xs transition-colors ${
              mode === 2 && !splashVisible
                ? 'bg-teal-600 text-white shadow-sm font-bold'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            Jamaat Active
          </button>
          <button
            onClick={() => {
              tvAudio.unlock();
              setSplashVisible(false);
              setMode(3);
            }}
            className={`px-2 py-1.5 rounded-md font-medium text-xs transition-colors ${
              mode === 3 && !splashVisible
                ? 'bg-red-600 text-white shadow-sm ring-1 ring-red-400 font-bold'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title="Rapid 30-sec loop to test final seconds tick sound and zero bell"
          >
            30s Test
          </button>
          <button
            onClick={triggerSplash}
            className={`px-2.5 py-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition-colors ${
              splashVisible
                ? 'bg-amber-400 text-black font-bold ring-1 ring-amber-300'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span>Splash</span>
          </button>
        </div>

        {/* Feature Switches & Remote Control */}
        <div className="flex items-center gap-2">
          {/* Settings Page Remote Button */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-[#2a1c00] font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition cursor-pointer"
            title="Open Android TV Settings Page (Keyboard shortcut: 'S' or 'M')"
          >
            <SettingsIcon className="w-3.5 h-3.5" />
            <span>⚙️ Settings (Remote)</span>
          </button>

          <button
            onClick={toggleMute}
            className={`p-2 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors ${
              isMuted
                ? 'bg-red-950/40 border-red-800/60 text-red-300'
                : 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300 hover:bg-emerald-900/40'
            }`}
            title={isMuted ? 'Unmute TV sounds (tick & bell)' : 'Mute TV sounds'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            <span>{isMuted ? 'Muted' : 'Sound On'}</span>
          </button>

          <button
            onClick={() => setEnableDust(!enableDust)}
            className={`p-2 rounded-lg border text-xs font-medium flex items-center gap-1 transition-colors ${
              enableDust
                ? 'bg-amber-950/60 border-amber-500/60 text-amber-300'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Dust</span>
          </button>

          <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800 text-xs" title="Front Dust Particles (18%)">
            <span className="text-slate-400 text-[10px]">Front Dust:</span>
            {[0, 18, 50, 100].map(lvl => (
              <button
                key={lvl}
                onClick={() => setFrontDustLevel(lvl)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all ${
                  frontDustLevel === lvl ? 'bg-amber-400 text-black shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                {lvl}%
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800 text-xs">
            <span className="text-slate-400 text-[10px]">Speed:</span>
            {[1, 5, 30].map(s => (
              <button
                key={s}
                onClick={() => setTimeMultiplier(s)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  timeMultiplier === s ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800 text-xs">
            <span className="text-slate-400 text-[10px]">Opacity:</span>
            {[45, 55, 65, 75, 85].map(op => (
              <button
                key={op}
                onClick={() => setCardOpacity(op)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all ${
                  cardOpacity === op ? 'bg-amber-400 text-black shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                {op}%
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main 960x540 DP Scaled Canvas Frame */}
      <div
        ref={frameRef}
        className="w-full max-w-[960px] aspect-[960/540] relative bg-black shadow-2xl rounded-b-xl overflow-hidden border-x border-b border-slate-800"
      >
        <div
          style={{
            width: '960px',
            height: '540px',
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
          className="absolute top-0 left-0 overflow-hidden bg-black select-none"
        >
          {/* Base Background Image */}
          <img
            src="/assets/bg.jpg"
            alt="Mosque Night Background"
            className={`w-full h-full object-cover object-center absolute inset-0 select-none pointer-events-none transition-all duration-700 ${
              isCountdownActive ? 'blur-[2px] scale-[1.01]' : ''
            }`}
          />
          <div className={`w-full h-full absolute inset-0 transition-colors duration-700 ${isCountdownActive ? 'bg-[#030A07]/50' : 'bg-[#040A07]/45'}`} />

          {/* Floating Spiritual Dust Particles - Background Ambient Layer */}
          {enableDust && !splashVisible && <DustCanvas layer="back" />}

          {/* ============================================================== */}
          {/* 1. MAIN SCREEN (DASHBOARD) */}
          {/* ============================================================== */}
          {!isCountdownActive && !isActiveScreen && !splashVisible && (
            <div className={`w-full h-full relative z-10 flex flex-col justify-between px-[18px] pt-[15px] ${config.annEnabled ? 'pb-[40px]' : 'pb-[10px]'}`}>
              {/* Header: Masjid Name, Calendars, Sunrise, Sunset, Weather */}
              <div className="flex items-center justify-between shrink-0 h-[48px]">
                <div className="flex items-center gap-[11px]">
                  <img
                    src="/assets/logo.png"
                    alt="Logo"
                    className="h-[58px] w-auto aspect-[0.827] object-contain drop-shadow"
                  />
                  <div className="flex flex-col text-left">
                    <h1
                      style={{ fontSize: '18px', lineHeight: '22px' }}
                      className="text-white font-bold tracking-tight truncate max-w-[420px]"
                    >
                      {config.masjid}
                    </h1>
                    <div className="flex items-center gap-[7px] text-[12.5px] leading-tight text-left">
                      <span className="text-[#CFD8D3]">{gregText}</span>
                      <span className="text-[#F5C518] font-medium">{hijriText}</span>
                    </div>
                  </div>
                </div>

                {/* Pills: Sunrise, Sunset, Weather */}
                <div className="flex items-center gap-[11px] shrink-0">
                  {/* Sunrise Pill with custom vector icon */}
                  <div
                    style={{ width: '132px', height: '46px', borderRadius: '11px', ...cardBgStyle }}
                    className="bg-[#071812]/75 backdrop-blur-[4px] border border-white/15 px-[10px] flex items-center justify-center gap-[9px] shadow-md"
                  >
                    <div
                      style={{ width: '28px', height: '28px', borderRadius: '8px' }}
                      className="bg-gradient-to-br from-amber-500/25 to-[#151D0B] border border-amber-400/40 flex items-center justify-center shrink-0 shadow-inner"
                    >
                      <SunriseIcon className="w-[20px] h-[20px]" />
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="text-[9.5px] text-[#CFD8D3] font-normal tracking-wider">SUNRISE</span>
                      <span className="text-white font-semibold text-[17px] leading-tight android-num">
                        {fmt12(config.sunrise).time}{' '}
                        <span className="text-[10px] text-[#CFD8D3] font-normal font-sans">{fmt12(config.sunrise).period}</span>
                      </span>
                    </div>
                  </div>

                  {/* Sunset Pill with custom vector icon */}
                  <div
                    style={{ width: '132px', height: '46px', borderRadius: '11px', ...cardBgStyle }}
                    className="bg-[#071812]/75 backdrop-blur-[4px] border border-white/15 px-[10px] flex items-center justify-center gap-[9px] shadow-md"
                  >
                    <div
                      style={{ width: '28px', height: '28px', borderRadius: '8px' }}
                      className="bg-gradient-to-br from-orange-500/25 to-[#1F120A] border border-orange-400/40 flex items-center justify-center shrink-0 shadow-inner"
                    >
                      <SunsetIcon className="w-[20px] h-[20px]" />
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="text-[9.5px] text-[#CFD8D3] font-normal tracking-wider">SUNSET</span>
                      <span className="text-white font-semibold text-[17px] leading-tight android-num">
                        {fmt12(config.sunset).time}{' '}
                        <span className="text-[10px] text-[#CFD8D3] font-normal font-sans">{fmt12(config.sunset).period}</span>
                      </span>
                    </div>
                  </div>

                  {/* Weather Pill with real Open-Meteo data */}
                  <div
                    style={{ width: '132px', height: '46px', borderRadius: '11px', ...cardBgStyle }}
                    className="bg-[#071812]/75 backdrop-blur-[4px] border border-white/15 px-[10px] flex items-center justify-center gap-[9px] shadow-md"
                    title={weatherData ? `Humidity: ${weatherData.humidity}% | Feels like: ${weatherData.apparentTemp}°C | Wind: ${weatherData.windSpeed} km/h` : undefined}
                  >
                    <div
                      style={{ width: '27px', height: '27px', borderRadius: '7px' }}
                      className="bg-gradient-to-br from-[#5AA0FF]/35 to-[#101C2A] border border-[#5AA0FF]/30 flex items-center justify-center text-sm shrink-0"
                    >
                      {weatherData?.icon || '☀️'}
                    </div>
                    <div className="text-white font-semibold text-[17px] android-num flex items-baseline gap-0.5">
                      <span>{weatherData ? weatherData.temp : config.tempFallback}</span>
                      <span className="text-[10px] text-[#CFD8D3] font-normal font-sans">°C</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Middle Row: Left Card (Jumu'ah & Ramadan), Center Clock, Right Card (Prayer Start & End) */}
              <div
                style={{
                  height: '210px',
                  gap: '11px',
                  backdropFilter: 'blur(3.2px)',
                  WebkitBackdropFilter: 'blur(3.2px)',
                }}
                className="w-full flex items-stretch shrink-0 relative backdrop-blur-[3.2px] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.02] hover:shadow-[0_16px_36px_rgba(0,0,0,0.45)] origin-center rounded-[20px]"
              >
                {/* LEFT CARD: Jumu'ah & Ramadan Information Card with indicator bar removed to use full space */}
                <div
                  style={{ width: '210px', padding: '15px 0' }}
                  className="flex flex-col shrink-0 relative"
                >
                  <div
                    style={{
                      borderRadius: '17px',
                      backdropFilter: 'blur(3.2px)',
                      WebkitBackdropFilter: 'blur(3.2px)',
                      ...cardBgStyle,
                    }}
                    className={`w-full h-full bg-[#071812]/75 backdrop-blur-[3.2px] px-3 py-2.5 flex flex-col items-center justify-between shadow-lg relative transition-all duration-700 overflow-hidden ${
                      isFriday && activeLeftSlide.type === 'jumah'
                        ? 'border-2 border-amber-400 ring-2 ring-amber-400/30'
                        : 'border border-white/15'
                    }`}
                  >
                    {/* Buttery Smooth Animated Content Wrapper */}
                    <div
                      key={`slide-${activeLeftSlide.type}`}
                      className="w-full h-full flex flex-col justify-between animate-buttery-fade"
                    >
                      {/* Slide Header */}
                      <div className="text-center w-full">
                        <div
                          style={{ color: activeLeftSlide.color }}
                          className="font-bold text-[24px] leading-tight flex items-center justify-center gap-1.5"
                        >
                          <span>{activeLeftSlide.title}</span>
                          {activeLeftSlide.type === 'jumah' && isFriday && (
                            <span className="text-[9px] bg-amber-400 text-black px-1.5 py-0.5 rounded font-black">
                              TODAY
                            </span>
                          )}
                        </div>
                        <div className="w-full h-[1px] bg-white/20 mt-1" />
                      </div>

                      {/* Slide Content Rows: uses full card height now that bottom indicator bar is removed */}
                      <div
                        className={`flex-1 flex flex-col w-full text-center ${
                          activeLeftSlide.rows.length === 1
                            ? 'justify-center py-2'
                            : 'justify-evenly py-1'
                        }`}
                      >
                        {activeLeftSlide.rows.map((row, rIdx) => (
                          <div key={rIdx} className="flex flex-col items-center">
                            <span
                              style={{
                                transform: activeLeftSlide.rows.length === 1 ? 'translateY(-2px)' : 'translateY(1px)',
                              }}
                              className={`${
                                activeLeftSlide.rows.length === 1 ? 'text-[17px]' : 'text-[15.5px]'
                              } font-semibold text-[#E4EBE7]`}
                            >
                              {row.label}
                            </span>
                            <div
                              style={{ color: rIdx === 1 ? activeLeftSlide.color : '#FFFFFF' }}
                              className={`font-semibold leading-none android-num ${
                                activeLeftSlide.rows.length === 1 ? 'text-[36px] my-1' : 'text-[31px]'
                              }`}
                            >
                              {row.val}
                              {row.period && (
                                <span className="text-[12px] ml-1 font-normal opacity-90 font-sans">
                                  {row.period}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* CENTER CARD: Analog Clock + Next Event + Synchronized Digital Clock */}
                <div
                  style={{
                    width: '482px',
                    borderRadius: '22px',
                    backdropFilter: 'blur(3.2px)',
                    WebkitBackdropFilter: 'blur(3.2px)',
                    ...cardBgStyle,
                  }}
                  className="bg-[#071812]/75 backdrop-blur-[3.2px] border border-white/15 px-[15px] flex items-center shrink-0 shadow-xl relative"
                >
                  {/* Analog Clock Canvas */}
                  <div
                    style={{ width: '195px', height: '195px' }}
                    className="shrink-0 flex items-center justify-center"
                  >
                    <AnalogClockCanvas simulatedDate={simulatedDate} />
                  </div>

                  {/* Next Event Info & Synchronized Digital Clock */}
                  <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
                    <div
                      style={{ fontSize: '48px', lineHeight: '48px' }}
                      className="text-white font-bold tracking-tight"
                    >
                      {centerEvent.prayer.name}
                    </div>
                    <div className="text-[#F5C518] font-bold text-[19px] leading-snug tracking-wider uppercase">
                      {centerEvent.type === 'ATHAN' ? 'अज़ान' : 'जमात'}{' '}
                      <span className="text-white font-normal">
                        {fmt12(centerEvent.timeStr).time} {fmt12(centerEvent.timeStr).period}
                      </span>
                    </div>
                    {/* Live Countdown Timer (HH:MM:SS) for upcoming Jamaat or Athan */}
                    <div
                      style={{ fontSize: '46px', lineHeight: '46px' }}
                      className="text-white font-extrabold android-num tracking-tight"
                    >
                      {formatSecondsToHMS(centerEvent.seconds)}
                    </div>
                  </div>
                </div>

                {/* RIGHT CARD: Prayer Start and End Timings Card with [मौजूदा] badge */}
                <div
                  style={{ width: '210px', padding: '15px 0' }}
                  className="flex flex-col shrink-0 relative"
                >
                  {/* Tag badge: straddles card top border at y = 15px with generous clearance below weather widget */}
                  <div
                    style={{
                      borderRadius: '8px',
                      top: '15px',
                      transform: 'translate(-50%, -50%)',
                      padding: '3px 17px',
                    }}
                    className="absolute left-1/2 bg-[#07120D] border border-[#F5C518] text-white text-[11px] font-semibold z-20 whitespace-nowrap shadow-md"
                  >
                    मौजूदा
                  </div>

                  <div
                    style={{
                      borderRadius: '17px',
                      backdropFilter: 'blur(3.2px)',
                      WebkitBackdropFilter: 'blur(3.2px)',
                      ...cardBgStyle,
                    }}
                    className="w-full h-full bg-[#071812]/75 backdrop-blur-[3.2px] border border-[#F5C518]/55 px-3 py-2.5 flex flex-col items-center justify-between shadow-lg"
                  >
                    <div className="text-center w-full">
                      <div className="text-white font-bold text-[28px] leading-tight">
                        {curPrayer.name}
                      </div>
                      <div className="w-full h-[1px] bg-white/20 mt-1" />
                    </div>

                    <div className="flex-1 flex flex-col justify-around py-1 w-full text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-[15px] font-semibold text-[#E4EBE7]">शुरू वक़्त</span>
                        <div className="text-white font-semibold text-[35px] leading-none android-num">
                          {fmt12(curPrayer.adhan).time}
                          <span className="text-[13px] ml-1 font-normal opacity-90 font-sans">
                            {fmt12(curPrayer.adhan).period}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col items-center">
                        <span className="text-[15px] font-semibold text-[#E4EBE7]">आख़िरी वक़्त</span>
                        <div className="text-white font-semibold text-[35px] leading-none android-num">
                          {fmt12(nxtPrayer.adhan).time}
                          <span className="text-[13px] ml-1 font-normal opacity-90 font-sans">
                            {fmt12(nxtPrayer.adhan).period}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Row: 5 Daily Prayers (Fajr, Dhuhr, Asr, Maghrib, Isha) */}
              <div
                style={{ height: '200px', gap: '11px' }}
                className="w-full flex items-stretch shrink-0 relative"
              >
                {prayers.map((p, idx) => {
                  const isCur = idx === curIndex;
                  const isNxt = idx === nxtIndex;
                  // On Friday, Dhuhr is not highlighted as upcoming (Jumu'ah card is highlighted!)
                  const isDhuhrFriday = isFriday && idx === 1;
                  const effectiveNxt = isDhuhrFriday ? false : isNxt;
                  const fg = effectiveNxt ? '#F5C518' : '#FFFFFF';
                  const tagText = effectiveNxt ? 'अगली' : (isCur && !isDhuhrFriday ? 'मौजूदा' : null);

                  return (
                    <div
                      key={p.en}
                      style={{ width: '176px' }}
                      className="h-full flex flex-col shrink-0 relative"
                    >
                      {/* Tag badge */}
                      {tagText && (
                        <div
                          style={{
                            borderRadius: '8px',
                            top: 0,
                            transform: 'translate(-50%, -50%)',
                            padding: '3px 17px',
                          }}
                          className="absolute left-1/2 bg-[#07120D] border border-[#F5C518] text-white text-[11px] font-semibold z-20 whitespace-nowrap shadow-md"
                        >
                          {tagText}
                        </div>
                      )}

                      <div
                        style={{
                          borderRadius: '17px',
                          ...(effectiveNxt
                            ? { backgroundColor: `rgba(27, 36, 12, ${Math.min(0.95, (cardOpacity + 7) / 100)})` }
                            : cardBgStyle),
                        }}
                        className={`w-full h-full px-3 py-2.5 flex flex-col items-center justify-between shadow-lg backdrop-blur-[4px] transition-all ${
                          effectiveNxt
                            ? 'bg-[#1B240C]/92 border-2 border-amber-400 ring-2 ring-amber-400/30'
                            : isCur
                            ? 'bg-[#071812]/85 border border-amber-400/50'
                            : 'bg-[#071812]/85 border border-white/15'
                        }`}
                      >
                        <div className="text-center w-full">
                          <div style={{ color: fg }} className="font-bold text-[28px] leading-tight">
                            {p.name}
                          </div>
                          <div className="w-full h-[1px] bg-white/20 mt-1" />
                        </div>

                        <div className="flex-1 flex flex-col justify-around py-1 w-full text-center">
                          <div className="flex flex-col items-center">
                            <span className="text-[15px] font-semibold text-[#E4EBE7]">अज़ान</span>
                            <div className="text-white font-semibold text-[35px] leading-none android-num">
                              {fmt12(p.adhan).time}
                              <span className="text-[13px] ml-1 font-normal opacity-90 font-sans">
                                {fmt12(p.adhan).period}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-col items-center">
                            <span className="text-[15px] font-semibold text-[#E4EBE7]">जमात</span>
                            <div style={{ color: fg }} className="font-semibold text-[35px] leading-none android-num">
                              {fmt12(p.jamaat).time}
                              <span className="text-[13px] ml-1 font-normal opacity-90 font-sans">
                                {fmt12(p.jamaat).period}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom News Ticker */}
              {config.annEnabled && (
                <div
                  style={{ ...cardBgStyle, borderRadius: '0px' }}
                  className="absolute bottom-0 inset-x-0 w-full h-[32px] bg-[#071812]/75 backdrop-blur-[4px] border-t border-white/15 px-4 flex items-center overflow-hidden shrink-0 z-20"
                >
                  <div className="flex items-center gap-2 shrink-0 pr-3 border-r border-white/20 text-xs font-bold text-amber-400">
                    <span>सूचना / NOTICE:</span>
                  </div>
                  <div className="flex-1 overflow-hidden relative whitespace-nowrap pl-3">
                    <span className="animate-marquee inline-block text-xs text-white/90 font-medium">
                      {config.annText}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}


          {/* ============================================================== */}
          {/* 2. COUNTDOWN CLOCK PAGE (Lifted, 3% bigger, glowing only bar) */}
          {/* ============================================================== */}
          {isCountdownActive && !isActiveScreen && (
            <div
              style={{
                backdropFilter: 'blur(3.2px)',
                WebkitBackdropFilter: 'blur(3.2px)',
              }}
              className="w-full h-full relative z-10 flex flex-col justify-between px-[18px] pt-[15px] pb-[14px] backdrop-blur-[3.2px] bg-[#040A07]/20 transition-all duration-500"
            >
              {/* Header */}
              <div className="flex items-center justify-between shrink-0 h-[48px]">
                <div className="flex items-center gap-[11px]">
                  <img
                    src="/assets/logo.png"
                    alt="Logo"
                    className="h-[58px] w-auto aspect-[0.827] object-contain drop-shadow"
                  />
                  <div className="flex flex-col text-left">
                    <h1 style={{ fontSize: '18px' }} className="text-white font-bold truncate">
                      {config.masjid}
                    </h1>
                    <div className="flex items-center gap-[6px] text-[11px]">
                      <span className="text-[#CFD8D3]">{gregText}</span>
                      <span className="text-[#F5C518]">{hijriText}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-[8px]">
                  <div
                    style={{
                      width: '108px',
                      height: '36px',
                      borderRadius: '9px',
                      backdropFilter: 'blur(3.2px)',
                      WebkitBackdropFilter: 'blur(3.2px)',
                      ...cardBgStyle,
                    }}
                    className="bg-[#071812]/75 backdrop-blur-[3.2px] border border-white/15 px-2.5 flex items-center justify-center gap-2 text-xs text-white shadow-sm"
                  >
                    <SunriseIcon className="w-[18px] h-[18px] shrink-0" />
                    <span className="android-num font-semibold text-[13px]">{fmt12(config.sunrise).time}</span>
                  </div>
                  <div
                    style={{
                      width: '108px',
                      height: '36px',
                      borderRadius: '9px',
                      backdropFilter: 'blur(3.2px)',
                      WebkitBackdropFilter: 'blur(3.2px)',
                      ...cardBgStyle,
                    }}
                    className="bg-[#071812]/75 backdrop-blur-[3.2px] border border-white/15 px-2.5 flex items-center justify-center gap-2 text-xs text-white shadow-sm"
                  >
                    <SunsetIcon className="w-[18px] h-[18px] shrink-0" />
                    <span className="android-num font-semibold text-[13px]">{fmt12(config.sunset).time}</span>
                  </div>
                  <div
                    style={{
                      width: '103px',
                      height: '36px',
                      borderRadius: '9px',
                      backdropFilter: 'blur(3.2px)',
                      WebkitBackdropFilter: 'blur(3.2px)',
                      ...cardBgStyle,
                    }}
                    className="bg-[#071812]/75 backdrop-blur-[3.2px] border border-white/15 px-2 flex items-center justify-center gap-1.5 text-xs text-white shadow-sm"
                  >
                    <span>{weatherData?.icon || '☀️'}</span>
                    <span className="android-num font-semibold">{weatherData ? weatherData.temp : config.tempFallback}°C</span>
                  </div>
                </div>
              </div>

              {/* Central Giant Countdown Ring Area */}
              <div className="flex-1 relative flex items-center justify-center">
                {/* Left Side Label - lifted in sync with the countdown clock */}
                <div
                  style={{ top: 'calc(50% - 12px)' }}
                  className="absolute left-[28px] -translate-y-1/2 flex flex-col text-left"
                >
                  <div
                    style={{ fontSize: '30px', lineHeight: '30px' }}
                    className="text-[#FFF0A0] font-black drop-shadow tracking-wide"
                  >
                    {countdownTargetPrayer.en}
                  </div>
                  <div
                    style={{ fontSize: '30px', lineHeight: '30px' }}
                    className="text-[#F5C518] font-black drop-shadow tracking-wide"
                  >
                    {countdownType}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span style={{ fontSize: '30px' }} className="text-[#2FE6A1] font-black">
                      IN
                    </span>
                    <div className="w-[7px] h-[7px] rounded-full bg-[#2FE6A1]" />
                    <div className="w-[100px] h-[1.5px] bg-[#8A7414]" />
                  </div>
                </div>

                {/* 3% Bigger Circular Ring (433dp) Lifted Upward (-12px) without touching any borders */}
                <div
                  style={{ width: '433px', height: '433px', transform: 'translateY(-12px)' }}
                  className="relative flex items-center justify-center shrink-0"
                >
                  {/* Inner Dial (400dp) - Perfectly concentric inside the 433dp progress ring */}
                  <div
                    style={{ width: '400px', height: '400px', borderRadius: '50%' }}
                    className="relative z-10 bg-gradient-to-br from-[#323539] to-[#121315] border border-white/15 flex flex-col items-center justify-center shadow-2xl select-none"
                  >
                    {/* Numbers: Clean solid countdown timer without glow (glow only on circular progress bar) */}
                    <div
                      className="font-black android-num flex items-center justify-center text-[124px] tracking-tight text-white drop-shadow-md select-none"
                      style={{ lineHeight: '124px', fontWeight: 800 }}
                    >
                      <span>
                        {String(
                          countdownRemaining >= 3600
                            ? Math.floor(countdownRemaining / 3600)
                            : Math.floor(countdownRemaining / 60)
                        ).padStart(2, '0')}
                      </span>
                      <span className="mx-2 text-[105px] leading-none text-[#F5C518]">:</span>
                      <span>
                        {String(
                          countdownRemaining >= 3600
                            ? Math.floor((countdownRemaining % 3600) / 60)
                            : countdownRemaining % 60
                        ).padStart(2, '0')}
                      </span>
                    </div>

                    <div style={{ width: '283px' }} className="flex items-center justify-between mt-2">
                      <div
                        style={{ borderRadius: '9px', padding: '3px 20px' }}
                        className="bg-[#146442]/50 border border-[#1F9A68] text-[#2FE6A1] font-black text-[20px] tracking-widest"
                      >
                        {countdownRemaining >= 3600 ? 'HR' : 'MIN'}
                      </div>
                      <div
                        style={{ borderRadius: '9px', padding: '3px 20px' }}
                        className="bg-[#146442]/50 border border-[#1F9A68] text-[#2FE6A1] font-black text-[20px] tracking-widest"
                      >
                        {countdownRemaining >= 3600 ? 'MIN' : 'SEC'}
                      </div>
                    </div>
                  </div>

                  {/* Golden / Yellow-Reddish Progress Ring overlay on top (z-20) with gentle synchronized luminescence */}
                  <CountdownRing
                    secondsRemaining={countdownRemaining}
                    spanSeconds={countdownSpan}
                  />
                </div>

                {/* Bottom Left Digital Time */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: '12px',
                    left: '24px',
                    right: '24px',
                  }}
                  className="flex items-center justify-between"
                >
                  <span style={{ fontSize: '38px' }} className="text-white font-extrabold android-num drop-shadow-lg">
                    {simulatedDate.toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true,
                    })}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* ============================================================== */}
          {/* 3. ACTIVE NAMAZ PAGE (Exact restoration matching Screens.kt) */}
          {/* ============================================================== */}
          {isActiveScreen && (
            <div className="w-full h-full relative z-10 flex flex-col justify-between px-[18px] pt-[15px] pb-[10px] animate-fadeIn">
              {/* Header: Masjid Name & Calendars */}
              <div className="flex items-center justify-between shrink-0 h-[48px]">
                <div className="flex items-center gap-[11px]">
                  <img
                    src="/assets/logo.png"
                    alt="Logo"
                    className="h-[58px] w-auto aspect-[0.827] object-contain drop-shadow"
                  />
                  <div className="flex flex-col text-left">
                    <h1 style={{ fontSize: '20px', lineHeight: '24px' }} className="text-white font-bold tracking-tight">
                      {config.masjid}
                    </h1>
                    <div className="flex items-center gap-[7px] text-[12.5px] leading-tight text-left">
                      <span className="text-[#CFD8D3]">{gregText}</span>
                      <span className="text-[#F5C518] font-medium">{hijriText}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Center Glass Container */}
              <div
                style={{ borderRadius: '20px', ...cardBgStyle }}
                className="flex-1 w-full bg-[#071812]/75 backdrop-blur-[4px] border border-amber-400/50 p-5 flex flex-col items-center justify-evenly my-2 shadow-2xl relative"
              >
                {/* Mint blinking dot + title */}
                <div className="flex items-center gap-2.5">
                  <div className="w-3.5 h-3.5 rounded-full bg-[#2FE6A1] animate-pulse" />
                  <span className="text-[#2FE6A1] font-black text-lg tracking-widest uppercase">
                    जमात जारी है • JAMAAT IN PROGRESS
                  </span>
                </div>

                {/* Big Glow Prayer Name */}
                <div
                  style={{ fontSize: '50px', lineHeight: '50px' }}
                  className="text-[#F5C518] font-extrabold tracking-wide drop-shadow-[0_0_20px_rgba(245,197,24,0.4)]"
                >
                  {countdownTargetPrayer.name} ({countdownTargetPrayer.en})
                </div>

                {/* Two Note Boxes side-by-side */}
                <div className="w-full flex items-center justify-center gap-5 h-[86px] px-4">
                  {/* Red Note: Silence Mobile */}
                  <div
                    style={{ borderRadius: '15px', backgroundColor: '#501414' }}
                    className="flex-1 h-full bg-[#501414] border border-[#FF5A5A]/45 px-5 flex items-center gap-3.5 shadow-lg"
                  >
                    <span className="text-[38px] leading-none select-none">📵</span>
                    <span className="text-white font-extrabold text-[22px] leading-tight text-left">
                      मोबाइल बंद रखें या मोबाइल साइलेंट रखें।
                    </span>
                  </div>

                  {/* Green Note: Straighten Rows */}
                  <div
                    style={{ borderRadius: '15px', backgroundColor: '#0F4630' }}
                    className="flex-1 h-full bg-[#0F4630] border border-[#2EA064]/55 px-5 flex items-center gap-3.5 shadow-lg"
                  >
                    <span className="text-[38px] leading-none select-none">👥</span>
                    <span className="text-white font-extrabold text-[22px] leading-tight text-left">
                      सफ़ सीधी और मुकम्मल करें
                    </span>
                  </div>
                </div>

                {/* Progress bar and Returning text */}
                <div className="flex flex-col items-center gap-1.5 mt-1">
                  <div className="w-[345px] h-[5px] rounded-full bg-white/15 overflow-hidden">
                    <div
                      style={{
                        width: `${Math.min(100, Math.max(0, (activeRemainingSecs / (activeDurationMinutes * 60)) * 100))}%`,
                      }}
                      className="h-full bg-gradient-to-r from-[#2FE6A1] to-[#F5C518] transition-all duration-1000"
                    />
                  </div>
                  <span className="text-[#D3DCD7] text-xs font-medium tracking-wide">
                    Returning to dashboard in {formatSecondsToHMS(activeRemainingSecs).slice(3)}
                  </span>
                </div>
              </div>

              {/* Bottom bar with current time */}
              <div
                style={{ borderRadius: '0px', ...cardBgStyle }}
                className="w-full h-[32px] bg-[#071812]/65 backdrop-blur-[4px] border-t border-white/10 flex items-center justify-between px-6 shrink-0"
              >
                <span className="text-white font-bold text-sm flex items-center gap-1.5">
                  <span>🕒</span>
                  <span>{simulatedDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                </span>
                <span className="text-[#D9E8DF] text-xs font-medium tracking-[0.5px]">
                  Made with ❤️ for Jama Masjid Kodwatand.
                </span>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* 4. SPLASH SCREEN (Exact restoration matching Screens.kt) */}
          {/* ============================================================== */}
          {splashVisible && (
            <div className="w-full h-full absolute inset-0 z-40 bg-black flex flex-col items-center p-7 text-center select-none animate-fadeIn">
              {/* Splash Wallpaper with subtle darkening */}
              <img
                src="/assets/splash.jpg"
                alt="Splash Background"
                className="w-full h-full object-cover absolute inset-0 opacity-45 pointer-events-none"
              />
              <div className="w-full h-full absolute inset-0 bg-[#030A07]/40 bg-gradient-to-b from-transparent via-[#030A07]/30 to-[#030A07]/80 pointer-events-none" />

              {/* Top Arabic Bismillah Calligraphy */}
              <div className="relative z-10 pt-2 animate-fadeIn">
                <span style={{ fontFamily: "'Amiri', serif" }} className="text-[#F5C518] text-[32px] tracking-wider">
                  بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                </span>
              </div>

              {/* Center Column with Logo, Title, Loader */}
              <div className="relative z-10 my-auto flex flex-col items-center gap-2">
                <img
                  src="/assets/logo.png"
                  alt="Masjid Logo"
                  className="h-[210px] w-auto aspect-[0.827] object-contain drop-shadow-2xl animate-pulse"
                />
                <h1 className="text-[31px] font-bold text-white tracking-wide mt-1">
                  Masjid Clock
                </h1>
                <div className="w-[230px] h-[4px] bg-white/20 rounded-full overflow-hidden my-2 relative">
                  <div className="h-full bg-gradient-to-r from-[#C9A41C] via-[#FFE27A] to-[#F5C518] w-full rounded-full animate-splash-loader" />
                </div>
                <p className="text-[#E8F3EC] text-[14px] font-medium tracking-[0.5px]">
                  Preparing prayer times…
                </p>
              </div>
            </div>
          )}

          {/* Floating Spiritual Dust Particles - Foreground Glistening Layer */}
          {enableDust && !splashVisible && frontDustLevel > 0 && <DustCanvas layer="front" level={frontDustLevel} />}

        </div>
      </div>
    </div>
  );
};

/** High-Intensity Floating Golden Dust Particles (front layer set to 18% density/alpha) */
function DustCanvas({
  layer = 'all',
  level = 18,
}: {
  layer?: 'back' | 'front' | 'all';
  level?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const DW = 960;
    const DH = 540;

    // 66 big ambient glowing halos (+18% boosted count & luminous radius/intensity)
    const big = Array.from({ length: 66 }, () => ({
      x: Math.random() * DW,
      y: Math.random() * DH,
      r: Math.random() * 23 + 9,
      vx: (Math.random() - 0.5) * 6,
      vy: -(Math.random() * 5.5 + 3.5),
      a: (Math.random() * 0.45 + 0.42) * 1.55,
      ph: Math.random() * 6.28,
      fr: Math.random() * 0.45 + 0.25,
      sw: Math.random() * 0.5 + 0.3,
    }));

    // 238 small glistening motes (+18% boosted count)
    const small = Array.from({ length: 238 }, () => ({
      x: Math.random() * DW,
      y: Math.random() * DH,
      r: Math.random() * 2.3 + 1.35,
      vx: (Math.random() - 0.5) * 4.5,
      vy: -(Math.random() * 7 + 4),
      a: Math.min(1.0, (Math.random() * 0.55 + 0.45) * 1.55),
      ph: Math.random() * 6.28,
      fr: Math.random() * 0.5 + 0.25,
      sw: Math.random() * 0.5 + 0.3,
    }));

    let lastTime = performance.now();

    const render = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;
      const ts = time / 1000;

      ctx.clearRect(0, 0, DW, DH);
      ctx.globalCompositeOperation = 'lighter';

      // 1. Render big glowing ambient halos (in 'back' and 'all' layers)
      if (layer === 'back' || layer === 'all') {
        for (const p of big) {
          p.y += p.vy * dt;
          p.x += (p.vx + Math.sin((ts / 2) * p.sw + p.ph) * 5) * dt;
          if (p.y < -35) {
            p.y = DH + 35;
            p.x = Math.random() * DW;
          }
          if (p.x < -35) p.x = DW + 35;
          if (p.x > DW + 35) p.x = -35;

          const al = p.a * (0.72 + 0.28 * Math.sin(ts * p.fr + p.ph));
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
          grad.addColorStop(0, `rgba(255, 255, 235, ${Math.min(1.0, al * 1.05)})`);
          grad.addColorStop(0.35, `rgba(255, 230, 130, ${al * 0.95})`);
          grad.addColorStop(0.7, `rgba(255, 195, 65, ${al * 0.52})`);
          grad.addColorStop(1, 'rgba(255, 185, 55, 0)');

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();
        }
      }

      // 2. Render glistening motes
      // Front motes count is set to 18% (20 motes out of 110)
      const isFront = layer === 'front';
      const frontCount = Math.max(1, Math.round(110 * (level / 100)));
      const motes = isFront ? small.slice(0, frontCount) : (layer === 'back' ? small.slice(110) : small);
      const frontAlphaMultiplier = isFront ? Math.max(0.25, (level / 100) * 1.35) : 1.0;

      for (const p of motes) {
        p.y += p.vy * dt;
        p.x += (p.vx + Math.sin((ts / 1.5) * p.sw + p.ph) * 3) * dt;
        if (p.y < -6) {
          p.y = DH + 6;
          p.x = Math.random() * DW;
        }
        if (p.x < -6) p.x = DW + 6;
        if (p.x > DW + 6) p.x = -6;

        const al = p.a * (0.5 + 0.5 * Math.abs(Math.sin(ts * p.fr + p.ph))) * frontAlphaMultiplier;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 248, 195, ${Math.min(1.0, al)})`;
        ctx.fill();
      }

      ctx.globalCompositeOperation = 'source-over';
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [layer, level]);

  return (
    <canvas
      ref={canvasRef}
      width={960}
      height={540}
      className={`absolute inset-0 pointer-events-none ${layer === 'front' ? 'z-50' : 'z-0'}`}
    />
  );
}

/** Analog Clock Canvas matching Kotlin Screens.kt */
function AnalogClockCanvas({ simulatedDate }: { simulatedDate: Date }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = 195;
    const h = 195;
    const cx = w / 2;
    const cy = h / 2;
    const k = w / 400; // Face is drawn on 400x400 grid

    const pt = (x: number, y: number) => ({
      x: cx + (x - 200) * k,
      y: cy + (y - 200) * k,
    });

    ctx.clearRect(0, 0, w, h);

    // 1. Dark outer face base (#08201A)
    ctx.beginPath();
    ctx.arc(cx, cy, 196 * k, 0, Math.PI * 2);
    ctx.fillStyle = '#08201A';
    ctx.fill();

    // 2. Outer stroke (#123626)
    ctx.beginPath();
    ctx.arc(cx, cy, 196 * k, 0, Math.PI * 2);
    ctx.strokeStyle = '#123626';
    ctx.lineWidth = 2 * k;
    ctx.stroke();

    // 3. Dial gradient (#03120C to #010806)
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 178 * k);
    grad.addColorStop(0, '#03120C');
    grad.addColorStop(1, '#010806');
    ctx.beginPath();
    ctx.arc(cx, cy, 178 * k, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // 4. Concentric gold circle (#C9A41C)
    ctx.beginPath();
    ctx.arc(cx, cy, 178 * k, 0, Math.PI * 2);
    ctx.strokeStyle = '#C9A41C';
    ctx.lineWidth = 2 * k;
    ctx.stroke();

    // 5. Dashed inner ring (#8A7516)
    ctx.beginPath();
    ctx.arc(cx, cy, 170 * k, 0, Math.PI * 2);
    ctx.strokeStyle = '#8A7516';
    ctx.lineWidth = 1 * k;
    ctx.setLineDash([1 * k, 8 * k]);
    ctx.stroke();
    ctx.setLineDash([]);

    // 6. 8 Hour ticks (#E0B81A)
    const gold = '#E0B81A';
    for (let i = 0; i < 12; i++) {
      if (i % 3 !== 0) {
        const a = (i * 30 * Math.PI) / 180;
        const sn = Math.sin(a);
        const cs = Math.cos(a);
        const p1 = pt(200 + sn * 150, 200 - cs * 150);
        const p2 = pt(200 + sn * 130, 200 - cs * 130);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = gold;
        ctx.lineWidth = 4 * k;
        ctx.lineCap = 'round';
        ctx.stroke();
      }
    }

    // 7. Hour numbers (12, 3, 6, 9) in bold serif gold
    ctx.fillStyle = gold;
    ctx.font = `bold ${Math.round(42 * k)}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const n12 = pt(200, 95);
    const n3 = pt(320, 215);
    const n6 = pt(200, 335);
    const n9 = pt(82, 215);
    ctx.fillText('12', n12.x, n12.y);
    ctx.fillText('3', n3.x, n3.y);
    ctx.fillText('6', n6.x, n6.y);
    ctx.fillText('9', n9.x, n9.y);

    // Time calculations
    const sec = simulatedDate.getSeconds() + simulatedDate.getMilliseconds() / 1000;
    const min = simulatedDate.getMinutes() + sec / 60;
    const hr = (simulatedDate.getHours() % 12) + min / 60;

    // 8. Tapered Gold Hour Hand (#F0C419)
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((hr * 30 * Math.PI) / 180);
    ctx.beginPath();
    ctx.moveTo((196 - 200) * k, (200 - 200) * k);
    ctx.lineTo((204 - 200) * k, (204 - 200) * k);
    ctx.lineTo((200 - 200) * k, (118 - 200) * k);
    ctx.closePath();
    ctx.fillStyle = '#F0C419';
    ctx.fill();
    ctx.restore();

    // 9. Tapered Gold Minute Hand (#F0C419)
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((min * 6 * Math.PI) / 180);
    ctx.beginPath();
    ctx.moveTo((195 - 200) * k, (200 - 200) * k);
    ctx.lineTo((205 - 200) * k, (205 - 200) * k);
    ctx.lineTo((200 - 200) * k, (60 - 200) * k);
    ctx.closePath();
    ctx.fillStyle = '#F0C419';
    ctx.fill();
    ctx.restore();

    // 10. Red Second Hand (#E53B3B) with tail
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((sec * 6 * Math.PI) / 180);
    ctx.beginPath();
    ctx.moveTo(0, 30 * k); // Tail
    ctx.lineTo(0, -152 * k); // Tip
    ctx.strokeStyle = '#E53B3B';
    ctx.lineWidth = 2.5 * k;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.restore();

    // 11. Center Cap: Outer Gold circle (#E0A800) + Inner Red circle (#DD2222)
    ctx.beginPath();
    ctx.arc(cx, cy, 7 * k, 0, Math.PI * 2);
    ctx.fillStyle = '#E0A800';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy, 3 * k, 0, Math.PI * 2);
    ctx.fillStyle = '#DD2222';
    ctx.fill();
  }, [simulatedDate]);

  return <canvas ref={canvasRef} width={195} height={195} />;
}


/** Format seconds to HH:MM:SS */
function formatSecondsToHMS(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/** Countdown Ring SVG with gentle luminescence */
function CountdownRing({
  secondsRemaining,
  spanSeconds,
}: {
  secondsRemaining: number;
  spanSeconds: number;
}) {
  const fraction = Math.min(1, Math.max(0, 1 - secondsRemaining / spanSeconds));
  const radius = 202;
  const strokeWidth = 12;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - fraction * circumference;

  const angle = fraction * 2 * Math.PI - Math.PI / 2;
  const headX = 210 + radius * Math.cos(angle);
  const headY = 210 + radius * Math.sin(angle);

  const isLastMinute = secondsRemaining <= 60;

  return (
    <svg viewBox="0 0 420 420" className="w-full h-full absolute inset-0 z-20 overflow-visible pointer-events-none">
      <defs>
        <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F5C518" />
          <stop offset="50%" stopColor="#FFE98A" />
          <stop offset="100%" stopColor="#F5A800" />
        </linearGradient>

        <linearGradient id="purpleRedYellowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#9333EA" />
          <stop offset="30%" stopColor="#A855F7" />
          <stop offset="60%" stopColor="#EF4444" />
          <stop offset="100%" stopColor="#FACC15" />
        </linearGradient>

        <filter id="cleanGlowFilter" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" result="blur" />
        </filter>
      </defs>

      {/* Dark Circular Track Base */}
      <circle
        cx="210"
        cy="210"
        r={radius}
        fill="none"
        stroke="#16191E"
        strokeWidth={strokeWidth}
      />
      <circle
        cx="210"
        cy="210"
        r={radius + strokeWidth / 2}
        fill="none"
        stroke="rgba(255, 255, 255, 0.09)"
        strokeWidth={1}
      />
      <circle
        cx="210"
        cy="210"
        r={radius - strokeWidth / 2}
        fill="none"
        stroke="rgba(255, 255, 255, 0.06)"
        strokeWidth={1}
      />

      {/* Breathing Glow-and-Fade Luminescence Layers (Only during the last minute) */}
      {isLastMinute && fraction > 0.005 && (
        <>
          <circle
            cx="210"
            cy="210"
            r={radius}
            fill="none"
            stroke="url(#purpleRedYellowGradient)"
            strokeWidth={strokeWidth + 6}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform="rotate(-90 210 210)"
            className="animate-bar-glow"
            filter="url(#cleanGlowFilter)"
          />
          <circle
            cx="210"
            cy="210"
            r={radius}
            fill="none"
            stroke="#EF4444"
            strokeWidth={strokeWidth + 2}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform="rotate(-90 210 210)"
            className="animate-bar-glow-subtle"
          />
        </>
      )}

      {/* Subtle non-pulsing ambient border when before last minute */}
      {!isLastMinute && fraction > 0.005 && (
        <circle
          cx="210"
          cy="210"
          r={radius}
          fill="none"
          stroke="#F5C518"
          strokeWidth={strokeWidth + 2}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform="rotate(-90 210 210)"
          opacity="0.25"
        />
      )}

      {/* Main Crisp Progress Arc */}
      {fraction > 0.005 && (
        <circle
          cx="210"
          cy="210"
          r={radius}
          fill="none"
          stroke={isLastMinute ? "url(#purpleRedYellowGradient)" : "url(#goldGradient)"}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform="rotate(-90 210 210)"
        />
      )}

      {/* Leading Head Bead with Synchronized Glow-and-Fade */}
      {isLastMinute && (
        <circle
          cx={headX}
          cy={headY}
          r={strokeWidth * 1.15}
          fill="#EF4444"
          className="animate-bar-glow"
          filter="url(#cleanGlowFilter)"
        />
      )}
      <circle
        cx={headX}
        cy={headY}
        r={strokeWidth * 0.85}
        fill={isLastMinute ? "#FACC15" : "#FFE98A"}
        opacity={0.75}
      />
      <circle
        cx={headX}
        cy={headY}
        r={strokeWidth * 0.45}
        fill="#FFFFFF"
      />
    </svg>
  );
}
