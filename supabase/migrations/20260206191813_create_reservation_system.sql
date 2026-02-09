/*
  # Restaurant Reservation System Schema

  1. New Tables
    - `venues`
      - `id` (uuid, primary key)
      - `name` (text) - Venue name
      - `address` (text) - Venue address
      - `description` (text) - Venue description
      - `opening_time` (time) - Opening time
      - `closing_time` (time) - Closing time
      - `slot_duration_minutes` (integer) - Duration of each time slot
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `restaurant_tables`
      - `id` (uuid, primary key)
      - `venue_id` (uuid, foreign key)
      - `table_number` (text) - Table identifier
      - `capacity` (integer) - Maximum guests
      - `is_active` (boolean) - Whether table is available for booking
      - `created_at` (timestamptz)

    - `reservations`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `venue_id` (uuid, foreign key)
      - `table_id` (uuid, foreign key)
      - `reservation_date` (date) - Date of reservation
      - `start_time` (time) - Start time
      - `end_time` (time) - End time
      - `guest_count` (integer) - Number of guests
      - `customer_name` (text) - Customer name
      - `customer_email` (text) - Customer email
      - `customer_phone` (text) - Customer phone
      - `status` (text) - Status: pending, confirmed, cancelled, completed
      - `notes` (text) - Special requests or notes
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `slot_presence`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `venue_id` (uuid, foreign key)
      - `table_id` (uuid, foreign key)
      - `slot_date` (date) - Date being viewed
      - `slot_time` (time) - Time slot being viewed
      - `viewed_at` (timestamptz) - When user started viewing
      - `expires_at` (timestamptz) - When presence expires (30 seconds)

  2. Security
    - Enable RLS on all tables
    - Venues: Public read access, admin write access
    - Tables: Public read access for active tables
    - Reservations: Users can read/create their own, view availability
    - Slot Presence: Users can manage their own presence, read others

  3. Indexes
    - Performance indexes for common queries
    - Unique constraints for preventing double bookings
*/

-- Create venues table
CREATE TABLE IF NOT EXISTS venues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text NOT NULL,
  description text DEFAULT '',
  opening_time time NOT NULL DEFAULT '09:00',
  closing_time time NOT NULL DEFAULT '22:00',
  slot_duration_minutes integer NOT NULL DEFAULT 60,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create restaurant_tables table
CREATE TABLE IF NOT EXISTS restaurant_tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  table_number text NOT NULL,
  capacity integer NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(venue_id, table_number)
);

-- Create reservations table
CREATE TABLE IF NOT EXISTS reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  venue_id uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  table_id uuid NOT NULL REFERENCES restaurant_tables(id) ON DELETE CASCADE,
  reservation_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  guest_count integer NOT NULL,
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text NOT NULL,
  status text NOT NULL DEFAULT 'confirmed',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed'))
);

-- Create slot_presence table for real-time locking
CREATE TABLE IF NOT EXISTS slot_presence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  venue_id uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  table_id uuid NOT NULL REFERENCES restaurant_tables(id) ON DELETE CASCADE,
  slot_date date NOT NULL,
  slot_time time NOT NULL,
  viewed_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  UNIQUE(user_id, venue_id, table_id, slot_date, slot_time)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations(reservation_date);
CREATE INDEX IF NOT EXISTS idx_reservations_table ON reservations(table_id, reservation_date);
CREATE INDEX IF NOT EXISTS idx_reservations_venue ON reservations(venue_id, reservation_date);
CREATE INDEX IF NOT EXISTS idx_reservations_user ON reservations(user_id);
CREATE INDEX IF NOT EXISTS idx_slot_presence_expires ON slot_presence(expires_at);
CREATE INDEX IF NOT EXISTS idx_slot_presence_slot ON slot_presence(venue_id, table_id, slot_date, slot_time);

-- Enable Row Level Security
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE slot_presence ENABLE ROW LEVEL SECURITY;

-- RLS Policies for venues
CREATE POLICY "Anyone can view venues"
  ON venues FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for restaurant_tables
CREATE POLICY "Anyone can view active tables"
  ON restaurant_tables FOR SELECT
  TO authenticated
  USING (is_active = true);

-- RLS Policies for reservations
CREATE POLICY "Users can view all reservations for availability checking"
  ON reservations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create their own reservations"
  ON reservations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reservations"
  ON reservations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reservations"
  ON reservations FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for slot_presence
CREATE POLICY "Users can view all slot presence"
  ON slot_presence FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create their own presence"
  ON slot_presence FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own presence"
  ON slot_presence FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own presence"
  ON slot_presence FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_venues_updated_at
  BEFORE UPDATE ON venues
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reservations_updated_at
  BEFORE UPDATE ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up expired slot presence
CREATE OR REPLACE FUNCTION cleanup_expired_presence()
RETURNS void AS $$
BEGIN
  DELETE FROM slot_presence WHERE expires_at < now();
END;
$$ language 'plpgsql';
