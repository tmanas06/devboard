# API Error Codes

## Overview

The Time Entry API uses standard HTTP status codes and provides detailed error messages in the response body to help identify and resolve issues quickly.

## Error Response Format

All error responses follow this standard format:

```json
{
  "statusCode": 400,
  "message": "Error message or array of validation errors",
  "error": "Error type"
}
```

**Single Error Example:**
```json
{
  "statusCode": 404,
  "message": "User not found",
  "error": "Not Found"
}
```

**Validation Errors Example:**
```json
{
  "statusCode": 400,
  "message": [
    "name must be longer than or equal to 2 characters",
    "slug must contain only lowercase letters, numbers, and hyphens"
  ],
  "error": "Bad Request"
}
```

---

## HTTP Status Codes

### 2xx Success

#### 200 OK
Successful GET, PATCH, or DELETE request.

**Example:**
```json
{
  "id": "user_cuid123",
  "email": "user@example.com",
  "firstName": "John"
}
```

#### 201 Created
Successful POST request that creates a new resource.

**Example:**
```json
{
  "id": "org_cuid123",
  "name": "Acme Corporation",
  "slug": "acme-corp",
  "createdAt": "2025-01-07T00:00:00.000Z"
}
```

---

### 4xx Client Errors

#### 400 Bad Request

Validation errors or invalid request data.

**Common Causes:**
- Missing required fields
- Invalid data format
- Validation constraint violations
- Business logic violations

**Example Scenarios:**

**Missing Required Field:**
```json
{
  "statusCode": 400,
  "message": [
    "title should not be empty",
    "title must be a string"
  ],
  "error": "Bad Request"
}
```

**Time Entry Hours Exceeded:**
```json
{
  "statusCode": 400,
  "message": "Maximum 4 hours allowed per entry",
  "error": "Bad Request"
}
```

**Invalid Time Range:**
```json
{
  "statusCode": 400,
  "message": "End time must be after start time",
  "error": "Bad Request"
}
```

**Invalid Email Format:**
```json
{
  "statusCode": 400,
  "message": [
    "email must be an email"
  ],
  "error": "Bad Request"
}
```

**Invalid Enum Value:**
```json
{
  "statusCode": 400,
  "message": [
    "status must be one of the following values: TODO, IN_PROGRESS, DONE"
  ],
  "error": "Bad Request"
}
```

**String Length Violation:**
```json
{
  "statusCode": 400,
  "message": [
    "title must be longer than or equal to 3 characters",
    "title must be shorter than or equal to 255 characters"
  ],
  "error": "Bad Request"
}
```

**Number Range Violation:**
```json
{
  "statusCode": 400,
  "message": [
    "hours must not be less than 0.1",
    "hours must not be greater than 4"
  ],
  "error": "Bad Request"
}
```

**Reference:** `d:\codes\time-entry\backend\src\time-entries\dto\create-time-entry.dto.ts` (lines 43-44)

---

#### 401 Unauthorized

Authentication failed or token is missing/invalid.

**Common Causes:**
- Missing `Authorization` header
- Invalid JWT token
- Expired JWT token
- Token verification failed with Clerk

**Example:**
```json
{
  "statusCode": 401,
  "message": "No token provided",
  "error": "Unauthorized"
}
```

```json
{
  "statusCode": 401,
  "message": "Invalid token",
  "error": "Unauthorized"
}
```

```json
{
  "statusCode": 401,
  "message": "User not found or inactive",
  "error": "Unauthorized"
}
```

**How to Fix:**
- Ensure `Authorization: Bearer <token>` header is included
- Verify token is valid and not expired
- Re-authenticate with Clerk if token is expired

**Reference:** `d:\codes\time-entry\backend\src\auth\auth.guard.ts` (lines 29-31, 77-79)

---

#### 403 Forbidden

User is authenticated but doesn't have permission to access the resource.

**Common Causes:**
- Insufficient role privileges
- Attempting to access another organization's data
- User account is inactive

**Example:**
```json
{
  "statusCode": 403,
  "message": "You do not have access to the requested organization",
  "error": "Forbidden"
}
```

```json
{
  "statusCode": 403,
  "message": "Only ORG_ADMIN users can create organizations",
  "error": "Forbidden"
}
```

**How to Fix:**
- Verify user role has required permissions
- Ensure correct organization context is set
- Contact organization admin for role upgrade if needed

**Reference:** `d:\codes\time-entry\backend\src\auth\auth.guard.ts` (lines 102-106)

---

#### 404 Not Found

Requested resource does not exist.

**Common Causes:**
- Invalid resource ID
- Resource was deleted
- Resource belongs to different organization

**Example Scenarios:**

**User Not Found:**
```json
{
  "statusCode": 404,
  "message": "User not found",
  "error": "Not Found"
}
```

**Organization Not Found:**
```json
{
  "statusCode": 404,
  "message": "Organization not found",
  "error": "Not Found"
}
```

**Task Not Found:**
```json
{
  "statusCode": 404,
  "message": "Task not found",
  "error": "Not Found"
}
```

**Time Entry Not Found:**
```json
{
  "statusCode": 404,
  "message": "Time entry not found",
  "error": "Not Found"
}
```

**Membership Not Found:**
```json
{
  "statusCode": 404,
  "message": "Not a member of this organization",
  "error": "Not Found"
}
```

**How to Fix:**
- Verify the resource ID is correct
- Check if resource belongs to current organization context
- Ensure resource wasn't deleted

---

#### 409 Conflict

Request conflicts with current state of the server.

**Common Causes:**
- Duplicate unique field (e.g., organization slug, email)
- User already member of organization
- Resource state conflict

