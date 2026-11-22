#!/usr/bin/env node
// 홍짱 타로 덱 검증 · 검수표 만들기
//   node tarot/validate.js                          → 모든 덱 검사
//   node tarot/validate.js hongjjang-ohaeng         → 한 덱 검사 + 검수표(tarot/reports/hongjjang-ohaeng-검수표.md)
//   node tarot/validate.js hongjjang-ohaeng --overlay
//        → '승인'된 카드만 검사해서 통과하면, 기본 덱 리딩에서 그 카드들만 홍짱 카드로 바꿔 보여 줘요
//   node tarot/validate.js hongjjang-ohaeng --activate
//        → 78장 모두 '승인' + 검사 통과일 때만, 덱 전체를 새 리딩의 기본 덱으로 바꿔요
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const REVIEW = ['초안', '검토 중', '승인'];
const ELEMENTS = ['목', '화', '토', '금', '수'];
const STATUS = ['published', 'draft', 'dev'];
const POS = { situation: '지금의 상황', consider: '살펴볼 점', action: '해볼 수 있는 일' };
const TODO = /확인 필요|적어 주세요/;

const readJSON = (f) => { const raw = fs.readFileSync(f, 'utf8'); return { raw, data: JSON.parse(raw) }; };
const str = (v) => typeof v === 'string' && v.trim().length > 0;

function checkCardList() {
  const errs = [];
  const list = readJSON(path.join(ROOT, 'cards.json')).data.cards || [];
  const seen = new Set();
  list.forEach((c) => { if (seen.has(c.id)) errs.push(`[${c.id}] 카드 목록에 같은 ID가 두 번 있어요`); seen.add(c.id); });
  if (list.length !== 78) errs.push(`카드 목록이 ${list.length}장이에요. 78장이어야 해요`);
  if (list.filter((c) => c.arcana === 'major').length !== 22) errs.push('메이저 카드가 22장이 아니에요');
  ['wands', 'cups', 'swords', 'pentacles'].forEach((s) => { const n = list.filter((c) => c.suit === s).length; if (n !== 14) errs.push(`${s} 카드가 ${n}장이에요. 14장이어야 해요`); });
  list.forEach((c) => { if (!/^(major-(0\d|1\d|2[01])|(wands|cups|swords|pentacles)-(0[1-9]|1[0-4]))$/.test(c.id)) errs.push(`[${c.id}] ID 모양이 규칙과 달라요`); });
  return { errs, list };
}

// 카드 한 장 검사 → { errs: [ [항목, 내용] ], todo: [ 확인 필요 항목 ] }
function checkCard(deck, dir, card) {
  const e = [], todo = [];
  const E = (f, m) => e.push([f, m]);
  if (!str(card.name)) E('name', '표시 이름이 비어 있어요');
  if (REVIEW.indexOf(card.review) < 0) E('review', `검토 상태는 "초안", "검토 중", "승인" 중 하나여야 해요 (지금: ${card.review})`);
  const t = card.traditional || {};
  if (!Array.isArray(t.keywords) || !t.keywords.length || t.keywords.some((k) => !str(k))) E('traditional.keywords', '전통 핵심어를 1개 이상 적어 주세요');
  if (!str(t.upright)) E('traditional.upright', '전통 정방향 해석이 비어 있어요');
  if (!str(t.reversed)) E('traditional.reversed', '전통 역방향 해석이 비어 있어요');
  if (!str(t.source) || TODO.test(t.source)) todo.push('전통 해석 참고 자료');
  const r = card.reading || {};
  if (!str(r.story)) E('reading.story', '카드를 뒤집으면 먼저 보이는 한 문장이 비어 있어요');
  if (!str(r.question)) E('reading.question', '성찰 질문이 비어 있어요');
  if (card.positions) {
    Object.keys(POS).forEach((k) => {
      const p = card.positions[k];
      if (!p || !str(p.upright)) E('positions.' + k, `'${POS[k]}' 자리의 정방향 해설이 비어 있어요 (없으면 positions 를 통째로 지우면 앱 규칙으로 이어 써요)`);
    });
  }
  if (card.front) {
    if (!fs.existsSync(path.join(dir, card.front))) E('front', `앞면 그림 파일이 없어요 → ${card.front}`);
    if (!str(card.alt) || TODO.test(card.alt)) E('alt', '그림을 설명하는 대체 텍스트를 적어 주세요');
  } else if (deck.requiresImages) E('front', '그림 경로가 없어요');
  if (deck.requiresScene) {
    const s = card.scene || {};
    if (!str(s.description) || TODO.test(s.description)) E('scene.description', '그림 속 장면 설명을 적어 주세요');
    if (!Array.isArray(s.symbols) || !s.symbols.length) E('scene.symbols', '장면 속 상징과 그 뜻을 1개 이상 적어 주세요');
  }
  if (card.element !== undefined && card.element !== null) {
    const el = card.element;
    if (typeof el !== 'object') E('element', '오행은 { value, reason, usage, review } 모양으로 적어요');
    else {
      if (el.value !== null && ELEMENTS.indexOf(el.value) < 0) E('element.value', `오행은 "목·화·토·금·수" 중 하나이거나 null(미정)이어야 해요 (지금: ${el.value})`);
      if (REVIEW.indexOf(el.review) < 0) E('element.review', '오행 검토 상태는 "초안", "검토 중", "승인" 중 하나여야 해요');
      if (el.review === '승인' && (!el.value || !str(el.reason))) E('element', '승인한 오행에는 오행과 배정 이유가 꼭 있어야 해요');
    }
  }
  if (card.temporary) todo.push('임시 그림·문구');
  if (!(card.rights && card.rights.owner) && !(deck.rights && deck.rights.owner)) E('rights', '사용 권리 정보가 없어요');
  return { e, todo };
}

