export type UserRole = "admin" | "member";

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string;
  created_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  code: string;
  created_by: string;
  created_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: UserRole;
  joined_at: string;
  profile?: Profile;
}

export type Priority = "high" | "medium" | "low";

export type TaskCategory =
  | "recruitment_marketing"
  | "recruitment_sourcing"
  | "recruitment_agent_hiring"
  | "others";

export type TaskStatus = "urgent" | "pending" | "completed";

export interface Task {
  id: string;
  workspace_id: string;
  title: string;
  description: string | null;
  priority: Priority;
  status: TaskStatus;
  category: TaskCategory;
  due_date: string | null;
  created_by: string;
  assigned_to: string | null;
  is_pinned: boolean;
  is_recurring: boolean;
  recurrence_pattern: string | null;
  depends_on: string | null;
  column_order: number;
  tags: string[];
  created_at: string;
  updated_at: string;
  subtasks?: Subtask[];
  watchers?: string[];
}

export interface Subtask {
  id: string;
  task_id: string;
  title: string;
  is_completed: boolean;
  order: number;
  created_at: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  profile?: Profile;
}

export interface ActivityLog {
  id: string;
  workspace_id: string;
  task_id: string | null;
  user_id: string;
  action: string;
  metadata: Record<string, unknown>;
  created_at: string;
  profile?: Profile;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: "task_assigned" | "task_due" | "mention" | "task_completed" | "task_reopened";
  is_read: boolean;
  task_id: string | null;
  created_at: string;
}
