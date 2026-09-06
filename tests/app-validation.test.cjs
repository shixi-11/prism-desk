require('./helpers/config-fixture.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { outputPath } = require('../electron/app-validation.cjs');
test('application validation rejects escaped artifact paths', () => {
  const base = path.join(require('./helpers/config-fixture.cjs').root, 'app-validation');
  assert.equal(outputPath(base, 'output/probe.png'), path.join(base, 'output/probe.png'));
  assert.throws(() => outputPath(base, '../user-original.blend'));
  assert.throws(() => outputPath(base, base));
});
