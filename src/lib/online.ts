import { supabase } from './supabase';

export interface OnlineConfig {
  enabled: boolean;
  pin: string;
}

export interface PlayerSession {
  name: string;
  pin: string;
  cardId: number;
}

const ONLINE_KEY = 'bingo-online-config';

export const defaultOnlineConfig: OnlineConfig = {
  enabled: false,
  pin: ''
};

export async function loadOnlineConfig(): Promise<OnlineConfig> {
  const saved = localStorage.getItem(ONLINE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved) as OnlineConfig;
      if (parsed && typeof parsed.enabled === 'boolean' && typeof parsed.pin === 'string') {
        return parsed;
      }
    } catch {}
  }

  if (!supabase) return defaultOnlineConfig;

  const { data, error } = await supabase
    .from('bingo_online')
    .select('*')
    .eq('id', 'config')
    .single();

  if (error || !data) return defaultOnlineConfig;

  const config: OnlineConfig = {
    enabled: !!data.enabled,
    pin: data.pin || ''
  };
  localStorage.setItem(ONLINE_KEY, JSON.stringify(config));
  return config;
}

export async function saveOnlineConfig(config: OnlineConfig): Promise<void> {
  localStorage.setItem(ONLINE_KEY, JSON.stringify(config));
  window.dispatchEvent(new Event('storage'));

  if (!supabase) return;
  await supabase.from('bingo_online').upsert(
    {
      id: 'config',
      enabled: config.enabled,
      pin: config.pin
    },
    { onConflict: 'id' }
  );
}

export async function joinPlayerByPin(name: string, pin: string): Promise<PlayerSession> {
  if (!supabase) {
    const playersKey = `bingo-players-${pin}`;
    let players: Array<{ name: string; cardId: number }> = [];
    try {
      players = JSON.parse(localStorage.getItem(playersKey) || '[]');
    } catch {}

    const existing = players.find((p) => p.name.toLowerCase() === name.toLowerCase());
    const cardId = existing?.cardId ?? (players.length + 1);
    if (!existing) {
      players.push({ name, cardId });
      localStorage.setItem(playersKey, JSON.stringify(players));
    }
    return { name, pin, cardId };
  }

  const { data: existingRows } = await supabase
    .from('bingo_players')
    .select('name, card_id')
    .eq('pin', pin)
    .eq('name', name)
    .limit(1);

  if (existingRows && existingRows.length > 0) {
    return { name, pin, cardId: existingRows[0].card_id };
  }

  const { data: allRows } = await supabase
    .from('bingo_players')
    .select('card_id')
    .eq('pin', pin);

  const maxCard = (allRows || []).reduce((max, row) => Math.max(max, row.card_id || 0), 0);
  const cardId = maxCard + 1;

  await supabase.from('bingo_players').insert({
    pin,
    name,
    card_id: cardId
  });

  return { name, pin, cardId };
}

