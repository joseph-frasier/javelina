# Javelina - Next.js Dashboard Template

A modern, production-ready Next.js dashboard template with TypeScript, Tailwind CSS (Javelina brand colors), Zustand, and React Query.

## Features

- ⚡ **Next.js 15** with App Router
- 🎨 **Tailwind CSS** with Javelina brand design system
- 📦 **Zustand** for state management
- 🔄 **React Query** (TanStack Query) for data fetching
- 🔷 **TypeScript** for type safety
- 🎯 **ESLint** for code quality
- 🎭 **CVA** (Class Variance Authority) for component variants

## Design System

### Brand Colors

- **Vibrant Orange** (`#EF7215`) - Primary brand color, CTAs
- **Charcoal Black** (`#0B0C0D`) - Text, dark backgrounds
- **Silver Gray** (`#D9D9D9`) - Secondary backgrounds
- **Light Gray** (`#F2F2F2`) - Base backgrounds
- **Slate Gray** (`#456173`) - UI elements, neutral text
- **Electric Blue** (`#00B0FF`) - Interactive elements
- **Teal Blue** (`#00796B`) - Accents, hover states

### Typography

- **Roboto Black (900)** - Main titles and headings
- **Roboto Bold (700)** - Subtitles
- **Roboto Regular (400)** - Supporting text
- **Roboto Light (300)** - Body text and paragraphs
- **Roboto Condensed** - Logo and branded text

## Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **State Management**: [Zustand](https://zustand-demo.pmnd.rs/)
- **Data Fetching**: [TanStack Query (React Query)](https://tanstack.com/query)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Component Variants**: [CVA](https://cva.style/docs)

## Getting Started

### Prerequisites

- Node.js 18.18.0 or higher (20.x LTS recommended)
- npm, yarn, or pnpm

### Installation

1. Clone the repository:

```bash
git clone <your-repo-url>
cd javelina
```

2. Install dependencies:

```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
javelina/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout with providers
│   ├── page.tsx           # Dashboard page
│   ├── providers.tsx      # React Query provider
│   └── globals.css        # Global styles with brand fonts
├── components/
│   ├── ui/                # Reusable UI components
│   │   ├── Button.tsx     # Brand-compliant button with variants
│   │   └── Card.tsx       # Card components for dashboard
│   └── layout/            # Layout components
│       └── Header.tsx     # Application header with navigation
├── stores/                # Zustand stores (add as needed)
├── hooks/                 # Custom React Query hooks (add as needed)
└── .cursor/               # Cursor IDE configuration
    ├── nextjs_rules.mdc   # Next.js development rules
    └── tailwind_rules.mdc # Tailwind & brand guidelines
```

## Component Examples

### Button Component

Built with CVA for consistent variants:

```tsx
import Button from '@/components/ui/Button';

<Button variant="primary" size="md">
  Click me
</Button>;

// Variants: primary, secondary, ghost, outline
// Sizes: sm, md, lg
```

### Card Components

```tsx
import { Card, StatCard } from '@/components/ui/Card';

<Card title="Title" description="Description">
  Content here
</Card>

<StatCard
  title="Total Users"
  value="2,345"
  change="+12%"
  changeType="positive"
  icon={<YourIcon />}
/>
```

## State Management with Zustand

Create stores in the `stores/` directory:

```typescript
import { create } from 'zustand';

interface YourState {
  count: number;
  increment: () => void;
}

export const useYourStore = create<YourState>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
}));
```

## Data Fetching with React Query

Create hooks in the `hooks/` directory:

```typescript
import { useQuery } from '@tanstack/react-query';

export function useYourData() {
  return useQuery({
    queryKey: ['your-data'],
    queryFn: async () => {
      const res = await fetch('https://api.example.com/data');
      return res.json();
    },
  });
}
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Design System Guidelines

### Tailwind Configuration

The project uses a custom Tailwind config with Javelina brand tokens. All colors, typography, and spacing follow the brand guidelines defined in `.cursor/tailwind_rules.mdc`.

### Component Variants

Use CVA for creating component variants:

```tsx
import { cva } from 'class-variance-authority';

const variants = cva('base-classes', {
  variants: {
    variant: {
      primary: 'bg-orange text-white',
      secondary: 'bg-blue-electric text-white',
    },
  },
});
```

## Environment Variables

Create a `.env.local` file in the root directory:

```bash
NEXT_PUBLIC_API_URL=https://api.example.com
```

## Deployment

### Vercel (recommended)

1. Push to a Git repository (GitHub/GitLab/Bitbucket)
2. Import the repo on [Vercel](https://vercel.com)
3. Configure environment variables
4. Deploy!

### Other Platforms

This template works with any platform that supports Next.js:

- Netlify
- AWS Amplify
- Railway
- Render
- etc.

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Zustand Documentation](https://zustand-demo.pmnd.rs/)
- [TanStack Query Documentation](https://tanstack.com/query/latest)
- [CVA Documentation](https://cva.style/docs)

## Contributing

1. Create a feature branch: `git checkout -b feat/your-feature`
2. Commit: `git commit -m "feat: add your feature"`
3. Push: `git push origin feat/your-feature`
4. Open a Pull Request

## Brand Guidelines

This project follows the Javelina brand identity:

- **Authoritative yet approachable** tone
- **Orange (#EF7215)** for primary actions and highlights
- **Roboto** font family for all typography
- **Clean, modern UI** with consistent spacing and shadows

For detailed brand guidelines, see `.cursor/tailwind_rules.mdc`

## License

MIT
