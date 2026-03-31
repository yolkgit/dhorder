const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('dhind2012', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'dhind' },
    update: {},
    create: {
      name: '관리자',
      email: 'dhind',
      password: hashedPassword,
      role: 'ADMIN',
      branchName: '본사',
    },
  });

  console.log('✅ 관리자 계정 생성 완료:', admin);
}

main()
  .catch((e) => {
    console.error('❌ 시드 실행 에러:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
