/**
 * Memo Editor Component
 * Handles image capture/upload, OCR processing, and saving memos.
 */

import Tesseract from 'tesseract.js';
import { saveMemo, updateMemo, getMemo } from '../api/memoData.js';

export class MemoEditor {
    constructor(containerId, onSave, onCancel) {
        this.container = document.getElementById(containerId);
        this.onSave = onSave;     // Callback after save
        this.onCancel = onCancel; // Callback for cancel
        this.currentBlob = null;
        this.currentMemoId = null;
    }

    /**
     * Render the editor for a new memo
     */
    renderNew() {
        this.currentMemoId = null;
        this.renderUI();
    }

    /**
     * Render the editor for an existing memo
     * @param {number} id - Memo ID
     */
    async renderEdit(id) {
        this.currentMemoId = id;
        try {
            const memo = await getMemo(id);
            if (!memo) throw new Error('Memo not found');

            this.currentBlob = memo.imageBlob;
            this.renderUI(memo.text, URL.createObjectURL(memo.imageBlob));
        } catch (error) {
            console.error(error);
            alert('メモの読み込みに失敗しました');
            this.onCancel();
        }
    }

    renderUI(initialText = '', initialImageUrl = null) {
        this.container.innerHTML = `
      <div class="editor-header">
        <button id="cancelEditorBtn" class="btn btn-secondary">キャンセル</button>
        <h3>${this.currentMemoId ? 'メモ編集' : '新規メモ'}</h3>
        <button id="saveMemoBtn" class="btn btn-primary" disabled>保存</button>
      </div>

      <div class="editor-body">
        <div class="image-section">
          ${initialImageUrl
                ? `<img src="${initialImageUrl}" id="previewImage" class="preview-image">`
                : `<div class="placeholder-image" id="imagePlaceholder">
                 <div class="upload-options">
                   <button id="cameraBtn" class="btn btn-icon-large">📷 カメラを起動</button>
                   <button id="uploadBtn" class="btn btn-secondary">📁 画像を選択</button>
                   <input type="file" id="fileInput" accept="image/*" class="hidden">
                   <input type="file" id="cameraInput" accept="image/*" capture="environment" class="hidden">
                 </div>
               </div>`
            }
        </div>

        <div class="ocr-controls ${initialImageUrl ? '' : 'hidden'}" id="ocrControls">
          <button id="runOcrBtn" class="btn btn-secondary full-width">
            <span class="icon">🔍</span> 文字認識 (OCR) を実行
          </button>
          <div id="ocrProgress" class="progress-bar hidden">
            <div class="progress-fill" style="width: 0%"></div>
            <span class="progress-text">準備中...</span>
          </div>
        </div>

        <div class="text-section">
          <label for="memoText">メモ内容 (編集可能)</label>
          <textarea id="memoText" class="memo-textarea" placeholder="画像から認識されたテキストがここに表示されます。手動入力も可能です。">${initialText}</textarea>
        </div>
      </div>
    `;

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Cancel
        document.getElementById('cancelEditorBtn').addEventListener('click', () => {
            this.onCancel();
        });

        // Save
        const saveBtn = document.getElementById('saveMemoBtn');
        saveBtn.addEventListener('click', async () => {
            await this.handleSave();
        });

        // Text area change enables save
        const textArea = document.getElementById('memoText');
        textArea.addEventListener('input', () => {
            if (this.currentBlob) saveBtn.disabled = false;
        });

        // Enable save if editing existing memo
        if (this.currentMemoId) saveBtn.disabled = false;

        // Image Upload
        const fileInput = document.getElementById('fileInput');
        const uploadBtn = document.getElementById('uploadBtn');
        if (uploadBtn) {
            uploadBtn.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', (e) => this.handleImageSelect(e));
        }

        // Camera
        const cameraInput = document.getElementById('cameraInput');
        const cameraBtn = document.getElementById('cameraBtn');
        if (cameraBtn) {
            cameraBtn.addEventListener('click', () => cameraInput.click());
            cameraInput.addEventListener('change', (e) => this.handleImageSelect(e));
        }

        // OCR
        const runOcrBtn = document.getElementById('runOcrBtn');
        if (runOcrBtn) {
            runOcrBtn.addEventListener('click', () => this.runOCR());
        }
    }

    handleImageSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        this.currentBlob = file;
        const imageUrl = URL.createObjectURL(file);

        // Replace placeholder with image
        const imageSection = document.querySelector('.image-section');
        imageSection.innerHTML = `<img src="${imageUrl}" id="previewImage" class="preview-image">`;

        // Show OCR controls
        document.getElementById('ocrControls').classList.remove('hidden');

        // Enable save button
        document.getElementById('saveMemoBtn').disabled = false;
    }

    async runOCR() {
        if (!this.currentBlob) return;

        const progressBar = document.getElementById('ocrProgress');
        const progressFill = progressBar.querySelector('.progress-fill');
        const progressText = progressBar.querySelector('.progress-text');
        const runBtn = document.getElementById('runOcrBtn');
        const textArea = document.getElementById('memoText');

        progressBar.classList.remove('hidden');
        runBtn.disabled = true;

        try {
            const result = await Tesseract.recognize(
                this.currentBlob,
                'jpn', // Japanese
                {
                    logger: m => {
                        if (m.status === 'recognizing text') {
                            const percent = Math.round(m.progress * 100);
                            progressFill.style.width = `${percent}%`;
                            progressText.textContent = `認識中... ${percent}%`;
                        } else {
                            progressText.textContent = m.status;
                        }
                    }
                }
            );

            textArea.value = result.data.text;
            progressText.textContent = '完了!';
            setTimeout(() => progressBar.classList.add('hidden'), 2000);
        } catch (error) {
            console.error('OCR Error:', error);
            progressText.textContent = 'エラーが発生しました';
            alert('文字認識に失敗しました。画像の画質が良いか確認してください。');
        } finally {
            runBtn.disabled = false;
        }
    }

    async handleSave() {
        const text = document.getElementById('memoText').value;
        if (!this.currentBlob) return;

        const btn = document.getElementById('saveMemoBtn');
        btn.disabled = true;
        btn.textContent = '保存中...';

        try {
            if (this.currentMemoId) {
                await updateMemo(this.currentMemoId, { text, imageBlob: this.currentBlob });
            } else {
                await saveMemo({ text, imageBlob: this.currentBlob });
            }
            this.onSave();
        } catch (error) {
            console.error('Save Error:', error);
            alert('保存に失敗しました');
            btn.disabled = false;
            btn.textContent = '保存';
        }
    }
}
