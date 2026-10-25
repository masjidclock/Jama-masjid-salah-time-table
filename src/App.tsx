import React, { useState, useEffect } from 'react';
import { defaultConfig, loadConfigFromStorage, MasjidConfig } from './utils/prayerLogic';
import { TvSimulator } from './components/TvSimulator';
import { CodeWalkthrough } from './components/CodeWalkthrough';
import { ConfigEditor } from './components/ConfigEditor';
import { TvBestPractices } from './components/TvBestPractices';
import {
  Tv,
  FileCode2,
  Sliders,
  BookOpen,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

export default function App() {
  const [config, setConfig] = useState<MasjidConfig>(() => loadConfigFromStorage());

  const [activeTab, setActiveTab] = useState<'simulator' | 'walkthrough' | 'config' | 'guide'>('simulator');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Top Navigation Bar */}
      <header className="bg-slate-900/90 border-b border-slate-800 sticky top-0 z-50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Brand Info */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500/20 to-emerald-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-md shadow-amber-500/10">
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-white text-base sm:text-lg tracking-tight">
                  MasjidTV <span className="text-[#F5C518]">Android TV</span>
                </h1>
                <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold">
                  Kotlin • Jetpack Compose
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                {config.masjidShort} — 24/7 Digital Prayer Timetable & Kiosk
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800/80 text-xs sm:text-sm">
            <button
              onClick={() => setActiveTab('simulator')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'simulator'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Tv className="w-4 h-4" />
              <span>Live TV Emulator</span>
            </button>

            <button
              onClick={() => setActiveTab('walkthrough')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'walkthrough'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <FileCode2 className="w-4 h-4" />
              <span>Code Audit & Walkthrough</span>
            </button>

            <button
              onClick={() => setActiveTab('config')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'config'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>Config Studio</span>
            </button>

            <button
              onClick={() => setActiveTab('guide')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'guide'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span className="hidden md:inline">24/7 TV Deployment</span>
              <span className="md:hidden">Guide</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'simulator' && (
          <div className="space-y-4">
            <TvSimulator config={config} onOpenConfig={() => setActiveTab('config')} />
          </div>
        )}

        {activeTab === 'walkthrough' && <CodeWalkthrough />}

        {activeTab === 'config' && (
          <ConfigEditor config={config} onChange={(updated) => setConfig(updated)} />
        )}

        {activeTab === 'guide' && <TvBestPractices />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-900/40 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-slate-400">
            <span>Built with Jetpack Compose for Android TV</span>
            <span>•</span>
            <span className="text-[#F5C518]">Jama Masjid Kodwatand, Lalpania</span>
          </div>
          <div className="text-slate-500">
            Auto-boot on TV start • Leanback Ready • 960×540 Density Scaled
          </div>
        </div>
      </footer>
    </div>
  );
}
