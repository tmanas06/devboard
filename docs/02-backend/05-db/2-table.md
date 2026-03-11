# Database Tables

## organizations

Multi-tenant root entity that isolates data between different organizations.

### Schema

```sql
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");
```

### Columns

| Column     | Type         | Nullable | Default | Description                          |
|------------|--------------|----------|---------|--------------------------------------|
| id         | TEXT         | NO       | cuid()  | Primary key (CUID)                   |
| name       | TEXT         | NO       | -       | Organization display name            |
| slug       | TEXT         | NO       | -       | URL-friendly unique identifier       |
| is_active  | BOOLEAN      | NO       | true    | Soft delete flag                     |
| created_at | TIMESTAMP(3) | NO       | now()   | Creation timestamp (milliseconds)    |
| updated_at | TIMESTAMP(3) | NO       | -       | Last update timestamp (auto-updated) |

### Constraints

- **Primary Key:** `id`
- **Unique:** `slug`

### Indexes

- `organizations_slug_key` - UNIQUE on `slug`

### Relationships

**Has Many:**
- `organization_members` (1:N) - Organization membership records
- `tasks` (1:N) - Tasks owned by this organization
- `time_entries` (1:N) - Time entries logged for this organization

### Business Rules

1. Slug must be lowercase, alphanumeric with hyphens only
2. Slug must be unique across all organizations
3. Soft deletes via `is_active` flag
4. When organization is deleted, all related records cascade delete

### Example Data

```json
{
  "id": "clw123456789",
  "name": "Acme Corporation",
  "slug": "acme-corp",
  "is_active": true,
  "created_at": "2025-01-01T00:00:00.000Z",
  "updated_at": "2025-01-07T12:00:00.000Z"
}
```

---

## users

Team members with Clerk authentication integration.

### Schema

```sql
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "clerk_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_clerk_id_key" ON "users"("clerk_id");
CREATE INDEX "users_clerk_id_idx" ON "users"("clerk_id");
```

### Columns

| Column     | Type         | Nullable | Default | Description                          |
|------------|--------------|----------|---------|--------------------------------------|
| id         | TEXT         | NO       | cuid()  | Primary key (CUID)                   |
| clerk_id   | TEXT         | NO       | -       | Clerk user ID (unique)               |
| email      | TEXT         | NO       | -       | User email address                   |
| first_name | TEXT         | YES      | NULL    | User first name                      |
| last_name  | TEXT         | YES      | NULL    | User last name                       |
| is_active  | BOOLEAN      | NO       | true    | Soft delete flag                     |
| created_at | TIMESTAMP(3) | NO       | now()   | Creation timestamp                   |
| updated_at | TIMESTAMP(3) | NO       | -       | Last update timestamp (auto-updated) |

### Constraints

- **Primary Key:** `id`
- **Unique:** `clerk_id`

### Indexes

- `users_clerk_id_key` - UNIQUE on `clerk_id`
- `users_clerk_id_idx` - INDEX on `clerk_id` (for faster lookups)

### Relationships

**Has Many:**
- `organization_members` (1:N) - Organization memberships
- `time_entries` (1:N) - Time entries logged by this user

**Many-to-Many:**
- `tasks` (N:M) - Tasks assigned to this user (via implicit join table)

### Business Rules

1. Clerk ID must be unique across all users
2. Users are created when they sign up via Clerk
3. Users can belong to multiple organizations
4. Soft deletes via `is_active` flag

### Example Data

```json
{
  "id": "clw987654321",
  "clerk_id": "user_2abcdefgh123456",
  "email": "john.doe@acme.com",
  "first_name": "John",
  "last_name": "Doe",
  "is_active": true,
  "created_at": "2025-01-01T00:00:00.000Z",
  "updated_at": "2025-01-07T12:00:00.000Z"
}
```

---

## organization_members

Join table managing user-organization relationships with roles.

### Schema

```sql
CREATE TABLE "organization_members" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'MEMBER',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "organization_members_user_id_organization_id_key"
  ON "organization_members"("user_id", "organization_id");
CREATE INDEX "organization_members_user_id_idx" ON "organization_members"("user_id");
CREATE INDEX "organization_members_organization_id_idx" ON "organization_members"("organization_id");

ALTER TABLE "organization_members"
  ADD CONSTRAINT "organization_members_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "organization_members"
  ADD CONSTRAINT "organization_members_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
```

