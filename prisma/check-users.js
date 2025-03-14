const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    // 모든 사용자 정보 조회
    const users = await prisma.user.findMany();
    console.log('사용자 정보:');
    console.log(JSON.stringify(users, null, 2));
  } catch (error) {
    console.error('에러 발생:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 