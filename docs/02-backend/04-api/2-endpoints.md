# API Endpoints

## Table of Contents

1. [Users API](#users-api)
2. [Organizations API](#organizations-api)
3. [Tasks API](#tasks-api)
4. [Time Entries API](#time-entries-api)
5. [Reports API](#reports-api)

---

## Users API

Base path: `/users`

### Get Current User

Get authenticated user's profile and organization memberships.

```http
GET /users/me
```

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:** `200 OK`
```json
{
  "id": "user_cuid123",
  "clerkId": "user_2xxx",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "isActive": true,
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-07T00:00:00.000Z",
  "role": "ORG_ADMIN",
  "organizationId": "org_cuid123",
  "organizationMembers": [
    {
      "organizationId": "org_cuid123",
      "role": "ORG_ADMIN"
    }
  ]
}
```

**Reference:** `d:\codes\time-entry\backend\src\users\users.controller.ts` (lines 16-26)

---

### Get All Users in Organization

Get all users that belong to a specific organization.

```http
GET /users?organizationId=<org_id>
```

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `organizationId` (required) - Organization ID to filter users

**Response:** `200 OK`
```json
[
  {
    "id": "user_cuid123",
    "clerkId": "user_2xxx",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "isActive": true,
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-07T00:00:00.000Z",
    "organizationMembers": [
      {
        "role": "ORG_ADMIN",
        "organizationId": "org_cuid123"
      }
    ]
  }
]
```

**Reference:** `d:\codes\time-entry\backend\src\users\users.controller.ts` (lines 49-55)

---

### Get User by ID

Get a specific user's details.

```http
GET /users/:id
```

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Path Parameters:**
- `id` (required) - User ID

**Response:** `200 OK`
```json
{
  "id": "user_cuid123",
  "clerkId": "user_2xxx",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "isActive": true,
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-07T00:00:00.000Z"
}
```

**Errors:**
- `404 Not Found` - User not found

**Reference:** `d:\codes\time-entry\backend\src\users\users.controller.ts` (lines 57-63)

---

### Join Organization

Add current user to an organization.

```http
POST /users/join-organization
```

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "organizationId": "org_cuid123",
  "role": "MEMBER"
}
```

**Body Parameters:**
- `organizationId` (required, string) - Organization ID to join
- `role` (optional, enum) - Role in organization: `ORG_ADMIN` | `MEMBER` (default: `MEMBER`)

**Response:** `201 Created`
```json
{
  "id": "membership_cuid123",
  "userId": "user_cuid123",
  "organizationId": "org_cuid123",
  "role": "MEMBER",
  "isActive": true,
  "createdAt": "2025-01-07T00:00:00.000Z",
  "updatedAt": "2025-01-07T00:00:00.000Z"
}
```

**Errors:**
- `404 Not Found` - Organization not found
- `409 Conflict` - Already a member of this organization

**Reference:**
- Controller: `d:\codes\time-entry\backend\src\users\users.controller.ts` (lines 28-39)
- DTO: `d:\codes\time-entry\backend\src\users\dto\join-organization.dto.ts`

---

### Leave Organization

Remove current user from an organization.

```http
POST /users/leave-organization
```

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "organizationId": "org_cuid123"
}
```

**Body Parameters:**
- `organizationId` (required, string) - Organization ID to leave

**Response:** `200 OK`
```json
{
  "message": "Successfully left organization"
}
```

**Errors:**
- `404 Not Found` - Not a member of this organization

**Reference:** `d:\codes\time-entry\backend\src\users\users.controller.ts` (lines 41-47)

---

## Organizations API

Base path: `/organizations`

### Create Organization

Create a new organization. Only ORG_ADMIN users can create organizations.

```http
POST /organizations
```

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Acme Corporation",
  "slug": "acme-corp"
}
```

**Body Parameters:**
- `name` (required, string, 2-100 chars) - Organization name
- `slug` (required, string, 2-50 chars) - URL-friendly slug (lowercase letters, numbers, hyphens only)

**Response:** `201 Created`
```json
{
  "id": "org_cuid123",
  "name": "Acme Corporation",
  "slug": "acme-corp",
  "isActive": true,
  "createdAt": "2025-01-07T00:00:00.000Z",
  "updatedAt": "2025-01-07T00:00:00.000Z"
}
```

**Errors:**
- `409 Conflict` - Organization slug already exists

**Reference:**
- Controller: `d:\codes\time-entry\backend\src\organizations\organizations.controller.ts` (lines 25-31)
- DTO: `d:\codes\time-entry\backend\src\organizations\dto\create-organization.dto.ts`

---

### Get All Organizations

Get all organizations that the current user is a member of.

```http
GET /organizations
```

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:** `200 OK`
```json
[
  {
    "id": "org_cuid123",
    "name": "Acme Corporation",
    "slug": "acme-corp",
    "isActive": true,
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-07T00:00:00.000Z"
  }
]
```

**Reference:** `d:\codes\time-entry\backend\src\organizations\organizations.controller.ts` (lines 33-38)

---

### Get Organization by ID

Get a specific organization's details.

```http
GET /organizations/:id
```

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Path Parameters:**
- `id` (required) - Organization ID

**Response:** `200 OK`
```json
{
  "id": "org_cuid123",
  "name": "Acme Corporation",
  "slug": "acme-corp",
  "isActive": true,
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-07T00:00:00.000Z",
  "members": [
    {
      "id": "membership_cuid123",
      "userId": "user_cuid123",
      "role": "ORG_ADMIN",
      "user": {
        "id": "user_cuid123",
        "email": "admin@example.com",
        "firstName": "John",
        "lastName": "Doe"
      }
    }
  ]
}
```

**Errors:**
- `404 Not Found` - Organization not found

**Reference:** `d:\codes\time-entry\backend\src\organizations\organizations.controller.ts` (lines 40-46)

---

### Update Organization

Update an organization's details.

```http
PATCH /organizations/:id
```

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Path Parameters:**
- `id` (required) - Organization ID

**Request Body:**
```json
{
  "name": "Acme Corporation Updated",
  "slug": "acme-corp-updated"
}
```

**Body Parameters:**
- `name` (optional, string, 2-100 chars) - Organization name
- `slug` (optional, string, 2-50 chars) - URL-friendly slug

**Response:** `200 OK`
```json
{
  "id": "org_cuid123",
  "name": "Acme Corporation Updated",
  "slug": "acme-corp-updated",
  "isActive": true,
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-07T00:00:00.000Z"
}
```

**Errors:**
- `404 Not Found` - Organization not found

**Reference:** `d:\codes\time-entry\backend\src\organizations\organizations.controller.ts` (lines 48-58)

---

### Delete Organization (Soft Delete)

Soft delete an organization by setting `isActive` to false.

```http
DELETE /organizations/:id
```

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Path Parameters:**
- `id` (required) - Organization ID

**Response:** `200 OK`
```json
{
  "id": "org_cuid123",
  "name": "Acme Corporation",
  "slug": "acme-corp",
  "isActive": false,
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-07T00:00:00.000Z"
}
```

**Errors:**
- `404 Not Found` - Organization not found

**Reference:** `d:\codes\time-entry\backend\src\organizations\organizations.controller.ts` (lines 60-66)

---

## Tasks API

Base path: `/tasks`

### Create Task

Create a new task within an organization.

```http
POST /tasks
```

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "organizationId": "org_cuid123",
  "title": "Implement user authentication",
  "description": "Add JWT-based authentication with refresh tokens",
  "status": "TODO",
  "priority": "HIGH",
  "estimatedHours": 8.5,
  "dueDate": "2025-12-31T23:59:59Z",
  "assignedToIds": ["user_cuid1", "user_cuid2"]
}
```

**Body Parameters:**
- `organizationId` (optional, string) - Organization ID (auto-resolved if not provided)
- `title` (required, string, 3-255 chars) - Task title
- `description` (optional, string) - Task description
- `status` (optional, enum) - Task status: `TODO` | `IN_PROGRESS` | `DONE` (default: `TODO`)
- `priority` (optional, enum) - Task priority: `LOW` | `MEDIUM` | `HIGH` | `URGENT` (default: `MEDIUM`)
- `estimatedHours` (optional, number) - Estimated hours to complete
- `dueDate` (optional, ISO 8601 string) - Due date
- `assignedToIds` (optional, string[]) - Array of user IDs to assign

**Response:** `201 Created`
```json
{
  "id": "task_cuid123",
  "organizationId": "org_cuid123",
  "title": "Implement user authentication",
  "description": "Add JWT-based authentication with refresh tokens",
  "status": "TODO",
  "priority": "HIGH",
  "estimatedHours": 8.5,
  "dueDate": "2025-12-31T23:59:59.000Z",
  "isActive": true,
  "createdAt": "2025-01-07T00:00:00.000Z",
  "updatedAt": "2025-01-07T00:00:00.000Z",
  "assignedTo": [
    {
      "id": "user_cuid1",
      "email": "user1@example.com",
      "firstName": "John",
      "lastName": "Doe"
    }
  ]
}
```

**Reference:**
- Controller: `d:\codes\time-entry\backend\src\tasks\tasks.controller.ts` (lines 27-32)
- DTO: `d:\codes\time-entry\backend\src\tasks\dto\create-task.dto.ts`

---

### Get All Tasks

Get all tasks with optional filtering.

```http
GET /tasks?status=IN_PROGRESS&priority=HIGH
```

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `organizationId` (optional, string) - Filter by organization
- `status` (optional, enum) - Filter by status: `TODO` | `IN_PROGRESS` | `DONE`
- `priority` (optional, enum) - Filter by priority: `LOW` | `MEDIUM` | `HIGH` | `URGENT`
- `assignedToId` (optional, string) - Filter by assigned user ID

**Response:** `200 OK`
```json
[
  {
    "id": "task_cuid123",
    "organizationId": "org_cuid123",
    "title": "Implement user authentication",
    "description": "Add JWT-based authentication with refresh tokens",
    "status": "IN_PROGRESS",
    "priority": "HIGH",
    "estimatedHours": 8.5,
    "dueDate": "2025-12-31T23:59:59.000Z",
    "isActive": true,
    "createdAt": "2025-01-07T00:00:00.000Z",
    "updatedAt": "2025-01-07T00:00:00.000Z",
    "assignedTo": [
      {
        "id": "user_cuid1",
        "email": "user1@example.com",
        "firstName": "John",
        "lastName": "Doe"
      }
    ]
  }
]
```

**Reference:** `d:\codes\time-entry\backend\src\tasks\tasks.controller.ts` (lines 34-39)

---

### Get Task by ID

Get a specific task's details.

```http
GET /tasks/:id
```

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Path Parameters:**
- `id` (required) - Task ID

**Response:** `200 OK`
```json
{
  "id": "task_cuid123",
  "organizationId": "org_cuid123",
  "title": "Implement user authentication",
  "description": "Add JWT-based authentication with refresh tokens",
  "status": "TODO",
  "priority": "HIGH",
  "estimatedHours": 8.5,
  "dueDate": "2025-12-31T23:59:59.000Z",
  "isActive": true,
  "createdAt": "2025-01-07T00:00:00.000Z",
  "updatedAt": "2025-01-07T00:00:00.000Z",
  "assignedTo": [
    {
      "id": "user_cuid1",
      "email": "user1@example.com",
      "firstName": "John",
      "lastName": "Doe"
    }
  ],
  "timeEntries": [
    {
      "id": "entry_cuid123",
      "hours": 4,
      "description": "Worked on authentication"
    }
  ]
}
```

**Errors:**
- `404 Not Found` - Task not found

**Reference:** `d:\codes\time-entry\backend\src\tasks\tasks.controller.ts` (lines 41-47)

---

### Update Task

Update a task's details.

```http
PATCH /tasks/:id
```

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Path Parameters:**
- `id` (required) - Task ID

**Request Body:**
```json
{
  "title": "Updated task title",
  "status": "IN_PROGRESS",
  "priority": "URGENT",
  "estimatedHours": 12.0
}
```

**Body Parameters:**
All fields from CreateTaskDto are optional in update.

**Response:** `200 OK`
```json
{
  "id": "task_cuid123",
  "organizationId": "org_cuid123",
  "title": "Updated task title",
  "description": "Add JWT-based authentication with refresh tokens",
  "status": "IN_PROGRESS",
  "priority": "URGENT",
  "estimatedHours": 12.0,
  "dueDate": "2025-12-31T23:59:59.000Z",
  "isActive": true,
  "createdAt": "2025-01-07T00:00:00.000Z",
  "updatedAt": "2025-01-07T12:00:00.000Z"
}
```

**Errors:**
- `404 Not Found` - Task not found

**Reference:** `d:\codes\time-entry\backend\src\tasks\tasks.controller.ts` (lines 49-55)

---

### Delete Task (Soft Delete)

Soft delete a task by setting `isActive` to false.

```http
DELETE /tasks/:id
```

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Path Parameters:**
- `id` (required) - Task ID

**Response:** `200 OK`
```json
{
  "id": "task_cuid123",
  "isActive": false,
  "updatedAt": "2025-01-07T12:00:00.000Z"
}
```

**Errors:**
- `404 Not Found` - Task not found

**Reference:** `d:\codes\time-entry\backend\src\tasks\tasks.controller.ts` (lines 57-63)

---

## Time Entries API

Base path: `/time-entries`

### Create Time Entry

Log a new time entry. Maximum 4 hours per entry.

```http
POST /time-entries
```

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "organizationId": "org_cuid123",
  "userId": "user_cuid123",
  "taskIds": ["task_cuid1", "task_cuid2"],
  "startTime": "2025-01-07T09:00:00Z",
  "endTime": "2025-01-07T13:00:00Z",
  "hours": 4,
  "description": "Worked on user authentication feature",
  "isBillable": true
}
```

**Body Parameters:**
- `organizationId` (optional, string) - Organization ID (auto-resolved if not provided)
- `userId` (optional, string) - User ID (auto-resolved if not provided)
- `taskIds` (optional, string[]) - Array of task IDs to link
- `startTime` (required, ISO 8601 string) - Start time
- `endTime` (required, ISO 8601 string) - End time
- `hours` (required, number, 0.1-4.0) - Hours worked (max 4 hours per entry)
- `description` (optional, string) - Work description
- `isBillable` (optional, boolean) - Is this billable time? (default: false)

**Response:** `201 Created`
```json
{
  "id": "entry_cuid123",
  "organizationId": "org_cuid123",
  "userId": "user_cuid123",
  "startTime": "2025-01-07T09:00:00.000Z",
  "endTime": "2025-01-07T13:00:00.000Z",
  "hours": 4,
  "description": "Worked on user authentication feature",
  "isBillable": true,
  "createdAt": "2025-01-07T00:00:00.000Z",
  "updatedAt": "2025-01-07T00:00:00.000Z",
  "tasks": [
    {
      "id": "task_cuid1",
      "title": "Implement user authentication"
    }
  ]
}
```

**Errors:**
- `400 Bad Request` - Invalid time range or hours > 4

**Reference:**
- Controller: `d:\codes\time-entry\backend\src\time-entries\time-entries.controller.ts` (lines 27-33)
- DTO: `d:\codes\time-entry\backend\src\time-entries\dto\create-time-entry.dto.ts`

---

### Get All Time Entries

Get all time entries with optional filtering.

```http
GET /time-entries?startDate=2025-01-01&endDate=2025-01-31&userId=user_cuid123
```

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `organizationId` (optional, string) - Filter by organization
- `userId` (optional, string) - Filter by user
- `startDate` (optional, ISO 8601 string) - Filter entries after this date
- `endDate` (optional, ISO 8601 string) - Filter entries before this date
- `isBillable` (optional, boolean) - Filter by billable status

**Response:** `200 OK`
```json
[
  {
    "id": "entry_cuid123",
    "organizationId": "org_cuid123",
    "userId": "user_cuid123",
    "startTime": "2025-01-07T09:00:00.000Z",
    "endTime": "2025-01-07T13:00:00.000Z",
    "hours": 4,
    "description": "Worked on user authentication feature",
    "isBillable": true,
    "createdAt": "2025-01-07T00:00:00.000Z",
    "updatedAt": "2025-01-07T00:00:00.000Z",
    "user": {
      "id": "user_cuid123",
      "firstName": "John",
      "lastName": "Doe"
    },
    "tasks": [
      {
        "id": "task_cuid1",
        "title": "Implement user authentication"
      }
    ]
  }
]
```

**Reference:** `d:\codes\time-entry\backend\src\time-entries\time-entries.controller.ts` (lines 35-40)

---

### Get Time Entry by ID

Get a specific time entry's details.

```http
GET /time-entries/:id
```

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Path Parameters:**
- `id` (required) - Time entry ID

**Response:** `200 OK`
```json
{
  "id": "entry_cuid123",
  "organizationId": "org_cuid123",
  "userId": "user_cuid123",
  "startTime": "2025-01-07T09:00:00.000Z",
  "endTime": "2025-01-07T13:00:00.000Z",
  "hours": 4,
  "description": "Worked on user authentication feature",
  "isBillable": true,
  "createdAt": "2025-01-07T00:00:00.000Z",
  "updatedAt": "2025-01-07T00:00:00.000Z",
  "user": {
    "id": "user_cuid123",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com"
  },
  "tasks": [
    {
      "id": "task_cuid1",
      "title": "Implement user authentication",
      "status": "IN_PROGRESS"
    }
  ]
}
```

**Errors:**
- `404 Not Found` - Time entry not found

**Reference:** `d:\codes\time-entry\backend\src\time-entries\time-entries.controller.ts` (lines 49-55)

---

### Update Time Entry

Update a time entry's details.

```http
PATCH /time-entries/:id
```

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Path Parameters:**
- `id` (required) - Time entry ID

**Request Body:**
```json
{
  "hours": 3.5,
  "description": "Updated work description",
  "isBillable": false
}
```

**Body Parameters:**
All fields from CreateTimeEntryDto are optional in update.

**Response:** `200 OK`
```json
{
  "id": "entry_cuid123",
  "organizationId": "org_cuid123",
  "userId": "user_cuid123",
  "startTime": "2025-01-07T09:00:00.000Z",
  "endTime": "2025-01-07T12:30:00.000Z",
  "hours": 3.5,
  "description": "Updated work description",
  "isBillable": false,
  "createdAt": "2025-01-07T00:00:00.000Z",
  "updatedAt": "2025-01-07T12:00:00.000Z"
}
```

**Errors:**
- `404 Not Found` - Time entry not found

**Reference:** `d:\codes\time-entry\backend\src\time-entries\time-entries.controller.ts` (lines 57-67)

---

### Delete Time Entry

Hard delete a time entry.

```http
DELETE /time-entries/:id
```

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Path Parameters:**
- `id` (required) - Time entry ID

**Response:** `200 OK`
```json
{
  "message": "Time entry deleted successfully"
}
```

**Errors:**
- `404 Not Found` - Time entry not found

**Reference:** `d:\codes\time-entry\backend\src\time-entries\time-entries.controller.ts` (lines 69-75)

---

## Reports API

Base path: `/time-entries/reports`

### Get Time Summary Report

Get aggregated time summary by user and task.

```http
GET /time-entries/reports/summary?startDate=2025-01-01&endDate=2025-01-31
```

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `organizationId` (optional, string) - Filter by organization
- `startDate` (optional, ISO 8601 string) - Filter entries after this date
- `endDate` (optional, ISO 8601 string) - Filter entries before this date

**Response:** `200 OK`
```json
{
  "summary": {
    "totalHours": 145.5,
    "entriesCount": 42
  },
  "byUser": [
    {
      "user": {
        "id": "user_cuid123",
        "firstName": "John",
        "lastName": "Doe"
      },
      "totalHours": 85.5,
      "entriesCount": 25
    },
    {
      "user": {
        "id": "user_cuid456",
        "firstName": "Jane",
        "lastName": "Smith"
      },
      "totalHours": 60.0,
      "entriesCount": 17
    }
  ],
  "byTask": [
    {
      "task": {
        "id": "task_cuid123",
        "title": "Implement user authentication"
      },
      "totalHours": 45.5,
      "entriesCount": 12
    },
    {
      "task": {
        "id": "task_cuid456",
        "title": "Build API endpoints"
      },
      "totalHours": 38.0,
      "entriesCount": 10
    }
  ]
}
```

**Reference:** `d:\codes\time-entry\backend\src\time-entries\time-entries.controller.ts` (lines 42-47)

---

## Common Response Codes

- `200 OK` - Successful GET, PATCH, DELETE
- `201 Created` - Successful POST
- `400 Bad Request` - Validation errors, invalid data
- `401 Unauthorized` - Missing or invalid authentication token
- `403 Forbidden` - User doesn't have permission
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource conflict (e.g., duplicate slug)
- `500 Internal Server Error` - Server error

## Notes

1. All endpoints require authentication except health checks
2. Organization context is automatically resolved from user's membership if not provided
3. Date/time fields use ISO 8601 format (e.g., `2025-01-07T09:00:00Z`)
4. All IDs are CUID format
5. Soft deletes use `isActive` flag; hard deletes remove the record
6. Maximum 4 hours per time entry is enforced at validation level

For detailed error codes, see `docs/02-backend/04-api/3-error_codes.md`
