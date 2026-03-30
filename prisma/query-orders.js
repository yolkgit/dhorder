const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('주문 정보 조회 중...');
    
    // 모든 주문 조회
    const orders = await prisma.order.findMany({
      include: {
        orderItems: true,
        user: {
          select: {
            name: true,
            branchName: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log(`총 ${orders.length}개의 주문이 조회되었습니다.`);
    
    // 주문 정보 출력
    orders.forEach((order, index) => {
      console.log(`\n주문 ${index + 1}:`);
      console.log(`ID: ${order.id}`);
      console.log(`사용자: ${order.user.name} (${order.user.email})`);
      console.log(`지점: ${order.user.branchName || '없음'}`);
      console.log(`납품일자: ${order.deliveryDate}`);
      console.log(`도착시간: ${order.arrivalTime}`);
      console.log(`하차지: ${order.destination}`);
      console.log(`주소: ${order.address}`);
      console.log(`연락처: ${order.phoneNumber}`);
      console.log(`상태: ${order.status}`);
      console.log(`메모: ${order.memo || '없음'}`);
      console.log(`생성일: ${order.createdAt}`);
      console.log(`품목 목록 (${order.orderItems.length}개):`);
      
      order.orderItems.forEach((item, itemIndex) => {
        console.log(`  ${itemIndex + 1}. ${item.itemName} - ${item.quantity}개`);
      });
    });
    
    // 사용자별 주문 수 조회
    const userOrders = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        branchName: true,
        role: true,
        _count: {
          select: {
            orders: true
          }
        }
      }
    });
    
    console.log('\n사용자별 주문 수:');
    userOrders.forEach(user => {
      console.log(`${user.name} (${user.email}) - ${user._count.orders}개 주문`);
    });
    
  } catch (error) {
    console.error('주문 정보 조회 중 오류 발생:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 