### Columns

| Column          | Type         | Nullable | Default  | Description                          |
|-----------------|--------------|----------|----------|--------------------------------------|
| id              | TEXT         | NO       | cuid()   | Primary key (CUID)                   |
| user_id         | TEXT         | NO       | -        | Foreign key to users.id              |
| organization_id | TEXT         | NO       | -        | Foreign key to organizations.id      |
| role            | UserRole     | NO       | 'MEMBER' | User's role in organization          |
| is_active       | BOOLEAN      | NO       | true     | Soft delete flag                     |
| created_at      | TIMESTAMP(3) | NO       | now()    | Creation timestamp                   |
| updated_at      | TIMESTAMP(3) | NO       | -        | Last update timestamp                |

### Constraints

- **Primary Key:** `id`
- **Unique:** (`user_id`, `organization_id`) - User can only have one membership per organization
- **Foreign Key:** `user_id` ’ `users.id` (CASCADE)
- **Foreign Key:** `organization_id` ’ `organizations.id` (CASCADE)

### Indexes

- Unique composite index on (`user_id`, `organization_id`)
- INDEX on `user_id`
- INDEX on `organization_id`

### Enum: UserRole

```sql
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'ORG_ADMIN', 'MEMBER');
```

- `ADMIN` - System administrator
- `ORG_ADMIN` - Organization administrator
- `MEMBER` - Regular member (default)

### Business Rules

1. A user can belong to multiple organizations
2. A user can only have one active membership per organization
3. Role determines permissions within the organization
4. Cascade delete when user or organization is deleted

### Example Data

```json
{
  "id": "clw111222333",
  "user_id": "clw987654321",
  "organization_id": "clw123456789",
  "role": "ORG_ADMIN",
  "is_active": true,
  "created_at": "2025-01-01T00:00:00.000Z",
  "updated_at": "2025-01-07T12:00:00.000Z"
}
```

---

## tasks

Work items that can be assigned to users and tracked via time entries.

### Schema

```sql
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "estimated_hours" DOUBLE PRECISION,
    "due_date" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "tasks_organization_id_idx" ON "tasks"("organization_id");
CREATE INDEX "tasks_status_idx" ON "tasks"("status");

ALTER TABLE "tasks"
  ADD CONSTRAINT "tasks_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
```

### Columns

| Column          | Type         | Nullable | Default   | Description                      |
|-----------------|--------------|----------|-----------|----------------------------------|
| id              | TEXT         | NO       | cuid()    | Primary key (CUID)               |
| organization_id | TEXT         | NO       | -         | Foreign key to organizations.id  |
| title           | TEXT         | NO       | -         | Task title                       |
| description     | TEXT         | YES      | NULL      | Task description                 |
| status          | TaskStatus   | NO       | 'TODO'    | Current task status              |
| priority        | TaskPriority | NO       | 'MEDIUM'  | Task priority                    |
| estimated_hours | FLOAT        | YES      | NULL      | Estimated hours to complete      |
| due_date        | TIMESTAMP(3) | YES      | NULL      | Task due date                    |
| is_active       | BOOLEAN      | NO       | true      | Soft delete flag                 |
| created_at      | TIMESTAMP(3) | NO       | now()     | Creation timestamp               |
| updated_at      | TIMESTAMP(3) | NO       | -         | Last update timestamp            |

### Constraints

- **Primary Key:** `id`
- **Foreign Key:** `organization_id` ’ `organizations.id` (CASCADE)

### Indexes

- INDEX on `organization_id` (for filtering by organization)
- INDEX on `status` (for filtering by task status)

### Enums

**TaskStatus:**
```sql
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE');
```

**TaskPriority:**
```sql
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
```

### Relationships

**Belongs To:**
- `organization` (N:1) - Organization that owns this task

**Many-to-Many:**
- `assignedTo` (N:M) - Users assigned to this task
- `timeEntries` (N:M) - Time entries linked to this task

### Business Rules

1. Must belong to an organization
2. Can be assigned to multiple users
3. Can have multiple time entries
4. Soft deletes via `is_active` flag
5. Status follows workflow: TODO ’ IN_PROGRESS ’ DONE

### Example Data

