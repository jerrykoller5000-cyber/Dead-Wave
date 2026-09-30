import test from 'node:test';
import assert from 'node:assert/strict';
import { text } from './strings.js';
import { createRelayStory } from './relay-story.js';

test('all twenty Harbor Nine dispatches and every planned prop and survivor line exist', () => {
  for (let n = 1; n <= 20; n++) assert(text(`story.relay.${n}`).length > 35, `missing relay ${n}`);
  for (const id of ['relayBroken','convoy','utilityTruck','ranger','hikers','trapper','fuel','dock','watchtower','hq'])
    assert(text(`story.prop.${id}`).length > 20, `missing prop ${id}`);
  for (const id of ['reyes','voss','kettle']) for (const moment of ['found','morning','aboard'])
    assert(text(`story.survivor.${id}.${moment}`).length > 15, `missing ${id}/${moment}`);
});

test('an early repair catches up before 18 and keeps both lines on the board, newer first', () => {
  const story = createRelayStory(); story.reset(7);
  assert.equal(story.read(false).status, 'silent');
  for (const day of [1,2,3]) assert.equal(story.morning({runId:7,day,repaired:false}),null);
  assert.equal(story.read(true).status, 'awaiting', 'repairing in prep does not play a line early');
  const heard = [];
  for (let day = 4; day <= 17; day++) {
    const dispatch = story.morning({runId:7,day,repaired:true});
    const numbers = dispatch.lines.map(entry => entry.number);
    assert.deepEqual(numbers, day <= 6 ? [2*(day-3), 2*(day-3)-1] : [day]);
    heard.push(...numbers.toReversed());
    for (const entry of dispatch.lines) assert.equal(entry.line,text(`story.relay.${entry.number}`));
    assert.equal(dispatch.line, dispatch.lines[0].line);
    assert.deepEqual(story.read(true),{status:'heard',...dispatch});
    assert.equal(story.morning({runId:7,day,repaired:true}),null,'opening the board again does not replay');
  }
  assert.deepEqual(heard,Array.from({length:17},(_,i)=>i+1));
  for (const day of [18,19,20]) {
    const dispatch=story.morning({runId:7,day,repaired:true});
    assert.equal(dispatch.number,day);
    assert.deepEqual(story.read(true),{status:'heard',...dispatch});
  }
  assert.equal(story.morning({runId:7,day:21,repaired:true}),null);
  assert.equal(story.read(true).number,20);
});

test('boat dispatches belong to mornings 18–20 even after a late repair', () => {
  const story=createRelayStory();story.reset('run');
  for(let day=1;day<=15;day++)story.morning({runId:'run',day,repaired:day>=12});
  assert.equal(story.read(true).number,8);
  assert.deepEqual(story.morning({runId:'run',day:16,repaired:true}).lines.map(x=>x.number),[10,9]);
  assert.deepEqual(story.morning({runId:'run',day:17,repaired:true}).lines.map(x=>x.number),[12,11]);
  for(const day of [18,19,20])assert.equal(story.morning({runId:'run',day,repaired:true}).number,day);
  story.reset('late');
  for(let day=1;day<=18;day++)story.morning({runId:'late',day,repaired:false});
  assert.equal(story.morning({runId:'late',day:19,repaired:true}).number,19);
  assert.equal(story.morning({runId:'late',day:20,repaired:true}).number,20);
  assert.equal(story.morning({runId:'run',day:20,repaired:true}),null,'old run cannot advance new story');
  story.reset('fresh');assert.equal(story.read(true).status,'awaiting');
});
