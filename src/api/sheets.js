/**
 * Google Sheets API連携モジュール
 * Google Sheets API v4を使用してスプレッドシートからデータを取得
 */

const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

/**
 * Google Sheetsからデータを取得
 * @param {string} apiKey - Google Sheets APIキー
 * @param {string} spreadsheetId - スプレッドシートID
 * @param {string} range - 取得範囲 (例: 'Sheet1!A1:Z1000')
 * @returns {Promise<Array>} - 取得したデータ
 */
export async function fetchSheetData(apiKey, spreadsheetId, range) {
  if (!apiKey || !spreadsheetId || !range) {
    throw new Error('APIキー、スプレッドシートID、範囲が必要です');
  }

  const url = `${SHEETS_API_BASE}/${spreadsheetId}/values/${range}?key=${apiKey}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 403) {
        throw new Error('APIキーが無効です。Google Cloud ConsoleでAPIキーを確認してください。');
      } else if (response.status === 404) {
        throw new Error('スプレッドシートが見つかりません。IDを確認してください。');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'データ取得に失敗しました');
      }
    }

    const data = await response.json();
    return data.values || [];
  } catch (error) {
    console.error('Google Sheets API エラー:', error);
    throw error;
  }
}

/**
 * スプレッドシートのメタデータを取得
 * @param {string} apiKey - Google Sheets APIキー
 * @param {string} spreadsheetId - スプレッドシートID
 * @returns {Promise<Object>} - スプレッドシートのメタデータ
 */
export async function fetchSpreadsheetMetadata(apiKey, spreadsheetId) {
  if (!apiKey || !spreadsheetId) {
    throw new Error('APIキーとスプレッドシートIDが必要です');
  }

  const url = `${SHEETS_API_BASE}/${spreadsheetId}?key=${apiKey}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      // 詳細なエラー情報を取得
      let errorDetails = '';
      try {
        const errorData = await response.json();
        errorDetails = errorData.error?.message || JSON.stringify(errorData);
      } catch (e) {
        errorDetails = response.statusText;
      }

      throw new Error(`メタデータの取得に失敗しました (${response.status}): ${errorDetails}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('メタデータ取得エラー:', error);
    console.error('URL:', url);
    console.error('APIキー (最初の10文字):', apiKey?.substring(0, 10) + '...');
    console.error('スプレッドシートID:', spreadsheetId);
    throw error;
  }
}

/**
 * データを行オブジェクトの配列に変換
 * 1行目をヘッダーとして扱い、各行をオブジェクトに変換
 * @param {Array<Array>} rawData - 生データ
 * @returns {Array<Object>} - オブジェクトの配列
 */
export function convertToObjects(rawData) {
  if (!rawData || rawData.length === 0) {
    return [];
  }

  const headers = rawData[0];
  const rows = rawData.slice(1);

  return rows.map(row => {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index] || '';
    });
    return obj;
  });
}

/**
 * 接続テスト
 * @param {string} apiKey - Google Sheets APIキー
 * @param {string} spreadsheetId - スプレッドシートID
 * @param {string} sheetName - シート名
 * @returns {Promise<boolean>} - 接続成功/失敗
 */
export async function testConnection(apiKey, spreadsheetId, sheetName) {
  try {
    const range = `${sheetName}!A1:Z10`;
    await fetchSheetData(apiKey, spreadsheetId, range);
    return true;
  } catch (error) {
    console.error('接続テスト失敗:', error);
    throw error;
  }
}

/**
 * シート一覧を取得
 * @param {string} apiKey - Google Sheets APIキー
 * @param {string} spreadsheetId - スプレッドシートID
 * @returns {Promise<Array>} - シート一覧
 */
export async function fetchSheetList(apiKey, spreadsheetId) {
  try {
    const metadata = await fetchSpreadsheetMetadata(apiKey, spreadsheetId);

    if (!metadata.sheets || metadata.sheets.length === 0) {
      return [];
    }

    return metadata.sheets.map(sheet => ({
      id: sheet.properties.sheetId,
      title: sheet.properties.title,
      index: sheet.properties.index,
      rowCount: sheet.properties.gridProperties?.rowCount || 0,
      columnCount: sheet.properties.gridProperties?.columnCount || 0,
    }));
  } catch (error) {
    console.error('シート一覧取得エラー:', error);
    throw error;
  }
}

/**
 * 複数シートのデータを同時取得
 * @param {string} apiKey - Google Sheets APIキー
 * @param {string} spreadsheetId - スプレッドシートID
 * @param {Array<string>} sheetNames - シート名の配列
 * @returns {Promise<Object>} - シート名をキーとしたデータオブジェクト
 */
export async function fetchMultipleSheets(apiKey, spreadsheetId, sheetNames) {
  if (!sheetNames || sheetNames.length === 0) {
    throw new Error('シート名が指定されていません');
  }

  try {
    const promises = sheetNames.map(async (sheetName) => {
      const range = `${sheetName}!A1:Z1000`;
      const rawData = await fetchSheetData(apiKey, spreadsheetId, range);
      const data = convertToObjects(rawData);
      return { sheetName, data };
    });

    const results = await Promise.all(promises);

    const sheetsData = {};
    results.forEach(({ sheetName, data }) => {
      sheetsData[sheetName] = data;
    });

    return sheetsData;
  } catch (error) {
    console.error('複数シート取得エラー:', error);
    throw error;
  }
}

/**
 * すべてのシートのデータを取得
 * @param {string} apiKey - Google Sheets APIキー
 * @param {string} spreadsheetId - スプレッドシートID
 * @returns {Promise<Object>} - すべてのシートのデータ
 */
export async function fetchAllSheets(apiKey, spreadsheetId) {
  try {
    const sheetList = await fetchSheetList(apiKey, spreadsheetId);
    const sheetNames = sheetList.map(sheet => sheet.title);
    return await fetchMultipleSheets(apiKey, spreadsheetId, sheetNames);
  } catch (error) {
    console.error('全シート取得エラー:', error);
    throw error;
  }
}

