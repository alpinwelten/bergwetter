import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';

// Only DOM plumbing is stubbed; the app's actual rendering and calculations run.
const element = () => ({ innerHTML:'', style:{}, addEventListener(){}, querySelector:element, querySelectorAll:()=>[] });
const context = vm.createContext({ document:{ querySelector:element, createElement:element, addEventListener(){} }, localStorage:{getItem:()=>null} });
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1].split('// --- Init ')[0], context);
const render = (name, h, elev=2000) => context[name](h,0,elev).innerHTML;
function hourly(models, count=13) {
  const h={time:Array.from({length:count},(_,i)=>`2026-09-05T${String(i).padStart(2,'0')}:00`)};
  for(const [id,vars] of Object.entries(models)) for(const [key,value] of Object.entries(vars)) h[`${key}_${id}`]=Array.isArray(value)?value:Array(count).fill(value);
  return h;
}
test('single freezing model cannot claim agreement',()=>{
  const out=render('renderFreezing',hourly({icon_d2:{freezing_level_height:2500}}));
  assert.doesNotMatch(out,/verlässlich|Enge Übereinstimmung|· Konsens/);
  assert.match(out,/keine Vergleichsbasis/i);
});
test('Best-Match must not add an independent vote to freezing mean',()=>{
  const out=render('renderFreezing',hourly({best_match:{freezing_level_height:1000},icon_d2:{freezing_level_height:2000},meteoswiss_icon_ch1:{freezing_level_height:3000}}));
  assert.match(out,/>2\.500<\/span>/);
});
test('missing precipitation cannot count as dry agreement',()=>{
  const out=render('renderReliability',hourly({icon_d2:{temperature_2m:5},meteoswiss_icon_ch1:{temperature_2m:5}}));
  assert.doesNotMatch(out,/Verlässlich|kein Niederschlag|alle trocken|Hohe Übereinstimmung/);
  assert.match(out,/unvollständig|Daten fehlen/i);
});
test('short horizon cannot claim a complete twelve hour comparison',()=>{
  const out=render('renderReliability',hourly({icon_d2:{temperature_2m:5,precipitation:0},meteoswiss_icon_ch1:{temperature_2m:5,precipitation:0}},3));
  assert.match(out,/unvollständig/i);
});
test('complete dry forecasts describe agreement rather than reliability',()=>{
  const out=render('renderReliability',hourly({icon_d2:{temperature_2m:5,precipitation:0},meteoswiss_icon_ch1:{temperature_2m:6,precipitation:0}}));
  assert.match(out,/Hohe Übereinstimmung/);
  assert.doesNotMatch(out,/Verlässlich/);
});
test('wet versus dry remains a disagreement',()=>{
  const out=render('renderReliability',hourly({icon_d2:{temperature_2m:5,precipitation:1},meteoswiss_icon_ch1:{temperature_2m:6,precipitation:0}}));
  assert.match(out,/Niederschlag.*uneinig/i);
});
test('snow estimate cannot assert snow at a dry location',()=>{
  const out=render('renderFreezing',hourly({icon_d2:{freezing_level_height:2000,precipitation:0}}),2500);
  assert.doesNotMatch(out,/Schnee bis zum Standort|am Standort eher Regen/);
  assert.match(out,/grobe Schätzung/i);
});
test('zero freezing models show missing data without agreement',()=>{
  const out=render('renderFreezing',hourly({}));
  assert.match(out,/Kein Modell/);
  assert.doesNotMatch(out,/verlässlich|Enge Übereinstimmung/);
});
test('rain only in the last coming hour cannot be counted as dry agreement',()=>{
 const h=hourly({icon_d2:{temperature_2m:5,precipitation:0},meteoswiss_icon_ch1:{temperature_2m:5,precipitation:0}},13);
 h.precipitation_icon_d2[12]=1;
 assert.match(render('renderReliability',h),/uneinig/i);
});
test('past-hour rain does not enter the coming twelve-hour comparison',()=>{
 const h=hourly({icon_d2:{temperature_2m:5,precipitation:0},meteoswiss_icon_ch1:{temperature_2m:5,precipitation:0}},13);
 h.precipitation_icon_d2[0]=1;
 assert.doesNotMatch(render('renderReliability',h),/uneinig/i);
});
test('missing wind cannot imply negligible wind effect',()=>{
 const card=context.renderWind(null,null,null,null,null,null);
 assert.doesNotMatch(card.innerHTML,/kaum Windeinfluss/);
});
