import type { Entity } from "@api-emulator/core";

export type NotionParent =
  | { type: "workspace"; workspace: true }
  | { type: "page_id"; page_id: string }
  | { type: "database_id"; database_id: string }
  | { type: "block_id"; block_id: string };

export type NotionRichText = Array<{
  type: "text";
  text: { content: string; link?: { url: string } | null };
  plain_text: string;
  href?: string | null;
  annotations?: Record<string, boolean | string>;
}>;

export interface NotionUser extends Entity {
  object: "user";
  notion_id: string;
  type: "person" | "bot";
  name: string | null;
  avatar_url: string | null;
  person?: { email: string };
  bot?: Record<string, unknown>;
}

export interface NotionBlock extends Entity {
  object: "block";
  notion_id: string;
  parent: NotionParent;
  type: string;
  created_time: string;
  last_edited_time: string;
  created_by: { object: "user"; id: string };
  last_edited_by: { object: "user"; id: string };
  archived: boolean;
  has_children: boolean;
  [key: string]: unknown;
}

export interface NotionPage extends Entity {
  object: "page";
  notion_id: string;
  parent: NotionParent;
  created_time: string;
  last_edited_time: string;
  created_by: { object: "user"; id: string };
  last_edited_by: { object: "user"; id: string };
  archived: boolean;
  in_trash: boolean;
  url: string;
  public_url: string | null;
  properties: Record<string, unknown>;
  markdown?: string;
}

export interface NotionDatabase extends Entity {
  object: "database";
  notion_id: string;
  parent: NotionParent;
  created_time: string;
  last_edited_time: string;
  created_by: { object: "user"; id: string };
  last_edited_by: { object: "user"; id: string };
  archived: boolean;
  in_trash: boolean;
  title: NotionRichText;
  description: NotionRichText;
  properties: Record<string, unknown>;
  url: string;
  public_url: string | null;
}

export interface NotionComment extends Entity {
  object: "comment";
  notion_id: string;
  parent: { type: "page_id"; page_id: string } | { type: "block_id"; block_id: string };
  discussion_id: string;
  created_time: string;
  last_edited_time: string;
  created_by: { object: "user"; id: string };
  rich_text: NotionRichText;
}

export interface NotionWorker extends Entity {
  worker_id: string;
  workspace_id: string;
  name: string;
  status: "active" | "deleted";
  created_time: string;
  updated_time: string;
  capabilities: Array<{ key: string; name: string; type: string; description?: string }>;
}

export interface NotionWorkerRun extends Entity {
  run_id: string;
  worker_id: string;
  status: "success" | "error" | "running";
  started_at: string;
  completed_at: string | null;
  logs: string[];
}
