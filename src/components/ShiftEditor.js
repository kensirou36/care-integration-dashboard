/**
 * Shift Editor Component
 * シフトの作成・編集UI
 */

import { formatDateYMD } from '../utils/shiftUtils.js';

export class ShiftEditor {
    constructor(containerId, onSave, onCancel) {
        this.container = document.getElementById(containerId);
        this.onSave = onSave;
        this.onCancel = onCancel;
        this.editingShift = null;
        this.isEditMode = false;
    }

    /**
     * 新規シフト作成モードで表示
     * @param {string} defaultDate - デフォルトの日付(YYYY-MM-DD)
     */
    renderNew(defaultDate = null) {
        this.isEditMode = false;
        this.editingShift = null;

        const today = defaultDate || formatDateYMD(new Date());

        this.render({
            日付: today,
            スタッフ: '',
            シフト: '早番',
            開始: '07:00',
            終了: '16:00',
            備考: ''
        });
    }

    /**
     * 編集モードで表示
     * @param {Object} shift - 編集するシフトデータ
     */
    renderEdit(shift) {
        this.isEditMode = true;
        this.editingShift = shift;
        this.render(shift);
    }

    /**
     * フォームをレンダリング
     */
    render(shift) {
        const title = this.isEditMode ? 'シフト編集' : '新規シフト作成';
        const submitText = this.isEditMode ? '更新' : '作成';

        this.container.innerHTML = `
            <div class="shift-editor-container">
                <div class="shift-editor-header">
                    <h2>${title}</h2>
                    <button id="closeEditorBtn" class="btn-icon" aria-label="閉じる">✕</button>
                </div>

                <form id="shiftForm" class="shift-form">
                    <div class="form-group">
                        <label for="shiftDate">日付 <span class="required">*</span></label>
                        <input 
                            type="date" 
                            id="shiftDate" 
                            name="date" 
                            value="${shift.日付 || shift.date || ''}" 
                            required
                        >
                    </div>

                    <div class="form-group">
                        <label for="shiftStaff">スタッフ <span class="required">*</span></label>
                        <input 
                            type="text" 
                            id="shiftStaff" 
                            name="staff" 
                            value="${this.escapeHtml(shift.スタッフ || shift.staff || '')}" 
                            placeholder="例: 山田太郎"
                            required
                        >
                    </div>

                    <div class="form-group">
                        <label for="shiftType">シフト種別 <span class="required">*</span></label>
                        <select id="shiftType" name="shiftType" required>
                            <option value="早番" ${this.isSelected(shift, '早番')}>早番</option>
                            <option value="遅番" ${this.isSelected(shift, '遅番')}>遅番</option>
                            <option value="夜勤" ${this.isSelected(shift, '夜勤')}>夜勤</option>
                            <option value="休み" ${this.isSelected(shift, '休み')}>休み</option>
                            <option value="その他" ${this.isSelected(shift, 'その他')}>その他</option>
                        </select>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label for="shiftStart">開始時刻</label>
                            <input 
                                type="time" 
                                id="shiftStart" 
                                name="start" 
                                value="${this.formatTimeForInput(shift.開始 || shift.start)}"
                            >
                        </div>

                        <div class="form-group">
                            <label for="shiftEnd">終了時刻</label>
                            <input 
                                type="time" 
                                id="shiftEnd" 
                                name="end" 
                                value="${this.formatTimeForInput(shift.終了 || shift.end)}"
                            >
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="shiftNote">備考</label>
                        <textarea 
                            id="shiftNote" 
                            name="note" 
                            rows="3" 
                            placeholder="例: 有給休暇、研修など"
                        >${this.escapeHtml(shift.備考 || shift.note || '')}</textarea>
                    </div>

                    <div class="form-actions">
                        ${this.isEditMode ? `
                            <button type="button" id="deleteShiftBtn" class="btn btn-danger">
                                <span class="icon">🗑️</span> 削除
                            </button>
                        ` : ''}
                        <div class="form-actions-right">
                            <button type="button" id="cancelShiftBtn" class="btn btn-secondary">
                                キャンセル
                            </button>
                            <button type="submit" class="btn btn-primary">
                                <span class="icon">💾</span> ${submitText}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        `;

        this.attachEventListeners();
    }

