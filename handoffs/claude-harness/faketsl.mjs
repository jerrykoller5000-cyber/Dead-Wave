function makeStub(name = 'n') {
  const fn = function () {};
  const store = { isNode: true, value: 0 };
  return new Proxy(fn, {
    get(t, k) {
      if (k === Symbol.toPrimitive) return () => 0;
      if (k === 'then') return undefined;
      if (k === Symbol.iterator) return function* () {};
      if (k in store) return store[k];
      const s = makeStub(name + '.' + String(k)); store[k] = s; return s;
    },
    set(t, k, v) { store[k] = v; return true; },
    apply() { return makeStub(name + '()'); },
    construct() { return makeStub('new ' + name); }
  });
}
const names = ['attribute','dot','float','floor','fract','max','mix','normalize','pass','positionLocal','pow','sin','smoothstep','uniform','vec3','vec2','vec4','Fn','time','color','cos','abs','min','add','mul','sub','div','length','clamp','step','texture','uv','normalLocal','normalWorld','positionWorld','cameraPosition','bloom'];
export const attribute = makeStub(), dot = makeStub(), float = makeStub(), floor = makeStub(), fract = makeStub(), max = makeStub(), mix = makeStub(), normalize = makeStub(), pass = makeStub(), positionLocal = makeStub(), pow = makeStub(), sin = makeStub(), smoothstep = makeStub(), uniform = (v) => { const n = makeStub('uniform'); n.value = v; return n; }, vec3 = makeStub(), bloom = makeStub();

export const texture = makeStub(), positionWorld = makeStub(), cameraPosition = makeStub(), vec2 = makeStub(), vec4 = makeStub(), clamp = makeStub(), min = makeStub(), abs = makeStub(), length = makeStub(), distance = makeStub();
export const normalWorld = makeStub(), normalLocal = makeStub(), cos = makeStub(), step = makeStub();
