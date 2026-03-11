# Database Performance

## Overview

This document outlines database performance optimizations, query patterns, and best practices for the Time Entry application.

## Current Database Configuration

- **Database:** PostgreSQL 16.x
- **ORM:** Prisma 5.x
- **Connection Pooling:** Prisma's built-in pooling
- **Indexes:** Strategic indexes on frequently queried fields

## Indexes

### Existing Indexes

**organizations:**
- PRIMARY KEY on `id`
- UNIQUE INDEX on `slug`

**users:**
- PRIMARY KEY on `id`
- UNIQUE INDEX on `clerk_id`
- INDEX on `clerk_id` (for lookups)

**organization_members:**
- PRIMARY KEY on `id`
- UNIQUE COMPOSITE INDEX on `(user_id, organization_id)`
- INDEX on `user_id`
- INDEX on `organization_id`

**tasks:**
- PRIMARY KEY on `id`
- INDEX on `organization_id`
- INDEX on `status` (for filtering)

**time_entries:**
- PRIMARY KEY on `id`
- INDEX on `organization_id`
- INDEX on `user_id`
- INDEX on `start_time` (for date range queries)

### Index Strategy

1. **Foreign Keys** - All foreign keys are indexed for join performance
2. **Filter Fields** - Fields commonly used in WHERE clauses (status, dates)
3. **Unique Constraints** - Enforce data integrity and provide lookup optimization
4. **Composite Indexes** - Used where multiple columns are frequently queried together

**Reference:** `d:\codes\time-entry\backend\prisma\schema.prisma` (@@index directives)

---

## Query Optimization

### 1. Select Only Needed Fields

**Bad:**
```typescript
const user = await prisma.user.findUnique({
  where: { id: userId },
  include: {
    organizationMembers: {
      include: {
        organization: true,
      },
    },
    assignedTasks: true,
    timeEntries: true,
  },
});
```

**Good:**
```typescript
const user = await prisma.user.findUnique({
  where: { id: userId },
  select: {
    id: true,
    email: true,
    firstName: true,
    lastName: true,
  },
});
```

### 2. Use Pagination

**Bad:**
```typescript
const allEntries = await prisma.timeEntry.findMany({
  where: { organizationId },
});
```

**Good:**
```typescript
const entries = await prisma.timeEntry.findMany({
  where: { organizationId },
  take: 50,
  skip: page * 50,
  orderBy: { startTime: 'desc' },
});
```

### 3. Optimize Relations

**Bad:**
```typescript
// N+1 query problem
const tasks = await prisma.task.findMany({ where: { organizationId } });
for (const task of tasks) {
  const entries = await prisma.timeEntry.findMany({
    where: { tasks: { some: { id: task.id } } },
  });
}
```

**Good:**
```typescript
// Single query with include
const tasks = await prisma.task.findMany({
  where: { organizationId },
  include: {
    timeEntries: true,
  },
});
```

### 4. Use Aggregations

**Bad:**
```typescript
const entries = await prisma.timeEntry.findMany({
  where: { userId, organizationId },
});
const totalHours = entries.reduce((sum, e) => sum + e.hours, 0);
```

**Good:**
```typescript
const result = await prisma.timeEntry.aggregate({
  where: { userId, organizationId },
  _sum: {
    hours: true,
  },
});
const totalHours = result._sum.hours || 0;
```

---

## Connection Pooling

### Prisma Connection Pool

Prisma automatically manages database connections with built-in pooling.

**Default Settings:**
- Pool size based on `connection_limit` in DATABASE_URL
- Idle timeout: 10 seconds
- Connection timeout: 10 seconds

**Configuration:**
```
DATABASE_URL="postgresql://user:pass@localhost:5432/db?connection_limit=20&pool_timeout=10"
```

### Best Practices

1. **Set appropriate connection limits** based on:
   - Database server capacity
   - Application server count
   - Expected concurrent requests

2. **Monitor connection usage**:
   ```typescript
   // Check active connections
   const metrics = await prisma.$metrics.prometheus();
   ```

3. **Close connections properly**:
   ```typescript
   await prisma.$disconnect();
   ```

