/**
 * Google Apps Script for Care Integration Dashboard
 * このスクリプトをGoogle Sheetsに追加して、Web Appとしてデプロイしてください
 */

/**
 * Web Appのエンドポイント（GET）
 */
function doGet(e) {
  const action = e.parameter.action;
  
  try {
    if (action === 'getSheets') {
      return getSheetsList();
    } else if (action === 'getData') {
      const sheetName = e.parameter.sheetName;
      return getSheetData(sheetName);
    } else if (action === 'getAllData') {
      return getAllSheetsData();
    } else if (action === 'appendMemo') {
      // GETでメモ追加（CORS回避用）
      const sheetName = e.parameter.sheetName || 'メモ';
      const rowData = e.parameter.data; // JSON文字列
      const row = JSON.parse(decodeURIComponent(rowData));
      return appendMemoToSheet({ sheetName: sheetName, row: row });
    } else if (action === 'appendMemos') {
      // GETで複数メモ追加（CORS回避用）
      const sheetName = e.parameter.sheetName || 'メモ';
      const rowsData = e.parameter.data; // JSON文字列
      const rows = JSON.parse(decodeURIComponent(rowsData));
      return appendMemosToSheet({ sheetName: sheetName, rows: rows });
    } else if (action === 'updateShift') {
      // シフト更新
      const sheetName = e.parameter.sheetName || 'シフト';
      const rowNumber = parseInt(e.parameter.rowNumber);
      const rowData = e.parameter.data;
      const row = JSON.parse(decodeURIComponent(rowData));
      return updateShiftRow({ sheetName: sheetName, rowNumber: rowNumber, row: row });
    } else if (action === 'deleteShift') {
      // シフト削除
      const sheetName = e.parameter.sheetName || 'シフト';
      const rowNumber = parseInt(e.parameter.rowNumber);
      return deleteShiftRow({ sheetName: sheetName, rowNumber: rowNumber });
    }
    
    return createResponse({ error: 'Invalid action' }, 400);
  } catch (error) {
    return createResponse({ error: error.toString() }, 500);
  }
}

/**
 * Web Appのエンドポイント（POST）
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    
    if (action === 'appendMemo') {
      return appendMemoToSheet(data);
    } else if (action === 'appendMemos') {
      return appendMemosToSheet(data);
    }
    
    return createResponse({ error: 'Invalid action' }, 400);
  } catch (error) {
    return createResponse({ error: error.toString() }, 500);
  }
}

/**
 * OPTIONSリクエストの処理（CORSプリフライト）
 */
function doOptions(e) {
  return createResponse({}, 200);
}

/**
 * シート一覧を取得
 */
function getSheetsList() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ss.getSheets();
  
  const sheetList = sheets.map(sheet => ({
    title: sheet.getName(),
    index: sheet.getIndex(),
    rowCount: sheet.getLastRow(),
    columnCount: sheet.getLastColumn()
  }));
  
  return createResponse({ sheets: sheetList });
}

/**
 * 特定のシートのデータを取得
 */
function getSheetData(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    return createResponse({ error: 'Sheet not found: ' + sheetName }, 404);
  }
  
  const data = sheet.getDataRange().getValues();
  
  return createResponse({
    sheetName: sheetName,
    data: data
  });
}

/**
 * すべてのシートのデータを取得
 */
function getAllSheetsData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ss.getSheets();
  
  const allData = {};
  
  sheets.forEach(sheet => {
    const sheetName = sheet.getName();
    const data = sheet.getDataRange().getValues();
    allData[sheetName] = data;
  });
  
  return createResponse({ data: allData });
}

/**
 * メモを1件追加
 */
function appendMemoToSheet(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetName = data.sheetName || 'メモ';
  
  let sheet = ss.getSheetByName(sheetName);
  
  // シートが存在しない場合は作成
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    // ヘッダー行を追加
    sheet.appendRow(['作成日時', 'テキスト内容', '画像サイズ', 'エクスポート日時']);
  }
  
  // メモデータを追加
  const row = data.row; // [作成日時, テキスト, 画像サイズ, エクスポート日時]
  sheet.appendRow(row);
  
  return createResponse({
    success: true,
    sheetName: sheetName,
    rowAdded: sheet.getLastRow()
  });
}

/**
 * メモを複数件追加
 */
function appendMemosToSheet(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetName = data.sheetName || 'メモ';
  
  let sheet = ss.getSheetByName(sheetName);
  
  // シートが存在しない場合は作成
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    // ヘッダー行を追加
    sheet.appendRow(['作成日時', 'テキスト内容', '画像サイズ', 'エクスポート日時']);
  }
  
  // メモデータを追加
  const rows = data.rows; // [[作成日時, テキスト, 画像サイズ, エクスポート日時], ...]
  rows.forEach(row => {
    sheet.appendRow(row);
  });
  
  return createResponse({
    success: true,
    sheetName: sheetName,
    count: rows.length,
    lastRow: sheet.getLastRow()
  });
}

/**
 * レスポンスを作成（CORSヘッダー付き）
 */
function createResponse(data, statusCode = 200) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  
  // CORSヘッダーを追加（重要: localhostと本番環境の両方で動作するように）
  // Note: Apps ScriptのContentServiceではHTTPヘッダーを直接設定できないため、
  // デプロイ時の設定で「アクセスできるユーザー: 全員」にすることでCORSが許可されます
  
  return output;
}

/**
 * シフトの行を更新
 */
function updateShiftRow(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetName = data.sheetName || 'シフト';
  
  let sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    return createResponse({ error: 'Sheet not found: ' + sheetName }, 404);
  }
  
  const rowNumber = data.rowNumber; // 1始まり
  const row = data.row; // [日付, スタッフ, シフト, 開始, 終了, 備考]
  
  // 行を更新
  const range = sheet.getRange(rowNumber, 1, 1, row.length);
  range.setValues([row]);
  
  return createResponse({
    success: true,
    sheetName: sheetName,
    rowNumber: rowNumber
  });
}

/**
 * シフトの行を削除
 */
function deleteShiftRow(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetName = data.sheetName || 'シフト';
  
  let sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    return createResponse({ error: 'Sheet not found: ' + sheetName }, 404);
  }
  
  const rowNumber = data.rowNumber; // 1始まり
  
  // 行を削除
  sheet.deleteRow(rowNumber);
  
  return createResponse({
    success: true,
    sheetName: sheetName,
    rowNumber: rowNumber
  });
}
