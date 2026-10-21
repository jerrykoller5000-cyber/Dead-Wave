// GP-177: phrase grammar is independent of an individual creature's throat.
// Four authored performances per state: the caller chooses without repetition.
const copy = value => Array.isArray(value) ? value.map(copy) : value && typeof value === 'object'
  ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, copy(item)])) : value;
const clamp = (value, lo, hi) => Math.max(lo, Math.min(hi, value));
const shapes = {
  drag: { pitchContour: [[0,.93],[.16,1.03],[.42,.91],[.74,.86],[1,.67]], gainContour: [[0,0],[.13,.78],[.31,1],[.62,.66],[.84,.38],[1,0]] },
  clenched: { pitchContour: [[0,.81],[.12,1.08],[.35,.94],[.51,1.02],[1,.69]], gainContour: [[0,0],[.06,1],[.28,.62],[.45,.88],[.76,.43],[1,0]] },
  bark: { pitchContour: [[0,.87],[.09,1.19],[.23,1.04],[.63,.78],[1,.6]], gainContour: [[0,0],[.035,1],[.2,.92],[.48,.62],[1,0]] },
  torn: { pitchContour: [[0,.91],[.1,1.16],[.35,.92],[.47,1.22],[.7,.98],[1,.62]], gainContour: [[0,0],[.05,1],[.31,.74],[.44,.95],[.65,.6],[.82,.72],[1,0]] },
  gasp: { pitchContour: [[0,.86],[.18,1.14],[.37,1],[1,.58]], gainContour: [[0,0],[.045,1],[.3,.69],[.53,.3],[1,0]] },
  drone: { pitchContour: [[0,.98],[.2,1.01],[.57,.99],[.82,1.015],[1,.975]], gainContour: [[0,0],[.16,.72],[.39,.93],[.72,1],[.92,.6],[1,0]] },
  rise: { pitchContour: [[0,.8],[.18,.9],[.42,1.18],[.66,1.52],[.86,1.32],[1,.88]], gainContour: [[0,0],[.08,.5],[.29,.79],[.62,1],[.84,.82],[1,0]] },
  fail: { pitchContour: [[0,1.03],[.18,.98],[.39,.82],[.58,.88],[.78,.62],[1,.43]], gainContour: [[0,0],[.06,1],[.3,.78],[.49,.35],[.62,.62],[.84,.22],[1,0]] },
  expire: { pitchContour: [[0,1],[.21,.88],[.52,.76],[.79,.58],[1,.39]], gainContour: [[0,0],[.1,.89],[.26,1],[.59,.62],[.82,.21],[1,0]] }
};
const folds = {
  shambler:'pressed', feral:'ragged', leaper:'breathy', drowned:'hollow', military:'pressed',
  brute:'roar', screamer:'whistle', bomber:'hollow', demon:'roar', colossus:'hollow', guardian:'ragged', caveguard:'hollow'
};
const baseDurations = {
  leaper: {idle:[.3,.4],chase:[.25,.32],attack:[.3,.36],hurt:[.1,.16],death:[.612,.936]},
  drowned:{idle:[1,1.4],chase:[.7,1],attack:[.3,.4],hurt:[.1,.16],death:[.68,1.04]}
};
const baseLevels = {leaper:{idle:.03,chase:.04,attack:.07,hurt:.056,death:.084},drowned:{idle:.06,chase:.065,attack:.08,hurt:.064,death:.096}};
const texture = (freq, dur, vol, when=0, extra={}) => ({kind:'texture',freq,dur,vol,when,q:.6,attack:Math.min(.045,dur*.17),rev:.08,flutter:5,...extra});
const tap = (freq, dur, vol, when=0) => texture(freq,dur,vol,when,{filterType:'lowpass',attack:.002,flutter:0,rev:.035});
const rumble = (freq, dur, vol, when=0) => texture(freq,dur,vol,when,{filterType:'lowpass',freq2:freq*.62,attack:Math.min(.16,dur*.23),flutter:3,rev:.13});
const jaw = (...vowels) => vowels.map((vowel, index) => [index/(vowels.length-1),vowel]);

