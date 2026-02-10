/**
 * Shift Utilities
 * シフト関連のユーティリティ関数
 */

/**
 * 指定された日付が含まれる週の開始日(月曜日)を取得
 * @param {Date} date - 基準日
 * @returns {Date} - 週の開始日(月曜日)
 */
export function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day; // 日曜日の場合は-6、それ以外は1-day
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

/**
 * 指定された日付が含まれる週の終了日(日曜日)を取得
 * @param {Date} date - 基準日
 * @returns {Date} - 週の終了日(日曜日)
 */
export function getWeekEnd(date) {
    const start = getWeekStart(date);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return end;
}

/**
 * 週の全ての日付を配列で取得
 * @param {Date} weekStart - 週の開始日
 * @returns {Array<Date>} - 7日分の日付配列
 */
export function getWeekDays(weekStart) {
    const days = [];
    for (let i = 0; i < 7; i++) {
        const day = new Date(weekStart);
        day.setDate(weekStart.getDate() + i);
        days.push(day);
    }
    return days;
}

/**
 * 日付を YYYY-MM-DD 形式にフォーマット
 * @param {Date} date - 日付
 * @returns {string} - フォーマットされた日付文字列
 */
export function formatDateYMD(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * 日付を M/D 形式にフォーマット
 * @param {Date} date - 日付
 * @returns {string} - フォーマットされた日付文字列
 */
export function formatDateMD(date) {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}/${day}`;
}

/**
 * 時刻を HH:MM 形式にフォーマット
 * @param {string} time - 時刻文字列 (例: "07:00", "7:00") または ISO形式の日付文字列
 * @returns {string} - フォーマットされた時刻文字列
 */
export function formatTime(time) {
    if (!time || time === '-') return '-';

    // ISO形式の日付文字列の場合、時刻部分を抽出
    if (typeof time === 'string' && time.includes('T')) {
        try {
            const date = new Date(time);
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return `${hours}:${minutes}`;
        } catch (e) {
            console.warn('時刻の変換に失敗:', time, e);
            return '-';
        }
    }

    const parts = String(time).split(':');
    if (parts.length !== 2) return time;
    const hour = String(parts[0]).padStart(2, '0');
    const minute = String(parts[1]).padStart(2, '0');
    return `${hour}:${minute}`;
}

/**
 * シフト種別に応じた色を取得
 * @param {string} shiftType - シフト種別
 * @returns {string} - CSS color class
 */
export function getShiftColor(shiftType) {
    const type = (shiftType || '').toLowerCase();

    if (type.includes('早番') || type.includes('早')) {
        return 'shift-early'; // 青系
    } else if (type.includes('遅番') || type.includes('遅')) {
        return 'shift-late'; // オレンジ系
    } else if (type.includes('夜勤') || type.includes('夜')) {
        return 'shift-night'; // 紫系
    } else if (type.includes('休') || type.includes('off')) {
        return 'shift-off'; // グレー系
    } else {
        return 'shift-other'; // 緑系
    }
}

/**
 * シフトデータから一意のスタッフリストを取得
 * @param {Array<Object>} shifts - シフトデータ配列
 * @returns {Array<string>} - スタッフ名の配列
 */
export function getUniqueStaff(shifts) {
    const staffSet = new Set();
    shifts.forEach(shift => {
        if (shift.スタッフ || shift.staff) {
            staffSet.add(shift.スタッフ || shift.staff);
        }
    });
    return Array.from(staffSet).sort();
}

/**
 * 指定された日付のシフトをフィルター
 * @param {Array<Object>} shifts - シフトデータ配列
 * @param {Date} date - 日付
 * @returns {Array<Object>} - フィルターされたシフト配列
 */
export function getShiftsByDate(shifts, date) {
    const dateStr = formatDateYMD(date);
    return shifts.filter(shift => {
        let shiftDate = shift.日付 || shift.date;

        // ISO形式の日付文字列の場合、YYYY-MM-DD部分を抽出
        if (shiftDate && typeof shiftDate === 'string' && shiftDate.includes('T')) {
            shiftDate = shiftDate.split('T')[0];
        }

        return shiftDate === dateStr;
    });
}

/**
 * 週の範囲を文字列で取得
 * @param {Date} weekStart - 週の開始日
 * @returns {string} - "YYYY年M月D日 〜 M月D日" 形式
 */
export function getWeekRangeString(weekStart) {
    const weekEnd = getWeekEnd(weekStart);
    const startYear = weekStart.getFullYear();
    const startMonth = weekStart.getMonth() + 1;
    const startDay = weekStart.getDate();
    const endMonth = weekEnd.getMonth() + 1;
    const endDay = weekEnd.getDate();

    return `${startYear}年${startMonth}月${startDay}日 〜 ${endMonth}月${endDay}日`;
}

/**
 * 今日の日付かどうかを判定
 * @param {Date} date - 判定する日付
 * @returns {boolean} - 今日の場合true
 */
export function isToday(date) {
    const today = new Date();
    return formatDateYMD(date) === formatDateYMD(today);
}
