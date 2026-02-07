import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface SlotPresence {
  user_id: string;
  venue_id: string;
  table_id: string;
  slot_date: string;
  slot_time: string;
  viewed_at: string;
  expires_at: string;
}

export function useSlotPresence(venueId: string, tableId: string, slotDate: string, slotTime: string) {
  const { user } = useAuth();
  const [otherUsers, setOtherUsers] = useState<SlotPresence[]>([]);
  const [presenceId, setPresenceId] = useState<string | null>(null);

  const updatePresence = useCallback(async () => {
    if (!user || !venueId || !tableId || !slotDate || !slotTime) return;

    const expiresAt = new Date(Date.now() + 120000).toISOString();
    const normalizedTime = slotTime.length === 5 ? `${slotTime}:00` : slotTime;

    if (presenceId) {
      await supabase
        .from('slot_presence')
        .update({ expires_at: expiresAt, viewed_at: new Date().toISOString() })
        .eq('id', presenceId);
    } else {
      const { data, error } = await supabase
        .from('slot_presence')
        .upsert(
          {
            user_id: user.id,
            venue_id: venueId,
            table_id: tableId,
            slot_date: slotDate,
            slot_time: normalizedTime,
            expires_at: expiresAt,
          },
          {
            onConflict: 'user_id,venue_id,table_id,slot_date,slot_time',
          }
        )
        .select()
        .maybeSingle();

      if (data && !error) {
        setPresenceId(data.id);
      }
    }
  }, [user, venueId, tableId, slotDate, slotTime, presenceId]);

  const removePresence = useCallback(async () => {
    if (!presenceId) return;
    await supabase.from('slot_presence').delete().eq('id', presenceId);
    setPresenceId(null);
  }, [presenceId]);

  const fetchOtherUsers = useCallback(async () => {
    if (!user || !venueId || !tableId || !slotDate || !slotTime) return;

    const normalizedTime = slotTime.length === 5 ? `${slotTime}:00` : slotTime;

    const { data } = await supabase
      .from('slot_presence')
      .select('*')
      .eq('venue_id', venueId)
      .eq('table_id', tableId)
      .eq('slot_date', slotDate)
      .eq('slot_time', normalizedTime)
      .neq('user_id', user.id)
      .gt('expires_at', new Date().toISOString());

    setOtherUsers(data || []);
  }, [user, venueId, tableId, slotDate, slotTime]);

  useEffect(() => {
    if (!user || !venueId || !tableId || !slotDate || !slotTime) return;

    updatePresence();
    fetchOtherUsers();

    const interval = setInterval(updatePresence, 30000);
    const fetchInterval = setInterval(fetchOtherUsers, 2000);

    const channel = supabase
      .channel(`slot:${venueId}:${tableId}:${slotDate}:${slotTime}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'slot_presence',
          filter: `table_id=eq.${tableId}`,
        },
        () => {
          fetchOtherUsers();
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      clearInterval(fetchInterval);
      removePresence();
      channel.unsubscribe();
    };
  }, [user, venueId, tableId, slotDate, slotTime, updatePresence, removePresence, fetchOtherUsers]);

  return { otherUsers, isLocked: otherUsers.length > 0 };
}
