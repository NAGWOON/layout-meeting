/* ============================================
   브리프 전송 프록시 (선택)
   - 여기 URL·API 키를 채우면: 봇 토큰/Chat ID 없이도 모든 기기에서 전송 가능
     (비밀은 Cloudflare Worker 환경변수에만 저장)
   - 비우면: 기존 방식(⚙에서 토큰·Chat ID를 이 브라우저에 저장)
   ============================================ */
(function () {
  'use strict';

  /** Worker 배포 주소, 끝의 / 제외. 예: https://dasifill-brief.xxx.workers.dev */
  window.__BRIEF_PROXY_URL__ = 'https://dasifill-brief-proxy.jianvet.workers.dev';

  /** Worker 시크릿 BRIEF_API_KEY 와 동일 */
  window.__BRIEF_PROXY_KEY__ = 'dasifill0438##';
})();
