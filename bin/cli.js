#!/usr/bin/env node
// 使い方: jp-breach-deadline 2026-10-05 [--malicious] [--json]
import { deadlines } from '../src/index.js';

const args = process.argv.slice(2);
const date = args.find((a) => /^\d{4}-\d{2}-\d{2}$/.test(a));
if (!date) {
  console.error('使い方: jp-breach-deadline <事態を知った日 YYYY-MM-DD> [--malicious] [--json]\n  --malicious  不正アクセスなど「不正の目的」による事態（施行規則第7条第3号）。確報は60日');
  process.exit(2);
}
const r = deadlines(date, { maliciousAct: args.includes('--malicious') });
if (args.includes('--json')) {
  console.log(JSON.stringify(r, null, 2));
} else {
  console.log(`事態を知った日: ${r.knownDate}`);
  console.log(`速報: ${r.preliminary.guideFrom}〜${r.preliminary.guideTo} が目安（${r.preliminary.rule}）`);
  console.log(`確報: ${r.definitive.dueDate} まで（${r.definitive.rule}）`);
  for (const s of r.definitive.shiftedFrom) console.log(`  ${s.date} は${s.reason}のため翌日へ`);
  console.log('これは期限の計算の道具で、法的な助言ではありません。');
}
