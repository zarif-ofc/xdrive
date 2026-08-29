import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const isVercel = process.env.VERCEL === '1' || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
const DB_PATH = isVercel ? path.join('/tmp', 'xdrive.db') : path.join(process.cwd(), 'xdrive.db');

let dbInstance: Database.Database | null = null;

export interface FileRecord {
  id: string;
  name: string;
  size: number;
  mime_type: string;
  provider: 'MEGA' | 'FILEN' | 'LOCAL';
  remote_id: string | null;
  remote_path: string | null;
  parent_id: string | null;
  is_folder: number; // 0 or 1
  created_at: string;
  updated_at: string;
}

export function getDb(): Database.Database {
  if (!dbInstance) {
    dbInstance = new Database(DB_PATH);
    dbInstance.pragma('journal_mode = WAL');
    initTables(dbInstance);
  }
  return dbInstance;
}

function initTables(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS files (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      size INTEGER NOT NULL DEFAULT 0,
      mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
      provider TEXT NOT NULL DEFAULT 'LOCAL',
      remote_id TEXT,
      remote_path TEXT,
      parent_id TEXT,
      is_folder INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (parent_id) REFERENCES files(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_files_parent_id ON files(parent_id);
    CREATE INDEX IF NOT EXISTS idx_files_provider ON files(provider);
    CREATE INDEX IF NOT EXISTS idx_files_name ON files(name);
  `);
}

export function listFiles(parentId: string | null = null, search?: string, sort: string = 'name_asc', all: boolean = false): FileRecord[] {
  const db = getDb();
  let query = `SELECT * FROM files WHERE 1=1`;
  const params: any[] = [];

  if (search && search.trim() !== '') {
    query += ` AND name LIKE ?`;
    params.push(`%${search.trim()}%`);
  } else if (!all && parentId !== 'all') {
    if (parentId === null || parentId === '' || parentId === 'root') {
      query += ` AND parent_id IS NULL`;
    } else {
      query += ` AND parent_id = ?`;
      params.push(parentId);
    }
  }

  // Folders always come first, then files sorted according to preference
  switch (sort) {
    case 'name_desc':
      query += ` ORDER BY is_folder DESC, name DESC`;
      break;
    case 'size_asc':
      query += ` ORDER BY is_folder DESC, size ASC`;
      break;
    case 'size_desc':
      query += ` ORDER BY is_folder DESC, size DESC`;
      break;
    case 'date_asc':
      query += ` ORDER BY is_folder DESC, created_at ASC`;
      break;
    case 'date_desc':
      query += ` ORDER BY is_folder DESC, created_at DESC`;
      break;
    case 'provider':
      query += ` ORDER BY is_folder DESC, provider ASC, name ASC`;
      break;
    case 'name_asc':
    default:
      query += ` ORDER BY is_folder DESC, name ASC`;
      break;
  }

  const results = db.prepare(query).all(...params) as FileRecord[];
  console.log(`[Diagnostic] listFiles(parentId=${parentId}) returned ${results.length} files. DB total records: ${(db.prepare('SELECT COUNT(*) as c FROM files').get() as any).c}`);
  return results;
}

export function getFileById(id: string): FileRecord | undefined {
  const db = getDb();
  return db.prepare(`SELECT * FROM files WHERE id = ?`).get(id) as FileRecord | undefined;
}

export function createFileRecord(data: Omit<FileRecord, 'created_at' | 'updated_at'>): FileRecord {
  const db = getDb();
  const now = new Date().toISOString();

  let parentId = data.parent_id;
  if (parentId) {
    const parentExists = db.prepare(`SELECT id FROM files WHERE id = ?`).get(parentId);
    if (!parentExists) {
      parentId = null;
    }
  }

  const record: FileRecord = {
    ...data,
    parent_id: parentId,
    created_at: now,
    updated_at: now,
  };

  db.prepare(`
    INSERT INTO files (id, name, size, mime_type, provider, remote_id, remote_path, parent_id, is_folder, created_at, updated_at)
    VALUES (@id, @name, @size, @mime_type, @provider, @remote_id, @remote_path, @parent_id, @is_folder, @created_at, @updated_at)
  `).run(record);

  return record;
}

export function updateFileRecord(id: string, updates: { name?: string; parent_id?: string | null }): FileRecord | undefined {
  const db = getDb();
  const existing = getFileById(id);
  if (!existing) return undefined;

  const now = new Date().toISOString();
  const name = updates.name !== undefined ? updates.name : existing.name;
  const parent_id = updates.parent_id !== undefined ? updates.parent_id : existing.parent_id;

  db.prepare(`
    UPDATE files SET name = ?, parent_id = ?, updated_at = ? WHERE id = ?
  `).run(name, parent_id, now, id);

  return getFileById(id);
}

export function deleteFileRecord(id: string): boolean {
  const db = getDb();
  const result = db.prepare(`DELETE FROM files WHERE id = ? OR parent_id = ?`).run(id, id);
  return result.changes > 0;
}

export function getStorageStatsFromDb(): { megaUsed: number; filenUsed: number; totalUsed: number; count: number } {
  const db = getDb();
  const row = db.prepare(`
    SELECT 
      SUM(CASE WHEN provider = 'MEGA' AND is_folder = 0 THEN size ELSE 0 END) as megaUsed,
      SUM(CASE WHEN provider = 'FILEN' AND is_folder = 0 THEN size ELSE 0 END) as filenUsed,
      SUM(CASE WHEN is_folder = 0 THEN size ELSE 0 END) as totalUsed,
      COUNT(CASE WHEN is_folder = 0 THEN 1 END) as count
    FROM files
  `).get() as any;

  return {
    megaUsed: row?.megaUsed || 0,
    filenUsed: row?.filenUsed || 0,
    totalUsed: row?.totalUsed || 0,
    count: row?.count || 0,
  };
}

export function getFolderPath(folderId: string | null): { id: string; name: string }[] {
  if (!folderId || folderId === 'root') return [];
  const db = getDb();
  const trail: { id: string; name: string }[] = [];
  let currentId: string | null = folderId;

  while (currentId) {
    const folder = db.prepare(`SELECT id, name, parent_id FROM files WHERE id = ? AND is_folder = 1`).get(currentId) as any;
    if (!folder) break;
    trail.unshift({ id: folder.id, name: folder.name });
    currentId = folder.parent_id;
  }

  return trail;
}

import { CloudFileNode } from '../storage/mega';

export function syncCloudFiles(nodes: CloudFileNode[]): number {
  console.log(`[Diagnostic] syncCloudFiles received ${nodes.length} nodes to sync.`);
  const db = getDb();
  let addedOrUpdated = 0;

  // Run everything inside a transaction for massive performance boost
  const transaction = db.transaction((fileNodes: CloudFileNode[]) => {
    // 1. Process folders first to ensure parent references resolve correctly
    const folders = fileNodes.filter((n) => n.is_folder === 1);
    const files = fileNodes.filter((n) => n.is_folder === 0);
    const allNodes = [...folders, ...files];

    for (const node of allNodes) {
      const existing = db.prepare(`SELECT id, parent_id FROM files WHERE remote_id = ? AND provider = ?`).get(node.remote_id, node.provider) as any;
      
      let parentId = null;
      if (node.parent_remote_id) {
        // Find the local id of the parent using its remote_id
        const parentRow = db.prepare(`SELECT id FROM files WHERE remote_id = ? AND provider = ?`).get(node.parent_remote_id, node.provider) as any;
        if (parentRow) parentId = parentRow.id;
      }

      if (existing) {
        // Update existing record
        db.prepare(`
          UPDATE files 
          SET name = ?, size = ?, parent_id = ?, updated_at = ?
          WHERE remote_id = ? AND provider = ?
        `).run(node.name, node.size, parentId, new Date(node.timestamp).toISOString(), node.remote_id, node.provider);
        addedOrUpdated++;
      } else {
        // Insert new record, use remote_id as the primary id to prevent collisions and make mapping easy
        const newId = `synced_${node.provider.toLowerCase()}_${node.remote_id.replace(/[^a-zA-Z0-9_-]/g, '')}`;
        db.prepare(`
          INSERT INTO files (id, name, size, mime_type, provider, remote_id, remote_path, parent_id, is_folder, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          newId,
          node.name,
          node.size,
          node.mime_type,
          node.provider,
          node.remote_id,
          node.remote_path,
          parentId,
          node.is_folder,
          new Date(node.timestamp).toISOString(),
          new Date(node.timestamp).toISOString()
        );
        addedOrUpdated++;
      }
    }
  });

  transaction(nodes);
  
  const countRecord = db.prepare(`SELECT COUNT(*) as c FROM files`).get() as any;
  console.log(`[Diagnostic] syncCloudFiles completed. Total records in DB now: ${countRecord?.c}`);
  
  return addedOrUpdated;
}
