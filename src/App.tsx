import { useState, useEffect } from 'react';
import AdminView from './components/AdminView';
import ObsView from './components/ObsView';

export default function App() {
  const [isObs, setIsObs] = useState(window.location.hash === '#obs');

  useEffect(() => {
    const onHashChange = () => {
      setIsObs(window.location.hash === '#obs');
    };
    
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  if (isObs) {
    return <ObsView />;
  }

  return <AdminView />;
}
