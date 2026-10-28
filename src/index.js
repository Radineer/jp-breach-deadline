// 個人情報の漏えい等が起きたときの、個人情報保護委員会への報告の要否と期限を出す。
//
// 根拠（2026-10-28 に原文で確認）
// - 個人情報の保護に関する法律施行規則 第7条（報告対象となる事態）・第8条（速報・確報）
//   e-Gov 法令 API 428M60020000003（2026-06-14 施行の版）
// - 個人情報保護委員会「個人情報の保護に関する法律についてのガイドライン（通則編）」3-5-3-3・3-5-3-4
//   https://www.ppc.go.jp/personalinfo/legal/guidelines_tsusoku/
//
// これは期限の計算の道具で、法的な助言ではない。報告の要否と期限は、最終的に事業者が判断する。

import { readFileSync } from 'node:fs';

const HOLIDAYS = JSON.parse(readFileSync(new URL('../data/holidays.json', import.meta.url), 'utf8'));

/** 第7条1〜4号のどれに当たるかを返す。どれかに当たれば報告が要る。 */
export function reportGrounds({ sensitive = false, financialHarm = false, maliciousAct = false, over1000 = false } = {}) {
  const grounds = [];
  if (sensitive) grounds.push({ item: 1, text: '要配慮個人情報が含まれる個人データの漏えい等（高度な暗号化等の措置を講じたものを除く）' });
  if (financialHarm) grounds.push({ item: 2, text: '不正に利用されることにより財産的被害が生じるおそれがある個人データの漏えい等' });
  if (maliciousAct) grounds.push({ item: 3, text: '不正の目的をもって行われたおそれがある行為による個人データの漏えい等' });
  if (over1000) grounds.push({ item: 4, text: '本人の数が千人を超える漏えい等' });
  return { required: grounds.length > 0, grounds };
}

function parse(ymd) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) throw new TypeError(`日付は YYYY-MM-DD で渡してください: ${ymd}`);
  const [y, m, d] = ymd.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  if (t.getUTCMonth() !== m - 1 || t.getUTCDate() !== d) throw new RangeError(`存在しない日付です: ${ymd}`);
  return t;
}
const fmt = (t) => t.toISOString().slice(0, 10);
const addDays = (t, n) => new Date(t.getTime() + n * 86400000);

/** その日が「期限の繰り延べ」の対象か（土日・国民の祝日・休日・12/29〜1/3）。 */
export function closedReason(ymd) {
  const t = parse(ymd);
  const y = ymd.slice(0, 4);
  if (y < HOLIDAYS.years[0] || y > HOLIDAYS.years[1]) {
    throw new RangeError(`${y}年の祝日のデータがありません（${HOLIDAYS.years[0]}〜${HOLIDAYS.years[1]}年）。data/holidays.json を更新してください`);
  }
  const md = ymd.slice(5);
  if (md >= '12-29' || md <= '01-03') return '年末年始閉庁日';
  if (HOLIDAYS.holidays[ymd]) return HOLIDAYS.holidays[ymd];
  const w = t.getUTCDay();
  if (w === 0) return '日曜日';
  if (w === 6) return '土曜日';
  return null;
}

/**
 * 速報・確報の期限を出す。
 * @param {string} knownDate 事態を知った日（YYYY-MM-DD）。法人では、いずれかの部署が知った日（通則編 3-5-3-3）
 * @param {{maliciousAct?: boolean}} opts 第7条3号（不正の目的）に当たるなら確報は60日
 */
export function deadlines(knownDate, { maliciousAct = false } = {}) {
  const known = parse(knownDate);
  const days = maliciousAct ? 60 : 30;
  // 確報: 知った日を1日目とし、土日・祝日も含めて数える（通則編 3-5-3-4）
  const nominal = addDays(known, days - 1);
  // 末日が土日・祝日・年末年始閉庁日なら翌日を期限とする（同）。翌日も当たるときは当たらない日まで送る（この道具の解釈）
  let due = nominal;
  const shifted = [];
  for (let r = closedReason(fmt(due)); r; r = closedReason(fmt(due))) {
    shifted.push({ date: fmt(due), reason: r });
    due = addDays(due, 1);
  }
  return {
    knownDate,
    preliminary: {
      rule: '知った後、速やかに（施行規則第8条第1項）。日数の目安は、知った時点から概ね3〜5日以内（通則編 3-5-3-3）',
      guideFrom: fmt(addDays(known, 3)),
      guideTo: fmt(addDays(known, 5)),
    },
    definitive: {
      rule: `知った日から${days}日以内（施行規則第8条第2項${maliciousAct ? '・第7条第3号の事態' : ''}）`,
      days,
      nominalDate: fmt(nominal),
      dueDate: fmt(due),
      shiftedFrom: shifted,
    },
  };
}
