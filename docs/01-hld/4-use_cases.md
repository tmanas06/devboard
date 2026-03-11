# Use Cases

## UC-1: User Registration and Onboarding

**Actor**: New User

**Preconditions**: None

**Main Flow**:
1. User clicks "Sign Up" on landing page
2. System redirects to Clerk sign-up page
3. User provides email and password (or uses SSO)
4. Clerk creates user account
5. System redirects to onboarding page
6. User provides first name, last name
7. User either creates a new organization or joins existing organization
8. System completes onboarding
9. User is redirected to dashboard

**Postconditions**: User account created, user associated with organization, user can access dashboard

**Alternative Flows**:
- 7a: User creates new organization
  - User provides organization name
  - System generates unique slug
  - User becomes ORG_ADMIN
- 7b: User joins existing organization
  - User provides organization slug
  - System verifies organization exists
  - User becomes MEMBER

---

## UC-2: Create Organization

**Actor**: Authenticated User

**Preconditions**: User is authenticated

**Main Flow**:
1. User navigates to Organizations page
2. User clicks "Create Organization"
3. User provides organization name
4. System validates name and generates unique slug
5. System creates organization
6. System adds user as ORG_ADMIN
7. System displays success message

**Postconditions**: New organization created, user is ORG_ADMIN

**Alternative Flows**:
- 4a: Slug already exists
  - System appends number to make slug unique
  - Continue to step 5

---

## UC-3: Create Task

**Actor**: Authenticated User (MEMBER, ORG_ADMIN, ADMIN)

**Preconditions**: User is member of an organization

**Main Flow**:
1. User navigates to Tasks page
2. User clicks "Create Task"
3. User provides task details:
   - Title (required)
   - Description (optional)
   - Priority (default: MEDIUM)
   - Status (default: TODO)
   - Estimated hours (optional)
   - Due date (optional)
   - Assigned users (optional)
4. User submits form
5. System validates input
6. System creates task
7. System displays success message and updates task list

**Postconditions**: New task created and visible in task list

**Alternative Flows**:
- 5a: Validation fails
  - System displays error messages
  - User corrects input
  - Return to step 4

---

## UC-4: Log Time Entry

**Actor**: Authenticated User

**Preconditions**: User is member of an organization

**Main Flow**:
1. User navigates to Time Entries page
2. User clicks "Log Time"
3. User provides time entry details:
   - Start time (required)
   - End time (required)
   - Description (optional)
   - Associated tasks (optional, multiple)
   - Billable flag (default: false)
4. User submits form
5. System validates time range
6. System calculates hours
7. System creates time entry
8. System displays success message and updates time entry list

**Postconditions**: New time entry created and hours calculated

**Alternative Flows**:
- 5a: End time before start time
  - System displays error
  - User corrects input
  - Return to step 4
- 6a: Time entry spans multiple days
  - System calculates total hours correctly
  - Continue to step 7

---

## UC-5: Update Task Status

**Actor**: Authenticated User

**Preconditions**: User is member of organization, task exists

**Main Flow**:
1. User views task list
2. User selects task
3. User changes status (TODO ’ IN_PROGRESS ’ DONE)
4. System validates transition
5. System updates task status
6. System displays success message

**Postconditions**: Task status updated

**Alternative Flows**:
- 4a: User lacks permission (future RBAC refinement)
  - System displays error
  - Task remains unchanged

---

## UC-6: Assign Task to User

**Actor**: ORG_ADMIN or ADMIN

**Preconditions**: User has ORG_ADMIN or ADMIN role, task exists

**Main Flow**:
1. User opens task details
2. User clicks "Assign"
3. System displays list of organization members
4. User selects one or more members
5. User confirms assignment
6. System updates task assignments
7. System displays success message

**Postconditions**: Task assigned to selected users

**Alternative Flows**:
- 4a: No members available
  - System displays "No members to assign"
  - User cancels operation

---

## UC-7: View Time Entry Report

**Actor**: Authenticated User

**Preconditions**: User is member of organization

**Main Flow**:
1. User navigates to Reports page
2. User selects date range
3. User optionally filters by:
   - User (self or others if admin)
   - Task
   - Billable status
4. User clicks "Generate Report"
5. System queries time entries
6. System aggregates data:
   - Total hours
   - Billable hours
   - Non-billable hours
   - Hours per task
   - Hours per user
7. System displays report with visualizations

**Postconditions**: Report generated and displayed

**Alternative Flows**:
- 5a: No data for selected filters
  - System displays "No data available"
  - User adjusts filters

