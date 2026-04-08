'use strict';

// ── IndexedDB 래퍼 (도면 이미지 전용) ────────────────
// localStorage 한도(~5MB)를 우회하기 위해 IndexedDB 사용.
// IndexedDB는 브라우저당 수백MB ~ GB 용량을 지원함.

const ImageDB = (() => {
  const DB_NAME    = 'layout_meeting_images';
  const STORE_NAME = 'floor_plans';
  let _db = null;

  function open() {
    if (_db) return Promise.resolve(_db);
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        console.warn('[ImageDB] IndexedDB를 지원하지 않는 브라우저입니다. 도면은 세션 중에만 유지됩니다.');
        resolve(null);
        return;
      }
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = (e) => {
        e.target.result.createObjectStore(STORE_NAME);
      };
      req.onsuccess = (e) => {
        _db = e.target.result;
        resolve(_db);
      };
      req.onerror = () => {
        console.warn('[ImageDB] 열기 실패:', req.error);
        resolve(null);
      };
    });
  }

  return {
    async save(key, dataUrl) {
      const db = await open();
      if (!db) return;
      return new Promise((resolve) => {
        try {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          tx.objectStore(STORE_NAME).put(dataUrl, key);
          tx.oncomplete = resolve;
          tx.onerror    = resolve; // 실패해도 앱은 계속 동작
        } catch (e) {
          console.warn('[ImageDB] 저장 실패:', e);
          resolve();
        }
      });
    },

    async load(key) {
      const db = await open();
      if (!db) return null;
      return new Promise((resolve) => {
        try {
          const tx  = db.transaction(STORE_NAME, 'readonly');
          const req = tx.objectStore(STORE_NAME).get(key);
          req.onsuccess = () => resolve(req.result ?? null);
          req.onerror   = () => resolve(null);
        } catch (e) {
          resolve(null);
        }
      });
    },

    async delete(key) {
      const db = await open();
      if (!db) return;
      return new Promise((resolve) => {
        try {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          tx.objectStore(STORE_NAME).delete(key);
          tx.oncomplete = resolve;
          tx.onerror    = resolve;
        } catch (e) { resolve(); }
      });
    },
  };
})();
