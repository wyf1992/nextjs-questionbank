# AI Agent Instructions for Next.js Question Bank

## Architecture Overview

This is a Next.js 16 application using the App Router for a question bank system. Key components:

- **Database**: SQLite with better-sqlite3 (file: `questionbank.db`)
- **Auth**: Client-side localStorage, server-side cookies/headers with bcrypt password hashing
- **Word Parsing**: mammoth library for .docx question import
- **Time Handling**: dayjs with UTC storage, local timezone display
- **UI**: Tailwind CSS with custom components

## Core Data Models

- **Users**: id (hashids encoded), username, password (hashed), role (admin/user), sequential_practice_last_id, created_at
- **Questions**: id, type (single/multiple/judge), content, options (JSON), correct_answer, explanation, created_at
- **Wrong Questions**: user_id, question_id, user_answer, wrong_count, last_wrong_at

## Authentication Pattern

```typescript
// Client-side: localStorage.getItem("user") -> JSON.parse()
// Server-side: HttpOnly cookies with getCurrentUser(request)
// Login: POST /api/auth/login sets HttpOnly cookie (7 days)
// Logout: POST /api/auth/logout clears HttpOnly cookie
// Session: Both cookie and localStorage expire after 7 days
// Roles: "admin" for full access, "user" for standard features
```

## API Response Format

```typescript
// Success: { success: true, data... }
// Error: { error: "message" } with appropriate status code
// All responses in Chinese for user-facing messages
```

## Time Handling

```typescript
import { formatLocalTime } from "@/lib/time";
// Database stores UTC, display converts to local timezone
// Format: "YYYY-MM-DD HH:mm:ss"
```

## Word Document Parsing

- Uses mammoth to convert .docx to HTML, then plain text
- Supports question types: 单选题/多选题/判断题
- Answer formats: (A)、答案：A、【答案】A
- Options: A/B/C/D or A-E for 5 options
- Judge answers: √ → "对", × → "错"

## Development Workflow

```bash
npm run dev          # Start development server
npm test            # Run Jest tests (configured for TypeScript)
npm run test:watch  # Watch mode for tests
npm run lint        # ESLint checking
```

## Testing Setup

- Jest with ts-jest preset
- Test environment: node
- Path mapping: "@/_": "<rootDir>/_"
- Coverage from lib/ directory
- Debug with: `npx tsx test_parse.ts` or VS Code launch configs

## Key Files to Reference

- `lib/db.ts`: Database initialization and queries
- `lib/auth.ts`: Server-side user authentication
- `lib/useAuth.ts`: Client-side authentication hook
- `lib/id.ts`: ID encoding/decoding utilities (hashids)
- `lib/wordParser.ts`: Document parsing logic
- `lib/time.ts`: Timezone conversion utilities
- `app/api/*/route.ts`: API endpoints
- `app/admin/users/page.tsx`: Admin user management (example of auth checks)
- `app/not-found.tsx`: 404 error page

## Common Patterns

- Client components use "use client" directive
- Database queries use prepared statements with better-sqlite3
- Error handling: try/catch with Chinese error messages
- User role checks: `if (user.role !== "admin")` redirect/error
- Sequential practice: tracks last question ID per user
- Authentication: Use `useAuth()` hook for client-side auth checks
- ID encoding: Use `encodeId()`/`decodeId()` for secure ID exposure</content>
  <parameter name="filePath">f:\wyf\nextjs-questionbank\.github\copilot-instructions.md
