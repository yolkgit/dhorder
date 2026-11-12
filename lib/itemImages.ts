// 품목 사진 보관: ~/dhorder/data/item-images/<품목ID>.jpg
// DB 구조를 바꾸지 않고 파일로 저장한다. (서버 홈 전체 백업에 함께 포함됨)
import { promises as fs } from 'fs';
import path from 'path';

export const IMAGE_DIR = path.join(process.cwd(), 'data', 'item-images');
export const MAX_IMAGE_BYTES = 900 * 1024; // nginx 기본 본문 제한(1MB) 안쪽

export const isValidItemId = (id: string) => /^[A-Za-z0-9_-]{8,64}$/.test(id);
export const imageFile = (id: string) => path.join(IMAGE_DIR, `${id}.jpg`);
export const isJpeg = (b: Buffer) => b.length > 4 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;

// 품목ID → 사진 수정 시각(ms). 사진이 없는 품목은 들어 있지 않다.
export async function listImageVersions(): Promise<Map<string, number>> {
  const versions = new Map<string, number>();
  let names: string[] = [];
  try {
    names = await fs.readdir(IMAGE_DIR);
  } catch {
    return versions;
  }
  await Promise.all(
    names
      .filter((n) => n.endsWith('.jpg'))
      .map(async (n) => {
        try {
          const st = await fs.stat(path.join(IMAGE_DIR, n));
          versions.set(n.slice(0, -4), Math.floor(st.mtimeMs));
        } catch {
          /* 읽는 도중 지워진 파일은 무시 */
        }
      })
  );
  return versions;
}

export async function saveItemImage(id: string, data: Buffer) {
  await fs.mkdir(IMAGE_DIR, { recursive: true });
  const tmp = path.join(IMAGE_DIR, `.${id}.${process.pid}.tmp`);
  await fs.writeFile(tmp, data);
  await fs.rename(tmp, imageFile(id)); // 임시 파일로 쓴 뒤 교체해 반쪽짜리 파일이 보이지 않게 함
}

export async function removeItemImage(id: string) {
  try {
    await fs.unlink(imageFile(id));
  } catch (e: any) {
    if (e?.code !== 'ENOENT') throw e;
  }
}
