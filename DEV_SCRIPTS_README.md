# Development Scripts Guide

## Local Development

### Quick Start - Run Everything
To run both the frontend and backend simultaneously with one command:

```bash
npm run dev:full
```

This will start:
- **Frontend** (Next.js) on `http://localhost:3000` (cyan output)
- **Backend** (Express API) on `http://localhost:5001` (magenta output)

### Individual Services

Run only the frontend:
```bash
npm run dev
```

Run only the backend:
```bash
npm run dev:backend
```

### Production Build

Build both frontend and backend:
```bash
npm run build:full
```

Start both in production mode:
```bash
npm run start:full
```

## Setup

### First Time Setup
1. Install root dependencies:
   ```bash
   npm install
   ```

2. The `postinstall` script will automatically install backend dependencies. If needed, you can manually install them:
   ```bash
   cd backend && npm install
   ```

### Environment Variables
Make sure you have the following `.env.local` files configured:
- `/` (root) - Frontend environment variables
- `/backend/.env` - Backend environment variables

## Vercel Deployment

### How It Works
When deploying to Vercel, the platform will:

1. **Frontend**: Deploy the Next.js app from the root directory
2. **Backend**: Deploy the Express API as serverless functions via `/backend/vercel.json`
3. **Routing**: The root `vercel.json` configures rewrites to route `/api/backend/*` requests to the backend serverless functions

### Deployment Configuration

The monorepo is configured with:
- Root `vercel.json` - Handles build commands and API routing
- `backend/vercel.json` - Configures backend as serverless functions
- `postinstall` script - Ensures backend dependencies are installed

### Manual Deployment
```bash
vercel --prod
```

### Environment Variables on Vercel
Make sure to configure all environment variables in your Vercel project settings:
- Go to Project Settings → Environment Variables
- Add all variables from both frontend and backend `.env` files

## Script Reference

| Script | Description |
|--------|-------------|
| `npm run dev` | Run frontend only (Next.js dev server) |
| `npm run dev:backend` | Run backend only (Express API with nodemon) |
| `npm run dev:full` | **Run both frontend and backend** |
| `npm run build` | Build frontend only |
| `npm run build:backend` | Build backend only |
| `npm run build:full` | Build both frontend and backend |
| `npm run start` | Start frontend in production mode |
| `npm run start:backend` | Start backend in production mode |
| `npm run start:full` | Start both in production mode |
| `npm run lint` | Run ESLint on frontend code |

## Troubleshooting

### Port Conflicts
- Frontend default: `3000`
- Backend default: `5001`

If ports are in use, you can modify them:
- Frontend: `PORT=3001 npm run dev`
- Backend: Update `backend/src/config/server.ts`

### Backend Not Starting
1. Check if backend dependencies are installed: `cd backend && npm install`
2. Verify backend `.env` file exists and is configured
3. Check if port 5001 is available

### Vercel Build Failures
1. Ensure all environment variables are set in Vercel dashboard
2. Check build logs for missing dependencies
3. Verify both frontend and backend build successfully locally with `npm run build:full`

## Notes

- The `concurrently` package is used to run multiple npm scripts in parallel
- Color-coded output helps distinguish between frontend (cyan) and backend (magenta) logs
- Both services support hot-reloading during development
- The `postinstall` hook ensures backend dependencies are installed automatically

