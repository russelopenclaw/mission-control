# 🎯 Mission Control

Next.js dashboard app to replace Alfred Hub - a modular, extensible mission control center for managing agents, tasks, and integrations.

## Features

- **🔐 Authentication** - Session-based login to protect your dashboard
- **Agent Status Display** - Real-time monitoring of active agents and their current tasks
- **Task Management** - Track, create, and manage tasks with priorities and assignments
- **Calendar Integration** - View today's schedule and upcoming events (placeholder for Google Calendar API)
- **Custom Tool Placeholders** - Ready-to-extend slots for GitHub monitoring, email quick view, system monitoring, and more

## Tech Stack

- **Framework:** Next.js 16.1.6 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4
- **UI:** Linear-inspired dark theme (minimal, clean, subtle borders)
- **Auth:** JWT-based sessions with `jose` library

## Getting Started

### Installation

```bash
# Install dependencies
npm install
```

### Configuration

1. **Copy the example environment file:**
   ```bash
   cp .env.local.example .env.local
   ```

2. **Edit `.env.local` with your credentials:**
   ```bash
   # Admin username for login
   ADMIN_USERNAME=admin
   
   # Admin password for login
   ADMIN_PASSWORD=changeme123
   
   # Secret key for session cookie signing (generate with: openssl rand -hex 32)
   SESSION_SECRET=your-super-secret-key-change-this-in-production
   ```

3. **Generate a secure session secret:**
   ```bash
   openssl rand -hex 32
   ```
   Replace the `SESSION_SECRET` value with the output.

### Development

```bash
# Run dev server on port 8765
npm run dev
```

The app will be available at: **http://localhost:8765**

You'll be redirected to the login page on first access. Use the credentials from `.env.local`.

### Production

```bash
# Build
npm run build

# Start production server on port 8765
npm run start
```

## Authentication

### How It Works

- Session-based authentication using JWT tokens
- Cookies are httpOnly and secure (in production)
- Sessions expire after 24 hours
- Middleware protects all routes except `/login` and static assets

### Login Credentials

- **Default username:** `admin`
- **Default password:** `changeme123`
- **Location:** Edit these in `.env.local`

### Changing Your Password

1. Open `.env.local` in your workspace root
2. Update the `ADMIN_PASSWORD` value
3. Restart the development server (changes to env vars require restart)

```bash
# Example secure password generation
openssl rand -base64 16
```

### Logout

Click the **Logout** button in the bottom-right corner of the dashboard to end your session.

## Security Notes

⚠️ **Important Security Considerations:**

1. **Basic Authentication Only** - This is a simple session-based auth system suitable for internal tools. For production use:
   - Place behind a reverse proxy (Nginx, Caddy)
   - Use HTTPS/TLS encryption
   - Consider adding rate limiting
   - Implement password hashing (currently plaintext comparison)

2. **Environment Variables** - Never commit `.env.local` to version control. The `.env.local.example` file is provided as a template.

3. **Session Secret** - Always generate a unique, random `SESSION_SECRET` for production. The example value is for development only.

4. **Access Control** - For multi-user setups, consider implementing:
   - Password hashing with bcrypt
   - Database-backed user storage
   - Role-based access control (RBAC)
   - OAuth/SAML integration

5. **Network Security** - Recommended setup:
   ```
   Internet → [Reverse Proxy with HTTPS] → [Firewall Rules] → Mission Control (localhost only)
   ```

## Project Structure

