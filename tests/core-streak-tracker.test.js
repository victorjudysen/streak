'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const APP_PATH = path.join(__dirname, '..', 'assets', 'js', 'features', 'core-streak-tracker.js');
const APP_SOURCE = fs.readFileSync(APP_PATH, 'utf8');
const HABITS_KEY = 'streak.v1.habits';
const COMPLETIONS_KEY = 'streak.v1.completions';

class MemoryStorage {
  constructor(initial = {}) {
    this.values = new Map(Object.entries(initial));
  }

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }

  setItem(key, value) {
    this.values.set(key, String(value));
  }
}

class FakeElement {
  constructor(ownerDocument, tagName = 'div') {
    this.ownerDocument = ownerDocument;
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.attributes = new Map();
    this.listeners = new Map();
    this.dataset = {};
    this.style = {};
    this.hidden = false;
    this.value = '';
    this.className = '';
    this._textContent = '';
  }

  set textContent(value) {
    this._textContent = String(value);
    this.children = [];
  }

  get textContent() {
    return this._textContent + this.children.map((child) => child.textContent || '').join('');
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  addEventListener(type, listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(listener);
  }

  dispatch(type) {
    const event = { preventDefault() {} };
    (this.listeners.get(type) || []).forEach((listener) => listener(event));
  }

  click() {
    this.dispatch('click');
  }

  append(...children) {
    this.children.push(...children);
  }

  replaceChildren(...children) {
    this._textContent = '';
    this.children = [...children];
  }

  focus() {
    this.ownerDocument.activeElement = this;
  }

  reset() {
    this.ownerDocument.querySelector('#habit-name').value = '';
    this.ownerDocument.querySelector('#habit-category').value = '';
  }
}

class FakeDocument {
  constructor() {
    this.elements = new Map();
    this.activeElement = null;
    [
      'today-label', 'score-number', 'score-track', 'score-percent', 'daily-score',
      'habit-list', 'empty-state', 'show-add-form', 'empty-add', 'habit-form-wrap',
      'habit-form', 'cancel-add', 'habit-name', 'habit-category', 'name-error',
      'category-error', 'save-status', 'map-year', 'annual-total', 'best-streak',
      'heatmap', 'month-labels', 'today-map-summary',
    ].forEach((id) => this.elements.set(id, new FakeElement(this)));
    this.elements.get('habit-form-wrap').hidden = true;
  }

  querySelector(selector) {
    return this.elements.get(selector.replace(/^#/, '')) || null;
  }

  createElement(tagName) {
    return new FakeElement(this, tagName);
  }

  createTextNode(value) {
    const node = new FakeElement(this, '#text');
    node.textContent = value;
    return node;
  }
}

function boot(storage) {
  const document = new FakeDocument();
  class FakeFormData {
    get(name) {
      return document.querySelector(`#habit-${name}`).value;
    }
  }

  const context = vm.createContext({
    console,
    crypto: { randomUUID: () => '12345678-abcd-4321-abcd-123456789abc' },
    Date,
    document,
    FormData: FakeFormData,
    Intl,
    localStorage: storage,
    Math,
    requestAnimationFrame: (callback) => callback(),
    Set,
  });
  context.globalThis = context;
  vm.runInContext(APP_SOURCE, context, { filename: APP_PATH });
  return document;
}

function todayKey() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

const storage = new MemoryStorage();
let document = boot(storage);
const currentYear = new Date().getFullYear();
const daysInCurrentYear = Math.round((new Date(currentYear + 1, 0, 1) - new Date(currentYear, 0, 1)) / 86400000);

assert.equal(JSON.parse(storage.getItem(HABITS_KEY)).length, 5, 'seeds five habits on first visit');
assert.equal(document.querySelector('#habit-list').children.length, 5, 'renders seeded habits');
assert.equal(document.querySelector('#heatmap').children.length, daysInCurrentYear, 'renders every day in the current year');
assert.equal(document.querySelector('#score-number').textContent, '0/5', 'starts with a zero completion score');

document.querySelector('#habit-list').children[0].children[0].click();
assert.equal(JSON.parse(storage.getItem(COMPLETIONS_KEY))[todayKey()].length, 1, 'stores a completion');
assert.equal(document.querySelector('#score-number').textContent, '1/5', 'updates the completion score');
assert.equal(document.querySelector('#score-percent').textContent, '20%', 'updates the completion percentage');
assert.equal(document.querySelector('#annual-total').textContent, '1', 'updates the annual total');
assert.equal(
  document.querySelector('#heatmap').children.find((day) => day.className.includes('is-today')).dataset.level,
  '1',
  'updates today’s heatmap intensity',
);

document = boot(storage);
assert.equal(
  document.querySelector('#habit-list').children[0].children[0].getAttribute('aria-pressed'),
  'true',
  'restores completion state after reload',
);

document.querySelector('#show-add-form').click();
document.querySelector('#habit-form').dispatch('submit');
assert.equal(document.querySelector('#habit-name').getAttribute('aria-invalid'), 'true', 'validates a missing name');
assert.equal(document.querySelector('#habit-category').getAttribute('aria-invalid'), 'true', 'validates a missing category');

document.querySelector('#habit-name').value = 'Read for 20 minutes';
document.querySelector('#habit-category').value = 'Learning';
document.querySelector('#habit-form').dispatch('submit');
assert.equal(JSON.parse(storage.getItem(HABITS_KEY)).length, 6, 'stores a newly added habit');
assert.equal(document.querySelector('#habit-list').children.length, 6, 'renders a newly added habit');

const emptyStorage = new MemoryStorage({ [HABITS_KEY]: '[]' });
const emptyDocument = boot(emptyStorage);
assert.equal(JSON.parse(emptyStorage.getItem(HABITS_KEY)).length, 0, 'does not overwrite existing empty data');
assert.equal(emptyDocument.querySelector('#empty-state').hidden, false, 'shows the empty state');

console.log('Core streak tracker checks passed.');
