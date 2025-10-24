# Git Commands to Create PR

Run these commands in Git Bash or your terminal:

## 1. Create and switch to new branch

```bash
git checkout -b feature/backend-express-api
```

## 2. Stage all backend files

```bash
git add backend/
git add BACKEND_IMPLEMENTATION_SUMMARY.md
git add PR_BACKEND_EXPRESS_API.md
git add backend-express-setup.plan.md
git add GIT_COMMANDS.md
```

## 3. Commit the changes

```bash
git commit -m "feat: Implement Express TypeScript backend API

- Add complete Node.js + Express + TypeScript backend
- Implement JWT authentication with Supabase
- Create 50+ RESTful API endpoints for all resources
- Add role-based access control (SuperAdmin, Admin, Editor, Viewer)
- Include comprehensive documentation and setup guides
- Backend runs on port 3001 (configurable via .env)
- Frontend remains unchanged (not yet integrated)

Tech stack:
- Express.js with TypeScript
- Supabase client for JWT validation and database access
- Helmet for security headers
- Morgan for request logging
- CORS configured for frontend origin

Endpoints implemented:
- Organizations (6 endpoints)
- Environments (6 endpoints)
- Zones (7 endpoints)
- DNS Records (5 endpoints)
- Profiles (3 endpoints)
- Audit Logs (3 endpoints)
- Admin operations (6 endpoints)
- Health checks (4 endpoints)

See PR_BACKEND_EXPRESS_API.md for full details."
```

## 4. Push to remote

```bash
git push -u origin feature/backend-express-api
```

## 5. Create PR on GitHub

After pushing, go to your GitHub repository and:

1. Click "Compare & pull request" button
2. Set base branch to `main`
3. Title: `feat: Implement Express TypeScript backend API`
4. Copy content from `PR_BACKEND_EXPRESS_API.md` into the PR description
5. Add labels: `feature`, `backend`, `enhancement`
6. Request reviews from team members
7. Click "Create pull request"

## Quick One-Liner (if you prefer)

```bash
git checkout -b feature/backend-express-api && \
git add backend/ BACKEND_IMPLEMENTATION_SUMMARY.md PR_BACKEND_EXPRESS_API.md backend-express-setup.plan.md GIT_COMMANDS.md && \
git commit -m "feat: Implement Express TypeScript backend API" && \
git push -u origin feature/backend-express-api
```

Then create the PR on GitHub using the content from `PR_BACKEND_EXPRESS_API.md`.
