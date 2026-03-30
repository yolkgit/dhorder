const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('테스트 주문 생성 중...');
    
    // 사용자 조회
    const users = await prisma.user.findMany();
    
    if (users.length === 0) {
      console.error('사용자가 없습니다. 먼저 사용자를 생성해주세요.');
      return;
    }
    
    // Branch 사용자 찾기
    const branchUser = users.find(user => user.role === 'BRANCH');
    
    if (!branchUser) {
      console.error('Branch 사용자가 없습니다. 먼저 Branch 사용자를 생성해주세요.');
      return;
    }
    
    console.log(`Branch 사용자: ${branchUser.name} (${branchUser.email})`);
    
    // 품목 조회
    const items = await prisma.item.findMany();
    
    if (items.length === 0) {
      console.error('품목이 없습니다. 먼저 품목을 생성해주세요.');
      return;
    }
    
    console.log(`품목 수: ${items.length}개`);
    
    // 테스트 주문 생성
    const order = await prisma.order.create({
      data: {
        userId: branchUser.id,
        deliveryDate: new Date(new Date().getTime() + 24 * 60 * 60 * 1000), // 내일
        arrivalTime: '14:00',
        destination: '테스트 현장',
        address: '서울시 강남구 테스트로 123',
        phoneNumber: '010-1234-5678',
        status: 'RECEIVED',
        memo: '테스트 주문입니다.',
        orderItems: {
          create: [
            {
              itemName: items[0].name,
              quantity: 10
            },
            {
              itemName: items[1].name,
              quantity: 5
            }
          ]
        }
      },
      include: {
        orderItems: true,
        user: {
          select: {
            name: true,
            branchName: true
          }
        }
      }
    });
    
    console.log('테스트 주문 생성 완료:');
    console.log(`ID: ${order.id}`);
    console.log(`사용자: ${order.user.name}`);
    console.log(`지점: ${order.user.branchName || '없음'}`);
    console.log(`납품일자: ${order.deliveryDate}`);
    console.log(`도착시간: ${order.arrivalTime}`);
    console.log(`하차지: ${order.destination}`);
    console.log(`주소: ${order.address}`);
    console.log(`연락처: ${order.phoneNumber}`);
    console.log(`상태: ${order.status}`);
    console.log(`메모: ${order.memo || '없음'}`);
    console.log(`품목 목록 (${order.orderItems.length}개):`);
    
    order.orderItems.forEach((item, index) => {
      console.log(`  ${index + 1}. ${item.itemName} - ${item.quantity}개`);
    });
    
  } catch (error) {
    console.error('테스트 주문 생성 중 오류 발생:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 