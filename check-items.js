const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('품목 정보 조회 중...');
    
    // 모든 품목 조회
    const items = await prisma.item.findMany();
    
    console.log(`총 ${items.length}개의 품목이 조회되었습니다.`);
    
    // 품목 정보 출력
    items.forEach((item, index) => {
      console.log(`\n품목 ${index + 1}:`);
      console.log(`ID: ${item.id}`);
      console.log(`이름: ${item.name}`);
      console.log(`설명: ${item.description || '없음'}`);
      console.log(`생성일: ${item.createdAt}`);
    });
    
  } catch (error) {
    console.error('품목 정보 조회 중 오류 발생:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 