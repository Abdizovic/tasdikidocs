// Thin fetch wrapper for the Express business-logic layer. Auth (sign
// in/up, session, password changes) goes straight to Supabase via
// src/lib/supabase.ts — this client is only for the privileged/aggregate
// operations that live behind the Express API (institutions, certificates,
// admin analytics/audit logs).

import { ApiError } from '@/lib/apiError';
import { supabase } from '@/lib/supabase';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error('EXPO_PUBLIC_API_URL must be set (see .env.local)');
}

interface RequestOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
  query?: Record<string, string | undefined>;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query } = options;

  let url = `${API_URL}${path}`;
  if (query) {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined) params.set(key, value);
    });
    const qs = params.toString();
    if (qs) url += `?${qs}`;
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Could not reach the server. Check your connection and try again.', 'network_error');
  }

  const isJson = res.headers.get('content-type')?.includes('application/json') ?? false;
  const payload = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    const message = payload?.error?.message ?? 'Something went wrong. Please try again.';
    const code = (payload?.error?.code ?? 'unknown_error').toLowerCase();
    throw new ApiError(message, code);
  }

  return payload as T;
}

export const api = {
  get: <T>(path: string, query?: Record<string, string | undefined>) => request<T>(path, { method: 'GET', query }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
};
