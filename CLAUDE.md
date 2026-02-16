# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Local Proxy is a Tauri v2 desktop app that acts as a configurable mock HTTP server. It intercepts requests at a wildcard route, matches them against user-defined "blocks" (response templates), and returns templated responses with variable substitution. The UI lets users manage profiles, subprofiles, and drag-and-drop blocks between a library and an active set.

## Commands

```bash
npm install              # Install frontend dependencies
npm run tauri dev        # Run full app (frontend on :5173, HTTP server on :3000)
npm run build            # TypeScript check + Vite build (frontend only)
```

There are no test or lint commands configured.

## Architecture

**Frontend (React 19 + TypeScript + Vite):**
- `src/App.tsx` — Root component, owns all top-level state, renders view based on `activeView` ("builder" | "debug" | "settings")
- `src/hooks/` — Three custom hooks (`useBlocks`, `useProfiles`, `useSubprofiles`) that encapsulate all state management. No external state library; state is lifted to App and passed via props
- `src/api/` — Thin fetch wrappers (`profiles.ts`, `blocks.ts`, `logs.ts`) that talk to the Rust backend. Base URL configurable via `VITE_LOCAL_PROXY_BASE_URL`, defaults to `http://127.0.0.1:3000`
- `src/components/` — Organized by feature: `blocks/`, `modals/`, `settings/`, `debug/`, `layout/`
- `src/types/` — TypeScript type definitions for `Block` and `Profile`
- No client-side router; view switching is state-driven via sidebar

**Backend (Rust + Axum, single file):**
- `src-tauri/src/main.rs` (~1475 lines) — Contains the entire backend: Axum HTTP server, all API endpoints, request matching logic, template substitution, and JSON file persistence
- `AppState` uses `Arc<Mutex>` for thread-safe shared state
- Data persisted to `profiles.json` in the OS app data directory
- Request log stored in-memory (`VecDeque`, max 500 entries)
- Wildcard route (`/*`) matches incoming requests against active blocks using regex pattern matching

**Data Model Hierarchy:**
- **Profile** → top-level container with `baseUrl`, `params[]`, `library_blocks[]`, `active_blocks[]`
- **SubProfile** → lives within a profile, provides param values (key-value pairs) for variable substitution
- **Block** → reusable response template with method, path, responseTemplate, responseHeaders, templateValues, and templateVariants
- **TemplateVariant** → alternative response values for a block; selected via `activeVariantId`

Profile `params` define which parameters subprofiles must provide. URL path params (e.g., `{account_id}`) are resolved from request params first, falling back to subprofile params.

## Styling

Vanilla CSS with CSS variables for theming (`src/index.css`). Dark/light theme via `data-theme` attribute on `<body>`, persisted in localStorage. No CSS-in-JS or preprocessors.
