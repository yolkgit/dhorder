// 공급자 법인 도장(직인) 이미지 보관: ~/dhorder/data/supplier-stamps/<공급자ID>.png
// 투명 배경이 유지되도록 PNG로 저장한다. 도장은 민감하므로 보기도 본사·관리자(ADMIN)만 허용한다.
import { promises as fs } from 'fs';
import path from 'path';

export const STAMP_DIR = path.join(process.cwd(), 'data', 'supplier-stamps');
export const MAX_STAMP_BYTES = 300 * 1024; // nginx 기본 본문 제한(1MB) 안쪽

export const isValidSupplierId = (id: string) => /^sup_[0-9a-f]{6,20}$/.test(id);
export const stampFile = (id: string) => path.join(STAMP_DIR, `${id}.png`);
export const isPng = (b: Buffer) =>
  b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a;

// 공급자ID → 직인 수정 시각(ms). 직인이 없는 공급자는 들어 있지 않다.
export async function listStampVersions(): Promise<Map<string, number>> {
  const versions = new Map<string, number>();
  let names: string[] = [];
  try {
    names = await fs.readdir(STAMP_DIR);
  } catch {
    return versions;
  }
  await Promise.all(
    names
      .filter((n) => n.endsWith('.png'))
      .map(async (n) => {
        try {
          const st = await fs.stat(path.join(STAMP_DIR, n));
          versions.set(n.slice(0, -4), Math.floor(st.mtimeMs));
        } catch {
          /* 읽는 도중 지워진 파일은 무시 */
        }
      })
  );
  return versions;
}

export async function saveStamp(id: string, data: Buffer) {
  await fs.mkdir(STAMP_DIR, { recursive: true });
  const tmp = path.join(STAMP_DIR, `.${id}.${process.pid}.tmp`);
  await fs.writeFile(tmp, data);
  await fs.rename(tmp, stampFile(id));
}

export async function removeStamp(id: string) {
  try {
    await fs.unlink(stampFile(id));
  } catch (e: any) {
    if (e?.code !== 'ENOENT') throw e;
  }
}
