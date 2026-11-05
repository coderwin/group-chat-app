import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

const databasePath = join(process.cwd(), "data", "chat.db");
mkdirSync(dirname(databasePath), { recursive: true });
export const db = new Database(databasePath);
db.pragma("journal_mode = WAL");
db.exec(`CREATE TABLE IF NOT EXISTS chat_rooms (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, room_id INTEGER NOT NULL, author TEXT NOT NULL, content TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (room_id) REFERENCES chat_rooms(id));`);
db.prepare("INSERT OR IGNORE INTO chat_rooms (name) VALUES (?)").run("general");

export type StoredMessage = { id: number; author: string; text: string; time: string };
export const listRooms = () => (db.prepare("SELECT name FROM chat_rooms ORDER BY id").all() as { name: string }[]).map((room) => room.name);
export const createRoom = (name: string) => db.prepare("INSERT OR IGNORE INTO chat_rooms (name) VALUES (?)").run(name);
export const getRoomId = (name: string) => (db.prepare("SELECT id FROM chat_rooms WHERE name = ?").get(name) as { id: number } | undefined)?.id;
export const listMessages = (room: string): StoredMessage[] => {
  const roomId = getRoomId(room);
  if (!roomId) return [];
  return db.prepare("SELECT id, author, content AS text, '저장됨' AS time FROM messages WHERE room_id = ? ORDER BY id").all(roomId) as StoredMessage[];
};
export const saveMessage = (room: string, author: string, text: string) => {
  const roomId = getRoomId(room);
  if (!roomId) return null;
  const result = db.prepare("INSERT INTO messages (room_id, author, content) VALUES (?, ?, ?)").run(roomId, author, text);
  return { id: Number(result.lastInsertRowid), author, text, time: "방금 전" };
};
