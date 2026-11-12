// 지점(회원)별 사업자 정보 보관: ~/dhorder/data/branch-business.json  ({ 회원ID: 사업자 정보 })
// 송장(출고지시서)의 '공급받는자'에 사업자명을 찍기 위한 정보다. DB 구조를 바꾸지 않고 파일로 저장한다.
import { promises as fs } from 'fs';
import path from 'path';

export type BranchBusiness = {
  bizName: string; // 사업자명(상호)
  bizNo: string; // 사업자등록번호
  ceo: string; // 대표자
  address: string; // 사업장 주소
  phone: string; // 전화
};

const FILE = path.join(process.cwd(), 'data', 'branch-business.json');
const LIMITS: Record<keyof BranchBusiness, number> = { bizName: 40, bizNo: 20, ceo: 20, address: 100, phone: 30 };
const LABELS: Record<keyof BranchBusiness, string> = { bizName: '사업자명', bizNo: '사업자등록번호', ceo: '대표자', address: '주소', phone: '전화' };

// 동시에 저장 요청이 와도 한 번에 하나씩 처리 (읽고-고치고-쓰기가 섞이지 않게)
let queue: Promise<unknown> = Promise.resolve();
function serial<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => undefined);
  return run;
}

async function readAll(): Promise<Record<string, BranchBusiness>> {
  try {
    const raw = JSON.parse(await fs.readFile(FILE, 'utf8'));
    const out: Record<string, BranchBusiness> = {};
    if (raw && typeof raw === 'object') {
      for (const [id, v] of Object.entries<any>(raw)) {
        if (v && typeof v.bizName === 'string' && v.bizName) {
          out[id] = { bizName: v.bizName, bizNo: String(v.bizNo || ''), ceo: String(v.ceo || ''), address: String(v.address || ''), phone: String(v.phone || '') };
        }
      }
    }
    return out;
  } catch {
    return {};
  }
}

async function writeAll(map: Record<string, BranchBusiness>) {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  const tmp = `${FILE}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(map, null, 2), 'utf8');
  await fs.rename(tmp, FILE);
}

// 입력값 검사·정리. 모두 비어 있으면 { empty: true } (= 등록 삭제), 하나라도 있으면 사업자명이 필요하다.
export function cleanBranchBusiness(raw: any): { ok: true; empty: boolean; value: BranchBusiness } | { ok: false; error: string } {
  const out = {} as BranchBusiness;
  for (const key of Object.keys(LIMITS) as (keyof BranchBusiness)[]) {
    const v = String(raw?.[key] ?? '').trim();
    if (v.length > LIMITS[key]) return { ok: false, error: `${LABELS[key]}은(는) ${LIMITS[key]}자 이내로 입력해 주세요.` };
    out[key] = v;
  }
  const empty = Object.values(out).every((v) => !v);
  if (!empty && !out.bizName) return { ok: false, error: '사업자명을 입력해 주세요.' };
  return { ok: true, empty, value: out };
}

export const getAllBranchBusiness = () => serial(readAll);

// value 가 null 이면 해당 회원의 등록을 지운다
export function setBranchBusiness(userId: string, value: BranchBusiness | null): Promise<void> {
  return serial(async () => {
    const map = await readAll();
    if (value) map[userId] = value;
    else delete map[userId];
    await writeAll(map);
  });
}

export const removeBranchBusiness = (userId: string) => setBranchBusiness(userId, null);
