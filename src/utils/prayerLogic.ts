export interface PrayerTime {
  name: string;
  en: string;
  adhan: string;
  jamaat: string;
  offset?: number; // minutes from Athan to Jamaat
  auto?: boolean;  // automatic Maghrib calculation from sunset
  jo?: number;     // Maghrib Jamaat offset
  on?: boolean;
}

export interface SpecialPrayer {
  on: boolean;
  time: string;
  title: string;
}

export interface RamadanConfig {
  on: boolean;
  sehri: string;
  iftar: string;
  autoCalc?: boolean;
  rozaDayOverride?: number | null;
  remainingDaysOverride?: number | null;
}

export interface HijriRamadanInfo {
  day: number;
  monthIndex: number;
  monthName: string;
  year: number;
  text: string;
  isRamadan: boolean;
  autoRozaDay: number;
  autoRemainingDays: number;
}

export interface CountdownConfig {
  beforeAthanShow: number; // default 20 mins: when next prayer is 20m away, display Athan time
  athanCountdown: number;  // default 3 mins: start countdown 3m before Athan
  jamaatCountdown: number; // default 3 mins: start countdown 3m before Jamaat
}

export interface ActiveNamazDuration {
  fajr: number;
  dhuhr: number;
  asr: number;
  maghrib: number;
  isha: number;
  jumuah: number;
}

export interface LocationConfig {
  country: string;
  state: string;
  city: string;
  lat: number;
  lng: number;
  sunriseOffsetMin: number;
  sunsetOffsetMin: number;
}

export interface ApiConfig {
  prayer: string;
  method: string;
  school: string;
  sun: string;
  weather: string;
}

export interface WeatherData {
  temp: number;
  humidity: number;
  apparentTemp: number;
  windSpeed: number;
  precipitation: number;
  weatherCode: number;
  icon: string;
}

export interface NoticeItem {
  icon: string;
  title: string;
  text: string;
}

export interface MasjidConfig {
  masjid: string;
  masjidSub: string;
  masjidAddr: string;
  masjidShort: string;
  sunrise: string;
  sunset: string;
  sunriseOffsetMin: number;
  sunsetOffsetMin: number;
  prayerMinutes: number;
  countdownMinutes: number;
  hijriOffset: number;
  lat: number;
  lon: number;
  tempFallback: number;
  prayers: PrayerTime[];
  jumah: PrayerTime;
  sp: {
    fitr: SpecialPrayer;
    adha: SpecialPrayer;
    tar: SpecialPrayer;
  };
  ram: RamadanConfig;
  cd: CountdownConfig;
  loc: LocationConfig;
  api: ApiConfig;
  dur: ActiveNamazDuration;
  announcements: NoticeItem[];
  annText: string;
  annEnabled: boolean;
  uiScale: number;
}

