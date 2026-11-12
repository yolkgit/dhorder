// 생산관리 앱(asphalt-app)의 생산일보에서 제품별 금일재고를 읽어온다. (읽기 전용, 토큰 인증)
// 환경변수: ERP_STOCK_URL (예: http://127.0.0.1:3006), ERP_STOCK_TOKEN (생산관리 앱의 STOCK_API_TOKEN 과 같은 값)

export type ErpStockItem = {
  name: string;
  aliases: string[];
  unit: string;
  stock: number;
  prod_today: number;
  sale_today: number;
};

export type ErpStock = {
  date: string;
  synced_at: string;
  items: ErpStockItem[];
};

const FRESH_MS = 30_000;        // 이 시간 안에는 다시 묻지 않고 저장해 둔 값 사용 (접속자가 많아도 생산관리 앱에 부담 없게)
const STALE_OK_MS = 10 * 60_000; // 조회가 실패해도 이 시간까지는 마지막 값을 보여줌

let cache: { at: number; data: ErpStock } | null = null;
let inflight: Promise<ErpStock> | null = null;

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

export async function fetchErpStock(): Promise<ErpStock> {
  const base = process.env.ERP_STOCK_URL;
  const token = process.env.ERP_STOCK_TOKEN;
  if (!base || !token) throw new Error('ERP_STOCK_URL / ERP_STOCK_TOKEN 이 설정되지 않았습니다.');

  if (cache && Date.now() - cache.at < FRESH_MS) return cache.data;
  if (inflight) return inflight;

  inflight = (async () => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    try {
      const res = await fetch(`${base.replace(/\/$/, '')}/api/stock/summary`, {
        headers: { 'x-stock-token': token },
        cache: 'no-store',
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error(`생산관리 앱 응답 오류 (HTTP ${res.status})`);
      const j = await res.json();
      const data: ErpStock = {
        date: String(j?.date || ''),
        synced_at: String(j?.synced_at || ''),
        items: Array.isArray(j?.items)
          ? j.items.map((it: any) => ({
              name: String(it?.name || ''),
              aliases: Array.isArray(it?.aliases) ? it.aliases.map((a: unknown) => String(a)) : [],
              unit: String(it?.unit || ''),
              stock: num(it?.stock),
              prod_today: num(it?.prod_today),
              sale_today: num(it?.sale_today),
            }))
          : [],
      };
      cache = { at: Date.now(), data };
      return data;
    } catch (e) {
      if (cache && Date.now() - cache.at < STALE_OK_MS) return cache.data;
      throw e;
    } finally {
      clearTimeout(timer);
      inflight = null;
    }
  })();

  return inflight;
}
