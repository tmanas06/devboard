# Database Migrations

## Overview

Database schema changes are managed using Prisma Migrate, which provides version-controlled, reproducible database migrations.

## Migration System

**Tool:** Prisma Migrate
**Location:** `d:\codes\time-entry\backend\prisma\migrations\`
**Schema:** `d:\codes\time-entry\backend\prisma\schema.prisma`

## Migration History

### 20251108012039_init

**Date:** November 8, 2025, 01:20:39 AM
**Type:** Initial schema creation
**Status:** Applied

**Changes:**
- Created all core tables
- Created enums (UserRole, TaskStatus, TaskPriority)
- Established foreign key relationships
- Created indexes for performance

**Tables Created:**
1. `organizations` - Multi-tenant root entity
2. `users` - Team members (with direct organization_id)
3. `tasks` - Work items (with single assigned_to_id)
4. `time_entries` - Time logs (with single task_id)
5. `tags` - Tagging system (deprecated in later migration)

**Enums Created:**
- `UserRole`: ADMIN, MANAGER, MEMBER
- `TaskStatus`: TODO, IN_PROGRESS, DONE
- `TaskPriority`: LOW, MEDIUM, HIGH, URGENT

**Key Indexes:**
```sql
CREATE INDEX "users_organization_id_idx" ON "users"("organization_id");
CREATE INDEX "users_clerk_id_idx" ON "users"("clerk_id");
CREATE INDEX "tasks_organization_id_idx" ON "tasks"("organization_id");
CREATE INDEX "tasks_assigned_to_id_idx" ON "tasks"("assigned_to_id");
CREATE INDEX "tasks_status_idx" ON "tasks"("status");
CREATE INDEX "time_entries_organization_id_idx" ON "time_entries"("organization_id");
CREATE INDEX "time_entries_user_id_idx" ON "time_entries"("user_id");
CREATE INDEX "time_entries_task_id_idx" ON "time_entries"("task_id");
CREATE INDEX "time_entries_start_time_idx" ON "time_entries"("start_time");
```

**Reference:** `d:\codes\time-entry\backend\prisma\migrations\20251108012039_init\migration.sql`

---

### 20251108110433_roles

**Date:** November 8, 2025, 11:04:33 AM
**Type:** Enum modification
**Status:** Applied

**Purpose:** Update user role system to align with organization-admin model.

**Changes:**
- Modified `UserRole` enum
- Removed `MANAGER` role
- Added `ORG_ADMIN` role

**Migration SQL:**
```sql
-- AlterEnum
BEGIN;
CREATE TYPE "UserRole_new" AS ENUM ('ADMIN', 'ORG_ADMIN', 'MEMBER');
ALTER TABLE "public"."users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "UserRole_new"
  USING ("role"::text::"UserRole_new");
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
DROP TYPE "public"."UserRole_old";
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'MEMBER';
COMMIT;
```

**Impact:**
- Existing MANAGER roles would need manual data migration
- Default role remains MEMBER
- More granular permission model with ORG_ADMIN

**Reference:** `d:\codes\time-entry\backend\prisma\migrations\20251108110433_roles\migration.sql`

---

### 20251110071053_multiple_tasks_per_time_entry

**Date:** November 10, 2025, 07:10:53 AM
**Type:** Major schema refactoring
**Status:** Applied

**Purpose:** Support many-to-many relationships and organization membership model.

**Breaking Changes:**
1. Removed direct `organization_id` and `role` from `users` table
2. Removed direct `assigned_to_id` from `tasks` table
3. Removed direct `task_id` from `time_entries` table
4. Dropped `tags` table and related join tables

**New Tables:**
1. `organization_members` - User-organization relationship with roles
2. `_AssignedTasks` - Many-to-many: Users assigned to tasks
3. `_TimeEntryTasks` - Many-to-many: Time entries linked to tasks

**Schema Changes:**

```sql
-- Dropped Columns
ALTER TABLE "users"
  DROP COLUMN "organization_id",
  DROP COLUMN "role";

ALTER TABLE "tasks"
  DROP COLUMN "assigned_to_id";

ALTER TABLE "time_entries"
  DROP COLUMN "task_id";

