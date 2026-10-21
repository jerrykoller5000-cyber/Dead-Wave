import test from 'node:test';
import assert from 'node:assert/strict';
import { createPropNotes, PROP_NOTE_SITES } from './prop-notes.js';
import { text } from './strings.js';

test('field-note sites include CL-109 gate and posters; the sealed HQ stays stencil-only', () => {
  assert.equal(Object.keys(PROP_NOTE_SITES).length,18);
  const notes=createPropNotes();notes.reset(1);
  for(const [id,key] of Object.entries(PROP_NOTE_SITES)) {
    const card=notes.read(id);
    assert.equal(card.line,text(`story.prop.${key}`));
    assert.equal(notes.read(id),null,`${id} should show once per run`);
  }
  assert.equal(notes.read('unknown'),null);
  assert.equal(notes.read('hq'),null);
  notes.reset(2);assert.equal(notes.read('watchtower').line,text('story.prop.watchtower'));
  assert.equal(notes.read('cordon').line,text('story.prop.cordon'));
  assert.equal(notes.read('trailhead').line,text('story.prop.trailhead'));
});

test('the relay maintenance tag is only readable before repair', () => {
  const notes=createPropNotes();notes.reset('run');
  assert.equal(notes.read('objective:radio-repair',{repaired:true}),null);
  assert.equal(notes.seen('objective:radio-repair'),false);
  assert.equal(notes.read('objective:radio-repair',{repaired:false}).line,text('story.prop.relayBroken'));
  assert.equal(notes.read('objective:radio-repair',{repaired:true}),null);
});
