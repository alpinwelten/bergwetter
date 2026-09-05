import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
const source=readFileSync(new URL('../index.html',import.meta.url),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1].split('// --- Init ')[0];
function app(fetch=async()=>{throw Error('offline');}){
  const elements=new Map();
  const element=()=>({innerHTML:'',textContent:'',value:'',style:{},children:[],replaceWith(){},appendChild(e){this.children.push(e);},addEventListener(){},querySelector:element,querySelectorAll:()=>[]});
  const c=vm.createContext({URL,URLSearchParams,Intl,AbortController,setTimeout,clearTimeout,fetch,document:{querySelector(s){if(!elements.has(s))elements.set(s,element());return elements.get(s);},getElementById(){return null;},createElement:element,addEventListener(){}},localStorage:{getItem:()=>null,setItem(){}}});
  c.globalThis=c;
  vm.runInContext(readFileSync(new URL('../alpine-data.js',import.meta.url),'utf8'),c);
  vm.runInContext(readFileSync(new URL('../alpine-ui.js',import.meta.url),'utf8'),c);
  vm.runInContext(source,c);return {c,elements};
}
const {c}=app();
const point={name:'Test',lat:47.2,lon:11.4,elevation:2251,elevationSource:'manual'};
test('request passes zero and explicit target elevation, omits unknown height',()=>{
  for(const height of [0,2251]) assert.equal(new URL(c.forecastURL({...point,elevation:height})).searchParams.get('elevation'),String(height));
  for(const height of [null,undefined,NaN,Infinity]) assert.equal(new URL(c.forecastURL({...point,elevation:height})).searchParams.has('elevation'),false);
  assert.equal(new URL(c.forecastURL(point)).searchParams.get('timeformat'),'unixtime');
});
test('manual target validates coordinate range and never interprets blank height as zero',()=>{
  assert.equal(c.parseTarget('47.2','11.4','').elevation,null);
  assert.equal(c.parseTarget('47.2','11.4','0').elevation,0);
  assert.throws(()=>c.parseTarget('','11.4','2000'));
  assert.throws(()=>c.parseTarget('91','11.4','2000'));
  assert.throws(()=>c.parseTarget('47','181','2000'));
  assert.throws(()=>c.parseTarget('47','11','Infinity'));
});
test('favorite identity preserves distinct heights at the same coordinate',()=>{
  assert.notEqual(c.favKey(point),c.favKey({...point,elevation:574}));
});
test('current hour is the containing hour, not the nearest future hour',()=>{
  const h={epoch:[Date.parse('2026-09-05T08:00Z')/1000,Date.parse('2026-09-05T09:00Z')/1000]};
  assert.equal(c.currentIndex(h,Date.parse('2026-09-05T08:50Z')),0);
  assert.equal(c.currentIndex(h,Date.parse('2026-09-06T08:50Z')),-1);
});
test('UTC epoch preserves distinct repeated autumn hours and local daily dates',()=>{
  const d=c.prepareForecast({timezone:'Europe/Vienna',hourly:{time:[1792886400,1792890000]},daily:{time:[1792879200]}});
  assert.equal(d.hourly.time[0],'2026-10-25T02:00');
  assert.equal(d.hourly.time[1],'2026-10-25T02:00');
  assert.equal(d.daily.time[0],'2026-10-25');
  assert.equal(c.currentIndex(d.hourly,Date.parse('2026-10-25T01:20Z')),1);
  assert.notEqual(c.formatInstant(1792886400000,'Europe/Vienna'),c.formatInstant(1792890000000,'Europe/Vienna'));
});
test('coverage counts finite values by variable and requires twelve contiguous hours',()=>{
  const h={time:Array(3).fill('x'),epoch:[0,3600,7200],temperature_2m_icon_d2:[2,null,Infinity],precipitation_icon_d2:[0,0,0],temperature_2m_best_match:[2,2,2]};
  const a=c.coverage(h,'temperature_2m','icon_d2',0,12);
  assert.equal(a.count,1);assert.equal(a.complete,false);
  assert.equal(c.availableModels(h,'temperature_2m',0).length,1);
  assert.equal(c.coverage(h,'precipitation','icon_d2',0,12).complete,false);
  const gap={...h,epoch:[0,7200,10800]};
  assert.equal(c.coverage(gap,'precipitation','icon_d2',0,3).complete,false);
});
test('height reference keeps requested and API height separate and reports mismatch',()=>{
  const out=c.heightReference(point,{elevation:2200});
  assert.match(out,/2251/);assert.match(out,/2200/);assert.match(out,/abweich/i);
  assert.match(c.heightReference({...point,elevation:null},{elevation:2200}),/automatisch/i);
});
test('metadata never converts retrieval time or generation duration into model age',()=>{
  const out=c.modelRunText(null,Date.parse('2026-09-05T10:00Z'));
  assert.match(out,/unbekannt/i);
  assert.match(c.modelRunText({last_run_initialisation_time:1788577200,last_run_availability_time:1788582359,update_interval_seconds:10800},Date.parse('2026-09-05T10:00Z')),/UTC/);
  assert.match(c.modelRunText({last_run_initialisation_time:9999999999},Date.now()),/unbekannt/i);
});
test('metadata failure does not reject the entire metadata batch',async()=>{
  const {c}=app();const result=await c.loadModelMetadata();
  assert.equal(Object.values(result).every(v=>v===null),true);
});
function response(){
  const start=Math.floor(Date.now()/3600000)*3600;
  return {timezone:'Europe/Vienna',utc_offset_seconds:7200,elevation:2251,hourly_units:{},hourly:{time:Array.from({length:24},(_,i)=>start+i*3600),temperature_2m_best_match:Array(24).fill(5)}};
}
test('a slower previous target cannot replace the most recently requested target',async()=>{
  const pending=[];
  const {c,elements}=app(url=>!url.includes('/v1/forecast?')?Promise.reject(Error('offline')):new Promise(resolve=>pending.push(resolve)));
  const first=c.loadWeather({...point,name:'Erstes Ziel'});
  const second=c.loadWeather({...point,name:'Zweites Ziel'});
  pending[1]({ok:true,json:async()=>response()});await second;
  pending[0]({ok:true,json:async()=>response()});await first;
  assert.equal(vm.runInContext('lastData.place.name',c),'Zweites Ziel');
  assert.doesNotMatch(elements.get('#main').innerHTML,/Konnte Wetterdaten nicht laden/);
});
test('an expired time axis is not presented as a current forecast',()=>{
  const {c,elements}=app();const d=response();d.hourly.time=d.hourly.time.map(t=>t-7*86400);
  const prepared=c.prepareForecast(d);c.render(prepared,point,Date.now());
  assert.match(elements.get('#main').children[0].innerHTML,/Keine aktuelle Prognosestunde/);
  assert.equal(c.currentIndex(prepared.hourly),-1);
});
