/**
 * LocalStorage管理モジュール
 * 設定やデータのキャッシュを管理
 */

const STORAGE_KEYS = {
    API_KEY: 'care_dashboard_api_key',
    SPREADSHEET_ID: 'care_dashboard_spreadsheet_id',
    SHEET_NAME: 'care_dashboard_sheet_name',
    AUTO_REFRESH_INTERVAL: 'care_dashboard_auto_refresh_interval',
    GAS_URL: 'care_dashboard_gas_url', // Google Apps Script Web App URL
    USE_GAS: 'care_dashboard_use_gas', // GASを使用するかどうか
    CACHED_DATA: 'care_dashboard_cached_data',
    LAST_SYNC: 'care_dashboard_last_sync',
};

/**
 * 設定を保存
 * @param {Object} settings - 設定オブジェクト
 */
export function saveSettings(settings) {
    if (settings.apiKey) {
        localStorage.setItem(STORAGE_KEYS.API_KEY, settings.apiKey);
    }
    if (settings.spreadsheetId) {
        localStorage.setItem(STORAGE_KEYS.SPREADSHEET_ID, settings.spreadsheetId);
    }
    if (settings.sheetName) {
        localStorage.setItem(STORAGE_KEYS.SHEET_NAME, settings.sheetName);
    }
    if (settings.autoRefreshInterval !== undefined) {
        localStorage.setItem(STORAGE_KEYS.AUTO_REFRESH_INTERVAL, settings.autoRefreshInterval);
    }
    if (settings.gasUrl !== undefined) {
        localStorage.setItem(STORAGE_KEYS.GAS_URL, settings.gasUrl);
    }
    if (settings.useGas !== undefined) {
        localStorage.setItem(STORAGE_KEYS.USE_GAS, settings.useGas ? 'true' : 'false');
    }
}

/**
 * 設定を読み込み
 * @returns {Object} - 設定オブジェクト
 */
export function loadSettings() {
    return {
        apiKey: localStorage.getItem(STORAGE_KEYS.API_KEY) || '',
        spreadsheetId: localStorage.getItem(STORAGE_KEYS.SPREADSHEET_ID) || '',
        sheetName: localStorage.getItem(STORAGE_KEYS.SHEET_NAME) || 'Sheet1',
        autoRefreshInterval: localStorage.getItem(STORAGE_KEYS.AUTO_REFRESH_INTERVAL) || '300000',
        gasUrl: localStorage.getItem(STORAGE_KEYS.GAS_URL) || '',
        useGas: localStorage.getItem(STORAGE_KEYS.USE_GAS) === 'true',
    };
}

/**
 * データをキャッシュ
 * @param {Array} data - キャッシュするデータ
 */
export function cacheData(data) {
    localStorage.setItem(STORAGE_KEYS.CACHED_DATA, JSON.stringify(data));
    localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
}

/**
 * キャッシュされたデータを取得
 * @returns {Array|null} - キャッシュされたデータ
 */
export function getCachedData() {
    const cached = localStorage.getItem(STORAGE_KEYS.CACHED_DATA);
    return cached ? JSON.parse(cached) : null;
}

/**
 * 最終同期時刻を取得
 * @returns {string|null} - 最終同期時刻
 */
export function getLastSyncTime() {
    return localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
}

/**
 * すべてのデータをクリア
 */
export function clearAllData() {
    Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
    });
}

/**
 * 設定が完了しているかチェック
 * @returns {boolean} - 設定完了/未完了
 */
export function isConfigured() {
    const settings = loadSettings();
    // GASを使う場合はGAS URLが必要、APIキーを使う場合はAPIキーとスプレッドシートIDが必要
    if (settings.useGas) {
        return !!settings.gasUrl;
    } else {
        return !!(settings.apiKey && settings.spreadsheetId);
    }
}
