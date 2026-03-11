# Backend Low-Level Design

## Module Structure

### 1. Auth Module

#### Components
- `AuthGuard` - JWT token validation and user context
- `RolesGuard` - Role-based authorization
- `@CurrentUser()` Decorator - Inject authenticated user
- `@Roles()` Decorator - Define required roles

#### AuthGuard Implementation
```typescript
Location: backend/src/auth/auth.guard.ts:25

Flow:
1. Extract Bearer token from Authorization header
2. Decode JWT payload to get Clerk user ID (sub claim)
3. Fetch user details from Clerk API
4. Query database for user with organizationMembers
5. Determine current organization context:
   - From x-organization-id header (if provided)
   - Default to first active membership
6. Attach user object to request:
   {
     id: string,
     clerkId: string,
     email: string,
     firstName: string,
     lastName: string,
     role: 'ADMIN' | 'ORG_ADMIN' | 'MEMBER',
     organizationId: string,
     organizationMemberships: [{organizationId, role}]
   }
```

#### Organization Context
- Users can belong to multiple organizations
- Current organization determined by `x-organization-id` header
- If no header, uses first active membership
- All subsequent queries scoped to this organization

### 2. Organizations Module

#### OrganizationsController
```typescript
Location: backend/src/organizations/organizations.controller.ts

Endpoints:
- POST   /organizations          - Create organization
- GET    /organizations          - List user's organizations
- GET    /organizations/:id      - Get organization details
- PATCH  /organizations/:id      - Update organization
- DELETE /organizations/:id      - Soft delete organization

Guards: AuthGuard (all routes)
```

#### OrganizationsService
```typescript
Location: backend/src/organizations/organizations.service.ts

Methods:
- create(dto, user): Creates organization and membership
  - Generates unique slug from name
  - Creates organization
  - Creates membership with ORG_ADMIN role

- findAll(user): Returns user's organizations
  - Queries via organizationMembers relation
  - Filters isActive = true

- findOne(id, user): Gets organization by ID
  - Verifies user membership
  - Returns organization with members

- update(id, dto, user): Updates organization
  - Verifies ORG_ADMIN role
  - Updates name and/or slug

- remove(id, user): Soft deletes organization
  - Verifies ORG_ADMIN role
  - Sets isActive = false
```

#### DTOs
```typescript
CreateOrganizationDto:
- name: string (required, min 2, max 100)

UpdateOrganizationDto:
- name?: string
- slug?: string
```

### 3. Users Module

#### UsersController
```typescript
Location: backend/src/users/users.controller.ts

Endpoints:
- GET /users/me                - Get current user profile
- POST /users/join            - Join organization
- POST /users/leave           - Leave organization

Guards: AuthGuard (all routes)
```

#### OnboardingController
```typescript
Location: backend/src/users/onboarding.controller.ts

Endpoints:
- POST /users/onboarding/complete - Complete user onboarding
  - Creates user in database
  - Associates with organization
  - Returns user profile

DTOs:
- CompleteOnboardingDto:
  - firstName: string
  - lastName: string
  - createOrganization?: {name: string}
  - joinOrganization?: {slug: string}
```

#### UsersService
```typescript
Location: backend/src/users/users.service.ts

Methods:
- findByClerkId(clerkId): Finds user by Clerk ID
- create(userData): Creates user record
- joinOrganization(dto, user): Adds user to organization
  - Verifies organization exists
  - Creates membership with MEMBER role
- leaveOrganization(dto, user): Removes from organization
  - Soft deletes membership
  - Verifies not last admin
```

### 4. Tasks Module

#### TasksController
```typescript
Location: backend/src/tasks/tasks.controller.ts:23

Endpoints:
- POST   /tasks       - Create task
- GET    /tasks       - List tasks (with filters)
- GET    /tasks/:id   - Get task details
- PATCH  /tasks/:id   - Update task
- DELETE /tasks/:id   - Soft delete task

Guards: AuthGuard (all routes)
```

