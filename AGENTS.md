# AGENTS.md

## Commands
- **Build**: `pnpm build` - Production build
- **Dev**: `pnpm dev` - Development server
- **Lint**: `pnpm lint` - ESLint with Nuxt config
- **Typecheck**: `pnpm typecheck` - TypeScript validation
- **Test**: No test framework configured

## Code Style
- **Framework**: Nuxt 4 with Vue 3, TypeScript, Pinia stores
- **UI**: Nuxt UI with Tailwind CSS
- **Imports**: Use `~/` alias for app directory, auto-imports for Vue/Nuxt
- **Components**: PascalCase, use `.client.vue`/`.server.vue` suffixes when needed
- **Types**: Centralized in `app/types/index.d.ts`, use interfaces for data models
- **Stores**: Pinia composition API, use `useStorage` for persistence
- **Validation**: Use Zod schemas, validate monthId format (YYYY-MM)
- **Error handling**: Throw descriptive errors for invalid data
- **Formatting**: ESLint with 1tbs brace style, no comma dangle, max 3 attrs per line
- **Naming**: camelCase for variables/functions, PascalCase for components/types