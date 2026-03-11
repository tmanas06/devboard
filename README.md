# Devboard

A full-stack time entry and task tracking application built with NestJS, Next.js, clerk and PostgreSQL.

## Tech Stack

- **Backend**: NestJS (TypeScript), Prisma ORM, PostgreSQL
- **Frontend**: Next.js 16, React 19, TanStack Query, Radix UI
- **Authentication**: Clerk
- **Package Manager**: pnpm

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **pnpm** (v8 or higher) - Install with `npm install -g pnpm`
- **PostgreSQL** (v14 or higher) - Running locally, via Docker, or using a cloud service like [Neon.com](https://neon.tech)
- **Clerk Account** - Sign up at [clerk.com](https://clerk.com) for authentication

## Local Development Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd devboard
```

### 2. Database Setup

#### Option A: Local PostgreSQL

1. Install and start PostgreSQL on your machine
2. Create a new database:

```bash
createdb devboard_dev
```

Or using PostgreSQL CLI:

```bash
psql -U postgres
CREATE DATABASE devboard_dev;
\q
```

#### Option B: Docker PostgreSQL

```bash
docker run --name devboard-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=devboard_dev \
  -p 5432:5432 \
  -d postgres:14
```

#### Option C: Neon.com (Serverless PostgreSQL)

1. Sign up for a free account at [neon.tech](https://neon.tech)
2. Create a new project:
   - Click "Create Project"
   - Choose a project name (e.g., "devboard-dev")
   - Select a region closest to you
   - Click "Create Project"
3. Copy the connection string:
   - In your Neon dashboard, go to your project
   - Click on "Connection Details" or "Connection String"
   - Copy the connection string (it will look like: `postgresql://user:password@host.neon.tech/dbname?sslmode=require`)
4. Use this connection string as your `DATABASE_URL` in the backend `.env` file

**Note**: Neon.com provides a free tier with generous limits, perfect for development. The connection string includes SSL by default, which is required for Neon databases.

### 3. Clerk Authentication Setup

1. Sign up for a free account at [clerk.com](https://clerk.com)
2. Create a new application
3. Note down the following from your Clerk dashboard:
   - **Publishable Key** (starts with `pk_test_` or `pk_live_`)
   - **Secret Key** (starts with `sk_test_` or `sk_live_`)
4. Configure allowed origins in Clerk dashboard:
   - Add `http://localhost:3000` to allowed origins

### 4. Backend Setup

1. Navigate to the backend directory:

```bash
cd backend
```

2. Install dependencies:

```bash
pnpm install
```

3. Create a `.env` file in the `backend` directory:

```bash
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/devboard_dev?schema=public"

# Clerk Authentication
CLERK_SECRET_KEY="sk_test_your_clerk_secret_key_here"

# Server Configuration (optional)
PORT=3001
FRONTEND_URLS="http://localhost:3000"
```

4. Generate Prisma Client:

```bash
pnpm prisma:generate
```

5. Run database migrations:

```bash
pnpm prisma:migrate
```

6. (Optional) Seed the database with sample data:

```bash
pnpm prisma:seed
```

7. Start the backend development server:

```bash
pnpm start:dev
```

The backend API will be available at:
- **API**: http://localhost:3001
- **Swagger Documentation**: http://localhost:3001/api

### 5. Frontend Setup

1. Open a new terminal and navigate to the frontend directory:

```bash
cd my-app
```

2. Install dependencies:

```bash
pnpm install
```

3. Create a `.env.local` file in the `my-app` directory:

```bash
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_your_clerk_publishable_key_here"
CLERK_SECRET_KEY="sk_test_your_clerk_secret_key_here"

# API Configuration
NEXT_PUBLIC_API_URL="http://localhost:3001"
```

**Note**: Make sure `NEXT_PUBLIC_API_URL` points to your backend server (default: `http://localhost:3001`)

4. Start the frontend development server:

```bash
pnpm dev
```

The frontend application will be available at:
- **Application**: http://localhost:3000

## Running the Project

### Development Mode

1. **Terminal 1 - Backend**:
```bash
cd backend
pnpm start:dev
```

2. **Terminal 2 - Frontend**:
```bash
cd my-app
pnpm dev
```

3. Open your browser and navigate to http://localhost:3000

### First-Time Setup Checklist

- [ ] PostgreSQL database created and running
- [ ] Clerk account created and application configured
- [ ] Backend `.env` file created with `DATABASE_URL` and `CLERK_SECRET_KEY`
- [ ] Frontend `.env.local` file created with Clerk keys and `NEXT_PUBLIC_API_URL`
- [ ] Prisma migrations run (`pnpm prisma:migrate` in backend)
- [ ] Backend server running on http://localhost:3001
- [ ] Frontend server running on http://localhost:3000

## Environment Variables Reference

### Backend (`backend/.env`)

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Yes | - |
| `CLERK_SECRET_KEY` | Clerk secret key for authentication | Yes | - |
| `PORT` | Backend server port | No | `3001` |
| `FRONTEND_URLS` | Comma-separated list of allowed frontend URLs | No | `http://localhost:3000` |

### Frontend (`my-app/.env.local`)

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key | Yes | - |
| `CLERK_SECRET_KEY` | Clerk secret key | Yes | - |
| `NEXT_PUBLIC_API_URL` | Backend API URL | Yes | `http://localhost:3000` |

## Useful Commands

### Backend

```bash
# Development
pnpm start:dev          # Start development server with hot reload

# Database
pnpm prisma:generate     # Generate Prisma Client
pnpm prisma:migrate      # Run database migrations
pnpm prisma:seed         # Seed database with sample data
pnpm prisma:studio       # Open Prisma Studio (database GUI)

# Testing
pnpm test               # Run unit tests
pnpm test:e2e           # Run end-to-end tests
pnpm test:cov           # Run tests with coverage

# Code Quality
pnpm lint               # Run ESLint
pnpm format             # Format code with Prettier
```

### Frontend

```bash
# Development
pnpm dev                # Start development server

# Build
pnpm build              # Build for production
pnpm start              # Start production server

# Code Quality
pnpm lint               # Run ESLint
```

## Troubleshooting

### Database Connection Issues

- Ensure PostgreSQL is running: `pg_isready` or check Docker container status
- Verify `DATABASE_URL` format: `postgresql://user:password@host:port/database?schema=public`
- Check database exists: `psql -l` (should list `devboard_dev`)
- **For Neon.com**: 
  - Ensure your connection string includes `?sslmode=require` (Neon requires SSL)
  - Verify your Neon project is active (check Neon dashboard)
  - Check if your IP is allowed (Neon may require IP allowlisting for some plans)
  - Connection strings from Neon include SSL by default - don't remove the SSL parameters

### Clerk Authentication Issues

- Verify Clerk keys are correct (check for typos)
- Ensure `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` starts with `pk_test_` or `pk_live_`
- Ensure `CLERK_SECRET_KEY` starts with `sk_test_` or `sk_live_`
- Check Clerk dashboard for allowed origins (should include `http://localhost:3000`)

### Port Already in Use

- Backend (3001): Change `PORT` in `backend/.env` or stop the process using port 3001
- Frontend (3000): Stop the process using port 3000 or use `pnpm dev -p 3001`

### Prisma Migration Issues

- Reset database (⚠️ **WARNING**: This will delete all data):
  ```bash
  cd backend
  pnpm prisma migrate reset
  ```

### CORS Errors

- Ensure `FRONTEND_URLS` in backend `.env` includes `http://localhost:3000`
- Verify `NEXT_PUBLIC_API_URL` in frontend `.env.local` matches backend URL

## Project Structure

```
devboard/
├── backend/                  # NestJS API backend
│   ├── prisma/              # Database schema and migrations
│   ├── src/                 # Application code
│   │   ├── auth/            # Authentication integration
│   │   ├── tasks/           # Task management
│   │   ├── time-entries/    # Time tracking
│   │   ├── reports/         # Report generation
│   │   └── webhooks/        # External webhooks
│   └── test/                # E2E tests
├── my-app/                  # Next.js frontend (App Router)
│   ├── app/                 # Pages and routing
│   │   ├── (auth)/          # Authentication pages
│   │   ├── (dashboard)/     # Main application portal
│   │   └── api/             # Next.js API routes
│   ├── components/          # Reusable UI components
│   ├── lib/                 # Utilities and API client
│   └── tests/               # Playwright E2E tests
├── docker-compose.yml       # Local database configuration
└── infra/              # Infrastructure scripts
```

## Additional Resources

- [NestJS Documentation](https://docs.nestjs.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Clerk Documentation](https://clerk.com/docs)
- [API Documentation](http://localhost:3001/api) (Swagger UI when backend is running)

## Support

For issues or questions, please refer to the project documentation in the `docs/` directory or open an issue in the repository.
