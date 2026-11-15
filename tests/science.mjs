import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const docs = new URL('../docs/', import.meta.url);
const ctx = {console, location:{hash:''}, document:{getElementById:()=>({})}};
ctx.window=ctx; vm.createContext(ctx);
const load = f => vm.runInContext(fs.readFileSync(new URL(f,docs),'utf8'),ctx,{filename:f});
load('science.js'); load('data/sites.js');
for (const s of ctx.LANDER_SITES) load('data/'+s.id+'.js');
const app=fs.readFileSync(new URL('app.js',docs),'utf8');
// Evaluate the actual app science and state definitions without starting the UI.
vm.runInContext(app.slice(0,app.indexOf('  function maxStart()'))+'window.testScience = {prep:prep,sim:sim,state:state};})();',ctx);
const {prep,sim,state}=ctx.testScience, {visibleDiscFraction:f,earthWindows:windows}=ctx.LANDER_SCIENCE;
assert.equal(f(-1,0,1),0); assert.equal(f(0,0,1),.5); assert.equal(f(1,0,1),1);
assert(Math.abs(f(-.5,0,1)-.1955011094778853)<1e-14);
for(let x=-2;x<=2;x+=.001){assert(f(x,0,1)>=0&&f(x,0,1)<=1);assert(Math.abs(f(x,0,1)+f(-x,0,1)-1)<1e-14);}
console.log('PASS disc boundaries, bounds and symmetry; f(-0.5)='+f(-.5,0,1));
const half=sim({sun:Array(10).fill(.5),earth:Array(10).fill(1)},0,10,24,true);
assert.equal(half.sunHours,10);assert.equal(half.fullSunHours,5);
console.log('PASS half-disc sequence: 10 partly sunlit hours, 5 full-sun-equivalent hours');
let w=windows([1,1,0,0,0,1],0,6);
assert.equal(w.longestHidden.hours,3);assert.equal(w.longestHidden.startUTC,'2027-01-01T02:00:00.000Z');assert.equal(w.longestHidden.endUTC,'2027-01-01T05:00:00.000Z');assert.equal(w.nextVisible.hours,2);
assert.equal(windows([1,1],0,2).longestHidden,null);assert.equal(windows([0,0],0,2).nextVisible,null);assert.equal(windows([1,0,1,0],0,4).longestHidden.hours,1);
assert.equal(windows([1,1,0,0,0,1],2,2).longestHidden.hours,2);
assert.equal(windows([],0,0).longestHidden,null);
const clip=sim({sun:Array(6).fill(0),earth:[0,0,0,0,1,1]},0,6,3,true);
assert.equal(clip.earthWindows.longestHidden.hours,4);assert.equal(clip.poweredEarthWindows.longestHidden.hours,3);assert.equal(clip.poweredEarthWindows.nextVisible,null);
const earthElevation=0, terrain=.1, earthRadius=.5;
assert.equal(earthElevation>terrain,false);
assert.equal(earthElevation+earthRadius>terrain,true);
console.log('PASS Earth windows: 3h hidden [02:00,05:00), all-visible/hidden, alternating, clipped; centre vs limb predicate');
const epoch=Date.UTC(2027,0,1), start=(Date.UTC(2028,0,14)-epoch)/3600000;
state.site='MMA_K2023';state.mast='2';
let regression=sim(prep(state.site),start,336,96,true);assert.equal(regression.died,334);
console.log('PASS Malapert 2028-01-14, 14d/96h/2m: depleted at hour '+regression.died);
let flips=0,reverse=0,total=0;
for(const site of ctx.LANDER_SITES){const P=prep(site.id),d=ctx.LANDER_DATA[site.id],hor=d.horizons['2'];const old={sun:new Float32Array(d.n),earth:P.earth};
for(let i=0;i<d.n;i++){let p=((d.sun_az[i]%360+360)%360)/d.horizon_step_deg,j=Math.floor(p),t=p-j;let h=hor[j%hor.length]*(1-t)+hor[(j+1)%hor.length]*t;old.sun[i]=Math.max(0,Math.min(1,(d.sun_el[i]+d.sun_width_deg/2-h)/d.sun_width_deg));}
for(let st=0;st+336<d.n;st+=24){const a=sim(P,st,336,96,false),b=sim(old,st,336,96,false);total++;if(!a.alive&&b.alive)flips++;if(a.alive&&!b.alive)reverse++;}
}
assert.equal(total,4308);assert.equal(flips,26);assert.equal(reverse,0);
console.log(`PASS six-site daily sweep: ${total} cases, ${flips} pass-to-depleted, ${reverse} reverse`);
let current;
ctx.LANDER_APP={get:()=>current};
const rescue=fs.readFileSync(new URL('rescue.js',docs),'utf8');
vm.runInContext(rescue.slice(0,rescue.indexOf('  function draw()'))+'window.testRescue={fixes:fixes,visibility:visibility};})();',ctx);
let recommendations=0;
for(const site of ctx.LANDER_SITES){for(const date of [0,start,24*207]){Object.assign(state,{site:site.id,start:date,days:14,batt:96,mast:'2'});current={state,P:prep(site.id),hours:336,data:ctx.LANDER_DATA,sim,prep,sites:ctx.LANDER_SITES,masts:['0.5','2','10'],dayChoices:[7,14,30,60],plural:(n,s)=>n+' '+s,shortDate:String};
for(const fix of ctx.testRescue.fixes(current).filter(x=>x.ok)){const before={...state},after={...state,...fix.set};Object.assign(state,after);const result=sim(prep(after.site),after.start,after.days*24,after.batt,false);assert(result.alive,fix.title);recommendations++;Object.assign(state,before);}
for(const mast of ['0.5','2','10']){state.mast=mast;const a=prep(site.id),b=ctx.testRescue.visibility(site.id,mast);assert.deepEqual(Array.from(a.sun),Array.from(b.sun));}
}}
console.log('PASS '+recommendations+' rescue recommendations reapplied; all six sites / three heights match main visibility');
load('export.js');Object.assign(state,{site:'MMA_K2023',start:0,batt:24,mast:'2'});
const P={sun:Array(24).fill(0),earth:Array(24).fill(0)},run=sim(P,0,24,24,true);
const csv=ctx.LANDER_EXPORT.csv({state,data:ctx.LANDER_DATA,P,run,hours:24});
const rows=csv.trim().split('\r\n').filter(l=>!l.startsWith('#')).map(l=>l.split(','));
assert.equal(rows.length,25);assert.equal(rows[0].length,12);assert.equal(rows[1][0],'2027-01-01T00:00Z');assert.equal(rows[1][1],'2027-01-01T01:00Z');assert.equal(rows[1][11],'95.8');assert.equal(run.series[1],23);assert.equal(rows[24][1],'2027-01-02T00:00Z');assert.equal(rows[24][11],'0.0');
console.log('PASS CSV: 24 rows / 12 columns; initial 24, first-end 23 (95.833%, exported 95.8%); final +24h');
// Similar average visibility can hide different outage lengths, even within one site.
const examples = new Map();
state.mast="2";
outer: for (let st=0;st+336<ctx.LANDER_DATA.HW06.n;st+=24) {
  for (const site of ctx.LANDER_SITES) {
    const r=sim(prep(site.id),st,336,96,false), key=Math.round(r.earth*100), old=examples.get(key);
    const outage=r.earthWindows.longestHidden?.hours||0;
    if(old && Math.abs(old.outage-outage)>=12) {
      console.log(`INFO 14-day comparison: ${old.id} landing ${old.date} / ${site.id} landing ${new Date(epoch+st*3600000).toISOString().slice(0,10)}: both ~${key}% visible, longest outages ${old.outage}/${outage}h`);
      break outer;
    }
    if(!old)examples.set(key,{id:site.id,date:new Date(epoch+st*3600000).toISOString().slice(0,10),outage});
  }
}

const elements = {};
function element() { return {children:[],textContent:"",appendChild(child){this.children.push(child);},setAttribute(){}}; }
for (const id of ['exportSection','exportFigures','exportDays','exportDownload','exportStatus']) elements[id]=element();
ctx.document={getElementById:id=>elements[id],createElement:element};
Object.assign(state,{days:1});
ctx.LANDER_APP={onRefresh:fn=>fn({state,data:ctx.LANDER_DATA,P,run,hours:24})};
load('export.js');
assert.equal(elements.exportDays.children.length,1);
assert.equal(elements.exportDays.children[0].children.length,6);
assert.equal(elements.exportDownload.disabled,false);
const labels=elements.exportFigures.children.map(e=>e.children[0].textContent);
assert(labels.includes('Full-sun-equivalent hours'));
assert(labels.includes('Partly sunlit hours'));
assert(labels.includes('Longest Earth-centre outage (full mission)'));
assert(labels.includes('Next Earth-centre visible interval (before depletion / mission end)'));
console.log('PASS production export renderer: six daily columns, exposure and both Earth schedules displayed');
