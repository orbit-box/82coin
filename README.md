# 82coin — 암호화폐 시장정보 · 무료 커뮤니티

82coin v0.3 beta · 2026년 10월. 화이트 배경과 블루 포인트로 구성한 Next.js + PostgreSQL 프로젝트입니다.

## 구현된 기능
- 홈 / 시장정보 / 커뮤니티 / 혜택
- Upbit 실시간 원화 시세, Binance USDT와 환율 기반 김치프리미엄 참고치 (공급처 장애 시 부분 표시)
- 외부 Google News RSS 최신 제목·출처·원문 링크
- BLS · FRB · BEA 공식 경제지표 일정 링크
- 이메일·비밀번호 회원가입, 서명된 HttpOnly 세션 쿠키
- 게시글·댓글·카테고리·검색·신고 및 관리자 신고 처리
- 마이페이지 관심종목 저장
- 상태 확인 API `/api/health`, 기본 sitemap 및 robots

## 시작 방법
Node.js 20+ / PostgreSQL이 필요합니다.

```bash
npm install
npm run dev
```

필수 환경변수:

```env
DATABASE_URL=postgresql://...
AUTH_SECRET=32자 이상의 무작위 문자열
ADMIN_EMAIL=관리자 계정의 이메일
```

Railway에서는 웹서비스에 `DATABASE_URL=${{Postgres.DATABASE_URL}}` 형태로 참조 변수를 연결할 수 있습니다. 소스코드에 비밀번호를 기록하지 마세요.

## 개발 시 주의사항
- **베타 버전**이며 공개 상용 서비스용 보안 점검, 이용약관·개인정보처리방침·이메일 인증·가입/로그인 요청 제한, 성능 부하 테스트 등이 필요합니다.
- 해외 거래소 API가 접속 불가인 경우 김치프리미엄은 표시되지 않습니다.
- 속보 데이터는 외부 RSS 제목 링크이며 자체 검증된 속보 시스템이 아닙니다.
- 자동 발표치 경제지표 수집은 아직 연결되지 않았습니다.
- 광고 계약·애드센스·거래소 제휴·페이백 신청 및 지급은 활성화하지 않았습니다.
- 현재 게시글 작성 기능은 최소 기능으로, 운영 정책과 제재·보안 고도화가 필요합니다.

## 배포
GitHub: https://github.com/orbit-box/82coin
Railway URL: https://82coin-web-production.up.railway.app
