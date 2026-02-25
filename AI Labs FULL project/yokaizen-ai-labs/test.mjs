import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!DOCTYPE html><p>Hello world</p>');
global.window = dom.window;
global.document = window.document;
global.navigator = window.navigator;

import fs from 'fs';
const files = fs.readdirSync('./dist/assets').filter(f => f.startsWith('index-') && f.endsWith('.js'));
try {
  await import("./dist/assets/" + files[0]);
} catch(e) {
  console.error("CRASH TRACE:", e.stack);
}