function validateDeck(entry, cardList, registry) {
  const file = path.join(ROOT, entry.path), dir = path.dirname(file);
  const deckErrs = [], rows = [];
  let raw, deck;
  try { ({ raw, data: deck } = readJSON(file)); } catch (e) { return { fatal: `덱 파일을 읽을 수 없어요: ${entry.path} (${e.message})` }; }
  const DE = (f, m) => deckErrs.push(['덱', f, m]);
  if (deck.deckId !== entry.id) DE('deckId', `registry 의 "${entry.id}"와 다른 "${deck.deckId}"예요`);
  if (!str(deck.version)) DE('version', '버전이 없어요 (예: "1.0.0")');
  if (STATUS.indexOf(deck.status) < 0) DE('status', `"published", "draft", "dev" 중 하나여야 해요 (지금: ${deck.status})`);
  if (!deck.rights || !deck.rights.owner) DE('rights', '사용 권리 정보(owner)가 없어요');
  if (!deck.back) DE('back', '뒷면 그림 경로가 없어요');
  else if (!fs.existsSync(path.join(dir, deck.back))) DE('back', `뒷면 그림 파일이 없어요 → ${deck.back}`);
  if (deck.inheritsFrom && !deck.devOnly) DE('inheritsFrom', '다른 덱을 이어받는 건 개발용 덱(devOnly)만 할 수 있어요');
  const base = deck.inheritsFrom ? (() => { const be = registry.decks.find((d) => d.id === deck.inheritsFrom); return be ? readJSON(path.join(ROOT, be.path)).data : null; })() : null;
  const cards = deck.cards || {};
  const known = new Set(cardList.map((c) => c.id));
  cardList.forEach((c) => { const n = (raw.match(new RegExp('"' + c.id + '"\\s*:', 'g')) || []).length; if (n > 1) deckErrs.push([c.id, '카드 ID', `덱 파일에 ${n}번 적혀 있어요. 하나만 남겨 주세요`]); });
  Object.keys(cards).forEach((id) => { if (!known.has(id)) deckErrs.push([id, '카드 ID', '카드 목록(cards.json)에 없는 ID예요']); });
  cardList.forEach((c) => {
    const card = cards[c.id];
    if (!card) {
      if (base && base.cards[c.id]) { rows.push({ id: c.id, name: c.defaultName, review: '(이어받음)', inherited: true, e: [], todo: [] }); return; }
      rows.push({ id: c.id, name: c.defaultName, review: '없음', missing: true, e: [['카드', '덱에 아직 없어요']], todo: [] }); return;
    }
    const r = checkCard(deck, dir, card);
    rows.push({ id: c.id, name: card.name || c.defaultName, review: card.review, e: r.e, todo: r.todo, card });
  });
  return { deck, dir, deckErrs, rows };
}