/** Convert minutes from midnight to "HH:mm" */
export function minToHHMM(m: number): string {
  const norm = ((m % 1440) + 1440) % 1440;
  const h = Math.floor(norm / 60);
  const mm = norm % 60;
  return `${h.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;
}

/** Convert "HH:mm" to minutes from midnight */
export function toMin(s: string): number {
  if (!s) return 0;
  const parts = s.split(":");
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
}

/** "15:47" -> { time: "03:47", period: "PM" } */
export function fmt12(s: string): { time: string; period: string } {
  const m = toMin(s);
  const h = Math.floor(m / 60);
  const mm = m % 60;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const formattedTime = `${h12.toString().padStart(2, "0")}:${mm.toString().padStart(2, "0")}`;
  const period = h >= 12 ? "PM" : "AM";
  return { time: formattedTime, period };
}

/** Seconds remaining until target "HH:mm" time from given current seconds */
export function untilSeconds(targetHHmm: string, nowSec: number): number {
  let diff = toMin(targetHHmm) * 60 - nowSec;
  if (diff <= 0) diff += 86400;
  return diff;
}

/** Compute current active prayer index and next prayer index */
export function getPrayerIndices(prayers: PrayerTime[], nowMin: number): { currentIndex: number; nextIndex: number } {
  let currentIndex = prayers.length - 1;
  for (let i = 0; i < prayers.length; i++) {
    if (toMin(prayers[i].adhan) <= nowMin) {
      currentIndex = i;
    }
  }
  const nextIndex = (currentIndex + 1) % prayers.length;
  return { currentIndex, nextIndex };
}

/** Weather emoji lookup matching Kotlin wxEmoji() */
export function getWxEmoji(code: number): string {
  if (code === 0) return "☀️";
  if (code === 1) return "🌤️";
  if (code === 2) return "⛅";
  if (code === 3) return "☁️";
  if (code === 45 || code === 48) return "🌫️";
  if (code >= 51 && code <= 57) return "🌦️";
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return "🌧️";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "❄️";
  if (code >= 95) return "⛈️";
  return "☁️";
}

export function formatHindiRoza(day: number): string {
  const d = Math.max(1, Math.min(30, Math.round(day)));
  if (d === 1 || d === 21) return `${d}st रोज़ा`;
  if (d === 2 || d === 22) return `${d}nd रोज़ा`;
  if (d === 3 || d === 23) return `${d}rd रोज़ा`;
  return `${d}th रोज़ा`;
}

export function computeHijriAndRamadan(
  date: Date,
  hijriOffset: number = 0,
  alAdhanHijri?: any
): HijriRamadanInfo {
  const months = [
    "Muharram",
    "Safar",
    "Rabi al-Awwal",
    "Rabi al-Thani",
    "Jumada al-Awwal",
    "Jumada al-Thani",
    "Rajab",
    "Shaban",
    "Ramadan",
    "Shawwal",
    "Dhu al-Qadah",
    "Dhu al-Hijjah"
  ];

  const baseDate = new Date(date);
  baseDate.setDate(baseDate.getDate() + hijriOffset);
  const jd = Math.floor(baseDate.getTime() / 86400000) + 2440587.5;
  const l = Math.floor(jd - 1948439.5) + 10632;
  const n = Math.floor((l - 1) / 10631);
  const l2 = l - 10631 * n + 354;
  const j =
    Math.floor((10985 - l2) / 5316) * Math.floor((50 * l2) / 17719) +
    Math.floor(l2 / 5670) * Math.floor((43 * l2) / 15238);
  const l3 = l2 - Math.floor((17719 * j) / 50) - 29;
  const rawM = Math.floor((24 * l3) / 709); // 1..12
  let mIdx = Math.max(0, Math.min(11, rawM - 1));
  let d = Math.max(1, Math.min(30, l3 - Math.floor((709 * rawM) / 24)));
  let y = 30 * n + j - 30;
  let monthName = months[mIdx] || "Muharram";

  if (alAdhanHijri) {
    const apiDay = parseInt(alAdhanHijri.day, 10);
    const apiMonthNum = alAdhanHijri.month?.number
      ? parseInt(alAdhanHijri.month.number, 10)
      : mIdx + 1;
    const apiYear = parseInt(alAdhanHijri.year, 10) || y;
    if (!isNaN(apiDay) && apiDay >= 1 && apiDay <= 30) {
      let adjDay = apiDay + hijriOffset;
      let adjMonthIdx = Math.max(0, Math.min(11, apiMonthNum - 1));
      let adjYear = apiYear;
      if (adjDay < 1) {
        adjDay += 30;
        adjMonthIdx -= 1;
        if (adjMonthIdx < 0) {
          adjMonthIdx = 11;
          adjYear -= 1;
        }
      } else if (adjDay > 30) {
        adjDay -= 30;
        adjMonthIdx += 1;
        if (adjMonthIdx > 11) {
          adjMonthIdx = 0;
          adjYear += 1;
        }
      }
      d = adjDay;
      mIdx = adjMonthIdx;
      y = adjYear;
      monthName =
        hijriOffset === 0 && alAdhanHijri.month?.en
          ? alAdhanHijri.month.en
          : months[mIdx] || "Muharram";
    }
  }

  const isRamadan = mIdx === 8;
  const autoRozaDay = Math.max(1, Math.min(30, d));

  let autoRemainingDays: number;
  if (isRamadan) {
    autoRemainingDays = Math.max(0, 30 - d);
  } else {
    const monthLen = (m: number) => (m % 2 === 0 ? 30 : 29);
    let rem = Math.max(1, monthLen(mIdx) - d + 1);
    let curM = (mIdx + 1) % 12;
    while (curM !== 8) {
      rem += monthLen(curM);
      curM = (curM + 1) % 12;
    }
    autoRemainingDays = rem;
  }

  return {
    day: d,
    monthIndex: mIdx,
    monthName,
    year: y,
    text: `${d} ${monthName} ${y} AH`,
    isRamadan,
    autoRozaDay,
    autoRemainingDays
  };
}

export const STORAGE_KEY = "masjid-settings-v1";

export const defaultConfig: MasjidConfig = {
  masjid: "Jama Masjid Kodwatand, Lalpania",
  masjidSub: "Lalpania",
  masjidAddr: "Kodwatand, Lalpania, Bokaro, Jharkhand, India",
  masjidShort: "Jama Masjid Kodwatand",
  sunrise: "05:48",
  sunset: "17:14",
  sunriseOffsetMin: 0,
  sunsetOffsetMin: 0,
  prayerMinutes: 10,
  countdownMinutes: 15,
  hijriOffset: 0,
  lat: 23.741521,
  lon: 85.745422,
  tempFallback: 21,
  prayers: [
    { name: "फ़ज्र", en: "FAJR", adhan: "04:26", jamaat: "04:56", offset: 30, on: true },
    { name: "ज़ोहर", en: "DHUHR", adhan: "11:37", jamaat: "11:52", offset: 15, on: true },
    { name: "अस्र", en: "ASR", adhan: "15:47", jamaat: "16:02", offset: 15, on: true },
    { name: "मग़रिब", en: "MAGHRIB", adhan: "17:16", jamaat: "17:21", offset: 2, auto: true, jo: 5, on: true },
    { name: "इशा", en: "ISHA", adhan: "18:41", jamaat: "18:56", offset: 15, on: true }
  ],
  jumah: { name: "जुमा", en: "JUMUAH", adhan: "12:45", jamaat: "13:15", offset: 30, on: true },
  sp: {
    fitr: { on: true, time: "07:30", title: "Eid-ul-Fitr" },
    adha: { on: true, time: "07:30", title: "Eid-ul-Adha" },
    tar: { on: true, time: "20:00", title: "Taraweeh" }
  },
  ram: {
    on: true,
    sehri: "04:41",
    iftar: "17:14",
    autoCalc: true,
    rozaDayOverride: null,
    remainingDaysOverride: null
  },
  cd: {
    beforeAthanShow: 20, // 20 mins before Athan: show Athan time
    athanCountdown: 3,   // 3 mins before Athan: start countdown
    jamaatCountdown: 3   // 3 mins before Jamaat: start countdown
  },
  loc: {
    country: "India",
    state: "Jharkhand",
    city: "Lalpania",
    lat: 23.741521,
    lng: 85.745422,
    sunriseOffsetMin: 0,
    sunsetOffsetMin: 0
  },
  api: {
    prayer: "AlAdhan (aladhan.com)",
    method: "1", // University of Islamic Sciences, Karachi
    school: "1", // Hanafi
    sun: "sunrise-sunset.org",
    weather: "Open-Meteo (open-meteo.com)"
  },
  dur: {
    fajr: 5,
    dhuhr: 5,
    asr: 5,
    maghrib: 5,
    isha: 5,
    jumuah: 5
  },
  announcements: [
    {
      icon: "🕌",
      title: "जुमा के औक़ात:",
      text: "1st Khutbah 12:45 PM | 2nd Khutbah 01:45 PM. Please arrive early and park responsibly."
    },
    {
      icon: "🌙",
      title: "Quran Memorization Classes:",
      text: "Every evening after Maghrib. All children are welcome."
    }
  ],
  annText: "Welcome to our Masjid. Please maintain silence in the mosque.",
  annEnabled: true,
  uiScale: 100
};

/** Deep clone object */
export function clone<T>(o: T): T {
  return JSON.parse(JSON.stringify(o));
}

/** Deep merge b into a */
export function mergeConfig(a: any, b: any): any {
  for (const k in b) {
    if (b[k] && typeof b[k] === "object" && !Array.isArray(b[k]) && a[k] && typeof a[k] === "object") {
      mergeConfig(a[k], b[k]);
    } else if (b[k] !== undefined) {
      a[k] = b[k];
    }
  }
  return a;
}

/** Load config from localStorage */
export function loadConfigFromStorage(): MasjidConfig {
  if (typeof window === "undefined") return clone(defaultConfig);
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // If parsed was stored from the Android settings tool schema:
      // Convert settings schema to MasjidConfig
      const cfg = clone(defaultConfig);
      if (parsed.masjid) {
        cfg.masjid = parsed.masjid.name || cfg.masjid;
        cfg.masjidSub = parsed.masjid.sub || cfg.masjidSub;
        cfg.masjidAddr = parsed.masjid.addr || cfg.masjidAddr;
      }
      if (parsed.loc) {
        cfg.loc.lat = parsed.loc.lat ?? cfg.loc.lat;
        cfg.loc.lng = parsed.loc.lng ?? cfg.loc.lng;
        cfg.lat = cfg.loc.lat;
        cfg.lon = cfg.loc.lng;
        cfg.loc.sunriseOffsetMin = parsed.loc.sunriseOffsetMin ?? cfg.loc.sunriseOffsetMin;
        cfg.loc.sunsetOffsetMin = parsed.loc.sunsetOffsetMin ?? cfg.loc.sunsetOffsetMin;
        cfg.sunriseOffsetMin = cfg.loc.sunriseOffsetMin;
        cfg.sunsetOffsetMin = cfg.loc.sunsetOffsetMin;
      }
      if (parsed.pr) {
        const map = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
        cfg.prayers.forEach((p, idx) => {
          const key = map[idx];
          const item = parsed.pr[key];
          if (item) {
            if (idx === 3) {
              p.auto = item.auto !== undefined ? !!item.auto : true;
              p.offset = item.off !== undefined ? item.off : 2;
              p.jo = item.jo !== undefined ? item.jo : 5;
              if (item.sunset !== undefined) {
                cfg.sunset = minToHHMM(item.sunset);
              }
              if (p.auto) {
                const ssMin = item.sunset !== undefined ? item.sunset : toMin(cfg.sunset);
                p.adhan = minToHHMM(ssMin + (p.offset ?? 2));
              } else if (item.t !== undefined) {
                p.adhan = minToHHMM(item.t);
              }
              p.jamaat = minToHHMM(toMin(p.adhan) + (p.jo ?? 5));
              if (item.on !== undefined) p.on = !!item.on;
            } else {
              if (item.t !== undefined) p.adhan = minToHHMM(item.t);
              if (item.off !== undefined) p.offset = item.off;
              if (item.j !== undefined) p.jamaat = minToHHMM(item.j);
              else if (item.off !== undefined) p.jamaat = minToHHMM((item.t || toMin(p.adhan)) + item.off);
              if (item.on !== undefined) p.on = !!item.on;
            }
          }
        });
      }
      if (parsed.jumuah) {
        if (parsed.jumuah.t !== undefined) cfg.jumah.adhan = minToHHMM(parsed.jumuah.t);
        if (parsed.jumuah.off !== undefined) cfg.jumah.offset = parsed.jumuah.off;
        if (parsed.jumuah.j !== undefined) cfg.jumah.jamaat = minToHHMM(parsed.jumuah.j);
        else if (parsed.jumuah.off !== undefined) cfg.jumah.jamaat = minToHHMM(toMin(cfg.jumah.adhan) + parsed.jumuah.off);
        if (parsed.jumuah.on !== undefined) cfg.jumah.on = !!parsed.jumuah.on;
      }
      if (parsed.sp) {
        if (parsed.sp.fitr) {
          cfg.sp.fitr.on = !!parsed.sp.fitr.on;
          if (parsed.sp.fitr.t !== undefined) cfg.sp.fitr.time = minToHHMM(parsed.sp.fitr.t);
        }
        if (parsed.sp.adha) {
          cfg.sp.adha.on = !!parsed.sp.adha.on;
          if (parsed.sp.adha.t !== undefined) cfg.sp.adha.time = minToHHMM(parsed.sp.adha.t);
        }
        if (parsed.sp.tar) {
          cfg.sp.tar.on = !!parsed.sp.tar.on;
          if (parsed.sp.tar.t !== undefined) cfg.sp.tar.time = minToHHMM(parsed.sp.tar.t);
        }
      }
      if (parsed.ram) {
        cfg.ram.on = !!parsed.ram.on;
        if (parsed.ram.sehri !== undefined) cfg.ram.sehri = minToHHMM(parsed.ram.sehri);
        if (parsed.ram.iftar !== undefined) cfg.ram.iftar = minToHHMM(parsed.ram.iftar);
        if (parsed.ram.autoCalc !== undefined) cfg.ram.autoCalc = !!parsed.ram.autoCalc;
        if (parsed.ram.rozaDayOverride !== undefined) cfg.ram.rozaDayOverride = parsed.ram.rozaDayOverride;
        if (parsed.ram.remainingDaysOverride !== undefined) cfg.ram.remainingDaysOverride = parsed.ram.remainingDaysOverride;
      }
      if (parsed.cd) {
        cfg.cd.athanCountdown = parsed.cd.athan ?? cfg.cd.athanCountdown;
        cfg.cd.jamaatCountdown = parsed.cd.jamaat ?? cfg.cd.jamaatCountdown;
        cfg.cd.beforeAthanShow = parsed.cd.beforeAthanShow ?? cfg.cd.beforeAthanShow;
      }
      if (parsed.dur) {
        cfg.dur = { ...cfg.dur, ...parsed.dur };
      }
      if (parsed.ann) {
        cfg.annEnabled = !!parsed.ann.on;
        cfg.annText = parsed.ann.text || cfg.annText;
      }
      if (parsed.ui && parsed.ui.scale) {
        cfg.uiScale = parsed.ui.scale;
      }
      return cfg;
    }
  } catch (e) {
    console.error("Failed to load settings from localStorage", e);
  }
  return clone(defaultConfig);
}

/** Save config to localStorage in matching schema for Android settings compatibility */
export function saveConfigToStorage(config: MasjidConfig): void {
  if (typeof window === "undefined") return;
  try {
    const rawSchema = {
      masjid: {
        name: config.masjid,
        sub: config.masjidSub,
        addr: config.masjidAddr
      },
      pr: {
        fajr: { on: config.prayers[0].on ? 1 : 0, t: toMin(config.prayers[0].adhan), off: config.prayers[0].offset ?? 30, j: toMin(config.prayers[0].jamaat) },
        dhuhr: { on: config.prayers[1].on ? 1 : 0, t: toMin(config.prayers[1].adhan), off: config.prayers[1].offset ?? 15, j: toMin(config.prayers[1].jamaat) },
        asr: { on: config.prayers[2].on ? 1 : 0, t: toMin(config.prayers[2].adhan), off: config.prayers[2].offset ?? 15, j: toMin(config.prayers[2].jamaat) },
        maghrib: {
          on: config.prayers[3].on ? 1 : 0,
          auto: config.prayers[3].auto ? 1 : 0,
          sunset: toMin(config.sunset),
          t: toMin(config.prayers[3].adhan),
          off: config.prayers[3].offset ?? 2,
          j: toMin(config.prayers[3].jamaat),
          jo: config.prayers[3].jo ?? 5
        },
        isha: { on: config.prayers[4].on ? 1 : 0, t: toMin(config.prayers[4].adhan), off: config.prayers[4].offset ?? 15, j: toMin(config.prayers[4].jamaat) }
      },
      jumuah: {
        on: config.jumah.on ? 1 : 0,
        t: toMin(config.jumah.adhan),
        off: config.jumah.offset ?? 30,
        j: toMin(config.jumah.jamaat)
      },
      sp: {
        fitr: { on: config.sp.fitr.on ? 1 : 0, t: toMin(config.sp.fitr.time) },
        adha: { on: config.sp.adha.on ? 1 : 0, t: toMin(config.sp.adha.time) },
        tar: { on: config.sp.tar.on ? 1 : 0, t: toMin(config.sp.tar.time) }
      },
      ram: {
        on: config.ram.on ? 1 : 0,
        sehri: toMin(config.ram.sehri),
        iftar: toMin(config.ram.iftar),
        autoCalc: config.ram.autoCalc !== false ? 1 : 0,
        rozaDayOverride: config.ram.rozaDayOverride ?? null,
        remainingDaysOverride: config.ram.remainingDaysOverride ?? null
      },
      cd: {
        athan: config.cd.athanCountdown,
        jamaat: config.cd.jamaatCountdown,
        beforeAthanShow: config.cd.beforeAthanShow
      },
      loc: {
        country: config.loc.country,
        state: config.loc.state,
        city: config.loc.city,
        lat: config.loc.lat,
        lng: config.loc.lng,
        sunriseOffsetMin: config.loc.sunriseOffsetMin,
        sunsetOffsetMin: config.loc.sunsetOffsetMin
      },
      api: config.api,
      dur: config.dur,
      ann: {
        on: config.annEnabled ? 1 : 0,
        text: config.annText
      },
      ui: { scale: config.uiScale }
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rawSchema));
  } catch (e) {
    console.error("Failed to save settings to localStorage", e);
  }
}

/** Fetch real Sunrise & Sunset from https://api.sunrise-sunset.org/v2 */
export async function fetchSunriseSunset(
  lat: number = 23.741521,
  lng: number = 85.745422,
  sunriseOff: number = 0,
  sunsetOff: number = 0
): Promise<{ sunrise: string; sunset: string; rawSunrise: string; rawSunset: string } | null> {
  try {
    const res = await fetch(`https://api.sunrise-sunset.org/v2?lat=${lat}&lng=${lng}&date=today`);
    if (!res.ok) return null;
    const json = await res.json();
    if (json.status !== "OK" && !json.sunrise) return null;

    // ISO timestamps: e.g. "2026-10-24T05:48:23+05:30"
    const srDate = new Date(json.sunrise);
    const ssDate = new Date(json.sunset);

    const srMin = srDate.getHours() * 60 + srDate.getMinutes();
    const ssMin = ssDate.getHours() * 60 + ssDate.getMinutes();

    const adjSrMin = srMin + sunriseOff;
    const adjSsMin = ssMin + sunsetOff;

    return {
      sunrise: minToHHMM(adjSrMin),
      sunset: minToHHMM(adjSsMin),
      rawSunrise: minToHHMM(srMin),
      rawSunset: minToHHMM(ssMin)
    };
  } catch (e) {
    console.warn("Could not fetch sunrise/sunset API, using fallback", e);
    return null;
  }
}

