/**
 * Memo Data Management using IndexedDB
 * Handles storage of handwritten notes (images + text)
 */

import { openDB } from 'idb';

const DB_NAME = 'care-integration-db';
const STORE_NAME = 'memos';
const DB_VERSION = 1;

/**
 * Initialize the database
 */
async function initDB() {
    return openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, {
                    keyPath: 'id',
                    autoIncrement: true,
                });
                store.createIndex('createdAt', 'createdAt');
            }
        },
    });
}

/**
 * Save a new memo
 * @param {Object} memo - { text: string, imageBlob: Blob, createdAt: Date }
 * @returns {Promise<number>} - The ID of the saved memo
 */
export async function saveMemo(memo) {
    const db = await initDB();
    const data = {
        ...memo,
        createdAt: memo.createdAt || new Date(),
        updatedAt: new Date(),
        exportedToSheets: false, // エクスポート済みフラグ
    };
    return db.add(STORE_NAME, data);
}

/**
 * Get all memos
 * @returns {Promise<Array>} - Array of memos sorted by createdAt (desc)
 */
export async function getAllMemos() {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const index = tx.store.index('createdAt');

    // Get all items
    let memos = await index.getAll();

    // Sort by createdAt descending (newest first)
    return memos.reverse();
}

/**
 * Get a single memo by ID
 * @param {number} id
 * @returns {Promise<Object>}
 */
export async function getMemo(id) {
    const db = await initDB();
    return db.get(STORE_NAME, id);
}

/**
 * Update an existing memo
 * @param {number} id
 * @param {Object} updates
 */
export async function updateMemo(id, updates) {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.store;

    const memo = await store.get(id);
    if (!memo) throw new Error(`Memo with ID ${id} not found`);

    const updatedMemo = {
        ...memo,
        ...updates,
        updatedAt: new Date(),
    };

    await store.put(updatedMemo);
    return updatedMemo;
}

/**
 * Delete a memo by ID
 * @param {number} id
 */
export async function deleteMemo(id) {
    const db = await initDB();
    return db.delete(STORE_NAME, id);
}

/**
 * Mark a memo as exported to Sheets
 * @param {number} id - Memo ID
 */
export async function markAsExported(id) {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.store;

    const memo = await store.get(id);
    if (!memo) throw new Error(`Memo with ID ${id} not found`);

    memo.exportedToSheets = true;
    memo.exportedAt = new Date();

    await store.put(memo);
    return memo;
}
