'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Loader2, Package, RefreshCw, Warehouse } from 'lucide-react';
import { Button } from './button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './dialog';

type StockItem = {
  name: string;
  unit: string;
  stock: number;
  prod_today: number;
  sale_today: number;
  imageUrl: string | null;
};
type StockData = {
  date: string;
  synced_at: string;
  sync_error?: string;
  sync?: { ok: boolean } | null;
  items: StockItem[];
};

const fmt = (n: number) => n.toLocaleString('ko-KR');

// 헤더의 '재고확인' 버튼과, 누르면 열리는 제품별 금일재고 창 (생산일보 기준, 품목 사진 표시)
export function StockModal() {
  const { status, data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<StockData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/stock', { cache: 'no-store' });
      const json = await res.json();
      if (res.ok && json?.ok) setData(json);
      else setError(json?.error || '재고를 불러오지 못했습니다.');
    } catch {
      setError('재고를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  // 창을 열 때마다 최신 값을 가져온다
  useEffect(() => {
    if (open) load();
  }, [open, load]);

  // 본사·관리자(ADMIN)에게만 보인다 (서버 /api/stock 도 같은 조건으로 막혀 있음)
  if (status !== 'authenticated' || session?.user?.role !== 'ADMIN') return null;

  const md = data ? data.date.slice(5).replace('-', '/') : '';
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="flex items-center h-10 sm:h-9">
        <Warehouse className="h-4 w-4 sm:mr-1" />
        <span className="sm:hidden ml-1">재고</span>
        <span className="hidden sm:inline">재고확인</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent aria-describedby={undefined} className="max-h-[88vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-x-2">
              금일 재고 확인
              {data && (
                <span className="text-xs font-normal text-gray-500">
                  {md} 생산일보 기준{data.synced_at ? ` · 오더 반영 ${data.synced_at.slice(11, 16)}` : ''}
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={load}
                disabled={loading}
                className="ml-auto mr-6 h-7 px-2 text-xs text-gray-600"
                title="다시 불러오기"
              >
                <RefreshCw className={`mr-1 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                새로고침
              </Button>
            </DialogTitle>
          </DialogHeader>

          {!data && loading && (
            <div className="flex items-center justify-center py-16 text-gray-500">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              불러오는 중...
            </div>
          )}

          {error && (
            <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
              {data ? ' (이전에 불러온 값을 표시 중입니다)' : ''}
            </div>
          )}

          {data && (data.sync_error || (data.sync && !data.sync.ok)) && (
            <div className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              최신 오더를 불러오지 못해, 마지막으로 반영된 시각{data.synced_at ? `(${data.synced_at.slice(11, 16)})` : ''} 기준 재고입니다.
            </div>
          )}

          {data && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {data.items.map((it) => (
                <div
                  key={it.name}
                  className="flex flex-col overflow-hidden rounded-lg border bg-white"
                  title={`${it.name} (${it.unit}) · 금일 생산 ${fmt(it.prod_today)} / 판매 ${fmt(it.sale_today)}`}
                >
                  <div className="flex aspect-square items-center justify-center overflow-hidden bg-gray-100">
                    {it.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={it.imageUrl} alt={it.name} loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <Package className="h-8 w-8 text-gray-300" />
                    )}
                  </div>
                  <div className="p-2 text-center">
                    <div className="truncate text-sm font-medium text-gray-800">{it.name}</div>
                    <div className="text-xs text-gray-400">{it.unit}</div>
                    <div
                      className={`mt-1 text-xl font-bold ${
                        it.stock < 0 ? 'text-red-600' : it.stock === 0 ? 'text-gray-400' : 'text-gray-900'
                      }`}
                    >
                      {fmt(it.stock)}
                    </div>
                    <div className="text-[11px] text-gray-400">
                      금일 생산 {fmt(it.prod_today)} · 판매 {fmt(it.sale_today)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
