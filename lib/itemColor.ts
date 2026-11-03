// 품목별 글자색 (주문 목록·상세·등록·수정·품목 관리 화면에서 공통 사용)
// WATER FIX는 어두운 파랑, 적색 품목은 어두운 빨강
export function getItemTextClass(itemName?: string | null): string {
  const name = itemName || '';
  if (/water\s*fix/i.test(name)) return 'text-blue-900';
  if (/적색/.test(name)) return 'text-red-800';
  return '';
}
