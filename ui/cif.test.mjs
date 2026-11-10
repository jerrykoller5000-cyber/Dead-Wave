import test from 'node:test';
import assert from 'node:assert/strict';
import {filterFinishes,availableCifItems,createCifMenu} from './cif.js';
import {createUnlocks, FREE_CAMOS} from './unlocks.js';
import {CAMO_KEYS} from '../core/camo.js';
import {text} from './strings.js';

test('CIF only offers unlocked finishes, even through obsolete filter names, without granting anything',()=>{
 const unlocks=createUnlocks({load:()=>null,save:()=>assert.fail('Browsing must not write unlocks')});
 const entries=CAMO_KEYS.map(key=>({key,locked:!unlocks.isUnlocked(key)}));
 assert.deepEqual(filterFinishes(entries,'available').map(e=>e.key).sort(),[...FREE_CAMOS].sort());
 for (const legacy of ['locked','all']) assert.deepEqual(filterFinishes(entries,legacy).map(e=>e.key).sort(),[...FREE_CAMOS].sort());
 assert.equal(entries.length,CAMO_KEYS.length);
});
test('CIF filters reflect earned finishes and an entirely earned collection',()=>{
 const entries=[{key:'m81',locked:false},{key:'dcu',locked:false},{key:'ucp',locked:true}];
 assert.deepEqual(filterFinishes(entries,'available').map(e=>e.key),['m81','dcu']);
 assert.deepEqual(filterFinishes(entries,'locked').map(e=>e.key),['m81','dcu']);
 assert.equal(filterFinishes(entries.map(e=>({...e,locked:false})),'available').length,3);
 assert.deepEqual(filterFinishes(entries.map(e=>({...e,locked:true})),'available'),[]);
 assert.equal(text('cif.menu.reset',{category:text('cif.tab.guns')}),'Reset Weapons');
 assert.equal(text('cif.menu.count',{label:text('cif.menu.available'),count:4}),'Available · 4');
});

test('CIF owns no unlock state: issued apparel stays, purchased kit follows the supplied facts',()=>{
 const items=['cap','helmet','mask','carrier','pads','boots'];
 assert.deepEqual(availableCifItems(items,{}),['cap','mask','boots']);
 assert.deepEqual(availableCifItems(items,{helmet:true,vest:true,pads:false}),['cap','helmet','mask','carrier','boots']);
 assert.deepEqual(availableCifItems(items,{helmet:true,vest:true,pads:true}),items);
 assert.deepEqual(availableCifItems(items,null),items,'legacy callers need the runtime hook before gear filtering is active');
 assert.equal(items.length,6);
});

