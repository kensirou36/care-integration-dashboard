/**
 * Memo View Component
 * Handles displaying the list of memos and the initial UI for the memo feature.
 */

import { getAllMemos, deleteMemo, markAsExported } from '../api/memoData.js';
import { formatDate } from '../utils/dataProcessor.js';
import { exportMemoToSheets, exportMemosToSheets } from '../api/sheetsWrite.js';
import { loadSettings } from '../api/storage.js';

export class MemoView {
  constructor(containerId, onNewMemoClick, onMemoClick) {
    this.container = document.getElementById(containerId);
    this.onNewMemoClick = onNewMemoClick; // Callback for when "New Memo" is clicked
    this.onMemoClick = onMemoClick;       // Callback for when a memo is clicked
  }

  /**
   * Render the memo list view
   */
  async render() {
    this.container.innerHTML = `
      <div class="memo-header">
        <h2>📝 手書きメモ</h2>
        <div class="memo-header-actions">
          <button id="exportAllBtn" class="btn btn-secondary" style="margin-right: 8px;">
            <span class="icon">📤</span> <span class="text">全て転記</span>
          </button>
          <button id="newMemoBtn" class="btn btn-primary fab-mobile">
            <span class="icon">📷</span> <span class="text">新規メモ</span>
          </button>
        </div>
      </div>
      
      <div id="memoList" class="memo-grid">
        <div class="loading-spinner">読み込み中...</div>
      </div>
    `;

    document.getElementById('newMemoBtn').addEventListener('click', () => {
      this.onNewMemoClick();
    });

    document.getElementById('exportAllBtn').addEventListener('click', () => {
      this.handleExportAll();
    });

    await this.refreshList();
  }

