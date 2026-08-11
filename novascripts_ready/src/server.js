import "dotenv/config";
import express from "express";
import jwt from "jsonwebtoken";
import path from "node:path";
import {fileURLToPath} from "node:url";
import db from "./db.js";

const __dirname=path.dirname(fileURLToPath(import.meta.url));
const app=express();
const PORT=process.env.PORT||3000;
const SECRET=process.env.JWT_SECRET||"dev-only-change-me";
const ADMIN_USER=process.env.ADMIN_USER||"admin";
const ADMIN_PASSWORD=process.env.ADMIN_PASSWORD||"change-me";

app.use(express.json({limit:"1mb"}));
app.use(express.static(path.join(__dirname,"../public")));

function auth(req,res,next){
  const token=(req.headers.authorization||"").replace("Bearer ","");
  try { req.admin=jwt.verify(token,SECRET); next(); }
  catch { res.status(401).json({error:"Unauthorized"}); }
}

function normalize(row){
  return {...row,tags:JSON.parse(row.tags||"[]")};
}

app.post("/api/login",(req,res)=>{
  const {username,password}=req.body||{};
  if(username!==ADMIN_USER||password!==ADMIN_PASSWORD) return res.status(401).json({error:"Неверный логин или пароль"});
  const token=jwt.sign({username,role:"admin"},SECRET,{expiresIn:"8h"});
  res.json({token});
});

app.get("/api/scripts",(req,res)=>{
  const rows=db.prepare("SELECT id,title,game,description,tags,status,rating,views,created_at,updated_at FROM scripts ORDER BY id DESC").all();
  res.json(rows.map(normalize));
});

app.get("/api/scripts/:id",(req,res)=>{
  const row=db.prepare("SELECT * FROM scripts WHERE id=?").get(req.params.id);
  if(!row) return res.status(404).json({error:"Not found"});
  db.prepare("UPDATE scripts SET views=views+1 WHERE id=?").run(req.params.id);
  res.json(normalize(row));
});

app.get("/api/admin/scripts",auth,(req,res)=>{
  res.json(db.prepare("SELECT * FROM scripts ORDER BY id DESC").all().map(normalize));
});

app.post("/api/admin/scripts",auth,(req,res)=>{
  const {title,game,description="",code,tags=[],status="Working",rating=5}=req.body||{};
  if(!title||!game||!code) return res.status(400).json({error:"Название, игра и код обязательны"});
  const info=db.prepare(`
    INSERT INTO scripts(title,game,description,code,tags,status,rating)
    VALUES(?,?,?,?,?,?,?)
  `).run(title,game,description,code,JSON.stringify(tags),status,Number(rating));
  res.status(201).json(normalize(db.prepare("SELECT * FROM scripts WHERE id=?").get(info.lastInsertRowid)));
});

app.put("/api/admin/scripts/:id",auth,(req,res)=>{
  const old=db.prepare("SELECT * FROM scripts WHERE id=?").get(req.params.id);
  if(!old) return res.status(404).json({error:"Not found"});
  const s={...normalize(old),...req.body};
  if(!s.title||!s.game||!s.code) return res.status(400).json({error:"Название, игра и код обязательны"});
  db.prepare(`
    UPDATE scripts SET title=?,game=?,description=?,code=?,tags=?,status=?,rating=?,updated_at=CURRENT_TIMESTAMP
    WHERE id=?
  `).run(s.title,s.game,s.description,s.code,JSON.stringify(s.tags||[]),s.status||"Working",Number(s.rating??5),req.params.id);
  res.json(normalize(db.prepare("SELECT * FROM scripts WHERE id=?").get(req.params.id)));
});

app.delete("/api/admin/scripts/:id",auth,(req,res)=>{
  const info=db.prepare("DELETE FROM scripts WHERE id=?").run(req.params.id);
  if(!info.changes) return res.status(404).json({error:"Not found"});
  res.json({ok:true});
});

app.get("/admin",(req,res)=>res.sendFile(path.join(__dirname,"../public/admin.html")));
app.get("/",(req,res)=>res.sendFile(path.join(__dirname,"../public/index.html")));

app.listen(PORT,()=>console.log(`NovaScripts: http://localhost:${PORT}`));
