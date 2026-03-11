# API Overview

## Introduction

The Time Entry Backend API is a RESTful API built with NestJS that provides time tracking and task management capabilities for organizations. The API follows industry best practices for security, authentication, and data validation.

## Technology Stack

- **Framework**: NestJS 10.x
- **Runtime**: Node.js 20.x
- **Language**: TypeScript 5.x
- **Authentication**: Clerk (JWT-based)
- **ORM**: Prisma 5.x
- **Database**: PostgreSQL 16.x
- **API Documentation**: Swagger/OpenAPI
- **Validation**: class-validator, class-transformer

## Base URL

```
Development: http://localhost:3003
Production: [Your production ALB URL]
```

## Architecture

The API follows a modular architecture with the following key components:

### Core Modules

1. **Auth Module** (`src/auth/`)
   - JWT authentication via Clerk
   - Role-based access control (RBAC)
   - Organization context management
   - Custom decorators for user and role validation

2. **Users Module** (`src/users/`)
   - User profile management
   - Organization membership management
   - Onboarding flow

3. **Organizations Module** (`src/organizations/`)
   - Multi-tenant organization management
   - Organization creation and updates
   - Member management

4. **Tasks Module** (`src/tasks/`)
   - Task creation and tracking
   - Task status and priority management
   - Task assignment to users

5. **Time Entries Module** (`src/time-entries/`)
   - Manual time logging
   - Time entry validation (max 4 hours per entry)
   - Reporting and aggregation
   - Task linking

## Authentication & Authorization

### Authentication Flow

1. Client authenticates with Clerk and receives JWT token
2. JWT token is included in API requests via `Authorization: Bearer <token>` header
3. AuthGuard validates token with Clerk and retrieves user information
4. User's organization membership and role are attached to request context

### Authorization Levels

**Role Hierarchy:**
- `ADMIN` - System administrator (highest privileges)
- `ORG_ADMIN` - Organization administrator
- `MEMBER` - Regular organization member

**Organization Context:**
- Multi-tenant architecture with organization isolation
- Organization context passed via `x-organization-id` header (optional)
- Default organization used if header not provided

### Protected Routes

All API endpoints require authentication except:
- Health check endpoints
- Swagger documentation

Reference: `d:\codes\time-entry\backend\src\auth\auth.guard.ts` (lines 25-143)

## Request/Response Format

### Request Headers

```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
x-organization-id: <organization_id> (optional)
```

### Response Format

**Success Response:**
```json
{
  "id": "cuid",
  "...": "entity fields"
}
```

**Error Response:**
```json
{
  "statusCode": 400,
  "message": "Error message or array of messages",
  "error": "Error type"
}
```

## API Versioning

Currently using v1 (implicit). All routes are prefixed with the module name:
- `/users`
- `/organizations`
- `/tasks`
- `/time-entries`

## Rate Limiting

Not currently implemented. Consider adding for production:
- Consider implementing rate limiting using `@nestjs/throttler`
- Recommended: 100 requests per minute per IP

## CORS Configuration

CORS is configured to allow requests from:
- Development: `http://localhost:3000`, `http://localhost:3001`
- Production: Configured via environment variables

Reference: `d:\codes\time-entry\backend\src\main.ts`

## Data Validation

All request DTOs are validated using:
- **class-validator** decorators
- **class-transformer** for type conversion
- Custom validation pipes in NestJS

Example validation rules:
- Email format validation
- Required fields
- String length constraints
- Number range constraints
- Custom business logic validation

## Pagination & Filtering

### Query Parameters

Time entries and tasks support filtering via query parameters:

**Time Entries:**
```
GET /time-entries?startDate=2024-01-01&endDate=2024-01-31&userId=<user_id>
```

**Tasks:**
```
GET /tasks?status=IN_PROGRESS&priority=HIGH
```

Reference:
- `d:\codes\time-entry\backend\src\time-entries\dto\query-time-entries.dto.ts`
- `d:\codes\time-entry\backend\src\tasks\dto\query-tasks.dto.ts`

## Error Handling

The API uses NestJS exception filters and standard HTTP status codes:

- `200 OK` - Successful GET/PATCH/DELETE
- `201 Created` - Successful POST
- `400 Bad Request` - Validation errors
- `401 Unauthorized` - Authentication failure
- `403 Forbidden` - Authorization failure
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource conflict (e.g., duplicate)
- `500 Internal Server Error` - Server errors

See detailed error codes in `docs/02-backend/04-api/3-error_codes.md`

## API Documentation (Swagger)

Interactive API documentation available at:
```
http://localhost:3003/api
```

Swagger UI provides:
- All available endpoints
- Request/response schemas
- Try-it-out functionality
- Authentication configuration

Reference: `d:\codes\time-entry\backend\src\main.ts` (Swagger setup)

## Health Checks

```
GET /health - Application health status
```

## Key Features

### Multi-Tenancy
- Organization-based data isolation
- Automatic organization context resolution
- Support for users in multiple organizations

### Time Entry Validation
- Maximum 4 hours per time entry
- Automatic hours calculation from start/end time
- Date/time validation
- Overlapping time entry prevention (recommended for future)

### Reporting
- Time summary aggregation by user and task
- Flexible date range filtering
- Billable hours tracking

### Soft Deletes
- Organizations, tasks use `isActive` flag
- Time entries support hard delete
- Maintains data integrity for historical records

## Security Best Practices

1. **JWT Validation** - All tokens validated with Clerk
2. **Organization Isolation** - Users can only access data from their organizations
3. **Role-Based Access** - Endpoint-level authorization based on user role
4. **Input Validation** - All inputs validated before processing
5. **SQL Injection Protection** - Prisma ORM with parameterized queries
6. **Environment Variables** - Sensitive data stored in environment variables

## Performance Considerations

1. **Database Indexing** - Key fields indexed (see schema.prisma)
2. **Query Optimization** - Prisma select/include used strategically
3. **Connection Pooling** - Prisma manages database connection pool
4. **Async Operations** - All database operations are async

## Next Steps

- Review detailed endpoint documentation: `docs/02-backend/04-api/2-endpoints.md`
- Review error codes: `docs/02-backend/04-api/3-error_codes.md`
- Review database schema: `docs/02-backend/05-db/1-schema_overview.md`
- Review deployment guide: `docs/05-deployment/`