function writeReport(id, res) {
  const { deck, rows, deckErrs } = res;
  const cnt = (f) => rows.filter(f).length;
  const L = [`# ${deck.title} 검수표`, '', `- 덱 ID: \`${deck.deckId}\` · 버전 ${deck.version} · 상태 ${deck.status} · 검사한 날 ${new Date().toISOString().slice(0, 10)}`,
    `- 카드 78장 중: 승인 ${cnt((r) => r.review === '승인')} · 검토 중 ${cnt((r) => r.review === '검토 중')} · 초안 ${cnt((r) => r.review === '초안')} · 아직 없음 ${cnt((r) => r.missing)}` + (cnt((r) => r.inherited) ? ` · 기본 덱에서 이어받음 ${cnt((r) => r.inherited)}` : ''),
    `- 고칠 곳이 있는 카드: ${cnt((r) => r.e.length && !r.missing)}장`, ''];
  if (deckErrs.length) { L.push('## 덱 전체', '', '| 대상 | 항목 | 고칠 내용 |', '|---|---|---|'); deckErrs.forEach((d) => L.push(`| ${d[0]} | ${d[1]} | ${d[2]} |`)); L.push(''); }
  L.push('## 카드별', '', '| 카드 ID | 이름 | 검토 상태 | 그림 | 해설 | 자리별 해설 | 장면·상징 | 오행 | 확인 필요 | 고칠 곳 |', '|---|---|---|---|---|---|---|---|---|---|');
  rows.forEach((r) => {
    const c = r.card || {}, has = (pre) => r.e.some((x) => x[0].indexOf(pre) === 0);
    const mark = (ok) => (r.missing ? '—' : ok ? '✅' : '❌');
    const el = c.element ? (c.element.value || '미정') + ' (' + c.element.review + ')' : '—';
    L.push(`| ${r.id} | ${r.name} | ${r.review} | ${mark(!has('front') && !has('alt'))} | ${mark(!has('traditional') && !has('reading'))} | ${r.missing ? '—' : c.positions ? (has('positions') ? '❌' : '✅') : '규칙'} | ${mark(!has('scene'))} | ${el} | ${r.todo.join(', ') || ''} | ${r.e.map((x) => x[0] + ': ' + x[1]).join('<br>')} |`);
  });
  const review = rows.filter((r) => r.card && r.review !== '승인');
  if (review.length) {
    L.push('', '## 홍짱이 검토할 원고·이미지', '');
    review.forEach((r) => {
      const c = r.card;
      L.push(`### ${r.id} ${r.name} (${r.review})`);
      L.push(`- 그림: \`${c.front || '없음'}\`${c.temporary ? ' — 임시: ' + (c.tempNote || '') : ''}`);
      if (c.scene) { L.push(`- 장면: ${c.scene.description}`); (c.scene.symbols || []).forEach((s) => L.push(`  - 상징 '${s.symbol}': ${s.meaning}`)); ['frame', 'painting', 'characters'].forEach((k) => c.scene[k] && L.push(`- ${c.scene[k]}`)); }
      L.push(`- 한 문장: ${c.reading.story} / 역방향: ${c.reading.storyReversed || '(없음)'}`);
      L.push(`- 성찰 질문: ${c.reading.question}`);
      if (c.positions) Object.keys(POS).forEach((k) => L.push(`- ${POS[k]}: ${c.positions[k].upright} / 역방향: ${c.positions[k].reversed || '(규칙)'}`));
      if (c.element) L.push(`- 오행 ${c.element.value || '미정'} (${c.element.review}): ${c.element.reason || ''}`);
      (c.notes || []).forEach((n) => L.push(`- 메모: ${n}`));
      L.push('');
    });
  }
  const out = path.join(ROOT, 'reports', id + '-검수표.md');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, L.join('\n') + '\n');
  return out;
}