function syllable(c, when=0, length=1, strength=1, extra={}, sourceIndex=0) {
  const original=c.voices[sourceIndex] || c.voices[0];
  if (!original) throw new Error('Missing zombie throat: '+c.type+'/'+c.state);
  const action=copy(original), spec=action.spec || {};
  const duration=spec.dur || baseDurations[c.type]?.[c.state] || [.2,.3];
  const level=spec.vol ?? baseLevels[c.type]?.[c.state] ?? .08;
  const shape=shapes[extra.shape || (c.state==='hurt'?'gasp':c.state==='death'?'expire':'drag')];
  const patch={...extra}; delete patch.shape;
  action.when=when;
  const cavity=c.type==='caveguard'?{organic:true,grit:.45,drive:3.5,jitter:.07,formantScale:.9,formantQ:.45,chest:.12}:{};
  action.spec={...spec,...cavity,fold:folds[c.type] || 'ragged',rev:.1,...copy(shape),...patch};
  action.spec.dur=(patch.dur || duration.map(d=>d*length)).map(d=>clamp(d,.055,Math.min(2.5,3.17-when)));
  action.spec.vol=clamp(patch.vol ?? level*strength,.009,.3);
  delete action.spec.repeat;
  return action;
}

// Pain and death have their own articulation rather than recycling an idle phrase.
function dying(c, freq, tail=.04, vowels=['a','o','u']) {
  const v=(...args)=>syllable(c,...args), end=jaw(...vowels);
  return [
    [v(0,1,1,{shape:'expire',vowelPath:end}),rumble(freq,.6,tail,.65)],
    [v(0,.46,.95,{shape:'bark',vowelPath:jaw(vowels[0],vowels[1])}),v(.39,.63,.62,{shape:'fail',vowelPath:end}),texture(freq*1.8,.4,tail*.72,.91,{freq2:freq*.7,flutter:11})],
    [v(0,1.15,.91,{shape:'fail',vowelPath:end}),tap(freq*1.6,.08,tail*.58,.57),texture(freq,.7,tail*.78,1.08,{freq2:freq*.55,flutter:4})],
    [v(0,.62,1,{shape:'torn',vowelPath:jaw(vowels[0],vowels[1])}),texture(freq*1.4,.21,tail*.75,.48,{flutter:13}),v(.76,.45,.38,{shape:'expire',vowelPath:jaw(vowels[1],vowels[2]),breath:1.3}),rumble(freq,.4,tail*.6,1.13)]
  ];
}
function pain(c, freq, wet=false) {
  const v=(...args)=>syllable(c,...args), level=c.type==='colossus'?.055:.032;
  return [
    [v(0,1,1,{shape:'bark'}),texture(freq,.11,level,.03,{attack:.003,flutter:wet?18:5})],
    [v(0,.72,1,{shape:'clenched',vowelPath:jaw('uh','o')}),v(.14,.56,.48,{shape:'gasp',vowelPath:jaw('o','u')})],
    [v(0,1.25,.86,{shape:'torn',vowelPath:jaw('a','uh','u')}),tap(freq*.7,.042,level*.65,.15)],
    [texture(freq,.07,level,0,{attack:.002,flutter:0}),v(.018,.95,.94,{shape:'gasp',vowelPath:jaw('o','uh')}),texture(freq*.65,.19,level*.6,.14,{flutter:wet?17:3})]
  ];
}

