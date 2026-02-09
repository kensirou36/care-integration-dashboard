/**
 * Shift Data Management
 * IndexedDBを使用したシフトデータのCRUD操作
 */

const DB_NAME = 'CareIntegrationDB';
const SHIFT_STORE_NAME = 'shifts';
const DB_VERSION = 2; // メモ用のバージョン1から増加

/**
 * IndexedDBを開く
 */
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            // シフトストアを作成(まだ存在しない場合)
            if (!db.objectStoreNames.contains(SHIFT_STORE_NAME)) {
                const shiftStore = db.createObjectStore(SHIFT_STORE_NAME, {
                    keyPath: 'id',
                    autoIncrement: true
                });

                // インデックスを作成
                shiftStore.createIndex('date', '日付', { unique: false });
                shiftStore.createIndex('staff', 'スタッフ', { unique: false });
                shiftStore.createIndex('shiftType', 'シフト', { unique: false });
            }
        };
    });
}

/**
 * 全てのシフトを取得
 * @returns {Promise<Array>} - シフトデータの配列
 */
export async function getAllShifts() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(SHIFT_STORE_NAME, 'readonly');
        const store = transaction.objectStore(SHIFT_STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/**
 * 特定の日付範囲のシフトを取得
 * @param {string} startDate - 開始日(YYYY-MM-DD)
 * @param {string} endDate - 終了日(YYYY-MM-DD)
 * @returns {Promise<Array>} - シフトデータの配列
 */
export async function getShiftsByDateRange(startDate, endDate) {
    const allShifts = await getAllShifts();
    return allShifts.filter(shift => {
        const shiftDate = shift.日付 || shift.date;
        return shiftDate >= startDate && shiftDate <= endDate;
    });
}

/**
 * シフトを1件追加
 * @param {Object} shift - シフトデータ
 * @returns {Promise<number>} - 追加されたシフトのID
 */
export async function addShift(shift) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(SHIFT_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(SHIFT_STORE_NAME);

        // タイムスタンプを追加
        const shiftWithTimestamp = {
            ...shift,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const request = store.add(shiftWithTimestamp);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/**
 * シフトを複数件追加
 * @param {Array<Object>} shifts - シフトデータの配列
 * @returns {Promise<Array<number>>} - 追加されたシフトのID配列
 */
export async function addShifts(shifts) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(SHIFT_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(SHIFT_STORE_NAME);
        const ids = [];

        let completed = 0;
        const total = shifts.length;

        shifts.forEach(shift => {
            const shiftWithTimestamp = {
                ...shift,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            const request = store.add(shiftWithTimestamp);

            request.onsuccess = () => {
                ids.push(request.result);
                completed++;
                if (completed === total) {
                    resolve(ids);
                }
            };

            request.onerror = () => reject(request.error);
        });

        if (total === 0) {
            resolve([]);
        }
    });
}

/**
 * シフトを更新
 * @param {number} id - シフトID
 * @param {Object} updates - 更新データ
 * @returns {Promise<void>}
 */
export async function updateShift(id, updates) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(SHIFT_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(SHIFT_STORE_NAME);

        // 既存のシフトを取得
        const getRequest = store.get(id);

        getRequest.onsuccess = () => {
            const shift = getRequest.result;
            if (!shift) {
                reject(new Error('Shift not found'));
                return;
            }

            // 更新データをマージ
            const updatedShift = {
                ...shift,
                ...updates,
                updatedAt: new Date().toISOString()
            };

            const putRequest = store.put(updatedShift);
            putRequest.onsuccess = () => resolve();
            putRequest.onerror = () => reject(putRequest.error);
        };

        getRequest.onerror = () => reject(getRequest.error);
    });
}

/**
 * シフトを削除
 * @param {number} id - シフトID
 * @returns {Promise<void>}
 */
export async function deleteShift(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(SHIFT_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(SHIFT_STORE_NAME);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

/**
 * 全てのシフトを削除
 * @returns {Promise<void>}
 */
export async function clearAllShifts() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(SHIFT_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(SHIFT_STORE_NAME);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

/**
 * Google Sheetsからのデータでシフトを置き換え
 * @param {Array<Object>} shifts - Google Sheetsから取得したシフトデータ
 * @returns {Promise<void>}
 */
export async function replaceShiftsFromSheets(shifts) {
    // 既存のシフトを全て削除
    await clearAllShifts();

    // 新しいシフトを追加
    if (shifts && shifts.length > 0) {
        await addShifts(shifts);
    }
}