#### TasksService
```typescript
Location: backend/src/tasks/tasks.service.ts

Methods:
- create(dto, user): Creates task
  - Uses user.organizationId
  - Connects assigned users via assignedToIds
  - Returns task with assignedTo users

- findAll(query, user): Lists tasks with filters
  - Filters:
    - organizationId (from user context)
    - status (TaskStatus enum)
    - priority (TaskPriority enum)
    - assignedUserId
  - Includes assignedTo users
  - Includes timeEntries count

- findOne(id): Gets task by ID
  - Includes assignedTo users
  - Includes organization

- update(id, dto, user): Updates task
  - Can update all fields
  - Can reassign users
  - Validates organization membership

- remove(id): Soft deletes task
  - Sets isActive = false
  - Preserves related data
```

#### DTOs
```typescript
CreateTaskDto (backend/src/tasks/dto/create-task.dto.ts:15):
- organizationId?: string (auto-filled from user context)
- assignedToIds?: string[]
- title: string (required, 3-255 chars)
- description?: string
- status?: TaskStatus (default: TODO)
- priority?: TaskPriority (default: MEDIUM)
- estimatedHours?: number
- dueDate?: string (ISO 8601)

UpdateTaskDto:
- Partial<CreateTaskDto>

QueryTasksDto:
- organizationId?: string
- status?: TaskStatus
- priority?: TaskPriority
- assignedUserId?: string
```

#### Enums
```typescript
TaskStatus: TODO | IN_PROGRESS | DONE
TaskPriority: LOW | MEDIUM | HIGH | URGENT
```

### 5. Time Entries Module

#### TimeEntriesController
```typescript
Location: backend/src/time-entries/time-entries.controller.ts:23

Endpoints:
- POST   /time-entries                   - Create time entry
- GET    /time-entries                   - List time entries (with filters)
- GET    /time-entries/reports/summary   - Get time summary report
- GET    /time-entries/:id               - Get time entry details
- PATCH  /time-entries/:id               - Update time entry
- DELETE /time-entries/:id               - Delete time entry

Guards: AuthGuard (all routes)
```

#### TimeEntriesService
```typescript
Location: backend/src/time-entries/time-entries.service.ts

Methods:
- create(dto, user): Creates time entry
  - Uses user.id and user.organizationId
  - Calculates hours from startTime and endTime
  - Connects to tasks via taskIds
  - Validates endTime > startTime

- findAll(query, user): Lists time entries
  - Filters:
    - organizationId (from user context)
    - userId (defaults to current user)
    - taskId
    - startDate/endDate range
    - isBillable
  - Includes user and tasks
  - Ordered by startTime DESC

- findOne(id, user): Gets time entry by ID
  - Verifies organization membership
  - Includes user and tasks

- update(id, dto, user): Updates time entry
  - Recalculates hours if time changed
  - Can update tasks association
  - Validates ownership or admin

- remove(id, user): Hard deletes time entry
  - Validates ownership or admin

- getTimeSummary(query, user): Generates time report
  - Aggregates by user and task
  - Calculates:
    - Total hours
    - Billable hours
    - Non-billable hours
    - Hours per user
    - Hours per task
```

#### DTOs
```typescript
CreateTimeEntryDto (backend/src/time-entries/dto/create-time-entry.dto.ts:13):
- organizationId?: string (auto-filled)
- userId?: string (auto-filled)
- taskIds?: string[]
- startTime: string (required, ISO 8601)
- endTime: string (required, ISO 8601)
- hours: number (required, 0.1-24)
- description?: string
- isBillable?: boolean (default: false)

UpdateTimeEntryDto:
- Partial<CreateTimeEntryDto>

QueryTimeEntriesDto:
- organizationId?: string
- userId?: string
- taskId?: string
- startDate?: string (ISO 8601)
- endDate?: string (ISO 8601)
- isBillable?: boolean
```

### 6. Prisma Module

#### PrismaService
```typescript
Location: backend/src/prisma/prisma.service.ts

Extends: PrismaClient
Implements: OnModuleInit, OnModuleDestroy

Methods:
- onModuleInit(): Connects to database
- onModuleDestroy(): Disconnects from database

Features:
- Connection pooling
- Type-safe queries
- Auto-generated client
```

