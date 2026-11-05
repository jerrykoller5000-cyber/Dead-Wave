function mk(init) {
  const body = init.map(([k, seq]) => seq.map(v => 'this.' + k + ' = ' + v + ';').join(' ')).join('\n');
  return new Function('return function C(){' + body + '}')();
}
const cases = {
  smi0:        [['a',['0']],['b',['0']]],
  negzero:     [['a',['-0']],['b',['0']]],
  sent05:      [['a',['0.5','0']],['b',['0']]],
  undefThenNum:[['a',['undefined']],['b',['0']]],
  smiThenUndef:[['a',['0','undefined']],['b',['0']]],
};
for (const [name, spec] of Object.entries(cases)) {
  const C = mk(spec); const old = new C(); const w = new C(); w.a = 0.37;
  const same = %HaveSameMap(old, new C());
  const w2 = new C(); const same2 = %HaveSameMap(w2, new C());
  console.log(name.padEnd(14), 'old instance still on current map after a double write elsewhere:', same);
}
