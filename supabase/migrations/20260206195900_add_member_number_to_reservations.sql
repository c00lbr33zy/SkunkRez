/*
  # Add Member Number to Reservations

  1. Changes
    - Add `member_number` column to `reservations` table
      - Type: text
      - Optional field for membership identification
      - Default: empty string

  2. Notes
    - This field allows customers to provide their membership number for loyalty programs or special benefits
    - Field is optional and can be left blank for non-members
*/

-- Add member_number column to reservations table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reservations' AND column_name = 'member_number'
  ) THEN
    ALTER TABLE reservations ADD COLUMN member_number text DEFAULT '';
  END IF;
END $$;
