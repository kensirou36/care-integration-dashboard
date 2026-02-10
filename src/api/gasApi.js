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
    // GETリクエストを使用（CORS回避）
    const encodedData = encodeURIComponent(JSON.stringify(row));
    const url = `${gasUrl}?action=appendMemo&sheetName=${encodeURIComponent(sheetName)}&data=${encodedData}`;

    const response = await fetch(url);

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
    // GETリクエストを使用（CORS回避）
    const encodedData = encodeURIComponent(JSON.stringify(rows));
    const url = `${gasUrl}?action=appendMemos&sheetName=${encodeURIComponent(sheetName)}&data=${encodedData}`;

    const response = await fetch(url);

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
            let value = row[index];

            // 日付列の処理: Google Sheetsのシリアル値またはISO文字列をYYYY-MM-DD形式に変換
            if (header === '日付') {
                if (typeof value === 'number') {
                    // シリアル値の場合: 1900年1月1日からの日数
                    // タイムゾーンオフセットを考慮してローカル時刻として変換
                    const date = new Date((value - 25569) * 86400 * 1000);
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    value = `${year}-${month}-${day}`;
                } else if (typeof value === 'string' && value.includes('T')) {
                    // ISO形式の文字列の場合: YYYY-MM-DD部分を抽出
                    value = value.split('T')[0];
                }
            }

            // 時間列の処理: Google Sheetsのシリアル値を HH:MM 形式に変換
            if ((header === '開始' || header === '終了') && typeof value === 'number') {
                // Google Sheetsの時間シリアル値(0-1の小数)を時:分に変換
                const totalMinutes = Math.round(value * 24 * 60);
                const hours = Math.floor(totalMinutes / 60);
                const minutes = totalMinutes % 60;
                value = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
            }

            obj[header] = value;
        });
        return obj;
    });
}

/**
 * GAS経由でテキストからシフトデータを抽出
 * @param {string} gasUrl - GAS Web App URL
 * @param {string} sourceSheet - ソースシート名（デフォルト: 'シフト'）
 * @returns {Promise<Object>} - 抽出結果
 */
export async function extractShiftsViaGAS(gasUrl, sourceSheet = 'シフト') {
    const url = `${gasUrl}?action=extractShifts&sourceSheet=${encodeURIComponent(sourceSheet)}`;

    const response = await fetch(url);

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
 * GAS経由でシフトデータを取得
 * @param {string} gasUrl - GAS Web App URL
 * @param {string} sheetName - シート名(デフォルト: 'シフト')
 * @returns {Promise<Array<Object>>} - シフトデータの配列
 */
export async function fetchShiftsViaGAS(gasUrl, sheetName = 'シフト') {
    const url = `${gasUrl}?action=getData&sheetName=${encodeURIComponent(sheetName)}`;

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`GAS接続エラー (${response.status}): ${response.statusText}`);
    }

    const result = await response.json();
    if (result.error) {
        throw new Error(`GASエラー: ${result.error}`);
    }

    // 2次元配列をオブジェクト配列に変換
    return convertToObjects(result.data);
}

/**
 * GAS経由でシフトを更新
 * @param {string} gasUrl - GAS Web App URL
 * @param {number} rowNumber - 行番号(1始まり、ヘッダー含む)
 * @param {Array} rowData - 更新する行データ
 * @param {string} sheetName - シート名(デフォルト: 'シフト')
 * @returns {Promise<Object>} - 更新結果
 */
export async function updateShiftViaGAS(gasUrl, rowNumber, rowData, sheetName = 'シフト') {
    const encodedData = encodeURIComponent(JSON.stringify(rowData));
    const url = `${gasUrl}?action=updateShift&sheetName=${encodeURIComponent(sheetName)}&rowNumber=${rowNumber}&data=${encodedData}`;

    const response = await fetch(url);

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
 * GAS経由でシフトを削除
 * @param {string} gasUrl - GAS Web App URL
 * @param {number} rowNumber - 行番号(1始まり、ヘッダー含む)
 * @param {string} sheetName - シート名(デフォルト: 'シフト')
 * @returns {Promise<Object>} - 削除結果
 */
export async function deleteShiftViaGAS(gasUrl, rowNumber, sheetName = 'シフト') {
    const url = `${gasUrl}?action=deleteShift&sheetName=${encodeURIComponent(sheetName)}&rowNumber=${rowNumber}`;

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`GAS接続エラー (${response.status}): ${response.statusText}`);
    }

    const data = await response.json();
    if (data.error) {
        throw new Error(`GASエラー: ${data.error}`);
    }

    return data;
}
