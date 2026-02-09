/*
  # Fix slot presence unique constraint
  
  1. Changes
    - Drop the old unique constraint on (user_id, venue_id, table_id, slot_date, slot_time)
    - Add new unique constraint on just (user_id) to ensure one presence record per user
    
  2. Purpose
    - Prevents race conditions and duplicate presence records
    - Each user can only be viewing one slot at a time
*/

-- Drop the old unique constraint
ALTER TABLE slot_presence 
DROP CONSTRAINT IF EXISTS slot_presence_user_id_venue_id_table_id_slot_date_slot_time_key;

-- Add new unique constraint on just user_id
ALTER TABLE slot_presence
ADD CONSTRAINT slot_presence_user_id_key UNIQUE (user_id);