function main() {
  const args = process.argv.slice(2);
  const only = args.find((a) => !a.startsWith('--'));
  const activate = args.includes('--activate'), overlay = args.includes('--overlay');
  const regFile = path.join(ROOT, 'registry.json');
  const registry = JSON.parse(fs.readFileSync(regFile, 'utf8'));
  const list = checkCardList();
  console.log('📋 카드 목록 (cards.json): ' + (list.errs.length ? '❌' : '✅ 78장 (메이저 22 + 마이너 56)'));
  list.errs.forEach((e) => console.log('   ❌ ' + e));
  let bad = list.errs.length > 0;
  const entries = registry.decks.filter((d) => !only || d.id === only);
  if (only && !entries.length) { console.log(`❌ "${only}" 덱이 registry.json 에 없어요`); process.exit(1); }
  const results = {};
  entries.forEach((entry) => {
    const r = validateDeck(entry, list.list, registry);
    results[entry.id] = r;
    if (r.fatal) { console.log('\n❌ ' + r.fatal); bad = true; return; }
    const d = r.deck, rows = r.rows;
    const errRows = rows.filter((x) => x.e.length);
    const nAll = r.deckErrs.length + errRows.reduce((a, x) => a + x.e.length, 0);
    console.log(`\n🃏 ${entry.id} (${d.title}) · 버전 ${d.version} · 상태 ${d.status}`);
    console.log(`   승인 ${rows.filter((x) => x.review === '승인').length} · 검토 중 ${rows.filter((x) => x.review === '검토 중').length} · 초안 ${rows.filter((x) => x.review === '초안').length} · 없음 ${rows.filter((x) => x.missing).length}` + (rows.some((x) => x.inherited) ? ` · 이어받음 ${rows.filter((x) => x.inherited).length}` : ''));
    r.deckErrs.forEach((x) => console.log(`   ❌ [${x[0]}] ${x[1]}: ${x[2]}`));
    const shown = errRows.filter((x) => !x.missing).slice(0, 20);
    shown.forEach((x) => x.e.forEach((y) => console.log(`   ❌ [${x.id}] ${y[0]}: ${y[1]}`)));
    const miss = rows.filter((x) => x.missing);
    if (miss.length) console.log(`   ❌ 덱에 아직 없는 카드 ${miss.length}장: ${miss.slice(0, 8).map((x) => x.id).join(', ')}${miss.length > 8 ? ' …' : ''}`);
    const todo = rows.filter((x) => x.todo.length);
    if (todo.length) console.log(`   ⚠️ 확인 필요 항목이 있는 카드 ${todo.length}장 (예: [${todo[0].id}] ${todo[0].todo.join(', ')})`);
    console.log(nAll ? `   결과: ❌ 고칠 곳 ${nAll}개` : '   결과: ✅ 검사 통과');
    if (nAll) bad = true;
    if (only) console.log('   📝 검수표: ' + path.relative(path.join(ROOT, '..'), writeReport(entry.id, r)));
  });
  try { // index.html 안 비상용 기본 덱 사본이 최신인지
    const m = fs.readFileSync(path.join(ROOT, '..', 'index.html'), 'utf8').match(/var TZ_FALLBACK = (.*);\n/);
    const bv = readJSON(path.join(ROOT, 'decks/basic/deck.json')).data.version;
    if (m && JSON.parse(m[1]).basic.version !== bv) console.log('\n⚠️ index.html 안의 기본 덱 사본이 예전 버전이에요. node tarot/embed.js 를 실행해 주세요.');
  } catch (e) { /* 넘어가요 */ }

  if (activate || overlay) {
    if (!only) { console.log('\n❌ 덱 하나를 골라서 써요. 예) node tarot/validate.js hongjjang-ohaeng --overlay'); process.exit(1); }
    const r = results[only];
    if (r.fatal || list.errs.length || r.deckErrs.length) { console.log('\n❌ 덱 전체에 고칠 곳이 있어서 바꾸지 않았어요.'); process.exit(1); }
    registry.verified = registry.verified || {};
    if (activate) {
      const notOk = r.rows.filter((x) => x.e.length || x.review !== '승인');
      if (notOk.length) { console.log(`\n❌ 승인되지 않았거나 고칠 곳이 있는 카드가 ${notOk.length}장이라 덱 전체를 켜지 않았어요. 검수표를 봐 주세요.`); process.exit(1); }
      if (r.deck.status !== 'published') { console.log(`\n❌ status 가 "${r.deck.status}"예요. deck.json 의 status 를 "published"로 바꾼 뒤 다시 실행해 주세요.`); process.exit(1); }
      registry.verified[only] = r.deck.version; registry.active = only; delete registry.overlay;
      console.log(`\n✅ "${only}" ${r.deck.version} 전체를 새 리딩의 기본 덱으로 바꿨어요. (예전 기록은 그대로 열려요)`);
    } else {
      const ok = r.rows.filter((x) => x.review === '승인' && !x.e.length && !x.inherited).map((x) => x.id);
      const badOk = r.rows.filter((x) => x.review === '승인' && x.e.length);
      if (badOk.length) { console.log(`\n❌ '승인'인데 고칠 곳이 있는 카드가 있어요: ${badOk.map((x) => x.id).join(', ')}`); process.exit(1); }
      if (!ok.length) { console.log(`\n❌ '승인'된 카드가 아직 없어서 바꿀 카드가 없어요. 카드의 "review"를 "승인"으로 바꾼 뒤 다시 실행해 주세요.`); process.exit(1); }
      registry.overlay = { deckId: only, version: r.deck.version, cards: ok };
      console.log(`\n✅ 기본 덱 리딩에서 승인된 ${ok.length}장(${ok.join(', ')})을 "${only}" ${r.deck.version} 카드로 바꿔 보여 줘요.`);
    }
    fs.writeFileSync(regFile, JSON.stringify(registry, null, 1) + '\n');
    process.exit(0);
  }
  process.exit(bad ? 1 : 0);
}

main();