**Example Scenarios:**

**Duplicate Organization Slug:**
```json
{
  "statusCode": 409,
  "message": "Organization with this slug already exists",
  "error": "Conflict"
}
```

**Already Organization Member:**
```json
{
  "statusCode": 409,
  "message": "Already a member of this organization",
  "error": "Conflict"
}
```

**How to Fix:**
- Use a different unique value (e.g., different slug)
- Check existing memberships before joining
- Verify resource doesn't already exist

---

### 5xx Server Errors

#### 500 Internal Server Error

Unexpected server error occurred.

**Common Causes:**
- Database connection issues
- Unhandled exceptions
- External service failures (Clerk API)
- Code bugs

**Example:**
```json
{
  "statusCode": 500,
  "message": "Internal server error",
  "error": "Internal Server Error"
}
```

**How to Fix:**
- Contact system administrator
- Check server logs for details
- Retry the request after a moment
- Report to development team if persistent

---

## Validation Error Details

### Field Validation Constraints

#### Organization

**name:**
- Required
- String
- Min length: 2 characters
- Max length: 100 characters

**slug:**
- Required
- String
- Min length: 2 characters
- Max length: 50 characters
- Pattern: `^[a-z0-9-]+$` (lowercase letters, numbers, hyphens only)

**Reference:** `d:\codes\time-entry\backend\src\organizations\dto\create-organization.dto.ts`

---

#### Task

**title:**
- Required
- String
- Min length: 3 characters
- Max length: 255 characters

**description:**
- Optional
- String

**status:**
- Optional
- Enum: `TODO`, `IN_PROGRESS`, `DONE`

**priority:**
- Optional
- Enum: `LOW`, `MEDIUM`, `HIGH`, `URGENT`

**estimatedHours:**
- Optional
- Number

**dueDate:**
- Optional
- ISO 8601 date string

**assignedToIds:**
- Optional
- Array of strings

**Reference:** `d:\codes\time-entry\backend\src\tasks\dto\create-task.dto.ts`

---

#### Time Entry

**startTime:**
- Required
- ISO 8601 date string

**endTime:**
- Required
- ISO 8601 date string

**hours:**
- Required
- Number
- Min: 0.1
- Max: 4.0
- Error message: "Maximum 4 hours allowed per entry"

**description:**
- Optional
- String

**taskIds:**
- Optional
- Array of strings

**isBillable:**
- Optional
- Boolean

**Reference:** `d:\codes\time-entry\backend\src\time-entries\dto\create-time-entry.dto.ts`

---

#### User Organization Membership

**organizationId:**
- Required
- String
- Must be valid organization ID

**role:**
- Optional
- Enum: `ORG_ADMIN`, `MEMBER`
- Default: `MEMBER`

**Reference:** `d:\codes\time-entry\backend\src\users\dto\join-organization.dto.ts`

---

## Common Error Scenarios & Solutions

### Authentication Errors

**Problem:** Getting 401 Unauthorized
**Solutions:**
1. Verify Authorization header format: `Authorization: Bearer <token>`
2. Check token is not expired
3. Ensure user account is active
4. Re-authenticate with Clerk

---

### Validation Errors

**Problem:** Getting 400 Bad Request with validation messages
**Solutions:**
1. Review validation constraints for each field
2. Ensure all required fields are provided
3. Verify data types match expected types
4. Check string lengths and number ranges
5. Validate enum values against allowed options

---

### Organization Context Errors

**Problem:** Getting 403 Forbidden for organization resources
**Solutions:**
1. Verify user is member of organization
2. Check user role has required permissions
3. Set correct `x-organization-id` header if needed
4. Ensure organization is active

---

### Time Entry Validation

**Problem:** "Maximum 4 hours allowed per entry"
**Solutions:**
1. Split work into multiple entries if > 4 hours
2. Ensure hours field is d 4.0
3. Verify startTime and endTime don't exceed 4 hours

---

### Resource Not Found

**Problem:** Getting 404 Not Found
**Solutions:**
1. Verify resource ID is correct and in CUID format
2. Check resource exists in current organization
3. Ensure resource wasn't soft-deleted (isActive = false)
4. Confirm user has access to organization

---

## Error Handling Best Practices

### For API Consumers

1. **Always check status codes** before processing response
2. **Handle validation errors** by displaying messages to user
3. **Retry 500 errors** with exponential backoff
4. **Re-authenticate on 401** to get fresh token
5. **Log errors** for debugging purposes
6. **Show user-friendly messages** instead of raw error text

### Example Error Handling (JavaScript)

```javascript
try {
  const response = await api.post('/time-entries', data);
  return response.data;
} catch (error) {
  if (error.response) {
    const { status, data } = error.response;

    switch (status) {
      case 400:
        // Display validation errors to user
        const messages = Array.isArray(data.message)
          ? data.message
          : [data.message];
        showValidationErrors(messages);
        break;

      case 401:
        // Re-authenticate
        await refreshToken();
        // Retry request
        break;

      case 404:
        showNotification('Resource not found');
        break;

      case 409:
        showNotification('Resource already exists');
        break;

      case 500:
        // Log and retry
        console.error('Server error:', data);
        retryWithBackoff();
        break;
    }
  }
}
```

---

## Related Documentation

- API Overview: `docs/02-backend/04-api/1-overview.md`
- API Endpoints: `docs/02-backend/04-api/2-endpoints.md`
- Authentication: `d:\codes\time-entry\backend\src\auth\auth.guard.ts`
- Validation DTOs: `d:\codes\time-entry\backend\src\**\dto\*.dto.ts`
