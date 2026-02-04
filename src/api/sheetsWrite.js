/**
 * Google Sheets Write API Module
 * Handles writing memo data to Google Sheets
 */

const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

/**
 * Append rows to a sheet
 * @param {string} apiKey - Google Sheets APIキー
 * @param {string} spreadsheetId - スプレッドシートID
 * @param {string} sheetName - シート名
 * @param {Array<Array>} values - 追加する値の2次元配列
 * @returns {Promise<Object>} - API応答
 */
export async function appendToSheet(apiKey, spreadsheetId, sheetName, values) {
    const range = `${sheetName}!A1`;
    const url = `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&key=${apiKey}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            values: values
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Sheetsへの書き込みに失敗しました');
    }

    return response.json();
}

/**
 * Check if a sheet exists
 * @param {string} apiKey - Google Sheets APIキー
 * @param {string} spreadsheetId - スプレッドシートID
 * @param {string} sheetName - シート名
 * @returns {Promise<boolean>} - シートが存在するか
 */
export async function sheetExists(apiKey, spreadsheetId, sheetName) {
    const url = `${SHEETS_API_BASE}/${spreadsheetId}?key=${apiKey}`;

    try {
        const response = await fetch(url);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`;
            throw new Error(`メタデータの取得に失敗しました: ${errorMessage}`);
        }

        const data = await response.json();
        return data.sheets?.some(sheet => sheet.properties.title === sheetName) || false;
    } catch (error) {
        console.error('sheetExists error:', error);
        throw error;
    }
}

/**
 * Create a new sheet (requires OAuth, not API key)
 * Note: This function requires OAuth authentication, not just API key
 * For now, we'll guide users to create the sheet manually
 * @param {string} spreadsheetId - スプレッドシートID
 * @param {string} sheetName - シート名
 */
export async function createSheet(spreadsheetId, sheetName) {
    throw new Error('シートの自動作成にはOAuth認証が必要です。手動で「' + sheetName + '」という名前のシートを作成してください。');
}

/**
 * Format memo data for Google Sheets export
 * @param {Object} memo - メモオブジェクト
 * @returns {Array} - Sheets用の行データ
 */
export function formatMemoForExport(memo) {
    const createdAt = new Date(memo.createdAt).toLocaleString('ja-JP');
    const text = memo.text || '(テキストなし)';
    const imageSize = memo.imageBlob ? `${(memo.imageBlob.size / 1024 / 1024).toFixed(2)}MB` : '-';
    const exportedAt = new Date().toLocaleString('ja-JP');

    return [createdAt, text, imageSize, exportedAt];
}

/**
 * Export a single memo to Google Sheets
 * @param {string} apiKey - Google Sheets APIキー
 * @param {string} spreadsheetId - スプレッドシートID
 * @param {Object} memo - メモオブジェクト
 * @param {string} sheetName - エクスポート先シート名 (デフォルト: 'メモ')
 * @returns {Promise<Object>} - エクスポート結果
 */
export async function exportMemoToSheets(apiKey, spreadsheetId, memo, sheetName = 'メモ') {
    // シートの存在確認
    const exists = await sheetExists(apiKey, spreadsheetId, sheetName);

    if (!exists) {
        // ヘッダー行を含めて作成
        const header = ['作成日時', 'テキスト内容', '画像サイズ', 'エクスポート日時'];
        const memoRow = formatMemoForExport(memo);
        await appendToSheet(apiKey, spreadsheetId, sheetName, [header, memoRow]);
    } else {
        // データ行のみ追加
        const memoRow = formatMemoForExport(memo);
        await appendToSheet(apiKey, spreadsheetId, sheetName, [memoRow]);
    }

    return { success: true, sheetName };
}

/**
 * Export multiple memos to Google Sheets
 * @param {string} apiKey - Google Sheets APIキー
 * @param {string} spreadsheetId - スプレッドシートID
 * @param {Array<Object>} memos - メモオブジェクトの配列
 * @param {string} sheetName - エクスポート先シート名 (デフォルト: 'メモ')
 * @returns {Promise<Object>} - エクスポート結果
 */
export async function exportMemosToSheets(apiKey, spreadsheetId, memos, sheetName = 'メモ') {
    if (memos.length === 0) {
        throw new Error('エクスポートするメモがありません');
    }

    // シートの存在確認
    const exists = await sheetExists(apiKey, spreadsheetId, sheetName);

    const rows = memos.map(memo => formatMemoForExport(memo));

    if (!exists) {
        // ヘッダー行を含めて作成
        const header = ['作成日時', 'テキスト内容', '画像サイズ', 'エクスポート日時'];
        await appendToSheet(apiKey, spreadsheetId, sheetName, [header, ...rows]);
    } else {
        // データ行のみ追加
        await appendToSheet(apiKey, spreadsheetId, sheetName, rows);
    }

    return { success: true, count: memos.length, sheetName };
}
