## Testing (optional)

If using Jest:

```bash
npm run test
```

If using Playwright:

```bash
npx playwright install --with-deps
npm run test:e2e
```

## Deployment

### Vercel (recommended)

- Push to a Git repository (GitHub/GitLab/Bitbucket)
- Import the repo on Vercel and set environment variables
- Vercel will build and deploy automatically

### Docker (optional)

```dockerfile
# Dockerfile (example)
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## Contributing

1. Create a feature branch: `git checkout -b feat/your-feature`
2. Commit: `git commit -m "feat: add your feature"`
3. Push: `git push origin feat/your-feature`
4. Open a Pull Request

## License

MIT (or update to your chosen license)
