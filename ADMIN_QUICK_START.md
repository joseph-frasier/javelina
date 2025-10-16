# Admin Panel - Quick Start Guide

## 🎯 Fastest Way to Access Admin

### Step 1: Start Development Server
```bash
npm run dev
```

### Step 2: Go to Login Page
```
http://localhost:3000/admin/login
```

### Step 3: Use These Credentials
```
Email:    admin@irongrove.com
Password: admin123
```

### Step 4: You're In! 
You're now viewing the admin dashboard at `/admin`

---

## 🔑 Remember These Credentials
- **Email:** `admin@irongrove.com`
- **Password:** `admin123`
- They're **hardcoded** in `lib/admin-auth.ts`
- **No database needed**
- **No schema changes**
- **No additional keys required**

---

## 📍 Key Admin Routes

| Route | Purpose |
|-------|---------|
| `/admin/login` | Login page |
| `/admin` | Dashboard (requires auth) |
| `/admin/users` | User management (UI building) |
| `/admin/organizations` | Org management (UI building) |
| `/admin/audit` | Audit log viewer |

---

## ⚡ What You Can Do

✅ Build and style admin UI components  
✅ Navigate between admin pages  
✅ See session validation in action  
✅ Test protected routes  
✅ Practice admin workflows  

❌ Actually perform backend operations (intentionally disabled)  
❌ Create/modify data in production  
❌ Use with real user accounts  

---

## 🆘 Troubleshooting

### "Invalid email or password"
- Make sure you're using exactly: `admin@irongrove.com` (lowercase)
- Password: `admin123` (case-sensitive)

### "Not authenticated" 
- You got logged out (sessions are in-memory, cleared on server restart)
- Just login again with the credentials above

### "Admin backend functionality not yet available"
- This is intentional! Admin actions are disabled for development
- The UI is still fully usable for mockups and component building

---

## 📚 Read More

- **ADMIN_SETUP.md** - Detailed technical documentation
- **ADMIN_IMPLEMENTATION_SUMMARY.md** - Complete implementation overview
- **lib/admin-auth.ts** - Source code for authentication logic

Enjoy building the admin panel! 🚀
