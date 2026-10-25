import React, { useState } from 'react';
import {
  MasjidConfig,
  defaultConfig,
} from '../utils/prayerLogic';
import {
  Sliders,
  Copy,
  Check,
  RotateCcw,
  Download,
  Building,
  Clock,
  Bell,
  MapPin,
  Sparkles,
} from 'lucide-react';

interface ConfigEditorProps {
  config: MasjidConfig;
  onChange: (updated: MasjidConfig) => void;
}

export const ConfigEditor: React.FC<ConfigEditorProps> = ({ config, onChange }) => {
  const [copied, setCopied] = useState<boolean>(false);

  // Generate updated Kotlin Config.kt code string
  const kotlinCode = `package com.masjid.tv

data class Prayer(val name: String, val en: String, val adhan: String, val jamaat: String)
data class Notice(val icon: String, val title: String, val text: String)

/** EDIT THIS FILE to change times, name and announcements (24h "HH:mm"). */
object Config {
    const val MASJID = "${config.masjid}"
    const val SUNRISE = "${config.sunrise}"
    const val SUNSET = "${config.sunset}"
    const val MASJID_SHORT = "${config.masjidShort}"
    const val PRAYER_MINUTES = ${config.prayerMinutes}        // the "Jamaat in progress" page stays this many minutes
    const val COUNTDOWN_MINUTES = ${config.countdownMinutes}     // full-screen countdown shows this many minutes before jamaat
    const val HIJRI_OFFSET = ${config.hijriOffset}L          // -1 / +1 to match local moon sighting
    const val LAT = ${config.lat}                // used for live temperature (Open-Meteo)
    const val LON = ${config.lon}
    const val TEMP_FALLBACK = ${config.tempFallback}

    val prayers = listOf(
${config.prayers
  .map(
    (p) =>
      `        Prayer("${p.name}", "${p.en}", "${p.adhan}", "${p.jamaat}")`
  )
  .join(',\n')}
    )
    val jumah = Prayer("${config.jumah.name}", "${config.jumah.en}", "${config.jumah.adhan}", "${config.jumah.jamaat}")

    val announcements = listOf(
${config.announcements
  .map(
    (a) =>
      `        Notice("${a.icon}", "${a.title}", "${a.text.replace(/"/g, '\\"')}")`
  )
  .join(',\n')}
    )
}
`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(kotlinCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadCode = () => {
    const blob = new Blob([kotlinCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Config.kt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const updatePrayer = (
    index: number,
    field: 'name' | 'en' | 'adhan' | 'jamaat',
    value: string
  ) => {
    const updated = [...config.prayers];
    updated[index] = { ...updated[index], [field]: value };
    onChange({ ...config, prayers: updated });
  };

  const updateJumah = (field: 'name' | 'en' | 'adhan' | 'jamaat', value: string) => {
    onChange({ ...config, jumah: { ...config.jumah, [field]: value } });
  };

  const updateNotice = (index: number, field: 'icon' | 'title' | 'text', value: string) => {
    const updated = [...config.announcements];
    updated[index] = { ...updated[index], [field]: value };
    onChange({ ...config, announcements: updated });
  };

  const addNotice = () => {
    const updated = [
      ...config.announcements,
      { icon: '📢', title: 'New Announcement:', text: 'Please enter announcement description here.' },
    ];
    onChange({ ...config, announcements: updated });
  };

  const removeNotice = (index: number) => {
    const updated = config.announcements.filter((_, i) => i !== index);
    onChange({ ...config, announcements: updated });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-slate-200">
      {/* Left Column: Form Controls (7 cols) */}
      <div className="lg:col-span-7 space-y-6">
        {/* Mosque Identity & Location */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 font-bold text-white text-sm">
              <Building className="w-4 h-4 text-emerald-400" />
              <span>Mosque Details & Location</span>
            </div>
            <button
              onClick={() => onChange(defaultConfig)}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Defaults</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="md:col-span-2">
              <label className="block text-slate-400 mb-1">Masjid Full Name (Title on TV)</label>
              <input
                type="text"
                value={config.masjid}
                onChange={(e) => onChange({ ...config, masjid: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-medium focus:border-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Short Name</label>
              <input
                type="text"
                value={config.masjidShort}
                onChange={(e) => onChange({ ...config, masjidShort: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-medium focus:border-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Hijri Moon Offset (-2 to +2 days)</label>
              <select
                value={config.hijriOffset}
                onChange={(e) => onChange({ ...config, hijriOffset: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-medium focus:border-emerald-500 outline-none"
              >
                <option value={-2}>-2 Days</option>
                <option value={-1}>-1 Day (Earlier Moon)</option>
                <option value={0}>0 (Standard)</option>
                <option value={1}>+1 Day (Later Moon)</option>
                <option value={2}>+2 Days</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Latitude (for Weather)</label>
              <input
                type="number"
                step="0.01"
                value={config.lat}
                onChange={(e) => onChange({ ...config, lat: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:border-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Longitude (for Weather)</label>
              <input
                type="number"
                step="0.01"
                value={config.lon}
                onChange={(e) => onChange({ ...config, lon: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:border-emerald-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Timetable Editor */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 font-bold text-white text-sm">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Prayer & Sun Timetable (24h "HH:mm")</span>
            </div>
            <div className="text-[11px] text-slate-400">Updates TV simulator instantly</div>
          </div>

          {/* Sunrise & Sunset */}
          <div className="grid grid-cols-2 gap-3 mb-4 bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">Sunrise (24h)</label>
              <input
                type="text"
                value={config.sunrise}
                onChange={(e) => onChange({ ...config, sunrise: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-amber-300 font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Sunset (24h)</label>
              <input
                type="text"
                value={config.sunset}
                onChange={(e) => onChange({ ...config, sunset: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-orange-400 font-mono font-bold"
              />
            </div>
          </div>

          {/* 5 Prayers */}
          <div className="space-y-2.5 text-xs">
            {config.prayers.map((p, idx) => (
              <div
                key={idx}
                className="grid grid-cols-12 gap-2 items-center bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80"
              >
                <div className="col-span-3">
                  <input
                    type="text"
                    value={p.name}
                    onChange={(e) => updatePrayer(idx, 'name', e.target.value)}
                    className="w-full bg-transparent border-b border-slate-700 px-1 py-0.5 text-white font-bold"
                    placeholder="Hindi"
                  />
                </div>
                <div className="col-span-3">
                  <input
                    type="text"
                    value={p.en}
                    onChange={(e) => updatePrayer(idx, 'en', e.target.value)}
                    className="w-full bg-transparent border-b border-slate-700 px-1 py-0.5 text-slate-300 font-medium font-mono uppercase"
                    placeholder="English"
                  />
                </div>
                <div className="col-span-3">
                  <label className="text-[10px] text-slate-500 block">Adhan</label>
                  <input
                    type="text"
                    value={p.adhan}
                    onChange={(e) => updatePrayer(idx, 'adhan', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono font-bold"
                  />
                </div>
                <div className="col-span-3">
                  <label className="text-[10px] text-slate-500 block">Jamaat</label>
                  <input
                    type="text"
                    value={p.jamaat}
                    onChange={(e) => updatePrayer(idx, 'jamaat', e.target.value)}
                    className="w-full bg-slate-900 border border-amber-600/60 rounded px-2 py-1 text-[#F5C518] font-mono font-bold"
                  />
                </div>
              </div>
            ))}

            {/* Jumuah Row */}
            <div className="grid grid-cols-12 gap-2 items-center bg-amber-950/20 p-2.5 rounded-lg border border-amber-500/30">
              <div className="col-span-3">
                <input
                  type="text"
                  value={config.jumah.name}
                  onChange={(e) => updateJumah('name', e.target.value)}
                  className="w-full bg-transparent border-b border-amber-500/50 px-1 py-0.5 text-amber-300 font-bold"
                />
              </div>
              <div className="col-span-3">
                <input
                  type="text"
                  value={config.jumah.en}
                  onChange={(e) => updateJumah('en', e.target.value)}
                  className="w-full bg-transparent border-b border-amber-500/50 px-1 py-0.5 text-amber-200 font-medium font-mono uppercase"
                />
              </div>
              <div className="col-span-3">
                <label className="text-[10px] text-amber-400/70 block">Adhan</label>
                <input
                  type="text"
                  value={config.jumah.adhan}
                  onChange={(e) => updateJumah('adhan', e.target.value)}
                  className="w-full bg-slate-900 border border-amber-700 rounded px-2 py-1 text-white font-mono font-bold"
                />
              </div>
              <div className="col-span-3">
                <label className="text-[10px] text-amber-400/70 block">Jamaat</label>
                <input
                  type="text"
                  value={config.jumah.jamaat}
                  onChange={(e) => updateJumah('jamaat', e.target.value)}
                  className="w-full bg-slate-900 border border-amber-500 rounded px-2 py-1 text-amber-300 font-mono font-bold"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Announcements Editor */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 font-bold text-white text-sm">
              <Bell className="w-4 h-4 text-emerald-400" />
              <span>Bottom Ticker Announcements</span>
            </div>
            <button
              onClick={addNotice}
              className="text-xs px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded-md font-semibold"
            >
              + Add Notice
            </button>
          </div>

          <div className="space-y-3 text-xs">
            {config.announcements.map((a, idx) => (
              <div key={idx} className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={a.icon}
                    onChange={(e) => updateNotice(idx, 'icon', e.target.value)}
                    className="w-10 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-center text-sm"
                  />
                  <input
                    type="text"
                    value={a.title}
                    onChange={(e) => updateNotice(idx, 'title', e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-[#F5C518] font-bold"
                    placeholder="Notice Title"
                  />
                  {config.announcements.length > 1 && (
                    <button
                      onClick={() => removeNotice(idx)}
                      className="text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-slate-800 text-xs"
                    >
                      Delete
                    </button>
                  )}
                </div>
                <textarea
                  value={a.text}
                  onChange={(e) => updateNotice(idx, 'text', e.target.value)}
                  rows={2}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                  placeholder="Notice Details..."
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Column: Code Generator & Exporter (5 cols) */}
      <div className="lg:col-span-5 space-y-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sticky top-4 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="font-mono text-emerald-400 font-bold text-sm">Config.kt Generator</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">
                Ready to Copy
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadCode}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs flex items-center gap-1"
                title="Download Config.kt file"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleCopyCode}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors shadow"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Config.kt</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <p className="text-xs text-slate-400 mb-2">
            Copy this code directly into{' '}
            <code className="text-amber-300 font-mono">app/src/main/java/com/masjid/tv/Config.kt</code> in your Android
            Studio project.
          </p>

          <pre className="bg-slate-950 border border-slate-800 p-3 rounded-lg overflow-x-auto text-[11px] font-mono text-emerald-300 max-h-[70vh] leading-relaxed">
            {kotlinCode}
          </pre>
        </div>
      </div>
    </div>
  );
};