-- New organization_members table
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
```

**Benefits:**
- Users can belong to multiple organizations
- Tasks can be assigned to multiple users
- Time entries can be linked to multiple tasks
- Cleaner separation of concerns
- More flexible permission model

**Data Migration Required:**
- Existing user-organization relationships need migration to `organization_members`
- Task assignments need migration to `_AssignedTasks`
- Time entry-task links need migration to `_TimeEntryTasks`

**Reference:** `d:\codes\time-entry\backend\prisma\migrations\20251110071053_multiple_tasks_per_time_entry\migration.sql`

---

## Running Migrations

### Development

**Generate migration from schema changes:**
```bash
cd backend
pnpm prisma migrate dev --name descriptive_name
```

This will:
1. Compare schema.prisma with database
2. Generate SQL migration file
3. Apply migration to development database
4. Regenerate Prisma Client

**Example:**
```bash
pnpm prisma migrate dev --name add_user_avatar
```

### Production

**Apply pending migrations:**
```bash
cd backend
pnpm prisma migrate deploy
```

This will:
1. Apply all pending migrations
2. Not create new migrations
3. Safe for production use

### Reset Database (Development Only)

**Warning: Destroys all data!**

```bash
cd backend
pnpm prisma migrate reset
```

This will:
1. Drop database
2. Create database
3. Apply all migrations
4. Run seed scripts (if configured)

---

## Migration Best Practices

### 1. Always Test Migrations Locally

```bash
# Create migration
pnpm prisma migrate dev --name my_change

# Check migration SQL
cat prisma/migrations/<timestamp>_my_change/migration.sql

# Test rollback ability
pnpm prisma migrate reset
pnpm prisma migrate deploy
```

### 2. Handle Data Migrations

For destructive changes, create data migration scripts:

```typescript
// prisma/migrations/<timestamp>_my_change/data-migration.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Migrate existing data before schema changes
  const users = await prisma.user.findMany();

  for (const user of users) {
    await prisma.organizationMember.create({
      data: {
        userId: user.id,
        organizationId: user.organizationId,
        role: user.role,
      },
    });
  }
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
```

### 3. Document Breaking Changes

Always document:
- What changed
- Why it changed
- How to migrate data
- Impact on application code

### 4. Use Transactions for Complex Migrations

```sql
BEGIN;
  -- Migration statements
  ALTER TABLE ...;
  UPDATE ...;
COMMIT;
```

### 5. Create Indexes After Data Load

For large tables:
1. Load data first
2. Create indexes after
3. Improves migration performance

---

## Common Migration Scenarios

### Adding a Column

```bash
# Update schema.prisma
model User {
  // ... existing fields
  avatar String?
}

# Generate migration
pnpm prisma migrate dev --name add_user_avatar
```

### Renaming a Column

```prisma
// Use @map for database column names
model User {
  firstName String @map("first_name")
}
```

Prisma detects this as a rename if you use `@map`.

### Changing Column Type

```bash
# This may require data migration
# Prisma will generate ALTER TABLE statements
pnpm prisma migrate dev --name change_hours_to_decimal
```

### Adding Foreign Key

```prisma
model TimeEntry {
  userId String
  user   User   @relation(fields: [userId], references: [id])
}
```

### Creating Index

```prisma
model TimeEntry {
  startTime DateTime

  @@index([startTime])
}
```

---

## Migration Troubleshooting

### Migration Failed Mid-Way

```bash
# Mark migration as rolled back
pnpm prisma migrate resolve --rolled-back <migration_name>

# Fix schema
# Create new migration
pnpm prisma migrate dev --name fix_previous_migration
```

### Migration Applied But Not Tracked

```bash
# Mark as applied
pnpm prisma migrate resolve --applied <migration_name>
```

### Shadow Database Issues (Dev)

```bash
# Reset shadow database
pnpm prisma migrate dev --create-only
pnpm prisma migrate deploy
```

### Production Migration Failed

1. Don't panic
2. Check database state
3. Manual SQL to fix if needed
4. Mark migration state with `prisma migrate resolve`
5. Document incident

---

## Migration Checklist

Before deploying migrations to production:

- [ ] Tested migration locally
- [ ] Reviewed generated SQL
- [ ] Data migration script created (if needed)
- [ ] Backwards compatibility considered
- [ ] Index performance impact assessed
- [ ] Downtime requirements documented
- [ ] Rollback plan prepared
- [ ] Team notified of changes
- [ ] Application code updated for schema changes
- [ ] CI/CD pipeline configured to run migrations

---

## Related Documentation

- Schema Overview: `docs/02-backend/05-db/1-schema_overview.md`
- Prisma Migrate Docs: https://www.prisma.io/docs/concepts/components/prisma-migrate
- Schema File: `d:\codes\time-entry\backend\prisma\schema.prisma`

---

## Future Migration Considerations

### Potential Upcoming Changes

1. **Add User Profiles**
   - User bio, timezone, preferences

2. **Add Time Entry Templates**
   - Reusable time entry configurations

3. **Add Organization Settings**
   - Work hours, holidays, time entry rules

4. **Add Audit Logs**
   - Track all database changes

5. **Add Notifications**
   - User notification preferences

6. **Add Projects**
   - Group tasks into projects
   - Project-level time tracking

### Schema Optimization Ideas

1. Partition time_entries by date range (for large datasets)
2. Add materialized views for reporting
3. Implement soft delete timestamps instead of boolean
4. Add database-level time entry validation constraints
