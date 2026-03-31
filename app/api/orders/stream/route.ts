// SSE(Server-Sent Events) 스트림 엔드포인트
// 클라이언트가 이 엔드포인트에 연결하면 주문 변경 이벤트를 실시간으로 수신합니다.
import { orderBroadcaster } from '@/lib/orderEvents';

export const dynamic = 'force-dynamic';

export async function GET() {
  const clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  const stream = new ReadableStream({
    start(controller) {
      // 클라이언트 등록
      orderBroadcaster.addClient(clientId, controller);

      // 연결 확인 메시지 전송
      const encoder = new TextEncoder();
      controller.enqueue(
        encoder.encode(`event: connected\ndata: ${JSON.stringify({ clientId, timestamp: Date.now() })}\n\n`)
      );

      // 30초마다 heartbeat 전송 (연결 유지)
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(
            encoder.encode(`event: heartbeat\ndata: ${JSON.stringify({ timestamp: Date.now() })}\n\n`)
          );
        } catch {
          clearInterval(heartbeat);
          orderBroadcaster.removeClient(clientId);
        }
      }, 30000);

      // 클라이언트가 연결을 끊을 때 정리 (스트림 취소 시)
      // ReadableStream의 cancel 콜백은 start 안에서 직접 등록할 수 없으므로
      // controller.close 등이 호출될 때 heartbeat를 정리합니다.
    },
    cancel() {
      orderBroadcaster.removeClient(clientId);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // nginx 프록시 환경에서 버퍼링 방지
    },
  });
}
