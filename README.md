This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## 텔레그램 알림 설정

이 프로젝트는 새 주문 생성, 주문 수정, 주문 상태 변경 시 텔레그램으로 알림을 보내는 기능을 지원합니다.

### 텔레그램 봇 생성 및 설정 방법

1. 텔레그램에서 [BotFather](https://t.me/botfather)를 검색하여 대화를 시작합니다.
2. `/newbot` 명령어를 입력하여 새 봇을 생성합니다.
3. 봇의 이름과 사용자 이름을 입력합니다.
4. 봇 생성이 완료되면 API 토큰을 받게 됩니다. 이 토큰을 `.env` 파일의 `TELEGRAM_BOT_TOKEN` 값으로 설정합니다.

### 채팅 ID 얻기

1. 생성한 봇과 대화를 시작합니다.
2. 봇에게 아무 메시지나 보냅니다.
3. 웹 브라우저에서 `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`에 접속합니다. (`<YOUR_BOT_TOKEN>`을 실제 봇 토큰으로 대체)
4. 응답에서 `chat` 객체 내의 `id` 값을 찾습니다. 이 값을 `.env` 파일의 `TELEGRAM_CHAT_ID` 값으로 설정합니다.

### 그룹 채팅 설정 (선택 사항)

여러 사람이 알림을 받고 싶은 경우:

1. 텔레그램에서 새 그룹을 생성합니다.
2. 생성한 봇을 그룹에 추가합니다.
3. 그룹에서 아무 메시지나 보냅니다.
4. `getUpdates` API를 호출하여 그룹 채팅 ID를 얻습니다. 그룹 채팅 ID는 일반적으로 음수 값입니다.
5. 이 값을 `.env` 파일의 `TELEGRAM_CHAT_ID` 값으로 설정합니다.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
