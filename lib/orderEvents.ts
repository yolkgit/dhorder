// lib/orderEvents.ts
// 서버 사이드 SSE 이벤트 브로드캐스터 싱글톤
// 모든 API 라우트에서 주문 변경 시 이벤트를 emit하면,
// 연결된 모든 SSE 클라이언트에게 즉시 푸시됩니다.

type SSEClient = {
  id: string;
  controller: ReadableStreamDefaultController;
};

class OrderEventBroadcaster {
  private clients: Map<string, SSEClient> = new Map();

  addClient(id: string, controller: ReadableStreamDefaultController) {
    this.clients.set(id, { id, controller });
    console.log(`[SSE] 클라이언트 연결: ${id} (총 ${this.clients.size}명)`);
  }

  removeClient(id: string) {
    this.clients.delete(id);
    console.log(`[SSE] 클라이언트 해제: ${id} (총 ${this.clients.size}명)`);
  }

  // 모든 연결된 클라이언트에게 이벤트 전송
  broadcast(event: string, data?: any) {
    const message = `event: ${event}\ndata: ${JSON.stringify(data || {})}\n\n`;
    const encoder = new TextEncoder();
    const encoded = encoder.encode(message);

    const deadClients: string[] = [];

    this.clients.forEach((client) => {
      try {
        client.controller.enqueue(encoded);
      } catch (e) {
        // 연결이 끊어진 클라이언트 정리
        deadClients.push(client.id);
      }
    });

    // 끊어진 클라이언트 제거
    deadClients.forEach((id) => this.removeClient(id));

    if (this.clients.size > 0) {
      console.log(`[SSE] 브로드캐스트: "${event}" → ${this.clients.size}명에게 전송`);
    }
  }

  // 주문 변경 알림 전송 (편의 메서드)
  notifyOrderChange(type: 'created' | 'updated' | 'deleted' | 'statusChanged', orderId?: string) {
    this.broadcast('orderChange', { type, orderId, timestamp: Date.now() });
  }

  getClientCount() {
    return this.clients.size;
  }
}

// 글로벌 싱글톤 (Next.js hot reload에도 유지)
const globalForEvents = globalThis as unknown as {
  orderBroadcaster: OrderEventBroadcaster | undefined;
};

export const orderBroadcaster =
  globalForEvents.orderBroadcaster ?? new OrderEventBroadcaster();

if (process.env.NODE_ENV !== 'production') {
  globalForEvents.orderBroadcaster = orderBroadcaster;
}
