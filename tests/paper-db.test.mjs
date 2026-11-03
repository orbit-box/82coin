import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import pg from "pg";
const url=process.env.TEST_DATABASE_URL;
test("paper futures additive migrations and safety constraints", {skip:!url}, async()=>{
 const pool=new pg.Pool({connectionString:url});
 const client=await pool.connect();
 const schema="paper_ci_"+Date.now();
 try{
  await client.query('CREATE SCHEMA "'+schema+'"');
  await client.query('SET search_path TO "'+schema+'"');
  await client.query("CREATE TABLE members(id SERIAL PRIMARY KEY, name TEXT NOT NULL DEFAULT 'Demo')");
  await client.query("INSERT INTO members(id) VALUES(1)");
  for(const file of ["db/migrations/20261019_paper_futures_v1.sql","db/migrations/20261020_paper_execution_v2.sql","db/migrations/20261103_paper_live_v3.sql"]){
   const sql=await readFile(file,"utf8");await client.query(sql);
  }
  // Idempotent migrations must be safe on every server restart.
  await client.query(await readFile("db/migrations/20261103_paper_live_v3.sql","utf8"));
  await client.query("INSERT INTO paper_accounts(member_id) VALUES(1)");
  const account=await client.query("SELECT balance_krw FROM paper_accounts WHERE member_id=1");
  assert.equal(Number(account.rows[0].balance_krw),1000000);
  const key="2a1249bd-f41a-4fb4-87c4-4348f8bc8344";
  const q=await client.query("INSERT INTO paper_positions(member_id,symbol,side,quantity,entry_price_usdt,leverage,margin_krw,opening_reference) VALUES(1,'BTCUSDT','LONG',0.005,85000,3,50000,$1) RETURNING id",[key]);
  assert.ok(Number(q.rows[0].id)>0);
  await assert.rejects(()=>client.query("INSERT INTO paper_positions(member_id,symbol,side,quantity,entry_price_usdt,leverage,margin_krw,opening_reference) VALUES(1,'BTCUSDT','SHORT',0.005,85000,3,50000,$1)",[key]));
  await client.query("INSERT INTO paper_requests(member_id,key,response) VALUES(1,$1,$2::jsonb)",[key,JSON.stringify({ok:true})]);
  await assert.rejects(()=>client.query("INSERT INTO paper_requests(member_id,key,response) VALUES(1,$1,'{}')",[key]));
  await assert.rejects(()=>client.query("UPDATE paper_accounts SET balance_krw=-1 WHERE member_id=1"));
  assert.equal(Number((await client.query("SELECT balance_krw FROM paper_accounts WHERE member_id=1")).rows[0].balance_krw),1000000);
 }finally{try{await client.query("RESET search_path");await client.query('DROP SCHEMA IF EXISTS "'+schema+'" CASCADE')}finally{client.release();await pool.end()}}
});
