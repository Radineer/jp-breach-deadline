import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deadlines, reportGrounds, closedReason } from '../src/index.js';

test('確報は知った日を1日目として30日目', () => {
  // 2026-10-01 を1日目とすると30日目は 10-30（金）
  assert.equal(deadlines('2026-10-01').definitive.dueDate, '2026-10-30');
});

test('30日目が祝日なら翌日', () => {
  // 2026-10-05 → 30日目 11-03（文化の日・火）→ 11-04
  const r = deadlines('2026-10-05').definitive;
  assert.equal(r.nominalDate, '2026-11-03');
  assert.equal(r.dueDate, '2026-11-04');
  assert.equal(r.shiftedFrom[0].reason, '文化の日');
});

test('不正の目的（第7条第3号）は60日、日曜なら月曜', () => {
  // 2026-10-01 → 60日目 11-29（日）→ 11-30（月）
  const r = deadlines('2026-10-01', { maliciousAct: true }).definitive;
  assert.equal(r.days, 60);
  assert.equal(r.nominalDate, '2026-11-29');
  assert.equal(r.dueDate, '2026-11-30');
});

test('年末年始閉庁日は明けるまで送る', () => {
  // 2026-12-01 → 30日目 12-30 → 12-31・1-1・1-2・1-3 も閉庁 → 2027-01-04（月）
  const r = deadlines('2026-12-01').definitive;
  assert.equal(r.nominalDate, '2026-12-30');
  assert.equal(r.dueDate, '2027-01-04');
  assert.equal(r.shiftedFrom.length, 5);
});

test('速報は知った時点から概ね3〜5日の目安', () => {
  const p = deadlines('2026-10-01').preliminary;
  assert.deepEqual([p.guideFrom, p.guideTo], ['2026-10-04', '2026-10-06']);
});

test('報告の要否は第7条1〜4号', () => {
  assert.equal(reportGrounds({}).required, false);
  assert.deepEqual(reportGrounds({ maliciousAct: true, over1000: true }).grounds.map((g) => g.item), [3, 4]);
});

test('入力の誤りと、データの無い年は止まる', () => {
  assert.throws(() => deadlines('2026-02-30'), RangeError);
  assert.throws(() => deadlines('2026/10/01'), TypeError);
  assert.throws(() => closedReason('2031-05-01'), RangeError);
});
