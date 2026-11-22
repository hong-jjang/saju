#!/usr/bin/env node
// 홍짱 타로 덱 검증
//   node tarot/validate.js                       → 모든 덱 검사
//   node tarot/validate.js hongjjang-ohaeng      → 한 덱만 검사
//   node tarot/validate.js hongjjang-ohaeng --activate
//        → 검사를 통과하면 registry.json 에 '검증 통과'를 적고, 새 리딩의 기본 덱으로 바꿔요
// 검사 내용: 78장 구성, 중복·누락·모르는 카드 ID, 그림 파일 경로, 필수 해설, 사용 권리
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const REQUIRED_TEXT = { name: '표시 이름', story: '한 문장 풀이', upright: '정방향 풀이', reversed: '역방향 풀이', question: '성찰 질문' };
const ELEMENTS = ['목', '화', '토', '금', '수'];
const STATUS = ['published', 'draft', 'dev'];

function readJSON(file) {
  const raw = fs.readFileSync(file, 'utf8');
  return { raw, data: JSON.parse(raw) };
}

function checkCardList() {
  const errs = [];
  const { data } = readJSON(path.join(ROOT, 'cards.json'));
  const list = data.cards || [];
  const ids = list.map((c) => c.id);
  const seen = new Set();
  ids.forEach((id) => { if (seen.has(id)) errs.push(`[${id}] 카드 목록에 같은 ID가 두 번 있어요`); seen.add(id); });
  const major = list.filter((c) => c.arcana === 'major').length;
  if (list.length !== 78) errs.push(`카드 목록이 ${list.length}장이에요. 78장이어야 해요`);
  if (major !== 22) errs.push(`메이저 카드가 ${major}장이에요. 22장이어야 해요`);
  ['wands', 'cups', 'swords', 'pentacles'].forEach((s) => {
    const n = list.filter((c) => c.suit === s).length;
    if (n !== 14) errs.push(`${s} 카드가 ${n}장이에요. 14장이어야 해요`);
  });
  ids.forEach((id) => { if (!/^(major-(0\d|1\d|2[01])|(wands|cups|swords|pentacles)-(0[1-9]|1[0-4]))$/.test(id)) errs.push(`[${id}] ID 모양이 규칙과 달라요`); });
  return { errs, list };
}

function loadDeck(entry) {
  const file = path.join(ROOT, entry.path);
  const { raw, data } = readJSON(file);
  return { file, dir: path.dirname(file), raw, deck: data };
}

