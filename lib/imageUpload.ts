// 브라우저에서 사진을 작게 줄여 JPEG로 바꾼다 (서버 업로드 한도 1MB 안쪽, 목록용으로 충분한 크기)
export async function shrinkToJpeg(file: File, maxSide = 640): Promise<Blob> {
  if (!file.type.startsWith('image/')) throw new Error('이미지 파일을 선택해 주세요.');

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('이 사진 형식은 읽을 수 없습니다. JPG, PNG, WEBP 사진을 사용해 주세요.');
  }

  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('사진을 변환하지 못했습니다.');
  ctx.fillStyle = '#ffffff'; // 투명 배경(PNG)은 흰색으로
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();

  for (const quality of [0.85, 0.75, 0.6, 0.45]) {
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (blob && blob.size <= 880 * 1024) return blob;
  }
  throw new Error('사진 용량을 줄이지 못했습니다. 더 작은 사진을 사용해 주세요.');
}
