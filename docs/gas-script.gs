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
 * レスポンスを作成
 */
function createResponse(data, statusCode = 200) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  
  // CORSヘッダーを追加
  return output;
}
