# Coding Rules and Conventions

These are the established coding standards for the Satisfactory Tool project.

## General
- **Language:** TypeScript. Ensure strict typing is used wherever possible. Minimize the use of `any`.
- **Formatting:** Use Prettier for consistent code formatting.

## Architecture & Structure
- **Engine vs. UI:** 
  - **NEVER** put complex calculation, data parsing, or graphing logic directly in React components.
  - All heavy lifting must go in `src/engine/`. React components should only call engine functions and handle the resulting state.
- **Components:**
  - Keep components modular, focused, and ideally under 200 lines.
  - Extract reusable UI pieces into their own files inside `src/components/`.

## State Management
- Prefer local component state (`useState`, `useReducer`) for UI-specific state.
- If global state is necessary, use React Context or a lightweight state manager, keeping the store definitions clean.

## Performance
- **Data Heavy Tasks:** Save file parsing and graph layout calculation can block the main thread. Ensure these tasks are optimized, and provide user feedback (e.g., loading bars) when they are running.
- **Rendering:** Avoid unnecessary re-renders in large lists or complex graph views using `React.memo` or `useMemo`.

## Commits
- Make granular, logical commits.
- Group related changes into separate commits with descriptive messages.
