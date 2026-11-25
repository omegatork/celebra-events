-- Sign in with Google.
-- google_sub is Google's stable user id (the "sub" claim); emails can change, sub never does.
-- Users created through Google have no password until they set one in /cuenta.
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE users ADD COLUMN google_sub text UNIQUE;
