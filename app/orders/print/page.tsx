'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Printer } from 'lucide-react';

// ───────── 타입 ─────────
type Line = { itemName: string; quantity: number; imageUrl: string | null };
type PrintOrder = {
  id: string;
  deliveryDate: string;
  arrivalTime: string;
  destination: string;
  address: string;
  phoneNumber: string;
  memo: string | null;
  isWingCarRestricted: boolean;
  branchName: string;
  contactName: string;
  items: Line[];
  printCount: number;
  lastPrintedAt: string | null;
  lastPrintedBy: string | null;
};
type Supplier = { id: string; name: string; bizNo: string; ceo: string; address: string; phone: string; isDefault: boolean };

const COPIES = ['공급자용', '공급받는자용', '회수용'] as const;
type Copy = (typeof COPIES)[number];

// A4 가로(297×210mm)를 좌우 3칸으로 나눈다: 한 칸 99×210mm. 한 칸에 품목은 최대 5줄, 넘으면 다음 장으로 이어서 출력한다.
const MAX_LINES = 5;
const ROWS_MM = 47; // 품목 줄이 쓸 수 있는 높이(mm)
const INNER_MM = 90.8; // 한 칸 안쪽 너비(mm)
// 품목 개수별 크기: 1~2개는 사진을 크게(사진 왼쪽, 품명·수량 오른쪽), 3개 이상은 한 줄로 compact
const GEOM: Record<number, { photo: number; name: number; qty: number; box: number; cap: number }> = {
  1: { photo: 36, name: 18, qty: 42, box: 10, cap: 44 },
  2: { photo: 21, name: 15, qty: 30, box: 8, cap: 28 },
  3: { photo: 13, name: 13, qty: 22, box: 7, cap: 20 },
  4: { photo: 9.5, name: 11.5, qty: 18, box: 6, cap: 16 },
  5: { photo: 8, name: 10.5, qty: 15, box: 5.5, cap: 12 },
};