    /**
     * イベントリスナーを設定
     */
    attachEventListeners() {
        const form = document.getElementById('shiftForm');
        const closeBtn = document.getElementById('closeEditorBtn');
        const cancelBtn = document.getElementById('cancelShiftBtn');
        const deleteBtn = document.getElementById('deleteShiftBtn');

        // フォーム送信
        form?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSubmit();
        });

        // 閉じる・キャンセル
        closeBtn?.addEventListener('click', () => this.onCancel());
        cancelBtn?.addEventListener('click', () => this.onCancel());

        // 削除
        deleteBtn?.addEventListener('click', () => this.handleDelete());

        // シフト種別変更時に時刻を自動設定
        const shiftTypeSelect = document.getElementById('shiftType');
        shiftTypeSelect?.addEventListener('change', (e) => {
            this.autoFillTimes(e.target.value);
        });
    }

    /**
     * フォーム送信処理
     */
    async handleSubmit() {
        const formData = new FormData(document.getElementById('shiftForm'));

        const shiftData = {
            日付: formData.get('date'),
            スタッフ: formData.get('staff'),
            シフト: formData.get('shiftType'),
            開始: formData.get('start') || '-',
            終了: formData.get('end') || '-',
            備考: formData.get('note') || '-'
        };

        // 編集モードの場合はIDを保持
        if (this.isEditMode && this.editingShift) {
            shiftData.id = this.editingShift.id;
        }

        this.onSave(shiftData, this.isEditMode);
    }

    /**
     * 削除処理
     */
    async handleDelete() {
        if (!this.isEditMode || !this.editingShift) return;

        const confirmed = confirm('このシフトを削除してもよろしいですか?');
        if (!confirmed) return;

        // 削除イベントを発火
        if (this.onDelete) {
            this.onDelete(this.editingShift.id);
        }
    }

    /**
     * シフト種別に応じて時刻を自動設定
     */
    autoFillTimes(shiftType) {
        const startInput = document.getElementById('shiftStart');
        const endInput = document.getElementById('shiftEnd');

        if (!startInput || !endInput) return;

        // 既に入力されている場合は変更しない
        if (startInput.value && endInput.value) return;

        switch (shiftType) {
            case '早番':
                startInput.value = '07:00';
                endInput.value = '16:00';
                break;
            case '遅番':
                startInput.value = '11:00';
                endInput.value = '20:00';
                break;
            case '夜勤':
                startInput.value = '16:00';
                endInput.value = '09:00';
                break;
            case '休み':
                startInput.value = '';
                endInput.value = '';
                break;
        }
    }

    /**
     * 削除コールバックを設定
     */
    setOnDelete(callback) {
        this.onDelete = callback;
    }

    /**
     * 選択状態を判定
     */
    isSelected(shift, value) {
        const shiftType = shift.シフト || shift.shift || '';
        return shiftType === value ? 'selected' : '';
    }

    /**
     * 時刻を入力フォーマットに変換
     */
    formatTimeForInput(time) {
        if (!time || time === '-') return '';

        // ISO形式の日付文字列の場合、時刻部分を抽出
        if (typeof time === 'string' && time.includes('T')) {
            try {
                const date = new Date(time);
                const hours = String(date.getHours()).padStart(2, '0');
                const minutes = String(date.getMinutes()).padStart(2, '0');
                return `${hours}:${minutes}`;
            } catch (e) {
                console.warn('時刻の変換に失敗:', time, e);
                return '';
            }
        }

        // HH:MM形式に変換
        const parts = String(time).split(':');
        if (parts.length === 2) {
            return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
        }
        return time;
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
