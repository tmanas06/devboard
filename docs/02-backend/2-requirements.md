# Backend Requirements

## Functional Requirements

### 1. Authentication & Authorization Module

#### FR-1.1: User Authentication
- Integrate with Clerk for user authentication
- Validate JWT tokens on every API request
- Extract user information from Clerk tokens
- Support bearer token authentication

#### FR-1.2: Role-Based Authorization
- Support three roles: ADMIN, ORG_ADMIN, MEMBER
- Enforce role checks via RolesGuard
- Provide @CurrentUser decorator for accessing authenticated user
- Default role: MEMBER

#### FR-1.3: Protected Routes
- All API endpoints must require authentication (except health checks)
- Unauthorized requests return 401 status
- Forbidden requests return 403 status

### 2. Organizations Module

#### FR-2.1: Create Organization
- Accept organization name
- Generate unique slug from name
- Set creator as ORG_ADMIN
- Return created organization with ID

#### FR-2.2: List Organizations
- Return all organizations where user is a member
- Filter by isActive = true
- Include member count and user's role

#### FR-2.3: Get Organization Details
- Return organization by ID
- Verify user is member
- Include members list (if authorized)

#### FR-2.4: Update Organization
- Allow ORG_ADMIN to update name and slug
- Validate slug uniqueness
- Return updated organization

#### FR-2.5: Delete Organization (Soft)
- Set isActive = false
- Require ORG_ADMIN role
- Preserve data in database

### 3. Users Module

#### FR-3.1: User Onboarding
- Create user from Clerk data
- Collect first name, last name
- Allow creating or joining organization
- Mark onboarding as complete

#### FR-3.2: Join Organization
- Accept organization slug
- Verify organization exists
- Create membership with MEMBER role
- Prevent duplicate memberships

#### FR-3.3: Leave Organization
- Remove user from organization (soft delete)
- Verify user is not last ORG_ADMIN
- Return success response

#### FR-3.4: Get User Profile
- Return authenticated user's profile
- Include organization memberships
- Include roles per organization

### 4. Tasks Module

#### FR-4.1: Create Task
- Accept title, description, status, priority
- Accept assignedUserIds (optional)
- Accept estimatedHours and dueDate (optional)
- Associate with user's organization
- Return created task with ID

#### FR-4.2: List Tasks
- Support filtering by:
  - organizationId
  - status (TODO, IN_PROGRESS, DONE)
  - priority (LOW, MEDIUM, HIGH, URGENT)
  - assignedUserId
  - dueDate range
- Support sorting
- Return paginated results (future)

#### FR-4.3: Get Task Details
- Return task by ID
- Include assigned users
- Include time entries count

#### FR-4.4: Update Task
- Allow updating all fields
- Support assigning/unassigning users
- Validate status transitions
- Return updated task

#### FR-4.5: Delete Task (Soft)
- Set isActive = false
- Preserve task data
- Preserve related time entries

### 5. Time Entries Module

#### FR-5.1: Create Time Entry
- Accept startTime, endTime
- Calculate hours automatically
- Accept taskIds (optional, multiple)
- Accept description and isBillable flag
- Associate with user and organization
- Validate endTime > startTime
- Return created entry with calculated hours

#### FR-5.2: List Time Entries
- Support filtering by:
  - organizationId
  - userId
  - taskId
  - Date range (startTime, endTime)
  - isBillable
- Return entries with associated tasks
- Support pagination (future)

#### FR-5.3: Get Time Entry Details
- Return entry by ID
- Include user details
- Include associated tasks

#### FR-5.4: Update Time Entry
- Allow updating times, description, tasks
- Recalculate hours if time changed
- Validate ownership or admin role
- Return updated entry

#### FR-5.5: Delete Time Entry
- Hard delete (not soft delete)
- Verify ownership or admin role
- Return success response

#### FR-5.6: Time Summary Report
- Aggregate time by user and task
- Filter by date range and organization
- Return:
  - Total hours
  - Billable hours
  - Non-billable hours
  - Hours per user
  - Hours per task

## Non-Functional Requirements

### 1. Performance

#### NFR-1.1: Response Time
- API endpoints respond within 500ms for 95% of requests
- Database queries optimized with proper indexes
- Use Prisma's query optimization features

