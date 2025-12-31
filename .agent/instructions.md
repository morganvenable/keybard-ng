# KeyBard-NG Project Instructions

You are working on **KeyBard-NG**, a modern keyboard configuration UI for Svalboard and Vial-compatible keyboards.

## Tech Stack
- **Framework**: React 19 (Functional components, Hooks)
- **Language**: TypeScript (Strict mode)
- **Build Tool**: Vite
- **Styling**: Tailwind CSS (v4)
- **State Management**: React Context (`VialContext`)
- **Communication**: WebHID API for USB interaction
- **Testing**: Vitest + React Testing Library

## Architecture Rules
1. **Service Separation**: Keep hardware/protocol logic in `src/services/`. These should be pure TypeScript classes or modules.
2. **Context Layer**: Use `src/contexts/VialContext.tsx` to bridge services and UI.
3. **UI Components**: Use Radix UI primitives for accessible components (Dialog, Select, Slider, etc.).
4. **Type Safety**: All keyboard data must follow the types defined in `src/types/vial.types.ts`.
5. **No Placeholders**: When building UI, use real functional components and styles.

## Development Patterns
- Use `lucide-react` for icons.
- Follow the AAA (Arrange-Act-Assert) pattern for tests.
- Maintain >90% code coverage for service logic.
