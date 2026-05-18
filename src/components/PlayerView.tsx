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
      loadOnlineConfig()
        .then(setOnlineConfig)
        .catch(() => {});
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
  const lastDrawnLabel = lastDrawn ? `${getBingoInfo(lastDrawn).letter}${lastDrawn}` : 'Ingen enda';

  const totalDrawn = drawnNumbers.length;
  const joinedLabel = useMemo(() => {
    if (!session) return '';
    return `${session.name} • Bong #${session.cardId}`;
  }, [session]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedName = name.trim();
    const trimmedPin = pin.trim();
    if (!trimmedName) {
      setError('Skriv inn spillernavn.');
      return;
    }
    if (!trimmedPin) {
      setError('Skriv inn game pin.');
      return;
    }
    if (!onlineConfig.enabled) {
      setError('Online-spill er ikke aktivert ennå.');
      return;
    }
    if (onlineConfig.pin !== trimmedPin) {
      setError('Ugyldig game pin.');
      return;
    }

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
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Spillernavn"
              className="w-full bg-black/50 border border-white/15 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-400"
            />
            <input
              type="text"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Game pin"
              className="w-full bg-black/50 border border-white/15 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-pink-400"
            />
          </div>
          {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
          <button
            type="submit"
            className="w-full mt-6 bg-gradient-to-r from-cyan-500 to-pink-500 hover:from-cyan-400 hover:to-pink-400 text-white font-bold py-3 rounded-xl transition-all"
          >
            Bli med
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07070a] text-gray-100 p-4 sm:p-6">
      <div className="max-w-3xl mx-auto flex flex-col gap-4">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">Innlogget</p>
            <p className="font-bold">{joinedLabel}</p>
          </div>
          <button onClick={logout} className="px-3 py-2 text-sm rounded-lg bg-white/10 hover:bg-white/20 border border-white/20">
            Logg ut
          </button>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <p className="text-sm text-gray-400 mb-1">Siste trekk</p>
            <p className="text-4xl font-black">{lastDrawnLabel}</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <p className="text-sm text-gray-400 mb-1">Antall trukket</p>
            <p className="text-4xl font-black">{totalDrawn}/75</p>
          </div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <p className="text-sm text-gray-400 mb-2">Trukne tall</p>
          <div className="flex flex-wrap gap-2">
            {drawnNumbers.length === 0 ? <span className="text-gray-500">Ingen tall trukket enda.</span> : null}
            {drawnNumbers.map((num) => (
              <span key={num} className="px-2 py-1 rounded-md bg-white/10 border border-white/15 text-sm font-bold">
                {getBingoInfo(num).letter}{num}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