---

## Query Performance Patterns

### Efficient Date Range Queries

```typescript
// Use indexed start_time field
const entries = await prisma.timeEntry.findMany({
  where: {
    organizationId,
    startTime: {
      gte: new Date('2025-01-01'),
      lt: new Date('2025-02-01'),
    },
  },
  orderBy: { startTime: 'desc' },
});
```

### Efficient Organization Filtering

```typescript
// Always filter by organizationId (indexed)
const tasks = await prisma.task.findMany({
  where: {
    organizationId,
    status: 'IN_PROGRESS',
  },
  select: {
    id: true,
    title: true,
    status: true,
  },
});
```

### Efficient User Lookup

```typescript
// Use indexed clerk_id for faster lookups
const user = await prisma.user.findUnique({
  where: { clerkId },
  include: {
    organizationMembers: {
      where: { isActive: true },
      select: {
        organizationId: true,
        role: true,
      },
    },
  },
});
```

---

## Reporting Queries

### Time Summary Report

Optimized aggregation query:

```typescript
async getTimeSummary(query: QueryTimeEntriesDto, user: CurrentUserData) {
  const where = {
    organizationId: user.organizationId,
    ...(query.startDate && query.endDate && {
      startTime: {
        gte: new Date(query.startDate),
        lte: new Date(query.endDate),
      },
    }),
  };

  // Aggregate total hours
  const summary = await this.prisma.timeEntry.aggregate({
    where,
    _sum: { hours: true },
    _count: true,
  });

  // Group by user
  const byUser = await this.prisma.timeEntry.groupBy({
    by: ['userId'],
    where,
    _sum: { hours: true },
    _count: true,
  });

  return {
    summary: {
      totalHours: summary._sum.hours || 0,
      entriesCount: summary._count,
    },
    byUser,
  };
}
```

---

## Performance Monitoring

### Enable Query Logging (Development)

```typescript
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
  log      = ["query", "info", "warn", "error"]
}
```

### Slow Query Detection

```typescript
// Log slow queries
prisma.$on('query', (e) => {
  if (e.duration > 1000) {
    console.warn(`Slow query (${e.duration}ms):`, e.query);
  }
});
```

### Query Metrics

```typescript
// Track query performance
import { performance } from 'perf_hooks';

async function trackQuery<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const start = performance.now();
  try {
    return await fn();
  } finally {
    const duration = performance.now() - start;
    console.log(`Query ${name}: ${duration.toFixed(2)}ms`);
  }
}

// Usage
const users = await trackQuery('get-users', () =>
  prisma.user.findMany({ where: { organizationId } })
);
```

---

## Caching Strategies

### Application-Level Caching

Not currently implemented, but recommended for:

1. **User Profile Data**
   ```typescript
   // Cache user profile for 5 minutes
   const cachedUser = await redis.get(`user:${userId}`);
   if (cachedUser) return JSON.parse(cachedUser);

   const user = await prisma.user.findUnique({ where: { id: userId } });
   await redis.set(`user:${userId}`, JSON.stringify(user), 'EX', 300);
   return user;
   ```

2. **Organization Data**
   ```typescript
   // Cache organization data
   const org = await cache.wrap(
     `org:${orgId}`,
     () => prisma.organization.findUnique({ where: { id: orgId } }),
     { ttl: 600 } // 10 minutes
   );
   ```

3. **Static Reference Data**
   - Task statuses (enum values)
   - Priority levels
   - Organization settings

### Query Result Caching

For expensive aggregations:

```typescript
// Cache time summary for 1 minute
const cacheKey = `summary:${orgId}:${startDate}:${endDate}`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);

const summary = await prisma.timeEntry.aggregate(/* ... */);
await redis.set(cacheKey, JSON.stringify(summary), 'EX', 60);
return summary;
```

---

## Database Maintenance

### Vacuum (PostgreSQL)

```sql
-- Analyze tables for query planner
ANALYZE users;
ANALYZE tasks;
ANALYZE time_entries;
ANALYZE organization_members;

-- Full vacuum (during maintenance window)
VACUUM FULL ANALYZE;
```