function validateDeck(entry, cardList, registry) {
  const errs = [], warns = [];
  let loaded;
  try { loaded = loadDeck(entry); } catch (e) { return { errs: [`덱 파일을 읽을 수 없어요: ${entry.path} (${e.message})`], warns, deck: null }; }
  const { deck, dir, raw } = loaded;
  const E = (id, field, msg) => errs.push(`[${id}] ${field}: ${msg}`);

  if (deck.deckId !== entry.id) E('덱', 'deckId', `registry 의 "${entry.id}"와 덱 파일의 "${deck.deckId}"가 달라요`);
  if (!deck.version) E('덱', 'version', '버전이 없어요 (예: "1.0.0")');
  if (STATUS.indexOf(deck.status) < 0) E('덱', 'status', `"published", "draft", "dev" 중 하나여야 해요 (지금: ${deck.status})`);
  if (!deck.rights || !deck.rights.owner) E('덱', 'rights', '사용 권리 정보(owner)가 없어요');
  if (!deck.back) E('덱', 'back', '뒷면 그림 경로가 없어요');
  else if (!fs.existsSync(path.join(dir, deck.back))) E('덱', 'back', `뒷면 그림 파일이 없어요 → ${deck.back}`);

  // 이어받기는 개발용 덱만
  let base = null;
  if (deck.inheritsFrom) {
    if (!deck.devOnly) E('덱', 'inheritsFrom', '다른 덱을 이어받는 건 개발용 덱(devOnly)만 할 수 있어요');
    const be = registry.decks.find((d) => d.id === deck.inheritsFrom);
    if (!be) E('덱', 'inheritsFrom', `이어받을 덱 "${deck.inheritsFrom}"이 registry 에 없어요`);
    else base = loadDeck(be).deck;
  }
  if (deck.status === 'published' && deck.devOnly) E('덱', 'status', '개발용 덱은 published 로 공개할 수 없어요');

  const known = new Set(cardList.map((c) => c.id));
  const cards = deck.cards || {};
  // 같은 ID가 파일에 두 번 적혀 있으면 JSON 이 조용히 하나를 지워 버려요 → 원문에서 셉니다
  cardList.forEach((c) => {
    const n = (raw.match(new RegExp('"' + c.id + '"\\s*:', 'g')) || []).length;
    if (n > 1) E(c.id, '카드 ID', `덱 파일에 ${n}번 적혀 있어요. 하나만 남겨 주세요`);
  });
  Object.keys(cards).forEach((id) => { if (!known.has(id)) E(id, '카드 ID', '카드 목록(cards.json)에 없는 ID예요. 오타인지 확인해 주세요'); });

  let own = 0, inherited = 0, temp = 0;
  cardList.forEach((c) => {
    const id = c.id;
    let card = cards[id];
    if (!card) {
      if (base && base.cards && base.cards[id]) { inherited++; return; }
      E(id, '카드', `덱에 이 카드가 없어요 (${c.defaultName})`);
      return;
    }
    own++;
    if (card.temporary) temp++;
    Object.keys(REQUIRED_TEXT).forEach((f) => {
      if (typeof card[f] !== 'string' || !card[f].trim()) E(id, f, `${REQUIRED_TEXT[f]}이 비어 있어요`);
    });
    if (!Array.isArray(card.keywords) || !card.keywords.length || card.keywords.some((k) => !String(k).trim())) E(id, 'keywords', '핵심어를 1개 이상 적어 주세요 (예: ["희망", "회복"])');
    if (card.front) {
      if (!fs.existsSync(path.join(dir, card.front))) E(id, 'front', `앞면 그림 파일이 없어요 → ${card.front}`);
      if (!card.alt || !String(card.alt).trim() || /적어 주세요/.test(card.alt)) E(id, 'alt', '그림을 설명하는 대체 텍스트를 적어 주세요');
    } else if (deck.requiresImages) {
      E(id, 'front', '이 덱은 모든 카드에 그림이 필요해요. 그림 경로를 적어 주세요');
    }
    if (card.element !== undefined && card.element !== null && ELEMENTS.indexOf(card.element) < 0) E(id, 'element', `오행은 "목·화·토·금·수" 중 하나이거나 null(미정)이어야 해요 (지금: ${card.element})`);
    if (!(card.rights && card.rights.owner) && !(deck.rights && deck.rights.owner)) E(id, 'rights', '사용 권리 정보가 없어요');
    if (/\(교체 가능한 (예시|임시) 문구/.test(card.upright + card.reversed)) warns.push(`[${id}] 예시 문구가 남아 있어요`);
  });
  if (deck.status === 'published' && temp) E('덱', 'temporary', `공개 덱에 임시 카드가 ${temp}장 있어요`);
  if (deck.rights && /확인 필요/.test(deck.rights.license || '')) warns.push('[덱] rights.license 가 "확인 필요"예요. 그림 사용 권리를 확인해 주세요');
  return { errs, warns, deck, own, inherited };
}

function main() {
  const args = process.argv.slice(2);
  const only = args.find((a) => !a.startsWith('--'));
  const activate = args.includes('--activate');
  const regFile = path.join(ROOT, 'registry.json');
  const registry = JSON.parse(fs.readFileSync(regFile, 'utf8'));
  const list = checkCardList();
  let bad = list.errs.length > 0;
  console.log('📋 카드 목록 (cards.json): ' + (list.errs.length ? '❌' : '✅ 78장 (메이저 22 + 마이너 56)'));
  list.errs.forEach((e) => console.log('   ❌ ' + e));

  const entries = registry.decks.filter((d) => !only || d.id === only);
  if (only && !entries.length) { console.log(`❌ "${only}" 덱이 registry.json 에 없어요`); process.exit(1); }
  const results = {};
  entries.forEach((entry) => {
    const r = validateDeck(entry, list.list, registry);
    results[entry.id] = r;
    const d = r.deck || {};
    const head = `\n🃏 ${entry.id} (${d.title || '?'}) · 버전 ${d.version || '?'} · 상태 ${d.status || '?'}`;
    console.log(head);
    if (d.cards) console.log(`   직접 넣은 카드 ${r.own}장` + (r.inherited ? ` · 기본 덱에서 이어받은 카드 ${r.inherited}장` : ''));
    if (r.errs.length) {
      const shown = r.errs.slice(0, 40);
      shown.forEach((e) => console.log('   ❌ ' + e));
      if (r.errs.length > shown.length) console.log(`   … 그 밖에 ${r.errs.length - shown.length}개 더 있어요`);
      console.log(`   결과: ❌ 고칠 곳 ${r.errs.length}개`);
      bad = true;
    } else console.log('   결과: ✅ 검증 통과');
    r.warns.forEach((w) => console.log('   ⚠️ ' + w));
  });

  // index.html 안의 비상용 기본 덱 사본이 최신인지
  try {
    const html = fs.readFileSync(path.join(ROOT, '..', 'index.html'), 'utf8');
    const m = html.match(/var TZ_FALLBACK = (.*);\n/);
    const basic = JSON.parse(fs.readFileSync(path.join(ROOT, 'decks/basic/deck.json'), 'utf8'));
    if (m && JSON.parse(m[1]).basic.version !== basic.version) { console.log(`\n⚠️ index.html 안의 기본 덱 사본이 예전 버전이에요. node tarot/embed.js 를 실행해 주세요.`); }
  } catch (e) { /* index.html 이 없으면 넘어가요 */ }

  if (activate) {
    if (!only) { console.log('\n❌ --activate 는 덱 하나를 골라서 써요. 예) node tarot/validate.js hongjjang-ohaeng --activate'); process.exit(1); }
    const r = results[only];
    if (list.errs.length || r.errs.length) { console.log(`\n❌ 검증을 통과하지 못해서 "${only}" 덱을 켜지 않았어요. 위의 고칠 곳을 먼저 고쳐 주세요.`); process.exit(1); }
    if (r.deck.status !== 'published') { console.log(`\n❌ "${only}" 덱의 status 가 "${r.deck.status}"예요. 공개하려면 deck.json 의 status 를 "published"로 바꾼 뒤 다시 실행해 주세요.`); process.exit(1); }
    registry.verified = registry.verified || {};
    registry.verified[only] = r.deck.version;
    registry.active = only;
    fs.writeFileSync(regFile, JSON.stringify(registry, null, 1) + '\n');
    console.log(`\n✅ "${only}" ${r.deck.version} 버전을 검증 통과로 적고, 새 리딩의 기본 덱으로 바꿨어요. (예전 기록은 그대로 열려요)`);
  }
  process.exit(bad ? 1 : 0);
}

main();
