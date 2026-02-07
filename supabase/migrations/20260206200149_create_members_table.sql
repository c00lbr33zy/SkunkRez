/*
  # Create Members Table

  1. New Tables
    - `members`
      - `id` (uuid, primary key)
      - `member_number` (text, unique) - Membership identifier
      - `name` (text) - Member's full name
      - `email` (text) - Member's email address
      - `phone` (text) - Member's phone number
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on members table
    - Allow authenticated users to read member data for lookup purposes

  3. Indexes
    - Unique index on member_number for fast lookups
*/

-- Create members table
CREATE TABLE IF NOT EXISTS members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_number text UNIQUE NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for fast member number lookups
CREATE INDEX IF NOT EXISTS idx_members_member_number ON members(member_number);

-- Enable Row Level Security
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

-- RLS Policy for members
CREATE POLICY "Authenticated users can view members"
  ON members FOR SELECT
  TO authenticated
  USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_members_updated_at
  BEFORE UPDATE ON members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
