// src/app/lib/api.ts
import type {
  LostarkNotice, LostarkEvent, LostarkAlarmItem,
  LostarkAlarmResponse, LostarkGameContent
} from '@/types/lostark';

const LOSTARK_API_KEY = process.env.LOSTARK_API_KEY;

const BASE_URL = 'https://developer-lostark.game.onstove.com';
const DEFAULT_HEADERS = {
  'Accept': 'application/json',
  'Authorization': `bearer ${LOSTARK_API_KEY}`,
};

async function fetchLostarkData<T>(path: string, revalidateTime = 3600): Promise<T | null> {
  if (!LOSTARK_API_KEY) {
    console.error('LOSTARK_API_KEY is not defined.');
    return null;
  }
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: DEFAULT_HEADERS,
      next: { revalidate: revalidateTime }
    });
    if (!res.ok) {
      const errorMsg = await res.text();
      throw new Error(`Failed to fetch ${path}: ${res.status} ${res.statusText} - ${errorMsg}`);
    }
    return res.json() as Promise<T>;
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function getLostarkNotices(limit = 5): Promise<LostarkNotice[]> {
  const data = await fetchLostarkData<LostarkNotice[]>('/news/notices', 1800);
  return data?.slice(0, limit) ?? [];
}

export async function getLostarkEvents(limit = 5): Promise<LostarkEvent[]> {
  const data = await fetchLostarkData<LostarkEvent[]>('/news/events', 3600);
  return data?.slice(0, limit) ?? [];
}

export async function getLostarkAlarms(limit = 5): Promise<LostarkAlarmItem[]> {
  const data = await fetchLostarkData<LostarkAlarmResponse>('/news/alarms', 3600);
  return data?.Alarms?.slice(0, limit) ?? [];
}

export async function getLostarkGameCalendar(): Promise<LostarkGameContent[]> {
  const data = await fetchLostarkData<LostarkGameContent[]>('/gamecontents/calendar', 300);
  return data ?? [];
}