function installCifDom() {
  const previous = globalThis.document;
  function tokens(compound) { return compound.match(/#[\w-]+|\.[\w-]+|\[[^\]]+\]|[a-zA-Z][\w-]*/g) || []; }
  function matchesToken(node, token) {
    if (token.startsWith('#')) return node.id === token.slice(1);
    if (token.startsWith('.')) return node.classList.contains(token.slice(1));
    if (token.startsWith('[')) {
      const body = token.slice(1, -1);
      const eq = body.indexOf('=');
      const attr = eq < 0 ? body : body.slice(0, eq);
      const key = attr.replace(/^data-/, '').replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      if (!Object.hasOwn(node.dataset, key)) return false;
      return eq < 0 || node.dataset[key] === body.slice(eq + 1).replace(/^"|"$/g, '');
    }
    return node.tag === token;
  }
  function matchesCompound(node, compound) {
    const parts = tokens(compound);
    return parts.length > 0 && parts.every(token => matchesToken(node, token));
  }
  function matchesSelector(node, selector) {
    const parts = selector.trim().split(/\s+/);
    let current = node;
    for (let i = parts.length - 1; i >= 0; i--) {
      if (i === parts.length - 1) { if (!matchesCompound(current, parts[i])) return false; }
      else {
        let ancestor = current.parent;
        while (ancestor && !matchesCompound(ancestor, parts[i])) ancestor = ancestor.parent;
        if (!ancestor) return false;
        current = ancestor;
      }
    }
    return true;
  }
  class Node {
    constructor(tag, props = {}) {
      this.tag = tag; this.id = props.id || ''; this.children = []; this.parent = null;
      this.classList = {set: new Set(), add: (...names) => { for (const name of names) if (name) this.classList.set.add(name); }, contains: name => this.classList.set.has(name)};
      this.dataset = {}; this.hidden = false; this.disabled = false; this.textContent = ''; this.scrollTop = 0; this.attributes = {};
    }
    set className(value) { this.classList.set = new Set(String(value).split(/\s+/).filter(Boolean)); }
    append(...nodes) { for (const node of nodes) { node.remove(); node.parent = this; this.children.push(node); } }
    prepend(node) { node.remove(); node.parent = this; this.children.unshift(node); }
    replaceChildren(...nodes) { for (const child of [...this.children]) child.remove(); this.append(...nodes); }
    remove() { if (!this.parent) return; const index = this.parent.children.indexOf(this); if (index >= 0) this.parent.children.splice(index, 1); this.parent = null; }
    insertBefore(node, ref) { node.remove(); node.parent = this; const index = ref ? this.children.indexOf(ref) : -1; if (index < 0) this.children.push(node); else this.children.splice(index, 0, node); }
    querySelectorAll(selector) {
      const found = [];
      const visit = node => { for (const child of node.children) { if (selector.split(',').some(part => matchesSelector(child, part.trim()))) found.push(child); visit(child); } };
      visit(this); return found;
    }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
    setAttribute(name, value) { this.attributes[name] = value; }
    get nextElementSibling() { return this.parent ? this.parent.children[this.parent.children.indexOf(this) + 1] || null : null; }
    focus() {}
  }
  const el = (tag, props) => new Node(tag, props);
  globalThis.document = {activeElement: null, createElement: tag => el(tag)};
  return {el, restore() { if (previous === undefined) delete globalThis.document; else globalThis.document = previous; }};
}

test('a CIF refresh keeps Solids and Special, and a second refresh does not stack Patterns or Locked', () => {
  const dom = installCifDom();
  try {
    const {el} = dom;
    const root = el('div'), list = el('div', {id:'cifList'}), options = el('div', {id:'cifOptions'}), items = el('div', {id:'cifItems'});
    const cap = el('button'); cap.dataset.cifItem = 'cap'; items.append(cap);
    const swatch = (camo, locked) => {
      const button = el('button'); button.dataset.camo = camo; button.disabled = locked;
      if (!locked) button.classList.add('on');
      button.append(el('canvas'), el('span'), el('b'));
      return button;
    };
    const solids = el('div'), special = el('div'), plain = el('button'), od = swatch('od', false), rune = swatch('rune', true);
    solids.className = 'cif-group'; solids.textContent = 'Solids';
    special.className = 'cif-group'; special.textContent = 'Special';
    plain.textContent = 'Aviators';
    list.append(solids, od, special, rune, plain);
    const scroll = el('div'); scroll.className = 'cif-scroll';
    root.append(el('div', {id:'cifFilters'}), items, el('div', {id:'cifTabs'}), scroll, options, list, el('div', {id:'cifEmpty'}), el('div', {id:'cifSelection'}), el('div', {id:'cifCurrent'}), el('div', {id:'cifPreviewNote'}), el('button', {id:'cifReset'}));
    const menu = createCifMenu({root, text: key => key, freeCamos: ['od']});
    const names = () => [...list.querySelectorAll('.cif-group')].map(heading => heading.textContent);
    menu.refresh({tab:'kit', item:'cap', current:'od'});
    assert.deepEqual(names(), ['cif.menu.patterns', 'Solids', 'Special']);
    assert.equal(rune.querySelectorAll('.cif-lock').length, 1);
    assert.equal(options.querySelector('button').textContent, 'Aviators');
    menu.refresh({tab:'kit', item:'cap', current:'od'});
    assert.deepEqual(names(), ['cif.menu.patterns', 'Solids', 'Special']);
    assert.equal(rune.querySelectorAll('.cif-lock').length, 1);
    assert.equal([...options.children].filter(node => node.textContent === 'Aviators').length, 1);
  } finally { dom.restore(); }
});
