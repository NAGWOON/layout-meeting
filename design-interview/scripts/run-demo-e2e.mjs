#!/usr/bin/env node
/**
 * PIN(1004) → 앱 진입 → __DASIFILL_runDemoSession() 자동 호출
 * 환경변수 TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID 가 있으면 localStorage에 넣어 전송까지 시도.
 *
 * 사용: BASE_URL=http://127.0.0.1:8765 node scripts/run-demo-e2e.mjs
 */

import { chromium } from 'playwright';
import process from 'node:process';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:8765';
const START = `${BASE.replace(/\/$/, '')}/index.html`;

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') console.error('[page]', msg.text());
  });

  console.log('열기:', START);
  await page.goto(START, { waitUntil: 'domcontentloaded', timeout: 60000 });

  const token = process.env.TELEGRAM_BOT_TOKEN || '';
  const chatId = process.env.TELEGRAM_CHAT_ID || '';
  if (token && chatId) {
    await page.evaluate(
      ({ t, c }) => {
        localStorage.setItem('design_interview_v1_config', JSON.stringify({ botToken: t, chatId: c }));
      },
      { t: token, c: chatId }
    );
    console.log('localStorage에 텔레그램 설정 주입됨 (전송 시도 가능)');
  } else {
    console.log('TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID 없음 → 데모 입력만, 전송은 앱이 건너뜀');
  }

  await page.locator('.pin-digit').nth(0).fill('1');
  await page.locator('.pin-digit').nth(1).fill('0');
  await page.locator('.pin-digit').nth(2).fill('0');
  await page.locator('.pin-digit').nth(3).fill('4');

  await page.waitForFunction(
    () => {
      const g = document.getElementById('pinGate');
      return g && (g.style.display === 'none' || !g.offsetParent);
    },
    { timeout: 15000 }
  );
  console.log('PIN 통과');

  await page.waitForFunction(() => typeof window.__DASIFILL_runDemoSession === 'function', {
    timeout: 10000
  });

  const pre = await page.evaluate(() => ({
    spaces: AppState.getActiveSpaces().length,
    hasInterview: typeof INTERVIEW_DATA !== 'undefined',
    demoFn: typeof window.__DASIFILL_runDemoSession
  }));
  console.log('실행 전:', pre);

  await page.evaluate(() => {
    window.__DASIFILL_runDemoSession();
  });

  await page.waitForTimeout(15000);

  const stats = await page.evaluate(() => ({
    progressText: document.getElementById('globalProgressText')?.textContent,
    answered: typeof ProgressManager !== 'undefined' ? ProgressManager.getTotalAnswered() : -1,
    pct: typeof ProgressManager !== 'undefined' ? ProgressManager.getOverallProgress().pct : -1,
    answerKeys: typeof AppState !== 'undefined' ? Object.keys(AppState.state.answers).length : -1
  }));
  console.log('데모 결과:', JSON.stringify(stats, null, 2));

  await browser.close();
  console.log('완료');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
