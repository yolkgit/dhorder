const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    // admin@example.com -> admin으로 변경
    const adminUser = await prisma.user.update({
      where: { email: 'admin@example.com' },
      data: { email: 'admin' },
    });
    console.log('관리자 계정 업데이트:', adminUser);

    // branch@example.com -> branch로 변경
    const branchUser = await prisma.user.update({
      where: { email: 'branch@example.com' },
      data: { email: 'branch' },
    });
    console.log('지점 계정 업데이트:', branchUser);

    console.log('사용자 정보 업데이트 완료');
  } catch (error) {
    console.error('에러 발생:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 