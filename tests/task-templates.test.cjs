'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const templates = require('../electron/task-templates.cjs');

function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'prism-task-templates-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return { directory, file: path.join(directory, 'task-templates.json') };
}

test('stores, updates, removes, and rereads templates on disk', t => {
  const { directory, file } = fixture(t);
  assert.deepEqual(templates.list(directory), []);
  const created = templates.save({ title: '中文模板', body: '第一行\n第二行\n' }, directory);
  assert.match(created.id, /^[0-9a-f-]{36}$/i);
  assert.equal(created.createdAt, created.updatedAt);
  assert.deepEqual(templates.list(directory), [created]);
  const updated = templates.save({ id: created.id, title: '修改后的模板', body: '正文\n换行' }, directory);
  assert.equal(updated.createdAt, created.createdAt);
  assert.ok(updated.updatedAt >= created.updatedAt);
  assert.deepEqual(templates.list(directory), [updated]);
  assert.deepEqual(JSON.parse(fs.readFileSync(file, 'utf8')), [updated]);
  assert.equal(templates.remove(created.id, directory), true);
  assert.equal(templates.remove(created.id, directory), false);
  assert.deepEqual(templates.list(directory), []);
});

test('rejects invalid input, missing updates, invalid ids, and the 200-template limit', t => {
  const { directory } = fixture(t);
  for (const input of [
    { title: '', body: 'x' }, { title: '  ', body: 'x' },
    { title: 'x'.repeat(101), body: 'x' }, { title: 'x', body: '' },
    { title: 'x', body: 'x'.repeat(100001) }, { id: '../outside', title: 'x', body: 'x' },
  ]) assert.throws(() => templates.save(input, directory));
  assert.throws(() => templates.save({ id: '00000000-0000-4000-8000-000000000000', title: 'x', body: 'x' }, directory), /does not exist/);
  assert.throws(() => templates.remove('../outside', directory), /UUID/);
  for (let i = 0; i < 200; i++) templates.save({ title: `模板 ${i}`, body: '内容' }, directory);
  assert.equal(templates.list(directory).length, 200);
  assert.throws(() => templates.save({ title: '第201个', body: '内容' }, directory), /maximum of 200/);
  assert.equal(templates.list(directory).length, 200);
});

test('corrupt and oversized files produce errors and remain untouched', t => {
  const { directory, file } = fixture(t);
  fs.writeFileSync(file, '{broken');
  const corrupt = fs.readFileSync(file);
  assert.throws(() => templates.list(directory), /corrupted/);
  assert.throws(() => templates.save({ title: '新模板', body: '正文' }, directory), /corrupted/);
  assert.deepEqual(fs.readFileSync(file), corrupt);
  fs.writeFileSync(file, Buffer.alloc(25 * 1024 * 1024 + 1, 32));
  const oversized = fs.readFileSync(file);
  assert.throws(() => templates.list(directory), /size limit/);
  assert.throws(() => templates.remove('00000000-0000-4000-8000-000000000000', directory), /size limit/);
  assert.deepEqual(fs.readFileSync(file), oversized);
});
