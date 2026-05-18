import { useBingoSync } from '../lib/bingo';
import HistoryGrid from './HistoryGrid';
import { AnimatePresence } from 'motion/react';
import Ball3D from './Ball3D';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { defaultOnlineConfig, loadOnlineConfig, type OnlineConfig } from '../lib/online';

interface SystemConfig {
  drawSoundUrl: string;
  logoUrl: string;
  bannerUrl: string;
}

export default function ObsView() {
  const { drawnNumbers } = useBingoSync('obs');
  const [onlineConfig, setOnlineConfig] = useState<OnlineConfig>(defaultOnlineConfig);
  const [systemConfig, setSystemConfig] = useState<SystemConfig>({
    drawSoundUrl: '',
    logoUrl: '',
    bannerUrl: ''
  });

  useEffect(() => {
    const loadSettings = async () => {
      let localSys = null;
      const saved = localStorage.getItem('bingo-system-settings');
      if (saved) {
        try {
          localSys = JSON.parse(saved);
          setSystemConfig(localSys);
        } catch (e) {}
      }
      
      if (supabase) {
        const { data: sysData, error: sysError } = await supabase
          .from('bingo_system')
          .select('*')
          .eq('id', 'config')
          .single();
          
        if (sysData && !sysError) {
          setSystemConfig({
            drawSoundUrl: sysData.draw_sound_url || '',
            logoUrl: sysData.logo_url || '',
            bannerUrl: sysData.banner_url || ''
          });
        }
      }
    };
    
    // Load initially
    loadSettings();
    
    // Listen for changes from AdminView
    const handleStorage = () => loadSettings();
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    const loadOnline = () => {
      loadOnlineConfig().then(setOnlineConfig).catch(() => {});
    };
    loadOnline();
    window.addEventListener('storage', loadOnline);
    return () => window.removeEventListener('storage', loadOnline);
  }, []);
  
  const lastDrawn = drawnNumbers.length > 0 ? drawnNumbers[drawnNumbers.length - 1] : null;
  const recentDrawn = [...drawnNumbers].reverse().slice(1, 4); // Siste 3
  const playerUrl = `${window.location.origin}${window.location.pathname}#player?pin=${encodeURIComponent(onlineConfig.pin || '')}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(playerUrl)}`;

  return (
    <div className="min-h-screen bg-[#07070a] text-gray-100 flex flex-col p-2 sm:p-4 lg:p-6 overflow-hidden">
      <div className="flex-1 flex flex-col w-full mx-auto max-w-[1920px]">
        
        {/* Top Panel: Controls */}
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 shrink-0 lg:h-[25vh] xl:h-[30vh] min-h-[200px] mb-4 mt-2">
          
          {/* Top Left: Gjeldende Tall & Siste 3 */}
          <div className="w-full lg:w-[480px] flex flex-col gap-2 lg:gap-4 h-full">
            <div className="flex flex-col justify-center shrink-0 h-12 lg:h-14">
              <h1 className="text-2xl lg:text-3xl xl:text-4xl font-black tracking-tighter italic flex items-center leading-none">
                <span className="text-pink-500 mr-1">BINGO</span>
                <span className="text-cyan-400">LETT</span>
              </h1>
              <p className="text-gray-500 text-[9px] lg:text-[10px] font-bold tracking-[0.2em] uppercase mt-1">LAGET AV DRAG&FUN</p>
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
                    <span className="text-white/20 font-bold tracking-wider uppercase text-base lg:text-2xl">Klar</span>
                  </div>
                )}
              </div>

              {/* Siste 3 */}
              <div className="flex-1 flex flex-col gap-2 lg:gap-4 h-full min-h-0">
                <div className="flex-1 relative flex items-end justify-start h-full pb-1 lg:pb-2 min-h-0">
                  <div className="flex gap-2 lg:gap-4 items-end">
                    {recentDrawn.length === 0 ? (
                      <span className="text-transparent text-sm font-medium italic"></span>
                    ) : (
                      <AnimatePresence mode="popLayout">
                        {recentDrawn.map(num => (
                          <div key={num} className="w-14 h-14 sm:w-16 sm:h-16 lg:w-[70px] lg:h-[70px] xl:w-[90px] xl:h-[90px] shrink-0">
                            <Ball3D number={num} size="fill" />
                          </div>
                        ))}
                      </AnimatePresence>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Top Right: Logo Area */}
          <div className="hidden lg:flex flex-1 justify-end items-center h-full gap-4">
            {onlineConfig.enabled && onlineConfig.pin ? (
              <div className="h-full aspect-square bg-white rounded-2xl p-3 flex flex-col items-center justify-center">
                <img src={qrUrl} alt="Player QR" className="w-full h-full object-contain rounded-xl" />
                <p className="text-black text-[10px] font-bold mt-2">PIN: {onlineConfig.pin}</p>
              </div>
            ) : null}
            {systemConfig.logoUrl ? (
              <div className="h-full aspect-square flex items-center justify-center">
                <img src={systemConfig.logoUrl} alt="Logo" className="w-full h-full object-contain" />
              </div>
            ) : (
              <div className="h-full aspect-square bg-white/5 border border-dashed border-white/20 rounded-2xl flex flex-col items-center justify-center p-4">
                <span className="text-white/30 font-bold text-center text-xl lg:text-3xl uppercase tracking-wider">LOGO</span>
                <span className="text-white/20 font-medium text-center text-xs lg:text-base mt-2">(1:1 Format)</span>
              </div>
            )}
          </div>
        </div>

        {/* Middle: History Grid */}
        <div className="w-full flex-1 flex flex-col relative min-h-0">
          <HistoryGrid drawnNumbers={drawnNumbers} variant="obs" />
        </div>
        
        {/* Custom Banner Area (Bottom) */}
        <div className="w-full shrink-0 flex justify-center mt-4 lg:mt-6">
          {systemConfig.bannerUrl ? (
            <img src={systemConfig.bannerUrl} alt="Banner" className="w-full h-auto object-contain rounded-[30px]" />
          ) : (
            <div className="w-full aspect-[1839/239] bg-white/5 border border-dashed border-white/20 rounded-[30px] flex flex-col items-center justify-center">
               <span className="text-white/30 font-bold uppercase tracking-widest text-lg sm:text-xl md:text-2xl">Reklame Banner</span>
               <span className="text-white/20 font-medium text-xs sm:text-sm md:text-lg mt-1 md:mt-2">Breddeformat (1839 x 239 px)</span>
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
}
