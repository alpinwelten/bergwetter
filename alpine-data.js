/* Stationsmessungen und Ensembles. Keine automatische Prognosekorrektur.
   Quellen und Nutzungsbedingungen: README.md. Buildfreies Browser-Modul. */
(function(root){
  'use strict';
  const AT='https://dataset.api.hub.geosphere.at/v1/station/current/tawes-v1-10min';
  const CH_META='https://data.geo.admin.ch/ch.meteoschweiz.ogd-smn/ogd-smn_meta_stations.csv';
  const CH_NOW='https://data.geo.admin.ch/ch.meteoschweiz.messwerte-aktuell/VQHA80.csv';
  const cache=new Map();
  function number(v){if(v===null||v===undefined||String(v).trim()===''||v==='-')return null;const n=Number(v);return Number.isFinite(n)?n:null;}
  function csvObjects(text){
    const rows=[];let row=[],field='',quoted=false;
    const s=text.replace(/^\uFEFF/,'');
    for(let i=0;i<s.length;i++){
      const c=s[i];
      if(c==='"'){if(quoted&&s[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}
      else if(!quoted&&(c===';'||c==='\n')){row.push(field);field='';if(c==='\n'){rows.push(row);row=[];}}
      else if(c!=='\r'||quoted)field+=c;
    }
    if(field||row.length){row.push(field);rows.push(row);}
    const headers=rows.shift()||[];
    return rows.filter(r=>r.some(x=>x!=='')).map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]??''])));
  }
  async function request(url,encoding='json',ttl=0){
    const existing=cache.get(url);if(existing&&Date.now()-existing.fetchedAt<ttl)return existing;
    const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),12000);
    try{
      const r=await fetch(url,{signal:ctrl.signal});if(!r.ok)throw Error('HTTP '+r.status);
      const value=encoding==='json'?await r.json():new TextDecoder(encoding).decode(await r.arrayBuffer());
      const entry={fetchedAt:Date.now(),value};if(ttl)cache.set(url,entry);return entry;
    }finally{clearTimeout(timer);}
  }
  function distance(a,b){
    const rad=x=>x*Math.PI/180,dl=rad(b.lat-a.lat),dn=rad(b.lon-a.lon);
    const h=Math.sin(dl/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dn/2)**2;
    return 6371*2*Math.asin(Math.sqrt(Math.min(1,h)));
  }
  function rankStations(stations,target){
    return stations.filter(s=>[s.lat,s.lon,s.elevation].every(Number.isFinite)).map(s=>{
      const km=distance(target,s),dh=Number.isFinite(target.elevation)?s.elevation-target.elevation:null;
      // Transparent UI heuristic, not a meteorological representativeness score.
      return {...s,distance:km,heightDifference:dh,score:km/20+(dh===null?0:Math.abs(dh)/400)};
    }).filter(s=>s.distance<=100).sort((a,b)=>a.score-b.score||a.distance-b.distance).slice(0,12);
  }
  function catalogAT(d){return (d.stations||[]).filter(s=>s.is_active).map(s=>({provider:'AT',id:String(s.id),name:s.name,lat:number(s.lat),lon:number(s.lon),elevation:number(s.altitude),exposure:'Exposition nicht in diesen Metadaten angegeben'}));}
  function catalogCH(text){return csvObjects(text).map(s=>({provider:'CH',id:s.station_abbr,name:s.station_name,lat:number(s.station_coordinates_wgs84_lat),lon:number(s.station_coordinates_wgs84_lon),elevation:number(s.station_height_masl),exposure:s.station_exposition_de||'Exposition unbekannt'}));}
  async function stationCandidates(target){
    const result=await Promise.allSettled([request(AT+'/metadata','json',86400000).then(r=>catalogAT(r.value)),request(CH_META,'windows-1252',86400000).then(r=>catalogCH(r.value))]);
    const stations=result.flatMap(r=>r.status==='fulfilled'?r.value:[]);
    return {stations:rankStations(stations,target),failed:result.flatMap((r,i)=>r.status==='rejected'?[i===0?'GeoSphere Austria':'MeteoSchweiz']:[])};
  }
  function parseATObservation(d,id){
    const f=d.features?.find(f=>String(f.properties?.station)===String(id));if(!f)return null;
    const i=(d.timestamps?.length||0)-1,p=f.properties.parameters||{};
    const value=(key,unit,mult=1)=>p[key]?.unit===unit&&number(p[key]?.data?.[i])!==null?number(p[key].data[i])*mult:null;
    return {time:Date.parse(d.timestamps?.[i]),temperature:value('TL','°C'),wind:value('FF','m/s',3.6),gust:value('FFX','m/s',3.6),direction:value('DD','°'),precipitation:value('RR','mm')};
  }
  function parseCHObservation(r){
    if(!r)return null;const t=r.Date||'';
    const time=/^\d{12}$/.test(t)?Date.parse(`${t.slice(0,4)}-${t.slice(4,6)}-${t.slice(6,8)}T${t.slice(8,10)}:${t.slice(10,12)}:00Z`):NaN;
    return {time,temperature:number(r.tre200s0),wind:number(r.fu3010z0),gust:number(r.fu3010z1),direction:number(r.dkl010z0),precipitation:number(r.rre150z0)};
  }
  async function observation(station){
    let entry,obs;
    if(station.provider==='AT'){
      entry=await request(AT+'?parameters=TL,FF,FFX,DD,RR&station_ids='+encodeURIComponent(station.id),'json',600000);
      obs=parseATObservation(entry.value,station.id);
    }else if(station.provider==='CH'){
      entry=await request(CH_NOW,'utf-8',600000);
      obs=parseCHObservation(csvObjects(entry.value).find(r=>r['Station/Location']===station.id));
    }else throw Error('Unbekannte Stationsquelle');
    return obs?{...obs,fetchedAt:entry.fetchedAt}:null;
  }
  function freshness(time,now=Date.now()){
    if(!Number.isFinite(time))return 'Messzeit unbekannt';
    if(time>now)return 'Zeitstempel unplausibel';
    return now-time>30*60000?'veraltet':'innerhalb 30 min';
  }
  function members(h,variable){
    const series=new Map();
    if(Array.isArray(h[variable]))series.set(0,h[variable]);
    Object.keys(h).forEach(k=>{
      if(!k.startsWith(variable+'_member'))return;
      const suffix=k.slice((variable+'_member').length);
      if(!/^\d+$/.test(suffix))return;
      const id=Number(suffix);if(!series.has(id)&&Array.isArray(h[k]))series.set(id,h[k]);
    });
    return [...series.values()];
  }
  function quantile(values,p){
    if(!values.length)return null;const sorted=[...values].sort((a,b)=>a-b),i=(sorted.length-1)*p,lo=Math.floor(i),hi=Math.ceil(i);
    return sorted[lo]+(sorted[hi]-sorted[lo])*(i-lo);
  }
  function memberSummary(h,variable,i,expected,threshold){
    const values=members(h,variable).map(a=>a[i]).filter(Number.isFinite);
    const n=values.length,exceeding=values.filter(v=>v>=threshold).length;
    return {n,exceeding,percent:n===expected?100*exceeding/n:null,p10:n>=2?quantile(values,.1):null,p50:n>=2?quantile(values,.5):null,p90:n>=2?quantile(values,.9):null};
  }
  function windowSummary(h,variable,start,hours,expected,threshold){
    const times=h.time||[];
    const contiguous=start>=0&&Array.from({length:hours},(_,j)=>times[start+j]===times[start]+3600*j&&Number.isFinite(times[start+j])).every(Boolean);
    const complete=contiguous?members(h,variable).map(a=>a.slice(start,start+hours)).filter(a=>a.length===hours&&a.every(Number.isFinite)):[];
    const exceeding=complete.filter(a=>a.some(v=>v>=threshold)).length;
    return {completeMembers:complete.length,exceeding,percent:complete.length===expected?100*exceeding/expected:null};
  }
  function ensembleURL(target){
    const p=new URLSearchParams({latitude:target.lat,longitude:target.lon,models:'icon_d2',hourly:'temperature_2m,precipitation,wind_gusts_10m',forecast_days:3,timeformat:'unixtime',timezone:'UTC'});
    if(Number.isFinite(target.elevation))p.set('elevation',target.elevation);
    return 'https://ensemble-api.open-meteo.com/v1/ensemble?'+p;
  }
  async function ensembleMeta(){
    try{return (await request('https://api.open-meteo.com/data/dwd_icon_d2_eps/static/meta.json','json',600000)).value;}
    catch{return null;}
  }
  async function ensemble(target){
    const entry=await request(ensembleURL(target),'json',600000),d=entry.value;
    if(!Array.isArray(d.hourly?.time)||!d.hourly.time.every(Number.isFinite))throw Error('Ungültige Ensemble-Zeitachse');
    return {...d,fetchedAt:entry.fetchedAt};
  }
  root.AlpineData={number,csvObjects,distance,rankStations,catalogAT,catalogCH,stationCandidates,parseATObservation,parseCHObservation,observation,freshness,members,quantile,memberSummary,windowSummary,ensembleURL,ensemble,ensembleMeta};
})(globalThis);
