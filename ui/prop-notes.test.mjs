import test from 'node:test';
import assert from 'node:assert/strict';
import { createPropNotes, PROP_NOTE_SITES } from './prop-notes.js';
import { text } from './strings.js';

test('all seven objective props and dock, watchtower, HQ have one authored card', () => {
  assert.equal(Object.keys(PROP_NOTE_SITES).length,10);
  const notes=createPropNotes();notes.reset(1);
  for(const [id,key] of Object.entries(PROP_NOTE_SITES)) {
    const card=notes.read(id);
    assert.equal(card.line,text(`story.prop.${key}`));
    assert.equal(notes.read(id),null,`${id} should show once per run`);
  }
  assert.equal(notes.read('unknown'),null);
  notes.reset(2);assert.equal(notes.read('hq').line,text('story.prop.hq'));
});

test('the relay maintenance tag is only readable before repair', () => {
  const notes=createPropNotes();notes.reset('run');
  assert.equal(notes.read('objective:radio-repair',{repaired:true}),null);
  assert.equal(notes.seen('objective:radio-repair'),false);
  assert.equal(notes.read('objective:radio-repair',{repaired:false}).line,text('story.prop.relayBroken'));
  assert.equal(notes.read('objective:radio-repair',{repaired:true}),null);
});
