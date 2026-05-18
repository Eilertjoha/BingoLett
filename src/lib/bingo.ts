import { useState, useEffect, useRef } from 'react';
import { supabase } from './supabase';

export const getBingoInfo = (num: number) => {
  if (num >= 1 && num <= 15) return { letter: 'B', color: 'cyan' };
  if (num >= 16 && num <= 30) return { letter: 'I', color: 'pink' };
  if (num >= 31 && num <= 45) return { letter: 'N', color: 'green' };
  if (num >= 46 && num <= 60) return { letter: 'G', color: 'purple' };
  if (num >= 61 && num <= 75) return { letter: 'O', color: 'yellow' };
  return { letter: '?', color: 'gray' };
};

export function useBingoSync(role: 'admin' | 'obs') {
  const [drawnNumbers, setDrawnNumbers] = useState<number[]>([]);
  const [nextNumber, setNextNumber] = useState<number | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const stateRef = useRef(drawnNumbers);

  // Keep stateRef in sync for responding to requests
  useEffect(() => {
    stateRef.current = drawnNumbers;
  }, [drawnNumbers]);

  useEffect(() => {
    if (role !== 'admin') return;
    setNextNumber(prev => {
      if (prev !== null && !drawnNumbers.includes(prev)) {
        return prev;
      }
      const available = Array.from({ length: 75 }, (_, i) => i + 1).filter(n => !drawnNumbers.includes(n));
      if (available.length === 0) return null;
      return available[Math.floor(Math.random() * available.length)];
    });
  }, [drawnNumbers, role]);

  useEffect(() => {
    const channel = new BroadcastChannel('bingo_lett_sync');
    channelRef.current = channel;

    channel.onmessage = (e) => {
      if (role === 'admin' && e.data.type === 'REQUEST_SYNC') {
        channel.postMessage({ type: 'SYNC', payload: stateRef.current });
      } else if (role === 'obs' && (e.data.type === 'SYNC' || e.data.type === 'UPDATE')) {
        setDrawnNumbers(e.data.payload);
      }
    };

    if (role === 'obs') {
      channel.postMessage({ type: 'REQUEST_SYNC' });
    }

    return () => {
      channel.close();
    };
  }, [role]);

  useEffect(() => {
    if (!supabase) return;

    const loadRemoteState = async () => {
      const { data, error } = await supabase
        .from('bingo_state')
        .select('drawn_numbers')
        .eq('id', 'main')
        .single();

      if (!error && data && Array.isArray(data.drawn_numbers)) {
        setDrawnNumbers(data.drawn_numbers);
      }
    };

    loadRemoteState();
    const pollId = window.setInterval(loadRemoteState, 2000);

    const channel = supabase
      .channel('bingo_state_updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bingo_state' },
        (payload: any) => {
          const next = payload?.new?.drawn_numbers;
          if (Array.isArray(next)) {
            setDrawnNumbers(next);
          }
        }
      )
      .subscribe();

    return () => {
      window.clearInterval(pollId);
      supabase.removeChannel(channel);
    };
  }, []);

  const drawNumber = (manualNum?: number | any) => {
    if (role !== 'admin') return;
    const current = stateRef.current;
    if (current.length >= 75) return; // All drawn
    
    let numToDraw = nextNumber;
    if (typeof manualNum === 'number') {
        if (current.includes(manualNum)) return;
        numToDraw = manualNum;
    } else {
        if (numToDraw === null || current.includes(numToDraw)) {
            const available = Array.from({ length: 75 }, (_, i) => i + 1).filter(n => !current.includes(n));
            if (available.length === 0) return;
            numToDraw = available[Math.floor(Math.random() * available.length)];
        }
    }

    const newState = [...current, numToDraw!];
    
    setDrawnNumbers(newState);
    channelRef.current?.postMessage({ type: 'UPDATE', payload: newState });
    if (supabase) {
      supabase.from('bingo_state').upsert(
        {
          id: 'main',
          drawn_numbers: newState
        },
        { onConflict: 'id' }
      ).then(() => {}).catch(() => {});
    }
  };

  const resetGame = () => {
    if (role !== 'admin') return;
    if (!window.confirm("Er du sikker på at du vil starte et nytt spill?")) return;
    
    setDrawnNumbers([]);
    channelRef.current?.postMessage({ type: 'UPDATE', payload: [] });
    if (supabase) {
      supabase.from('bingo_state').upsert(
        {
          id: 'main',
          drawn_numbers: []
        },
        { onConflict: 'id' }
      ).then(() => {}).catch(() => {});
    }
  };

  return { drawnNumbers, nextNumber, drawNumber, resetGame };
}
