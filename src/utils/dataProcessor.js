/**
 * データ処理ユーティリティ
 * フィルター、ソート、検索、統計計算
 */

/**
 * データをフィルター
 * @param {Array} data - フィルター対象データ
 * @param {Object} filters - フィルター条件
 * @returns {Array} - フィルター後のデータ
 */
export function filterData(data, filters) {
    if (!data || data.length === 0) return [];
    if (!filters || Object.keys(filters).length === 0) return data;

    return data.filter(item => {
        return Object.entries(filters).every(([key, value]) => {
            if (!value) return true; // フィルター条件が空の場合はスキップ

            const itemValue = String(item[key] || '').toLowerCase();
            const filterValue = String(value).toLowerCase();

            return itemValue.includes(filterValue);
        });
    });
}

/**
 * データをソート
 * @param {Array} data - ソート対象データ
 * @param {string} key - ソートキー
 * @param {string} direction - ソート方向 ('asc' or 'desc')
 * @returns {Array} - ソート後のデータ
 */
export function sortData(data, key, direction = 'asc') {
    if (!data || data.length === 0) return [];
    if (!key) return data;

    const sorted = [...data].sort((a, b) => {
        const aValue = a[key] || '';
        const bValue = b[key] || '';

        // 数値の場合
        if (!isNaN(aValue) && !isNaN(bValue)) {
            return direction === 'asc'
                ? Number(aValue) - Number(bValue)
                : Number(bValue) - Number(aValue);
        }

        // 文字列の場合
        const comparison = String(aValue).localeCompare(String(bValue), 'ja');
        return direction === 'asc' ? comparison : -comparison;
    });

    return sorted;
}

/**
 * データを検索
 * @param {Array} data - 検索対象データ
 * @param {string} query - 検索クエリ
 * @returns {Array} - 検索結果
 */
export function searchData(data, query) {
    if (!data || data.length === 0) return [];
    if (!query || query.trim() === '') return data;

    const searchTerm = query.toLowerCase().trim();

    return data.filter(item => {
        return Object.values(item).some(value => {
            return String(value).toLowerCase().includes(searchTerm);
        });
    });
}

/**
 * データ統計を計算
 * @param {Array} data - 統計対象データ
 * @returns {Object} - 統計情報
 */
export function calculateStats(data) {
    if (!data || data.length === 0) {
        return {
            total: 0,
            today: 0,
            thisWeek: 0,
            thisMonth: 0,
        };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    // 日付フィールドを探す
    const dateFields = ['日付', 'date', '日時', 'datetime', '作成日'];
    const dateField = Object.keys(data[0] || {}).find(key =>
        dateFields.some(field => key.toLowerCase().includes(field.toLowerCase()))
    );

    let todayCount = 0;
    let weekCount = 0;
    let monthCount = 0;

    if (dateField) {
        data.forEach(item => {
            const itemDate = new Date(item[dateField]);
            if (isNaN(itemDate.getTime())) return;

            if (itemDate >= today) todayCount++;
            if (itemDate >= weekStart) weekCount++;
            if (itemDate >= monthStart) monthCount++;
        });
    }

    return {
        total: data.length,
        today: todayCount,
        thisWeek: weekCount,
        thisMonth: monthCount,
    };
}

/**
 * データを検証
 * @param {Array} data - 検証対象データ
 * @returns {Object} - 検証結果
 */
export function validateData(data) {
    const errors = [];
    const warnings = [];

    if (!data || !Array.isArray(data)) {
        errors.push('データが配列ではありません');
        return { valid: false, errors, warnings };
    }

    if (data.length === 0) {
        warnings.push('データが空です');
        return { valid: true, errors, warnings };
    }

    // ヘッダーチェック
    const firstRow = data[0];
    if (!firstRow || typeof firstRow !== 'object') {
        errors.push('データ形式が不正です');
        return { valid: false, errors, warnings };
    }

    const keys = Object.keys(firstRow);
    if (keys.length === 0) {
        errors.push('フィールドが存在しません');
        return { valid: false, errors, warnings };
    }

    // 空のフィールド名チェック
    const emptyKeys = keys.filter(key => !key || key.trim() === '');
    if (emptyKeys.length > 0) {
        warnings.push(`空のフィールド名が${emptyKeys.length}個あります`);
    }

    // データの一貫性チェック
    const inconsistentRows = data.filter((row, index) => {
        const rowKeys = Object.keys(row);
        return rowKeys.length !== keys.length;
    });

    if (inconsistentRows.length > 0) {
        warnings.push(`${inconsistentRows.length}行のフィールド数が一致しません`);
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings,
    };
}

/**
 * 日付フォーマット
 * @param {string} dateString - 日付文字列
 * @returns {string} - フォーマット済み日付
 */
export function formatDate(dateString) {
    if (!dateString) return '-';

    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;

    return date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });
}

/**
 * 時刻フォーマット
 * @param {string} timeString - 時刻文字列
 * @returns {string} - フォーマット済み時刻
 */
export function formatTime(timeString) {
    if (!timeString) return '-';

    const date = new Date(timeString);
    if (isNaN(date.getTime())) return timeString;

    return date.toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit',
    });
}
