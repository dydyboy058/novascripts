import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const dataDir = path.resolve("data");
fs.mkdirSync(dataDir, {recursive:true});

const db = new Database(path.join(dataDir,"novascripts.db"));
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS scripts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  game TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  code TEXT NOT NULL,
  tags TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'Working',
  rating REAL NOT NULL DEFAULT 5,
  views INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`);

const count = db.prepare("SELECT COUNT(*) AS n FROM scripts").get().n;
if (!count) {
  const insert = db.prepare(`
    INSERT INTO scripts(title,game,description,code,tags,status,rating,views)
    VALUES(?,?,?,?,?,?,?,?)
  `);
  const seed = [
    ["Blox Fruits — Orion","Blox Fruits","Фарм, телепорт, квесты и удобное меню.","-- Put your script here\nprint('Demo script')",["Farm","Teleport","UI"],"Working",4.9,12800],
    ["Pet Simulator 99","Pet Simulator","Утилиты для коллекционирования и фарма.","-- Put your script here\nprint('Demo script')",["Pets","Farm","Eggs"],"Working",4.7,15100],
    ["Murder Mystery 2","MM2","Минималистичный интерфейс с полезными функциями.","-- Put your script here\nprint('Demo script')",["ESP","Utility"],"Working",4.9,9200]
  ];
  const tx=db.transaction(()=>seed.forEach(s=>insert.run(s[0],s[1],s[2],s[3],JSON.stringify(s[4]),s[5],s[6],s[7])));
  tx();
}
export default db;
