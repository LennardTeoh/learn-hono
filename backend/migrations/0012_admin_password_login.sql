-- Admin signs in with a verified email address and password, without an email PIN.
-- All other accounts retain their existing two-factor setting.
UPDATE "user" SET twoFactorEnabled = 0
WHERE lower(email) = 'lumiere.csproject@gmail.com';