```
mission-control/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── login/     # Login endpoint
│   │   │   │   ├── logout/    # Logout endpoint
│   │   │   │   └── me/        # Current user info
│   │   │   ├── status/        # Agent status endpoints
│   │   │   ├── tasks/         # Task management endpoints
│   │   │   └── calendar/      # Calendar integration endpoints
│   │   ├── login/             # Login page
│   │   ├── page.tsx           # Main dashboard page
│   │   ├── layout.tsx         # Root layout
│   │   └── globals.css        # Global styles (Linear theme)
│   ├── components/
│   │   ├── dashboard/
│   │   │   └── DashboardLayout.tsx
│   │   └── widgets/
│   │       ├── AgentStatus.tsx
│   │       ├── TaskManager.tsx
│   │       ├── CalendarWidget.tsx
│   │       └── CustomToolPlaceholder.tsx
│   ├── lib/
│   │   └── auth.ts            # Authentication utilities
│   └── middleware.ts          # Route protection middleware
├── .env.local                 # Environment variables (DO NOT COMMIT)
├── .env.local.example         # Template for .env.local
├── package.json
└── README.md
```

## API Endpoints

### Authentication

#### POST `/api/auth/login`
Authenticate user and create session.

**Request:**
```json
{
  "username": "admin",
  "password": "changeme123"
}
```

**Response:**
```json
{
  "success": true
}
```

#### POST `/api/auth/logout`
Destroy session and logout.

**Response:**
```json
{
  "success": true
}
```

#### GET `/api/auth/me`
Get current authenticated user info.

**Response:**
```json
{
  "authenticated": true,
  "username": "admin"
}
```

### Dashboard APIs

#### GET `/api/status`
Returns current agent status and system health.

#### GET `/api/tasks`
Returns all tasks.

#### POST `/api/tasks`
Creates a new task.

#### PUT `/api/tasks`
Updates an existing task.

#### DELETE `/api/tasks?id=<taskId>`
Deletes a task.

#### GET `/api/calendar?date=<YYYY-MM-DD>`
Returns calendar events for specified date.

## Extending Mission Control

### Adding New Widgets

1. Create a new component in `src/components/widgets/`
2. Import and add it to `src/app/page.tsx`
3. Style with Tailwind CSS classes following the Linear theme

### Adding New API Endpoints

1. Create a new folder in `src/app/api/` with `route.ts`
2. Export GET/POST/PUT/DELETE handlers
3. Call from your components using fetch()

### Integration Ideas

- **GitHub Monitor:** Connect to GitHub API to track issues, PRs, and CI/CD status
- **Email Quick View:** Integrate with Gmail API for email scanning
- **System Monitor:** Use node system-info APIs for CPU/memory/disk monitoring
- **Calendar:** Connect to Google Calendar API for real events
- **Weather:** Add weather widget using wttr.in or Open-Meteo
- **Camera Feeds:** Embed surveillance camera streams

## Customization

### Changing the Port

By default, the app runs on port 8765. To change:

1. Update `package.json` scripts:
   ```json
   "dev": "next dev -p <NEW_PORT>"
   ```

2. Or pass at runtime:
   ```bash
   npm run dev -- -p <NEW_PORT>
   ```

### Theme Colors

The Linear-inspired theme uses these CSS variables in `globals.css`:

- `--background`: Main background (#0d0d0f)
- `--card`: Card backgrounds (#151518)
- `--border`: Subtle borders (#27272a)
- `--accent`: Accent color (#5e6ad2)
- `--foreground`: Text color (#e8e8e8)

Edit these to customize the color scheme while maintaining the clean, minimal aesthetic.

## Current Status

✅ Running on http://localhost:8765
✅ Session-based authentication
✅ Protected dashboard routes
✅ Linear-style clean UI (dark mode)
✅ Agent status widget
✅ Task management widget
✅ Calendar widget (placeholder data)
✅ Custom tool placeholders
✅ API endpoints structure

## Next Steps

1. **Real-time Updates:** Add WebSocket or polling for live agent status
2. **Database:** Integrate PostgreSQL/SQLite for persistent task storage
3. **Calendar API:** Connect to Google Calendar
4. **GitHub Integration:** Add GitHub API for repo monitoring
5. **Enhanced Auth:** Add password hashing, multi-user support, OAuth
6. **Custom Tools:** Build out the placeholder tools

---

**Built with ❤️ by Alfred**