### Index Maintenance

```sql
-- Rebuild indexes (if needed)
REINDEX TABLE time_entries;

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan ASC;
```

### Statistics Update

```sql
-- Update table statistics
ANALYZE users;
ANALYZE time_entries;
ANALYZE tasks;
```

---

## Scaling Considerations

### Horizontal Scaling (Read Replicas)

For high read volumes:
1. Set up PostgreSQL read replicas
2. Route read queries to replicas
3. Write queries go to primary

```typescript
// Prisma with replicas (future)
const prismaRead = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_READ_REPLICA_URL,
    },
  },
});

const prismaWrite = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});
```

### Vertical Scaling

Increase database server resources:
- CPU for complex queries
- RAM for caching
- IOPS for faster disk access

### Partitioning (Future)

For very large time_entries table:

```sql
-- Partition by month
CREATE TABLE time_entries_2025_01 PARTITION OF time_entries
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE time_entries_2025_02 PARTITION OF time_entries
  FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
```

---

## Performance Benchmarks

### Expected Query Times (Development)

| Operation | Expected Time | Notes |
|-----------|--------------|-------|
| User lookup by clerk_id | < 5ms | Indexed unique field |
| Get time entries (50 records) | < 20ms | With pagination |
| Create time entry | < 10ms | Single insert |
| Time summary aggregation | < 50ms | Organization + date range |
| Get tasks (filtered) | < 15ms | Indexed filters |

### Monitoring Thresholds

Set up alerts for:
- Queries > 1000ms (1 second)
- Connection pool exhaustion
- Database CPU > 80%
- Database disk usage > 85%

---

## Optimization Checklist

### Query Optimization
- [ ] Use `select` instead of including all fields
- [ ] Add pagination for list queries
- [ ] Avoid N+1 queries
- [ ] Use aggregations instead of fetching all records
- [ ] Filter by indexed fields (organizationId, userId, startTime)

### Index Optimization
- [ ] Index all foreign keys
- [ ] Index frequently filtered fields
- [ ] Avoid over-indexing (each index has write cost)
- [ ] Monitor unused indexes

### Connection Management
- [ ] Set appropriate connection limits
- [ ] Monitor connection pool usage
- [ ] Properly close connections
- [ ] Use connection pooling in production

### Caching
- [ ] Cache static/reference data
- [ ] Cache expensive aggregations
- [ ] Use appropriate TTL values
- [ ] Invalidate cache on updates

---

## Common Performance Issues

### Issue 1: Slow Time Entry Queries

**Symptom:** Slow response when fetching time entries

**Solution:**
1. Ensure `start_time` index exists
2. Always filter by `organizationId` (indexed)
3. Use pagination
4. Limit included relations

### Issue 2: N+1 Queries on Reports

**Symptom:** Many individual queries in reports

**Solution:**
1. Use `include` or `select` with relations
2. Use aggregations where possible
3. Batch queries using `findMany` with `where: { id: { in: ids } }`

### Issue 3: Connection Pool Exhaustion

**Symptom:** "Can't reach database server" errors

**Solution:**
1. Increase connection limit
2. Ensure connections are properly closed
3. Review long-running queries
4. Implement connection timeout

---

## Related Documentation

- Schema Overview: `docs/02-backend/05-db/1-schema_overview.md`
- Table Details: `docs/02-backend/05-db/2-table.md`
- Prisma Best Practices: https://www.prisma.io/docs/guides/performance-and-optimization

---

## Future Performance Enhancements

1. **Implement Redis Caching**
   - User profiles
   - Organization data
   - Report aggregations

2. **Add Database Connection Pool Monitoring**
   - Track active connections
   - Alert on high usage
   - Optimize pool size

3. **Implement Query Result Caching**
   - Cache expensive aggregations
   - TTL-based invalidation

4. **Add Read Replicas**
   - Separate read/write traffic
   - Scale horizontally

5. **Optimize Report Queries**
   - Materialized views
   - Pre-computed aggregations
   - Background job processing

6. **Database Partitioning**
   - Partition time_entries by date
   - Archive old data