---

## UC-8: Join Organization

**Actor**: Authenticated User

**Preconditions**: User has completed onboarding, organization exists

**Main Flow**:
1. User navigates to Organizations page
2. User clicks "Join Organization"
3. User provides organization slug
4. System validates slug exists
5. System checks if user is already a member
6. System creates organization membership with MEMBER role
7. System displays success message

**Postconditions**: User is member of organization

**Alternative Flows**:
- 4a: Organization not found
  - System displays error
  - User corrects slug or cancels
- 5a: User already member
  - System displays "Already a member"
  - Operation cancelled

---

## UC-9: Leave Organization

**Actor**: Authenticated User (MEMBER)

**Preconditions**: User is member of organization, user is not last admin

**Main Flow**:
1. User navigates to Organizations page
2. User selects organization
3. User clicks "Leave Organization"
4. System displays confirmation dialog
5. User confirms
6. System soft-deletes organization membership (sets isActive = false)
7. System displays success message
8. User redirected to organization selection

**Postconditions**: User is no longer member of organization

**Alternative Flows**:
- 6a: User is last ORG_ADMIN
  - System displays error "Cannot leave, you are the last admin"
  - Operation cancelled

---

## UC-10: Manage Organization Members (Admin)

**Actor**: ORG_ADMIN or ADMIN

**Preconditions**: User has ORG_ADMIN or ADMIN role

**Main Flow**:
1. User navigates to Organization Settings
2. User views member list
3. User selects member
4. User can:
   - Change role (MEMBER ” ORG_ADMIN)
   - Remove member (soft delete)
5. System validates permission
6. System updates membership
7. System displays success message

**Postconditions**: Member role updated or removed

**Alternative Flows**:
- 5a: User tries to remove self as last admin
  - System displays error
  - Operation cancelled
- 5b: User lacks permission
  - System displays error
  - Operation cancelled

---

## UC-11: Filter and Search Tasks

**Actor**: Authenticated User

**Preconditions**: User is member of organization

**Main Flow**:
1. User navigates to Tasks page
2. User applies filters:
   - Status (TODO, IN_PROGRESS, DONE)
   - Priority (LOW, MEDIUM, HIGH, URGENT)
   - Assigned user
   - Due date range
3. System queries filtered tasks
4. System displays results
5. User can sort by:
   - Created date
   - Due date
   - Priority
   - Status

**Postconditions**: Filtered task list displayed

**Alternative Flows**:
- 3a: No tasks match filters
  - System displays "No tasks found"
  - User adjusts filters

---

## UC-12: Update Time Entry

**Actor**: Authenticated User

**Preconditions**: User owns the time entry

**Main Flow**:
1. User navigates to Time Entries page
2. User selects time entry
3. User clicks "Edit"
4. User modifies:
   - Start/end time
   - Description
   - Associated tasks
   - Billable flag
5. User submits changes
6. System validates input
7. System recalculates hours if time changed
8. System updates time entry
9. System displays success message

**Postconditions**: Time entry updated

**Alternative Flows**:
- 6a: Validation fails
  - System displays errors
  - User corrects input
  - Return to step 5
- 6b: User tries to edit another user's entry
  - System displays error (future RBAC)
  - Operation cancelled

---

## Actor Definitions

### New User
- Unregistered visitor to the application
- No authentication

### Authenticated User
- Registered user with Clerk account
- Has completed onboarding
- Member of at least one organization

### MEMBER
- Authenticated user with MEMBER role
- Can create tasks and time entries
- Can view organization data
- Cannot manage users or organization settings

### ORG_ADMIN
- Authenticated user with ORG_ADMIN role
- All MEMBER permissions
- Can manage organization members
- Can change member roles
- Can view all organization data

### ADMIN
- Authenticated user with ADMIN role (system-wide)
- All ORG_ADMIN permissions across all organizations
- Can access system-level features (future)

---

## Use Case Priorities

### High Priority (MVP)
- UC-1: User Registration and Onboarding
- UC-2: Create Organization
- UC-3: Create Task
- UC-4: Log Time Entry
- UC-5: Update Task Status

### Medium Priority
- UC-6: Assign Task to User
- UC-7: View Time Entry Report
- UC-8: Join Organization
- UC-9: Leave Organization
- UC-11: Filter and Search Tasks

### Low Priority (Future Enhancements)
- UC-10: Manage Organization Members
- UC-12: Update Time Entry
- Additional reporting features
- Bulk operations
- Export data
