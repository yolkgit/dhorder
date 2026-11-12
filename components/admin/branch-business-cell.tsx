'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type Business = { bizName: string; bizNo: string; ceo: string; address: string; phone: string };
const EMPTY: Business = { bizName: '', bizNo: '', ceo: '', address: '', phone: '' };

const FIELDS: { key: keyof Business; label: string; placeholder: string; max: number }[] = [
  { key: 'bizName', label: '사업자명(상호) *', placeholder: '예) (주)대성건재', max: 40 },
  { key: 'bizNo', label: '사업자등록번호', placeholder: '000-00-00000', max: 20 },
  { key: 'ceo', label: '대표자', placeholder: '', max: 20 },
  { key: 'address', label: '사업장 주소', placeholder: '', max: 100 },
  { key: 'phone', label: '전화', placeholder: '000-0000-0000', max: 30 },
];

// ── 회원 표 전체가 함께 쓰는 작은 저장소: 사업자 정보를 한 번만 불러와 모든 줄에서 공유한다 ──
let store: { map: Record<string, Business>; loaded: boolean } = { map: {}, loaded: false };
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

function ensureLoaded() {
  if (store.loaded || loading) return;
  loading = fetch('/api/branch-business', { cache: 'no-store' })
    .then((r) => r.json())
    .then((json) => {
      if (json?.success) store = { map: json.map || {}, loaded: true };
    })
    .catch(() => undefined)
    .finally(() => {
      loading = null;
      notify();
    });
}

function useBusinessStore() {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    ensureLoaded();
    return () => { listeners.delete(l); };
  }, []);
  return store;
}

// 관리자 > 회원관리 표의 '사업자 정보' 칸: 등록된 사업자명을 보여주고, 누르면 입력·수정 창이 열린다
export function BranchBusinessCell({ userId, userLabel }: { userId: string; userLabel: string }) {
  const { map, loaded } = useBusinessStore();
  const cur = map[userId];
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Business>(EMPTY);
  const [saving, setSaving] = useState(false);

  const openEdit = () => { setForm(cur ? { ...cur } : EMPTY); setOpen(true); };

  const save = async () => {
    const anyValue = Object.values(form).some((v) => v.trim());
    if (anyValue && !form.bizName.trim()) { toast.error('사업자명을 입력해 주세요.'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/branch-business', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...form }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.success) throw new Error(json?.error || '사업자 정보를 저장하지 못했습니다.');
      const next = { ...store.map };
      if (json.business) next[userId] = json.business; else delete next[userId];
      store = { map: next, loaded: true };
      notify();
      toast.success(json.business ? '사업자 정보가 저장되었습니다.' : '사업자 정보를 삭제했습니다.');
      setOpen(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <div className="min-w-0">
          {!loaded ? (
            <span className="text-xs text-gray-400">...</span>
          ) : cur ? (
            <>
              <div className="truncate text-sm font-medium" title={cur.bizName}>{cur.bizName}</div>
              {cur.bizNo && <div className="text-xs text-gray-500">{cur.bizNo}</div>}
            </>
          ) : (
            <span className="text-xs text-gray-400">미등록</span>
          )}
        </div>
        <Button variant="outline" size="sm" className="h-7 shrink-0 px-2 text-xs" onClick={openEdit} disabled={!loaded}>
          {cur ? '수정' : '입력'}
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader><DialogTitle>사업자 정보 — {userLabel}</DialogTitle></DialogHeader>
          <p className="text-xs text-gray-500">송장(출고지시서)의 공급받는자에 사업자명과 사업자번호가 표시됩니다. 모두 비우고 저장하면 등록이 삭제됩니다.</p>
          <div className="grid gap-3 py-2">
            {FIELDS.map((f) => (
              <div key={f.key} className="grid gap-1">
                <label htmlFor={`biz-${userId}-${f.key}`} className="text-sm font-medium">{f.label}</label>
                <Input
                  id={`biz-${userId}-${f.key}`}
                  value={form[f.key]}
                  maxLength={f.max}
                  placeholder={f.placeholder}
                  onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>취소</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />저장 중...</> : '저장'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
