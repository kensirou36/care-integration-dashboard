/**
 * Service Worker - オフライン対応とキャッシュ管理
 */

const CACHE_NAME = 'care-dashboard-v1';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/src/main.js',
    '/src/style.css',
    '/manifest.json',
];

// インストール時
self.addEventListener('install', (event) => {
    console.log('Service Worker: インストール中...');

    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('Service Worker: キャッシュ作成');
            return cache.addAll(STATIC_ASSETS);
        })
    );

    self.skipWaiting();
});

// アクティベーション時
self.addEventListener('activate', (event) => {
    console.log('Service Worker: アクティベート中...');

    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker: 古いキャッシュ削除', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );

    self.clients.claim();
});

// フェッチ時
self.addEventListener('fetch', (event) => {
    // Google Sheets APIリクエストはキャッシュしない
    if (event.request.url.includes('googleapis.com')) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((response) => {
            // キャッシュがあればそれを返す
            if (response) {
                return response;
            }

            // なければネットワークから取得
            return fetch(event.request).then((response) => {
                // レスポンスが有効でない場合はそのまま返す
                if (!response || response.status !== 200 || response.type !== 'basic') {
                    return response;
                }

                // レスポンスをキャッシュに保存
                const responseToCache = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                });

                return response;
            });
        })
    );
});
