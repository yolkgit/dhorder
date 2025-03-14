import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient() as any; // 타입 캐스팅을 통해 라인터 오류 해결

async function main() {
  try {
    // 관리자 계정 생성
    const adminPassword = await bcrypt.hash('admin123', 10);
    
    const admin = await prisma.user.upsert({
      where: { email: 'admin' },
      update: {},
      create: {
        name: 'Admin',
        email: 'admin',
        password: adminPassword,
        role: 'ADMIN',
      },
    });
    
    console.log('관리자 계정이 생성되었습니다:', admin);
    
    // 지점 사용자 계정 생성
    const branchPassword = await bcrypt.hash('branch123', 10);
    
    const branchUser = await prisma.user.upsert({
      where: { email: 'branch' },
      update: {},
      create: {
        name: 'Branch User',
        email: 'branch',
        password: branchPassword,
        role: 'BRANCH',
        branchName: '서울 지점',
      },
    });
    
    console.log('지점 사용자 계정이 생성되었습니다:', branchUser);

    // 기본 품목 데이터 생성
    const items = [
      { name: '레미콘', description: '25-210-15' },
      { name: '레미콘', description: '25-240-15' },
      { name: '레미콘', description: '25-270-15' },
      { name: '레미콘', description: '25-300-15' },
      { name: '레미콘', description: '25-350-15' },
      { name: '레미콘', description: '25-400-15' },
      { name: '시멘트', description: '포틀랜드 시멘트' },
      { name: '모래', description: '강모래' },
      { name: '자갈', description: '쇄석 자갈' },
      { name: '철근', description: 'SD400 D10' },
      { name: '철근', description: 'SD400 D13' },
      { name: '철근', description: 'SD400 D16' },
      { name: '철근', description: 'SD400 D19' },
      { name: '철근', description: 'SD400 D22' },
      { name: '철근', description: 'SD400 D25' },
    ];

    // 품목 데이터 삭제 후 다시 생성
    await prisma.item.deleteMany({});
    
    for (const item of items) {
      const createdItem = await prisma.item.create({
        data: {
          name: `${item.name} ${item.description}`,
          description: `${item.name} ${item.description} 규격`,
        },
      });
      console.log(`품목이 생성되었습니다: ${createdItem.name}`);
    }
  } catch (error) {
    console.error('시드 오류:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 