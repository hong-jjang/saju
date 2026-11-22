#!/usr/bin/env node
// 기본 덱이 바뀌었을 때, index.html 안에 넣어 둔 '비상용 사본'(인터넷이 끊겼을 때 쓰는 것)을 새로 맞춰요.
//   node tarot/embed.js
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const html = path.join(root, 'index.html');
const cards = JSON.parse(fs.readFileSync(path.join(__dirname, 'cards.json'), 'utf8')).cards;
const basic = JSON.parse(fs.readFileSync(path.join(__dirname, 'decks/basic/deck.json'), 'utf8'));
let s = fs.readFileSync(html, 'utf8');
const re = /  var TZ_FALLBACK = .*;\n/;
if (!re.test(s)) { console.log('❌ index.html 에서 TZ_FALLBACK 을 찾지 못했어요'); process.exit(1); }
s = s.replace(re, () => '  var TZ_FALLBACK = ' + JSON.stringify({ cards: cards, basic: basic }) + ';\n');
fs.writeFileSync(html, s);
console.log(`✅ index.html 의 기본 덱 사본을 ${basic.version} 버전으로 맞췄어요 (카드 ${cards.length}장)`);
