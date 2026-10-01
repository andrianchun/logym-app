import assert from 'node:assert/strict';
import { pruneHistoryForLocalCache, freeLocalStorageSpace, writeCache, readCache } from './storageCache.js';
import { canonicalizeExercise, defaultMasterExercises } from '../data/constants.js';
import { buildExLookupByName } from './workoutCalc.js';

console.log('Testing Storage Cache & ID 104 Migration Logic...');

// Mock localStorage if in node environment
const mockStorage = new Map();
globalThis.localStorage = {
  getItem: (k) => mockStorage.has(k) ? mockStorage.get(k) : null,
  setItem: (k, v) => mockStorage.set(k, String(v)),
  removeItem: (k) => mockStorage.delete(k),
  clear: () => mockStorage.clear(),
  get length() { return mockStorage.size; },
  key: (i) => Array.from(mockStorage.keys())[i] || null
};

// 1. Test pruneHistoryForLocalCache
const sampleHistory = {
  '2026-01-01': { workouts: [{ id: 'w1' }], bioData: { heartRateSamples: [60, 65, 70], steps: 5000 } },
  '2026-01-02': { workouts: [{ id: 'w2' }] },
  '2026-01-03': { workouts: [{ id: 'w3' }] },
  '2026-01-04': { workouts: [{ id: 'w4' }], bioData: { speedSamples: [10, 12], distance: 3.5 } },
  '2026-01-05': { workouts: [{ id: 'w5' }] },
};

// Prune to 3 days (should keep 2026-01-05, 2026-01-04, 2026-01-03)
const pruned = pruneHistoryForLocalCache(sampleHistory, 3);
assert.equal(Object.keys(pruned).length, 3);
assert.ok(pruned['2026-01-05']);
assert.ok(pruned['2026-01-04']);
assert.ok(pruned['2026-01-03']);
assert.equal(pruned['2026-01-01'], undefined);
// Ensure bioData samples stripped
assert.equal(pruned['2026-01-04'].bioData.speedSamples, undefined);
assert.equal(pruned['2026-01-04'].bioData.distance, 3.5);

// Test with pendingDates (should keep pending older date even if pruned)
const prunedWithPending = pruneHistoryForLocalCache(sampleHistory, 2, ['2026-01-01']);
assert.ok(prunedWithPending['2026-01-05']);
assert.ok(prunedWithPending['2026-01-04']);
assert.ok(prunedWithPending['2026-01-01'], '2026-01-01 must be preserved because it is in pendingDates');
assert.equal(prunedWithPending['2026-01-01'].bioData.heartRateSamples, undefined, 'dense samples stripped');
assert.equal(prunedWithPending['2026-01-01'].bioData.steps, 5000);

// Test edge cases
assert.equal(pruneHistoryForLocalCache(null), null);
assert.equal(pruneHistoryForLocalCache(undefined), undefined);

// 2. Test freeLocalStorageSpace
mockStorage.clear();
mockStorage.set('logym_exercise_registry_v3', 'huge_registry_data');
mockStorage.set('logym_gen_tokens', '12345');
mockStorage.set('lyfit_ai_sessions_guest', '[{"id":1}]');
mockStorage.set('logym_backup_memo_1', 'old_backup');
mockStorage.set('__CACHED_THEME', '"dark"');

// Sesi AI besar
const bigSessions = Array.from({ length: 5 }, (_, i) => ({ id: `s_${i}`, messages: ['msg'.repeat(10000)] }));
mockStorage.set('lyfit_ai_sessions_user123', JSON.stringify(bigSessions));

freeLocalStorageSpace();

assert.equal(localStorage.getItem('logym_exercise_registry_v3'), null, 'bulky registry must be removed');
assert.equal(localStorage.getItem('logym_gen_tokens'), null, 'gen tokens must be removed');
assert.equal(localStorage.getItem('lyfit_ai_sessions_guest'), null, 'guest AI session must be removed');
assert.equal(localStorage.getItem('logym_backup_memo_1'), null, 'backup memo must be removed');
assert.equal(localStorage.getItem('__CACHED_THEME'), '"dark"', 'essential app preferences must stay intact');

const trimmedSessions = JSON.parse(localStorage.getItem('lyfit_ai_sessions_user123'));
assert.equal(trimmedSessions.length, 2, 'huge AI sessions must be trimmed to 2 in local cache');

// 3. Test ID 104 Migration (Cable Seated -> Standing Cable Lateral Raise)
const oldUserEx = {
  id: 'custom_uuid_1',
  originalId: 104,
  name: 'Cable Seated Lateral Raise',
  equipment: 'Cable',
  target: ['Lateral Deltoid']
};
const migrated = canonicalizeExercise(oldUserEx);
assert.equal(migrated.name, 'Standing Cable Lateral Raise', 'ID 104 with Seated name must auto-migrate to Standing');

const oldMasterEx = {
  id: 104,
  name: 'Cable Seated Lateral Raise',
  equipment: 'Cable',
  target: ['Lateral Deltoid']
};
assert.equal(canonicalizeExercise(oldMasterEx).name, 'Standing Cable Lateral Raise');

// Check lookup map aliasing
const lookup = buildExLookupByName(null, defaultMasterExercises, [oldUserEx]);
assert.ok(lookup['104'], 'Master 104 must be in lookup');
assert.equal(lookup['104'].name, 'Standing Cable Lateral Raise');
assert.ok(lookup['custom_uuid_1'], 'User routine custom_uuid_1 must resolve in lookup');
assert.equal(lookup['custom_uuid_1'].id, 'nm:standing cable lateral raise', 'User routine exercise with originalId 104 must point to canonical standing cable lateral raise');

console.log('✅ All Storage Cache & ID 104 Migration tests PASSED successfully!');
