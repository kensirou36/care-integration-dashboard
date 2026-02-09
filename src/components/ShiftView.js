/**
 * Shift View Component
 * シフトカレンダーの表示とナビゲーション
 */

import {
    getWeekStart,
    getWeekEnd,
    getWeekDays,
    formatDateYMD,
    formatDateMD,
    formatTime,
    getShiftColor,
    getShiftsByDate,
    getWeekRangeString,
    isToday
} from '../utils/shiftUtils.js';

export class ShiftView {
    constructor(containerId, onNewShiftClick, onShiftClick, onRefresh = null) {
        this.container = document.getElementById(containerId);
        this.onNewShiftClick = onNewShiftClick;
        this.onShiftClick = onShiftClick;
        this.onRefresh = onRefresh;
        this.currentWeekStart = getWeekStart(new Date());
        this.shifts = [];
    }

    /**
     * シフトデータを設定
     * @param {Array<Object>} shifts - シフトデータ配列
     */
    setShifts(shifts) {
        this.shifts = shifts || [];
        this.render();
    }

    /**
     * カレンダーをレンダリング
     */
    render() {
        const weekDays = getWeekDays(this.currentWeekStart);
        const weekRangeStr = getWeekRangeString(this.currentWeekStart);

        this.container.innerHTML = `
            <div class="shift-header">
                <h2>📅 シフト管理</h2>
                <div class="shift-header-actions">
                    <button id="refreshShiftsBtn" class="btn btn-secondary" title="Google Sheetsから最新データを読み込み">
                        <span class="icon">🔄</span> <span class="text">更新</span>
                    </button>
                    <button id="newShiftBtn" class="btn btn-primary">
                        <span class="icon">➕</span> <span class="text">新規シフト</span>
                    </button>
                </div>
            </div>

            <div class="week-navigation">
                <button id="prevWeekBtn" class="btn btn-secondary">
                    <span>◀ 前週</span>
                </button>
                <div class="week-range">${weekRangeStr}</div>
                <button id="nextWeekBtn" class="btn btn-secondary">
                    <span>次週 ▶</span>
                </button>
            </div>

            <div class="calendar-container">
                <div class="calendar-grid">
                    ${this.renderCalendarHeader(weekDays)}
                    ${this.renderCalendarBody(weekDays)}
                </div>
            </div>

            ${this.shifts.length === 0 ? this.renderEmptyState() : ''}
        `;

        this.attachEventListeners();
    }

    /**
     * カレンダーヘッダーをレンダリング
     */
    renderCalendarHeader(weekDays) {
        const dayNames = ['月', '火', '水', '木', '金', '土', '日'];

        return `
            <div class="calendar-header">
                ${weekDays.map((day, index) => `
                    <div class="calendar-day-header ${isToday(day) ? 'today' : ''}">
                        <div class="day-name">${dayNames[index]}</div>
                        <div class="day-date">${formatDateMD(day)}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    /**
     * カレンダー本体をレンダリング
     */
    renderCalendarBody(weekDays) {
        return `
            <div class="calendar-body">
                ${weekDays.map(day => this.renderDayCell(day)).join('')}
            </div>
        `;
    }

    /**
     * 日付セルをレンダリング
     */
    renderDayCell(date) {
        const dayShifts = getShiftsByDate(this.shifts, date);
        const dateStr = formatDateYMD(date);

        return `
            <div class="calendar-day-cell ${isToday(date) ? 'today' : ''}" data-date="${dateStr}">
                ${dayShifts.length === 0 ?
                '<div class="no-shifts">-</div>' :
                dayShifts.map(shift => this.renderShiftCard(shift)).join('')
            }
            </div>
        `;
    }

    /**
     * シフトカードをレンダリング
     */
    renderShiftCard(shift) {
        const staff = shift.スタッフ || shift.staff || '不明';
        const shiftType = shift.シフト || shift.shift || '-';
        const startTime = formatTime(shift.開始 || shift.start);
        const endTime = formatTime(shift.終了 || shift.end);
        const note = shift.備考 || shift.note || '';
        const colorClass = getShiftColor(shiftType);

        const timeDisplay = (startTime === '-' && endTime === '-') ?
            '' :
            `<div class="shift-time">${startTime}-${endTime}</div>`;

        return `
            <div class="shift-card ${colorClass}" data-shift-id="${shift.id || ''}" data-date="${shift.日付 || shift.date}">
                <div class="shift-staff">${this.escapeHtml(staff)}</div>
                <div class="shift-type">${this.escapeHtml(shiftType)}</div>
                ${timeDisplay}
                ${note ? `<div class="shift-note">${this.escapeHtml(note)}</div>` : ''}
            </div>
        `;
    }

    /**
     * 空の状態を表示
     */
    renderEmptyState() {
        return `
            <div class="empty-state">
                <div class="empty-icon">📅</div>
                <h3>シフトがありません</h3>
                <p>「新規シフト」ボタンからシフトを追加してください</p>
            </div>
        `;
    }

    /**
     * イベントリスナーを設定
     */
    attachEventListeners() {
        // リフレッシュボタン
        document.getElementById('refreshShiftsBtn')?.addEventListener('click', async () => {
            if (this.onRefresh) {
                await this.onRefresh();
            }
        });

        // 新規シフトボタン
        document.getElementById('newShiftBtn')?.addEventListener('click', () => {
            this.onNewShiftClick();
        });

        // 前週ボタン
        document.getElementById('prevWeekBtn')?.addEventListener('click', () => {
            this.navigateWeek(-1);
        });

        // 次週ボタン
        document.getElementById('nextWeekBtn')?.addEventListener('click', () => {
            this.navigateWeek(1);
        });

        // シフトカードクリック
        this.container.querySelectorAll('.shift-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const shiftId = e.currentTarget.dataset.shiftId;
                const date = e.currentTarget.dataset.date;
                if (shiftId) {
                    this.onShiftClick(parseInt(shiftId));
                }
            });
        });
    }

    /**
     * 週をナビゲート
     * @param {number} direction - 方向 (-1: 前週, 1: 次週)
     */
    navigateWeek(direction) {
        const newDate = new Date(this.currentWeekStart);
        newDate.setDate(newDate.getDate() + (direction * 7));
        this.currentWeekStart = getWeekStart(newDate);
        this.render();
    }

    /**
     * シフトリストをリフレッシュ
     */
    async refreshShifts() {
        // この関数は main.js から呼ばれ、シフトデータを再読み込みします
        // 実装は main.js 側で行います
    }

    /**
     * HTMLエスケープ
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}
