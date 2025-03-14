/**
 * 텔레그램 메시지 전송 유틸리티
 */

// 환경 변수에서 텔레그램 봇 토큰과 채팅 ID를 가져옵니다.
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

/**
 * 텔레그램으로 메시지를 전송합니다.
 * @param message 전송할 메시지
 * @returns 전송 성공 여부
 */
export async function sendTelegramMessage(message: string): Promise<boolean> {
  try {
    // 환경 변수가 설정되어 있지 않으면 실패로 처리
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      console.warn('텔레그램 봇 토큰 또는 채팅 ID가 설정되지 않았습니다.');
      return false;
    }

    // 텔레그램 API 엔드포인트
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    
    // API 요청 데이터
    const data = {
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: 'HTML', // HTML 형식 지원 (굵게, 기울임 등)
    };

    // 텔레그램 API 호출
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('텔레그램 메시지 전송 실패:', result);
      return false;
    }

    console.log('텔레그램 메시지 전송 성공:', result);
    return true;
  } catch (error) {
    console.error('텔레그램 메시지 전송 중 오류 발생:', error);
    return false;
  }
}

/**
 * 새 주문 생성 알림을 텔레그램으로 전송합니다.
 * @param order 생성된 주문 정보
 */
export async function sendNewOrderNotification(order: any): Promise<void> {
  const message = `
<b>🆕 새 주문이 등록되었습니다!</b>

<b>지점명:</b> ${order.user?.branchName || order.user?.name || '정보 없음'}
<b>배송일:</b> ${new Date(order.deliveryDate).toLocaleDateString()}
<b>도착 시간:</b> ${order.arrivalTime || '정보 없음'}
<b>하차지:</b> ${order.destination || '정보 없음'}
<b>주소:</b> ${order.address || '정보 없음'}
<b>연락처:</b> ${order.phoneNumber || '정보 없음'}
${order.memo ? `<b>메모:</b> ${order.memo}` : ''}

<b>주문 품목:</b>
${order.orderItems.map((item: any) => `- ${item.itemName}: ${item.quantity}개`).join('\n')}
`;

  await sendTelegramMessage(message);
}

/**
 * 주문 수정 알림을 텔레그램으로 전송합니다.
 * @param order 수정된 주문 정보
 * @param oldStatus 이전 주문 상태 (상태 변경 시에만 사용)
 */
export async function sendOrderUpdateNotification(order: any, oldStatus?: string): Promise<void> {
  // 배차 상태나 배송완료 상태로 변경되는 경우 알림을 보내지 않음
  if (order.status === 'DISPATCHED' || order.status === 'DELIVERED') {
    console.log(`${order.status === 'DISPATCHED' ? '배차' : '배송완료'} 상태 관련 변경이므로 텔레그램 알림을 전송하지 않습니다.`);
    return;
  }

  let statusText = '';
  if (oldStatus && oldStatus !== order.status) {
    statusText = `<b>상태 변경:</b> ${getOrderStatusText(oldStatus)} → ${getOrderStatusText(order.status)}\n`;
  }

  const message = `
<b>🔄 주문이 수정되었습니다!</b>
${statusText}
<b>지점명:</b> ${order.user?.branchName || order.user?.name || '정보 없음'}
<b>배송일:</b> ${new Date(order.deliveryDate).toLocaleDateString()}
<b>도착 시간:</b> ${order.arrivalTime || '정보 없음'}
<b>하차지:</b> ${order.destination || '정보 없음'}
<b>주소:</b> ${order.address || '정보 없음'}
<b>연락처:</b> ${order.phoneNumber || '정보 없음'}
${order.memo ? `<b>메모:</b> ${order.memo}` : ''}

<b>주문 품목:</b>
${order.orderItems.map((item: any) => `- ${item.itemName}: ${item.quantity}개`).join('\n')}
`;

  await sendTelegramMessage(message);
}

/**
 * 주문 상태 코드를 한글 텍스트로 변환합니다.
 * @param status 주문 상태 코드
 * @returns 한글 상태 텍스트
 */
function getOrderStatusText(status: string): string {
  switch (status) {
    case 'RECEIVED':
      return '주문접수';
    case 'DISPATCHED':
      return '차량배차';
    case 'DELIVERED':
      return '배송완료';
    default:
      return status;
  }
} 