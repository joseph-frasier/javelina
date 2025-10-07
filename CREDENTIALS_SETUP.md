# Credentials Setup - Dev vs Production

## ✅ Current Configuration Status

Your app is now correctly configured to use **different OAuth apps** for development and production!

---

## 🏠 Local Development (`.env.local`)

**OAuth App**: Javelina Dev  
**Callback URL**: `http://localhost:3000/api/auth/callback/github`

```bash
GITHUB_ID=Ov23ctuTspI9fZ7cNjAo
GITHUB_SECRET=cbea4592c5b1a3e0bdda0e7c8d9ff0be0991cc4d
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=xhL9aYuaq6jTkEJSxZynmV+pKNwzeWYEfk5EPjLJroQ=
```

**Status**: ✅ Configured in `.env.local` file

---

## 🚀 Production (Vercel Environment Variables)

**OAuth App**: Javelina  
**Callback URL**: `https://javelina.vercel.app/api/auth/callback/github`

### Add these in Vercel Dashboard → Settings → Environment Variables:

| Variable          | Value                                          | Environments        |
| ----------------- | ---------------------------------------------- | ------------------- |
| `GITHUB_ID`       | `Ov23li31oTjYLxRBGqie`                         | Production, Preview |
| `GITHUB_SECRET`   | `67f28b282c495e32e8adcf095f22a0d8aa25ceb9`     | Production, Preview |
| `NEXTAUTH_URL`    | `https://javelina.vercel.app`                  | Production          |
| `NEXTAUTH_SECRET` | `xhL9aYuaq6jTkEJSxZynmV+pKNwzeWYEfk5EPjLJroQ=` | Production, Preview |

**Status**: ⚠️ Need to verify these are set in Vercel

---

## 🔍 How It Works

### When you run locally (`npm run dev`):

1. Next.js reads environment variables from `.env.local`
2. Uses **Dev** OAuth App credentials (`Ov23ctuTspI9fZ7cNjAo`)
3. Redirects to GitHub with callback: `http://localhost:3000/api/auth/callback/github`
4. GitHub redirects back to your local server

### When deployed on Vercel:

1. Vercel provides environment variables from Dashboard settings
2. Uses **Production** OAuth App credentials (`Ov23li31oTjYLxRBGqie`)
3. Redirects to GitHub with callback: `https://javelina.vercel.app/api/auth/callback/github`
4. GitHub redirects back to your production URL

---

## ✅ Testing Checklist

### Local Development:

- [ ] `.env.local` has dev credentials
- [ ] Run `npm run dev`
- [ ] Visit `http://localhost:3000/login`
- [ ] Click GitHub button
- [ ] Should redirect to GitHub OAuth
- [ ] After authorizing, should redirect back to `http://localhost:3000/`

### Production:

- [ ] Vercel environment variables are set with production credentials
- [ ] App is deployed/redeployed after adding env vars
- [ ] Visit `https://javelina.vercel.app/login`
- [ ] Click GitHub button
- [ ] Should redirect to GitHub OAuth
- [ ] After authorizing, should redirect back to `https://javelina.vercel.app/`

---

## 🔒 Security Notes

- ✅ `.env.local` is gitignored - won't be committed
- ✅ Using separate OAuth apps for dev/prod is **best practice**
- ✅ Secrets are kept separate for each environment
- ⚠️ Both apps share the same `NEXTAUTH_SECRET` (this is okay and required)

---

## 🆘 Troubleshooting

**"Invalid callback URL" error locally:**

- Make sure your "Javelina Dev" OAuth app has callback: `http://localhost:3000/api/auth/callback/github`

**"Invalid callback URL" error on Vercel:**

- Make sure your "Javelina" OAuth app has callback: `https://javelina.vercel.app/api/auth/callback/github`

**Can't log in locally:**

- Run `cat .env.local` and verify `GITHUB_ID=Ov23ctuTspI9fZ7cNjAo`
- Restart dev server: `npm run dev`

**Can't log in on Vercel:**

- Check Vercel Dashboard → Settings → Environment Variables
- Verify `GITHUB_ID=Ov23li31oTjYLxRBGqie` is set
- Redeploy the application after adding variables
