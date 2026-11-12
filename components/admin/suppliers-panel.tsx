'use client';

import { useCallback, useEffect, useState } from 'react';
import { Edit, Loader2, Plus, Star, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type Supplier = { id: string; name: string; bizNo: string; ceo: string; address: string; phone: string; isDefault: boolean };
type Form = { name: string; bizNo: string; ceo: string; address: string; phone: string };
const EMPTY: Form = { name: '', bizNo: '', ceo: '', address: '', phone: '' };

const FIELDS: { key: keyof Form; label: string; placeholder: string; max: number }[] = [
  { key: 'name', label: '상호 *', placeholder: '예) 다현산업', max: 40 },
  { key: 'bizNo', label: '사업자등록번호', placeholder: '000-00-00000', max: 20 },
  { key: 'ceo', label: '대표자', placeholder: '', max: 20 },
  { key: 'address', label: '주소', placeholder: '', max: 100 },
  { key: 'phone', label: '전화', placeholder: '000-0000-0000', max: 30 },
];

// 관리자 메뉴 > 공급자 관리: 송장(출고지시서)에 찍을 공급자 정보를 여러 개 등록하고, 출력할 때 골라서 쓴다
export function SuppliersPanel() {
  const [list, setList] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/suppliers', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.error || '공급자 목록을 불러오지 못했습니다.');
      setList(json.suppliers);
    } catch (e: any) {
      toast.error(e.message || '공급자 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditId(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (s: Supplier) => {
    setEditId(s.id);
    setForm({ name: s.name, bizNo: s.bizNo, ceo: s.ceo, address: s.address, phone: s.phone });
    setOpen(true);
  };

  const call = async (method: string, body?: object, query = '') => {
    const res = await fetch(`/api/suppliers${query}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json?.success) throw new Error(json?.error || '처리하지 못했습니다.');
    return json;
  };

  const save = async () => {
    if (!form.name.trim()) { toast.error('상호를 입력해 주세요.'); return; }
    setSaving(true);
    try {
      if (editId) await call('PUT', { id: editId, ...form });
      else await call('POST', form);
      toast.success(editId ? '공급자가 수정되었습니다.' : '공급자가 추가되었습니다.');
      setOpen(false);
      await load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const makeDefault = async (s: Supplier) => {
    try { await call('PUT', { id: s.id, setDefault: true }); toast.success(`"${s.name}"을(를) 기본 공급자로 지정했습니다.`); await load(); }
    catch (e: any) { toast.error(e.message); }
  };

  const remove = async (s: Supplier) => {
    if (!confirm(`"${s.name}" 공급자를 삭제하시겠습니까?`)) return;
    try { await call('DELETE', undefined, `?id=${encodeURIComponent(s.id)}`); toast.success('삭제되었습니다.'); await load(); }
    catch (e: any) { toast.error(e.message); }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>공급자 관리</CardTitle>
          <p className="mt-1 text-sm text-gray-500">송장(출고지시서)에 찍을 공급자 정보입니다. 여러 개를 등록해 두고 출력할 때 선택합니다.</p>
        </div>
        <Button onClick={openAdd} className="flex items-center"><Plus className="mr-1 h-4 w-4" />공급자 추가</Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-gray-500" /></div>
        ) : list.length === 0 ? (
          <div className="py-8 text-center text-gray-500">등록된 공급자가 없습니다. 「공급자 추가」로 먼저 등록해 주세요.</div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[170px]">상호</TableHead>
                  <TableHead className="w-[140px]">사업자번호</TableHead>
                  <TableHead className="w-[90px]">대표자</TableHead>
                  <TableHead>주소</TableHead>
                  <TableHead className="w-[130px]">전화</TableHead>
                  <TableHead className="w-[150px] text-right">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">
                      {s.name}
                      {s.isDefault && <span className="ml-2 rounded-full bg-yellow-100 px-1.5 py-0.5 text-xs text-yellow-800">기본</span>}
                    </TableCell>
                    <TableCell>{s.bizNo || '-'}</TableCell>
                    <TableCell>{s.ceo || '-'}</TableCell>
                    <TableCell>{s.address || '-'}</TableCell>
                    <TableCell>{s.phone || '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" title="기본 공급자로 지정" disabled={s.isDefault} onClick={() => makeDefault(s)}>
                          <Star className={`h-4 w-4 ${s.isDefault ? 'fill-yellow-400 text-yellow-500' : ''}`} />
                        </Button>
                        <Button variant="ghost" size="icon" title="수정" onClick={() => openEdit(s)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" title="삭제" onClick={() => remove(s)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader><DialogTitle>{editId ? '공급자 수정' : '공급자 추가'}</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-2">
            {FIELDS.map((f) => (
              <div key={f.key} className="grid gap-1">
                <label htmlFor={`sup-${f.key}`} className="text-sm font-medium">{f.label}</label>
                <Input
                  id={`sup-${f.key}`}
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
    </Card>
  );
}
