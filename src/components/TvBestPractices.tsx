import React from 'react';
import {
  Tv,
  Power,
  WifiOff,
  SlidersHorizontal,
  Flame,
  CheckCircle,
  HelpCircle,
  Clock,
  Sparkles,
} from 'lucide-react';

export const TvBestPractices: React.FC = () => {
  return (
    <div className="space-y-6 text-slate-200">
      <div className="bg-gradient-to-r from-emerald-950/60 to-slate-900 border border-emerald-500/30 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-emerald-500/20 text-emerald-300 rounded-lg">
            <Tv className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-bold text-white">
            Android TV 24/7 Mosque Deployment Guide
          </h2>
        </div>
        <p className="text-sm text-slate-300 max-w-3xl">
          Running an unattended digital prayer timetable 24 hours a day, 365 days a year on an Android TV or stick requires
          specific hardware configurations, OS permissions, and stability guardrails. Here is the operational checklist for
          your ongoing project.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. Kiosk & Auto-Start Setup */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 font-bold text-white text-base">
            <Power className="w-5 h-5 text-emerald-400" />
            <span>1. Auto-Boot & Power Outage Recovery</span>
          </div>
          <p className="text-xs text-slate-400">
            Mosques frequently experience power cuts or power off breakers at night. When electricity returns, the TV must
            resume the prayer clock without human intervention.
          </p>
          <ul className="space-y-2 text-xs text-slate-300">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>BootReceiver.kt is already implemented:</strong> Your code listens for{' '}
                <code className="text-amber-300 font-mono">ACTION_BOOT_COMPLETED</code>.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>Android 10+ Background Start Restriction:</strong> On modern Android versions (Android 10+ / API 29+),
                background apps need the "Display over other apps" permission or system kiosk whitelisting to start an Activity
                from a broadcast receiver.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>Hardware recommendation:</strong> In TV HDMI CEC settings, configure the TV to automatically turn on and
                select HDMI 1 when power is restored.
              </span>
            </li>
          </ul>
        </div>

        {/* 2. Heat & 24/7 Thermal Management */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 font-bold text-white text-base">
            <Flame className="w-5 h-5 text-orange-400" />
            <span>2. Heat & Hardware Selection</span>
          </div>
          <p className="text-xs text-slate-400">
            TV dongles (sticks) lack fans and have tiny aluminum heatsinks. Mosque wall enclosures can trap hot air.
          </p>
          <ul className="space-y-2 text-xs text-slate-300">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
              <span>
                <strong>Stick vs Box:</strong> Prefer a small Android TV Box (e.g. Mi Box S, Mecool, or Nokia 8000) over HDMI sticks.
                Boxes have better passive ventilation and larger thermal masses.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
              <span>
                <strong>Reduce Continuous 60 FPS Re-rendering:</strong> Throttling the analog clock from 60 Hz to 1 Hz drops CPU/GPU
                temperature by 8°C to 12°C.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
              <span>
                <strong>HDMI Extension:</strong> If using a stick, use a short 1-foot flexible HDMI extension cable so the stick hangs
                freely in open air rather than being sandwiched behind the hot TV chassis.
              </span>
            </li>
          </ul>
        </div>

        {/* 3. Offline Resilience */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 font-bold text-white text-base">
            <WifiOff className="w-5 h-5 text-sky-400" />
            <span>3. Zero-Internet / Offline Reliability</span>
          </div>
          <p className="text-xs text-slate-400">
            Mosque Wi-Fi connections can be erratic or disconnected. The clock must never crash or show an empty screen.
          </p>
          <ul className="space-y-2 text-xs text-slate-300">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              <span>
                <strong>Your Open-Meteo Fallback is Great:</strong> In <code className="text-amber-300 font-mono">Logic.kt</code>,
                you already catch network exceptions and fall back to <code className="text-amber-300 font-mono">TEMP_FALLBACK = 21</code>.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              <span>
                <strong>NTP Time Synchronization:</strong> If the Android TV is completely offline, its internal Real Time Clock (RTC)
                might reset to 1970 on power cycle. Ensure either occasional Wi-Fi connectivity or a local Wi-Fi hotspot to sync
                Android system time.
              </span>
            </li>
          </ul>
        </div>

        {/* 4. Display Overscan & TV Settings */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 font-bold text-white text-base">
            <SlidersHorizontal className="w-5 h-5 text-purple-400" />
            <span>4. Physical TV Calibration Settings</span>
          </div>
          <p className="text-xs text-slate-400">
            Configuring the physical TV set menu ensures the UI is displayed sharp and without bezel cutoffs.
          </p>
          <ul className="space-y-2 text-xs text-slate-300">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
              <span>
                <strong>Picture Aspect Ratio:</strong> In TV Picture Settings, set Picture Size to{' '}
                <strong>"Just Scan"</strong> (LG), <strong>"Screen Fit"</strong> (Samsung), or <strong>"Full / 1:1"</strong> (Sony/Mi).
                Do not leave on "16:9 Auto", which zooms in and clips borders.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
              <span>
                <strong>Disable Sleep Timers:</strong> Disable "Auto Standby", "Energy Saving", "No Signal Auto Off", and screensavers.
              </span>
            </li>
          </ul>
        </div>
      </div>

      {/* Suggested Architecture for Next Phase */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <span>Next Feature Roadmap for Masjid TV</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <div className="font-bold text-emerald-400 mb-1 flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              <span>1. Dynamic Sun Calculation</span>
            </div>
            <p className="text-slate-300">
              Integrate <code className="text-amber-300 font-mono">com.batoulapps.adhan:adhan</code> so Fajr, Sunrise, Zuhar, Asar,
              Maghrib, and Isha are automatically calculated every day for Lalpania (<code className="font-mono">23.65, 86.15</code>).
            </p>
          </div>
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <div className="font-bold text-sky-400 mb-1 flex items-center gap-1.5">
              <SlidersHorizontal className="w-4 h-4" />
              <span>2. TV Settings Dialog</span>
            </div>
            <p className="text-slate-300">
              Long-press D-Pad Center or press the Menu button to open a translucent settings overlay allowing the Imam or committee
              to adjust Jamaat offset minutes, mute sound, or change Hijri offset without rebuilding the APK.
            </p>
          </div>
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <div className="font-bold text-purple-400 mb-1 flex items-center gap-1.5">
              <Tv className="w-4 h-4" />
              <span>3. Remote Web Control</span>
            </div>
            <p className="text-slate-300">
              Host a lightweight Firebase Firestore or REST endpoint so the committee can update announcements and special Ramadan/Taraweeh
              timings directly from a smartphone!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
