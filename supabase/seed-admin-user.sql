-- Seed dummy admin user for testing
-- Email: admin@irongrove.com
-- Password: admin123

-- This hash was generated with bcrypt (rounds=10) for password "admin123"
-- To regenerate: npm install -g bcryptjs && node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('admin123', 10))"

INSERT INTO public.admin_users (
  email,
  name,
  password_hash,
  mfa_enabled,
  created_at,
  updated_at
) VALUES (
  'admin@irongrove.com',
  'Admin User',
  '$2a$10$B0T9c3iXZwVLhBcEb3qXqO2wQ8xHNzKvLSUeFMsqNqO8MKy5VzUq.',
  false,
  now(),
  now()
)
ON CONFLICT (email) DO UPDATE SET
  password_hash = '$2a$10$B0T9c3iXZwVLhBcEb3qXqO2wQ8xHNzKvLSUeFMsqNqO8MKy5VzUq.',
  updated_at = now();
