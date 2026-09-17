# DevPulse

A self-hosted API uptime monitoring tool that periodically checks your endpoint health and displays status on a real-time dashboard.

## Features

- **Health Check Engine** - Periodic HTTP checks with configurable intervals
- **Retry Logic** - Exponential backoff (1s, 2s, 4s) for failed requests
- **Incident Lifecycle** - Automatic incident creation and resolution tracking
- **Real-time Dashboard** - WebSocket-powered live status updates
- **Uptime Statistics** - 24h, 7d, and 30d uptime percentages
- **Response Time Charts** - Visualize response time trends
- **REST API** - Full CRUD for monitors with input validation

## Tech Stack

- **Backend**: Node.js, Express, TypeScript
- **Database**: SQLite (sql.js)
- **Frontend**: React, Vite, TypeScript, Tailwind CSS
- **Real-time**: Socket.io
- **Charts**: Recharts
- **Testing**: Jest, Supertest

## Local Development

### Prerequisites

- Node.js 18+
- npm

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/0535MANIDEEP/devpulse.git
   cd devpulse
   ```

2. Install server dependencies:
   ```bash
   cd server
   npm install
   ```

3. Install client dependencies:
   ```bash
   cd ../client
   npm install
   ```

4. Start the server:
   ```bash
   cd ../server
   npm run dev
   ```

5. Start the client (in a new terminal):
   ```bash
   cd ../client
   npm run dev
   ```

6. Open http://localhost:5173 in your browser

## Docker Setup

```bash
docker-compose up --build
```

The app will be available at http://localhost:5173

## API Documentation

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/health | Health check |
| GET | /api/monitors | List all monitors |
| POST | /api/monitors | Create a monitor |
| GET | /api/monitors/:id | Get monitor details |
| PUT | /api/monitors/:id | Update a monitor |
| DELETE | /api/monitors/:id | Delete a monitor |
| GET | /api/monitors/:id/checks | Get check history |
| GET | /api/monitors/:id/incidents | Get incident history |
| GET | /api/monitors/:id/stats | Get uptime statistics |

## Architecture

The system uses a scheduler that runs health checks at configured intervals for each active monitor. When a check completes:

1. The result is recorded in the database
2. If the check fails and no incident is open, a new incident is created
3. If the check succeeds and an incident is open, it's resolved
4. WebSocket events are emitted for real-time dashboard updates

## Trade-offs

- **SQLite vs PostgreSQL**: SQLite was chosen for simplicity in self-hosted deployments. For production at scale with concurrent writes, PostgreSQL would be better.
- **sql.js vs better-sqlite3**: sql.js is a pure JavaScript implementation that doesn't require native compilation, making it easier to deploy across platforms.