#### NFR-1.2: Database Performance
- Connection pooling configured
- Indexes on foreign keys: userId, organizationId, taskId
- Indexes on query fields: status, startTime, createdAt
- Prevent N+1 queries with Prisma includes

#### NFR-1.3: Concurrent Requests
- Support 100+ concurrent requests
- Stateless design for horizontal scaling

### 2. Security

#### NFR-2.1: Input Validation
- Validate all input via class-validator
- Whitelist mode (strip unknown properties)
- Type coercion and transformation
- Sanitize string inputs

#### NFR-2.2: SQL Injection Prevention
- Use Prisma parameterized queries
- No raw SQL queries without sanitization

#### NFR-2.3: CORS Configuration
- Whitelist allowed origins from env variable
- Support credentials
- Restrict methods and headers

#### NFR-2.4: Sensitive Data Protection
- Do not expose Clerk secrets in responses
- Do not expose full user emails in lists
- Hash/encrypt sensitive data

#### NFR-2.5: Rate Limiting
- Implement rate limiting per IP (future)
- Prevent brute force attacks

### 3. Reliability

#### NFR-3.1: Error Handling
- Graceful error handling for all endpoints
- Meaningful error messages
- Proper HTTP status codes
- Log errors for debugging

#### NFR-3.2: Database Transactions
- Use transactions for multi-step operations
- Ensure data consistency
- Rollback on errors

#### NFR-3.3: Health Checks
- Provide health check endpoint
- Check database connectivity
- Return service status

### 4. Maintainability

#### NFR-4.1: Code Quality
- Follow NestJS best practices
- Use TypeScript strict mode
- Maintain >80% test coverage
- ESLint and Prettier configuration

#### NFR-4.2: API Documentation
- Swagger documentation for all endpoints
- Include request/response examples
- Document error responses
- Keep documentation up-to-date

#### NFR-4.3: Database Migrations
- Use Prisma migrations
- Version-controlled schema changes
- Rollback support
- Seed data for development

#### NFR-4.4: Logging
- Log all errors with stack traces
- Log API requests (method, path, status)
- Structured logging (JSON format)
- Log levels: debug, info, warn, error

### 5. Scalability

#### NFR-5.1: Horizontal Scaling
- Stateless application design
- No in-memory session storage
- Share-nothing architecture
- Database connection pooling

#### NFR-5.2: Database Scalability
- Support read replicas (future)
- Efficient indexing strategy
- Archive old data (future)

### 6. Testability

#### NFR-6.1: Unit Testing
- Test services independently
- Mock Prisma client
- Test business logic
- Use Jest framework

#### NFR-6.2: Integration Testing
- Test API endpoints
- Test database integration
- Test authentication flow
- E2E testing support

### 7. Deployment

#### NFR-7.1: Containerization
- Docker support
- Multi-stage builds
- Production-ready image
- Health checks in container

#### NFR-7.2: Environment Configuration
- Support dev, test, prod environments
- Environment-based configuration
- Secrets management
- Database migration on startup

## Constraints

### Technical Constraints
- Must use NestJS framework
- Must use Clerk for authentication
- Must use PostgreSQL database
- Must use Prisma ORM
- Must use TypeScript

### Integration Constraints
- Must integrate with Clerk API
- Must support frontend CORS requests
- API must match frontend expectations

### Business Constraints
- Multi-tenant data isolation
- Audit trail via timestamps
- Soft deletes for organizations and tasks
- Hard deletes for time entries

### Performance Constraints
- Database connection pool size: configured
- API timeout: 30 seconds
- Maximum payload size: 10MB

## Dependencies

### External Services
- **Clerk**: User authentication and management
- **PostgreSQL**: Database server

### NPM Packages
- Production dependencies in [package.json](../../backend/package.json)
- Development dependencies for testing and linting

## API Contracts

### Request Format
- JSON content type
- Bearer token in Authorization header
- Validation via DTOs

### Response Format
- JSON content type
- Consistent error structure
- ISO 8601 date formats
- Pagination metadata (future)

### Error Responses
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    {
      "field": "title",
      "message": "title should not be empty"
    }
  ]
}
```