function shambler(c) {
  if(c.state==='death')return dying(c,205,.04,['o','uh','u']);
  if(c.state==='hurt')return pain(c,410);
  const v=(...args)=>syllable(c,...args), hot=c.state==='attack', chasing=c.state==='chase';
  return [
    [v(0,1,1,{shape:hot?'bark':'drag',vowelPath:jaw('u','o','u'),fold:'pressed',rev:.075}),rumble(210,.4,.033,.32)],
    [v(0,.56,.94,{shape:'clenched',vowelPath:jaw('o','uh')}),texture(440,.16,.038,.28,{freq2:230,flutter:13}),v(.48,.35,.63,{shape:'gasp',vowelPath:jaw('uh','u')})],
    [v(0,hot?.85:1.15,.88,{shape:hot?'torn':'drag',vowelPath:jaw('u','uh','o','u'),bodyHz:95,bodyMix:.23}),tap(650,.055,.022,.39)],
    [v(0,.28,.95,{shape:'bark',vowelPath:jaw('uh','o')}),v(hot?.12:.26,chasing?.51:.72,.73,{shape:'fail',vowelPath:jaw('o','u')}),texture(340,.25,.03,hot?.4:.83,{freq2:180,flutter:8})]
  ];
}
function feral(c) {
  if(c.state==='death')return dying(c,930,.054,['a','e','uh']);
  if(c.state==='hurt')return pain(c,1600);
  const v=(...args)=>syllable(c,...args), hot=c.state==='attack';
  return [
    [v(0,hot?1:.65,1,{shape:'torn',vowelPath:jaw('uh','a','e'),rev:.045}),texture(1750,.16,.045,.14,{freq2:950,flutter:16})],
    [v(0,.45,.83,{shape:'bark',vowelPath:jaw('a','uh')}),v(.19,.81,1,{shape:'torn',vowelPath:jaw('uh','a','e')}),tap(1250,.03,.026,.12)],
    [texture(2000,.075,.045,0,{freq2:1300,attack:.003,flutter:0}),v(.022,1.2,.99,{shape:'rise',vowelPath:jaw('uh','a','e'),fold:'ragged'}),texture(1100,.13,.035,.41)],
    [v(0,.34,.8,{shape:'bark',vowelPath:jaw('a','uh')}),v(.14,.42,1,{shape:'bark',vowelPath:jaw('uh','a')}),v(.36,.69,.78,{shape:'torn',vowelPath:jaw('a','e','uh')}),texture(1450,.11,.032,.25)]
  ];
}
function leaper(c) {
  const v=(...args)=>syllable(c,...args), hot=c.state==='attack', death=c.state==='death';
  if(c.state==='move')return [
    [v(0,.72,.85,{shape:'rise'}),tap(2300,.013,.022,.04),tap(1300,.021,.013,.13)],
    [tap(1700,.018,.023,0),tap(3000,.009,.012,.09),v(.14,.64,.65,{shape:'bark'})],
    [v(0,1.05,.77,{shape:'torn'}),tap(2500,.012,.017,.07),tap(1150,.022,.013,.22),tap(2900,.008,.011,.25)],
    [tap(2100,.016,.023,0),v(.04,.5,.77,{shape:'rise'}),tap(1400,.027,.016,.18),tap(3100,.009,.01,.33)]
  ];
  return [
    [v(0,death?1.05:1,1,{shape:death?'expire':hot?'rise':'drag',rev:.12}),tap(2300,.016,.016,.07),tap(1100,.029,.011,.24)],
    [v(0,.59,.92,{shape:death?'fail':'bark'}),tap(3100,.012,.018,.2),v(.31,death?.69:.58,.58,{shape:death?'expire':'rise'}),tap(1500,.018,.011,.49)],
    [v(0,death?1.1:.79,.89,{shape:death?'fail':'torn'}),tap(1700,.024,.019,.08),tap(2700,.01,.014,.15),tap(1300,.025,.011,.37),texture(3400,.09,.022,.4)],
    [v(0,death?.88:.63,.95,{shape:death?'expire':'rise'}),tap(2400,.015,.021,.19),tap(1200,.029,.012,.35),texture(2900,death?.22:.09,.018,death?.54:.43,{freq2:1500,flutter:11})]
  ];
}
function spider(c) {
  const dying=c.state==='death', hurt=c.state==='hurt', attack=c.state==='attack';
  const d=dying?1.05:hurt?.18:attack?.43:c.state==='chase'?.52:.76;
  const level=attack?.16:hurt?.13:dying?.115:c.state==='chase'?.105:.08;
  return [
    [texture(3800,d,level,0,{freq2:dying?650:2100,flutter:7,rev:.035}),texture(930,d*.36,level*.24,d*.37,{freq2:590,flutter:3})],
    [texture(3100,d*.33,level*.86,0,{freq2:2200,attack:.004,flutter:0}),texture(4200,d*.7,level,d*.29+.04,{freq2:dying?800:1800,attack:.009,flutter:13}),tap(850,.032,level*.18,d*.24)],
    [texture(2400,d*.95,level*.91,0,{freq2:dying?600:3400,flutter:19,attack:.013,rev:.025}),texture(5100,d*.25,level*.48,.035,{freq2:2900,flutter:4}),texture(1200,d*.21,level*.29,d*.62)],
    [texture(4300,d*.24,level,0,{freq2:2600,attack:.003,flutter:0}),texture(2800,d*.32,level*.79,d*.26+.025,{freq2:1800,flutter:8}),texture(3600,d*.51,level*.58,d*.58+.045,{freq2:dying?420:1300,flutter:11})]
  ];
}
function drowned(c) {
  const v=(...args)=>syllable(c,...args), death=c.state==='death', hurt=c.state==='hurt';
  return [
    [v(0,1,1,{shape:death?'expire':hurt?'gasp':'drag',rev:.13}),texture(320,.27,.018,.16,{freq2:570,flutter:13}),tap(380,.055,.018,.51)],
    [v(0,death?.53:.67,.91,{shape:death?'fail':'clenched'}),texture(490,.19,.022,.25,{freq2:260,flutter:19}),v(hurt?.16:.48,death?.68:.38,.6,{shape:death?'expire':'gasp'}),tap(290,.066,.018,.71)],
    [v(0,death?1.17:1.03,.94,{shape:death?'fail':'drag',vowelPath:jaw('u','o','u')}),tap(550,.026,.021,.12),tap(310,.06,.016,.39),texture(410,.33,.021,.57,{freq2:190,flutter:14})],
    [v(0,death?.73:.57,1,{shape:death?'expire':'gasp'}),texture(280,.16,.019,.23,{freq2:590,flutter:15}),v(hurt?.18:.51,death?.43:.31,.45,{shape:'fail'}),texture(370,.27,.022,death?.79:.6,{freq2:160,flutter:10})]
  ];
}
function military(c) {
  if(c.state==='death')return dying(c,590,.036,['uh','o','u']);
  if(c.state==='hurt')return pain(c,940);
  const v=(...args)=>syllable(c,...args), hot=c.state==='attack';
  return [
    [v(0,.64,.81,{shape:'bark',vowelPath:jaw('uh','o'),rev:.055}),v(.18,1.08,1,{shape:'clenched',vowelPath:jaw('o','a','uh')}),texture(830,.1,.021,.42)],
    [v(0,hot?1.03:1.32,1,{shape:'torn',vowelPath:jaw('uh','a','o','uh'),formantGain:1.35}),tap(650,.045,.024,.31)],
    [v(0,.46,.74,{shape:'gasp',vowelPath:jaw('u','uh')}),v(.16,.61,1,{shape:'bark',vowelPath:jaw('a','uh')}),v(.39,.86,.71,{shape:'clenched',vowelPath:jaw('uh','o')}),texture(1100,.09,.025,.3)],
    [v(0,.92,.98,{shape:'clenched',vowelPath:jaw('o','uh','a')}),texture(720,.16,.028,.26,{freq2:1150,flutter:7}),v(.51,.6,.63,{shape:'gasp',vowelPath:jaw('a','uh')})]
  ];
}
function brute(c) {
  if(c.state==='death')return dying(c,260,.059,['a','o','u']);
  if(c.state==='hurt')return pain(c,370);
  const v=(...args)=>syllable(c,...args), hot=c.state==='attack';
  return [
    [v(0,1,1,{shape:hot?'bark':'clenched',vowelPath:jaw('o','a','o'),fold:'roar',bodyHz:115,bodyMix:.3,rev:.12}),rumble(280,.39,.046,.27)],
    [v(0,.42,.85,{shape:'gasp',vowelPath:jaw('o','uh')}),v(hot?.25:.61,.55,1,{shape:'clenched',vowelPath:jaw('uh','a','o')}),texture(450,.23,.038,hot?.48:1.03,{freq2:260,flutter:6})],
    [v(0,hot?1.2:1.14,.98,{shape:'torn',vowelPath:jaw('u','o','a','o'),bodyHz:140,bodyMix:.24}),tap(440,.05,.025,.34)],
    [v(0,.3,.91,{shape:'bark',vowelPath:jaw('a','o')}),texture(310,.27,.047,.2,{freq2:520,flutter:5}),v(.47,.65,.87,{shape:'drag',vowelPath:jaw('o','u'),fold:'pressed'}),rumble(210,.36,.034,.91)]
  ];
}
function spitter(c) {
  const death=c.state==='death', hurt=c.state==='hurt', hot=c.state==='attack';
  const d=death?1.18:hurt?.2:hot?.55:c.state==='chase'?.78:.94;
  const level=hot?.13:hurt?.1:death?.108:c.state==='chase'?.094:.076;
  return [
    [texture(310,d,level,0,{freq2:death?160:640,flutter:17,rev:.065}),texture(2900,d*.63,level*.66,.045,{freq2:1700,flutter:9}),tap(590,.05,level*.48,d*.26),tap(280,.076,level*.38,d*.69)],
    [texture(620,d*.39,level,0,{freq2:230,flutter:23,attack:.007}),tap(850,.034,level*.51,d*.12),texture(3600,d*.76,level*(hot?1.13:.71),d*.23+.028,{freq2:death?750:2200,flutter:14}),texture(260,d*.45,level*.54,d*.53,{freq2:480,flutter:19})],
    [texture(420,d*.91,level*.86,0,{freq2:death?120:760,flutter:28}),tap(700,.04,level*.58,d*.15),tap(360,.07,level*.43,d*.48),tap(570,.031,level*.36,d*.72),texture(2400,d*.39,level*.7,d*.53,{freq2:1100,flutter:7})],
    [texture(330,d*.29,level*.93,0,{freq2:540,flutter:11}),texture(3100,d*.23,level*.85,d*.19+.02,{freq2:1700,attack:.004,flutter:0}),texture(510,d*.7,level,d*.32,{freq2:death?145:240,flutter:21}),tap(270,.082,level*.42,d*.79),texture(1900,d*.35,level*.4,d*.72,{freq2:900,flutter:13})]
  ];
}
function screamer(c) {
  if(c.state==='death')return dying(c,1400,.088,['i','a','uh']);
  if(c.state==='hurt')return pain(c,2850);
  const v=(...args)=>syllable(c,...args), hot=c.state==='attack';
  return [
    [v(0,1,1,{shape:'torn',fold:'whistle',vowelPath:jaw('a','e','i','a'),rev:.22}),texture(2900,hot?.86:.38,hot?.14:.065,.018,{freq2:1700,flutter:21,attack:.005,rev:.2})],
    [v(0,.36,.83,{shape:'rise',fold:'breathy',vowelPath:jaw('e','i')}),v(hot?.23:.32,.78,1,{shape:'torn',fold:'whistle',vowelPath:jaw('i','a','i')}),texture(3300,hot?.62:.3,hot?.1:.056,.24,{freq2:1900,flutter:25})],
    [texture(2300,.12,hot?.12:.051,0,{freq2:3500,attack:.005,flutter:19}),v(.025,1.14,.98,{shape:'rise',fold:'whistle',vowelPath:jaw('e','a','i'),rev:.19}),texture(1750,.31,hot?.07:.038,hot?.99:.61,{freq2:900,flutter:8})],
    [v(0,.67,1,{shape:'torn',fold:'ragged',vowelPath:jaw('a','i','e')}),texture(2900,.1,hot?.11:.052,.28,{flutter:0,attack:.003}),v(hot?.49:.42,.48,.7,{shape:'fail',fold:'whistle',vowelPath:jaw('i','a')}),texture(1200,.25,hot?.059:.033,hot?.99:.76,{freq2:620,flutter:5})]
  ];
}
function bomber(c) {
  const v=(...args)=>syllable(c,...args);
  if(c.state==='death')return [
    [v(0,1.1,1,{shape:'expire',fold:'hollow',vowelPath:jaw('o','u'),bodyHz:125,bodyMix:.19}),rumble(280,.45,.036,.7)],
    [v(0,.51,.99,{shape:'drone',vowelPath:jaw('o','u')}),v(.42,.62,.63,{shape:'fail',vowelPath:jaw('u','o','u')})],
    [v(0,1.23,.91,{shape:'fail',vowelPath:jaw('o','u','o','u'),bodyHz:155,bodyMix:.17}),texture(380,.23,.024,.64,{freq2:210,flutter:9})],
    [v(0,.68,1,{shape:'clenched',vowelPath:jaw('o','u')}),texture(420,.12,.028,.46,{flutter:12}),v(.67,.38,.46,{shape:'expire',vowelPath:jaw('u','o')}),rumble(220,.39,.025,.85)]
  ];
  if(c.state==='hurt')return pain(c,480,true);
  return [
    [v(0,1,1,{shape:'drone',fold:'hollow',vowelPath:jaw('u','o','u'),bodyHz:145,bodyMix:.22,rev:.08})],
    [v(0,.67,.92,{shape:'drone',vowelPath:jaw('o','u')}),v(.55,.48,.73,{shape:'drone',vowelPath:jaw('u','o'),bodyHz:170,bodyMix:.16}),texture(370,.12,.024,.48,{flutter:9})],
    [v(0,1.19,.93,{shape:'drone',vowelPath:jaw('u','o','uh','o','u'),bodyHz:190,bodyMix:.19}),rumble(270,.27,.025,.64)],
    [v(0,.41,.83,{shape:'clenched',vowelPath:jaw('o','u')}),v(.38,.77,1,{shape:'drone',vowelPath:jaw('u','o','u'),bodyHz:125,bodyMix:.24})]
  ];
}
function demon(c) {
  const v=(...args)=>syllable(c,...args);
  if(c.state==='charge')return [
    [texture(950,.21,.1,0,{freq2:2400,flutter:11,attack:.04}),v(.1,.85,.94,{shape:'rise',vowelPath:jaw('uh','a'),fold:'ragged'}),v(.31,1.03,1,{shape:'torn',vowelPath:jaw('a','o'),bodyHz:130,bodyMix:.3},1),texture(1250,.34,.077,.34,{freq2:450,flutter:18})],
    [texture(530,.29,.086,0,{freq2:1800,flutter:7,attack:.065}),v(.16,.65,.83,{shape:'clenched',vowelPath:jaw('o','a')}),v(.4,1.17,1,{shape:'rise',vowelPath:jaw('a','o','a'),bodyHz:160,bodyMix:.26},1),texture(1550,.4,.086,.4,{freq2:650,flutter:22})],
    [texture(1400,.18,.103,0,{freq2:2800,flutter:17,attack:.03}),v(.085,1.1,.97,{shape:'rise',vowelPath:jaw('uh','a','e')}),v(.36,.9,1,{shape:'torn',vowelPath:jaw('a','o'),bodyHz:115,bodyMix:.32},1),rumble(380,.4,.063,.63)],
    [texture(740,.27,.095,0,{freq2:2300,flutter:9,attack:.06}),v(.13,.63,.81,{shape:'bark',vowelPath:jaw('o','a')}),texture(1800,.1,.059,.28,{flutter:0,attack:.002}),v(.39,1.25,1,{shape:'torn',vowelPath:jaw('a','o','u'),bodyHz:145,bodyMix:.28},1)]
  ];
  if(c.state==='death')return dying(c,510,.067,['a','o','u']);
  if(c.state==='hurt')return pain(c,730);
  const hot=c.state==='attack';
  return [
    [v(0,1,1,{shape:hot?'bark':'drag',fold:'roar',vowelPath:jaw('o','a','o'),bodyHz:145,bodyMix:.24}),texture(880,.47,.059,.12,{freq2:360,flutter:8})],
    [v(0,.56,.96,{shape:'clenched',vowelPath:jaw('a','o')}),texture(1300,.18,.061,.15,{freq2:490,flutter:15}),v(hot?.25:.61,.46,.77,{shape:'bark',vowelPath:jaw('o','a'),fold:'pressed'})],
    [v(0,hot?1.17:1.12,.94,{shape:'torn',vowelPath:jaw('u','o','a','o'),bodyHz:180,bodyMix:.2}),rumble(350,.53,.055,.35)],
    [v(0,.37,1,{shape:'bark',vowelPath:jaw('a','uh')}),v(.32,.63,.84,{shape:'drag',vowelPath:jaw('uh','o','u'),bodyHz:120,bodyMix:.3}),texture(700,.25,.051,.83,{freq2:310,flutter:11})]
  ];
}
function colossus(c) {
  const v=(...args)=>syllable(c,...args);
  if(c.state==='step')return [0,1,2,3].map(i=>[
    {kind:'tone',freq:39-i*2,slideTo:25-i*.6,dur:.25+i*.015,vol:.11,when:0,type:'sine',attack:.017,rev:.13},
    tap(130+i*17,.22-i*.018,.12,0),tap(490+i*70,.067+i*.004,.044,.025+i*.008),...(i%2?[rumble(220,.12,.029,.105)]:[])
  ]);
  if(c.state==='death')return dying(c,155,.082,['a','o','u']);
  if(c.state==='hurt')return pain(c,230);
  const hot=c.state==='attack', source=hot?1:0;
  return [
    [v(0,hot?1.02:1,1,{shape:hot?'clenched':'drag',fold:'hollow',vowelPath:jaw('u','o','u'),bodyHz:82,bodyMix:.36,rev:.19},source),rumble(175,hot?.47:.86,.068,hot?.15:.59)],
    [v(0,hot?.58:.47,.91,{shape:'gasp',vowelPath:jaw('o','u'),bodyHz:105,bodyMix:.27},source),texture(230,.39,.059,.51,{filterType:'lowpass',freq2:150,flutter:2,attack:.14}),v(hot?.59:1.05,hot?.61:.52,.79,{shape:'drag',vowelPath:jaw('u','o'),bodyHz:88,bodyMix:.32},source)],
    [v(0,hot?1.2:1.1,.94,{shape:hot?'torn':'drag',vowelPath:jaw('u','o','uh','u'),bodyHz:115,bodyMix:.25,rough:[.08,9]},source),rumble(155,.73,.062,hot?.5:1.03),tap(290,.11,.032,.36)],
    [v(0,hot?.34:.26,.86,{shape:'clenched',vowelPath:jaw('o','u'),bodyHz:94,bodyMix:.33},source),rumble(210,.34,.052,.36),v(hot?.49:.92,hot?.79:.72,1,{shape:'drag',vowelPath:jaw('u','o','u'),bodyHz:75,bodyMix:.37},source),texture(160,.38,.039,hot?1.05:1.98,{filterType:'lowpass',freq2:95,flutter:2,attack:.13})]
  ];
}
function guardian(c) {
  if(c.state==='death')return dying(c,1350,.055,['a','o','u']);
  if(c.state==='hurt')return pain(c,1650);
  const v=(...args)=>syllable(c,...args), hot=c.state==='attack';
  return [
    [v(0,.67,.9,{shape:'bark',vowelPath:jaw('o','uh'),rev:.055}),v(.21,1.03,1,{shape:'clenched',vowelPath:jaw('uh','o')}),v(.55,.55,.63,{shape:'gasp',vowelPath:jaw('o','u')}),texture(1250,.13,.026,.39)],
    [v(0,.72,.93,{shape:'bark',vowelPath:jaw('o','a')}),v(.23,hot?1:.88,.99,{shape:'rise',vowelPath:jaw('a','e','i'),fold:'ragged',rev:.16},1),texture(2300,.19,.048,.34,{freq2:1500,flutter:18})],
    [v(0,1.19,1,{shape:'torn',vowelPath:jaw('o','uh','a','o'),fold:'pressed',bodyHz:210,bodyMix:.14}),v(.44,.61,.67,{shape:'bark',vowelPath:jaw('o','uh')}),tap(1700,.035,.028,.35)],
    [v(0,.49,.78,{shape:'gasp',vowelPath:jaw('u','o')}),v(.15,.74,1,{shape:'bark',vowelPath:jaw('o','a')}),v(.58,hot?.96:.71,.86,{shape:'torn',vowelPath:jaw('a','e','a'),rev:.14},1),texture(1800,.16,.039,.72,{freq2:1100,flutter:13})]
  ];
}
function caveguard(c) {
  if(c.state==='death')return dying(c,1150,.034,['i','u','o']);
  if(c.state==='hurt')return pain(c,2400);
  const v=(...args)=>syllable(c,...args), hot=c.state==='attack';
  return [
    [v(0,1,1,{shape:hot?'rise':'drag',fold:'hollow',vowelPath:jaw('u','i','u'),rev:.2}),tap(2700,.023,.025,.12),tap(1500,.043,.017,.39)],
    [v(0,.53,.89,{shape:'bark',vowelPath:jaw('i','u')}),tap(3300,.012,.027,.18),v(.39,.59,.81,{shape:'rise',vowelPath:jaw('u','i'),rev:.18})],
    [v(0,1.13,.93,{shape:'torn',vowelPath:jaw('u','i','e','u'),fold:'breathy'}),texture(2200,.19,.026,.31,{freq2:900,flutter:15}),tap(1900,.03,.023,.47)],
    [v(0,.36,.85,{shape:'gasp',vowelPath:jaw('u','i')}),tap(3100,.014,.025,.12),tap(1200,.04,.018,.28),v(.52,.81,.84,{shape:'drag',vowelPath:jaw('i','u'),rev:.21})]
  ];
}
const builders={shambler,feral,leaper,spider,drowned,military,brute,spitter,screamer,bomber,demon,colossus,guardian,caveguard};

export function buildZombiePhrases(type,state,baseRecipe) {
  if(!Object.hasOwn(builders,type) || !Array.isArray(baseRecipe) || !baseRecipe.length)return [];
  state=state==='hit'?'hurt':state==='leap'?'attack':state;
  const context={type,state,voices:baseRecipe.filter(a=>a.kind==='voice'||a.kind==='base')};
  return builders[type](context);
}
