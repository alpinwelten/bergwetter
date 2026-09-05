/* Darstellung für separat geladene Beobachtungen und Ensembleprognosen. */
(function(root){
  'use strict';
  const A=()=>root.AlpineData;
  function block(id,title){const card=el('section','card reference');card.id=id;card.innerHTML=`<h2>${title}</h2>`;return card;}
  function stationCard(state,place){
    const card=block('stations','Stationsmessungen · Österreich / Schweiz');
    if(!state?.catalog){card.innerHTML+='<p>Stationskandidaten werden geladen …</p>';return card;}
    const {stations,failed}=state.catalog;
    if(failed.length)card.innerHTML+=`<p>Stationsverzeichnis nicht erreichbar: ${failed.map(escapeHTML).join(', ')}. Auswahl unvollständig.</p>`;
    if(!stations.length){card.innerHTML+='<p>Keine Stationskandidaten im Radius von 100 km verfügbar. Für andere Alpenregionen ist noch kein Messnetz integriert.</p>';return card;}
    card.innerHTML+=`<label for="station-choice">Station</label><select id="station-choice" class="data-select">${stations.map((s,i)=>`<option value="${i}"${i===state.stationIndex?' selected':''}>${escapeHTML(s.name)} · ${Math.round(s.elevation)} m · ${s.distance.toFixed(1).replace('.',',')} km</option>`).join('')}</select>`;
    const s=stations[state.stationIndex||0],o=state.observation;
    const exposure=s.exposure&&!/unbekannt|nicht in diesen/.test(s.exposure)?' · '+escapeHTML(s.exposure):'';
    card.innerHTML+=`<p><b>${escapeHTML(s.name)}</b> · ${s.provider==='AT'?'GeoSphere Austria':'MeteoSchweiz'}<br>${Math.round(s.elevation)} m · ${s.distance.toFixed(1).replace('.',',')} km entfernt · Höhendifferenz ${s.heightDifference===null?'unbekannt':(s.heightDifference>=0?'+':'')+Math.round(s.heightDifference)+' m'}${exposure}</p>`;
    if(state.stationError)card.innerHTML+=`<p role="status">Messdaten nicht verfügbar: ${escapeHTML(state.stationError)}</p>`;
    else if(!o)card.innerHTML+='<p>Messdaten werden geladen …</p>';
    else{
      const status=A().freshness(o.time),zone=lastData?.data.timezone||'UTC';
      card.innerHTML+=`<p><b>Gemessen</b> ${formatShort(Number.isFinite(o.time)?o.time:null,zone)}${Number.isFinite(o.time)&&o.time<=Date.now()?' · vor '+Math.floor((Date.now()-o.time)/60000)+' min':''} · ${status}</p>
      <div class="measurement-grid"><div>Temperatur<br><b>${fmt1(o.temperature,' °C')}</b></div><div>Wind · 10-min-Mittel<br><b>${fmt1(o.wind,' km/h')}</b></div><div>Böenspitze · 10 min<br><b>${fmt1(o.gust,' km/h')}</b></div><div>Niederschlag · 10 min<br><b>${fmt1(o.precipitation,' mm')}</b></div></div>
`;
    }
    card.innerHTML+=`<p>${s.provider==='AT'?'<a href="https://data.hub.geosphere.at" target="_blank" rel="noopener">Datenquelle: GeoSphere Austria</a>':'<a href="https://opendatadocs.meteoswiss.ch/de/a-data-groundbased/a1-automatic-weather-stations" target="_blank" rel="noopener">Quelle: MeteoSchweiz</a>'} · CC BY 4.0</p>`;
    card.querySelector('#station-choice').onchange=e=>{
      state.stationIndex=Number(e.target.value);state.observation=null;state.stationError=null;renderStation(state,place);void loadObservation(state,place);
    };
    return card;
  }
  function replace(id,next){const old=document.getElementById(id);if(old)old.replaceWith(next);}
  function renderStation(state,place){if(lastData?.extras===state)replace('stations',stationCard(state,place));}
  async function loadObservation(state,place){
    const index=state.stationIndex||0,station=state.catalog.stations[index];
    if(!station)return;
    const seq=(state.observationRequest||0)+1;state.observationRequest=seq;
    try{
      const obs=await A().observation(station);
      if(seq!==state.observationRequest)return;
      if(!obs)throw Error('Station liefert keinen Messdatensatz');
      state.observation=obs;state.observationLoaded=obs.fetchedAt;
    }catch(e){if(seq!==state.observationRequest)return;state.stationError=e.message;}
    renderStation(state,place);
  }
  function ensembleCard(state,place){
    const card=block('ensemble','Ensemble · ICON-D2-EPS');
    if(state?.ensembleError){card.innerHTML+=`<p role="status">Ensemble nicht verfügbar: ${escapeHTML(state.ensembleError)}. Regionale Abdeckung und Datenbereitstellung können begrenzen.</p>`;return card;}
    if(!state?.ensemble){card.innerHTML+='<p>Ensembleprognosen werden geladen …</p>';return card;}
    const d=state.ensemble,h=d.hourly,zone=lastData?.data.timezone||'UTC',now=Date.now(),hour=Math.floor(now/3600000)*3600;
    const start=h.time.findIndex(t=>t===hour+3600),threshold=state.threshold??60;
    const mainElev=Math.round(lastData?.data?.elevation),refElev=Number.isFinite(d.elevation)&&Math.round(d.elevation)!==mainElev?' · Bezugshöhe '+Math.round(d.elevation)+' m':'';
    card.innerHTML+=`<p>20 Mitglieder · Lauf ${escapeHTML(modelRunText(state.ensembleMeta,now,zone))} · Abruf ${formatShort(state.ensembleLoaded,zone)}${refElev}</p><label for="gust-threshold">Böenschwelle</label><select id="gust-threshold" class="data-select">${[30,40,50,60,70,80,100].map(t=>`<option value="${t}"${t===threshold?' selected':''}>≥ ${t} km/h</option>`).join('')}</select>`;
    if(start<0){card.innerHTML+='<p>Kein anschließender Prognosezeitraum vorhanden.</p>';}
    else{
      const wind=A().windowSummary(h,'wind_gusts_10m',start,12,20,threshold);
      const fraction=s=>s.percent===null?`unvollständig (${s.completeMembers}/20 Mitglieder)`:`${s.exceeding}/20 Mitglieder (${Math.round(s.percent)} %)`;
      card.innerHTML+=`<p><b>Böen ≥ ${threshold} km/h bis ${formatShort((hour+12*3600)*1000,zone)}:</b> ${fraction(wind)}</p>`;
      const rows=[];
      for(let i=start;i<Math.min(start+48,h.time.length);i++){
        if(h.time[i]!==h.time[start]+(i-start)*3600)break;
        const t=A().memberSummary(h,'temperature_2m',i,20,0),p=A().memberSummary(h,'precipitation',i,20,.2),w=A().memberSummary(h,'wind_gusts_10m',i,20,threshold);
        if(!t.n&&!p.n&&!w.n)break;
        const pc=s=>s.percent===null?`Lücke (${s.n}/20)`:`${Math.round(s.percent)} %`;
        rows.push(`<tr><th scope="row">${escapeHTML(formatShort(h.time[i]*1000,zone))}</th><td>${t.p50===null?'–':fmt1(t.p10)+' / <b>'+fmt1(t.p50)+'</b> / '+fmt1(t.p90)}<br><small>${t.n}/20</small></td><td>${pc(p)}</td><td>${pc(w)}</td></tr>`);
      }
      if(!rows.length)card.innerHTML+='<p>Für den nächsten Zeitraum fehlen Ensemblewerte.</p>';
      else card.innerHTML+=`<details><summary>Stundenwerte und Bandbreiten (${rows.length} h)</summary><div class="table-scroll"><table><caption>Temperatur P10 / Median / P90 (°C) · Niederschlag und Böen je Stunde vor dem Zeitstempel</caption><thead><tr><th>Zeit</th><th>Temperatur</th><th>≥ 0,2 mm/h</th><th>Böen ≥ ${threshold}</th></tr></thead><tbody>${rows.join('')}</tbody></table></div></details>`;
    }
    card.innerHTML+='<p><a href="https://open-meteo.com/en/docs/ensemble-api" target="_blank" rel="noopener">Daten: Open-Meteo / DWD, CC BY 4.0</a></p>';
    card.querySelector('#gust-threshold').onchange=e=>{state.threshold=Number(e.target.value);replace('ensemble',ensembleCard(state,place));};
    return card;
  }
  function refresh(state,place){
    if(lastData?.extras!==state)return;
    renderStation(state,place);
    const open=document.querySelector('#ensemble details')?.open;
    const next=ensembleCard(state,place);if(next.querySelector('details'))next.querySelector('details').open=!!open;
    replace('ensemble',next);
  }
  async function start(snapshot){
    const state=snapshot.extras,place={...snapshot.place,elevation:snapshot.data.elevation};
    await Promise.allSettled([
      (async()=>{
        try{state.catalog=await A().stationCandidates(place);state.stationIndex=0;renderStation(state,place);await loadObservation(state,place);}
        catch(e){state.catalog={stations:[],failed:['Stationsdienste']};renderStation(state,place);}
      })(),
      (async()=>{
        try{const [ens,meta]=await Promise.all([A().ensemble(place),A().ensembleMeta()]);state.ensemble=ens;state.ensembleMeta=meta;state.ensembleLoaded=ens.fetchedAt;}catch(e){state.ensembleError=e.message;}
        if(lastData===snapshot)replace('ensemble',ensembleCard(state,place));
      })()
    ]);
  }
  root.AlpineUI={stationCard,ensembleCard,start,refresh};
})(globalThis);
