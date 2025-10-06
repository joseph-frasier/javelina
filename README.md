I'll help you create a Next.js project template with Tailwind CSS, Zustand, and React Query. Let me first check what rules you have in your `.cursor` folder, then set up the project.

[3 tools called]

The directory already has files, so I'll set up the Next.js project manually with all the necessary dependencies and configuration. Let me create the complete structure:

[6 tools called]

I'll create the configuration files manually. Let me set up all the necessary files:

[5 tools called]

Now let me create the Next.js app structure with all providers and example files:

[10 tools called]

Now let me create the example components:

[4 tools called]

Now let me add the final configuration files and documentation:

[7 tools called]

Let me install ESLint and check for any errors:

[4 tools called]

Perfect! I've successfully created a complete Next.js template from scratch. Here's what has been set up:

## 📦 **Project Created Successfully!**

### ✅ **Core Technologies Installed:**
- **Next.js 15** with App Router and TypeScript
- **Tailwind CSS** for styling
- **Zustand** for state management  
- **React Query (TanStack Query)** for data fetching
- **ESLint** for code quality

### 📁 **Project Structure Created:**

```
javelina/
├── app/                      # Next.js App Router
│   ├── layout.tsx           # Root layout with metadata
│   ├── page.tsx             # Home page with examples
│   ├── providers.tsx        # React Query provider setup
│   └── globals.css          # Tailwind styles with dark mode
│
├── components/              # React components
│   ├── Counter.tsx          # Zustand example (state management)
│   ├── UserList.tsx         # React Query example (data fetching)
│   └── Button.tsx           # Reusable button component
│
├── stores/                  # Zustand stores
│   ├── useCounterStore.ts   # Counter state example
│   └── useUserStore.ts      # User selection state
│
├── hooks/                   # React Query hooks
│   ├── useUsers.ts          # Fetch users example
│   └── usePosts.ts          # Fetch posts example
│
├── .cursor/                 # Cursor IDE config
│   └── nextjs_rules.mdc     # Development guidelines
│
└── Config Files
    ├── next.config.ts       # Next.js configuration
    ├── tailwind.config.ts   # Tailwind configuration
    ├── tsconfig.json        # TypeScript configuration
    ├── .eslintrc.json       # ESLint configuration
    ├── .gitignore           # Git ignore rules
    └── README.md            # Complete documentation
```

### 🚀 **Ready to Use:**

To start the development server:

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) to see:
- A **Counter component** demonstrating Zustand state management
- A **UserList component** demonstrating React Query data fetching
- Beautiful Tailwind CSS styling with dark mode support

### 📚 **Examples Included:**

1. **Zustand State Management** - Counter with increment/decrement/reset
2. **React Query Data Fetching** - Users list from JSONPlaceholder API
3. **Tailwind Styling** - Modern, responsive design with dark mode
4. **TypeScript** - Fully typed components, hooks, and stores

All code is production-ready with no linter errors! 🎉
