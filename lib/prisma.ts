import { PrismaClient } from '@prisma/client';

// PrismaClient 인스턴스가 전역 변수에 저장되지 않도록 함
const globalForPrisma = global as unknown as { prisma: PrismaClient };

// 개발 환경에서는 로깅을 활성화하여 디버깅을 용이하게 함
export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
  });

// 데이터베이스 연결 테스트
prisma.$connect()
  .then(() => {
    console.log('데이터베이스 연결 성공');
  })
  .catch((error) => {
    console.error('데이터베이스 연결 실패:', error);
  });

// 개발 환경에서만 전역 변수에 PrismaClient 인스턴스를 저장
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// 명시적으로 모델 접근 방식을 정의
export const db = {
  user: prisma.user,
  order: prisma.order,
  orderItem: prisma.orderItem,
  item: prisma.item,
}; 