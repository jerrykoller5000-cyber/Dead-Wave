// CU-219: the five place cues exist and stay quiet without an audio device.
import test from 'node:test';
import assert from 'node:assert/strict';
import { AudioSys } from './audio.js';

const NAMES = ['depotGeneratorCough', 'mastWireSing', 'hikersPhoneRing', 'rangerRadioSquelch', 'trapperIronChime'];

test('the five place cues are on AudioSys and do not throw', () => {
  for (const name of NAMES) {
    assert.equal(typeof AudioSys[name], 'function', name);
    assert.doesNotThrow(() => AudioSys[name](0.5, 0.2));
    assert.doesNotThrow(() => AudioSys[name](0.01, 0));
  }
});
