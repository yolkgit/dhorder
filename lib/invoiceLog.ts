// 송장 출력 이력: ~/dhorder/data/invoice-prints.jsonl (한 줄에 한 번의 출력 요청)
// 누가 언제 어떤 주문의 송장을 몇 번 뽑았는지 남겨, 재발행(중복 상차 위험)을 구분한다.
import { promises as fs } from 'fs';
import path from 'path';

const FILE = path.join(process.cwd(), 'data', 'invoice-prints.jsonl');

export type PrintInfo = { count: number; lastAt: string | null; lastBy: string | null };

export async function appendPrintLog(orderIds: string[], supplierId: string, by: string) {
  if (orderIds.length === 0) return;
  const at = new Date().toISOString();
  const lines = orderIds.map((orderId) => JSON.stringify({ at, orderId, supplierId, by })).join('\n') + '\n';
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.appendFile(FILE, lines, 'utf8');
}

// 주문별 출력 횟수와 마지막 출력(시각·계정)
export async function printInfo(orderIds: string[]): Promise<Map<string, PrintInfo>> {
  const want = new Set(orderIds);
  const info = new Map<string, PrintInfo>();
  orderIds.forEach((id) => info.set(id, { count: 0, lastAt: null, lastBy: null }));
  let text = '';
  try {
    text = await fs.readFile(FILE, 'utf8');
  } catch {
    return info;
  }
  for (const line of text.split('\n')) {
    if (!line) continue;
    try {
      const r = JSON.parse(line);
      if (!want.has(r.orderId)) continue;
      const cur = info.get(r.orderId)!;
      cur.count += 1;
      if (!cur.lastAt || r.at > cur.lastAt) {
        cur.lastAt = r.at;
        cur.lastBy = r.by ?? null;
      }
    } catch {
      /* 깨진 줄은 건너뜀 */
    }
  }
  return info;
}
