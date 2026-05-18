import { useState, useEffect } from 'react';
import AdminView from './components/AdminView';
import ObsView from './components/ObsView';
import { Lock } from 'lucide-react';

export default function App() {
  const [isObs, setIsObs] = useState(window.location.hash === '#obs');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    const onHashChange = () => {
      setIsObs(window.location.hash === '#obs');
    };
    
    // Check if already authenticated in this session
    if (sessionStorage.getItem('bingo_admin_auth') === 'true') {
      setIsAuthenticated(true);
    }
    
    // Preload ball skins to prevent flickering
    const letters = ['B', 'I', 'N', 'G', 'O'];
    letters.forEach(letter => {
      const img = new Image();
      img.src = `${import.meta.env.BASE_URL}glass_orb_${letter}.webp`;
    });
    
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const correctPassword = import.meta.env.VITE_ADMIN_PASSWORD || 'bingo123';
    
    if (passwordInput === correctPassword) {
      setIsAuthenticated(true);
      sessionStorage.setItem('bingo_admin_auth', 'true');
      setError(false);
    } else {
      setError(true);
      setPasswordInput('');
    }
  };

  if (isObs) {
    return <ObsView />;
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#07070a] flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-white/5 border border-white/10 p-8 rounded-3xl max-w-md w-full backdrop-blur-md flex flex-col items-center">
          <div className="w-16 h-16 bg-pink-500/20 rounded-full flex items-center justify-center mb-6">
            <Lock className="w-8 h-8 text-pink-400" />
          </div>
          <h2 className="text-2xl font-black text-white mb-2 tracking-tight">Admin Logg Inn</h2>
          <p className="text-gray-400 text-sm mb-8 text-center">Skriv inn passord for å få tilgang til Bingo-kontroller og innstillinger.</p>
          
          <div className="w-full mb-6">
            <input 
              type="password" 
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Passord..."
              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-pink-500 transition-colors"
              autoFocus
            />
            {error && <p className="text-red-400 text-xs mt-2 font-medium">Feil passord. Prøv igjen.</p>}
          </div>
          
          <button 
            type="submit"
            className="w-full bg-gradient-to-r from-cyan-500 to-pink-500 hover:from-cyan-400 hover:to-pink-400 text-white font-bold py-3 rounded-xl transition-all active:scale-95 shadow-lg shadow-pink-500/20"
          >
            Logg inn
          </button>
        </form>
      </div>
    );
  }

  return <AdminView />;
}
