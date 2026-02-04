/**
 * Google Apps Script API Wrapper
 * GAS Web Appを経由してGoogle Sheetsにアクセス
 */

/**
 * GAS経由でシート一覧を取得
 * @param {string} gasUrl - GAS Web App URL
 * @returns {Promise<Array>} - シート一覧
 */
export async function fetchSheetListViaGAS(gasUrl) {
    const url = `${gasUrl}?action=getSheets`;

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`GAS接続エラー (${response.status}): ${response.statusText}`);
    }

    const data = await response.json();
    if (data.error) {
        throw new Error(`GASエラー: ${data.error}`);
    }

    return data.sheets;
}

/**
 * GAS経由で特定のシートのデータを取得
 * @param {string} gasUrl - GAS Web App URL
 * @param {string} sheetName - シート名
 * @returns {Promise<Array<Array>>} - シートデータ（2次元配列）
 */
export async function fetchSheetDataViaGAS(gasUrl, sheetName) {
    const url = `${gasUrl}?action=getData&sheetName=${encodeURIComponent(sheetName)}`;

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`GAS接続エラー (${response.status}): ${response.statusText}`);
    }

    const data = await response.json();
    if (data.error) {
        throw new Error(`GASエラー: ${data.error}`);
    }

    return data.data;
}

/**
 * GAS経由ですべてのシートのデータを取得
 * @param {string} gasUrl - GAS Web App URL
 * @returns {Promise<Object>} - シート名をキーとしたデータオブジェクト
 */
export async function fetchAllSheetsViaGAS(gasUrl) {
    const url = `${gasUrl}?action=getAllData`;

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`GAS接続エラー (${response.status}): ${response.statusText}`);
    }

    const result = await response.json();
    if (result.error) {
        throw new Error(`GASエラー: ${result.error}`);
    }

    // データを変換（2次元配列 → オブジェクト配列）
    const allData = {};
    for (const [sheetName, rawData] of Object.entries(result.data)) {
        allData[sheetName] = convertToObjects(rawData);
    }

    return allData;
}

/**
 * GAS経由でメモを1件追加
 * @param {string} gasUrl - GAS Web App URL
 * @param {Array} row - メモデータの行
 * @param {string} sheetName - シート名（デフォルト: 'メモ'）
 * @returns {Promise<Object>} - 追加結果
 */
export async function appendMemoViaGAS(gasUrl, row, sheetName = 'メモ') {
    const response = await fetch(gasUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            action: 'appendMemo',
            sheetName: sheetName,
            row: row
        })
    });

    if (!response.ok) {
        throw new Error(`GAS接続エラー (${response.status}): ${response.statusText}`);
    }

    const data = await response.json();
    if (data.error) {
        throw new Error(`GASエラー: ${data.error}`);
    }

    return data;
}

/**
 * GAS経由でメモを複数件追加
 * @param {string} gasUrl - GAS Web App URL
 * @param {Array<Array>} rows - メモデータの行配列
 * @param {string} sheetName - シート名（デフォルト: 'メモ'）
 * @returns {Promise<Object>} - 追加結果
 */
export async function appendMemosViaGAS(gasUrl, rows, sheetName = 'メモ') {
    const response = await fetch(gasUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            action: 'appendMemos',
            sheetName: sheetName,
            rows: rows
        })
    });

    if (!response.ok) {
        throw new Error(`GAS接続エラー (${response.status}): ${response.statusText}`);
    }

    const data = await response.json();
    if (data.error) {
        throw new Error(`GASエラー: ${data.error}`);
    }

    return data;
}

/**
 * 2次元配列をオブジェクト配列に変換
 * @param {Array<Array>} data - 2次元配列（1行目がヘッダー）
 * @returns {Array<Object>} - オブジェクト配列
 */
function convertToObjects(data) {
    if (!data || data.length === 0) return [];

    const headers = data[0];
    const rows = data.slice(1);

    return rows.map(row => {
        const obj = {};
        headers.forEach((header, index) => {
            obj[header] = row[index];
        });
        return obj;
    });
}
