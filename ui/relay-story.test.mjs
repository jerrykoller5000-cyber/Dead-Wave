import test from 'node:test';
import assert from 'node:assert/strict';
import { text } from './strings.js';
import { createRelayStory } from './relay-story.js';

test('all twenty Ridgeline dispatches and every planned prop and survivor line exist', () => {
  for (let n = 1; n <= 20; n++) assert(text(`story.relay.${n}`).length > 35, `missing relay ${n}`);
  for (const id of ['relayBroken','convoy','utilityTruck','ranger','hikers','trapper','fuel','dock','watchtower','hq'])
    assert(text(`story.prop.${id}`).length > 20, `missing prop ${id}`);
  for (const id of ['okafor','brandt','pike']) for (const moment of ['found','roof','aboard'])
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
    const numbers = dispatch.lines.map(entry => entry.number).filter(Number.isInteger);
    assert.deepEqual(numbers, day <= 6 ? [2*(day-3), 2*(day-3)-1] : [day]);
    assert(!dispatch.lines.some(entry=>entry.line===text('story.relay.hushOrigin')),'repair alone has not recovered the board');
    heard.push(...numbers.toReversed());
    for (const entry of dispatch.lines) if(Number.isInteger(entry.number)) assert.equal(entry.line,text(`story.relay.${entry.number}`));
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
  const lateFirst=story.morning({runId:'late',day:19,repaired:true});
  assert.equal(lateFirst.lines[0].number,19);
  assert.equal(story.morning({runId:'late',day:20,repaired:true}).number,20);
  assert.equal(story.morning({runId:'run',day:20,repaired:true}),null,'old run cannot advance new story');
  story.reset('fresh');assert.equal(story.read(true).status,'awaiting');
});

test('Hush guidance waits for the actual spare board and does not replace numbered dispatches', () => {
  const story=createRelayStory();story.reset('board');
  for(let day=1;day<=3;day++) {
    const dispatch=story.morning({runId:'board',day,repaired:true});
    assert(dispatch.lines.every(entry=>entry.number!==null));
  }
  assert.equal(story.morning({runId:'old',day:4,repaired:true,board:'carried'}),null);
  const first=story.morning({runId:'board',day:4,repaired:true,board:'carried'});
  assert.deepEqual(first.lines.map(entry=>entry.number),[null,4]);
  assert.equal(first.lines[0].line,text('story.relay.hushOrigin'));
  assert.match(first.lines[0].line,/vault lift/);
  assert.match(first.lines[0].line,/HQ radio set/);
  assert.equal(story.morning({runId:'board',day:4,repaired:true,board:'wired'}),null);
  assert.deepEqual(story.morning({runId:'board',day:5,repaired:true,board:'wired'}).lines.map(entry=>entry.number),[5]);
  story.reset('wired');
  const wired=story.morning({runId:'wired',day:19,repaired:true,board:'wired'});
  assert.deepEqual(wired.lines.map(entry=>entry.number),[null,19]);
  assert.equal(wired.line,text('story.relay.hushOriginWired'));
  assert.doesNotMatch(wired.line,/Bring it/);
  assert.equal(story.morning({runId:'wired',day:20,repaired:true,board:'wired'}).number,20);
});

test('first delve replaces unheard line eight or adds a dispatch next morning once', () => {
  const story=createRelayStory(); story.reset('a');
  assert.equal(story.firstDelve('old'),false);
  assert.equal(story.firstDelve('a'),true); assert.equal(story.firstDelve('a'),false);
  const lines=[];
  for(let day=1;day<=10;day++)lines.push(...story.morning({runId:'a',day,repaired:true}).lines);
  assert.equal(lines.find(x=>x.number===8).line,text('story.relay.delve'));
  story.reset('b');
  for(let day=1;day<=10;day++)story.morning({runId:'b',day,repaired:true});
  story.firstDelve('b');
  assert.equal(story.morning({runId:'b',day:11,repaired:true}).lines[0].line,text('story.relay.delve'));
  assert.equal(story.morning({runId:'b',day:12,repaired:true}).lines.length,1);
});
