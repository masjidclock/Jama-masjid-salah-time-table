import React, { useState } from 'react';
import {
  FileCode2,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Layers,
  Volume2,
  Tv,
  Zap,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

export const CodeWalkthrough: React.FC = () => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [expandedFiles, setExpandedFiles] = useState<Record<string, boolean>>({
    config: true,
    screens: true,
    sounds: true,
    bugs: true,
  });

  const toggleFile = (key: string) => {
    setExpandedFiles((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-6 text-slate-200">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-emerald-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Architecture</span>
            <Layers className="w-4 h-4" />
          </div>
          <div className="text-lg font-bold text-white">Jetpack Compose TV</div>
          <p className="text-xs text-slate-400 mt-1">
            Single Activity, 960×540 DP Canvas density scaling to any 1080p/4K TV resolution.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-amber-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Visual Design</span>
            <Tv className="w-4 h-4" />
          </div>
          <div className="text-lg font-bold text-white">Islamic Gold Theme</div>
          <p className="text-xs text-slate-400 mt-1">
            Custom canvas analog clock, frosted glassmorphism, animated sweep countdown, floating dust motes.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-sky-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Audio Engine</span>
            <Volume2 className="w-4 h-4" />
          </div>
          <div className="text-lg font-bold text-white">SoundPool + Bell</div>
          <p className="text-xs text-slate-400 mt-1">
            Alternating tick/tock in final 59 seconds; zero-countdown chime bell cue.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-purple-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Kiosk / Standalone</span>
            <Zap className="w-4 h-4" />
          </div>
          <div className="text-lg font-bold text-white">Auto-Boot Support</div>
          <p className="text-xs text-slate-400 mt-1">
            BOOT_COMPLETED receiver launches app automatically when TV turns on.
          </p>
        </div>
      </div>

      {/* Critical Findings & Bug Audit */}
      <div className="bg-slate-900 border border-amber-500/30 rounded-xl p-5 shadow-lg">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
          <h3 className="text-base font-bold text-white">
            Comprehensive Code Audit: 5 Key Issues & Recommendations
          </h3>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          These issues were discovered during line-by-line inspection of your Kotlin files. Addressing them will prevent
          runtime crashes, thermal throttling on TV sticks, and out-of-sync prayer times.
        </p>

        <div className="space-y-3">
          {/* Finding 1 */}
          <div className="bg-slate-950 border border-red-500/30 rounded-lg p-3.5 flex flex-col md:flex-row gap-3">
            <div className="shrink-0 p-2 bg-red-950/60 rounded-md text-red-400 h-fit">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="flex-1 text-xs">
              <div className="flex items-center gap-2 font-bold text-red-300 text-sm">
                <span>1. Hardcoded Constant Prayer Times in Config.kt</span>
                <span className="text-[10px] font-mono bg-red-950 border border-red-800 text-red-300 px-1.5 py-0.5 rounded">
                  Critical
                </span>
              </div>
              <p className="text-slate-300 mt-1">
                Prayer times (<code className="text-amber-300 font-mono">04:26</code>,{' '}
                <code className="text-amber-300 font-mono">11:37</code>, etc.) and Sunrise/Sunset are hardcoded constants.
                Because Islamic prayer times change every single day by 1-2 minutes depending on the sun's solar declination,
                the display will drift out of sync within 2-3 days unless the APK is recompiled daily.
              </p>
              <div className="mt-2 text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 p-2 rounded">
                <strong>Solution:</strong> Integrate dynamic solar calculation (e.g.{' '}
                <code className="font-mono">com.batoulapps.adhan:adhan:1.2.1</code>) or read from a local monthly JSON
                schedule/Room database or Firebase/API.
              </div>
            </div>
          </div>

          {/* Finding 2 */}
          <div className="bg-slate-950 border border-amber-500/30 rounded-lg p-3.5 flex flex-col md:flex-row gap-3">
            <div className="shrink-0 p-2 bg-amber-950/60 rounded-md text-amber-400 h-fit">
              <Cpu className="w-4 h-4" />
            </div>
            <div className="flex-1 text-xs">
              <div className="flex items-center gap-2 font-bold text-amber-300 text-sm">
                <span>2. Dual withFrameNanos Loops Burning GPU/CPU 24/7</span>
                <span className="text-[10px] font-mono bg-amber-950 border border-amber-800 text-amber-300 px-1.5 py-0.5 rounded">
                  Performance Risk
                </span>
              </div>
              <p className="text-slate-300 mt-1">
                In <code className="text-amber-300 font-mono">Screens.kt</code>, both{' '}
                <code className="text-amber-300 font-mono">AnalogClock</code> and{' '}
                <code className="text-amber-300 font-mono">Dust</code> run independent infinite{' '}
                <code className="text-amber-300 font-mono">withFrameNanos</code> loops at 60Hz. On low-powered Android TV
                dongles (e.g. Mi TV Stick, Fire TV Stick with 1GB RAM) running 24/7 in mosques, this can cause thermal
                throttling, memory pressure, and sluggish UI response over time.
              </p>
              <div className="mt-2 text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 p-2 rounded">
                <strong>Solution:</strong> Update the clock second hand on 1-second intervals (or 10 FPS) instead of unthrottled
                60Hz, and add an option to throttle or disable dust particles.
              </div>
            </div>
          </div>

          {/* Finding 3 */}
          <div className="bg-slate-950 border border-amber-500/30 rounded-lg p-3.5 flex flex-col md:flex-row gap-3">
            <div className="shrink-0 p-2 bg-amber-950/60 rounded-md text-amber-400 h-fit">
              <Volume2 className="w-4 h-4" />
            </div>
            <div className="flex-1 text-xs">
              <div className="flex items-center gap-2 font-bold text-amber-300 text-sm">
                <span>3. Asynchronous SoundPool Load Race Condition in Sounds.kt</span>
                <span className="text-[10px] font-mono bg-amber-950 border border-amber-800 text-amber-300 px-1.5 py-0.5 rounded">
                  Audio Bug
                </span>
              </div>
              <p className="text-slate-300 mt-1">
                <code className="text-amber-300 font-mono">SoundPool.load()</code> is asynchronous. If prayer countdown reaches
                the 59-second mark immediately after app startup, <code className="text-amber-300 font-mono">pool?.play()</code>{' '}
                will fail silently because the audio decoder hasn't finished loading the raw wav files into memory.
              </p>
              <div className="mt-2 text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 p-2 rounded">
                <strong>Solution:</strong> Set an <code className="font-mono">OnLoadCompleteListener</code> on SoundPool and only
                trigger audio playback once samples are ready.
              </div>
            </div>
          </div>

          {/* Finding 4 */}
          <div className="bg-slate-950 border border-amber-500/30 rounded-lg p-3.5 flex flex-col md:flex-row gap-3">
            <div className="shrink-0 p-2 bg-amber-950/60 rounded-md text-amber-400 h-fit">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="flex-1 text-xs">
              <div className="flex items-center gap-2 font-bold text-amber-300 text-sm">
                <span>4. Potential Native MediaPlayer Handle Leak on Bell</span>
                <span className="text-[10px] font-mono bg-amber-950 border border-amber-800 text-amber-300 px-1.5 py-0.5 rounded">
                  Memory Leak
                </span>
              </div>
              <p className="text-slate-300 mt-1">
                In <code className="text-amber-300 font-mono">Sounds.kt</code>,{' '}
                <code className="text-amber-300 font-mono">MediaPlayer.create(c, R.raw.bell)</code> allocates a native media
                session on every bell ring. If the player fails to reach the completion listener due to interruption or rapid
                state toggle, native audio tracks remain unreleased in Android's AudioFlinger.
              </p>
              <div className="mt-2 text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 p-2 rounded">
                <strong>Solution:</strong> Pre-load the bell sound into <code className="font-mono">SoundPool</code> alongside
                tick and tock, eliminating <code className="font-mono">MediaPlayer</code> overhead entirely.
              </div>
            </div>
          </div>

          {/* Finding 5 */}
          <div className="bg-slate-950 border border-blue-500/30 rounded-lg p-3.5 flex flex-col md:flex-row gap-3">
            <div className="shrink-0 p-2 bg-blue-950/60 rounded-md text-blue-400 h-fit">
              <Tv className="w-4 h-4" />
            </div>
            <div className="flex-1 text-xs">
              <div className="flex items-center gap-2 font-bold text-blue-300 text-sm">
                <span>5. TV Overscan Safe-Margin Consideration</span>
                <span className="text-[10px] font-mono bg-blue-950 border border-blue-800 text-blue-300 px-1.5 py-0.5 rounded">
                  Display Polish
                </span>
              </div>
              <p className="text-slate-300 mt-1">
                While <code className="text-amber-300 font-mono">padding(horizontal = 18.dp)</code> looks great on high-end
                monitors, many consumer TV sets and projector setups crop 3% to 5% of the outer perimeter by default (known
                as TV Overscan). The current bottom-left countdown clock (<code className="text-amber-300 font-mono">bottom = 12.dp</code>)
                can be partially cut off on uncalibrated mosque TVs.
              </p>
              <div className="mt-2 text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 p-2 rounded">
                <strong>Solution:</strong> Increase outer margins to 24-28dp or add an overscan compensation setting in the app.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* File by File Walkthrough Sections */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <FileCode2 className="w-5 h-5 text-emerald-400" />
          <span>File-by-File Code Breakdown & Recommended Patches</span>
        </h3>

        {/* Config.kt */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <button
            onClick={() => toggleFile('config')}
            className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-800/60 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="font-mono text-emerald-400 font-bold text-sm">Config.kt</span>
              <span className="text-xs text-slate-400">— Mosque metadata, timings, weather coords</span>
            </div>
            {expandedFiles['config'] ? (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-400" />
            )}
          </button>
          {expandedFiles['config'] && (
            <div className="p-4 border-t border-slate-800 bg-slate-950 text-xs space-y-3">
              <p className="text-slate-300">
                Contains data classes <code className="text-amber-300 font-mono">Prayer</code> and{' '}
                <code className="text-amber-300 font-mono">Notice</code>, plus the singleton{' '}
                <code className="text-amber-300 font-mono">object Config</code>.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-slate-300">
                <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                  <div className="font-bold text-white mb-1">Key Constants:</div>
                  <ul className="list-disc list-inside space-y-1 text-slate-400 font-mono text-[11px]">
                    <li>PRAYER_MINUTES = 10 (Active Jamaat screen duration)</li>
                    <li>COUNTDOWN_MINUTES = 15 (Trigger countdown before Jamaat)</li>
                    <li>LAT = 23.65, LON = 86.15 (Lalpania, Jharkhand)</li>
                    <li>HIJRI_OFFSET = 0L (Adjustable for moon sighting)</li>
                  </ul>
                </div>
                <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                  <div className="font-bold text-white mb-1">Languages Used:</div>
                  <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px]">
                    <li>Hindi Devanagari (फ़ज्र, ज़ोहर, अस्र, मग़रिब, इशा, जुमा)</li>
                    <li>English uppercase (FAJR, ZUHAR, ASAR, MAGHRIB, ISHA)</li>
                    <li>Urdu / Hindi announcement text for congregation notice</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Screens.kt */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <button
            onClick={() => toggleFile('screens')}
            className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-800/60 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="font-mono text-emerald-400 font-bold text-sm">Screens.kt</span>
              <span className="text-xs text-slate-400">— Jetpack Compose UI (Dashboard, Countdown, Jamaat, Clock, Dust)</span>
            </div>
            {expandedFiles['screens'] ? (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-400" />
            )}
          </button>
          {expandedFiles['screens'] && (
            <div className="p-4 border-t border-slate-800 bg-slate-950 text-xs space-y-3">
              <p className="text-slate-300">
                At 778 lines, this is the visual core of the application. It consists of:
              </p>
              <div className="space-y-2">
                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-amber-400 font-bold font-mono">Dashboard()</span>: Coordinates the top Header,
                  middle row (Jumah card, Analog clock, Next event countdown, Current prayer time span), bottom 5-prayer
                  grid, and bottom news ticker.
                </div>
                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-amber-400 font-bold font-mono">CountdownScreen()</span>: Takes over when seconds to
                  next Jamaat are &le; 15 mins. Draws a custom circular arc with glowing blur passes and pulsating numbers
                  in the final 60 seconds. <span className="text-emerald-400 font-semibold">Now enhanced with Dust(Modifier.fillMaxSize())</span> floating over the dial.
                </div>
                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-amber-400 font-bold font-mono">ActiveScreen()</span>: Stays active for 10 minutes
                  after Jamaat starts, displaying "जमात जारी है • JAMAAT IN PROGRESS", mobile phone silence warning, and
                  row alignment instructions. <span className="text-emerald-400 font-semibold">Now enhanced with Dust(Modifier.fillMaxSize())</span> overlay.
                </div>
                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-amber-400 font-bold font-mono">AnalogClock()</span>: High-accuracy canvas drawing of
                  an Arabic/Serif clock with concentric golden dials and moving hands.
                </div>
                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-amber-400 font-bold font-mono">Dust()</span>: 38 large motes and 160 small motes
                  rendered with <code className="text-amber-300 font-mono">BlendMode.Plus</code> for an atmospheric Islamic
                  ambiance across Dashboard, CountdownScreen, and ActiveScreen.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sounds.kt with Refactored Safe Code */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <button
            onClick={() => toggleFile('sounds')}
            className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-800/60 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="font-mono text-emerald-400 font-bold text-sm">Sounds.kt</span>
              <span className="text-xs text-slate-400">— SoundPool, Bell trigger & Recommended Fix</span>
            </div>
            {expandedFiles['sounds'] ? (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-400" />
            )}
          </button>
          {expandedFiles['sounds'] && (
            <div className="p-4 border-t border-slate-800 bg-slate-950 text-xs space-y-3">
              <p className="text-slate-300">
                Here is the proposed drop-in replacement for <code className="text-amber-300 font-mono">Sounds.kt</code> that
                fixes the async loading race condition and loads the bell into SoundPool directly:
              </p>
              <div className="relative">
                <button
                  onClick={() =>
                    handleCopy(
                      'sounds_code',
                      `package com.masjid.tv

import android.content.Context
import android.media.AudioAttributes
import android.media.SoundPool

object Sounds {
    private var pool: SoundPool? = null
    private var tickId = 0
    private var tockId = 0
    private var bellId = 0
    private var isLoaded = false

    fun init(ctx: Context) {
        if (pool != null) return
        val attrs = AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_MEDIA)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build()
        pool = SoundPool.Builder()
            .setMaxStreams(3)
            .setAudioAttributes(attrs)
            .build().also { sp ->
                sp.setOnLoadCompleteListener { _, _, status ->
                    if (status == 0) isLoaded = true
                }
                tickId = sp.load(ctx, R.raw.tick, 1)
                tockId = sp.load(ctx, R.raw.tock, 1)
                bellId = sp.load(ctx, R.raw.bell, 1)
            }
    }

    fun tick(alternate: Boolean) {
        if (!isLoaded) return
        pool?.play(if (alternate) tockId else tickId, 0.75f, 0.75f, 1, 0, 1f)
    }

    fun bell() {
        if (!isLoaded) return
        pool?.play(bellId, 1.0f, 1.0f, 2, 0, 1f)
    }
}`
                    )
                  }
                  className="absolute top-2 right-2 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-sans flex items-center gap-1 z-10"
                >
                  {copiedKey === 'sounds_code' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Fix</span>
                    </>
                  )}
                </button>
                <pre className="bg-slate-900 border border-slate-800 p-3 rounded-lg overflow-x-auto text-[11px] font-mono text-emerald-300">
{`package com.masjid.tv

import android.content.Context
import android.media.AudioAttributes
import android.media.SoundPool

object Sounds {
    private var pool: SoundPool? = null
    private var tickId = 0
    private var tockId = 0
    private var bellId = 0
    private var isLoaded = false

    fun init(ctx: Context) {
        if (pool != null) return
        val attrs = AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_MEDIA)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build()
        pool = SoundPool.Builder()
            .setMaxStreams(3)
            .setAudioAttributes(attrs)
            .build().also { sp ->
                sp.setOnLoadCompleteListener { _, _, status ->
                    if (status == 0) isLoaded = true
                }
                tickId = sp.load(ctx, R.raw.tick, 1)
                tockId = sp.load(ctx, R.raw.tock, 1)
                bellId = sp.load(ctx, R.raw.bell, 1)
            }
    }

    fun tick(alternate: Boolean) {
        if (!isLoaded) return
        pool?.play(if (alternate) tockId else tickId, 0.75f, 0.75f, 1, 0, 1f)
    }

    fun bell() {
        if (!isLoaded) return
        pool?.play(bellId, 1.0f, 1.0f, 2, 0, 1f)
    }
}`}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* MainActivity & BootReceiver */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-white text-sm">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>MainActivity.kt & BootReceiver.kt Highlights</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-slate-300">
            <li>
              <code className="text-amber-300 font-mono">FLAG_KEEP_SCREEN_ON</code>: Ensures the TV display never dims or
              goes to sleep.
            </li>
            <li>
              <code className="text-amber-300 font-mono">BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE</code>: Hides system navigation
              and status bars for an uninterrupted immersive TV kiosk experience.
            </li>
            <li>
              <code className="text-amber-300 font-mono">onKeyDown(KEYCODE_DPAD_CENTER / KEYCODE_ENTER)</code>: Captures the
              remote controller center button to toggle between the live dashboard and countdown preview.
            </li>
            <li>
              <code className="text-amber-300 font-mono">BootReceiver.kt</code>: Listens for{' '}
              <code className="text-amber-300 font-mono">Intent.ACTION_BOOT_COMPLETED</code> to auto-launch Masjid TV on cold
              boots.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
