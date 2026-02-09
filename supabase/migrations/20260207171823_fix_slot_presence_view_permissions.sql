/*
  # Fix slot presence view permissions
  
  1. Changes
    - Recreate the slot_presence_with_user view with SECURITY DEFINER
    - This allows the view to access auth.users regardless of user permissions
    
  2. Purpose
    - Ensure all authenticated users can see who is booking slots
    - Fix the issue where other users can't see billy@augcc.com's presence
*/

-- Drop the existing view
DROP VIEW IF EXISTS slot_presence_with_user;

-- Recreate the view with SECURITY DEFINER to allow access to auth.users
CREATE OR REPLACE VIEW slot_presence_with_user
WITH (security_invoker=false)
AS
SELECT 
  sp.id,
  sp.user_id,
  sp.venue_id,
  sp.table_id,
  sp.slot_date,
  sp.slot_time,
  sp.expires_at,
  sp.viewed_at,
  au.email as user_email
FROM slot_presence sp
INNER JOIN auth.users au ON sp.user_id = au.id
WHERE sp.expires_at > now();

-- Grant access to authenticated users
GRANT SELECT ON slot_presence_with_user TO authenticated;