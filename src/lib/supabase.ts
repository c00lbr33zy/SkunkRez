import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

export type Database = {
  public: {
    Tables: {
      venues: {
        Row: {
          id: string;
          name: string;
          address: string;
          description: string;
          opening_time: string;
          closing_time: string;
          slot_duration_minutes: number;
          created_at: string;
          updated_at: string;
        };
      };
      restaurant_tables: {
        Row: {
          id: string;
          venue_id: string;
          table_number: string;
          capacity: number;
          is_active: boolean;
          created_at: string;
        };
      };
      reservations: {
        Row: {
          id: string;
          user_id: string;
          venue_id: string;
          table_id: string;
          reservation_date: string;
          start_time: string;
          end_time: string;
          guest_count: number;
          customer_name: string;
          customer_email: string;
          customer_phone: string;
          status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
          notes: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          venue_id: string;
          table_id: string;
          reservation_date: string;
          start_time: string;
          end_time: string;
          guest_count: number;
          customer_name: string;
          customer_email: string;
          customer_phone: string;
          status?: 'pending' | 'confirmed' | 'cancelled' | 'completed';
          notes?: string;
        };
      };
      slot_presence: {
        Row: {
          id: string;
          user_id: string;
          venue_id: string;
          table_id: string;
          slot_date: string;
          slot_time: string;
          viewed_at: string;
          expires_at: string;
        };
        Insert: {
          user_id: string;
          venue_id: string;
          table_id: string;
          slot_date: string;
          slot_time: string;
          expires_at: string;
        };
      };
    };
  };
};
