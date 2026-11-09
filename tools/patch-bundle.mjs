/* Mumbai look + feel pass over the prebuilt game bundle.
 *
 *   node tools/patch-bundle.mjs            # patch games/helmsdeep/helmsdeep.js
 *   node tools/patch-bundle.mjs --check    # verify it is already patched
 *
 * The bundle ships minified from the Next.js build, so these are exact string
 * substitutions. Each one asserts its target is present exactly once, and each
 * is idempotent, so re-run this after dropping in a fresh bundle.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const FILE = 'games/helmsdeep/helmsdeep.js';

/** [description, find, replace] — `find` must be unique in the bundle. */
const EDITS = [
  // ===== palette: stop the city looking washed out ========================
  ['day sea', 'sea:"#20536a"', 'sea:"#17658a"'],
  ['day land', 'land:"#4f4d49"', 'land:"#615a4f"'],
  ['day park', 'park:"#4e7f45"', 'park:"#55914a"'],
  ['day forest', 'forest:"#3e6b3a"', 'forest:"#44793c"'],
  ['day kerb', 'kerb:"#9b968b"', 'kerb:"#aaa294"'],
  ['day median', 'median:"#6d6a62"', 'median:"#7b7568"'],
  ['night sea', 'sea:"#102a39"', 'sea:"#0d3448"'],
  ['night land', 'land:"#23242a"', 'land:"#2a2922"'],

  // The airport was the worst of it: a grey apron under a grey sky.
  [
    'airport surfaces',
    'apron:"#4a4f54",runway:"#3b3f45",runwayMark:"rgba(238,238,230,0.75)",terminal:"#5d646b"',
    'apron:"#5a6169",runway:"#474c55",runwayMark:"rgba(248,248,238,0.92)",terminal:"#5d646b"'
  ],

  // A flat 0.38 black vignette plus a grey rain wash was eating the contrast.
  [
    'vignette',
    'fe.addColorStop(1,"rgba(0,0,0,0.38)")',
    'fe.addColorStop(1,"rgba(0,0,0,0.2)")'
  ],
  [
    'rain wash',
    'if(s.wet>0.02)f.fillStyle=`rgba(96,112,128,${s.wet*0.17})`,f.fillRect(0,0,t,v);',
    'if(s.wet>0.02)f.fillStyle=`rgba(126,148,170,${s.wet*0.08})`,f.fillRect(0,0,t,v);'
  ],
  [
    'rain density',
    'let $=Math.round(s.wet*320),N=s.rain;',
    'let $=Math.round(s.wet*460),N=s.rain;'
  ],
  [
    'rain brightness',
    'f.save(),f.strokeStyle=`rgba(190,214,236,${0.18+s.wet*0.3})`,f.lineWidth=1.1',
    'f.save(),f.strokeStyle=`rgba(206,226,244,${0.26+s.wet*0.38})`,f.lineWidth=1.2'
  ],

  // ===== sea: make the swell actually visible ==============================
  [
    'wave layers',
    'I(0,2.4*G,38*G,0.9,n.night?"rgba(150,186,226,0.14)":"rgba(240,250,255,0.2)",Math.max(0.4*G,Y)),' +
    'I(V*0.5,1.5*G,23*G,-1.3,n.night?"rgba(120,156,200,0.09)":"rgba(214,236,250,0.12)",Math.max(0.25*G,Y*0.7))',
    'I(V*0.25,2.4*G,46*G,0.5,n.night?"rgba(150,186,226,0.08)":"rgba(235,246,255,0.1)",Math.max(0.6*G,Y*0.8)),' +
    'I(0,1.8*G,26*G,-0.7,n.night?"rgba(120,156,200,0.05)":"rgba(214,236,250,0.07)",Math.max(0.4*G,Y*0.6))'
  ],

  // ===== Cabbie: kaali-peeli, not a New York checker cab ===================
  [
    'kaali-peeli livery',
    'H5(e,n,u,["#e8b431","#b5861c","#f4d36a"]);let l=n,o=u;' +
    'for(let i=0;i<10;i++)e.fillStyle=i%2===0?"#17181b":"#f2efe6",' +
    'e.fillRect(l*0.06+i*(l*0.088),o/2-1.5,l*0.088,1.5),' +
    'e.fillStyle=i%2===0?"#f2efe6":"#17181b",' +
    'e.fillRect(l*0.06+i*(l*0.088),o/2,l*0.088,1.5);',
    'H5(e,n,u,["#17181c","#0b0c0e","#2b2d33"]);let l=n,o=u;' +
    'e.fillStyle="#f5b000",a(e,l*0.405,1.9,l*0.27,o-3.8,2.4),e.fill(),' +
    'e.strokeStyle="rgba(12,10,2,0.55)",e.lineWidth=0.7,' +
    'a(e,l*0.405,1.9,l*0.27,o-3.8,2.4),e.stroke(),' +
    'e.fillStyle="rgba(255,255,255,0.14)",e.fillRect(l*0.405,2.4,l*0.27,1.1);'
  ],

  // ===== traffic mix: Mumbai runs on taxis and autos =======================
  [
    'traffic weights',
    'var Yi=[0,0,0,1,1,2,3,5,6,7,7,8,8,8,9,12,12,12,14,',
    'var Yi=[' +
    // Civilian & Taxis: Kaali-peeli taxis, sedans, pickups, delivery vans
    '0,0,1,1,12,12,18,19,20,21,' +
    // Municipal & Public Service: Garbage Truck (Trashmaster) & School Bus
    '26,28,' +
    // 16 Vintage Cars (Mapped ONLY to Real Car Chassis l=46-50, w=21-22!)
    '2,4,5,6,7,32,33,34,35,' +
    // Real Bikes Only (Chassis l=26-28, w=10-11: PCJ-6, Sanchez, NRG, Rapido)
    '29,38,39,55,' +
    // Modern Supercars (Porsche 911 GT3, Huracan, Aventador, Taycan, Ferrari, Bentley, Skyline)
    '56,57,58,59,9,84,86,' +
    // State Ambassador with Working Flashing Red VIP Beacon
    '89,89,' +
    // 4 Gang Combat Vehicles (Spiked Skull Muscle, Gun Truck, Dragon Supercar, Dragon SUV)
    '60,61,62,63,'
  ],

  // ===== audio: the SFX bus was 8-15x quieter than the music ===============
  // Master was 0.17 into the destination while the music element played at
  // 0.42 straight to the speakers, so engine, skids and explosions were all
  // buried. Raise the bus, drop the music, and give the throttle real travel.
  ['master gain', ',se=0.17,L=null,ve=null,', ',se=0.62,L=null,ve=null,'],
  ['music volume', '$.volume=0.42,$.preload="auto"', '$.volume=0.28,$.preload="auto"'],
  // The engine is meant to bark for the first couple of seconds on the throttle
  // and then settle into something you can listen to for an hour. `$.hdP` is the
  // game-clock stamp of the last time the throttle went down; `hdE` fades from
  // 1 to 0 over two seconds and scales the loud part of the note.
  [
    'engine bus level',
    'let $e=0.16+(P?0.07:0)+He*0.07;ae.gain.setTargetAtTime($e,Ke,0.08)',
    'let $e=0.022+(P?0.038+0.13*($.hdP?ze(1-(s.t-$.hdP)/2,0,1):0):0)+He*0.045;' +
    'ae.gain.setTargetAtTime($e,Ke,0.05)'
  ],
  // This is the earliest line in the engine block, so the throttle stamp is set
  // here and the other two gains read it.
  [
    'engine top end',
    'if(Fe)Fe.gain.setTargetAtTime(P?0.075+He*0.06:0.018,Ke,0.09)',
    'if(P){if(!$.hdP)$.hdP=s.t}else $.hdP=0;' +
    'if(Fe)Fe.gain.setTargetAtTime(P?0.03+0.07*($.hdP?ze(1-(s.t-$.hdP)/2,0,1):0)+He*0.03:0.008,Ke,0.06)'
  ],
  [
    'engine intake hiss',
    'Ge.gain.setTargetAtTime(P?0.014+He*0.03:0.004,Ke,0.1)',
    'Ge.gain.setTargetAtTime(P?0.004+0.012*($.hdP?ze(1-(s.t-$.hdP)/2,0,1):0)+He*0.008:0.0014,Ke,0.1)'
  ],
  [
    'tyre screech',
    'let w=ze((K-30)/110+(g?0.3:0),0,0.42);Me.gain.setTargetAtTime(w,L.currentTime,0.04)',
    'let w=ze((K-16)/64+(g?0.6:0),0,0.95);Me.gain.setTargetAtTime(w,L.currentTime,0.03)'
  ],
  // Same two-second shape on the brakes: a hard squeal as you stand on them,
  // then a quiet drone while you keep the pedal down.
  [
    'brake squeal',
    'if((re.s||re.arrowdown)&&N>55){let Z=ze((N-45)/220,0,0.28);zn.gain.setTargetAtTime(Z,L.currentTime,0.04)}',
    'if((re.s||re.arrowdown)&&N>24){if(!$.hdB)$.hdB=s.t;' +
    'let hdS=ze(1-(s.t-$.hdB)/2,0,1),Z=ze((N-18)/120,0,0.2+0.5*hdS);' +
    'zn.gain.setTargetAtTime(Z,L.currentTime,0.03)}else if(($.hdB=0),0){}'
  ],
  ['explosion boom body', 'z.gain.setValueAtTime(0.6,t)', 'z.gain.setValueAtTime(0.95,t)'],
  ['explosion boom noise', 'X.gain.setValueAtTime(0.5,t)', 'X.gain.setValueAtTime(0.85,t)'],
  ['gunshot crack', 'K.gain.setValueAtTime(0.4,t)', 'K.gain.setValueAtTime(0.6,t)'],
  ['gunshot thump', 'X.gain.setValueAtTime(0.35,t)', 'X.gain.setValueAtTime(0.52,t)'],

  // Impacts are silent on purpose: every synthesised version of metal-on-metal
  // sounded wrong, so the thud is dropped rather than left as a bad blip.
  [
    'no car impact sound',
    'En.thud(te/600),te>330)',
    'te>330)'
  ],
  [
    'no wall impact sound',
    'iu(t.x,t.y,Math.min(10,Ee*0.04)),En.thud(Ee/500)',
    'iu(t.x,t.y,Math.min(10,Ee*0.04))'
  ],
  // With everything louder the bus can clip on a pile-up, so the master now
  // runs through a limiter instead of straight into the speakers.
  [
    'master limiter',
    've.connect(L.destination)',
    've.connect((()=>{let hdC=L.createDynamicsCompressor();' +
    'hdC.threshold.value=-9,hdC.knee.value=6,hdC.ratio.value=12,' +
    'hdC.attack.value=0.004,hdC.release.value=0.18,' +
    'hdC.connect(L.destination);return hdC})())'
  ],

  [
    'wall impact damage',
    'if(t.x=Ze.x,t.y=Ze.y,Ee>220){let $n=(Ee-190)*0.028;',
    'if(t.x=Ze.x,t.y=Ze.y,Ee>150){let $n=(t.deck||X9(t.x,t.y)!==null)?0:(Ee-130)*0.05;'
  ],

  // ===== fire: bigger blasts, hotter flames, faster chains =================
  ['particle budget', 'let ht=220;', 'let ht=620;'],
  [
    'small blast particles',
    'function Ri(t,v){En.boom(),s.cam.shake=16;for(let $=0;$<26;$++){' +
    'let N=Math.random()*Math.PI*2,J=40+Math.random()*320;' +
    's.parts.push({x:t,y:v,vx:Math.cos(N)*J,vy:Math.sin(N)*J,' +
    'life:0.5+Math.random()*0.7,max:1.2,r:3+Math.random()*7,' +
    'col:Math.random()<0.5?"#ff8a2a":"#5c5c5c"})}',
    'function Ri(t,v){En.boom(),s.cam.shake=21;for(let $=0;$<54;$++){' +
    'let N=Math.random()*Math.PI*2,J=50+Math.random()*430,hdH=Math.random();' +
    's.parts.push({x:t,y:v,vx:Math.cos(N)*J,vy:Math.sin(N)*J,' +
    'life:0.45+Math.random()*0.85,max:1.3,r:3+Math.random()*9,' +
    'col:hdH<0.3?"#fff1b0":hdH<0.72?"#ff7a1a":"#4a4a4a",glow:hdH<0.72})}'
  ],
  [
    'big blast particles',
    'function R5(t,v,z){Ri(t,v),s.cam.shake=26;let $=210;for(let J=0;J<18;J++){' +
    'let Z=Math.random()*Math.PI*2,K=120+Math.random()*420;' +
    's.parts.push({x:t,y:v,vx:Math.cos(Z)*K,vy:Math.sin(Z)*K,' +
    'life:0.6+Math.random()*0.6,max:1.2,r:5+Math.random()*9,' +
    'col:Math.random()<0.6?"#ffb347":"#2e2e2e",glow:Math.random()<0.4})}',
    'function R5(t,v,z){Ri(t,v),s.cam.shake=30;let $=210;for(let J=0;J<40;J++){' +
    'let Z=Math.random()*Math.PI*2,K=140+Math.random()*520,hdH=Math.random();' +
    's.parts.push({x:t,y:v,vx:Math.cos(Z)*K,vy:Math.sin(Z)*K,' +
    'life:0.6+Math.random()*0.8,max:1.4,r:5+Math.random()*12,' +
    'col:hdH<0.28?"#fff3c0":hdH<0.68?"#ff9a2e":"#2e2e2e",glow:hdH<0.68})}'
  ],
  [
    'burning car flames',
    'if(z.burn>0){if(z.burn-=t,Math.random()<t*26)s.parts.push({' +
    'x:z.x+(Math.random()-0.5)*12+Math.cos(z.h)*8,y:z.y+(Math.random()-0.5)*8+Math.sin(z.h)*8,' +
    'vx:(Math.random()-0.5)*40,vy:-30-Math.random()*50,life:0.45+Math.random()*0.4,max:0.85,' +
    'r:2.5+Math.random()*4,col:Math.random()<0.6?"#ff8a2a":"#333",glow:Math.random()<0.5});',
    'if(z.burn>0){if(z.burn-=t,Math.random()<t*70){let hdH=Math.random();s.parts.push({' +
    'x:z.x+(Math.random()-0.5)*14+Math.cos(z.h)*8,y:z.y+(Math.random()-0.5)*10+Math.sin(z.h)*8,' +
    'vx:(Math.random()-0.5)*55,vy:-45-Math.random()*70,life:0.4+Math.random()*0.55,max:0.95,' +
    'r:2.5+Math.random()*6,col:hdH<0.26?"#ffe28a":hdH<0.72?"#ff7a1a":"#333",glow:hdH<0.72})};'
  ],
  [
    'flamethrower stream',
    'if(Z.kind==="stream"){for(let g=0;g<2;g++){let X=z+(Math.random()-0.5)*Z.spread*2,' +
    'w=Z.speed*(0.65+Math.random()*0.6);s.parts.push({x:t+Math.cos(z)*$,y:v+Math.sin(z)*$,' +
    'vx:Math.cos(X)*w,vy:Math.sin(X)*w,life:Z.ttl,max:Z.ttl,r:3+Math.random()*4,' +
    'col:Math.random()<0.55?"#ff8a2a":Math.random()<0.6?"#ffd76a":"#6b3a1c",glow:!0})}',
    'if(Z.kind==="stream"){for(let g=0;g<5;g++){let X=z+(Math.random()-0.5)*Z.spread*2,' +
    'w=Z.speed*(0.6+Math.random()*0.75),hdH=Math.random();s.parts.push({x:t+Math.cos(z)*$,y:v+Math.sin(z)*$,' +
    'vx:Math.cos(X)*w,vy:Math.sin(X)*w,life:Z.ttl*(0.8+Math.random()*0.7),max:Z.ttl*1.5,' +
    'r:2.5+Math.random()*6,col:hdH<0.22?"#fff0b4":hdH<0.6?"#ff8a2a":hdH<0.84?"#ffd76a":"#6b3a1c",glow:!0})}'
  ],

  // ===== aircraft: every plane you can see should be a plane you can fly ===
  // Up to three "planes" per apron were scenery drawn by h6() that never enter
  // s.planes, so E could never board them. Scenery off, real ones raised.
  [
    'no scenery planes',
    'for(let O=0;O<3;O++){let j=0.22+O*0.28+Un(m.x0,O)*0.06',
    'for(let O=0;O<0;O++){let j=0.22+O*0.28+Un(m.x0,O)*0.06'
  ],
  [
    'parked plane budget',
    'let v=0;for(let z of D.areas){if(v>=6)break;if(z.kind!=="apron")continue;',
    'let v=0;for(let z of D.areas){if(v>=14)break;if(z.kind!=="apron")continue;'
  ],
  ['parked planes per apron', 'for(let X=0;X<2&&v<6;X++)', 'for(let X=0;X<2&&v<14;X++)'],
  ['boarding reach', 'let V9=T(62);', 'let V9=T(95);'],

  // ===== jobs: Flo deliveries and police call-outs =========================
  // The bundle already has a complete job loop for taxi/auto/bike hires:
  // an offer spawns, a pin appears, you drive to it, you get paid. Stealing a
  // Flo truck or a police car did nothing at all. Rather than bolt on a second
  // mission framework, both become hire kinds, so they inherit the pin, the
  // timer, the par-time tip, the payout and the HUD for free.
  [
    'job rates',
    'let d5={taxi:0.9,auto:0.72,bike:0.62},y5={taxi:60,auto:35,bike:25};',
    'let d5={taxi:0.9,auto:0.72,bike:0.62,flo:1.9,cop:1.3},' +
    'y5={taxi:60,auto:35,bike:25,flo:260,cop:180};'
  ],
  [
    'job kind from vehicle',
    'function a5(){let t=s.player;if(t.onFoot||t.carIdx<0)return null;' +
    'let v=s.cars[t.carIdx];if(!v||v.dead)return null;return Ie(v.type).hire??null}',
    'function a5(){let t=s.player;if(t.onFoot||t.carIdx<0)return null;' +
    'let v=s.cars[t.carIdx];if(!v||v.dead)return null;let hdD=Ie(v.type);' +
    'return hdD.hire??(hdD.flo?"flo":hdD.cop?"cop":null)}'
  ],

  // ===== real beaches: golden sand, wet tide lines, umbrellas ==============
  [
    'rich beach rendering',
    'case"beach":case"sand":{if(!Pn(r,V.pts))break;if(r.fillStyle=l.sand,r.fill(),i)dE(r,V);break}',
    'case"beach":case"sand":{if(!Pn(r,V.pts))break;' +
    'r.fillStyle=n.night?"#7a6e4d":"#ebd79b",r.fill();' +
    'r.strokeStyle=n.night?"rgba(90,80,56,0.7)":"rgba(196,172,118,0.85)",' +
    'r.lineWidth=Math.max(3*G,4*E),r.stroke();' +
    'let hdT=y(n.t)?n.t:0,hdW=0.5+0.5*Math.sin(hdT*1.8);' +
    'r.strokeStyle=n.night?`rgba(190,214,240,${0.2+hdW*0.3})`:`rgba(255,255,255,${0.35+hdW*0.45})`;' +
    'r.lineWidth=Math.max(2*G,2.8*E);' +
    'r.setLineDash([12*G,8*G]),r.lineDashOffset=-hdT*18*G,r.stroke(),r.setLineDash([]);' +
    'if(i)dE(r,V);break}'
  ],

  // ===== South Mumbai ======================================================
  // The baked map already covers the whole metropolitan region — Colaba,
  // Nariman Point, CSMT, Worli and Dadar are all in mumbai-map.json with their
  // roads, stations and 222 named places. Only the start-district table was
  // confined to the Bandra/BKC/Juhu cluster, so nobody could reach them. These
  // coordinates are read back out of the baked data itself.
  [
    'south mumbai districts',
    '{id:"andheri",label:"Andheri Metro",lon:72.847,lat:19.12}]',
    '{id:"andheri",label:"Andheri Metro",lon:72.847,lat:19.12},' +
    '{id:"dadar",label:"Dadar West",lon:72.8382,lat:19.0239},' +
    '{id:"worli",label:"Worli Sea Face",lon:72.8179,lat:19.0117},' +
    '{id:"marine",label:"Marine Drive",lon:72.8237,lat:18.9458},' +
    '{id:"fort",label:"CSMT & Fort",lon:72.8358,lat:18.9405},' +
    '{id:"colaba",label:"Colaba Causeway",lon:72.826,lat:18.9151},' +
    '{id:"powai",label:"Powai Lake",lon:72.9073,lat:19.1187},' +
    '{id:"ghatkopar",label:"Ghatkopar",lon:72.9084,lat:19.0857},' +
    '{id:"mulund",label:"Mulund",lon:72.9567,lat:19.1721},' +
    '{id:"thane",label:"Thane Station",lon:72.9758,lat:19.1865}]'
  ],
  [
    'job offer wording',
    'le("Someone is flagging you down — drive to the marker.")',
    'le(a5()==="flo"?"Consignment waiting — drive to the amber pin.":' +
    'a5()==="cop"?"Dispatch: shout called in — drive to the amber pin.":' +
    '"Someone is flagging you down — drive to the marker.")'
  ],
  [
    'job accepted wording',
    'le(`${t==="bike"?"Pillion":"Passenger"} in — ${N.name}. ₹${K} meter, paid as you go.`)',
    'le(t==="flo"?`Load on board — run it to ${N.name}. ₹${K}, paid as you close in.`:' +
    't==="cop"?`Responding — ${N.name}. ₹${K} duty pay, paid as you close in.`:' +
    '`${t==="bike"?"Pillion":"Passenger"} in — ${N.name}. ₹${K} meter, paid as you go.`)'
  ],
  [
    'job HUD kind',
    'h=!k.onFoot&&k.carIdx>=0?Ie(s.cars[k.carIdx]?.type??0).hire:null;',
    'h=!k.onFoot&&k.carIdx>=0?(()=>{let hdD=Ie(s.cars[k.carIdx]?.type??0);' +
    'return hdD.hire??(hdD.flo?"flo":hdD.cop?"cop":null)})():null;'
  ],
  [
    'job HUD badge',
    'f.fillText(ue==="bike"?"RAPIDO":ue==="auto"?"AUTO":"CAB",24,133)',
    'f.fillText(ue==="bike"?"RAPIDO":ue==="auto"?"AUTO":ue==="flo"?"FLO":ue==="cop"?"PATROL":"CAB",24,133)'
  ],
  [
    'job entry hint',
    'let Z=Ie(z.type).hire;if(Z)At(),le(Z==="bike"?"Rapido — wait for a ping, then ride to the pin.":' +
    'Z==="auto"?"Auto — wait for a hail, then drive to the pin.":' +
    '"Cab — wait for a hail, then drive to the pin.")',
    'let hdD=Ie(z.type),Z=hdD.hire??(hdD.flo?"flo":hdD.cop?"cop":null);' +
    'if(Z)At(),le(Z==="bike"?"Rapido — wait for a ping, then ride to the pin.":' +
    'Z==="auto"?"Auto — wait for a hail, then drive to the pin.":' +
    'Z==="flo"?"Flo truck — a consignment will come over the radio. Keep the load on board.":' +
    'Z==="cop"?"Patrol car — dispatch will call you to a shout.":' +
    '"Cab — wait for a hail, then drive to the pin.")'
  ],
  [
    'spilled load fails the delivery',
    'if(En.thud(0.3),t.shed===J)le("Mattresses all over the road.")}function U5(',
    'if(t.shed===J)le("Mattresses all over the road.");' +
    'if(t.player&&s.fare&&s.fare.kind==="flo")hi("Load spilled — consignment written off.")}function U5('
  ],

  // ===== news crew: it needed six bodies in one 90 m circle ================
  // s.deaths is capped at 64 and the cluster also had to be under 90 s old, so
  // CH9 Mumbai Live effectively never turned up. Two bodies is enough now; the
  // 25 s cooldown and the one-crew-at-a-time rule still hold it back.
  // ===== HUD scale: 11 px type is fine on a laptop and enormous on a phone ===
  // The HUD is drawn in CSS pixels after the world, so on a 390 px screen it ate
  // a third of the view. The transform is reset at the top of every frame (an
  // early return inside the HUD must not leak a scale into the next one), and
  // the HUD block then scales itself down while `t`/`v` are divided by the same
  // factor so everything anchored to an edge stays on that edge.
  [
    'frame transform reset',
    'y9=()=>{let t=d.width/x,v=d.height/x;if(t<8||v<8)return;if(c5(',
    'y9=()=>{let t=d.width/x,v=d.height/x;if(t<8||v<8)return;f.setTransform(x,0,0,x,0,0);if(c5('
  ],
  [
    'hud scale and clean layout',
    'f.fillStyle=fe,f.fillRect(0,0,t,v),f.textBaseline="middle",' +
    'f.fillStyle="rgba(10,12,14,0.62)",f.fillRect(14,14,190,64),f.fillStyle="#e8e4da",f.font="bold 11px system-ui",f.textAlign="left",f.fillText("HEALTH",24,30),f.fillStyle="#2a2f34",f.fillRect(24,38,170,10),f.fillStyle=k.hp>40?"#67c97a":"#e05555",f.fillRect(24,38,170*ze(k.hp/100,0,1),10),f.fillStyle="#e0b23c",f.fillText(`$${k.cash}`,24,62),f.fillStyle="#e8e4da",f.fillText(`SCORE ${k.score}`,80,62);let te=vr[k.weapon],He=k.ammo[k.weapon]??0;if(f.fillStyle=He>0?"#e8e4da":"#9a6a6a",f.fillText(`${te.name} ${He}`,150,62),f.fillStyle="#e8e4da",!k.onFoot)f.font="bold 9px system-ui",f.fillStyle="rgba(200,208,218,0.75)",f.fillText(Ie(s.cars[k.carIdx]?.type??0).name.toUpperCase(),150,74)',
    'f.fillStyle=fe,f.fillRect(0,0,t,v);' +
    'let hdU=Math.min(1,Math.max(0.58,t/1180));' +
    'if(hdU<1)f.setTransform(x*hdU,0,0,x*hdU,0,0),t/=hdU,v/=hdU;' +
    // Clean top-left player card: wider (240px), 3 distinct rows, zero text collisions!
    'f.textBaseline="middle",f.fillStyle="rgba(10,12,14,0.85)",f.fillRect(14,14,240,112);' +
    'f.fillStyle="#a0aec0",f.font="bold 9px system-ui",f.textAlign="left",f.fillText("HEALTH",24,28);' +
    'f.fillStyle="#2d3748",f.fillRect(72,24,120,8);' +
    'f.fillStyle=k.hp>40?"#48bb78":"#f56565",f.fillRect(72,24,120*ze(k.hp/100,0,1),8);' +
    'f.fillStyle="#e2e8f0",f.font="bold 9px system-ui",f.fillText(`${Math.round(k.hp)}%`,200,28);' +
    'f.fillStyle="#f5b000",f.font="bold 11px system-ui",f.fillText(`₹ ${Math.max(0,Math.round(k.cash)).toLocaleString()}`,24,46);' +
    'f.fillStyle="#94a3b8",f.font="bold 8px system-ui",f.fillText(`SCORE ${k.score}`,160,46);' +
    'let te=vr[k.weapon],He=k.ammo[k.weapon]??0;' +
    'f.fillStyle=He>0?"#e2e8f0":"#fc8181",f.font="bold 9px system-ui",f.fillText(`${te.name} (${He})`,24,62);' +
    'if(!k.onFoot)f.font="bold 8px system-ui",f.fillStyle="#90cdf4",f.fillText(Ie(s.cars[k.carIdx]?.type??0).name.toUpperCase(),135,62)'  ],

  // ===== speed blur =========================================================
  // Radial streaks from the centre of the screen once a quick car or a bike is
  // past 55% of its top speed. Slow vehicles never get them, so a Cabbie at full
  // tilt stays clean and a Lamborghini does not.
  [
    'speed lines',
    'f.fillRect(0,0,t,v)}let ee=Math.max(1,Math.min(t,v)*0.42),M=Math.max(ee+1,Math.max(t,v)*0.72),' +
    'fe=f.createRadialGradient(t/2,v/2,ee,t/2,v/2,M);',
    'f.fillRect(0,0,t,v)}{let hdC=!s.player.onFoot&&s.player.carIdx>=0?s.cars[s.player.carIdx]:null,' +
    'hdD=hdC?Ie(hdC.type):null;' +
    'if(hdD&&(hdD.top>=430||hdD.bike)&&!hdC.dead){' +
    'let hdS=Math.hypot(hdC.vx,hdC.vy)/(hdD.top||400);' +
    'if(hdS>0.55){let hdA=Math.min(0.42,(hdS-0.55)*1.3),hdR=Math.max(t,v)*0.34;' +
    'f.save(),f.globalAlpha=hdA,f.strokeStyle="rgba(228,240,255,0.9)",f.lineWidth=1.5;' +
    'for(let hdI=0;hdI<30;hdI++){' +
    'let hdG=hdI*2.3999+s.t*0.7,hdL=hdR*(0.5+(hdI%7)/9),hdE=hdL+30+hdS*90;' +
    'f.beginPath(),f.moveTo(t/2+Math.cos(hdG)*hdL,v/2+Math.sin(hdG)*hdL),' +
    'f.lineTo(t/2+Math.cos(hdG)*hdE,v/2+Math.sin(hdG)*hdE),f.stroke()}' +
    'f.restore()}}}' +
    'let ee=Math.max(1,Math.min(t,v)*0.42),M=Math.max(ee+1,Math.max(t,v)*0.72),' +
    'fe=f.createRadialGradient(t/2,v/2,ee,t/2,v/2,M);'
  ],

  // ===== the player on foot was a 6 px blob on a busy street ================
  [
    'player marker ring',
    'd9=()=>{let t=s.player;if(!t.onFoot)return;if(f.save(),f.translate(t.x,t.y),t.chute)',
    'd9=()=>{let t=s.player;if(!t.onFoot)return;' +
    'f.save(),f.translate(t.x,t.y),f.fillStyle="rgba(252,211,77,0.16)",' +
    'f.beginPath(),f.arc(0,0,12,0,Math.PI*2),f.fill(),' +
    'f.strokeStyle="rgba(252,211,77,0.95)",f.lineWidth=1.4,f.beginPath(),' +
    'f.arc(0,0,11.5+Math.sin(s.t*4)*1.1,0,Math.PI*2),f.stroke(),' +
    'f.fillStyle="rgba(252,211,77,0.95)",f.beginPath(),' +
    'f.moveTo(Math.cos(t.h)*15.5,Math.sin(t.h)*15.5),' +
    'f.lineTo(Math.cos(t.h+2.6)*10,Math.sin(t.h+2.6)*10),' +
    'f.lineTo(Math.cos(t.h-2.6)*10,Math.sin(t.h-2.6)*10),' +
    'f.closePath(),f.fill(),f.restore();' +
    'if(f.save(),f.translate(t.x,t.y),t.chute)'
  ],

  // Add Ambassador (89) to car dealership showrooms so rare cars are parked outside showrooms
  [
    'showroom rare cars',
    'A$=[9,10,11,36,37,4,5,42,56,57,58,59,67,69,82,83,84,85,86,87,88],',
    'A$=[89,56,57,58,59,84,82,83,9,10,11,36,37,4,5,42,67,69,85,86,87,88],'
  ],

  // ===== supercars people have heard of ====================================
  ['porsche 911 gt3 sprite',
    '{name:"Comet GTR",l:44,w:20,power:1010,top:665,gripF:11.7,gripR:9.6,steer:0.75,wheelbase:27,mass:0.8,sprite:Yu,nos:!0}',
    '{name:"Porsche 911 GT3",l:44,w:20,power:1010,top:665,gripF:11.7,gripR:9.6,steer:0.75,wheelbase:27,mass:0.8,nos:!0,sprite:(e,n,u,r)=>{let l=n,o=u;We(e,l,o);e.fillStyle="#ea580c",a(e,0,0,l,o,6),e.fill();e.strokeStyle="#1e293b",e.lineWidth=1,a(e,0,0,l,o,6),e.stroke();e.fillStyle="#0f172a",e.fillRect(0,o/2-2,l,1.4),e.fillRect(0,o/2+0.6,l,1.4);e.fillStyle="#1e293b",e.fillRect(l*0.35,2.5,l*0.32,o-5);e.fillStyle="#38bdf8",e.fillRect(l*0.48,3,5,o-6);e.fillStyle="#fef08a",e.beginPath(),e.arc(l-3,3.5,2.2,0,Math.PI*2),e.fill(),e.beginPath(),e.arc(l-3,o-3.5,2.2,0,Math.PI*2),e.fill();e.fillStyle="#0f172a",e.fillRect(-3,2,3,o-4);}}'
  ],
  ['lamborghini huracan sprite',
    '{name:"Vacca",l:45,w:21,power:1080,top:700,gripF:12,gripR:10,steer:0.77,wheelbase:28,mass:0.79,sprite:Yu,nos:!0}',
    '{name:"Lamborghini Huracan",l:45,w:21,power:1080,top:700,gripF:12,gripR:10,steer:0.77,wheelbase:28,mass:0.79,nos:!0,sprite:(e,n,u,r)=>{let l=n,o=u;We(e,l,o);e.fillStyle="#84cc16",e.beginPath(),e.moveTo(l,o/2),e.lineTo(l*0.65,0.5),e.lineTo(0,1.5),e.lineTo(0,o-1.5),e.lineTo(l*0.65,o-0.5),e.closePath(),e.fill();e.strokeStyle="#1e293b",e.lineWidth=1,e.stroke();e.fillStyle="#0f172a",e.fillRect(l*0.08,4,l*0.25,o-8);e.fillStyle="#1e293b",e.fillRect(l*0.36,3,l*0.26,o-6);e.fillStyle="#38bdf8",e.fillRect(l*0.48,3.5,4,o-7);e.fillStyle="#1e293b",e.fillRect(l*0.14,0.5,l*0.16,2.5),e.fillRect(l*0.14,o-3,l*0.16,2.5);e.fillStyle="#ef4444",e.fillRect(-2,3,2.5,3),e.fillRect(-2,o-6,2.5,3);}}'
  ],
  ['lamborghini aventador', '{name:"Zentorno",', '{name:"Lamborghini Aventador",'],
  ['porsche taycan', '{name:"Osiris",', '{name:"Porsche Taycan",'],

  // ===== gangs: they existed but you never met enough of them ==============
  // `s9()` keeps at most four `ai:"gang"` cars alive and draws them from $5 —
  // four generic coupes plus the four badged crew cars. Widen the pool with the
  // premium sedans and the supercars, and raise the cap.
  [
    'gang car pool',
    'var $5=[32,33,34,35,60,61,62,63];',
    'var $5=[32,33,34,35,60,61,62,63,60,61,62,63,40,41,42,56,57,58,59];'
  ],
  ['gang car cap', 'if(t>=4)return;let v=s.player,z=oo();', 'if(t>=7)return;let v=s.player,z=oo();'],
  ['gang spawn attempts', 'for(let $=0;$<6&&t<4;$++)', 'for(let $=0;$<8&&t<7;$++)'],

  // ===== natural coastline: golden beach sand band into clean blue sea =====
  [
    'shore surf',
    'case"land":{if(!Pn(r,V.pts))break;if(r.fillStyle=l.land,r.fill("evenodd"),i)' +
    'r.strokeStyle=l.shore,r.lineWidth=Math.max(0.9*G,1.4*E),r.stroke();break}',
    'case"land":{if(!Pn(r,V.pts))break;' +
    // Golden beach sand band along the shore into the water
    'r.strokeStyle=n.night?"#524834":"#e2d296",' +
    'r.lineWidth=Math.max(14*G,18*E),r.stroke();' +
    // Wet sand margin at the waterline
    'r.strokeStyle=n.night?"#3a3224":"#b5a06c",' +
    'r.lineWidth=Math.max(5*G,7*E),r.stroke();' +
    // Land fill
    'r.fillStyle=l.land,r.fill("evenodd");' +
    'break}'
  ],
  // ===== bazooka ===========================================================
  // The missile system already existed for the tank; this exposes it as a
  // carried weapon, on foot or at the wheel, with a brighter exhaust trail.
  [
    'bazooka in the weapon tables',
    'sr=["pistol","smg","shotgun","rifle","grenade","flamer"],' +
    'Uv={pistol:240,smg:600,shotgun:120,rifle:90,grenade:25,flamer:900}',
    'sr=["pistol","smg","shotgun","rifle","grenade","flamer","bazooka","sniper"],' +
    'Uv={pistol:240,smg:600,shotgun:120,rifle:90,grenade:25,flamer:900,bazooka:12,sniper:30}'
  ],
  [
    'bazooka stats',
    'flamer:{name:"FLAMER",cd:0.045,pellets:1,spread:0.22,speed:230,ttl:0.42,dmg:0,auto:!0,heat:0.6,kind:"stream"}}',
    'flamer:{name:"FLAMER",cd:0.045,pellets:1,spread:0.22,speed:230,ttl:0.42,dmg:0,auto:!0,heat:0.6,kind:"stream"},' +
    'bazooka:{name:"BAZOOKA",cd:1.15,pellets:1,spread:0.012,speed:600,ttl:2.2,dmg:0,auto:!1,heat:1.8,kind:"rocket"},' +
    'sniper:{name:"SNIPER RIFLE",cd:1.1,pellets:1,spread:0.002,speed:1400,ttl:1.2,dmg:450,auto:!1,heat:1.5,kind:"bullet"}}'
  ],
  [
    'bazooka ammo slot',
    'function q5(){return{pistol:0,smg:0,shotgun:0,rifle:0,grenade:0,flamer:0}}',
    'function q5(){return{pistol:0,smg:0,shotgun:0,rifle:0,grenade:0,flamer:0,bazooka:0}}'
  ],
  [
    'bazooka fire',
    'N.ammo[J]-1),Z.kind==="throw"){',
    'N.ammo[J]-1),Z.kind==="rocket"){let hdS=N.carIdx>=0?s.cars[N.carIdx]:null;' +
    's.missiles.push({x:t+Math.cos(z)*$,y:v+Math.sin(z)*$,' +
    'vx:Math.cos(z)*Z.speed,vy:Math.sin(z)*Z.speed,ttl:Z.ttl,src:hdS,smoke:0,arm:0.09}),' +
    'En.boom(),s.cam.shake=Math.max(s.cam.shake,9),Zn(Z.heat,!1);return}' +
    'if(Z.kind==="throw"){'
  ],
  [
    'rocket exhaust trail',
    'if($.smoke-=t,$.smoke<=0&&s.parts.length<ht)$.smoke=0.02,' +
    's.parts.push({x:$.x,y:$.y,vx:-$.vx*0.05,vy:-$.vy*0.05,life:0.5,max:0.5,' +
    'r:2.6+Math.random()*2,col:"#8d8d8d"});',
    'if($.smoke-=t,$.smoke<=0&&s.parts.length<ht){$.smoke=0.012;' +
    'let hdH=Math.random();s.parts.push({x:$.x,y:$.y,vx:-$.vx*0.08+(Math.random()-0.5)*40,' +
    'vy:-$.vy*0.08+(Math.random()-0.5)*40,life:0.45+Math.random()*0.5,max:0.95,' +
    'r:2.4+Math.random()*3.6,col:hdH<0.3?"#ffd98a":hdH<0.55?"#ff8a2a":"#9a9a9a",glow:hdH<0.55});' +
    's.parts.push({x:$.x,y:$.y,vx:0,vy:0,life:0.12,max:0.12,r:5.5,col:"#fff3c0",glow:!0})}'
  ],
  [
    'ammo hint mentions seven slots',
    '`${Z.name} — out of ammo. 1-6 to switch.`',
    '`${Z.name} — out of ammo. 1-7 to switch.`'
  ],
  [
    'seven weapon keys',
    'if(Q.current==="play"&&v>="1"&&v<="6")t2(Number(v)-1)',
    'if(Q.current==="play"&&v>="1"&&v<="7")t2(Number(v)-1)'
  ],

  // ===== people get hit, not just killed ==================================
  [
    'pedestrian knockdown',
    'if(k&&!k.dead&&Math.hypot(k.x-N.x,k.y-N.y)<22&&Math.hypot(k.vx,k.vy)>110)' +
    'Qr(N,!0),le("+25 — hopefully they jaywalked."),En.thud(0.3)',
    'if(k&&!k.dead&&Math.hypot(k.x-N.x,k.y-N.y)<22){let hdV=Math.hypot(k.vx,k.vy);' +
    'if(hdV>110)Qr(N,!0),le("+25 — hopefully they jaywalked."),' +
    'k.vx*=0.92,k.vy*=0.92;' +
    'else if(hdV>40){let hdA=Math.atan2(k.vy,k.vx),' +
    'hdP=fu(N.x+Math.cos(hdA)*hdV*0.07,N.y+Math.sin(hdA)*hdV*0.07,6,N.x,N.y);' +
    'N.x=hdP.x,N.y=hdP.y,N.kind="flee",N.wpX=N.x+Math.cos(hdA)*200,N.wpY=N.y+Math.sin(hdA)*200,' +
    'N.hits=(N.hits??0)+1,s.cam.shake=Math.max(s.cam.shake,4),' +
    'k.vx*=0.9,k.vy*=0.9,s.decals.push({x:N.x,y:N.y,a:0.3,r:4,kind:"blood"});' +
    'if(N.hits>=3)Qr(N,!1)}}'
  ],

  // ===== VIP Mumbai: state convoys, bungalows, bodyguards, bounties ========
  // A white state sedan with a red beacon (index 89, appended so no existing
  // index shifts), a police + SWAT escort, the seven addresses everyone in
  // Mumbai can point to, a posse on the gate, and a contract payout if the
  // beacon car ever stops moving.
  [
    'state car type',
    '{name:"Gurkha LX",l:48,w:25,power:700,top:360,gripF:8.6,gripR:8,steer:0.6,' +
    'wheelbase:31,mass:1.6,sprite:(e,n,u,r)=>qt(e,n,u,r,!1),fixedPal:5}];',
    '{name:"Gurkha LX",l:48,w:25,power:700,top:360,gripF:8.6,gripR:8,steer:0.6,' +
    'wheelbase:31,mass:1.6,sprite:(e,n,u,r)=>qt(e,n,u,r,!1),fixedPal:5},' +
    '{name:"Ambassador (State)",l:47,w:22,power:540,top:365,gripF:9,gripR:7.9,steer:0.56,' +
    'wheelbase:30,mass:1.26,fixedPal:4,vip:!0,sprite:(e,n,u,r)=>{' +
    'H5(e,n,u,["#f2f2ee","#cbcbc4","#ffffff"]);' +
    'e.fillStyle="#141519",a(e,n*0.455,u/2-2.6,n*0.09,5.2,1.7),e.fill();' +
    'e.fillStyle="#e01f1f",a(e,n*0.465,u/2-2,n*0.07,4,1.3),e.fill();' +
    'e.fillStyle="rgba(255,120,120,0.45)",e.beginPath(),' +
    'e.arc(n*0.5,u/2,4.2,0,Math.PI*2),e.fill();' +
    'e.fillStyle="#1b2a4a",e.fillRect(n*0.08,u/2-0.7,n*0.1,1.4)}},' +
    '{name:"Alibaug Ferry",l:88,w:32,power:580,top:240,gripF:6,gripR:5,steer:0.38,' +
    'wheelbase:44,mass:5.5,boat:!0,fixedPal:1,sprite:(e,n,u)=>{' +
    'e.fillStyle="#0f3868",a(e,0,0,n,u,6),e.fill();' +
    'e.fillStyle="#ffffff",a(e,n*0.1,2.5,n*0.78,u-5,4),e.fill();' +
    'e.fillStyle="#1e5ca8",a(e,n*0.22,5,n*0.52,u-10,3),e.fill();' +
    'e.fillStyle="#bfe4ff";for(let pi=0;pi<7;pi++){e.fillRect(n*0.25+pi*8,3,5,2);e.fillRect(n*0.25+pi*8,u-5,5,2)}' +
    'e.fillStyle="#ff9933",e.fillRect(2,u/2-2,5,1.3);' +
    'e.fillStyle="#ffffff",e.fillRect(2,u/2-0.7,5,1.4);' +
    'e.fillStyle="#128807",e.fillRect(2,u/2+0.7,5,1.3)}},' +
    '{name:"Speedboat",l:42,w:18,power:960,top:520,gripF:9.8,gripR:8.4,steer:0.76,' +
    'wheelbase:22,mass:0.75,boat:!0,nos:!0,fixedPal:0,sprite:(e,n,u)=>{' +
    'e.fillStyle="#dc2626",e.beginPath(),e.moveTo(n,u/2),e.lineTo(n*0.4,0),e.lineTo(0,1.5),e.lineTo(0,u-1.5),e.lineTo(n*0.4,u),e.closePath(),e.fill();' +
    'e.fillStyle="#ffffff",e.fillRect(n*0.18,3.5,n*0.45,u-7);' +
    'e.fillStyle="#38bdf8",e.fillRect(n*0.5,3.5,4,u-7);' +
    'e.fillStyle="#1e293b",e.fillRect(-3,2,4,3.5),e.fillRect(-3,u-5.5,4,3.5)}},' +
    '{name:"Police Speedboat",l:44,w:18,power:1020,top:540,gripF:10.2,gripR:8.8,steer:0.78,' +
    'wheelbase:23,mass:0.8,boat:!0,cop:!0,siren:1,nos:!0,fixedPal:1,sprite:(e,n,u)=>{' +
    'e.fillStyle="#1e3a8a",e.beginPath(),e.moveTo(n,u/2),e.lineTo(n*0.4,0),e.lineTo(0,1.5),e.lineTo(0,u-1.5),e.lineTo(n*0.4,u),e.closePath(),e.fill();' +
    'e.fillStyle="#f8fafc",e.fillRect(n*0.18,3.5,n*0.45,u-7);' +
    'e.fillStyle="#ef4444",a(e,n*0.35,u/2-3.5,5,3.5,1),e.fill();' +
    'e.fillStyle="#3b82f6",a(e,n*0.35,u/2,5,3.5,1),e.fill();' +
    'e.fillStyle="#0ea5e9",e.fillRect(n*0.52,3.5,4,u-7)}}];'
  ],
  [
    'vip systems and the water',
    'function $9(t){for(let z of s.cars){if(z.dead){z.wreckT+=t;continue}if(z.hp<=0',
    // Landmarks with exact verified coordinates:
    'var hdAMB=89,' +
    'hdVIPH=[' +
    '{n:"TAJ LANDS END",who:"Bandra Fort Point",x:-56325,y:26930},' +
    '{n:"MANNAT",who:"Shah Rukh Khan",x:-55790,y:23185},' +
    '{n:"BANDSTAND",who:"Coastal Promenade",x:-54800,y:21840},' +
    '{n:"GALAXY",who:"Salman Khan",x:-53466,y:19030},' +
    '{n:"JALSA",who:"Amitabh Bachchan",x:-51600,y:-14800},' +
    '{n:"ANTILIA",who:"Mukesh Ambani",x:-64800,y:86000},' +
    '{n:"MATOSHREE",who:"Thackeray family",x:-37500,y:12400},' +
    '{n:"GIRGAUM CHOWPATTY",who:"Marine Drive Bay",x:-64600,y:92000},' +
    '{n:"JUHU BEACH",who:"Juhu Coastline",x:-51000,y:-16000}];' +
    'function hdVipXY(h){if(h.x===void 0)h.x=T((h.lon-72.9)*kv),h.y=T(-(h.lat-19.08)*Av);return h}' +
    'function hdVip(t){let p=s.player,near=null,nd=1/0;' +
    'for(let i=0;i<hdVIPH.length;i++){let h=hdVipXY(hdVIPH[i]),d=Math.hypot(h.x-p.x,h.y-p.y);if(d<nd)nd=d,near=h}' +
    'if(near&&nd<T(200)){' +
    'if(s.t-(s.hdVipMsg??-99)>45)s.hdVipMsg=s.t,le(near.n+" — "+near.who+". Landmark.")}' +
    // Spawn parked military vehicles ONCE at the bases (no auto-alerts, no armed commandos, no stars!):
    'if(!s.hdArmySpawned){s.hdArmySpawned=1;' +
    's.cars.push({x:-51500,y:120500,h:0,vx:0,vy:0,w:0,steer:0,type:43,pal:0,seed:0.1,hp:1600,player:!1,ai:"parked",speed:0,stuck:0,panic:0,shootCd:0,burn:0,dead:!1,wreckT:0,siren:0,rider:null,hdMilitary:1});' +
    's.cars.push({x:-51650,y:120600,h:0,vx:0,vy:0,w:0,steer:0,type:44,pal:0,seed:0.2,hp:500,player:!1,ai:"parked",speed:0,stuck:0,panic:0,shootCd:0,burn:0,dead:!1,wreckT:0,siren:0,rider:null,hdMilitary:1});' +
    's.cars.push({x:-26000,y:-3000,h:0,vx:0,vy:0,w:0,steer:0,type:43,pal:0,seed:0.3,hp:1600,player:!1,ai:"parked",speed:0,stuck:0,panic:0,shootCd:0,burn:0,dead:!1,wreckT:0,siren:0,rider:null,hdMilitary:1});' +
    's.planes.push({x:-26200,y:-2900,h:0,speed:0,alt:0,mode:"stand",livery:0,turn:0,hx:-26200,hy:-2900,rwy:-1,kind:"jet",spin:0});s.cars.push({x:-45200,y:116900,h:-0.4,vx:50,vy:-20,w:0,steer:0,type:90,pal:1,seed:0.1,hp:2000,player:!1,ai:"traffic",speed:100,stuck:0,panic:0,shootCd:0,burn:0,dead:!1,wreckT:0,siren:0,rider:null,hdBoat:1});s.cars.push({x:-45450,y:116600,h:1.2,vx:0,vy:0,w:0,steer:0,type:91,pal:0,seed:0.2,hp:300,player:!1,ai:"parked",speed:0,stuck:0,panic:0,shootCd:0,burn:0,dead:!1,wreckT:0,siren:0,rider:null,hdBoat:1});s.cars.push({x:-44600,y:117600,h:1.5,vx:70,vy:70,w:0,steer:0,type:92,pal:1,seed:0.3,hp:450,player:!1,ai:"cop",speed:150,stuck:0,panic:0,shootCd:0,burn:0,dead:!1,wreckT:0,siren:1,rider:null,hdBoat:1,patrol:!0});s.cars.push({x:-64850,y:92150,h:-1.5,vx:0,vy:0,w:0,steer:0,type:91,pal:0,seed:0.4,hp:300,player:!1,ai:"parked",speed:0,stuck:0,panic:0,shootCd:0,burn:0,dead:!1,wreckT:0,siren:0,rider:null,hdBoat:1});}}' +
    'function $9(t){hdVip(t);for(let z of s.cars){if(z.dead){' +
    'if(z.hdVip&&!z.hdPaid)z.hdPaid=1,s.player.cash+=250000,s.player.score+=4000,' +
    's.stars=5,s.chasePeak=5,s.seenAgo=0,Zn(6,!0),' +
    'le("VIP DOWN — ₹2,50,000 wired. Police units responding!");' +
    'z.wreckT+=t;continue}' +
    // Drowning: ONLY when in actual deep water (NOT on bridges, NOT on any road, NOT on land!)
    'if(!nl(z.x,z.y)&&!z.deck&&X9(z.x,z.y)===null&&!cu(D,z.x,z.y)&&!(Du(D,z.x,z.y,T(22))?.dist<=T(22))&&!Ie(z.type).boat){z.hdW=(z.hdW??0)+t,z.speed=0,' +
    'z.vx*=Math.max(0,1-3*t),z.vy*=Math.max(0,1-3*t);' +
    'if(Math.random()<t*16)s.parts.push({x:z.x+(Math.random()-0.5)*18,' +
    'y:z.y+(Math.random()-0.5)*14,vx:(Math.random()-0.5)*40,vy:-25-Math.random()*35,' +
    'life:0.45+Math.random()*0.3,max:0.75,r:2+Math.random()*4,col:"#d8eef8",glow:!0});' +
    'if(z.hdW>1.6){z.dead=!0,z.wreckT=0,z.hp=0,En.thud(0.5);' +
    'if(z.player)s.player.carIdx=-1,s.player.onFoot=!0,to(18),le("Sank it. You swam out.");' +
    'else if(z.ai==="cop")le("Police cruiser in the drink.");continue}}else z.hdW=0;' +
    'if(z.hp<=0'
  ],
  [
    'vip residence markers',
    'f.fillText(h.label,h.x,h.y+S+14)}}if(s.waypoint){let C=s.waypoint;',
    'f.fillText(h.label,h.x,h.y+S+14)}}' +
    // --- Custom Architectural Renderers for Famous Landmarks ---
    // 1. GATEWAY OF INDIA (Apollo Bunder, Colaba): Grand yellow-basalt triumphal arch with 4 turrets & dome
    '{let gx=-45800,gy=116800,gDist=Math.hypot(gx-s.cam.x,gy-s.cam.y);' +
    'if(gDist<$/2+300){f.save(),f.translate(gx,gy);' +
    // Paved stone plaza facing the sea
    'f.fillStyle="#6e685e",f.fillRect(-45,-30,90,60);' +
    // Main archway body (yellow-brown basalt)
    'f.fillStyle="#c4a56a",f.fillRect(-32,-18,64,36);' +
    // 4 octagonal corner turrets with domes
    'f.fillStyle="#a8884d";' +
    'f.fillRect(-35,-21,12,12),f.fillRect(23,-21,12,12),f.fillRect(-35,9,12,12),f.fillRect(23,9,12,12);' +
    // Central dome
    'f.fillStyle="#d4b778",f.beginPath(),f.arc(0,0,10,0,Math.PI*2),f.fill();' +
    // Central arch opening (dark passage)
    'f.fillStyle="#1c1914",f.fillRect(-10,-8,20,16);' +
    'f.font="bold 12px system-ui",f.textAlign="center",f.fillStyle="#fcd34d",' +
    'f.fillText("GATEWAY OF INDIA",0,32),f.restore();}}' +
    // 2. ANTILIA (Altamount Road): 27-storey architectural skyscraper (88x80px) with cantilevers, hanging gardens & 3 helipads
        // --- SAKI NAKA JUNCTION LANDMARKS ---
    // 1. Saki Naka Metro Station (Accurate Junction Location on Line 1 elevated tracks!)
    '{let snx=-11800,sny=-19800,snDist=Math.hypot(snx-s.cam.x,sny-s.cam.y);' +
    'if(snDist<$/2+300){f.save(),f.translate(snx,sny);' +
    'let sL=40*G,sW=16*G;' +
    'f.fillStyle="rgba(0,0,0,0.5)",f.fillRect(-sL/2+4*G,-sW/2+6*G,sL,sW);' +
    'let gr=f.createLinearGradient(0,-sW/2,0,sW/2);gr.addColorStop(0,"#0284c7"),gr.addColorStop(0.5,"#38bdf8"),gr.addColorStop(1,"#0369a1");' +
    'f.fillStyle=gr,f.beginPath(),f.roundRect(-sL/2,-sW/2,sL,sW,4*G),f.fill();' +
    'f.strokeStyle="#0f172a",f.lineWidth=1,f.stroke();' +
    'f.fillStyle="#e0f2fe",f.beginPath(),f.roundRect(-sL*0.28,-sW*0.22,sL*0.56,sW*0.44,2*G),f.fill();' +
    'f.font="bold 9px system-ui",f.fillStyle="#fde047",f.textAlign="center",f.textBaseline="middle",f.fillText("SAKI NAKA METRO",0,sW/2+8);' +
    'f.restore();}}' +
    // 2. McDonald's Saki Naka (Golden Arches)
    '{let mx=-12150,my=-20750,mDist=Math.hypot(mx-s.cam.x,my-s.cam.y);' +
    'if(mDist<$/2+250){f.save(),f.translate(mx,my);' +
    'f.fillStyle="rgba(0,0,0,0.4)",f.fillRect(-22,-16,48,36);' +
    'f.fillStyle="#dc2626",f.fillRect(-24,-18,48,36);' +
    'f.strokeStyle="#facc15",f.lineWidth=1.5,f.strokeRect(-24,-18,48,36);' +
    'f.font="900 16px Impact,sans-serif",f.fillStyle="#facc15",f.textAlign="center",f.textBaseline="middle",f.fillText("M",0,-2);' +
    'f.font="bold 8px system-ui",f.fillStyle="#ffffff",f.fillText("McDONALDS",0,11);' +
    'f.restore();}}' +
    // 3. KFC Saki Naka
    '{let kx=-11950,my=-20650,kDist=Math.hypot(kx-s.cam.x,my-s.cam.y);' +
    'if(kDist<$/2+250){f.save(),f.translate(kx,my);' +
    'f.fillStyle="rgba(0,0,0,0.4)",f.fillRect(-20,-16,44,34);' +
    'f.fillStyle="#ffffff",f.fillRect(-22,-18,44,34);' +
    'f.fillStyle="#dc2626";for(let xi=-22;xi<=16;xi+=8)f.fillRect(xi,-18,4,34);' +
    'f.fillStyle="#1e293b",f.fillRect(-14,-8,28,16);' +
    'f.font="900 11px system-ui",f.fillStyle="#ffffff",f.textAlign="center",f.textBaseline="middle",f.fillText("KFC",0,0);' +
    'f.restore();}}' +
    // 4. Shagun Restaurant Saki Naka (Landmark Multi-Cuisine)
    '{let sx=-12050,sy=-20950,sDist=Math.hypot(sx-s.cam.x,sy-s.cam.y);' +
    'if(sDist<$/2+250){f.save(),f.translate(sx,sy);' +
    'f.fillStyle="rgba(0,0,0,0.4)",f.fillRect(-26,-18,56,40);' +
    'f.fillStyle="#78350f",f.fillRect(-28,-20,56,40);' +
    'f.strokeStyle="#d97706",f.lineWidth=1.5,f.strokeRect(-28,-20,56,40);' +
    'f.font="bold 9px system-ui",f.fillStyle="#fef08a",f.textAlign="center",f.textBaseline="middle",f.fillText("SHAGUN RESTAURANT",0,0);' +
    'f.restore();}}' +
    // 5. Hush Mattress Showroom (Sakinaka)
    '{let hx=-12400,hy=-20900,hDist=Math.hypot(hx-s.cam.x,hy-s.cam.y);' +
    'if(hDist<$/2+250){f.save(),f.translate(hx,hy);' +
    'f.fillStyle="rgba(0,0,0,0.4)",f.fillRect(-24,-16,52,36);' +
    'f.fillStyle="#1e1b4b",f.fillRect(-26,-18,52,36);' +
    'f.strokeStyle="#818cf8",f.lineWidth=1.5,f.strokeRect(-26,-18,52,36);' +
    'f.font="900 10px system-ui",f.fillStyle="#c7d2fe",f.textAlign="center",f.textBaseline="middle",f.fillText("HUSH MATTRESS",0,-2);' +
    'f.font="bold 7px system-ui",f.fillStyle="#94a3b8",f.fillText("SLEEP STUDIO",0,8);' +
    'f.restore();}}' +
    // --- CRESCENT SOLITAIRE (Sakinaka Tele Exchange Lane - User Office Building) ---
    '{let csx=-13150,csy=-15300,csDist=Math.hypot(csx-s.cam.x,csy-s.cam.y);' +
    'if(csDist<$/2+300){f.save(),f.translate(csx,csy);' +
    // 3D Drop Shadow
    'f.fillStyle="rgba(0,0,0,0.45)",f.fillRect(-44,-30,94,70);' +
    // Ground podium & parking plaza
    'f.fillStyle="#1e293b",f.fillRect(-48,-34,96,68);' +
    // Commercial glass facade with cyan windows
    'f.fillStyle="#0284c7",f.fillRect(-44,-30,88,60);' +
    'f.fillStyle="#38bdf8",f.fillRect(-40,-26,80,24);' +
    // White architectural window mullion grid
    'f.strokeStyle="rgba(255,255,255,0.7)",f.lineWidth=1;' +
    'for(let wx=-36;wx<=36;wx+=12)f.strokeRect(wx,-26,8,24);' +
    // Executive rooftop terrace & solar array
    'f.fillStyle="#1e3a8a",f.fillRect(-36,4,32,18);' +
    'f.fillStyle="#15803d",f.fillRect(6,4,30,18);' +
    // Crescent Solitaire Signage
    'f.fillStyle="rgba(10,15,26,0.92)",f.fillRect(-54,38,108,20);' +
    'f.strokeStyle="#38bdf8",f.lineWidth=1,f.strokeRect(-54,38,108,20);' +
    'f.font="bold 10px system-ui",f.fillStyle="#fde047",f.textAlign="center",f.textBaseline="middle",f.fillText("CRESCENT SOLITAIRE",0,48);' +
    'f.restore();}}' +
    '{let ax=-64800,ay=86000,aDist=Math.hypot(ax-s.cam.x,ay-s.cam.y);' +
    'if(aDist<$/2+400){f.save(),f.translate(ax,ay);' +
    // Massive 25m drop shadow
    'f.fillStyle="rgba(0,0,0,0.48)",f.fillRect(-36,-30,94,88);' +
    // Ground & Podium Levels (Floors 1-6): Dark granite parking & ballroom base
    'f.fillStyle="#1e293b",f.fillRect(-42,-36,84,76);' +
    // Architectural vertical louvers on podium
    'f.fillStyle="#475569";for(let li=-38;li<=36;li+=6)f.fillRect(li,-34,2,72);' +
    // Lower Cantilever Block: Projects 14px to the west
    'f.fillStyle="#334155",f.fillRect(-48,-24,44,52);' +
    // Upper Cantilever Block: Projects 14px to the east
    'f.fillStyle="#1e293b",f.fillRect(4,-28,42,48);' +
    // Exposed structural W and X steel truss bracing
    'f.strokeStyle="#94a3b8",f.lineWidth=1.5,f.strokeRect(-46,-22,40,48),f.strokeRect(6,-26,38,44);' +
    // Lush hanging garden terraces (tropical trees & foliage overflowing)
    'f.fillStyle="#15803d",f.fillRect(-48,-22,12,48),f.fillRect(36,-26,12,44);' +
    'f.fillStyle="#22c55e",f.fillRect(-46,-18,8,40),f.fillRect(38,-22,8,36);' +
    // Reflective cyan glass curtain walls
    'f.fillStyle="#0284c7",f.fillRect(-30,-20,60,40);' +
    'f.fillStyle="#38bdf8",f.fillRect(-26,-16,52,18);' +
    // Summit 3-Helipad deck (Floors 25-27)
    'f.fillStyle="#0f172a",f.fillRect(-24,-16,48,32);' +
    'f.strokeStyle="#facc15",f.lineWidth=2,f.strokeRect(-24,-16,48,32);' +
    // Main circular helipad landing zone
    'f.fillStyle="#1e293b",f.beginPath(),f.arc(0,0,12,0,Math.PI*2),f.fill();' +
    'f.strokeStyle="#ef4444",f.lineWidth=1.5,f.beginPath(),f.arc(0,0,12,0,Math.PI*2),f.stroke();' +
    'f.fillStyle="#ffffff",f.font="bold 12px system-ui",f.textAlign="center",f.textBaseline="middle",f.fillText("H",0,0);' +
    // 4 flashing red aircraft warning obstruction lights on summit corners
    'let obsStrobe=0.5+0.5*Math.sin(s.t*8);' +
    'f.fillStyle=`rgba(239,68,68,${0.3+0.7*obsStrobe})`;' +
    'f.fillRect(-25,-17,4,4),f.fillRect(21,-17,4,4),f.fillRect(-25,13,4,4),f.fillRect(21,13,4,4);' +
    // Elegant landmark label badge
    'f.fillStyle="rgba(10,12,16,0.85)",f.fillRect(-64,44,128,24);' +
    'f.strokeStyle="#facc15",f.lineWidth=1,f.strokeRect(-64,44,128,24);' +
    'f.font="bold 10px system-ui",f.fillStyle="#fde047",f.textAlign="center",f.textBaseline="alphabetic",f.fillText("ANTILIA • 27 STOREYS",0,56);' +
    'f.font="bold 8px system-ui",f.fillStyle="#cbd5e1",f.fillText("MUKESH AMBANI RESIDENCE",0,65);' +
    'f.restore();}}' +
    // 3. MANNAT (Bandstand Promenade): Neo-classical white heritage mansion with classical portico
    '{let mx=-55790,my=23185,mDist=Math.hypot(mx-s.cam.x,my-s.cam.y);' +
    'if(mDist<$/2+300){f.save(),f.translate(mx,my);' +
    // Lawn & garden
    'f.fillStyle="#38a169",f.fillRect(-30,-22,60,44);' +
    // White Italian marble mansion facade
    'f.fillStyle="#f7fafc",f.fillRect(-22,-16,44,32);' +
    'f.strokeStyle="#cbd5e0",f.lineWidth=1.5,f.strokeRect(-22,-16,44,32);' +
    // Neoclassical entrance pillars & pediment
    'f.fillStyle="#e2e8f0";' +
    'for(let pi=0;pi<4;pi++) f.fillRect(-15+pi*10,-18,3,8);' +
    // Rooftop terrace
    'f.fillStyle="#e7f0f8",f.fillRect(-18,-12,36,10);' +
    'f.font="bold 12px system-ui",f.textAlign="center",f.fillStyle="#fcd34d",' +
    'f.fillText("MANNAT — SHAH RUKH KHAN",0,28),f.restore();}}' +
    // Landmarks gold rings & labels:
    'for(let hdI=0;hdI<hdVIPH.length;hdI++){let hdH=hdVipXY(hdVIPH[hdI]);' +
    'if(Math.abs(hdH.x-s.cam.x)>$/2+200||Math.abs(hdH.y-s.cam.y)>N/2+200)continue;' +
    'let hdR=24+Math.sin(s.t*2.2+hdI)*3;' +
    'f.fillStyle="rgba(255,196,80,0.12)",f.beginPath(),' +
    'f.arc(hdH.x,hdH.y,hdR,0,Math.PI*2),f.fill(),' +
    'f.strokeStyle="rgba(255,196,80,0.85)",f.lineWidth=2.6,f.beginPath(),' +
    'f.arc(hdH.x,hdH.y,hdR,0,Math.PI*2),f.stroke(),' +
    'f.font="bold 11px system-ui",f.textAlign="center",' +
    'f.fillStyle="rgba(255,226,160,0.95)",f.fillText(hdH.n,hdH.x,hdH.y-hdR-7),' +
    'f.font="bold 9px system-ui",f.fillStyle="rgba(228,230,224,0.82)",' +
    'f.fillText(hdH.who,hdH.x,hdH.y+hdR+12)}' +
    'for(let hdK=0;hdK<s.cars.length;hdK++){let hdV=s.cars[hdK];' +
    'if(!hdV.hdVip||hdV.dead)continue;' +
    'let hdM=20+Math.sin(s.t*6)*3;' +
    'f.strokeStyle="rgba(255,70,70,0.9)",f.lineWidth=2.4,f.beginPath(),' +
    'f.arc(hdV.x,hdV.y,hdM,0,Math.PI*2),f.stroke(),' +
    'f.font="bold 9px system-ui",f.textAlign="center",' +
    'f.fillStyle="rgba(255,170,170,0.95)",' +
    'f.beginPath(),f.moveTo(hdV.x-hdM-6,hdV.y),f.lineTo(hdV.x+hdM+6,hdV.y),f.moveTo(hdV.x,hdV.y-hdM-6),f.lineTo(hdV.x,hdV.y+hdM+6),f.stroke(),f.font="bold 10px system-ui",f.textAlign="center",f.fillStyle="#fee2e2",f.fillText("🎯 TARGET: "+(hdV.hdTargetName||"VIP CONVOY"),hdV.x,hdV.y-hdM-8)}' +
    'var hdCranes=[{n:"METRO LINE 3",x:-21500,y:8200,h:0.8},{n:"COASTAL ROAD WORK",x:-57800,y:48000,h:2.1},{n:"LOWER PAREL CRANE",x:-44000,y:76000,h:1.4},{n:"ANDHERI METRO",x:-37200,y:-29000,h:-0.6}];' +
    'for(let c of hdCranes){if(Math.abs(c.x-s.cam.x)>$/2+200||Math.abs(c.y-s.cam.y)>N/2+200)continue;' +
    'f.save(),f.translate(c.x,c.y);' +
    'f.fillStyle="#f97316",f.fillRect(-18,-18,36,36);f.fillStyle="#ffffff",f.fillRect(-14,-14,28,28);f.fillStyle="#f97316",f.fillRect(-10,-10,20,20);' +
    'f.fillStyle="#eab308",f.fillRect(-5,-5,10,10);' +
    'f.strokeStyle="#ca8a04",f.lineWidth=2.5,f.beginPath(),f.moveTo(0,0),f.lineTo(Math.cos(c.h)*44,Math.sin(c.h)*44),f.stroke();' +
    'f.strokeStyle="#475569",f.lineWidth=3.5,f.beginPath(),f.moveTo(0,0),f.lineTo(-Math.cos(c.h)*14,-Math.sin(c.h)*14),f.stroke();' +
    'f.fillStyle=Math.sin(s.t*6)>0?"#ef4444":"#7f1d1d",f.beginPath(),f.arc(0,0,3,0,Math.PI*2),f.fill();' +
    'f.font="bold 9px system-ui",f.textAlign="center",f.fillStyle="#fde047",f.fillText(c.n,0,22),f.restore();}' +
    'if(s.waypoint){let C=s.waypoint;'
  ],

  // Every remaining impact cue goes as well — landings, punches, tank crushes
  // and the cargo spill. No synthesised collision sound survived the ear test,
  // so collisions are silent for the player and for the AI alike.
  [
    'no vehicle landing sound',
    't.pitch=0,En.thud(Math.min(0.45,Ee/350));',
    't.pitch=0;'
  ],
  [
    'no heli landing sound',
    't.pitch=0,En.thud(Math.min(0.5,N/320)),N>170',
    't.pitch=0,N>170'
  ],
  [
    'no punch sound',
    'z.wpY=z.y+Math.sin(N)*320,En.thud(0.2),s.cam.shake',
    'z.wpY=z.y+Math.sin(N)*320,s.cam.shake'
  ],
  [
    'no crush sound',
    'iu((z.x+Z.x)/2,(z.y+Z.y)/2,8),En.thud(0.6),s.cam.shake',
    'iu((z.x+Z.x)/2,(z.y+Z.y)/2,8),s.cam.shake'
  ],

  // The convoy is spawned on a road near the player, and the traffic culler
  // would otherwise delete it the same frame it appears.
  [
    'convoy survives the culler',
    'N=Math.hypot($.x-s.player.x,$.y-s.player.y),J=N>v;if($.dead&&$.wreckT>25&&J',
    'N=Math.hypot($.x-s.player.x,$.y-s.player.y),J=N>v;' +
    'if(($.hdVip||$.hdEscort||$.hdMilitary||$.hdBoat)&&!$.dead)continue;' +
    'if($.dead&&$.wreckT>25&&J'
  ],

  // fo(t) despawns ambient cars when they run out of road; VIP convoy cars must
  // never be deleted by it — they just re-bind to the next lane.
  [
    'fo never despawns convoy',
    'if(v===s.player.carIdx){t.rider=null;return}',
    'if(v===s.player.carIdx||t.hdVip||t.hdEscort||t.hdMilitary||t.hdBoat){t.rider=null;return}'
  ],

  // ===== big map zooming + mouse wheel / bracket keys ======================
  [
    'big map zoom renderer',
    'function h9(t,v){let z=Au.width/2*Nr;wu.setTransform(1,0,0,1,0,0),wu.fillStyle="#16191c",wu.fillRect(0,0,Au.width,Au.height),wu.save(),wu.translate(Au.width/2,Au.height/2),wu.scale(1/Nr,1/Nr),wu.translate(-t,-v),Ml.x0=t-z,Ml.y0=v-z,Ml.x1=t+z,Ml.y1=v+z,qi(D,Ml),Ii(D,Ml),gi(D,Ml),wu.restore()}',
    'function h9(t,v){let hdZ=s.mapScale??1,currNr=Nr*hdZ,z=Au.width/2*currNr;wu.setTransform(1,0,0,1,0,0),wu.fillStyle="#16191c",wu.fillRect(0,0,Au.width,Au.height),wu.save(),wu.translate(Au.width/2,Au.height/2),wu.scale(1/currNr,1/currNr),wu.translate(-t,-v),Ml.x0=t-z,Ml.y0=v-z,Ml.x1=t+z,Ml.y1=v+z,Ml.zoom=1/currNr,qi(D,Ml),Ii(D,Ml),w6(D,Ml),gi(D,Ml),wu.restore()}'
  ],
  [
    'big map S scale',
    'let S=(oe,Ze)=>[R+C/2+(oe-k.x)/Nr,h+C/2+(Ze-k.y)/Nr];',
    'let hdZ=s.mapScale??1,currNr=Nr*hdZ,S=(oe,Ze)=>[R+C/2+(oe-k.x)/currNr,h+C/2+(Ze-k.y)/currNr];'
  ],
  [
    'big map wheel zoom',
    'U9=(t)=>{if(Q.current!=="play")return;t.preventDefault();let v=Math.sign(t.deltaY)*-0.08;s.zoomBias=ze(s.zoomBias*(1+v),0.45,2.6),s.zoomMsgT=s.t};',
    'U9=(t)=>{if(Q.current!=="play")return;t.preventDefault();if(s.mapOpen){let v=Math.sign(t.deltaY)*0.32;s.mapScale=ze((s.mapScale??1)*(1+v),0.45,9.8);return}let v=Math.sign(t.deltaY)*-0.08;s.zoomBias=ze(s.zoomBias*(1+v),0.45,2.6),s.zoomMsgT=s.t};'
  ],
  [
    'big map key zoom',
    'if((v==="["||v==="]")&&Q.current==="play")s.zoomBias=ze(s.zoomBias*(v==="]"?1.12:0.89),0.45,2.6),s.zoomMsgT=s.t;',
    'if((v==="["||v==="]")&&Q.current==="play"){if(s.mapOpen){s.mapScale=ze((s.mapScale??1)*(v==="]"?0.72:1.38),0.45,9.8);return}s.zoomBias=ze(s.zoomBias*(v==="]"?1.12:0.89),0.45,2.6),s.zoomMsgT=s.t;}'
  ],

  // ===== Sea Link & bridges visible on Minimap and Big Map =================
  [
    'draw bridges on minimap',
    'qi(D,wl),Ii(D,wl),gi(D,wl),ku.restore()',
    'qi(D,wl),Ii(D,wl),w6(D,wl),gi(D,wl),ku.restore()'
  ],

  // ===== Mumbai local train iconic maroon & yellow livery ===================
  [
    'mumbai local train livery',
    '{body:u?"#3a4a2e":"#6a7c48",stripe:"#f0d24a",window:u?"#dfe8c8":"#1a2214",nose:"#c45c2a",roof:"#4a5538",L:16,W:2.9,nWin:6}',
    '{body:u?"#4a121a":"#781d28",stripe:"#f5b000",window:u?"#ffe699":"#1e293b",nose:"#f5b000",roof:"#94a3b8",L:16,W:2.9,nWin:6}'
  ],
  // ===== Pedestrian clothing diversity (sarees, kurtas, shirts) =============
  [
    'pedestrian clothing diversity',
    'let z=t.kind==="cop"?"#27405e":t.kind==="medic"?"#1f4fd8":t.kind==="crew"?"#d8ef3a":t.kind==="reporter"?"#1d2733":t.kind==="camera"?"#2f3a2a":t.kind==="flee"?"#7a4d9e":["#b0533a","#3a6e50","#4a5f82","#8a8a3a","#6e3a5f"][Math.floor(t.speed)%5];',
    'let z=t.kind==="cop"?"#27405e":t.kind==="medic"?"#1f4fd8":t.kind==="crew"?"#d8ef3a":t.kind==="reporter"?"#1d2733":t.kind==="camera"?"#2f3a2a":t.kind==="flee"?"#7a4d9e":["#f97316","#2563eb","#dc2626","#059669","#ca8a04","#db2777","#7c3aed","#0891b2","#f8fafc","#334155","#be123c","#d97706"][Math.floor((t.seed??0.5)*12)%12];'
  ],
  // ===== Bridges & flyovers: zero water damage while on a bridge ============
  // The original bundle only checked Ji(D, t.x, t.y), which failed if a car was
  // more than 1.8m from the single-track centerline of a wide dual-carriageway
  // bridge (e.g. Bandra Kurla Complex Road over Mithi River, or Rajiv Gandhi
  // Sea Link). When that failed, the car took 170 HP/s water damage and blew up!
  [
    'bridges immune to water damage',
    '!nl(t.x,t.y)&&!Ji(D,t.x,t.y)){if(t.hp-=170*v,t.vx*=1-2.2*v,t.vy*=1-2.2*v',
    '!nl(t.x,t.y)&&!Ji(D,t.x,t.y)&&!cu(D,t.x,t.y)&&!(Du(D,t.x,t.y,T(35))?.dist<=T(35))){if(t.hp-=170*v,t.vx*=1-2.2*v,t.vy*=1-2.2*v'
  ],
  // ===== Realistic Mumbai trees (Coconut Palms + layered canopy) matching user image 6 =====
  [
    'mumbai realistic trees',
    'function aE(e,n){let u=Bl(n.pts);if(!u)return;let r=u.x1-u.x0,l=u.y1-u.y0;if(!y(r)||!y(l)||r<15*G||l<15*G)return;let o=ru(Math.floor(r*l/(450*G*G)),1,60);e.fillStyle="rgba(28,56,26,0.45)";for(let i=0;i<o;i++){let E=u.x0+Un(i*13.7+u.x0,u.y0)*r,Q=u.y0+Un(i*7.3+u.y0,u.x1)*l;if(!y(E)||!y(Q))continue;if(!j6(n.pts,E,Q))continue;let V=(2.5+Un(E,Q)*2.5)*G;e.beginPath(),e.arc(E,Q,V,0,Math.PI*2),e.fill()}}',
    'function aE(e,n){let u=Bl(n.pts);if(!u)return;let r=u.x1-u.x0,l=u.y1-u.y0;if(!y(r)||!y(l)||r<15*G||l<15*G)return;let o=ru(Math.floor(r*l/(750*G*G)),1,22);for(let i=0;i<o;i++){let E=u.x0+Un(i*13.7+u.x0,u.y0)*r,Q=u.y0+Un(i*7.3+u.y0,u.x1)*l;if(!y(E)||!y(Q)||!j6(n.pts,E,Q))continue;let V=(2.6+Un(E,Q)*2.4)*G,isPalm=Un(E*3.1,Q*7.7)>0.42;if(isPalm){e.save(),e.translate(E,Q),e.strokeStyle="#3d8234",e.lineWidth=Math.max(1.8*G,2);for(let fi=0;fi<6;fi++){let ang=(fi/6)*Math.PI*2;e.beginPath(),e.moveTo(0,0),e.lineTo(Math.cos(ang)*V,Math.sin(ang)*V),e.stroke()}e.fillStyle="#664d2b",e.beginPath(),e.arc(0,0,V*0.24,0,Math.PI*2),e.fill(),e.restore()}else{e.fillStyle="#2d6325",e.beginPath(),e.arc(E,Q,V,0,Math.PI*2),e.fill(),e.fillStyle="#489938",e.beginPath(),e.arc(E-V*0.2,Q-V*0.2,V*0.5,0,Math.PI*2),e.fill()}}}'
  ],
  // ===== Iconic Mumbai Landmarks + Rooftop AC chillers, water tanks, chawl tarpaulins (matching user reference sheets) =====
  [
    'identify mumbai iconic buildings',
    'if(e.kind==="religious")return"temple";return""}',
    'if(e.kind==="religious")return"temple";if(/taj.*palace|taj.*hotel/.test(n))return"taj";if(/csmt|cst|chhatrapati shivaji/.test(n))return"csmt";if(/bse|stock exchange/.test(n))return"bse";if(/one bkc/.test(n))return"onebkc";if(/air india/.test(n))return"airindia";if(/express tower/.test(n))return"express";if(/mantralaya/.test(n))return"mantralaya";if(/asiatic|town hall/.test(n))return"asiatic";return""}'
  ],
  // ===== Custom PNG Image Sprite Hook (supports dropping PNGs into /sprites/cars/) =====
  // ===== Natural Proportions Custom Sprite Hook (No Narrow Cars, No Long Bikes!) =====
  [
    'custom png sprite hook',
    'function S$(e,n){let u=Ie(e),r=u.fixedPal,l=Math.max(0,Math.floor(Number.isFinite(r??n)?r??n:0)),o=`${e},${l}`,i=V5.get(o);if(i)return i;let E=8,Q=document.createElement("canvas");Q.width=(u.l+E*2)*Di,Q.height=(u.w+E*2)*Di;let V=Q.getContext("2d");V.scale(Di,Di),V.translate(E,E);let _=zr[l%zr.length]??zr[0];return u.sprite(V,u.l,u.w,_),V5.set(o,Q),Q}',
    'function S$(e,n){let u=Ie(e),r=u.fixedPal,l=Math.max(0,Math.floor(Number.isFinite(r??n)?r??n:0)),o=`${e},${l}`,i=V5.get(o);if(i)return i;' +
    'let hdImg=window.__hdGetCustomSprite?window.__hdGetCustomSprite(e,u):null;' +
    'let hasHd=!!(hdImg&&hdImg.complete&&hdImg.naturalWidth>0);' +
    'let asp=hasHd?(hdImg.naturalWidth/hdImg.naturalHeight):(u.l/u.w);' +
    // Natural proportions: clamp buses/trucks <= 22px; bikes compact (never elongated)
    'let isBike=!!(u.bike||(u.w<=14&&u.l>=28)),isTruck=!!(u.l>=60||u.kind==="truck");' +
    'let drawL=isBike?26:u.l;' +
    'let drawW=hasHd?(drawL/asp):(isBike?14:Math.max(u.w,drawL*0.48));' +
    'if(isTruck&&drawW>22)drawW=22;' +
    'let E=8,Q=document.createElement("canvas");' +
    'Q.width=(drawL+E*2)*Di,Q.height=(drawW+E*2)*Di;' +
    'let V=Q.getContext("2d");V.scale(Di,Di),V.translate(E,E);' +
    'let _=zr[l%zr.length]??zr[0];' +
    'if(hasHd){V.drawImage(hdImg,0,0,drawL,drawW)}else{u.sprite(V,drawL,drawW,_)}' +
    'return V5.set(o,Q),Q}'
  ],

  // ===== Dynamic Canvas Draw Size Matching Natural Proportions + Flyover Ground Shadow =====
  [
    'dynamic natural car draw size',
    'let N=S$(t.type,t.pal),J=8,Z=v.l+J*2,K=v.w+J*2;if(t.dead)f.globalAlpha=0.55,f.drawImage(N,-Z/2,-K/2,Z,K)',
    'let N=S$(t.type,t.pal),Z=N.width/Di,K=N.height/Di;' +
    'if(t.deck&&!v.heli){f.save(),f.rotate(t.h),f.fillStyle="rgba(0,0,0,0.45)",f.beginPath(),f.ellipse(6,12,v.l*0.52,v.w*0.52,0,0,Math.PI*2),f.fill(),f.restore();}' +
    'if(t.dead)f.globalAlpha=0.55,f.drawImage(N,-Z/2,-K/2,Z,K)'
  ],
  // ===== Move Alert Badge to x=264 so it NEVER overlaps the player card =====
  [
    'alert badge position',
    'f.fillStyle="rgba(10,12,14,0.62)",f.fillRect(214,11,122,30),f.save(),f.globalAlpha=R,f.shadowColor=C.glow,f.shadowBlur=14,f.fillStyle=C.col,f.beginPath(),f.arc(229,26,7,0,Math.PI*2),f.fill(),f.restore(),f.fillStyle=C.col,f.font="bold 11px system-ui",f.textAlign="left",f.fillText(C.label,242,26),s.alert==="search")f.fillStyle="rgba(232,228,218,0.7)",f.font="9px system-ui",f.fillText(`stay hidden ${Math.max(0,15-Math.floor(s.seenAgo))}s`,242,38)',
    'f.fillStyle="rgba(10,12,14,0.78)",f.fillRect(264,11,118,28),f.save(),f.globalAlpha=R,f.shadowColor=C.glow,f.shadowBlur=12,f.fillStyle=C.col,f.beginPath(),f.arc(278,25,6,0,Math.PI*2),f.fill(),f.restore(),f.fillStyle=C.col,f.font="bold 10px system-ui",f.textAlign="left",f.fillText(C.label,290,25),s.alert==="search")f.fillStyle="rgba(203,213,225,0.8)",f.font="8px system-ui",f.fillText(`stay hidden ${Math.max(0,15-Math.floor(s.seenAgo))}s`,290,34)'
  ],
  // ===== In-Game Menu: HIT THE STREET guaranteed 100% on-screen on mobile =====
  [
    'in-game menu scrollable container',
    'className:"absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-black/80 via-black/70 to-black/85 px-6 text-center backdrop-blur-sm"',
    'className:"absolute inset-0 flex flex-col items-center justify-start md:justify-center gap-2 md:gap-3 bg-gradient-to-b from-black/92 via-black/85 to-black/95 px-4 md:px-6 py-4 md:py-6 overflow-y-auto text-center backdrop-blur-md"'
  ],
  [
    'hide desktop keyboard table on mobile',
    'className:"grid grid-cols-2 gap-x-8 gap-y-1 text-left text-xs text-neutral-400"',
    'className:"hidden md:grid grid-cols-2 gap-x-8 gap-y-1 text-left text-xs text-neutral-400"'
  ],

  ['news crew threshold', 'if(z<=5)continue;', 'if(z<=1)continue;'],
  [
    'job payout wording',
    's.fare=null,le(v?`Dropped — ₹${t.base} fare + ₹${z} tip.`:`Dropped — ₹${t.base} fare. Too slow for the tip.`)',
    's.fare=null,le(t.kind==="flo"?(v?`Delivered — ₹${t.base} + ₹${z} on-time bonus.`:' +
    '`Delivered — ₹${t.base}. Too slow for the bonus.`):t.kind==="cop"?' +
    '(v?`Scene handled — ₹${t.base} + ₹${z} response bonus.`:`Scene handled — ₹${t.base}. Too slow for the bonus.`):' +
    '(v?`Dropped — ₹${t.base} fare + ₹${z} tip.`:`Dropped — ₹${t.base} fare. Too slow for the tip.`))'
  ],
  // ===== 1. Bridge 3D Drop Shadow =====
  [
    'bridge drop shadow',
    'if(r.strokeStyle="rgba(0,0,0,0.42)",r.lineWidth=_+2.4*G,an(r,V.pts,Y*0.12,F*0.12))r.stroke();',
    'if(r.strokeStyle="rgba(0,0,0,0.68)",r.lineWidth=_+Math.max(8*G,14*i),an(r,V.pts,Y+10*G,F+16*G))r.stroke();'
  ],

  // ===== 2. Bridge Guardrails, Concrete Barriers & Lane Markings (Always Visible at Any Zoom!) =====
  [
    'bridge guardrails and lane lines',
    'if(r.strokeStyle=l.deck,r.lineWidth=Math.max(i*1.2,_),an(r,V.pts,Y,F))r.stroke();if(!E)continue;let B=Math.max(0.15*G,1*i);if(!V.oneway){if(r.strokeStyle=l.mark,r.lineWidth=B,r.setLineDash([3*G,6*G]),an(r,V.pts,Y,F))r.stroke();r.setLineDash([])}',
    // 1. Thick concrete guardrail crash barriers (fenders) along BOTH edges (wide and bold!):
    'r.strokeStyle="#cbd5e1";r.lineWidth=_+Math.max(6*G,10*i);if(an(r,V.pts,Y,F))r.stroke();' +
    // 2. Inner asphalt road deck:
    'if(r.strokeStyle=l.deck,r.lineWidth=Math.max(i*1.2,_),an(r,V.pts,Y,F))r.stroke();' +
    // 3. Unconditional lane markings at ALL zoom levels (NO if (!E) gate!):
    'let B=Math.max(1.4*G,1.8*i);' +
    'if(!V.oneway){r.strokeStyle="#f59e0b",r.lineWidth=B*1.4;if(an(r,V.pts,Y,F))r.stroke()}' +
    'else{r.strokeStyle="#f8fafc",r.lineWidth=B,r.setLineDash([5*G,7*G]);if(an(r,V.pts,Y,F))r.stroke();r.setLineDash([])}' +
    // 4. Reflective white curb shoulder lines along inner concrete barriers:
    'r.strokeStyle="rgba(255,255,255,0.75)",r.lineWidth=Math.max(0.8*G,i),r.setLineDash([8*G,12*G]);if(an(r,V.pts,Y,F))r.stroke();r.setLineDash([])'
  ],

  // ===== 3. Bridge Vehicle Fall & Height Physics (Works 100% on Flyover Edges!) =====
  [
    'bridge vehicle fall and height',
    'function ai(t){let v=X9(t.x,t.y);if(v===null){t.deck=!1,t.under=!1;return}if(t.deck){t.under=!1;return}let z=Math.abs(Yn(t.h,v)),$=z<Q2||z>Math.PI-Q2;t.deck=$,t.under=!$}',
    'function ai(t){let v=X9(t.x,t.y);' +
    'if(v===null){if(t.deck){t.deck=!1;t.z=18;t.vz=-45;if(t.player)le("PLUNGED OFF FLYOVER!");}' +
    'else{t.deck=!1}t.under=!1;return}' +
    'let z=Math.abs(Yn(t.h,v)),$=z<Q2||z>Math.PI-Q2;' +
    'if(t.deck&&!$){t.deck=!1;t.z=18;t.vz=-45;if(t.player)le("PLUNGED OFF FLYOVER!");return;}' +
    't.deck=$,t.under=!$}'
  ],

  // ===== 4. Ambassador Flashing Red VIP Beacon =====
  [
    'ambassador flashing red beacon',
    '!t.dead&&v.cop&&t.siren>0)P9(t,v);',
    '!t.dead&&(v.cop&&t.siren>0||v.vip||v.name==="Ambassador (State)"))(v.vip||v.name==="Ambassador (State)"?(()=>{' +
    'let st=0.5+0.5*Math.sin(s.t*14),al=0.25+0.55*st;' +
    'f.fillStyle=`rgba(255,30,30,${al*0.35})`,f.beginPath(),f.arc(t.x,t.y,36,0,Math.PI*2),f.fill();' +
    'f.fillStyle=`rgba(255,30,30,${al})`,f.beginPath(),f.arc(t.x,t.y,16,0,Math.PI*2),f.fill();' +
    'f.save(),f.translate(t.x,t.y),f.rotate(t.h+s.t*8);' +
    'f.fillStyle=`rgba(255,80,80,${0.4+0.5*st})`,f.beginPath(),f.moveTo(-2,-3),f.lineTo(24,-8),f.lineTo(24,8),f.lineTo(-2,3),f.closePath(),f.fill();' +
    'f.restore()})():P9(t,v));'
  ],

  // ===== 5. Big Map Click to Set GPS Waypoint Pin =====
  [
    'big map click to set gps waypoint',
    'if(s.mapOpen){s.mapOpen=!1;return}',
    'if(s.mapOpen){let tW=window.innerWidth,tH=window.innerHeight,C=Math.min(tW,tH)*0.72,R=tW-C-18,h=(tH-C)/2;' +
    'if(yn.x>=R&&yn.x<=R+C&&yn.y>=h&&yn.y<=h+C){' +
    'if(yn.x>R+C-36&&yn.y<h+36){s.mapOpen=!1;return;}' +
    'let hdZ=s.mapScale??1,currNr=Nr*hdZ;' +
    'let wx=s.player.x+(yn.x-(R+C/2))*currNr,wy=s.player.y+(yn.y-(h+C/2))*currNr;' +
    's.waypoint={x:wx,y:wy,name:"GPS PIN"};' +
    'le("GPS DESTINATION PIN SET! Follow navigation compass.");' +
    'return;}' +
    's.mapOpen=!1;return}'
  ],

  // ===== 6. Big Map District & Landmark Labels with Zoom Scaling =====
  [
    'big map labels and gps marker',
    'let[ue,ne]=S(d6,y6);f.fillStyle="#cfe6ff",f.beginPath(),f.arc(ue,ne,5,0,Math.PI*2),f.fill(),f.font="bold 11px system-ui",f.textAlign="left",f.fillText("CSMIA",ue+8,ne+4);',
    // 1. Draw GPS Waypoint pin if active:
    'if(s.waypoint){let[wpx,wpy]=S(s.waypoint.x,s.waypoint.y);' +
    'if(wpx>=R&&wpx<=R+C&&wpy>=h&&wpy<=h+C){' +
    'let wpPulse=0.5+0.5*Math.sin(s.t*8);' +
    'f.strokeStyle="#c084fc",f.lineWidth=3,f.beginPath(),f.arc(wpx,wpy,10+6*wpPulse,0,Math.PI*2),f.stroke();' +
    'f.fillStyle="#a855f7",f.beginPath(),f.arc(wpx,wpy,6,0,Math.PI*2),f.fill();' +
    'f.fillStyle="#ffffff",f.font="bold 11px system-ui",f.textAlign="center",f.fillText(s.waypoint.name||"GPS PIN",wpx,wpy-12);}}' +
    // 2. Top-right [X] close button:
    'f.fillStyle="rgba(239,68,68,0.85)",f.fillRect(R+C-32,h+6,26,26);' +
    'f.fillStyle="#ffffff",f.font="bold 16px sans-serif",f.textAlign="center",f.textBaseline="middle",f.fillText("✕",R+C-19,h+19);' +
    // 3. Map Instructions footer:
    'f.font="bold 10px system-ui",f.fillStyle="#fcd34d",f.textAlign="left",f.textBaseline="alphabetic",' +
    'f.fillText("CLICK ANYWHERE ON MAP TO SET GPS WAYPOINT • [ / ] ZOOM",R+10,h+C-12);' +
    // 4. CSMIA Airport label:
    'let[ue,ne]=S(d6,y6);f.fillStyle="#cfe6ff",f.beginPath(),f.arc(ue,ne,5,0,Math.PI*2),f.fill(),f.font="bold 11px system-ui",f.textAlign="left",f.fillText("CSMIA AIRPORT",ue+8,ne+4);' +
    // 5. All Major Mumbai Districts & Landmarks:
    'const hdMapDistricts=[' +
    '{n:"COLABA",x:-44000,y:121000},{n:"GATEWAY OF INDIA",x:-45800,y:116800},' +
    '{n:"FORT / CST",x:-44500,y:104000},{n:"CHURCHGATE",x:-47500,y:108000},' +
    '{n:"MARINE DRIVE",x:-50500,y:102000},{n:"GIRGAUM CHOWPATTY",x:-51500,y:92000},' +
    '{n:"MALABAR HILL",x:-58000,y:88000},{n:"ANTILIA (AMBANI)",x:-64800,y:86000},' +
    '{n:"WORLI",x:-52000,y:60000},{n:"BANDRA-WORLI SEA LINK",x:-45000,y:40000},' +
    '{n:"DADAR",x:-33000,y:45000},{n:"BANDRA WEST / MANNAT",x:-55000,y:24000},' +
    '{n:"BKC",x:-21741,y:8872},{n:"KURLA",x:-14728,y:11096},' +
    '{n:"JUHU BEACH",x:-51899,y:-23144},{n:"ANDHERI",x:-37171,y:-29573},' +
    '{n:"POWAI LAKE",x:0,y:-38000},{n:"THE WESTIN POWAI",x:878,y:-40278},' +
    '{n:"POWAI HERITAGE PARK",x:-1000,y:-36500},{n:"LAKESIDE CHALET",x:-211,y:-39075},' +
    '{n:"HIRANANDANI POWAI",x:6227,y:-29328},{n:"IIT BOMBAY",x:3500,y:-37000},' +
    '{n:"VIHAR LAKE",x:-8000,y:-45000},{n:"GHATKOPAR",x:-2737,y:-10893},' +
    '{n:"MULUND",x:23319,y:-57664},{n:"THANE",x:53161,y:-78739}];' +
    'f.textAlign="center",f.textBaseline="middle";' +
    'for(let d of hdMapDistricts){' +
    'let[dx,dy]=S(d.x,d.y);' +
    'if(dx<R+10||dy<h+10||dx>R+C-10||dy>h+C-10)continue;' +
    'f.font="900 10px system-ui,sans-serif";' +
    'f.fillStyle="rgba(4,6,10,0.88)",f.fillText(d.n,dx-1,dy),f.fillText(d.n,dx+1,dy),f.fillText(d.n,dx,dy-1),f.fillText(d.n,dx,dy+1);' +
    'f.fillStyle="#fde047",f.fillText(d.n,dx,dy);}'
  ],

  // ===== 7. Authentic Architectural Roof Styling for All Buildings =====
  [
    'architectural roof styling for all buildings',
    'let Ge=1+Math.floor(D*3);for(let _e=0;_e<Ge;_e++){let Xe=q.cx+L+(Un(D*31+_e,7)-0.5)*q.r*0.9,ae=q.cy+ve+(Un(D*17+_e,11)-0.5)*q.r*0.9;if(!y(Xe)||!y(ae))continue;let Me=ru(q.r*0.16,1.5*G,4*G);o.fillRect(Xe-Me/2,ae-Me/2,Me,Me),o.strokeRect(Xe-Me/2,ae-Me/2,Me,Me)}',
    'if(q.r*E>10){let rcx=q.cx+L,rcy=q.cy+ve,rRad=q.r;' +
    // Outer parapet wall coping rim (framed recessed roof surface)
    '' +
    'let arch=Math.floor(D*100)%5;' +
    'let seed=Math.floor(D*1000)%16;' +
    'if(seed<10){' +
    // 60% of buildings: Clean flush architectural roof deck with subtle recessed tone (ZERO BUTTERFLIES!)
    'o.fillStyle="rgba(0,0,0,0.06)",o.fillRect(rcx-rRad*0.6,rcy-rRad*0.6,rRad*1.2,rRad*1.2);}' +
    'else if(seed===10||seed===11){' +
    // Dark navy solar panel array
    'let pW=Math.min(rRad*0.6,8*G);o.fillStyle="#1e3a8a",o.fillRect(rcx-pW,rcy-pW*0.5,pW*2,pW);' +
    'o.strokeStyle="#94a3b8",o.lineWidth=Math.max(0.3*G,0.5*Q),o.strokeRect(rcx-pW,rcy-pW*0.5,pW*2,pW);}' +
    'else if(seed===12||seed===13){' +
    // Clean terracotta roof with single horizontal ridge beam (NO ORANGE X!)
    'o.fillStyle="#991b1b",o.beginPath(),o.moveTo(rcx-rRad*0.6,rcy-rRad*0.6),o.lineTo(rcx+rRad*0.6,rcy-rRad*0.6),o.lineTo(rcx,rcy),o.closePath(),o.fill();' +
    'o.fillStyle="#78350f",o.beginPath(),o.moveTo(rcx-rRad*0.6,rcy+rRad*0.6),o.lineTo(rcx+rRad*0.6,rcy+rRad*0.6),o.lineTo(rcx,rcy),o.closePath(),o.fill();' +
    'o.strokeStyle="#451a03",o.lineWidth=Math.max(0.4*G,Q),o.beginPath(),o.moveTo(rcx-rRad*0.6,rcy),o.lineTo(rcx+rRad*0.6,rcy),o.stroke();}' +
    'else if(arch===2){' +
    // 3. Photovoltaic Solar Panel Array Grid (Modern Green Offices)
    'let pW=Math.min(rRad*0.5,9*G);' +
    'o.fillStyle="#1e3a8a",o.fillRect(rcx-pW,rcy-pW*0.6,pW*2,pW*1.2);' +
    'o.strokeStyle="#94a3b8",o.lineWidth=Math.max(0.3*G,0.6*Q),o.strokeRect(rcx-pW,rcy-pW*0.6,pW*2,pW*1.2);' +
    'o.beginPath(),o.moveTo(rcx,rcy-pW*0.6),o.lineTo(rcx,rcy+pW*0.6),o.stroke();}' +
    'else if(arch===3&&rRad>18){' +
    // 4. Rooftop Terrace with Swimming Pool & Patio (Luxury Mansions)
    'let pW=Math.min(rRad*0.45,8*G);' +
    'o.fillStyle="#15803d",o.fillRect(rcx-pW-2,rcy-pW*0.5-2,pW*2+4,pW+4);' +
    'o.fillStyle="#06b6d4",o.fillRect(rcx-pW,rcy-pW*0.5,pW*2,pW);' +
    'o.strokeStyle="#cffafe",o.lineWidth=Math.max(0.4*G,0.7*Q),o.strokeRect(rcx-pW,rcy-pW*0.5,pW*2,pW);}' +
    'else{' +
    // 5. Corrugated Industrial Sheet Roof with Blue Weatherproof Tarp (Chawls / High-Density)
    'let sW=rRad*0.6;' +
    'o.fillStyle="#475569",o.fillRect(rcx-sW,rcy-sW*0.7,sW*2,sW*1.4);' +
    'o.fillStyle="#0284c7",o.fillRect(rcx-sW*0.3,rcy-sW*0.4,sW*0.8,sW*0.7);}}'
  ],
  // ===== 8. Automatically mark all Mumbai flyovers as elevated bridges =====
  [
    'flyovers marked as bridges',
    'Pe=Nt(),Fe=$t(se),Ge=r[A];u[A]={id:A,cls:L,bridge:(ve&1)!==0,tunnel:(ve&2)!==0,oneway:(ve&4)!==0,lanes:Ye,width:ke,layer:Pe,pts:Fe,...Ge?{name:Ge}:{}}',
    'Pe=Nt(),Fe=$t(se),Ge=r[A];let isFl=!!(Ge&&/flyover|overbridge|bridge|sealink|sea link/i.test(Ge));u[A]={id:A,cls:L,bridge:(ve&1)!==0||isFl,tunnel:(ve&2)!==0,oneway:(ve&4)!==0,lanes:Ye,width:ke,layer:isFl?Math.max(1,Pe):Pe,pts:Fe,...Ge?{name:Ge}:{}}'
  ],

  // ===== 9. Gate for architectural roofs lowered to normal gameplay view (q.r*E > 10) =====
  [
    'architectural roof zoom gate',
    'E*G>=tn.fine&&q.r*E>46',
    'q.r*E>10'
  ],
  // ===== 10. High Speed Vehicle Handling (Easy turning for Player Only!) =====
  [
    'high speed vehicle handling',
    'te=K.steer*(1-M*0.18)/(1+Math.pow(Math.abs(k)/300,1.7)*1.05);',
    'te=t.player?K.steer*(1-M*0.12)/(1+Math.pow(Math.abs(k)/580,1.25)*0.38):K.steer*(1-M*0.18)/(1+Math.pow(Math.abs(k)/300,1.7)*1.05);'
  ],

  // ===== 11. Top Speed Boosted for Play  // ===== 11. Vehicle Speed (Reduced by another 20% across the board!) =====
  [
    'top speed of all vehicles boosted',
    'k=ze(k,-170,K.top*(1-M*0.45)*(t.nosOn?1.22:1));',
    'k=ze(k,-140,(t.player?K.top*0.92:K.top*0.80)*(1-M*0.45)*(t.nosOn?1.15:1));'
  ],

  // ===== 12. Acceleration (Smooth, controllable 20% reduced acceleration) =====
  [
    'acceleration of all vehicles boosted',
    'let Je=fe*K.power*(1-M*0.4)/K.mass*(k<0?1.6:1);',
    'let Je=fe*(t.player?K.power*0.88:K.power*0.80)*(1-M*0.4)/K.mass*(k<0?1.5:1);'
  ],
  // ===== 13. Speed Blur with Blurry Streaking Red Tail Lights =====
  [
    'speed blur blurry tail lights',
    'f.fill()}if(!t.dead&&v.tank)f.save(),f.rotate(Yn(t.h,t.tur??t.h)),f.fillStyle="#3f4739"',
    'f.fill()};let curSpd=Math.hypot(t.vx,t.vy);' +
    'if(curSpd>140&&!t.dead){' +
    'let sLen=Math.min(48,(curSpd-120)*0.18),sAl=Math.min(0.85,(curSpd-120)/240);' +
    'for(let sgn of[-1,1]){let lx=-v.l/2,ly=sgn*v.w*0.36/2;' +
    'let gr=f.createLinearGradient(lx,ly,lx-sLen,ly);' +
    'gr.addColorStop(0,`rgba(255,40,40,${sAl})`);' +
    'gr.addColorStop(0.4,`rgba(239,68,68,${sAl*0.5})`);' +
    'gr.addColorStop(1,"rgba(239,68,68,0)");' +
    'f.fillStyle=gr,f.fillRect(lx-sLen,ly-2,sLen,4);' +
    'f.fillStyle="#ff2222",f.fillRect(lx-1,ly-1.5,2,3);}}' +
    'if(!t.dead&&v.tank)f.save(),f.rotate(Yn(t.h,t.tur??t.h)),f.fillStyle="#3f4739"'
  ],
  // ===== 14. Train Locomotive & Metro Engine Custom Sprites (Image #1) =====
  [
    'train locomotive custom sprites',
    'let E=r==="mail"&&o===0,Q=o===0||o===n.length-1,V=(E?20:l.L)*G,_=l.W*G,H=_*0.42;if(e.save()',
    'let E=r==="mail"&&o===0,Q=o===0||o===n.length-1,V=(E?20:l.L)*G,_=l.W*G,H=_*0.42;' +
    'let hdTr=(o===0&&window.__hdGetCustomSprite)?window.__hdGetCustomSprite(r==="metro"?"metro-engine":"locomotive"):null;' +
    'if(hdTr){e.save(),e.translate(i.x,i.y),e.rotate(i.h),e.drawImage(hdTr,-V/2,-_/2,V,_),e.restore();continue;}' +
    'if(e.save()'
  ],

  // ===== 15. Realistic Architectural Roof Diversity (No Stamped Repetitive X's!) =====
  [
    'h6 architectural roof styling',
    'if(o.fillStyle=D,Pn(o,B.pts,Be,Qe))o.fill();if(E*G>=tn.detail)o.strokeStyle="rgba(0,0,0,0.28)",o.lineWidth=Math.max(0.08*G,0.7*Q),o.stroke()}',
    'if(o.fillStyle=D,Pn(o,B.pts,Be,Qe))o.fill();if(E*G>=tn.detail)o.strokeStyle="rgba(0,0,0,0.28)",o.lineWidth=Math.max(0.08*G,0.7*Q),o.stroke();' +
    'if(B.r*E>8){let cx=B.cx+Be,cy=B.cy+Qe,br=B.r*0.65,seed=Math.floor(O*1000)%16;' +
    // Perimeter parapet wall frame
    '' +
    'if(seed<8){' +
    // 50% of buildings: Clean architectural roof deck with offset elevator/stairway penthouse
    'let pw=br*0.35,ph=br*0.25,ox=(seed%3-1)*br*0.4,oy=(Math.floor(seed/3)-1)*br*0.4;' +
    'o.fillStyle="rgba(24,30,40,0.45)",o.fillRect(cx+ox,cy+oy,pw,ph);' +
    'o.strokeStyle="rgba(10,14,20,0.6)",o.lineWidth=Math.max(0.3*G,0.5*Q),o.strokeRect(cx+ox,cy+oy,pw,ph);}' +
    'else if(seed===8||seed===9){' +
    // Standing seam metal roof (parallel fine architectural lines)
    'o.strokeStyle="rgba(20,26,35,0.35)",o.lineWidth=Math.max(0.3*G,0.5*Q);' +
    'for(let lx=-br+4;lx<br-2;lx+=6*G){o.beginPath(),o.moveTo(cx+lx,cy-br+2),o.lineTo(cx+lx,cy+br-2),o.stroke();}}' +
    'else if(seed===10||seed===11){' +
    // Dark navy photovoltaic solar array grid
    'let pw=Math.min(br*0.7,8*G);' +
    'o.fillStyle="#1e3a8a",o.fillRect(cx-pw,cy-pw*0.5,pw*2,pw);' +
    'o.strokeStyle="#94a3b8",o.lineWidth=Math.max(0.3*G,0.5*Q),o.strokeRect(cx-pw,cy-pw*0.5,pw*2,pw);' +
    'o.beginPath(),o.moveTo(cx,cy-pw*0.5),o.lineTo(cx,cy+pw*0.5),o.stroke();}' +
    'else if(seed===12){' +
    // Clean gabled terracotta roof with single horizontal ridge beam
    'o.fillStyle="#991b1b",o.beginPath(),o.moveTo(cx-br,cy-br),o.lineTo(cx+br,cy-br),o.lineTo(cx,cy),o.closePath(),o.fill();' +
    'o.fillStyle="#78350f",o.beginPath(),o.moveTo(cx-br,cy+br),o.lineTo(cx+br,cy+br),o.lineTo(cx,cy),o.closePath(),o.fill();' +
    'o.strokeStyle="#451a03",o.lineWidth=Math.max(0.5*G,Q),o.beginPath(),o.moveTo(cx-br,cy),o.lineTo(cx+br,cy),o.stroke();}' +
    'else if(seed===13){' +
    // Clean gabled terracotta roof with single vertical ridge beam
    'o.fillStyle="#b45309",o.beginPath(),o.moveTo(cx-br,cy-br),o.lineTo(cx-br,cy+br),o.lineTo(cx,cy),o.closePath(),o.fill();' +
    'o.fillStyle="#78350f",o.beginPath(),o.moveTo(cx+br,cy-br),o.lineTo(cx+br,cy+br),o.lineTo(cx,cy),o.closePath(),o.fill();' +
    'o.strokeStyle="#451a03",o.lineWidth=Math.max(0.5*G,Q),o.beginPath(),o.moveTo(cx,cy-br),o.lineTo(cx,cy+br),o.stroke();}' +
    'else if(seed===14){' +
    // Rare iconic geometric glass skylight (commercial)
    'let sw=Math.min(br*0.45,7*G);' +
    'o.fillStyle="#38bdf8",o.fillRect(cx-sw,cy-sw*0.5,sw*2,sw);' +
    'o.strokeStyle="rgba(255,255,255,0.7)",o.lineWidth=Math.max(0.4*G,Q),o.strokeRect(cx-sw,cy-sw*0.5,sw*2,sw);}' +
    'else{' +
    // Luxury rooftop pool & lawn
    'let pw=Math.min(br*0.5,6*G);' +
    'o.fillStyle="#15803d",o.fillRect(cx-pw-1,cy-pw*0.5-1,pw*2+2,pw+2);' +
    'o.fillStyle="#06b6d4",o.fillRect(cx-pw,cy-pw*0.5,pw*2,pw);}}' +
    '}'
  ],
  // ===== 17. Vertical Propeller Rotation (Nose Vertical Plane Sweep) =====
  [
    'propeller vertical rotation',
    'function _v(e,n,u,r,l,o){e.save(),e.translate(n,u),e.fillStyle=o?"rgba(200,214,230,0.16)":"rgba(240,248,255,0.22)",e.beginPath(),e.arc(0,0,r,0,Math.PI*2),e.fill(),e.strokeStyle=o?"rgba(210,224,240,0.4)":"rgba(250,254,255,0.5)",e.lineWidth=Math.max(0.18*G,0.5);for(let i=0;i<2;i++){let E=l+i*(Math.PI/2);e.beginPath(),e.moveTo(Math.cos(E)*r,Math.sin(E)*r),e.lineTo(-Math.cos(E)*r,-Math.sin(E)*r),e.stroke()}e.fillStyle=o?"#8d959e":"#4a525a",e.beginPath(),e.arc(0,0,r*0.16,0,Math.PI*2),e.fill(),e.restore()}',
    'function _v(e,n,u,r,l,o){e.save(),e.translate(n,u);' +
    // Upright vertical spinning blur ellipse across the nose
    'e.fillStyle=o?"rgba(200,214,230,0.28)":"rgba(240,248,255,0.35)",e.beginPath(),e.ellipse(0,0,1.4*G,r,0,0,Math.PI*2),e.fill();' +
    // Vertical spinning propeller blades
    'let by=r*Math.cos(l*12);e.strokeStyle=o?"#ffffff":"#f8fafc",e.lineWidth=Math.max(0.6*G,1.2);' +
    'e.beginPath(),e.moveTo(0,-by),e.lineTo(0,by),e.stroke();' +
    // High-visibility yellow safety tips on blade tips
    'e.fillStyle="#facc15",e.fillRect(-1.5,-Math.abs(by)-1,3,3),e.fillRect(-1.5,Math.abs(by)-2,3,3);' +
    // Center nose spinner cone
    'e.fillStyle="#1e293b",e.beginPath(),e.arc(0,0,r*0.22,0,Math.PI*2),e.fill(),e.restore();}'
  ],

  // ===== 18. Flying Aircraft Stays Locked in Frame (No offset drift at high altitude) =====
  [
    'flying aircraft locked in frame',
    'f.rotate(t.h),$>0){f.translate(-$*0.35,-$*0.25);let g=1+$*0.007;if(f.scale(g,g),t.pitch)f.rotate(t.pitch)}',
    'f.rotate(t.h),$>0){let g=ze(1+$*0.002,1,1.38);if(f.scale(g,g),t.pitch)f.rotate(t.pitch)}'
  ],
  // ===== 19. School Bus & Coach Width Reduction (Sleek, Never Too Broad!) =====
  [
    'school bus sleek width',
    '{name:"School Bus",l:96,w:28,',
    '{name:"School Bus",l:96,w:22,'
  ],
  [
    'coach bus sleek width',
    '{name:"Coach",l:100,w:28,',
    '{name:"Coach",l:100,w:23,'
  ],
  // ===== 20. Flo Mattress Truck Direct Product Delivery (Zero Person Pickup!) =====
  [
    'flo mattress direct delivery',
    'function e9(t){let v=a5(),z=s.player,$=s.fare;if($){if(!v){hi("Fare walked — you left the vehicle.");return}if(v!==$.kind){hi("Fare walked — wrong vehicle.");return}if(s.stars>=3){hi("Fare bailed out — too much heat.");return}if($.t+=t,p5($),Math.hypot($.dx-z.x,$.dy-z.y)<T(26))b5();return}if(!v){if(s.fareOffer)At();return}let N=s.fareOffer;',
    'function e9(t){let v=a5(),z=s.player,$=s.fare;if($){if(!v){hi("Fare walked — you left the vehicle.");return}if(v!==$.kind){hi("Fare walked — wrong vehicle.");return}if(s.stars>=3){hi("Fare bailed out — too much heat.");return}if($.t+=t,p5($),Math.hypot($.dx-z.x,$.dy-z.y)<T(26))b5();return}if(!v){if(s.fareOffer)At();return}' +
    // Direct Flo product delivery to customer (NO passenger pickup!):
    'if(v==="flo"){if(s.fareOffer)At();let N=W5(z.x,z.y);let J=Math.hypot(N.x-z.x,N.y-z.y);let K=Math.round(J/T(100)*60+160);let g=Math.round(J/75);' +
    's.fare={stage:"ride",kind:"flo",px:z.x,py:z.y,dx:N.x,dy:N.y,dest:N.name,base:K,par:g,t:0,waitT:0,dist0:J,paid:0,ped:null};s.fareOffer=null;' +
    'le("FLO DELIVERY: Deliver mattress order to "+N.name+"! ₹"+K+" payout.");return;}' +
    'let N=s.fareOffer;'
  ],


  // ===== 22. Assassination Contract Convoy Spawner API =====
  [
    'assassination start hit spawner',
    'let S9=window;return S9.__helmsdeep={',
    'let S9=window;window.__hdStartHit=function(id){' +
    'const C={' +
    // 4 MUMBAI UNDERWORLD GANG LEADERS:
    'dawood:{n:"DAWOOD IBRAHIM (D-COMPANY)",x:-44500,y:104000,h:-0.8,bounty:150000,cars:[{t:60,esc:1},{t:61,esc:1},{t:84,vip:1,n:"DAWOOD IBRAHIM",b:150000},{t:61,esc:1},{t:60,esc:1},{t:41,esc:1}]},' +
    'manya:{n:"MANYA SURVE (DADAR OUTLAWS)",x:-33000,y:45000,h:0.5,bounty:85000,cars:[{t:60,esc:1},{t:87,vip:1,n:"MANYA SURVE",b:85000},{t:60,esc:1},{t:29,esc:1}]},' +
    'maya:{n:"MAYA DOLAS (LOKHANDWALA)",x:-37171,y:-29573,h:1.1,bounty:90000,cars:[{t:86,esc:1},{t:65,vip:1,n:"MAYA DOLAS",b:90000},{t:85,esc:1},{t:64,esc:1}]},' +
    'gawli:{n:"ARUN GAWLI (DAGDI CHAWL)",x:-44000,y:76000,h:-0.3,bounty:95000,cars:[{t:16,esc:1},{t:89,vip:1,n:"ARUN GAWLI",b:95000},{t:16,esc:1},{t:62,esc:1},{t:63,esc:1}]},' +
    // POLITICIANS (EASY TO HARD):
    'corporator:{n:"WARD CORPORATOR",x:-33000,y:45000,h:0.4,bounty:40000,cars:[{t:81,esc:1},{t:82,vip:1,n:"WARD CORPORATOR",b:40000}]},' +
    'mla:{n:"OPPOSITION MLA",x:-21741,y:8872,h:1.2,bounty:65000,cars:[{t:77,esc:1},{t:16,esc:1},{t:89,vip:1,n:"OPPOSITION MLA",b:65000},{t:30,esc:1}]},' +
    'minister:{n:"HOME MINISTER",x:-48000,y:106000,h:0.2,bounty:100000,cars:[{t:78,esc:1},{t:45,esc:1},{t:89,vip:1,n:"HOME MINISTER",b:100000},{t:76,esc:1},{t:30,esc:1},{t:78,esc:1}]},' +
    // CELEBRITIES:
    'srk:{n:"SHAH RUKH KHAN",x:-55790,y:23185,h:0.8,bounty:75000,cars:[{t:16,esc:1},{t:84,vip:1,n:"SHAH RUKH KHAN",b:75000},{t:16,esc:1},{t:16,esc:1}]},' +
    'salman:{n:"SALMAN KHAN",x:-53466,y:19030,h:-0.4,bounty:80000,cars:[{t:60,esc:1},{t:87,vip:1,n:"SALMAN KHAN",b:80000},{t:60,esc:1},{t:61,esc:1}]},' +
    'amitabh:{n:"AMITABH BACHCHAN",x:-51600,y:-14800,h:-1.2,bounty:70000,cars:[{t:30,esc:1},{t:84,vip:1,n:"AMITABH BACHCHAN",b:70000},{t:30,esc:1},{t:16,esc:1}]},' +
    // MEGA BILLIONAIRE: MUKESH AMBANI (11-CAR ROLLING FORTRESS!)
    'ambani:{n:"MUKESH AMBANI",x:-64800,y:86000,h:1.5,bounty:250000,cars:[' +
    '{t:77,esc:1},{t:30,esc:1},{t:16,esc:1},{t:88,esc:1},' +
    '{t:89,vip:1,n:"MUKESH AMBANI",b:250000},' +
    '{t:89,esc:1},{t:16,esc:1},{t:43,esc:1},{t:88,esc:1},{t:30,esc:1},{t:78,esc:1}]}};' +
    'const c=C[id]||C.srk;' +
    'for(let i=s.cars.length-1;i>=0;i--){if(s.cars[i].hdHitTarget)s.cars.splice(i,1)}' +
    'let cos=Math.cos(c.h),sin=Math.sin(c.h);' +
    'let carList=c.cars||[{t:16,esc:1},{t:84,vip:1,n:c.n,b:c.bounty},{t:16,esc:1}];' +
    'carList.forEach((ci,idx)=>{let off=(carList.length-1-idx)*38-carList.length*19;' +
    's.cars.push({x:c.x+cos*off,y:c.y+sin*off,h:c.h,vx:cos*88,vy:sin*88,w:0,steer:0,type:ci.t,pal:0,seed:0.1*idx,hp:ci.vip?2200:1500,player:!1,ai:"traffic",speed:88,stuck:0,panic:0,shootCd:0,burn:0,dead:!1,wreckT:0,siren:ci.vip||ci.t===89||ci.t===30||ci.t===77||ci.t===78?1:0,rider:null,hdEscort:ci.esc?1:0,hdVip:ci.vip?1:0,hdTargetName:ci.n||"",hdBounty:ci.b||0,hdHitTarget:1});});' +
    's.waypoint={x:c.x,y:c.y,name:"TARGET: "+c.n};' +
    'le("ASSASSINATION CONTRACT: Eliminate "+c.n+" convoy! Bounty: ₹"+c.bounty.toLocaleString("en-IN"));};' +
    'return S9.__helmsdeep={'
  ],
  // ===== 23. Sniper Telescopic Crosshair Reticle & Aiming Line =====
  [
    'sniper telescopic crosshair reticle',
    'else if(k.onFoot&&Q.current==="play")if(s.ride>=0)f.fillStyle="rgba(255,235,170,0.95)"',
    'else if(k.onFoot&&Q.current==="play"){' +
    'if(k.weapon==="sniper"){' +
    'let aimD=Math.hypot(k.aimX,k.aimY)||1,nx=k.aimX/aimD,ny=k.aimY/aimD;' +
    'let tx=k.x+nx*340,ty=k.y+ny*340;' +
    'f.strokeStyle="rgba(239,68,68,0.5)",f.lineWidth=1.2,f.beginPath(),f.moveTo(k.x,k.y),f.lineTo(tx,ty),f.stroke();' +
    'f.strokeStyle="#ef4444",f.lineWidth=2,f.beginPath(),f.arc(tx,ty,24,0,Math.PI*2),f.stroke();' +
    'f.strokeStyle="rgba(239,68,68,0.7)",f.lineWidth=1,f.beginPath(),f.arc(tx,ty,10,0,Math.PI*2),f.stroke();' +
    'f.beginPath(),f.moveTo(tx-30,ty),f.lineTo(tx-10,ty),f.moveTo(tx+10,ty),f.lineTo(tx+30,ty);' +
    'f.moveTo(tx,ty-30),f.lineTo(tx,ty-10),f.moveTo(tx,ty+10),f.lineTo(tx,ty+30),f.stroke();' +
    'f.fillStyle="#ff2222",f.beginPath(),f.arc(tx,ty,2.5,0,Math.PI*2),f.fill();}' +
    '}else if(k.onFoot&&Q.current==="play")if(s.ride>=0)f.fillStyle="rgba(255,235,170,0.96)"'
  ],
  // ===== 24. Elevated Metro Station Vaulted Barrel Canopy (// ===== 24. Elevated Metro Station Vaulted Barrel Canopy (Aligned to Track Heading! Sleek 28Gx10G!) =====
  [
    'elevated metro station canopy',
    'function Y6(e,n,u,r,l,o,i){if(!y(n)||!y(u))return;let E=(l?14:32)*G,Q=(l?14:10)*G;',
    'function Y6(e,n,u,r,l,o,i){if(!y(n)||!y(u))return;' +
    'if(l){' +
    // Compute track heading angle dynamically so station canopy aligns perfectly with the tracks!
    'let trkAng=0;' +
    'if(D&&D.rail){for(let rl of D.rail){if(!rl.pts||rl.pts.length<4)continue;' +
    'for(let pi=0;pi<rl.pts.length-3;pi+=2){' +
    'let mx=(rl.pts[pi]+rl.pts[pi+2])/2,my=(rl.pts[pi+1]+rl.pts[pi+3])/2;' +
    'if(Math.hypot(mx-n,my-u)<T(50)){trkAng=Math.atan2(rl.pts[pi+3]-rl.pts[pi+1],rl.pts[pi+2]-rl.pts[pi]);break;}}' +
    'if(trkAng!==0)break;}}' +
    // Sleek, compact proportions: length 28G, width 10G (tightly hugging the twin tracks!)
    'let sL=28*G,sW=10*G;e.save(),e.translate(n,u),e.rotate(trkAng);' +
    // 3D viaduct drop shadow
    'e.fillStyle="rgba(0,0,0,0.52)",e.fillRect(-sL/2+3*G,-sW/2+5*G,sL,sW);' +
    // Viaduct support beam
    'e.fillStyle="#334155",e.fillRect(-sL/2,-sW/2,sL,sW);' +
    // Trackside platform edge lights
    'e.fillStyle="#fde047",e.fillRect(-sL/2+1,-sW/2+0.8,sL-2,0.9),e.fillRect(-sL/2+1,sW/2-1.7,sL-2,0.9);' +
    // BLUE METALLIC VAULTED ROOF CANOPY (Exact Reference Image #2)
    'let gr=e.createLinearGradient(0,-sW/2,0,sW/2);gr.addColorStop(0,"#0284c7"),gr.addColorStop(0.5,"#38bdf8"),gr.addColorStop(1,"#0369a1");' +
    'e.fillStyle=gr,e.beginPath(),e.roundRect(-sL/2-1*G,-sW/2-1*G,sL+2*G,sW+2*G,3*G),e.fill();' +
    'e.strokeStyle="#0f172a",e.lineWidth=Math.max(0.4*G,Q),e.stroke();' +
    // Transverse arched curved roof ribs
    'e.strokeStyle="rgba(255,255,255,0.45)",e.lineWidth=Math.max(0.3*G,0.6*o);' +
    'for(let rx=-sL/2+3*G;rx<sL/2;rx+=5*G){e.beginPath(),e.moveTo(rx,-sW/2-1*G),e.lineTo(rx,sW/2+1*G),e.stroke();}' +
    // Central translucent cyan glass skylight (Exact Reference Image #2)
    'let skyL=sL*0.56,skyW=sW*0.42;e.fillStyle="#e0f2fe",e.beginPath(),e.roundRect(-skyL/2,-skyW/2,skyL,skyW,1.5*G),e.fill();' +
    'e.strokeStyle="rgba(255,255,255,0.9)",e.lineWidth=Math.max(0.35*G,0.6*o),e.stroke();' +
    // Station Name Badge (Aligned cleanly outside the canopy)
    'if(i>=tn.stationLabels*0.5&&r){' +
    'let txt=r.replace(/metro/i,"").trim()+" METRO";e.font=`bold ${Math.max(7.5*o,6*G)}px system-ui`;' +
    'let tw=e.measureText(txt).width;' +
    'e.fillStyle="rgba(10,15,26,0.92)",e.fillRect(-tw/2-3,sW/2+2*G,tw+6,12);' +
    'e.strokeStyle="#38bdf8",e.lineWidth=0.7,e.strokeRect(-tw/2-3,sW/2+2*G,tw+6,12);' +
    'e.fillStyle="#f8fafc",e.textAlign="center",e.textBaseline="middle",e.fillText(txt,0,sW/2+2.5*G+6);}' +
    'e.restore();return;}' +
    'let E=(l?14:32)*G,Q=(l?14:10)*G;'
  ],
  // ===== 25. Elevated Metro Station Blue Canopy in T6 (Saki Naka Image #2) =====
  [
    'metro station blue canopy in t6',
    'if(q.kind==="transport"||!!(q.name&&/metro|monorail|skywalk|flyover/i.test(q.name))||y(q.r)&&q.r>18*G&&cu(e,q.cx,q.cy)){let Ge=14*G,_e=Ge*0.28,Xe=Ge*0.42;if(o.fillStyle="rgba(0,0,0,0.28)",Pn(o,q.pts,_e*0.15,Xe*0.15))o.fill();if(o.fillStyle=n.night?"#3a3f46":"#5a6168",Pn(o,q.pts,_e,Xe))o.fill();o.strokeStyle="rgba(20,22,26,0.55)",o.lineWidth=Math.max(0.2*G,Q),o.stroke();continue}',
    'if(q.kind==="transport"||!!(q.name&&/metro|monorail|station|saki/i.test(q.name))||y(q.r)&&q.r>18*G&&cu(e,q.cx,q.cy)){let Ge=16*G,_e=Ge*0.28,Xe=Ge*0.42;' +
    'if(o.fillStyle="rgba(0,0,0,0.5)",Pn(o,q.pts,_e*0.6,Xe*0.6))o.fill();' +
    'if(o.fillStyle="#334155",Pn(o,q.pts,_e*0.85,Xe*0.85))o.fill();' +
    // BLUE METALLIC VAULTED CANOPY (Reference Image #2)
    'if(o.fillStyle="#0284c7",Pn(o,q.pts,_e,Xe))o.fill();' +
    // Central translucent cyan glass skylight (Reference Image #2)
    'if(o.fillStyle="#38bdf8",Pn(o,q.pts,_e+1.8*G,Xe+2.6*G))o.fill();' +
    'o.strokeStyle="rgba(255,255,255,0.75)",o.lineWidth=Math.max(0.4*G,Q),o.stroke();' +
    'let stN=(q.name||"METRO").toUpperCase();' +
    'o.font=`bold ${Math.max(10*Q,9*G)}px system-ui`,o.fillStyle="#f8fafc",o.textAlign="center",o.textBaseline="middle",o.fillText(stN,q.cx+_e,q.cy+Xe);' +
    'continue}'
  ],

  // ===== 26. Bazooka One-Hit Kill for VIP Assassination Targets =====
  [
    'bazooka vip lethal explosion',
    'J.hp-=420*(1-Z/$);let K=260*(1-Z/$),g=Math.hypot(J.x-t,J.y-v)||1;',
    'let dmgMult=J.hdVip?3400:1400;J.hp-=dmgMult*(1-Z/$);if(J.hdVip&&Z<60)J.hp=0;if(J.hp<=0&&!J.dead)J.dead=!0;let K=260*(1-Z/$),g=Math.hypot(J.x-t,J.y-v)||1;'
  ],

  // ===== 27. Docked Target HUD Capsule (Zero Overlap with Health Card!) =====
  [
    'docked target hud capsule',
    'f.fillRect(14,182,230,24),f.fillStyle="#b99cff",f.font="bold 10px system-ui",f.fillText("PIN",24,194),f.fillStyle="#e8e4da",f.font="10px system-ui",f.fillText(`${C.name} — ${R.toFixed(1)} km`,48,194)',
    '(()=>{let capY=v-54;f.fillStyle="rgba(11,16,27,0.92)",f.fillRect(16,capY,320,28),f.strokeStyle="#a855f7",f.lineWidth=1.5,f.strokeRect(16,capY,320,28),' +
    'f.font="bold 11px system-ui",f.fillStyle="#fde047",f.textAlign="left",f.fillText("🎯 TARGET: "+C.name,26,capY+18),' +
    'f.font="bold 11px system-ui",f.fillStyle="#ffffff",f.textAlign="right",f.fillText(R.toFixed(1)+" km",324,capY+18),f.textAlign="left"})()'
  ],
];

const check = process.argv.includes('--check');
let src = readFileSync(FILE, 'utf8');
let applied = 0;
let already = 0;

for (const [what, find, replace] of EDITS) {
  const hits = src.split(find).length - 1;
  if (hits === 0) {
    if (src.includes(replace)) {
      already++;
      console.log(`  = ${what} (already patched)`);
      continue;
    }
    console.error(`FAIL ${what}: target string not found and replacement absent`);
    process.exit(1);
  }
  if (hits > 1) {
    console.error(`FAIL ${what}: target string appears ${hits} times, expected 1`);
    process.exit(1);
  }
  src = src.replace(find, replace);
  applied++;
  console.log(`  + ${what}`);
}

if (check) {
  console.log(applied ? `${applied} edit(s) NOT applied` : 'bundle is patched');
  process.exit(applied ? 1 : 0);
}
if (applied) writeFileSync(FILE, src);
console.log(`${applied} applied, ${already} already in place`);
