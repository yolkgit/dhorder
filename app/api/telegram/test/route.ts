import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { sendTelegramMessage, checkTelegramConfig } from '@/lib/telegram';

// 텔레그램 설정 테스트 API (관리자 전용)
export async function POST(req: Request) {
  try {
    // 세션 확인
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: '관리자만 접근할 수 있습니다.' },
        { status: 403 }
      );
    }

    // 텔레그램 설정 확인
    const configCheck = checkTelegramConfig();
    
    if (!configCheck.isConfigured) {
      return NextResponse.json({
        success: false,
        error: '텔레그램 설정이 올바르지 않습니다.',
        details: configCheck.error
      });
    }

    // 테스트 메시지 전송
    const testMessage = `
<b>🧪 텔레그램 알림 테스트</b>

이 메시지는 주문 시스템의 텔레그램 알림 기능이 정상적으로 작동하는지 확인하기 위한 테스트 메시지입니다.

<b>테스트 시간:</b> ${new Date().toLocaleString('ko-KR')}
<b>관리자:</b> ${session.user.name || session.user.email}

✅ 이 메시지가 수신되었다면 텔레그램 알림이 정상적으로 작동하고 있습니다.
`;

    console.log('[텔레그램 테스트] 테스트 메시지 전송 시작');
    const success = await sendTelegramMessage(testMessage);

    if (success) {
      console.log('[텔레그램 테스트] 테스트 메시지 전송 성공');
      return NextResponse.json({
        success: true,
        message: '텔레그램 테스트 메시지가 성공적으로 전송되었습니다.',
        timestamp: new Date().toISOString()
      });
    } else {
      console.error('[텔레그램 테스트] 테스트 메시지 전송 실패');
      return NextResponse.json({
        success: false,
        error: '텔레그램 메시지 전송에 실패했습니다. 로그를 확인해주세요.',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('[텔레그램 테스트] 오류 발생:', error);
    return NextResponse.json({
      success: false,
      error: '텔레그램 테스트 중 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// 텔레그램 설정 상태 확인 API (관리자 전용)
export async function GET(req: Request) {
  try {
    // 세션 확인
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: '관리자만 접근할 수 있습니다.' },
        { status: 403 }
      );
    }

    // 텔레그램 설정 확인
    const configCheck = checkTelegramConfig();
    
    return NextResponse.json({
      success: true,
      isConfigured: configCheck.isConfigured,
      error: configCheck.error || null,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[텔레그램 설정 확인] 오류 발생:', error);
    return NextResponse.json({
      success: false,
      error: '텔레그램 설정 확인 중 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 