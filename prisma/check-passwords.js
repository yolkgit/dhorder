const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
  try {
    // 모든 사용자 정보 조회
    const users = await prisma.user.findMany();
    console.log('사용자 정보:');
    console.log(JSON.stringify(users, null, 2));

    // 테스트 비밀번호 확인
    const testPasswords = ['admin123', 'branch123'];
    
    for (const user of users) {
      for (const testPassword of testPasswords) {
        const isMatch = await bcrypt.compare(testPassword, user.password);
        if (isMatch) {
          console.log(`사용자 ${user.email}의 비밀번호는 "${testPassword}"와 일치합니다.`);
        }
      }
    }
  } catch (error) {
    console.error('에러 발생:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 