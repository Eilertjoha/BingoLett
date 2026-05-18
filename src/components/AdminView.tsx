import React, { useState, useEffect, useRef } from 'react';
import { ExternalLink, Settings, X, Upload, Loader2 } from 'lucide-react';
import { getBingoInfo, useBingoSync } from '../lib/bingo';
import BingoBall from './BingoBall';
import Ball3D from './Ball3D';
import HistoryGrid from './HistoryGrid';
import { supabase } from '../lib/supabase';

interface EmojiConfig {
  id: string;
  emoji: string;
  url: string;
}

interface SystemConfig {
  drawSoundUrl: string;
  logoUrl: string;
  bannerUrl: string;
}

const defaultSystemConfig: SystemConfig = {
  drawSoundUrl: '',
  logoUrl: '',
  bannerUrl: ''
};

const EmojiButton: React.FC<{ emojiConfig: EmojiConfig }> = ({ emojiConfig }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const frameRef = useRef<number>();

  const updateProgress = () => {
    if (audioRef.current && !audioRef.current.paused) {
      setProgress(audioRef.current.currentTime / (audioRef.current.duration || 1));
      frameRef.current = requestAnimationFrame(updateProgress);
    }
  };

  useEffect(() => {
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handleClick = () => {
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      setProgress(0);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    } else if (emojiConfig.url) {
      const audio = new Audio(emojiConfig.url);
      audioRef.current = audio;
      
      audio.onplay = () => {
        setIsPlaying(true);
        frameRef.current = requestAnimationFrame(updateProgress);
      };
      
      audio.onended = () => {
        setIsPlaying(false);
        setProgress(0);
        if (frameRef.current) cancelAnimationFrame(frameRef.current);
      };

      audio.play().catch(e => {
        console.error("Kunne ikke spille av lyd:", e);
      });
    }
  };

  const intensity = isPlaying ? Math.max(0, 1 - progress) : 0;

  return (
    <button 
      onClick={handleClick}
      style={{ 
        containerType: 'size',
        boxShadow: isPlaying ? `0 0 ${20 + intensity * 40}px rgba(236,72,153,${intensity * 0.8})` : undefined,
        backgroundColor: isPlaying ? `rgba(236,72,153,${intensity * 0.3})` : undefined,
        borderColor: isPlaying ? `rgba(236,72,153,${intensity * 0.5})` : undefined
      }}
      className={`rounded-xl flex items-center justify-center transition-all shadow-sm hover:scale-105 active:scale-95 aspect-square ${!isPlaying ? 'bg-white/5 hover:bg-white/10 border border-white/10' : 'border'}`}
      title={`Lydeffekt ${emojiConfig.id}${emojiConfig.url ? ` (${emojiConfig.url})` : ''}`}
    >
      <span style={{ fontSize: 'min(60cqw, 60cqh)' }}>{emojiConfig.emoji}</span>
    </button>
  );
}

const initialEmojis: EmojiConfig[] = [
  { id: '1', emoji: '😂', url: '' },
  { id: '2', emoji: '🎉', url: '' },
  { id: '3', emoji: '🚨', url: '' },
  { id: '4', emoji: '🥁', url: '' },
  { id: '5', emoji: '🎸', url: '' },
  { id: '6', emoji: '💩', url: '' },
  { id: '7', emoji: '😎', url: '' },
  { id: '8', emoji: '🔥', url: '' },
];

export default function AdminView() {
  const { drawnNumbers, nextNumber, drawNumber, resetGame } = useBingoSync('admin');
  const [isManualMode, setIsManualMode] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'emoji' | 'system'>('emoji');
  
  const [emojis, setEmojis] = useState<EmojiConfig[]>(initialEmojis);
  const [tempEmojis, setTempEmojis] = useState<EmojiConfig[]>(initialEmojis);
  const [systemConfig, setSystemConfig] = useState<SystemConfig>(defaultSystemConfig);
  const [tempSystemConfig, setTempSystemConfig] = useState<SystemConfig>(defaultSystemConfig);
  const [isDbReady, setIsDbReady] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [uploadingSystemKey, setUploadingSystemKey] = useState<keyof SystemConfig | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, index?: number, systemKey?: keyof SystemConfig) => {
    const file = event.target.files?.[0];
    if (!file || !supabase) return;

    try {
      if (systemKey) {
        setUploadingSystemKey(systemKey);
      } else if (index !== undefined) {
        setUploadingIndex(index);
      }
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('sounds')
        .upload(filePath, file);

      if (uploadError) {
        console.error("Feil ved opplasting:", uploadError);
        alert(`Kunne ikke laste opp filen: ${uploadError.message}. Sjekk at 'sounds' bucket finnes i Supabase (Storage) og at public tilgang er tillatt.`);
        return;
      }

      const { data: publicData } = supabase.storage
        .from('sounds')
        .getPublicUrl(filePath);

      if (systemKey) {
        setTempSystemConfig(prev => ({ ...prev, [systemKey]: publicData.publicUrl }));
      } else if (index !== undefined) {
        const newEmojis = [...tempEmojis];
        newEmojis[index].url = publicData.publicUrl;
        setTempEmojis(newEmojis);
      }
    } catch (err: any) {
      console.error(err);
      alert(`Feil under opplasting: ${err.message}`);
    } finally {
      setUploadingIndex(null);
      setUploadingSystemKey(null);
    }
  };

  useEffect(() => {
    const savedSystem = localStorage.getItem('bingo-system-settings');
    if (savedSystem) {
      try {
        const parsed = JSON.parse(savedSystem);
        setSystemConfig(parsed);
        setTempSystemConfig(parsed);
      } catch (e) {}
    }

    // 1. Prøv å hente fra Supabase
    async function loadEmojis() {
      if (!supabase) {
        // Fallback til localStorage hvis Supabase ikke er konfigurert
        const saved = localStorage.getItem('bingo-emojis');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            setEmojis(parsed);
            setTempEmojis(parsed);
          } catch {}
        }
        return;
      }

      const { data, error } = await supabase
        .from('bingo_emojis')
        .select('*')
        .order('emoji_id', { ascending: true });

      if (data && data.length > 0 && !error) {
        const loaded: EmojiConfig[] = data.map(d => ({
          id: d.emoji_id,
          emoji: d.emoji,
          url: d.url
        }));
        setEmojis(loaded);
        setTempEmojis(loaded);
        setIsDbReady(true);
      } else {
        // Fallback
        const saved = localStorage.getItem('bingo-emojis');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            setEmojis(parsed);
            setTempEmojis(parsed);
          } catch {}
        }
      }

      // Hent System Settings fra Supabase (overstyrer localStorage hvis de finnes)
      const { data: sysData, error: sysError } = await supabase
        .from('bingo_system')
        .select('*')
        .eq('id', 'config')
        .single();
      
      if (sysData && !sysError) {
        const loadedSys = {
          drawSoundUrl: sysData.draw_sound_url || '',
          logoUrl: sysData.logo_url || '',
          bannerUrl: sysData.banner_url || ''
        };
        setSystemConfig(loadedSys);
        setTempSystemConfig(loadedSys);
        localStorage.setItem('bingo-system-settings', JSON.stringify(loadedSys));
      }
    }
    
    loadEmojis();
  }, []);

  const handleSaveSettings = async () => {
    setEmojis(tempEmojis);
    setSystemConfig(tempSystemConfig);
    localStorage.setItem('bingo-system-settings', JSON.stringify(tempSystemConfig));
    
    // Alert other tabs that settings changed
    window.dispatchEvent(new Event('storage'));
    
    setIsSettingsOpen(false);
    
    if (supabase) {
      try {
        const upserts = tempEmojis.map(e => ({
          emoji_id: e.id,
          emoji: e.emoji,
          url: e.url
        }));
        await supabase.from('bingo_emojis').upsert(upserts, { onConflict: 'emoji_id' });
        
        // Lagre system settings
        await supabase.from('bingo_system').upsert({
          id: 'config',
          draw_sound_url: tempSystemConfig.drawSoundUrl,
          logo_url: tempSystemConfig.logoUrl,
          banner_url: tempSystemConfig.bannerUrl
        }, { onConflict: 'id' });

      } catch (err) {
        console.error("Feil ved lagring til Supabase:", err);
      }
    } else {
      localStorage.setItem('bingo-emojis', JSON.stringify(tempEmojis));
    }
  };

  const lastDrawn = drawnNumbers.length > 0 ? drawnNumbers[drawnNumbers.length - 1] : null;
  const recentDrawn = [...drawnNumbers].reverse().slice(1, 4); // Show last 3
  const nextInfo = nextNumber !== null ? getBingoInfo(nextNumber) : null;

  // Track lastDrawn to play draw sound
  useEffect(() => {
    if (lastDrawn !== null && systemConfig.drawSoundUrl) {
      const audio = new Audio(systemConfig.drawSoundUrl);
      audio.play().catch(e => console.error("Could not play draw sound:", e));
    }
  }, [lastDrawn, systemConfig.drawSoundUrl]);

  return (
    <div className="h-screen w-full bg-[#050505] text-gray-100 font-sans p-4 sm:p-8 flex flex-col gap-6 overflow-hidden max-w-[1600px] mx-auto">
      
      {/* Top Panel: Controls */}
      <div className="flex flex-col lg:flex-row gap-6 shrink-0 lg:h-[40vh] min-h-[300px]">
        
        {/* Top Left: Gjeldende Tall, Antall Trukket & Siste 3 */}
        <div className="w-full lg:w-1/2 flex flex-col gap-4 h-full">
          <div className="flex flex-col justify-center shrink-0 h-14 lg:h-16">
            <h1 className="text-3xl lg:text-4xl font-black tracking-tighter italic flex items-center leading-none">
              <span className="text-pink-500 mr-1">BINGO</span>
              <span className="text-cyan-400">LETT</span>
            </h1>
            <p className="text-gray-500 text-[10px] lg:text-xs font-bold tracking-[0.2em] uppercase mt-1">LAGET AV DRAG&FUN</p>
          </div>

          <div className="flex-1 flex gap-4 h-full min-h-0">
            {/* The Big Ball Display (Gjeldende tall) */}
            <div className="relative h-full aspect-square shrink-0 overflow-visible">
              {lastDrawn !== null ? (
                <div className="h-full w-full flex items-center justify-center">
                  <Ball3D number={lastDrawn} size="fill" />
                </div>
              ) : (
                <div className="h-full w-full rounded-full border border-white/5 bg-white/5 flex items-center justify-center">
                  <span className="text-white/20 font-bold tracking-wider uppercase text-lg lg:text-3xl">Klar</span>
                </div>
              )}
            </div>

            {/* Right half: Antall Trukket & Siste 3 */}
            <div className="flex-1 flex flex-col gap-4 h-full min-h-0">
              {/* Neste og Antall Trukket */}
              <div className="flex-1 flex gap-4 w-full">
                {/* Neste */}
                <div 
                  className="flex-1 relative bg-white/5 border-2 border-purple-500/50 rounded-[24px] lg:rounded-[40px] p-2 flex flex-col justify-center items-center text-center overflow-hidden shadow-[0_0_15px_rgba(168,85,247,0.15)]"
                  style={{ containerType: 'size' }}
                >
                  <div className="flex items-center justify-center w-full h-full">
                    {nextNumber !== null ? (
                      <span className="font-black text-white leading-none drop-shadow-md tracking-tighter" style={{ fontSize: 'min(35cqw, 75cqh)' }}>
                        {nextInfo?.letter}{nextNumber}
                      </span>
                    ) : (
                      <span className="text-white/20 font-medium italic" style={{ fontSize: 'min(20cqw, 35cqh)' }}>Ingen</span>
                    )}
                  </div>
                </div>

                {/* Antall Trukket */}
                <div 
                  className="flex-1 relative bg-white/5 border-2 border-cyan-500/50 rounded-[24px] lg:rounded-[40px] p-2 flex flex-col justify-center items-center text-center overflow-hidden shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                  style={{ containerType: 'size' }}
                >
                  <div className="flex items-center gap-[1cqw] justify-center w-full h-full">
                    <span className="font-black text-white leading-none drop-shadow-md tracking-tighter" style={{ fontSize: 'min(35cqw, 75cqh)' }}>{drawnNumbers.length}</span>
                    <span className="text-gray-600 font-black leading-none tracking-tighter" style={{ fontSize: 'min(18cqw, 35cqh)' }}>/75</span>
                  </div>
                </div>
              </div>
              
              {/* Siste 3 */}
              <div className="flex-1 relative flex items-center justify-center h-full pb-2 min-h-0">
                <div className="flex gap-2 lg:gap-4 items-center justify-center w-full h-full">
                  {recentDrawn.length === 0 ? (
                    <span className="text-white/20 text-sm font-medium italic">Ingen...</span>
                  ) : (
                    recentDrawn.map(num => (
                      <div key={num} className="w-16 h-16 sm:w-20 sm:h-20 lg:w-[90px] lg:h-[90px] xl:w-[110px] xl:h-[110px] shrink-0">
                        <Ball3D number={num} size="fill" />
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Top Right: Trekk Tall & Admin */}
        <div className="w-full lg:w-1/2 flex flex-col gap-4 h-full">
          {/* Header Actions */}
          <div className="flex justify-end items-center px-2 shrink-0 h-14 lg:h-16">
            <div className="flex gap-2">
              <button 
                onClick={resetGame}
                className="bg-white/10 hover:bg-white/20 border border-white/20 py-1.5 px-4 rounded-xl font-bold text-sm transition-all text-white shadow-sm"
              >
                RESET SPILL
              </button>
              <a 
                href="#obs" 
                target="_blank"
                className="bg-white/10 hover:bg-white/20 border border-white/20 py-1.5 px-3 rounded-xl transition-all text-white inline-flex items-center justify-center shadow-sm"
                title="Åpne OBS-vindu"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
              <button 
                onClick={() => {
                  setTempEmojis(emojis);
                  setIsSettingsOpen(true);
                }}
                className="bg-white/10 hover:bg-white/20 border border-white/20 py-1.5 px-3 rounded-xl transition-all text-white inline-flex items-center justify-center shadow-sm"
                title="Innstillinger"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="flex flex-col gap-4 flex-1 h-full min-h-0">
            {/* Emoji Buttons Row */}
            <div className="grid grid-cols-8 gap-2 md:gap-4 flex-1 content-center">
              {emojis.map((emojiConfig) => (
                <EmojiButton key={emojiConfig.id} emojiConfig={emojiConfig} />
              ))}
            </div>

            <div className="flex gap-4 flex-1 min-h-[100px]">
              <button 
                onClick={() => setIsManualMode(!isManualMode)}
                disabled={drawnNumbers.length >= 75}
                className={`w-1/2 group relative overflow-hidden rounded-[40px] p-1 transition-all disabled:opacity-50 disabled:grayscale ${isManualMode ? 'bg-gradient-to-r from-pink-500 to-orange-500 shadow-[0_10px_30px_rgba(236,72,153,0.3)]' : 'bg-white/10 hover:bg-white/20 border border-white/10'}`}
              >
                <div className={`w-full h-full transition-all flex flex-col items-center justify-center rounded-[38px] p-4 text-center ${isManualMode ? 'bg-black/20 group-hover:bg-transparent' : 'bg-transparent'}`}>
                  <span className={`text-4xl lg:text-5xl xl:text-6xl font-black uppercase tracking-tighter ${isManualMode ? 'text-white drop-shadow-md' : 'text-white/50 group-hover:text-white/80'}`}>
                    Manuell
                  </span>
                </div>
              </button>
              <button 
                onClick={() => {
                  setIsManualMode(false);
                  drawNumber();
                }}
                disabled={drawnNumbers.length >= 75}
                className="w-1/2 group relative overflow-hidden rounded-[40px] bg-gradient-to-r from-cyan-600 to-purple-600 p-1 shadow-[0_10px_30px_rgba(139,92,246,0.3)] disabled:opacity-50 disabled:grayscale transition-all"
              >
                <div className="w-full h-full bg-black/40 group-hover:bg-transparent transition-all flex flex-col items-center justify-center rounded-[38px] p-4 text-center">
                  <span className="text-4xl lg:text-5xl xl:text-6xl font-black text-white uppercase tracking-tighter">
                    Trekk
                  </span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Panel: Board Overview */}
      <div className="flex-1 min-h-[300px] flex flex-col w-full pb-4">
        <HistoryGrid drawnNumbers={drawnNumbers} isManualMode={isManualMode} onManualDraw={drawNumber} />
      </div>

      {/* Settings Sidebar */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsSettingsOpen(false)}
          ></div>
          <div className="relative w-full max-w-md bg-[#111] border-l border-white/10 h-full p-6 sm:p-8 flex flex-col gap-6 overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between shrink-0">
              <h2 className="text-2xl font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <Settings className="w-6 h-6 text-purple-400" />
                Innstillinger
              </h2>
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex gap-2 shrink-0 border-b border-white/10 pb-4">
              <button 
                onClick={() => setSettingsTab('emoji')}
                className={`flex-1 py-2 text-sm font-bold uppercase tracking-wider rounded-lg transition-all ${settingsTab === 'emoji' ? 'bg-white/20 text-white' : 'text-gray-400 hover:bg-white/5'}`}
              >
                Emoji Lyd-panel
              </button>
              <button 
                onClick={() => setSettingsTab('system')}
                className={`flex-1 py-2 text-sm font-bold uppercase tracking-wider rounded-lg transition-all ${settingsTab === 'system' ? 'bg-white/20 text-white' : 'text-gray-400 hover:bg-white/5'}`}
              >
                System Elementer
              </button>
            </div>

            <div className="flex flex-col gap-6 flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto pr-2 pb-20">
                {settingsTab === 'emoji' ? (
                  <div>
                    <p className="text-sm text-gray-400 mb-6 border-b border-white/10 pb-4">
                      Bytt ut emojiene og legg inn linker til mp3 eller last opp lydfiler som spilles av når du trykker på dem.
                    </p>
                    <div className="flex flex-col gap-4">
                      {tempEmojis.map((emojiConfig, index) => (
                        <div key={emojiConfig.id} className="bg-white/5 border border-white/10 rounded-xl p-3 flex gap-3 items-center">
                          <div className="flex flex-col gap-1 items-center justify-center shrink-0">
                            <span className="text-[10px] text-gray-500 font-bold uppercase">Knapp {emojiConfig.id}</span>
                            <input 
                              type="text" 
                              value={emojiConfig.emoji} 
                              onChange={(e) => {
                                const newEmojis = [...tempEmojis];
                                newEmojis[index].emoji = e.target.value;
                                setTempEmojis(newEmojis);
                              }}
                              className="bg-black/50 border border-white/20 rounded-lg w-12 h-12 text-center text-2xl focus:outline-none focus:border-purple-500"
                            />
                          </div>
                          <div className="flex flex-col gap-2 flex-1 pt-4">
                            <div className="flex gap-2">
                              <input 
                                type="url" 
                                placeholder="URL til MP3 (eller last opp)"
                                value={emojiConfig.url} 
                                onChange={(e) => {
                                  const newEmojis = [...tempEmojis];
                                  newEmojis[index].url = e.target.value;
                                  setTempEmojis(newEmojis);
                                }}
                                className="flex-1 min-w-0 bg-black/50 border border-white/20 rounded-lg h-10 px-3 text-sm focus:outline-none focus:border-purple-500 placeholder:text-gray-600 text-gray-300"
                              />
                              <div className="relative shrink-0">
                                <input 
                                  type="file" 
                                  accept="audio/*" 
                                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" 
                                  onChange={(e) => handleFileUpload(e, index)}
                                  disabled={uploadingIndex === index}
                                />
                                <div className={`h-10 px-3 flex items-center justify-center bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg transition-all ${uploadingIndex === index ? 'opacity-50' : ''}`}>
                                  {uploadingIndex === index ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Upload className="w-4 h-4 text-white" />}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-gray-400 mb-6 border-b border-white/10 pb-4">
                      Konfigurer lyder og grafikk som vises på OBS view og avspilles i bakgrunnen.
                    </p>
                    <div className="flex flex-col gap-6">
                      
                      {/* Draw Sound */}
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block">Pling lyd når tall trekkes</label>
                        <div className="flex gap-2">
                          <input 
                            type="url" 
                            placeholder="URL til MP3 (eller last opp)"
                            value={tempSystemConfig.drawSoundUrl} 
                            onChange={(e) => setTempSystemConfig(prev => ({ ...prev, drawSoundUrl: e.target.value }))}
                            className="flex-1 min-w-0 bg-black/50 border border-white/20 rounded-lg h-10 px-3 text-sm focus:outline-none focus:border-purple-500 placeholder:text-gray-600 text-gray-300"
                          />
                          <div className="relative shrink-0">
                            <input 
                              type="file" 
                              accept="audio/*" 
                              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" 
                              onChange={(e) => handleFileUpload(e, undefined, 'drawSoundUrl')}
                              disabled={uploadingSystemKey === 'drawSoundUrl'}
                            />
                            <div className={`h-10 px-3 flex items-center justify-center bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg transition-all ${uploadingSystemKey === 'drawSoundUrl' ? 'opacity-50' : ''}`}>
                              {uploadingSystemKey === 'drawSoundUrl' ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Upload className="w-4 h-4 text-white" />}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Logo PNG */}
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block">Logo på OBS View (PNG 1:1)</label>
                        <div className="flex gap-2">
                          <input 
                            type="url" 
                            placeholder="URL til PNG (eller last opp)"
                            value={tempSystemConfig.logoUrl} 
                            onChange={(e) => setTempSystemConfig(prev => ({ ...prev, logoUrl: e.target.value }))}
                            className="flex-1 min-w-0 bg-black/50 border border-white/20 rounded-lg h-10 px-3 text-sm focus:outline-none focus:border-purple-500 placeholder:text-gray-600 text-gray-300"
                          />
                          <div className="relative shrink-0">
                            <input 
                              type="file" 
                              accept="image/png,image/jpeg" 
                              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" 
                              onChange={(e) => handleFileUpload(e, undefined, 'logoUrl')}
                              disabled={uploadingSystemKey === 'logoUrl'}
                            />
                            <div className={`h-10 px-3 flex items-center justify-center bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg transition-all ${uploadingSystemKey === 'logoUrl' ? 'opacity-50' : ''}`}>
                              {uploadingSystemKey === 'logoUrl' ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Upload className="w-4 h-4 text-white" />}
                            </div>
                          </div>
                        </div>
                        {tempSystemConfig.logoUrl && (
                          <div className="mt-2 p-2 bg-white/5 rounded-lg border border-white/10 w-24 h-24">
                            <img src={tempSystemConfig.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                          </div>
                        )}
                      </div>

                      {/* Banner PNG */}
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block">Bunnbanner OBS (PNG 1839x239)</label>
                        <div className="flex gap-2">
                          <input 
                            type="url" 
                            placeholder="URL til PNG (eller last opp)"
                            value={tempSystemConfig.bannerUrl} 
                            onChange={(e) => setTempSystemConfig(prev => ({ ...prev, bannerUrl: e.target.value }))}
                            className="flex-1 min-w-0 bg-black/50 border border-white/20 rounded-lg h-10 px-3 text-sm focus:outline-none focus:border-purple-500 placeholder:text-gray-600 text-gray-300"
                          />
                          <div className="relative shrink-0">
                            <input 
                              type="file" 
                              accept="image/png,image/jpeg" 
                              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" 
                              onChange={(e) => handleFileUpload(e, undefined, 'bannerUrl')}
                              disabled={uploadingSystemKey === 'bannerUrl'}
                            />
                            <div className={`h-10 px-3 flex items-center justify-center bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg transition-all ${uploadingSystemKey === 'bannerUrl' ? 'opacity-50' : ''}`}>
                              {uploadingSystemKey === 'bannerUrl' ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Upload className="w-4 h-4 text-white" />}
                            </div>
                          </div>
                        </div>
                        {tempSystemConfig.bannerUrl && (
                          <div className="mt-2 p-2 bg-white/5 rounded-lg border border-white/10 w-full">
                            <img src={tempSystemConfig.bannerUrl} alt="Banner" className="w-full h-auto object-contain" />
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                )}
              </div>
              
              <div className="pt-4 border-t border-white/10 bg-[#111] shrink-0 mt-auto">
                <button
                  onClick={handleSaveSettings}
                  className="w-full py-4 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 font-bold tracking-wider rounded-xl text-white transition-all shadow-[0_0_20px_rgba(168,85,247,0.4)]"
                >
                  OPPDATER & LAGRE
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
