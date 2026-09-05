import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
const context=vm.createContext({URL,URLSearchParams,TextDecoder,AbortController,setTimeout,clearTimeout});
const file=new URL('../alpine-data.js',import.meta.url);
if(existsSync(file))vm.runInContext(readFileSync(file,'utf8'),context);
const a=context.AlpineData||{};
test('CSV preserves accented names, quoted semicolons and missing values',()=>{
 const rows=a.csvObjects('\ufeffid;name;value\r\nA;"Col; Élevé";\r\nB;"Name ""B""";-\r\n');
 assert.equal(rows[0].name,'Col; Élevé');assert.equal(rows[1].name,'Name "B"');
 assert.equal(a.number(rows[0].value),null);assert.equal(a.number(rows[1].value),null);assert.equal(a.number('0'),0);
});
test('station ranking balances distance and target height without remote matches',()=>{
 const s=[{id:'tal',lat:47,lon:11,elevation:500},{id:'berg',lat:47.05,lon:11,elevation:2500},{id:'fern',lat:49,lon:11,elevation:2500}];
 const ranked=a.rankStations(s,{lat:47,lon:11,elevation:2500});
 assert.equal(ranked[0].id,'berg');assert.equal(ranked.length,2);assert.equal(ranked[0].heightDifference,0);
});
test('TAWES adapter converts only documented wind units and preserves missing precipitation',()=>{
 const d={timestamps:['2026-09-05T06:00+00:00'],features:[{properties:{station:'11126',parameters:{TL:{unit:'°C',data:[-2]},FF:{unit:'m/s',data:[10]},FFX:{unit:'m/s',data:[null]},RR:{unit:'mm',data:[null]}}}}]};
 const r=a.parseATObservation(d,'11126');assert.equal(r.wind,36);assert.equal(r.temperature,-2);assert.equal(r.gust,null);assert.equal(r.precipitation,null);assert.equal(r.time,Date.parse('2026-09-05T06:00Z'));
 assert.equal(a.parseATObservation(d,'999'),null);
});
test('Swiss measurements retain km/h and parse timestamps as UTC',()=>{
 const r=a.parseCHObservation({'Station/Location':'JUN',Date:'202609050550',tre200s0:'-1.2',fu3010z0:'36',fu3010z1:'-',rre150z0:'0'});
 assert.equal(r.wind,36);assert.equal(r.gust,null);assert.equal(r.time,Date.parse('2026-09-05T05:50Z'));assert.equal(r.precipitation,0);
});
test('measurement freshness rejects future or absent times and flags delayed data',()=>{
 const now=Date.parse('2026-09-05T06:00Z');assert.equal(a.freshness(now-40*60000,now),'veraltet');assert.equal(a.freshness(now+60000,now),'Zeitstempel unplausibel');assert.equal(a.freshness(null,now),'Messzeit unbekannt');
});
test('ensemble includes control member once and ignores unrelated model series',()=>{
 const h={temperature_2m:[0],temperature_2m_member01:[10],temperature_2m_member00:[999],temperature_2m_best_match:[888]};
 const s=a.memberSummary(h,'temperature_2m',0,20,5);
 assert.equal(s.n,2);assert.equal(s.p50,5);assert.equal(s.percent,null);assert.equal(s.exceeding,1);
});
test('complete ensemble reports raw member fraction, not all missing values as zero',()=>{
 const h={precipitation:[0]};for(let i=1;i<20;i++)h['precipitation_member'+String(i).padStart(2,'0')]=[i<10?0:1];
 const s=a.memberSummary(h,'precipitation',0,20,0.2);assert.equal(s.percent,50);assert.equal(s.n,20);
 h.precipitation_member01=[null];assert.equal(a.memberSummary(h,'precipitation',0,20,0.2).percent,null);
});
test('twelve-hour threshold excludes incomplete members and cannot claim dry on short horizon',()=>{
 const h={time:[3600,7200],wind_gusts_10m:[70,0],wind_gusts_10m_member01:[0,0]};
 const r=a.windowSummary(h,'wind_gusts_10m',0,12,2,60);assert.equal(r.completeMembers,0);assert.equal(r.percent,null);
});
test('member exceedance is evaluated per member across the complete window',()=>{
 const h={time:Array.from({length:12},(_,i)=>3600*(i+1)),wind_gusts_10m:Array(12).fill(0),wind_gusts_10m_member01:Array(12).fill(0)};
 h.wind_gusts_10m[7]=60;const r=a.windowSummary(h,'wind_gusts_10m',0,12,2,60);assert.equal(r.percent,50);assert.equal(r.completeMembers,2);
 h.time[7]+=3600;assert.equal(a.windowSummary(h,'wind_gusts_10m',0,12,2,60).percent,null);
});
test('cached ensemble keeps the original fetch timestamp',async()=>{
 let now=1000000,calls=0;
 context.Date=class extends Date{static now(){return now;}};
 context.fetch=async()=>{calls++;return {ok:true,json:async()=>({hourly:{time:[3600],temperature_2m:[1]}})};};
 const first=await a.ensemble({lat:47,lon:11,elevation:2000});now+=60000;
 const second=await a.ensemble({lat:47,lon:11,elevation:2000});
 assert.equal(calls,1);assert.equal(first.fetchedAt,1000000);assert.equal(second.fetchedAt,1000000);
});
test('ensemble metadata is cached and failures degrade to null',async()=>{
 let calls=0;context.Date=Date;
 context.fetch=async()=>{calls++;return {ok:true,json:async()=>({last_run_initialisation_time:1788598800,last_run_availability_time:1788607291,update_interval_seconds:10800})};};
 const first=await a.ensembleMeta();const second=await a.ensembleMeta();
 assert.equal(calls,1);assert.equal(first.last_run_initialisation_time,1788598800);assert.equal(second,first);
 context.fetch=async()=>{throw Error('offline');};
 assert.equal(await a.ensembleMeta(),first);
});