// ───────── 보조 함수 ─────────
const WEEK = ['일', '월', '화', '수', '목', '금', '토'];
function dateLabel(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  const w = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${m}월 ${d}일(${WEEK[w]})`;
}
// 송장번호: 납품일(YYMMDD)-주문번호 끝 4자리. 회수용 장과 대조할 때 쓴다.
const invoiceNo = (o: PrintOrder) => `${o.deliveryDate.slice(2, 10).replace(/-/g, '')}-${o.id.slice(-4).toUpperCase()}`;
const fmt = (n: number) => n.toLocaleString('ko-KR');
function chunk<T>(a: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < a.length; i += n) out.push(a.slice(i, i + n));
  return out.length ? out : [[]];
}
// 제품 종류를 한눈에 구분하도록 품목 색을 쓴다 (WATER FIX 파랑, 적색 빨강, 제설제 초록 — 주문관리 화면과 같은 규칙)
function colorOf(name: string) {
  if (/water\s*fix/i.test(name)) return '#1e3a8a';
  if (/적색/.test(name)) return '#991b1b';
  if (/DHECO|제설/i.test(name)) return '#166534';
  return '#111111';
}
// 수량 글자 크기: 자리수가 많아도 주어진 너비(mm) 안에 들어가도록 줄인다 (1pt ≈ 0.353mm, 숫자 한 자 ≈ 0.6em)
function fitPt(text: string, availMm: number, maxPt: number) {
  const byWidth = availMm / (text.length * 0.6) / 0.353;
  return Math.max(9, Math.min(maxPt, byWidth));
}

// ───────── 인쇄용 스타일 ─────────
const CSS = `
@page { size: A4 landscape; margin: 0; }
.inv-preview { background:#e5e7eb; padding:16px; display:flex; flex-direction:column; align-items:flex-start; gap:16px; overflow-x:auto; }
.inv-sheet { flex:none; margin:0 auto; width:296.6mm; height:209.4mm; background:#fff; box-sizing:border-box; overflow:hidden; display:flex; box-shadow:0 1px 8px rgba(0,0,0,.3); }
.inv-slot { flex:1 1 0; min-width:0; height:100%; box-sizing:border-box; padding:4mm 4mm 3mm; border-right:0.35mm dashed #777; display:flex; flex-direction:column; color:#000; font-family:'Malgun Gothic','맑은 고딕','Apple SD Gothic Neo',sans-serif; position:relative; }
.inv-slot:last-child { border-right:none; }
.inv-cut { position:absolute; right:-1.6mm; top:1.5mm; font-size:8pt; color:#777; background:#fff; line-height:1; }
.inv-head { height:9mm; display:flex; align-items:center; justify-content:space-between; }
.inv-title { font-size:15pt; font-weight:900; letter-spacing:1mm; white-space:nowrap; }
.inv-copy { background:#000; color:#fff; font-size:11pt; font-weight:900; padding:1mm 3mm; border-radius:1mm; white-space:nowrap; }
.inv-copy.c1 { background:#facc15; color:#000; box-shadow:inset 0 0 0 0.35mm #000; }
.inv-copy.c2 { background:#7dd3fc; color:#000; box-shadow:inset 0 0 0 0.35mm #000; }
.inv-sub { height:5mm; display:flex; align-items:center; gap:2mm; font-size:8.5pt; font-weight:700; }
.inv-reprint { margin-left:auto; color:#c00; border:0.5mm solid #c00; font-size:9pt; font-weight:900; padding:0 2mm; border-radius:1mm; }
.inv-when { height:13mm; display:flex; gap:2mm; margin-top:1mm; }
.inv-box { border:0.4mm solid #000; border-radius:1mm; padding:0.5mm 2.5mm; display:flex; flex-direction:column; justify-content:center; box-sizing:border-box; }
.inv-box.date { flex:55; } .inv-box.time { flex:45; border-width:0.8mm; }
.inv-lab { font-size:6.8pt; font-weight:700; color:#444; line-height:1.1; }
.inv-date { font-size:13.5pt; font-weight:900; line-height:1.15; white-space:nowrap; }
.inv-time { font-size:21pt; font-weight:900; line-height:1.05; }
.inv-wing { height:8mm; margin-top:1mm; border-radius:1mm; display:flex; align-items:center; justify-content:center; font-weight:900; box-sizing:border-box; }
.inv-wing.on { background:#c00; color:#fff; font-size:13pt; letter-spacing:0.4mm; }
.inv-wing.off { border:0.3mm solid #999; color:#555; font-size:9pt; }
.inv-party { border:0.3mm solid #000; border-radius:1mm; padding:1mm 2mm; overflow:hidden; position:relative; margin-top:1.5mm; box-sizing:border-box; }
.inv-party.to { height:31mm; } .inv-party.from { height:21mm; }
.inv-ptag { position:absolute; right:0; top:0; background:#000; color:#fff; font-size:6.5pt; font-weight:700; padding:0 1.6mm; border-bottom-left-radius:1mm; }
.inv-dest { flex:1; min-width:0; font-weight:900; line-height:1.2; overflow:hidden; display:-webkit-box; -webkit-box-orient:vertical; }
.inv-ptag.yel { background:#facc15; color:#000; box-shadow:inset 0 0 0 0.3mm #000; }
.inv-prow { display:flex; align-items:center; gap:1.5mm; min-height:5.5mm; }
.inv-prow.top { align-items:flex-start; margin-top:0.4mm; }
.inv-pill { flex:none; font-size:7pt; font-weight:900; background:#e5e7eb; border:0.25mm solid #777; border-radius:0.8mm; padding:0 1.4mm; line-height:1.55; white-space:nowrap; }
.inv-pill.dark { background:#000; color:#fff; border-color:#000; }
.inv-branch { font-size:12.5pt; font-weight:900; line-height:1.2; white-space:nowrap; }
.inv-contact { font-size:9pt; font-weight:600; color:#333; white-space:nowrap; }
.inv-sm { font-size:8.5pt; line-height:1.25; }
.inv-clamp { display:-webkit-box; -webkit-box-orient:vertical; overflow:hidden; }
.inv-sup-name { font-size:11pt; font-weight:900; padding-right:14mm; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.inv-listlab { height:6mm; margin-top:1mm; display:flex; align-items:flex-end; justify-content:space-between; font-size:8.5pt; font-weight:900; }
.inv-listlab small { font-size:6.8pt; font-weight:600; color:#555; }
.inv-rows { flex:1; min-height:0; margin-top:0.6mm; }
.inv-row { display:flex; align-items:center; border-left:1.8mm solid #111; padding-left:2mm; border-bottom:0.2mm solid #bbb; box-sizing:border-box; overflow:hidden; }
.inv-photo { flex:none; border:0.3mm solid #999; border-radius:0.8mm; overflow:hidden; background:#f1f1f1; display:flex; align-items:center; justify-content:center; }
.inv-photo img { width:100%; height:100%; object-fit:cover; }
.inv-nophoto { font-size:6.5pt; color:#777; text-align:center; line-height:1.1; }
.inv-iname { font-weight:900; line-height:1.2; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
.inv-row.compact .inv-iname { flex:1; min-width:0; padding:0 1.5mm; }
.inv-rcol { flex:1; min-width:0; align-self:stretch; display:flex; flex-direction:column; justify-content:space-between; padding:1mm 0 1mm 2.5mm; }
.inv-qrow { display:flex; align-items:flex-end; justify-content:space-between; gap:2mm; }
.inv-qty { font-weight:900; line-height:1; white-space:nowrap; text-align:right; }
.inv-row.compact .inv-qty { flex:none; padding-right:1.5mm; }
.inv-qty span { font-size:0.42em; margin-left:0.8mm; font-weight:800; }
.inv-chk { flex:none; border:0.6mm solid #000; box-sizing:border-box; }
.inv-row.compact .inv-chk { margin-right:1mm; }
.inv-foot { margin-top:1.5mm; }
.inv-memo { height:22mm; border:0.4mm solid #000; border-radius:1mm; padding:1mm 2mm; overflow:hidden; box-sizing:border-box; }
.inv-memo b { font-size:7pt; background:#000; color:#fff; padding:0 1.4mm; border-radius:0.6mm; margin-right:1.2mm; vertical-align:1px; }
.inv-memotext { font-size:9.5pt; font-weight:800; line-height:1.2; display:-webkit-box; -webkit-line-clamp:4; -webkit-box-orient:vertical; overflow:hidden; }
.inv-sign { height:28mm; margin-top:1.5mm; border:0.3mm solid #000; border-radius:1mm; padding:0.8mm 2mm; font-size:8.5pt; line-height:1.55; overflow:hidden; box-sizing:border-box; }
.inv-sign.strong { border-width:0.6mm; }
.inv-sign .note { font-size:7pt; color:#444; line-height:1.3; }
.inv-line { display:inline-block; border-bottom:0.25mm solid #000; min-width:20mm; height:3.6mm; vertical-align:bottom; }
@media print {
  html, body { margin:0 !important; padding:0 !important; background:#fff !important; }
  header, .inv-noprint, [data-sonner-toaster] { display:none !important; }
  main { padding:0 !important; }
  .inv-preview { background:#fff; padding:0; display:block; gap:0; overflow:visible; }
  .inv-sheet { box-shadow:none; margin:0; break-after:page; page-break-after:always; }
  .inv-sheet:last-child { break-after:auto; page-break-after:auto; }
  * { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
}
`;

// ───────── 품목 한 줄 ─────────
function ItemRow({ line, n, rowH }: { line: Line; n: number; rowH: number }) {
  const g = GEOM[n];
  const color = colorOf(line.itemName);
  const qty = fmt(line.quantity);
  const photo = (
    <div className="inv-photo" style={{ width: `${g.photo}mm`, height: `${g.photo}mm` }}>
      {line.imageUrl ? <img src={line.imageUrl} alt={line.itemName} /> : <div className="inv-nophoto">사진<br />없음</div>}
    </div>
  );
  if (n <= 2) {
    // 사진 왼쪽 / 오른쪽 위 품명, 오른쪽 아래 수량(크게)+상차확인 칸
    const textW = INNER_MM - 1.8 - 2 - g.photo - 2.5;
    const qtyPt = fitPt(qty, textW - g.box - 12, g.qty);
    return (
      <div className="inv-row" style={{ height: `${rowH}mm`, borderLeftColor: color }}>
        {photo}
        <div className="inv-rcol">
          <div className="inv-iname" style={{ fontSize: `${g.name}pt`, color }}>{line.itemName}</div>
          <div className="inv-qrow">
            <div className="inv-qty" style={{ fontSize: `${qtyPt}pt` }}>{qty}<span>포</span></div>
            <div className="inv-chk" style={{ width: `${g.box}mm`, height: `${g.box}mm` }} />
          </div>
        </div>
      </div>
    );
  }
  // 3개 이상: 사진 · 품명 · 수량 · 확인칸을 한 줄에
  const qtyW = Math.max(14, qty.length * g.qty * 0.6 * 0.353 + 6);
  return (
    <div className="inv-row compact" style={{ height: `${rowH}mm`, borderLeftColor: color }}>
      {photo}
      <div className="inv-iname" style={{ fontSize: `${g.name}pt`, color }}>{line.itemName}</div>
      <div className="inv-qty" style={{ fontSize: `${fitPt(qty, qtyW, g.qty)}pt` }}>{qty}<span>포</span></div>
      <div className="inv-chk" style={{ width: `${g.box}mm`, height: `${g.box}mm` }} />
    </div>
  );
}

// ───────── 한 칸(공급자용/공급받는자용/회수용 중 하나) ─────────
function Slot({
  order, lines, supplier, copy, pageNo, pageTotal, reprint,
}: {
  order: PrintOrder; lines: Line[]; supplier: Supplier; copy: Copy; pageNo: number; pageTotal: number; reprint: boolean;
}) {
  const n = Math.max(1, Math.min(lines.length, MAX_LINES));
  const g = GEOM[n];
  const rowH = Math.min(g.cap, ROWS_MM / n);
  const totalBags = order.items.reduce((s, i) => s + (i.quantity || 0), 0);
  // 하차지 이름 길이에 따라 글자 크기를 조절 (짧으면 크게, 길면 줄여서 2줄 안에)
  const destLen = (order.destination || '').length;
  const destPt = destLen <= 9 ? 15 : destLen <= 14 ? 13 : destLen <= 20 ? 11.5 : 10;

  return (
    <div className="inv-slot">
      <div className="inv-head">
        <span className="inv-title">출 고 지 시 서</span>
        <span className={`inv-copy c${COPIES.indexOf(copy)}`}>{copy}</span>
      </div>
      <div className="inv-sub">
        <span>No. {invoiceNo(order)}</span>
        {pageTotal > 1 && <span>({pageNo}/{pageTotal}쪽)</span>}
        {reprint && <span className="inv-reprint">재발행</span>}
      </div>

      <div className="inv-when">
        <div className="inv-box date"><span className="inv-lab">납품일</span><span className="inv-date">{dateLabel(order.deliveryDate)}</span></div>
        <div className="inv-box time"><span className="inv-lab">도착시간</span><span className="inv-time">{order.arrivalTime || '--:--'}</span></div>
      </div>
      {order.isWingCarRestricted ? <div className="inv-wing on">⚠ 윙카 불가</div> : <div className="inv-wing off">윙카 가능</div>}

      <div className="inv-party to">
        <span className="inv-ptag yel">공급받는자</span>
        <div className="inv-prow" style={{ paddingRight: '16mm' }}>
          <span className="inv-pill">지점</span>
          <span className="inv-branch">{order.branchName || '-'}</span>
          {order.contactName && order.contactName !== order.branchName && <span className="inv-contact">{order.contactName}</span>}
        </div>
        <div className="inv-prow top">
          <span className="inv-pill dark">하차지</span>
          <div className="inv-dest" style={{ fontSize: `${destPt}pt`, WebkitLineClamp: 2 }}>{order.destination || '-'}</div>
        </div>
        <div className="inv-sm inv-clamp" style={{ WebkitLineClamp: 2 }}>{order.address || '-'}</div>
        <div className="inv-sm" style={{ fontWeight: 800 }}>☎ {order.phoneNumber || '-'}</div>
      </div>
      <div className="inv-party from">
        <span className="inv-ptag">공급자</span>
        <div className="inv-sup-name">{supplier.name}</div>
        <div className="inv-sm">{supplier.bizNo ? `사업자 ${supplier.bizNo}` : ' '}</div>
        <div className="inv-sm inv-clamp" style={{ WebkitLineClamp: 2 }}>{supplier.address || ' '}</div>
        <div className="inv-sm">{[supplier.ceo && `대표 ${supplier.ceo}`, supplier.phone && `☎ ${supplier.phone}`].filter(Boolean).join('  ') || ' '}</div>
      </div>

      <div className="inv-listlab">
        <span>상차 품목 (총 {order.items.length}종 / {fmt(totalBags)}포)</span>
        <small>확인하며 상차 → ☑</small>
      </div>
      <div className="inv-rows">
        {lines.map((l, i) => <ItemRow key={i} line={l} n={n} rowH={rowH} />)}
      </div>

      <div className="inv-foot">
        <div className="inv-memo">
          <div className="inv-memotext"><b>특이사항</b>{order.memo?.trim() || '-'}</div>
        </div>
        {copy === '회수용' ? (
          <div className="inv-sign strong">
            <div><b>인수자 서명</b> <span className="inv-line" style={{ minWidth: '36mm' }} /> (인)</div>
            <div><b>인수일시</b> <span className="inv-line" style={{ minWidth: '5mm' }} />월 <span className="inv-line" style={{ minWidth: '5mm' }} />일 <span className="inv-line" style={{ minWidth: '5mm' }} />시 <span className="inv-line" style={{ minWidth: '5mm' }} />분</div>
            <div>□ 품목·수량 이상 없음　□ 이상 있음</div>
            <div>사유 <span className="inv-line" style={{ minWidth: '52mm' }} /></div>
            <div className="note">※ 서명 후 이 장을 회수하여 본사로 제출</div>
          </div>
        ) : (
          <div className="inv-sign">
            <div><b>상차확인자</b> <span className="inv-line" style={{ minWidth: '38mm' }} /></div>
            <div><b>차량번호</b> <span className="inv-line" style={{ minWidth: '40mm' }} /></div>
            <div><b>출고일시</b> <span className="inv-line" style={{ minWidth: '5mm' }} />월 <span className="inv-line" style={{ minWidth: '5mm' }} />일 <span className="inv-line" style={{ minWidth: '5mm' }} />시 <span className="inv-line" style={{ minWidth: '5mm' }} />분</div>
            <div className="note">{copy === '공급자용' ? '※ 본사 보관용' : '※ 거래처(받는 곳) 보관용'}</div>
          </div>
        )}
      </div>
      {copy !== '회수용' && <span className="inv-cut inv-noprint">✂</span>}
    </div>
  );
}

// ───────── 화면 ─────────
function PrintInner() {
  const params = useSearchParams();
  const { status, data: session } = useSession();
  const ids = useMemo(() => (params?.get('ids') || '').split(',').map((s) => s.trim()).filter(Boolean), [params]);
  const [orders, setOrders] = useState<PrintOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierId, setSupplierId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [sessionPrints, setSessionPrints] = useState(0);

  const isAdmin = status === 'authenticated' && session?.user?.role === 'ADMIN';

  useEffect(() => {
    if (status !== 'authenticated') return;
    if (!isAdmin) { setLoading(false); return; }
    if (ids.length === 0) { setError('출력할 주문이 선택되지 않았습니다.'); setLoading(false); return; }
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/invoices/data?ids=${encodeURIComponent(ids.join(','))}`, { cache: 'no-store' });
        const json = await res.json();
        if (!alive) return;
        if (!res.ok || !json?.success) { setError(json?.error || '송장 자료를 불러오지 못했습니다.'); return; }
        setOrders(json.orders);
        setSuppliers(json.suppliers);
        let saved = '';
        try { saved = localStorage.getItem('invoiceSupplierId') || ''; } catch { /* 저장소를 못 써도 무시 */ }
        const pick = json.suppliers.find((s: Supplier) => s.id === saved) || json.suppliers.find((s: Supplier) => s.isDefault) || json.suppliers[0];
        setSupplierId(pick?.id || '');
      } catch {
        if (alive) setError('송장 자료를 불러오지 못했습니다.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [status, isAdmin, ids]);

  const supplier = suppliers.find((s) => s.id === supplierId) || null;
  const sheets = useMemo(() => orders.flatMap((o) => {
    const parts = chunk(o.items, MAX_LINES);
    return parts.map((lines, i) => ({ order: o, lines, pageNo: i + 1, pageTotal: parts.length }));
  }), [orders]);
  const reprintedOrders = orders.filter((o) => o.printCount > 0);

  const onPrint = useCallback(async () => {
    if (!supplier || orders.length === 0) return;
    try {
      await fetch('/api/invoices/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds: orders.map((o) => o.id), supplierId: supplier.id }),
      });
    } catch { /* 기록에 실패해도 출력은 진행 */ }
    // 사진이 모두 불러와진 뒤에 인쇄 창을 연다
    await Promise.all(Array.from(document.images).map((img) => (img.complete ? null : new Promise((r) => { img.onload = img.onerror = () => r(null); }))));
    window.print();
    setSessionPrints((n) => n + 1);
  }, [supplier, orders]);

  if (status === 'loading' || (status === 'authenticated' && loading)) {
    return <div className="p-8 text-sm text-gray-500">불러오는 중...</div>;
  }
  if (status !== 'authenticated') {
    return <div className="p-8 text-sm text-gray-600">로그인이 필요합니다. <Link href="/login" className="text-blue-700 underline">로그인</Link></div>;
  }
  if (!isAdmin) {
    return <div className="p-8 text-sm text-red-600">송장 출력은 본사·관리자만 할 수 있습니다.</div>;
  }

  return (
    <div>
      <style>{CSS}</style>

      <div className="inv-noprint border-b bg-white px-4 py-3 shadow-sm">
        <div className="container mx-auto flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="text-base font-bold text-gray-800">송장(출고지시서) 미리보기</div>
          {orders.length > 0 && <div className="text-sm text-gray-600">주문 {orders.length}건 · A4 가로 {sheets.length}장 (장당 3부)</div>}
          <div className="flex items-center gap-2 text-sm">
            <label htmlFor="inv-supplier" className="font-medium text-gray-700">공급자</label>
            <select
              id="inv-supplier"
              value={supplierId}
              onChange={(e) => { setSupplierId(e.target.value); try { localStorage.setItem('invoiceSupplierId', e.target.value); } catch { /* 무시 */ } }}
              className="h-9 rounded-md border border-gray-300 bg-white px-2"
              disabled={suppliers.length === 0}
            >
              {suppliers.length === 0 && <option value="">등록된 공급자 없음</option>}
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}{s.isDefault ? ' (기본)' : ''}</option>)}
            </select>
            <Link href="/admin" className="text-xs text-blue-700 underline" target="_blank">공급자 관리</Link>
          </div>
          <button
            type="button"
            onClick={onPrint}
            disabled={!supplier || orders.length === 0}
            className="ml-auto inline-flex h-9 items-center gap-1 rounded-md bg-gray-900 px-4 text-sm font-semibold text-white disabled:opacity-40"
          >
            <Printer className="h-4 w-4" /> 인쇄
          </button>
        </div>
        <div className="container mx-auto mt-2 space-y-1 text-xs">
          {error && <div className="rounded border border-red-200 bg-red-50 px-3 py-1.5 text-red-600">{error}</div>}
          {!error && suppliers.length === 0 && (
            <div className="rounded border border-amber-300 bg-amber-50 px-3 py-1.5 text-amber-800">
              등록된 공급자가 없습니다. 관리자 메뉴의 <b>공급자 관리</b>에서 먼저 공급자를 등록해 주세요.
            </div>
          )}
          {reprintedOrders.length > 0 && (
            <div className="rounded border border-red-200 bg-red-50 px-3 py-1.5 text-red-700">
              이미 출력한 주문이 {reprintedOrders.length}건 있습니다. 이 송장에는 <b>재발행</b> 표시가 찍히니, 이전에 뽑은 송장과 중복 상차되지 않게 해 주세요.
              {reprintedOrders.slice(0, 3).map((o) => (
                <span key={o.id} className="ml-2 text-red-600">[{o.destination} {o.printCount}회{o.lastPrintedBy ? ` · 마지막 ${o.lastPrintedBy}` : ''}]</span>
              ))}
            </div>
          )}
          <div className="text-gray-500">
            인쇄 창에서 <b>용지 A4 · 가로 방향 · 배율 100% · 여백 없음(기본값) · 머리글/바닥글 끄기</b>로 출력하세요. 한 장을 세로 점선(✂)에서 3등분해 쓰면 됩니다.
          </div>
        </div>
      </div>

      {supplier && sheets.length > 0 && (
        <div className="inv-preview">
          {sheets.map((s, si) => (
            <div key={`${s.order.id}-${s.pageNo}`} className="inv-sheet" data-sheet={si}>
              {COPIES.map((c) => (
                <Slot
                  key={c}
                  order={s.order}
                  lines={s.lines}
                  supplier={supplier}
                  copy={c}
                  pageNo={s.pageNo}
                  pageTotal={s.pageTotal}
                  reprint={s.order.printCount + sessionPrints > 0}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function InvoicePrintPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-gray-500">불러오는 중...</div>}>
      <PrintInner />
    </Suspense>
  );
}
