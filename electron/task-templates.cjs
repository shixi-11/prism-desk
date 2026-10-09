'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const FILE_NAME = 'task-templates.json';
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_TEMPLATES = 200;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function storageFile(directory) {
  const root = directory === undefined
    ? require('./runtime-paths.cjs').stateRoot()
    : directory;
  if (typeof root !== 'string' || !root) throw new TypeError('Invalid storage directory');
  return path.join(root, FILE_NAME);
}

function readTemplates(file) {
  let stat;
  try { stat = fs.statSync(file); }
  catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
  if (!stat.isFile()) throw new Error('Task templates file is not a regular file');
  if (stat.size > MAX_FILE_BYTES) throw new Error('Task templates file exceeds the size limit');
  let parsed;
  try { parsed = JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (error) { throw new Error(`Task templates file is corrupted: ${error.message}`); }
  if (!Array.isArray(parsed) || parsed.length > MAX_TEMPLATES) throw new Error('Task templates file is corrupted: invalid template list');
  const ids = new Set();
  for (const item of parsed) {
    if (!item || typeof item !== 'object' || Array.isArray(item) || !UUID_RE.test(item.id) ||
        typeof item.title !== 'string' || item.title.trim().length < 1 || item.title.length > 100 ||
        typeof item.body !== 'string' || item.body.length < 1 || item.body.length > 100000 ||
        typeof item.createdAt !== 'string' || !Number.isFinite(Date.parse(item.createdAt)) ||
        typeof item.updatedAt !== 'string' || !Number.isFinite(Date.parse(item.updatedAt)) || ids.has(item.id)) {
      throw new Error('Task templates file is corrupted: invalid template');
    }
    ids.add(item.id);
  }
  return parsed;
}

function atomicWrite(file, templates) {
  const directory = path.dirname(file);
  fs.mkdirSync(directory, { recursive: true });
  const temporary = path.join(directory, `.${FILE_NAME}.${process.pid}.${crypto.randomUUID()}.tmp`);
  try {
    const data = JSON.stringify(templates, null, 2) + '\n';
    if (Buffer.byteLength(data, 'utf8') > MAX_FILE_BYTES) throw new Error('Task templates file exceeds the size limit');
    fs.writeFileSync(temporary, data, { flag: 'wx' });
    fs.renameSync(temporary, file);
  } finally {
    try { fs.unlinkSync(temporary); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
}

function validateInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Template must be an object');
  if (input.id !== undefined && (typeof input.id !== 'string' || !UUID_RE.test(input.id))) throw new Error('Template id must be a UUID');
  if (typeof input.title !== 'string' || input.title.trim().length < 1 || input.title.length > 100) throw new Error('Template title must contain 1–100 characters');
  if (typeof input.body !== 'string' || input.body.length < 1 || input.body.length > 100000) throw new Error('Template body must contain 1–100000 characters');
}

function list(directory) {
  return readTemplates(storageFile(directory)).map(item => ({ ...item }));
}

function save(input, directory) {
  validateInput(input);
  const file = storageFile(directory);
  const templates = readTemplates(file);
  const now = new Date().toISOString();
  let saved;
  if (input.id !== undefined) {
    const index = templates.findIndex(item => item.id === input.id);
    if (index < 0) throw new Error('Template does not exist');
    saved = { id: input.id, title: input.title, body: input.body, createdAt: templates[index].createdAt, updatedAt: now };
    templates[index] = saved;
  } else {
    if (templates.length >= MAX_TEMPLATES) throw new Error('A maximum of 200 templates is allowed');
    saved = { id: crypto.randomUUID(), title: input.title, body: input.body, createdAt: now, updatedAt: now };
    templates.push(saved);
  }
  atomicWrite(file, templates);
  return { ...saved };
}

function remove(id, directory) {
  if (typeof id !== 'string' || !UUID_RE.test(id)) throw new Error('Template id must be a UUID');
  const file = storageFile(directory);
  const templates = readTemplates(file);
  const index = templates.findIndex(item => item.id === id);
  if (index < 0) return false;
  templates.splice(index, 1);
  atomicWrite(file, templates);
  return true;
}

module.exports = { list, save, remove };
