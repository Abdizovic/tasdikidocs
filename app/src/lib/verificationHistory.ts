import { Platform } from 'react-native';
import type { VerificationResult } from '@/types';

export interface HistoryEntry {
  query: string;
  result: VerificationResult;
  studentName: string | null;
  checkedAt: string;
}

const KEY = 'tasdikidocs.verificationHistory';
const MAX_ENTRIES = 25;

async function readAll(): Promise<HistoryEntry[]> {
  try {
    const raw =
      Platform.OS === 'web'
        ? window.localStorage.getItem(KEY)
        : await (await import('expo-secure-store')).getItemAsync(KEY);
    return raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

async function writeAll(entries: HistoryEntry[]): Promise<void> {
  const raw = JSON.stringify(entries.slice(0, MAX_ENTRIES));
  if (Platform.OS === 'web') {
    window.localStorage.setItem(KEY, raw);
    return;
  }
  await (await import('expo-secure-store')).setItemAsync(KEY, raw);
}

export async function addHistoryEntry(entry: HistoryEntry): Promise<HistoryEntry[]> {
  const existing = await readAll();
  const next = [entry, ...existing.filter((e) => e.query !== entry.query)];
  await writeAll(next);
  return next;
}

export async function getHistory(): Promise<HistoryEntry[]> {
  return readAll();
}