```json
{
  "id": "clw444555666",
  "organization_id": "clw123456789",
  "title": "Implement user authentication",
  "description": "Add JWT-based authentication with Clerk",
  "status": "IN_PROGRESS",
  "priority": "HIGH",
  "estimated_hours": 8.5,
  "due_date": "2025-12-31T23:59:59.000Z",
  "is_active": true,
  "created_at": "2025-01-01T00:00:00.000Z",
  "updated_at": "2025-01-07T12:00:00.000Z"
}
```

---

## time_entries

Manual time logging entries with task linkage.

### Schema

```sql
CREATE TABLE "time_entries" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "hours" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "is_billable" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "time_entries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "time_entries_organization_id_idx" ON "time_entries"("organization_id");
CREATE INDEX "time_entries_user_id_idx" ON "time_entries"("user_id");
CREATE INDEX "time_entries_start_time_idx" ON "time_entries"("start_time");

ALTER TABLE "time_entries"
  ADD CONSTRAINT "time_entries_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "time_entries"
  ADD CONSTRAINT "time_entries_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
```

### Columns

| Column          | Type         | Nullable | Default | Description                          |
|-----------------|--------------|----------|---------|--------------------------------------|
| id              | TEXT         | NO       | cuid()  | Primary key (CUID)                   |
| organization_id | TEXT         | NO       | -       | Foreign key to organizations.id      |
| user_id         | TEXT         | NO       | -       | Foreign key to users.id              |
| start_time      | TIMESTAMP(3) | NO       | -       | Entry start timestamp                |
| end_time        | TIMESTAMP(3) | NO       | -       | Entry end timestamp                  |
| hours           | FLOAT        | NO       | -       | Hours worked (max 4)                 |
| description     | TEXT         | YES      | NULL    | Work description                     |
| is_billable     | BOOLEAN      | NO       | false   | Billable flag                        |
| created_at      | TIMESTAMP(3) | NO       | now()   | Creation timestamp                   |
| updated_at      | TIMESTAMP(3) | NO       | -       | Last update timestamp                |

### Constraints

- **Primary Key:** `id`
- **Foreign Key:** `organization_id` ’ `organizations.id` (CASCADE)
- **Foreign Key:** `user_id` ’ `users.id` (CASCADE)

### Indexes

- INDEX on `organization_id` (for filtering by organization)
- INDEX on `user_id` (for filtering by user)
- INDEX on `start_time` (for date range queries)

### Relationships

**Belongs To:**
- `organization` (N:1) - Organization this entry belongs to
- `user` (N:1) - User who logged this entry

**Many-to-Many:**
- `tasks` (N:M) - Tasks linked to this entry

### Business Rules

1. Must belong to an organization and user
2. Maximum 4 hours per entry (enforced at application level)
3. Can be linked to multiple tasks
4. Hard delete supported (no soft delete)
5. start_time must be before end_time
6. hours should match calculated difference between start_time and end_time

### Example Data

```json
{
  "id": "clw777888999",
  "organization_id": "clw123456789",
  "user_id": "clw987654321",
  "start_time": "2025-01-07T09:00:00.000Z",
  "end_time": "2025-01-07T13:00:00.000Z",
  "hours": 4.0,
  "description": "Worked on user authentication implementation",
  "is_billable": true,
  "created_at": "2025-01-07T13:05:00.000Z",
  "updated_at": "2025-01-07T13:05:00.000Z"
}
```

---

## Implicit Join Tables

### _AssignedTasks (Task-User Assignment)

Many-to-many relationship between tasks and users for task assignment.

```prisma
model Task {
  assignedTo User[] @relation("AssignedTasks")
}

model User {
  assignedTasks Task[] @relation("AssignedTasks")
}
```

### _TimeEntryTasks (TimeEntry-Task Linkage)

Many-to-many relationship between time entries and tasks.

```prisma
model TimeEntry {
  tasks Task[] @relation("TimeEntryTasks")
}

model Task {
  timeEntries TimeEntry[] @relation("TimeEntryTasks")
}
```

---

## Summary

**Total Tables:** 5 core tables + 2 implicit join tables

**Key Features:**
- Multi-tenant architecture via organizations
- Soft deletes for organizations, users, tasks, memberships
- Hard delete for time entries
- Cascade delete for referential integrity
- Indexed for query performance
- Enum types for status and priority
- CUID for IDs (sortable by creation time)

**Reference:** `d:\codes\time-entry\backend\prisma\schema.prisma`
