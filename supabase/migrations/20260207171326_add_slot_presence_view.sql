/*
  # Add slot presence view with user email
  
  1. Changes
    - Create a view that joins slot_presence with auth.users
    - This allows us to see which user (email) is currently booking each slot
    
  2. Purpose
    - Display the email of the user who is currently booking a slot
    - Enables real-time visibility across all users
*/

-- Create a view that joins slot_presence with auth.users to get user emails
CREATE OR REPLACE VIEW slot_presence_with_user AS
SELECT 
  sp.user_id,
  sp.venue_id,
  sp.table_id,
  sp.slot_date,
  sp.slot_time,
  sp.expires_at,
  sp.viewed_at,
  au.email as user_email
FROM slot_presence sp
INNER JOIN auth.users au ON sp.user_id = au.id;

-- Grant access to authenticated users
GRANT SELECT ON slot_presence_with_user TO authenticated;