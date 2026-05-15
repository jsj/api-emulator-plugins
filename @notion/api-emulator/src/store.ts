import { Store, type Collection } from "@api-emulator/core";
import type {
  NotionBlock,
  NotionComment,
  NotionDatabase,
  NotionPage,
  NotionUser,
  NotionWorker,
  NotionWorkerRun,
} from "./entities.js";

export interface NotionStore {
  users: Collection<NotionUser>;
  pages: Collection<NotionPage>;
  databases: Collection<NotionDatabase>;
  blocks: Collection<NotionBlock>;
  comments: Collection<NotionComment>;
  workers: Collection<NotionWorker>;
  workerRuns: Collection<NotionWorkerRun>;
}

export function getNotionStore(store: Store): NotionStore {
  return {
    users: store.collection<NotionUser>("notion.users", ["notion_id"]),
    pages: store.collection<NotionPage>("notion.pages", ["notion_id"]),
    databases: store.collection<NotionDatabase>("notion.databases", ["notion_id"]),
    blocks: store.collection<NotionBlock>("notion.blocks", ["notion_id"]),
    comments: store.collection<NotionComment>("notion.comments", ["notion_id", "discussion_id"]),
    workers: store.collection<NotionWorker>("notion.workers", ["worker_id"]),
    workerRuns: store.collection<NotionWorkerRun>("notion.worker_runs", ["run_id", "worker_id"]),
  };
}
