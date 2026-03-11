# YSMMS - Gratitude Sharing Platform

## Overview

YSMMS ("Your Small Moments Mean Something") is a social gratitude journaling application where users can share daily moments of gratitude with friends. The platform enables users to create posts, manage friendships via username-based discovery, and view gratitude cards from their network.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

- Added username system: Users set a unique @username during onboarding and can edit it in settings
- Friend discovery now uses @username search instead of suggested friends
- Friend request workflow: send request, accept/decline incoming, cancel outgoing
- Removed sharing functionality (share studio, share buttons)
- Removed like functionality from gratitude cards
- Feed defaults to "friends" view instead of "everyone"

## System Architecture

### Frontend Architecture

**Framework & Build System**
- React 18 with TypeScript for type-safe component development
- Vite as the build tool and development server, providing fast HMR and optimized production builds
- Wouter for client-side routing (lightweight alternative to React Router)
- TailwindCSS for utility-first styling with custom theme configuration

**Component Library**
- Radix UI primitives for accessible, unstyled component foundations
- shadcn/ui component system (New York style variant)
- Custom components built on top of Radix primitives for consistent UX

**State Management**
- TanStack Query (React Query) for server state management, caching, and data synchronization
- React Context API for authentication state via `AuthProvider`
- Local component state for UI interactions

**Design System**
- Custom color palette: Vibrant blue background (#0066FF), hot orange accents (#FF6B35), cream secondary (#FFF8E7)
- Two font families: Inter (sans-serif) for body text, Fredoka (display) for headings
- Consistent spacing and border radius system via CSS custom properties

### Backend Architecture

**Server Framework**
- Express.js as the HTTP server framework
- Session-based authentication using `express-session` with MemoryStore
- Magic link authentication via Resend email service

**API Design**
- RESTful API endpoints organized in `/api` namespace
- Routes include authentication (`/api/auth/*`), posts (`/api/posts`), friends, and invites
- Session middleware protects authenticated routes
- Error responses follow consistent JSON format

**Development vs Production**
- Development: Vite middleware integration for HMR (`index-dev.ts`)
- Production: Static file serving from pre-built dist directory (`index-prod.ts`)
- Environment-based configuration via `NODE_ENV`

### Data Storage

**Database**
- PostgreSQL as the primary database (accessed via Neon serverless)
- Drizzle ORM for type-safe database queries and schema management
- WebSocket-based connection pooling for serverless compatibility

**Schema Design**
- `users`: User profiles with email (primary identifier), display name, username (unique), avatar
- `posts`: User-generated gratitude content with timestamps
- `friendships`: User relationships with status tracking (pending/accepted)
- `magic_tokens`: Secure authentication tokens with 7-day expiry, 3-use limit
- `invites`: Email-based invite system tracking inviter, invitee email, and acceptance status
- UUID primary keys generated via PostgreSQL's `gen_random_uuid()`
- Cascade deletions to maintain referential integrity

**Data Access Layer**
- Storage interface (`IStorage`) abstracts database operations
- `DatabaseStorage` class implements the interface using Drizzle ORM
- Methods return enriched data (e.g., posts include user info, like counts, and per-user like status)

### Authentication & Authorization

**Magic Link Authentication**
- Passwordless authentication via email magic links
- Tokens generated with crypto.randomBytes (32 bytes hex)
- 15-minute token expiry for security
- One-time use: tokens marked as used after verification
- Sessions last 10 years (persistent until logout)
- HttpOnly cookies (secure in production)

**Invite-Only Access**
- Users can only sign up if they've been invited by email
- Inviter enters friend's email address on Friends page
- Invitee receives magic link email with "I'm grateful for you" message
- Upon first sign-in, invitee completes onboarding (set display name)
- Mutual friendship automatically created between inviter and invitee

**Auth Flow**
1. User enters email on auth page
2. System checks if email has existing account OR has been invited
3. Magic link sent via Resend email service
4. User clicks link, token verified, session created
5. New users complete display name onboarding
6. Protected routes redirect unauthenticated users to `/auth`

### External Dependencies

**Third-Party Services**
- Neon Database: Serverless PostgreSQL hosting
- Resend: Transactional email service for magic links
- Google Fonts: Inter and Fredoka font families

**NPM Packages**
- **Email**: Resend for sending magic link emails
- **UI/UX**: Radix UI components, Lucide icons, date-fns for formatting, html2canvas for share image generation
- **Forms**: React Hook Form with Zod resolvers for validation
- **Styling**: TailwindCSS, class-variance-authority for variant management
- **Development**: Replit plugins for dev banner, cartographer, and runtime error overlay
- **ORM**: Drizzle with Zod schema validation

**Environment Variables**
- `RESEND_API_KEY`: API key for Resend email service
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Secret for session encryption (optional, has default)

### Special Features

**Username-Based Friend Discovery**
- Users set a unique @username during onboarding
- Friends page allows searching for users by username
- Friend request workflow: send, accept, decline, and cancel requests
- Email invites still available for users not yet on the platform

**Access Code System**
- Universal access code "ILOVEMYSELF" allows new users to self-invite
- System creates self-invite record in database for first-time sign-ups

**Responsive Design**
- Mobile-first approach with bottom navigation bar
- Safe area insets for iOS devices (`pb-safe`)
- Container queries for adaptive layouts
