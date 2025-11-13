# Admin Server Actions

These admin server actions have been migrated to use the Express API.

All admin functionality should now call the Express API endpoints at `/api/admin/*` instead of making direct Supabase calls.

The Express API handles:
- Authentication (JWT token validation)
- Authorization (admin role checks)
- Database queries
- Business logic

See `/lib/api-client.ts` for the adminApi methods.

