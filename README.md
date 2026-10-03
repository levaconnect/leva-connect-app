# LevaConnect — Private Community App

A modern private social networking app for the Leva Patil community. Built with React Native (Expo), Fastify, Drizzle ORM, and Neon PostgreSQL.

## Tech Stack

### Mobile
- React Native 0.73 + Expo 50
- TypeScript
- Expo Router (file-based routing)
- NativeWind (Tailwind CSS)
- React Native Reanimated
- Zustand (state management)
- React Hook Form + Zod (validation)
- Expo SecureStore (secure token storage)

### Backend
- Node.js 20+ + Fastify
- TypeScript
- Drizzle ORM
- Neon PostgreSQL
- Argon2 (password hashing)
- JWT (access + refresh tokens)
- Zod (validation)

## Project Structure

```
levaconnect/
├── apps/
│   ├── mobile/          # Expo React Native app
│   │   ├── app/         # Expo Router screens
│   │   ├── components/  # Reusable UI components
│   │   ├── features/    # Feature-specific components
│   │   ├── hooks/       # Custom React hooks
│   │   ├── services/    # API client
│   │   ├── store/       # Zustand stores
│   │   └── theme/       # NativeWind theme
│   └── api/             # Fastify backend
│       ├── src/
│       │   ├── modules/ # Feature modules (auth, profile, posts, etc.)
│       │   ├── middleware/
│       │   ├── db/      # Drizzle schema, migrations, seed
│       │   ├── plugins/ # Fastify plugins (auth, cors, rate-limit)
│       │   └── server.ts
│       └── drizzle/     # Migration files
├── packages/
│   └── shared/          # Shared types & Zod schemas
├── .env.example
├── package.json
└── README.md
```

## Getting Started

### Prerequisites
- Node.js 20+
- npm 10+
- Neon PostgreSQL account (free tier works)
- Expo CLI: `npm install -g expo-cli`
- iOS Simulator (Mac) or Android Emulator

### 1. Clone and Install

```bash
cd levaconnect
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your values:

**Required:**
- `DATABASE_URL` - Your Neon PostgreSQL connection string
- `JWT_ACCESS_SECRET` - Generate with `openssl rand -base64 32`
- `JWT_REFRESH_SECRET` - Generate with `openssl rand -base64 32`
- `ADMIN_EMAIL` - Admin email for development
- `ADMIN_PASSWORD` - Admin password (min 8 chars)

**Mobile API URL:**
- iOS Simulator: `EXPO_PUBLIC_API_URL=http://localhost:4000`
- Android Emulator: `EXPO_PUBLIC_API_URL=http://10.0.2.2:4000`
- Physical device: `EXPO_PUBLIC_API_URL=http://YOUR_IP:4000` (find with `ifconfig`)

### 3. Setup Database

```bash
# Generate migrations
npm run db:generate

# Run migrations
npm run db:migrate

# Seed development data
npm run db:seed
```

### 4. Start Development

**Terminal 1 - Backend:**
```bash
npm run dev:api
```
Server runs at http://localhost:4000

**Terminal 2 - Mobile:**
```bash
npm run dev:mobile
```
Opens Expo DevTools. Press `i` for iOS, `a` for Android, or scan QR with Expo Go.

## Development Credentials

After seeding, these accounts are available:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@levaconnect.dev | Admin@123456 |
| Member | priya.patil@levaconnect.dev | Dev@123456 |
| Member | rahul.patil@levaconnect.dev | Dev@123456 |
| Member | anita.patil@levaconnect.dev | Dev@123456 |
| Pending | amit.patil@levaconnect.dev | Dev@123456 |

⚠️ **Change these before production deployment!**

## API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Logout
- `GET /auth/me` - Get current user

### Profile
- `GET /profiles/me` - Get own profile
- `PATCH /profiles/me` - Update profile
- `POST /profiles/me/onboarding` - Complete onboarding
- `GET /profiles/:id` - Get public profile

### Membership
- `GET /membership/status` - Get membership status
- `POST /membership/apply` - Submit/re-submit application
- `GET /admin/applications` - List applications (admin)
- `POST /admin/applications/:id/approve` - Approve (admin)
- `POST /admin/applications/:id/reject` - Reject (admin)

### Posts (Feed)
- `GET /posts` - Get feed (paginated)
- `POST /posts` - Create post
- `PATCH /posts/:id` - Update own post
- `DELETE /posts/:id` - Delete own post
- `POST /posts/:id/like` - Like post
- `DELETE /posts/:id/like` - Unlike post
- `GET /posts/:id/comments` - Get comments
- `POST /posts/:id/comments` - Add comment

### Discovery & Connections
- `GET /discover` - Discover members (search, filter)
- `GET /connections` - Get connections
- `POST /connections/requests` - Send connection request
- `GET /connections/requests` - Get pending requests
- `POST /connections/requests/:id/accept` - Accept request
- `POST /connections/requests/:id/reject` - Reject request
- `DELETE /connections/requests/:id` - Cancel request
- `DELETE /connections/:id` - Remove connection

### Messaging
- `GET /conversations` - Get conversations
- `POST /conversations` - Create conversation
- `GET /conversations/:id/messages` - Get messages
- `POST /conversations/:id/messages` - Send message

### Settings
- `PATCH /settings/privacy` - Update profile visibility
- `POST /settings/password` - Change password
- `DELETE /account` - Delete account

## Membership Flow

1. **Register** → User creates account with email/password
2. **Onboarding** → Complete profile (name, location, bio, interests, privacy)
3. **Apply** → Submit membership application (status: `pending`)
4. **Review** → Admin reviews application in `/admin/applications`
5. **Approve/Reject** → Admin approves (→ `approved`) or rejects (→ `rejected`)
6. **Access** → Approved members access feed, discover, connections, chat

## Privacy Levels

| Level | Who Can See Profile |
|-------|---------------------|
| `community` | All approved members |
| `connections` | Only your connections |
| `private` | Only you |

## Scripts

```bash
# Development
npm run dev:mobile     # Start Expo dev server
npm run dev:api        # Start Fastify dev server

# Database
npm run db:generate    # Generate Drizzle migrations
npm run db:migrate     # Run migrations
npm run db:seed        # Seed development data
npm run db:studio      # Open Drizzle Studio

# Testing
npm run test:api       # Run backend tests
npm run test:mobile    # Run mobile tests

# Code Quality
npm run lint           # Lint all workspaces
npm run typecheck      # TypeScript check all workspaces
```

## Testing API Locally

```bash
# Health check
curl http://localhost:4000/health

# Register
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test@123456","fullName":"Test User"}'

# Login
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test@123456"}'
```

## Production Deployment

### Backend
1. Set `NODE_ENV=production`
2. Use strong JWT secrets (64+ chars)
3. Configure proper CORS origins
4. Use process manager (PM2, systemd)
5. Set up reverse proxy (Nginx) with SSL
6. Configure Neon connection pooling

### Mobile
1. Update `EXPO_PUBLIC_API_URL` to production API
2. Build with EAS: `eas build --platform all`
3. Submit to App Store / Play Store

## Security Considerations

- Passwords hashed with Argon2id
- Short-lived JWT access tokens (15 min)
- Refresh token rotation
- Tokens stored in SecureStore (mobile)
- Rate limiting on auth endpoints
- Input validation with Zod
- Authorization checks on all protected routes
- Admin-only routes protected server-side
- Membership status enforced on restricted endpoints

## License

MIT License - see LICENSE file for details.