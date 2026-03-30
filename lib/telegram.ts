/**
 * 텔레그램 메시지 전송 유틸리티
 */

// 환경 변수에서 텔레그램 봇 토큰과 채팅 ID를 가져옵니다.
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// 🔥 재시도 설정
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1초
const REQUEST_TIMEOUT = 10000; // 10초

/**
 * 지연 함수
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 환경 변수 검증
 */
function validateEnvironmentVariables(): { isValid: boolean; error?: string } {
  if (!TELEGRAM_BOT_TOKEN) {
    return { isValid: false, error: 'TELEGRAM_BOT_TOKEN 환경 변수가 설정되지 않았습니다.' };
  }
  
  if (!TELEGRAM_CHAT_ID) {
    return { isValid: false, error: 'TELEGRAM_CHAT_ID 환경 변수가 설정되지 않았습니다.' };
  }
  
  // 봇 토큰 형식 검증 (기본적인 형식 체크)
  if (!TELEGRAM_BOT_TOKEN.includes(':')) {
    return { isValid: false, error: 'TELEGRAM_BOT_TOKEN 형식이 올바르지 않습니다.' };
  }
  
  return { isValid: true };
}

/**
 * 텔레그램으로 메시지를 전송합니다. (재시도 로직 포함)
 * @param message 전송할 메시지
 * @param retryCount 현재 재시도 횟수
 * @returns 전송 성공 여부
 */
