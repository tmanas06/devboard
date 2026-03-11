// Enums
export enum UserRole {
  ADMIN = 'ADMIN',
  ORG_ADMIN = 'ORG_ADMIN',
  MEMBER = 'MEMBER',
}

export enum TaskStatus {
  OPEN = 'OPEN',
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  IN_REVIEW = 'IN_REVIEW',
  DONE = 'DONE',
  CLOSED = 'CLOSED',
}

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

// Models
export interface Organization {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  organizationId: string;
  clerkId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  organizationId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  boardOrder: number;
  estimatedHours?: number;
  dueDate?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  assignedTo?: Array<{
    id: string;
    firstName?: string;
    lastName?: string;
    email: string;
  }>;
  blockedBy?: Array<{
    id: string;
    title: string;
    status: TaskStatus;
  }>;
  blocks?: Array<{
    id: string;
    title: string;
    status: TaskStatus;
  }>;
}

export interface TimeEntry {
  id: string;
  organizationId: string;
  userId: string;
  startTime: string;
  endTime: string;
  hours: number;
  description?: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email: string;
  };
  tasks?: Array<{
    id: string;
    title: string;
    status: TaskStatus;
  }>;
}

export interface Tag {
  id: string;
  organizationId: string;
  name: string;
  color: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// DTOs
export interface CreateTaskDto {
  organizationId?: string;
  assignedToIds?: string[];
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  estimatedHours?: number;
  dueDate?: string;
  blockedByIds?: string[];
}

export interface CreateTimeEntryDto {
  organizationId?: string;
  userId?: string;
  taskIds?: string[];
  startTime: string;
  endTime: string;
  hours: number;
  description?: string;
}

export interface CreateTagDto {
  organizationId: string;
  name: string;
  color?: string;
}

export interface TimeSummary {
  summary: {
    totalHours: number;
    entriesCount: number;
  };
  byUser: Array<{
    user: {
      id: string;
      firstName?: string;
      lastName?: string;
    };
    totalHours: number;
    entriesCount: number;
  }>;
  byTask: Array<{
    task: {
      id: string;
      title: string;
    };
    totalHours: number;
    entriesCount: number;
  }>;
}
export interface CommentAuthor {
  id: string;
  name: string;
  email: string;
}

export interface Comment {
  id: string;
  body: string;
  createdAt: string;
  author: CommentAuthor;
}

export enum ActivityAction {
  TASK_CREATED = 'TASK_CREATED',
  TASK_UPDATED = 'TASK_UPDATED',
  TASK_STATUS_CHANGED = 'TASK_STATUS_CHANGED',
  TASK_ASSIGNED = 'TASK_ASSIGNED',
  TASK_DELETED = 'TASK_DELETED',
  TASK_BULK_DELETED = 'TASK_BULK_DELETED',
  TASK_BULK_STATUS_CHANGED = 'TASK_BULK_STATUS_CHANGED',
  TASK_BULK_ASSIGNED = 'TASK_BULK_ASSIGNED',
  TIME_ENTRY_CREATED = 'TIME_ENTRY_CREATED',
  TIME_ENTRY_DELETED = 'TIME_ENTRY_DELETED',
  TIME_ENTRY_BULK_DELETED = 'TIME_ENTRY_BULK_DELETED',
  COMMENT_ADDED = 'COMMENT_ADDED',
  COMMENT_DELETED = 'COMMENT_DELETED',
}

export interface ActivityLog {
  id: string;
  organizationId: string;
  userId: string;
  action: ActivityAction;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  user?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email: string;
  };
}

export interface ActivityFeedResponse {
  items: ActivityLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

