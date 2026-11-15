-- Create a function to verify bcrypt passwords
-- This function uses the pgcrypto extension for bcrypt comparison

-- First, ensure pgcrypto extension is enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create the verify_password function
CREATE OR REPLACE FUNCTION verify_password(password TEXT, hashed_password TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if the password matches the hash using bcrypt
  -- pgcrypto's crypt function handles bcrypt hashes
  RETURN crypt(password, hashed_password) = hashed_password;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