export async function sendTelegramMessage(message: string, retryCount = 0): Promise<boolean> {
  const attemptNumber = retryCount + 1;
  
  try {
    console.log(`[텔레그램] 메시지 전송 시도 ${attemptNumber}/${MAX_RETRIES + 1}`);
    
    // 🔥 환경 변수 검증
    const validation = validateEnvironmentVariables();
    if (!validation.isValid) {
      console.error(`[텔레그램] 환경 변수 오류: ${validation.error}`);
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

    console.log(`[텔레그램] API 호출 시작 - URL: ${url.replace(TELEGRAM_BOT_TOKEN!, '[TOKEN]')}`);

    // 🔥 타임아웃 설정과 함께 텔레그램 API 호출
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const result = await response.json();

    if (!response.ok) {
      console.error(`[텔레그램] API 응답 오류 (${attemptNumber}/${MAX_RETRIES + 1}):`, {
        status: response.status,
        statusText: response.statusText,
        result
      });

      // 🔥 재시도 가능한 오류인지 확인
      const isRetryableError = response.status >= 500 || 
                              response.status === 429 || // Too Many Requests
                              response.status === 502 || // Bad Gateway
                              response.status === 503 || // Service Unavailable
                              response.status === 504;   // Gateway Timeout

      if (isRetryableError && retryCount < MAX_RETRIES) {
        const delayTime = RETRY_DELAY * Math.pow(2, retryCount); // 지수 백오프
        console.log(`[텔레그램] ${delayTime}ms 후 재시도 예정...`);
        await delay(delayTime);
        return sendTelegramMessage(message, retryCount + 1);
      }

      return false;
    }

    console.log(`[텔레그램] 메시지 전송 성공 (${attemptNumber}/${MAX_RETRIES + 1}):`, {
      messageId: result.message_id,
      chatId: result.chat?.id,
      date: new Date(result.date * 1000).toISOString()
    });
    
    return true;
  } catch (error) {
    console.error(`[텔레그램] 메시지 전송 중 오류 발생 (${attemptNumber}/${MAX_RETRIES + 1}):`, {
      error: error instanceof Error ? error.message : String(error),
      name: error instanceof Error ? error.name : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined
    });

    // 🔥 네트워크 오류나 타임아웃인 경우 재시도
    const isNetworkError = error instanceof Error && (
      error.name === 'AbortError' || 
      error.name === 'TypeError' || 
      error.message.includes('fetch')
    );

    if (isNetworkError && retryCount < MAX_RETRIES) {
      const delayTime = RETRY_DELAY * Math.pow(2, retryCount); // 지수 백오프
      console.log(`[텔레그램] 네트워크 오류로 ${delayTime}ms 후 재시도 예정...`);
      await delay(delayTime);
      return sendTelegramMessage(message, retryCount + 1);
    }

    return false;
  }
}

/**
 * 새 주문 생성 알림을 텔레그램으로 전송합니다.
 * @param order 생성된 주문 정보
 */
export async function sendNewOrderNotification(order: any): Promise<void> {
  try {
    console.log(`[텔레그램] 새 주문 알림 전송 시작 - 주문 ID: ${order.id}`);
    
    // 🔥 필수 데이터 검증
    if (!order || !order.id) {
      console.error('[텔레그램] 새 주문 알림 - 주문 데이터가 유효하지 않습니다:', order);
      return;
    }

    const message = `
<b>🆕 새 주문이 등록되었습니다!</b>

<b>지점명:</b> ${order.user?.branchName || order.user?.name || '정보 없음'}
<b>배송일:</b> ${new Date(order.deliveryDate).toLocaleDateString('ko-KR')}
<b>도착 시간:</b> ${order.arrivalTime || '정보 없음'}
<b>하차지:</b> ${order.destination || '정보 없음'}
<b>주소:</b> ${order.address || '정보 없음'}
<b>연락처:</b> ${order.phoneNumber || '정보 없음'}
${order.memo ? `<b>메모:</b> ${order.memo}` : ''}

<b>주문 품목:</b>
${order.orderItems?.map((item: any) => `- ${item.itemName}: ${item.quantity}개`).join('\n') || '품목 정보 없음'}

<b>등록 시간:</b> ${new Date().toLocaleString('ko-KR')}
`;

    const success = await sendTelegramMessage(message);
    
    if (success) {
      console.log(`[텔레그램] 새 주문 알림 전송 완료 - 주문 ID: ${order.id}`);
    } else {
      console.error(`[텔레그램] 새 주문 알림 전송 실패 - 주문 ID: ${order.id}`);
    }
  } catch (error) {
    console.error('[텔레그램] 새 주문 알림 처리 중 오류:', error);
  }
}

/**
 * 주문 수정 알림을 텔레그램으로 전송합니다.
 * @param order 수정된 주문 정보
 * @param oldStatus 이전 주문 상태 (상태 변경 시에만 사용)
 */
export async function sendOrderUpdateNotification(order: any, oldStatus?: string): Promise<void> {
  try {
    console.log(`[텔레그램] 주문 수정 알림 전송 시작 - 주문 ID: ${order.id}, 상태: ${order.status}`);
    
    // 🔥 필수 데이터 검증
    if (!order || !order.id) {
      console.error('[텔레그램] 주문 수정 알림 - 주문 데이터가 유효하지 않습니다:', order);
      return;
    }

    // 배차 상태나 배송완료 상태로 변경되는 경우 알림을 보내지 않음
    if (order.status === 'DISPATCHED' || order.status === 'DELIVERED') {
      console.log(`[텔레그램] ${order.status === 'DISPATCHED' ? '배차' : '배송완료'} 상태 관련 변경이므로 알림을 전송하지 않습니다. - 주문 ID: ${order.id}`);
      return;
    }

    let statusText = '';
    if (oldStatus && oldStatus !== order.status) {
      statusText = `<b>상태 변경:</b> ${getOrderStatusText(oldStatus)} → ${getOrderStatusText(order.status)}\n`;
    }

    const message = `
<b>🔄 주문이 수정되었습니다!</b>

${statusText}<b>지점명:</b> ${order.user?.branchName || order.user?.name || '정보 없음'}
<b>배송일:</b> ${new Date(order.deliveryDate).toLocaleDateString('ko-KR')}
<b>도착 시간:</b> ${order.arrivalTime || '정보 없음'}
<b>하차지:</b> ${order.destination || '정보 없음'}
<b>주소:</b> ${order.address || '정보 없음'}
<b>연락처:</b> ${order.phoneNumber || '정보 없음'}
${order.memo ? `<b>메모:</b> ${order.memo}` : ''}

<b>주문 품목:</b>
${order.orderItems?.map((item: any) => `- ${item.itemName}: ${item.quantity}개`).join('\n') || '품목 정보 없음'}

<b>수정 시간:</b> ${new Date().toLocaleString('ko-KR')}
`;

    const success = await sendTelegramMessage(message);
    
    if (success) {
      console.log(`[텔레그램] 주문 수정 알림 전송 완료 - 주문 ID: ${order.id}`);
    } else {
      console.error(`[텔레그램] 주문 수정 알림 전송 실패 - 주문 ID: ${order.id}`);
    }
  } catch (error) {
    console.error('[텔레그램] 주문 수정 알림 처리 중 오류:', error);
  }
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

// 🔥 텔레그램 설정 상태 확인 함수 (디버깅용)
export function checkTelegramConfig(): { isConfigured: boolean; error?: string } {
  const validation = validateEnvironmentVariables();
  return {
    isConfigured: validation.isValid,
    error: validation.error
  };
} 