## Request/Response Flow

### 1. Authenticated Request Flow
```
Client Request
  “
    Authorization: Bearer <jwt>
    x-organization-id: <orgId> (optional)
  “
AuthGuard
    Extract token
    Decode JWT
    Fetch Clerk user
    Query database user + memberships
    Determine organization context
    Attach user to request
  “
RolesGuard (if applied)
    Check user.role
    Compare with @Roles() requirement
  “
ValidationPipe
    Validate DTO
    Transform types
    Whitelist properties
  “
Controller
    Extract @CurrentUser()
    Extract @Body(), @Param(), @Query()
    Call service method
  “
Service
    Execute business logic
    Query database via Prisma
    Transform data
    Return result
  “
Controller
    Return response
  “
Client Response
```

### 2. Create Task Example
```typescript
// Request
POST /tasks
Authorization: Bearer <jwt>
x-organization-id: org_123
{
  "title": "Implement feature",
  "description": "Add new functionality",
  "priority": "HIGH",
  "assignedToIds": ["user_456"]
}

// Flow
1. AuthGuard validates token
2. User context: {organizationId: "org_123", role: "MEMBER", ...}
3. ValidationPipe validates CreateTaskDto
4. TasksController.create() called
5. TasksService.create() executes:
   - Sets organizationId from user context
   - Creates task via Prisma
   - Connects assigned users
6. Returns task with assignedTo users

// Response
{
  "id": "task_789",
  "organizationId": "org_123",
  "title": "Implement feature",
  "description": "Add new functionality",
  "status": "TODO",
  "priority": "HIGH",
  "assignedTo": [
    {
      "id": "user_456",
      "email": "user@example.com",
      "firstName": "John"
    }
  ],
  "createdAt": "2025-11-30T10:00:00Z"
}
```

## Database Query Patterns

### 1. Multi-Tenant Queries
```typescript
// Always filter by organizationId
await this.prisma.task.findMany({
  where: {
    organizationId: user.organizationId,
    isActive: true,
  },
});
```

### 2. Soft Deletes
```typescript
// Update instead of delete
await this.prisma.organization.update({
  where: { id },
  data: { isActive: false },
});
```

### 3. Relations
```typescript
// Include related entities
await this.prisma.task.findUnique({
  where: { id },
  include: {
    assignedTo: true,
    timeEntries: true,
  },
});
```

### 4. Many-to-Many
```typescript
// Connect/disconnect related entities
await this.prisma.task.update({
  where: { id },
  data: {
    assignedTo: {
      connect: assignedToIds.map(id => ({ id })),
    },
  },
});
```

## Error Handling

### Exception Types
- `UnauthorizedException` (401) - Invalid/missing token
- `ForbiddenException` (403) - Insufficient permissions
- `NotFoundException` (404) - Resource not found
- `BadRequestException` (400) - Validation errors
- `ConflictException` (409) - Duplicate resources

### Validation Errors
```json
{
  "statusCode": 400,
  "message": [
    "title should not be empty",
    "title must be longer than or equal to 3 characters"
  ],
  "error": "Bad Request"
}
```

## Configuration

### Environment Variables
```env
DATABASE_URL=postgresql://user:pass@host:5432/db
CLERK_SECRET_KEY=sk_test_...
CLERK_PUBLISHABLE_KEY=pk_test_...
FRONTEND_URLS=http://localhost:3000,https://app.example.com
PORT=3001
```

### Validation Pipe Configuration
```typescript
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,           // Strip unknown properties
    transform: true,           // Auto-transform types
    forbidNonWhitelisted: true // Reject unknown properties
  }),
);
```

## Performance Optimizations

### Database Indexes
```prisma
@@index([organizationId])
@@index([userId])
@@index([status])
@@index([startTime])
```

### Query Optimization
- Use `select` to limit fields
- Use `include` for relations
- Avoid N+1 queries with proper includes
- Pagination for large datasets (future)

### Caching
- No server-side caching currently
- Frontend caching with TanStack Query
- Future: Redis for session/data caching
