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
    } else if (action === 'extractShifts') {
      // テキストからシフトデータを抽出
      const sourceSheet = e.parameter.sourceSheet || 'シフト';
      return extractAndSaveShifts({ sourceSheet: sourceSheet });
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

/**
 * テキストからシフトデータを抽出して保存
 */
function extractAndSaveShifts(params) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sourceSheetName = params.sourceSheet || 'シフト';
  const sourceSheet = ss.getSheetByName(sourceSheetName);
  
  if (!sourceSheet) {
    return createResponse({ error: 'Source sheet not found: ' + sourceSheetName }, 404);
  }
  
  // B列(テキスト内容)とA列(作成日時)を取得
  const lastRow = sourceSheet.getLastRow();
  if (lastRow < 2) {
    return createResponse({ error: 'No data to extract' }, 400);
  }
  
  const data = sourceSheet.getRange(2, 1, lastRow - 1, 2).getValues();
  
  const extractedShifts = [];
  let currentDate = null;
  
  data.forEach(row => {
    const [createdDate, textContent] = row;
    if (!textContent) return;
    
    const text = textContent.toString().trim();
    
    // 日付行を検出 (例: "2/4(火)")
    const dateMatch = text.match(/^(\d{1,2})\/(\d{1,2})/);
    if (dateMatch) {
      const month = parseInt(dateMatch[1]);
      const day = parseInt(dateMatch[2]);
      const year = createdDate ? new Date(createdDate).getFullYear() : new Date().getFullYear();
      currentDate = Utilities.formatDate(new Date(year, month - 1, day), 'JST', 'yyyy-MM-dd');
      return;
    }
    
    // シフト情報を抽出
    const shift = extractShiftFromText(text, currentDate || createdDate);
    if (shift.日付 && shift.スタッフ) {
      extractedShifts.push(shift);
    }
  });
  
  // 「シフト」シートに書き込み
  let shiftSheet = ss.getSheetByName('シフト');
  if (!shiftSheet) {
    shiftSheet = ss.insertSheet('シフト');
    shiftSheet.appendRow(['日付', 'スタッフ', 'シフト', '開始', '終了', '備考']);
  }
  
  // 既存データをクリア(ヘッダー以外)
  if (shiftSheet.getLastRow() > 1) {
    shiftSheet.getRange(2, 1, shiftSheet.getLastRow() - 1, 6).clearContent();
  }
  
  // 新しいデータを追加
  extractedShifts.forEach(shift => {
    shiftSheet.appendRow([
      shift.日付,
      shift.スタッフ,
      shift.シフト,
      shift.開始,
      shift.終了,
      shift.備考
    ]);
  });
  
  return createResponse({
    success: true,
    count: extractedShifts.length,
    message: extractedShifts.length + '件のシフトを抽出しました'
  });
}

/**
 * テキストからシフト情報を抽出
 */