  /**
   * Fetch and display the list of memos
   */
  async refreshList() {
    const listContainer = document.getElementById('memoList');
    try {
      const memos = await getAllMemos();

      if (memos.length === 0) {
        listContainer.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">📝</div>
            <h3>メモがありません</h3>
            <p>「新規メモ」ボタンから追加してください</p>
          </div>
        `;
        return;
      }

      listContainer.innerHTML = memos.map(memo => this.createMemoCard(memo)).join('');

      // Add event listeners to cards
      listContainer.querySelectorAll('.memo-card').forEach(card => {
        card.addEventListener('click', (e) => {
          // Prevent click if delete button was clicked
          if (e.target.closest('.delete-btn')) return;

          const id = parseInt(card.dataset.id);
          this.onMemoClick(id);
        });
      });

      // Add event listeners to delete buttons
      listContainer.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          if (confirm('このメモを削除しますか？')) {
            const id = parseInt(e.currentTarget.dataset.id);
            await deleteMemo(id);
            this.refreshList();
          }
        });
      });

      // Add event listeners to export buttons
      listContainer.querySelectorAll('.export-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const id = parseInt(e.currentTarget.dataset.id);
          await this.handleExportMemo(id);
        });
      });
    } catch (error) {
      console.error('Failed to load memos:', error);
      listContainer.innerHTML = '<p class="error">メモの読み込みに失敗しました。</p>';
    }
  }

  createMemoCard(memo) {
    // Create an object URL for the image blob
    const imageUrl = URL.createObjectURL(memo.imageBlob);
    const exportedBadge = memo.exportedToSheets ? '<span class="exported-badge" title="エクスポート済み">✓</span>' : '';

    // Revoke object URL later to avoid memory leaks? 
    // In a SPA, we might need a strategy for this, but for now simple usage.

    return `
      <div class="memo-card" data-id="${memo.id}">
        <div class="memo-image-preview" style="background-image: url('${imageUrl}')">${exportedBadge}</div>
        <div class="memo-content">
          <p class="memo-text-preview">${this.truncateText(memo.text || '(テキストなし)', 50)}</p>
          <div class="memo-meta">
            <span>${formatDate(memo.createdAt)}</span>
            <div class="memo-actions">
              <button class="icon-btn export-btn" data-id="${memo.id}" title="Sheetsに転記">📤</button>
              <button class="icon-btn delete-btn" data-id="${memo.id}" title="削除">🗑️</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  truncateText(text, length) {
    if (text.length <= length) return text;
    return text.substring(0, length) + '...';
  }

  async handleExportMemo(id) {
    try {
      const settings = loadSettings();

      // 設定チェック
      if (settings.useGas) {
        if (!settings.gasUrl) {
          alert('GAS Web App URLの設定が必要です。設定画面で設定してください。');
          return;
        }
      } else {
        if (!settings.apiKey || !settings.spreadsheetId) {
          alert('Google Sheetsの設定が必要です。設定画面で設定してください。');
          return;
        }
      }

      const memos = await getAllMemos();
      const memo = memos.find(m => m.id === id);

      if (!memo) {
        alert('メモが見つかりません');
        return;
      }

      if (memo.exportedToSheets) {
        if (!confirm('このメモは既にエクスポート済みです。再度エクスポートしますか？')) {
          return;
        }
      }

      if (settings.useGas) {
        // GAS経由でエクスポート
        const { appendMemoViaGAS } = await import('../api/gasApi.js');
        const { formatMemoForExport } = await import('../api/sheetsWrite.js');
        const row = formatMemoForExport(memo);
        await appendMemoViaGAS(settings.gasUrl, row);
      } else {
        // APIキー経由でエクスポート
        await exportMemoToSheets(settings.apiKey, settings.spreadsheetId, memo);
      }

      await markAsExported(id);

      alert('✅ Sheetsに転記しました！');
      this.refreshList();
    } catch (error) {
      console.error('Export error:', error);
      alert('❌ エクスポートに失敗しました: ' + error.message);
    }
  }

  async handleExportAll() {
    try {
      const settings = loadSettings();

      // 設定チェック
      if (settings.useGas) {
        if (!settings.gasUrl) {
          alert('GAS Web App URLの設定が必要です。設定画面で設定してください。');
          return;
        }
      } else {
        if (!settings.apiKey || !settings.spreadsheetId) {
          alert('Google Sheetsの設定が必要です。設定画面で設定してください。');
          return;
        }
      }

      const memos = await getAllMemos();
      const unexportedMemos = memos.filter(m => !m.exportedToSheets);

      if (unexportedMemos.length === 0) {
        alert('エクスポートするメモがありません（全て転記済み）');
        return;
      }

      if (!confirm(`${unexportedMemos.length}件のメモをSheetsに転記しますか？`)) {
        return;
      }

      // プログレス表示用
      const totalCount = unexportedMemos.length;
      let processedCount = 0;

      if (settings.useGas) {
        // GAS経由でエクスポート（チャンク処理でURL長制限を回避）
        const { appendMemoViaGAS } = await import('../api/gasApi.js');
        const { formatMemoForExport } = await import('../api/sheetsWrite.js');

        // モバイルブラウザのURL長制限を考慮して1件ずつ送信
        for (const memo of unexportedMemos) {
          try {
            const row = formatMemoForExport(memo);
            await appendMemoViaGAS(settings.gasUrl, row);
            await markAsExported(memo.id);
            processedCount++;

            // プログレス表示（5件ごと）
            if (processedCount % 5 === 0 || processedCount === totalCount) {
              console.log(`📤 転記中: ${processedCount}/${totalCount}`);
            }
          } catch (error) {
            console.error(`メモID ${memo.id} の転記に失敗:`, error);
            // 個別のエラーは続行
          }
        }
      } else {
        // APIキー経由でエクスポート
        await exportMemosToSheets(settings.apiKey, settings.spreadsheetId, unexportedMemos);

        // Mark all as exported
        for (const memo of unexportedMemos) {
          await markAsExported(memo.id);
        }
        processedCount = totalCount;
      }

      if (processedCount > 0) {
        alert(`✅ ${processedCount}件のメモをSheetsに転記しました！`);
        this.refreshList();
      } else {
        alert('❌ メモの転記に失敗しました。設定を確認してください。');
      }
    } catch (error) {
      console.error('Bulk export error:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      alert('❌ 一括エクスポートに失敗しました: ' + error.message);
    }
  }
}
