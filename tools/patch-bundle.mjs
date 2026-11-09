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
    'I(V*0.25,6.4*G,96*G,0.3,n.night?"rgba(96,136,178,0.1)":"rgba(255,255,255,0.08)",Math.max(1.4*G,Y*1.2)),' +
    'I(0,4.2*G,54*G,0.55,n.night?"rgba(150,186,226,0.11)":"rgba(240,250,255,0.13)",Math.max(0.9*G,Y)),' +
    'I(V*0.5,2.6*G,31*G,-0.8,n.night?"rgba(120,156,200,0.07)":"rgba(214,236,250,0.09)",Math.max(0.6*G,Y*0.7))'
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
    'var Yi=[0,0,0,1,1,2,3,5,6,7,7,8,8,8,9,40,41,42,56,57,12,12,12,12,12,12,12,12,12,12,12,54,54,54,14,'
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

  // Impacts only fired `En.thud`, a 120 Hz blip, and only above 130 closing
  // speed, so metal on metal was effectively silent. `crunch` is a new one-shot:
  // a swept bandpass noise burst (sheet metal) over a short square thump.
  [
    'crunch sfx',
    'let En={shot:()=>{if(!L||B.current||L.state!=="running")return;',
    'let En={crunch:(hdV)=>{if(!L||B.current||L.state!=="running")return;try{' +
    'let hdT=L.currentTime,hdG=ze(typeof hdV==="number"?hdV:0.5,0.08,1),' +
    // sheet-metal partials: inharmonic ratios, long-ish ring, that is what makes
    // it read as metal rather than as a thump
    'hdP=[1,1.58,2.13,2.79,3.46,4.37],hdB=180+hdG*120;' +
    'for(let hdI=0;hdI<hdP.length;hdI++){' +
    'let hdO=L.createOscillator(),hdGn=L.createGain();' +
    'hdO.type=hdI<2?"triangle":"square",' +
    'hdO.frequency.setValueAtTime(hdB*hdP[hdI]*(0.98+Math.random()*0.05),hdT),' +
    'hdO.frequency.exponentialRampToValueAtTime(hdB*hdP[hdI]*0.82,hdT+0.5);' +
    'let hdA=hdG*0.17/(1+hdI*0.55);' +
    'hdGn.gain.setValueAtTime(0,hdT),hdGn.gain.linearRampToValueAtTime(hdA,hdT+0.004),' +
    'hdGn.gain.exponentialRampToValueAtTime(0.0008,hdT+0.3+0.45/(1+hdI*0.5)),' +
    'hdO.connect(hdGn),hdGn.connect(ve),hdO.start(hdT),hdO.stop(hdT+0.95)}' +
    // short bright transient: the dent, before the ring
    'let hdN=Math.floor(L.sampleRate*0.09),hdBuf=L.createBuffer(1,hdN,L.sampleRate),' +
    'hdCh=hdBuf.getChannelData(0);' +
    'for(let hdI=0;hdI<hdN;hdI++)hdCh[hdI]=(Math.random()*2-1)*Math.pow(1-hdI/hdN,3.1);' +
    'let hdSrc=L.createBufferSource();hdSrc.buffer=hdBuf;' +
    'let hdBp=L.createBiquadFilter();hdBp.type="bandpass",hdBp.Q.value=1.4,' +
    'hdBp.frequency.setValueAtTime(3400,hdT),' +
    'hdBp.frequency.exponentialRampToValueAtTime(1100,hdT+0.09);' +
    'let hdNg=L.createGain();hdNg.gain.setValueAtTime(hdG*0.5,hdT),' +
    'hdNg.gain.exponentialRampToValueAtTime(0.001,hdT+0.1),' +
    'hdSrc.connect(hdBp),hdBp.connect(hdNg),hdNg.connect(ve),hdSrc.start(hdT);' +
    // body of the car taking the hit
    'let hdOsc=L.createOscillator(),hdOg=L.createGain();hdOsc.type="square",' +
    'hdOsc.frequency.setValueAtTime(104,hdT),' +
    'hdOsc.frequency.exponentialRampToValueAtTime(44,hdT+0.12),' +
    'hdOg.gain.setValueAtTime(hdG*0.42,hdT),' +
    'hdOg.gain.exponentialRampToValueAtTime(0.001,hdT+0.16),' +
    'hdOsc.connect(hdOg),hdOg.connect(ve),hdOsc.start(hdT),hdOsc.stop(hdT+0.18)}catch{}},' +
    'shot:()=>{if(!L||B.current||L.state!=="running")return;'
  ],
  // Contact is resolved every frame, so each sound is rate limited off the game
  // clock: scrapes at ~3/s, hits at ~2/s. Without this a single shunt fires the
  // crunch four or five times and sounds like a machine gun.
  [
    'scrape on light contact',
    'if(te>40){if(N)z.vx-=ee*te*0.5,z.vy-=M*te*0.5;if(K)Z.vx+=ee*te*0.5,Z.vy+=M*te*0.5}',
    'if(te>40){if(N)z.vx-=ee*te*0.5,z.vy-=M*te*0.5;if(K)Z.vx+=ee*te*0.5,Z.vy+=M*te*0.5;' +
    'if((z.player||Z.player)&&te<=130&&s.t-(s.hdScr??-9)>0.35)s.hdScr=s.t,En.crunch(0.1+te/420)}'
  ],
  [
    'crunch on car impact',
    'En.thud(te/600),te>330)',
    'En.thud(Math.min(0.7,te/420)),s.t-(s.hdHit??-9)>0.45&&(s.hdHit=s.t,' +
    'En.crunch(Math.min(1,0.3+te/380))),te>330)'
  ],
  [
    'crunch on wall impact',
    'iu(t.x,t.y,Math.min(10,Ee*0.04)),En.thud(Ee/500)',
    'iu(t.x,t.y,Math.min(10,Ee*0.04)),En.thud(Math.min(0.7,Ee/380)),' +
    's.t-(s.hdHit??-9)>0.45&&(s.hdHit=s.t,En.crunch(Math.min(1,0.3+Ee/420)))'
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

  // ===== collisions: real impulse instead of a velocity mush ===============
  // Cars used to swap 55/45 of each other's velocity regardless of mass, so a
  // truck bounced off a hatchback. This is a proper normal impulse with
  // restitution plus a tangential kick that spins the lighter car.
  [
    'collision impulse',
    'if(!N&&!K){let{vx:Ve,vy:kn}=z;z.vx=Ve*0.55+Z.vx*0.45,z.vy=kn*0.55+Z.vy*0.45,' +
    'Z.vx=Z.vx*0.55+Ve*0.45,Z.vy=Z.vy*0.55+kn*0.45}',
    'if(!N&&!K){let hdN=(z.vx-Z.vx)*ee+(z.vy-Z.vy)*M;if(hdN>0){' +
    'let hdJ=1.34*hdN/(1/Je+1/Ke);' +
    'z.vx-=hdJ/Je*ee,z.vy-=hdJ/Je*M,Z.vx+=hdJ/Ke*ee,Z.vy+=hdJ/Ke*M;' +
    'let hdT=(z.vx-Z.vx)*-M+(z.vy-Z.vy)*ee;' +
    'z.vx+=hdT*0.12*M,z.vy-=hdT*0.12*ee,Z.vx-=hdT*0.12*M,Z.vy+=hdT*0.12*ee,' +
    'z.w=(z.w??0)-hdT*0.0016*(Ke/(Je+Ke)),Z.w=(Z.w??0)+hdT*0.0016*(Je/(Je+Ke))}}'
  ],
  [
    'collision damage',
    'if(te>200){let Le=(te-180)*0.028;',
    'if(te>130){let Le=(te-110)*0.05;'
  ],
  [
    'wall impact damage',
    'if(t.x=Ze.x,t.y=Ze.y,Ee>220){let $n=(Ee-190)*0.028;',
    'if(t.x=Ze.x,t.y=Ze.y,Ee>150){let $n=(Ee-130)*0.05;'
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
    'small blast flash and ignition',
    's.parts.push({x:t,y:v,vx:0,vy:0,life:0.35,max:0.35,r:34,col:"#ffe9b0",glow:!0}),' +
    's.decals.push({x:t,y:v,a:0.55,r:40+Math.random()*20,kind:"scorch"});' +
    'for(let $ of s.cars){if($.dead)continue;let N=Math.hypot($.x-t,$.y-v);' +
    'if(N<130){if($.hp-=90*(1-N/130),$.ai==="cop")Zn(1.2,!0)}}',
    's.parts.push({x:t,y:v,vx:0,vy:0,life:0.42,max:0.42,r:56,col:"#fff6d2",glow:!0}),' +
    's.parts.push({x:t,y:v,vx:0,vy:0,life:0.7,max:0.7,r:30,col:"#ff9326",glow:!0}),' +
    's.decals.push({x:t,y:v,a:0.6,r:46+Math.random()*22,kind:"scorch"});' +
    'for(let $ of s.cars){if($.dead)continue;let N=Math.hypot($.x-t,$.y-v);' +
    'if(N<150){$.hp-=120*(1-N/150);let hdK=170*(1-N/150),hdD=Math.hypot($.x-t,$.y-v)||1;' +
    '$.vx+=($.x-t)/hdD*hdK,$.vy+=($.y-v)/hdD*hdK;' +
    'if($.hp<85&&$.burn<=0)$.burn=0.45+Math.random()*0.5;' +
    'if($.ai==="cop")Zn(1.2,!0)}}'
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
    'big blast ignition',
    'J.hp-=420*(1-Z/$);let K=260*(1-Z/$),g=Math.hypot(J.x-t,J.y-v)||1;',
    'J.hp-=420*(1-Z/$);if(J.burn<=0)J.burn=0.35+Math.random()*0.5;' +
    'let K=340*(1-Z/$),g=Math.hypot(J.x-t,J.y-v)||1;'
  ],
  [
    'burn fuse',
    'if(z.hp<=0&&z.burn<=0){if(z.burn=2.4+Math.random()*1.1,z.player)le("ENGINE FIRE — BAIL OUT!")}',
    'if(z.hp<=0&&z.burn<=0){if(z.burn=1+Math.random()*0.7,z.player)le("ENGINE FIRE — BAIL OUT!")}'
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
    'if(En.thud(0.3),t.shed===J)le("Mattresses all over the road.");' +
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
    'hud scale',
    'f.fillStyle=fe,f.fillRect(0,0,t,v),f.textBaseline="middle",' +
    'f.fillStyle="rgba(10,12,14,0.62)",f.fillRect(14,14,190,64)',
    'f.fillStyle=fe,f.fillRect(0,0,t,v);' +
    'let hdU=Math.min(1,Math.max(0.58,t/1180));' +
    'if(hdU<1)f.setTransform(x*hdU,0,0,x*hdU,0,0),t/=hdU,v/=hdU;' +
    'f.textBaseline="middle",f.fillStyle="rgba(10,12,14,0.62)",f.fillRect(14,14,190,64)'
  ],

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

  // ===== supercars people have heard of ====================================
  ['porsche 911', '{name:"Comet GTR",', '{name:"Porsche 911 GT3",'],
  ['lamborghini huracan', '{name:"Vacca",', '{name:"Lamborghini Huracan",'],
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

  // ===== surf: the sea has to break on the shore, not stripe the bay =======
  // Every coastal landmass is stroked with two animated dashed lines whose
  // phase and width pulse, so the waterline froths and the open water keeps
  // only a faint swell.
  [
    'shore surf',
    'case"land":{if(!Pn(r,V.pts))break;if(r.fillStyle=l.land,r.fill("evenodd"),i)' +
    'r.strokeStyle=l.shore,r.lineWidth=Math.max(0.9*G,1.4*E),r.stroke();break}',
    'case"land":{if(!Pn(r,V.pts))break;if(r.fillStyle=l.land,r.fill("evenodd"),i){' +
    'r.strokeStyle=l.shore,r.lineWidth=Math.max(0.9*G,1.4*E),r.stroke();' +
    'let hdT=y(n.t)?n.t:0,hdPh=0.5+0.5*Math.sin(hdT*1.5+(V.pts[0]||0)*0.0006);' +
    'r.save(),r.lineCap="round",' +
    'r.strokeStyle=n.night?`rgba(196,220,240,${0.12+hdPh*0.22})`:`rgba(255,255,255,${0.2+hdPh*0.38})`,' +
    'r.lineWidth=Math.max(1.5*G,2.4*E),' +
    'r.setLineDash([(7+hdPh*9)*G,(9-hdPh*3)*G]),r.lineDashOffset=-hdT*24*G,r.stroke(),' +
    'r.strokeStyle=n.night?`rgba(150,186,226,${0.08+(1-hdPh)*0.14})`:`rgba(226,244,255,${0.12+(1-hdPh)*0.24})`,' +
    'r.lineWidth=Math.max(0.9*G,1.5*E),' +
    'r.setLineDash([4*G,(12+hdPh*6)*G]),r.lineDashOffset=hdT*16*G,r.stroke(),' +
    'r.setLineDash([]),r.restore()}break}'
  ],

  // ===== anything that drives into the sea goes under ======================
  // `nl(x,y)` is the game's own land test. A car off the edge loses drive,
  // throws spray for a second and a half, and then sinks — cop cars included.
  [
    'cars drown',
    'function $9(t){for(let z of s.cars){if(z.dead){z.wreckT+=t;continue}if(z.hp<=0',
    'function $9(t){for(let z of s.cars){if(z.dead){z.wreckT+=t;continue}' +
    'if(!nl(z.x,z.y)){z.hdW=(z.hdW??0)+t,z.speed=0,' +
    'z.vx*=Math.max(0,1-3*t),z.vy*=Math.max(0,1-3*t);' +
    'if(Math.random()<t*16)s.parts.push({x:z.x+(Math.random()-0.5)*18,' +
    'y:z.y+(Math.random()-0.5)*14,vx:(Math.random()-0.5)*40,vy:-25-Math.random()*35,' +
    'life:0.45+Math.random()*0.3,max:0.75,r:2+Math.random()*4,col:"#d8eef8",glow:!0});' +
    'if(z.hdW>1.6){z.dead=!0,z.wreckT=0,z.hp=0,En.thud(0.5);' +
    'if(z.player)s.player.carIdx=-1,s.player.onFoot=!0,to(18),le("Sank it. You swam out.");' +
    'else if(z.ai==="cop")le("Police cruiser in the drink.");continue}}else z.hdW=0;if(z.hp<=0'
  ],

  // ===== bazooka ===========================================================
  // The missile system already existed for the tank; this exposes it as a
  // carried weapon, on foot or at the wheel, with a brighter exhaust trail.
  [
    'bazooka in the weapon tables',
    'sr=["pistol","smg","shotgun","rifle","grenade","flamer"],' +
    'Uv={pistol:240,smg:600,shotgun:120,rifle:90,grenade:25,flamer:900}',
    'sr=["pistol","smg","shotgun","rifle","grenade","flamer","bazooka"],' +
    'Uv={pistol:240,smg:600,shotgun:120,rifle:90,grenade:25,flamer:900,bazooka:12}'
  ],
  [
    'bazooka stats',
    'flamer:{name:"FLAMER",cd:0.045,pellets:1,spread:0.22,speed:230,ttl:0.42,dmg:0,auto:!0,heat:0.6,kind:"stream"}}',
    'flamer:{name:"FLAMER",cd:0.045,pellets:1,spread:0.22,speed:230,ttl:0.42,dmg:0,auto:!0,heat:0.6,kind:"stream"},' +
    'bazooka:{name:"BAZOOKA",cd:1.15,pellets:1,spread:0.012,speed:600,ttl:2.2,dmg:0,auto:!1,heat:1.8,kind:"rocket"}}'
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
    'En.thud(0.35),En.crunch(0.3),k.vx*=0.92,k.vy*=0.92;' +
    'else if(hdV>40){let hdA=Math.atan2(k.vy,k.vx),' +
    'hdP=fu(N.x+Math.cos(hdA)*hdV*0.07,N.y+Math.sin(hdA)*hdV*0.07,6,N.x,N.y);' +
    'N.x=hdP.x,N.y=hdP.y,N.kind="flee",N.wpX=N.x+Math.cos(hdA)*200,N.wpY=N.y+Math.sin(hdA)*200,' +
    'N.hits=(N.hits??0)+1,En.thud(0.22),s.cam.shake=Math.max(s.cam.shake,4),' +
    'k.vx*=0.9,k.vy*=0.9,s.decals.push({x:N.x,y:N.y,a:0.3,r:4,kind:"blood"});' +
    'if(N.hits>=3)Qr(N,!1)}}'
  ],

  ['news crew threshold', 'if(z<=5)continue;', 'if(z<=1)continue;'],
  [
    'job payout wording',
    's.fare=null,le(v?`Dropped — ₹${t.base} fare + ₹${z} tip.`:`Dropped — ₹${t.base} fare. Too slow for the tip.`)',
    's.fare=null,le(t.kind==="flo"?(v?`Delivered — ₹${t.base} + ₹${z} on-time bonus.`:' +
    '`Delivered — ₹${t.base}. Too slow for the bonus.`):t.kind==="cop"?' +
    '(v?`Scene handled — ₹${t.base} + ₹${z} response bonus.`:`Scene handled — ₹${t.base}. Too slow for the bonus.`):' +
    '(v?`Dropped — ₹${t.base} fare + ₹${z} tip.`:`Dropped — ₹${t.base} fare. Too slow for the tip.`))'
  ]
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