/** Fetch real Weather from Open-Meteo API */
export async function fetchOpenMeteoWeather(
  lat: number = 23.741521,
  lng: number = 85.745422
): Promise<WeatherData | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset&timezone=Asia%2FKolkata&forecast_days=7`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    const cur = json.current;
    if (!cur) return null;

    const weatherCode = cur.weather_code ?? 0;
    return {
      temp: Math.round(cur.temperature_2m ?? 21),
      humidity: Math.round(cur.relative_humidity_2m ?? 50),
      apparentTemp: Math.round(cur.apparent_temperature ?? 21),
      windSpeed: Math.round(cur.wind_speed_10m ?? 8),
      precipitation: cur.precipitation ?? 0,
      weatherCode,
      icon: getWxEmoji(weatherCode)
    };
  } catch (e) {
    console.warn("Could not fetch Open-Meteo weather API", e);
    return null;
  }
}

/** Fetch AlAdhan API prayer start & end timings */
export async function fetchAlAdhanTimings(
  lat: number = 23.741521,
  lng: number = 85.745422,
  method: string = "1",
  school: string = "1"
): Promise<{ timings: Record<string, string>; hijri: any } | null> {
  try {
    const url = `https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lng}&method=${method}&school=${school}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    if (json.code === 200 && json.data) {
      return {
        timings: json.data.timings,
        hijri: json.data.date?.hijri
      };
    }
  } catch (e) {
    console.warn("Could not fetch AlAdhan API", e);
  }
  return null;
}
