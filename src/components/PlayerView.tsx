import { useEffect, useMemo, useState } from 'react';
import { getBingoInfo, useBingoSync } from '../lib/bingo';
import {
  defaultOnlineConfig,
  joinPlayerByPin,
  loadOnlineConfig,
  type OnlineConfig,
  type PlayerSession
} from '../lib/online';

const parsePinFromHash = () => {
  const hash = window.location.hash || '';
  const queryIndex = hash.indexOf('?');
  if (queryIndex === -1) return '';
  const params = new URLSearchParams(hash.slice(queryIndex + 1));
  return params.get('pin') || '';
};

export default function PlayerView() {
  const { drawnNumbers } = useBingoSync('obs');
  const [name, setName] = useState('');
  const [pin, setPin] = useState(parsePinFromHash());
  const [error, setError] = useState('');
  const [onlineConfig, setOnlineConfig] = useState<OnlineConfig>(defaultOnlineConfig);
  const [session, setSession] = useState<PlayerSession | null>(null);

  useEffect(() => {
    const refreshOnlineConfig = () => {
      loadOnlineConfig().then(setOnlineConfig).catch(() => {});
    };

    const savedSession = localStorage.getItem('bingo-player-session');
    if (savedSession) {
      try {
        setSession(JSON.parse(savedSession));
      } catch {}
    }

    refreshOnlineConfig();
    window.addEventListener('storage', refreshOnlineConfig);
    return () => window.removeEventListener('storage', refreshOnlineConfig);
  }, []);

  const lastDrawn = drawnNumbers.length > 0 ? drawnNumbers[drawnNumbers.length - 1] : null;
  const lastDrawnLabel = lastDrawn ? `${getBingoInfo(lastDrawn).letter}${lastDrawn}` : '-';
  const totalDrawn = drawnNumbers.length;

  const buildCardNumbers = (seed: number) => {
    const pickUnique = (from: number, to: number, count: number, s: number) => {
      const nums = Array.from({ length: to - from + 1 }, (_, i) => from + i);
      let rand = s * 9973;
      const out: number[] = [];
      while (out.length < count && nums.length > 0) {
        rand = (rand * 1664525 + 1013904223) % 4294967296;
        const idx = rand % nums.length;
        out.push(nums[idx]);
        nums.splice(idx, 1);
      }
      return out.sort((a, b) => a - b);
    };

    const b = pickUnique(1, 15, 5, seed + 1);
    const i = pickUnique(16, 30, 5, seed + 2);
    const n = pickUnique(31, 45, 5, seed + 3);
    const g = pickUnique(46, 60, 5, seed + 4);
    const o = pickUnique(61, 75, 5, seed + 5);

    return Array.from({ length: 5 }, (_, r) => [b[r], i[r], r === 2 ? 'FREE' : n[r], g[r], o[r]] as Array<number | 'FREE'>);
  };

  const cardRows = useMemo(() => (session ? buildCardNumbers(session.cardId) : []), [session]);
  const recent = useMemo(() => [...drawnNumbers].reverse().slice(1, 4), [drawnNumbers]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedName = name.trim();
    const trimmedPin = pin.trim();
    if (!trimmedName) return setError('Skriv inn spillernavn.');
    if (!trimmedPin) return setError('Skriv inn game pin.');
    if (!onlineConfig.enabled) return setError('Online-spill er ikke aktivert ennå.');
    if (onlineConfig.pin !== trimmedPin) return setError('Ugyldig game pin.');

    try {
      const nextSession = await joinPlayerByPin(trimmedName, trimmedPin);
      setSession(nextSession);
      localStorage.setItem('bingo-player-session', JSON.stringify(nextSession));
    } catch {
      setError('Kunne ikke logge inn akkurat nå. Prøv igjen.');
    }
  };

  const logout = () => {
    localStorage.removeItem('bingo-player-session');
    setSession(null);
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-[#07070a] text-gray-100 flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="w-full max-w-md bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8">
          <h1 className="text-2xl font-black tracking-tight mb-2">Bingo Player</h1>
          <p className="text-sm text-gray-400 mb-6">Skriv inn navn og game pin for å bli med.</p>
          <div className="space-y-3">
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Spillernavn" className="w-full bg-black/50 border border-white/15 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-400" />
            <input type="text" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="Game pin" className="w-full bg-black/50 border border-white/15 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-pink-400" />
          </div>
          {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
          <button type="submit" className="w-full mt-6 bg-gradient-to-r from-cyan-500 to-pink-500 hover:from-cyan-400 hover:to-pink-400 text-white font-bold py-3 rounded-xl transition-all">Bli med</button>
        </form>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen text-gray-100 p-3 sm:p-4"
      style={{
        background:
          'radial-gradient(70% 40% at 15% 0%, rgba(217,70,239,0.24), transparent 60%), radial-gradient(70% 40% at 85% 10%, rgba(34,211,238,0.16), transparent 70%), #050505'
      }}
    >
      <div className="max-w-md mx-auto flex flex-col gap-3">
        <div className="flex justify-end">
          <button onClick={logout} className="px-3 py-2 text-xs rounded-xl bg-white/10 hover:bg-white/20 border border-white/20">Logg ut</button>
        </div>

        <div className="grid grid-cols-[1fr_0.95fr] gap-3">
          <div className="relative pt-2">
            <div className="w-full aspect-square rounded-full border-[5px] border-fuchsia-500 bg-black flex items-center justify-center text-7xl font-medium shadow-[0_0_40px_rgba(217,70,239,0.6)]">
              {lastDrawn ?? '-'}
            </div>
            <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 flex gap-2">
              {recent.map((n, i) => (
                <span
                  key={n}
                  className={`w-[72px] h-[72px] rounded-full border-4 text-2xl flex items-center justify-center bg-[#120b1f] ${i === 1 ? 'border-fuchsia-500 shadow-[0_0_14px_rgba(217,70,239,0.5)]' : 'border-cyan-400 shadow-[0_0_14px_rgba(34,211,238,0.5)]'}`}
                >
                  {getBingoInfo(n).letter}{n}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/15 bg-white/5 p-4">
            <p className="text-gray-500 text-[11px] font-bold uppercase">Diva: <span className="text-white">{session.name.toUpperCase()}</span></p>
            <p className="text-gray-500 text-[11px] font-bold uppercase mt-1">Player: <span className="text-white">#{session.cardId}</span></p>
            <div className="h-px bg-white/10 my-3" />
            <p className="text-gray-500 text-[11px] font-bold uppercase">Status: <span className="text-white">Running</span></p>
            <p className="text-gray-500 text-[11px] font-bold uppercase mt-1">Balls left: <span className="text-white">{75 - totalDrawn}</span></p>
            <p className="text-cyan-300 text-sm font-black mt-3">{lastDrawnLabel}</p>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-3 mt-3">
          <div className="grid grid-cols-5 gap-2 mb-2 text-center font-black text-4xl leading-none">
            <span className="text-cyan-400">B</span>
            <span className="text-fuchsia-400">I</span>
            <span className="text-emerald-400">N</span>
            <span className="text-purple-400">G</span>
            <span className="text-yellow-300">O</span>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {cardRows.flat().map((cell, idx) => {
              const isFree = cell === 'FREE';
              const isMarked = isFree || (typeof cell === 'number' && drawnNumbers.includes(cell));
              return (
                <div
                  key={idx}
                  className={`aspect-square rounded-2xl border flex items-center justify-center text-2xl font-medium ${
                    isMarked
                      ? 'bg-pink-500/35 border-pink-300/70 text-white shadow-[0_0_16px_rgba(236,72,153,0.4)]'
                      : 'bg-[#090b1f] border-white/5 text-gray-200'
                  }`}
                >
                  {isFree ? '?' : cell}
                </div>
              );
            })}
          </div>
        </div>

        <button className="h-14 rounded-2xl bg-gradient-to-r from-cyan-500/35 to-purple-500/35 border border-cyan-300/50 text-cyan-300 text-2xl font-black tracking-wide shadow-[0_0_20px_rgba(34,211,238,0.25)]">
          ? AUTO PICK ALL
        </button>
      </div>
    </div>
  );
}
