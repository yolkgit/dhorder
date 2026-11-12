// 송장(출고지시서)에 찍을 공급자 정보 보관: ~/dhorder/data/suppliers.json
// DB 구조를 바꾸지 않고 파일로 저장한다. (서버 홈 전체 백업에 함께 포함됨)
import { promises as fs } from 'fs';
import path from 'path';
import { randomBytes } from 'crypto';

export type Supplier = {
  id: string;
  name: string; // 상호
  bizNo: string; // 사업자등록번호
  ceo: string; // 대표자
  address: string;
  phone: string;
  isDefault: boolean;
};
export type SupplierInput = Pick<Supplier, 'name' | 'bizNo' | 'ceo' | 'address' | 'phone'>;

const FILE = path.join(process.cwd(), 'data', 'suppliers.json');
const LIMITS: Record<keyof SupplierInput, number> = { name: 40, bizNo: 20, ceo: 20, address: 100, phone: 30 };
const LABELS: Record<keyof SupplierInput, string> = { name: '상호', bizNo: '사업자번호', ceo: '대표자', address: '주소', phone: '전화' };

// 동시에 저장 요청이 와도 한 번에 하나씩 처리 (읽고-고치고-쓰기가 섞이지 않게)
let queue: Promise<unknown> = Promise.resolve();
function serial<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => undefined);
  return run;
}

const isSupplier = (v: any): v is Supplier =>
  v && typeof v.id === 'string' && typeof v.name === 'string' && v.name.length > 0;

async function readAll(): Promise<Supplier[]> {
  try {
    const raw = JSON.parse(await fs.readFile(FILE, 'utf8'));
    return Array.isArray(raw)
      ? raw.filter(isSupplier).map((s) => ({
          id: s.id,
          name: s.name,
          bizNo: String(s.bizNo || ''),
          ceo: String(s.ceo || ''),
          address: String(s.address || ''),
          phone: String(s.phone || ''),
          isDefault: !!s.isDefault,
        }))
      : [];
  } catch {
    return [];
  }
}

async function writeAll(list: Supplier[]) {
  // 기본 공급자는 항상 정확히 하나 (목록이 있으면)
  if (list.length > 0) {
    const first = list.findIndex((s) => s.isDefault);
    list.forEach((s, i) => (s.isDefault = i === (first === -1 ? 0 : first)));
  }
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  const tmp = `${FILE}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(list, null, 2), 'utf8');
  await fs.rename(tmp, FILE);
}

// 입력값 검사·정리 (앞뒤 공백 제거, 길이 제한)
export function cleanSupplierInput(raw: any): { ok: true; value: SupplierInput } | { ok: false; error: string } {
  const out = {} as SupplierInput;
  for (const key of Object.keys(LIMITS) as (keyof SupplierInput)[]) {
    const v = String(raw?.[key] ?? '').trim();
    if (v.length > LIMITS[key]) return { ok: false, error: `${LABELS[key]}은(는) ${LIMITS[key]}자 이내로 입력해 주세요.` };
    out[key] = v;
  }
  if (!out.name) return { ok: false, error: '상호를 입력해 주세요.' };
  return { ok: true, value: out };
}

export const listSuppliers = () => serial(readAll);

export function createSupplier(input: SupplierInput): Promise<Supplier> {
  return serial(async () => {
    const list = await readAll();
    if (list.some((s) => s.name === input.name)) throw new Error('이미 같은 상호의 공급자가 있습니다.');
    const created: Supplier = { id: 'sup_' + randomBytes(5).toString('hex'), ...input, isDefault: list.length === 0 };
    list.push(created);
    await writeAll(list);
    return created;
  });
}

export function updateSupplier(id: string, input: SupplierInput): Promise<Supplier | null> {
  return serial(async () => {
    const list = await readAll();
    const cur = list.find((s) => s.id === id);
    if (!cur) return null;
    if (list.some((s) => s.id !== id && s.name === input.name)) throw new Error('이미 같은 상호의 공급자가 있습니다.');
    Object.assign(cur, input);
    await writeAll(list);
    return cur;
  });
}

export function setDefaultSupplier(id: string): Promise<boolean> {
  return serial(async () => {
    const list = await readAll();
    if (!list.some((s) => s.id === id)) return false;
    list.forEach((s) => (s.isDefault = s.id === id));
    await writeAll(list);
    return true;
  });
}

export function deleteSupplier(id: string): Promise<boolean> {
  return serial(async () => {
    const list = await readAll();
    const next = list.filter((s) => s.id !== id);
    if (next.length === list.length) return false;
    await writeAll(next);
    return true;
  });
}
