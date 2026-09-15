export type PlatformRole = "super_admin" | "staff" | "client"
export type OrgRole = "admin" | "member"
export type OrgStatus = "active" | "suspended"
export type ProjectStatus = "active" | "on_hold" | "completed" | "archived"
export type IssueType = "ticket" | "task" | "bug" | "feature"
export type IssuePriority = "low" | "medium" | "high" | "urgent"
export type InviteStatus = "pending" | "accepted" | "revoked" | "expired"

export type Profile = {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  platform_role: PlatformRole
  created_at: string
  updated_at: string
}

export type Organization = {
  id: string
  name: string
  slug: string
  logo_url: string | null
  status: OrgStatus
  created_at: string
  updated_at: string
}

export type OrgMember = {
  id: string
  org_id: string
  user_id: string
  role: OrgRole
  created_at: string
}

export type OrgInvite = {
  id: string
  org_id: string
  email: string
  role: OrgRole
  invited_by: string | null
  token: string
  status: InviteStatus
  created_at: string
  expires_at: string
}

export type Project = {
  id: string
  org_id: string
  name: string
  description: string | null
  status: ProjectStatus
  is_support_project: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export type BoardColumn = {
  id: string
  project_id: string
  name: string
  position: number
  color: string
  is_done_column: boolean
  created_at: string
}

export type Issue = {
  id: string
  org_id: string
  project_id: string
  column_id: string
  type: IssueType
  title: string
  description: string | null
  priority: IssuePriority
  reporter_id: string | null
  assignee_id: string | null
  position: number
  due_date: string | null
  resolved_at: string | null
  created_at: string
  updated_at: string
}

export type IssueComment = {
  id: string
  issue_id: string
  author_id: string | null
  body: string
  is_internal: boolean
  created_at: string
  updated_at: string
}

export type Attachment = {
  id: string
  org_id: string
  issue_id: string | null
  comment_id: string | null
  file_name: string
  file_path: string
  file_size: number
  content_type: string | null
  uploaded_by: string | null
  created_at: string
}

export type KbCategory = {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  position: number
  created_at: string
}

export type KbArticle = {
  id: string
  category_id: string | null
  org_id: string | null
  title: string
  slug: string
  excerpt: string | null
  content: string
  is_published: boolean
  view_count: number
  author_id: string | null
  created_at: string
  updated_at: string
}

export type AppNotification = {
  id: string
  user_id: string
  org_id: string | null
  type: string
  title: string
  body: string | null
  link: string | null
  is_read: boolean
  created_at: string
}

type Relationships = []

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Partial<Profile> & { id: string; email: string }
        Update: Partial<Profile>
        Relationships: Relationships
      }
      organizations: {
        Row: Organization
        Insert: Partial<Organization> & { name: string; slug: string }
        Update: Partial<Organization>
        Relationships: Relationships
      }
      org_members: {
        Row: OrgMember
        Insert: Partial<OrgMember> & { org_id: string; user_id: string }
        Update: Partial<OrgMember>
        Relationships: Relationships
      }
      org_invites: {
        Row: OrgInvite
        Insert: Partial<OrgInvite> & { org_id: string; email: string }
        Update: Partial<OrgInvite>
        Relationships: Relationships
      }
      projects: {
        Row: Project
        Insert: Partial<Project> & { org_id: string; name: string }
        Update: Partial<Project>
        Relationships: Relationships
      }
      board_columns: {
        Row: BoardColumn
        Insert: Partial<BoardColumn> & { project_id: string; name: string }
        Update: Partial<BoardColumn>
        Relationships: Relationships
      }
      issues: {
        Row: Issue
        Insert: Partial<Issue> & { org_id: string; project_id: string; column_id: string; title: string }
        Update: Partial<Issue>
        Relationships: Relationships
      }
      issue_comments: {
        Row: IssueComment
        Insert: Partial<IssueComment> & { issue_id: string; body: string }
        Update: Partial<IssueComment>
        Relationships: Relationships
      }
      attachments: {
        Row: Attachment
        Insert: Partial<Attachment> & { org_id: string; file_name: string; file_path: string }
        Update: Partial<Attachment>
        Relationships: Relationships
      }
      kb_categories: {
        Row: KbCategory
        Insert: Partial<KbCategory> & { name: string; slug: string }
        Update: Partial<KbCategory>
        Relationships: Relationships
      }
      kb_articles: {
        Row: KbArticle
        Insert: Partial<KbArticle> & { title: string; slug: string }
        Update: Partial<KbArticle>
        Relationships: Relationships
      }
      notifications: {
        Row: AppNotification
        Insert: Partial<AppNotification> & { user_id: string; type: string; title: string }
        Update: Partial<AppNotification>
        Relationships: Relationships
      }
    }
    Views: Record<string, never>
    Functions: {
      seed_default_columns: { Args: { p_project_id: string }; Returns: void }
      increment_kb_view_count: { Args: { p_article_id: string }; Returns: void }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
