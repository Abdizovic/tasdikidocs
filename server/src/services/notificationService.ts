import { supabaseAdmin } from "../lib/supabase";
import { Notification, NotificationTone } from "../types/domain";

/**
 * Notifications are only ever created here, with the service-role client.
 * Reading/marking-as-read happens directly from the app via Supabase (RLS
 * scopes every row to its own profile_id) — see supabase/migrations/
 * 0005_notifications.sql. Generic on purpose: any future event (certificate
 * issued/revoked, etc.) can call this with its own title/body/tone/link
 * without touching schema or RLS.
 */
export interface CreateNotificationInput {
  profileId: string;
  title: string;
  body: string;
  tone?: NotificationTone;
  link?: string | null;
}

export async function create(input: CreateNotificationInput): Promise<Notification> {
  const { data, error } = await supabaseAdmin
    .from("notifications")
    .insert({
      profile_id: input.profileId,
      title: input.title,
      body: input.body,
      tone: input.tone ?? "info",
      link: input.link ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Notification;
}