function extractShiftFromText(text, baseDate) {
  const result = {
    日付: null,
    スタッフ: null,
    シフト: 'ヘルパー',
    開始: '-',
    終了: '-',
    備考: text
  };
  
  // 日付抽出: "2 月 10 日"
  const dateMatch = text.match(/(\d{1,2})\s*月\s*(\d{1,2})\s*日/);
  if (dateMatch) {
    const month = parseInt(dateMatch[1]);
    const day = parseInt(dateMatch[2]);
    const year = baseDate ? new Date(baseDate).getFullYear() : new Date().getFullYear();
    result.日付 = Utilities.formatDate(new Date(year, month - 1, day), 'JST', 'yyyy-MM-dd');
  } else if (baseDate) {
    // 日付が見つからない場合はbaseDateを使用
    if (typeof baseDate === 'string') {
      result.日付 = baseDate;
    } else {
      result.日付 = Utilities.formatDate(new Date(baseDate), 'JST', 'yyyy-MM-dd');
    }
  }
  
  
  // スタッフ名抽出: テキストの先頭から抽出
  // 例: "後藤　2月10日..." -> "後藤"
  // 例: "田中さん_家_..." -> "田中"
  const staffPattern = /^([^\s　_\d]+)(?:さん)?/;  // 全角・半角スペース、アンダースコア、数字の前まで
  const staffMatch = text.match(staffPattern);
  if (staffMatch) {
    result.スタッフ = staffMatch[1].replace(/さん$/, '');
  }
  
  // 介護先/場所を抽出して備考に追加
  // 例: "田中さん家" "佐藤さん宅" など
  const locationPattern = /([^\s　]+(?:さん|様)(?:家|宅|方))/;
  const locationMatch = text.match(locationPattern);
  if (locationMatch) {
    result.備考 = locationMatch[1] + ' - ' + text;
  }
  }
  
  // 時間抽出: 複数のパターンに対応
  let timeExtracted = false;
  
  // パターン1: "12時から15時" "12時から15時まで" "12 時から 15 時" (全角・半角スペース対応)
  const timePattern1 = /(\d{1,2})\s*時(?:\s*(\d{1,2})\s*分)?(?:から|～)\s*(\d{1,2})\s*時(?:\s*(\d{1,2})\s*分)?/;
  const timeMatch1 = text.match(timePattern1);
  if (timeMatch1) {
    const startHour = timeMatch1[1].padStart(2, '0');
    const startMin = (timeMatch1[2] || '00').padStart(2, '0');
    const endHour = timeMatch1[3].padStart(2, '0');
    const endMin = (timeMatch1[4] || '00').padStart(2, '0');
    result.開始 = startHour + ':' + startMin;
    result.終了 = endHour + ':' + endMin;
    timeExtracted = true;
  }
  
  // パターン2: "18時-19時" または "18:00-19:00"
  if (!timeExtracted) {
    const timePattern2 = /(\d{1,2})[:時]\s*(\d{1,2})?\s*[-～]\s*(\d{1,2})[:時]\s*(\d{1,2})?/;
    const timeMatch2 = text.match(timePattern2);
    if (timeMatch2) {
      const startHour = timeMatch2[1].padStart(2, '0');
      const startMin = (timeMatch2[2] || '00').padStart(2, '0');
      const endHour = timeMatch2[3].padStart(2, '0');
      const endMin = (timeMatch2[4] || '00').padStart(2, '0');
      result.開始 = startHour + ':' + startMin;
      result.終了 = endHour + ':' + endMin;
      timeExtracted = true;
    }
  }
  
  // パターン3: "12時15" のような形式（終了時刻なし）
  if (!timeExtracted) {
    const timePattern3 = /(\d{1,2})\s*時\s*(\d{1,2})/;
    const timeMatch3 = text.match(timePattern3);
    if (timeMatch3) {
      const hour = timeMatch3[1].padStart(2, '0');
      const min = timeMatch3[2].padStart(2, '0');
      result.開始 = hour + ':' + min;
      // 終了時刻は1時間後と仮定
      const endHour = (parseInt(timeMatch3[1]) + 1).toString().padStart(2, '0');
      result.終了 = endHour + ':' + min;
      timeExtracted = true;
    }
  }
  
  // パターン4: "18時" のみ（分なし）
  if (!timeExtracted) {
    const timePattern4 = /(\d{1,2})\s*時/;
    const timeMatch4 = text.match(timePattern4);
    if (timeMatch4) {
      const hour = timeMatch4[1].padStart(2, '0');
      result.開始 = hour + ':00';
      // 終了時刻は1時間後と仮定
      const endHour = (parseInt(timeMatch4[1]) + 1).toString().padStart(2, '0');
      result.終了 = endHour + ':00';
      timeExtracted = true;
    }
  }
  
  // シフト種別抽出
  if (text.includes('ヘルパー')) {
    result.シフト = 'ヘルパー';
  } else if (text.includes('訪問')) {
    result.シフト = '訪問';
  } else if (text.includes('デイ')) {
    result.シフト = 'デイ';
  }
  
  return result;
}
