/**
 * 介護統合ダッシュボード - メインアプリケーション (強化版)
 * Google Sheets統合強化、複数シート対応、検索・フィルター・ソート、詳細表示
 */

import './style.css';
import { fetchSheetList, fetchAllSheets, fetchSheetData, convertToObjects, testConnection } from './api/sheets.js';
import { saveSettings, loadSettings, cacheData, getCachedData, isConfigured } from './api/storage.js';
import { filterData, sortData, searchData, calculateStats, formatDate } from './utils/dataProcessor.js';
import { MemoView } from './components/MemoView.js';
import { MemoEditor } from './components/MemoEditor.js';

// グローバル状態
let currentView = 'dashboard';
let allSheetsData = {}; // すべてのシートのデータ
let currentSheet = null; // 現在表示中のシート
let currentData = []; // 現在表示中のデータ
let filteredData = []; // フィルター・検索後のデータ
let autoRefreshTimer = null;
let memoView = null;
let memoEditor = null;

/**
 * アプリケーション初期化
 */
function init() {
  console.log('🚀 介護統合ダッシュボード起動 (強化版)');

  // Service Worker登録
  registerServiceWorker();

  // イベントリスナー設定
  setupEventListeners();

  // メモ機能初期化
  initMemoFeatures();

  // 設定を読み込み
  loadSettingsToUI();

  // 初期表示
  if (isConfigured()) {
    loadAllData();
  } else {
    showView('settings');
  }
}

/**
 * Service Worker登録
 */
async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('✅ Service Worker登録成功:', registration);
    } catch (error) {
      console.error('❌ Service Worker登録失敗:', error);
    }
  }
}

/**
 * メモ機能初期化
 */
function initMemoFeatures() {
  // MemoView 初期化
  memoView = new MemoView('memoView',
    // 新規メモ作成クリック時
    () => {
      memoEditor.renderNew();
      showView('memoEditor');
    },
    // メモクリック時 (編集)
    (id) => {
      memoEditor.renderEdit(id);
      showView('memoEditor');
    }
  );

  // MemoEditor 初期化
  memoEditor = new MemoEditor('memoEditorView',
    // 保存後
    () => {
      showNotification('メモを保存しました', 'success');
      showView('memo');
    },
    // キャンセル時
    () => {
      showView('memo');
    }
  );
}

/**
 * イベントリスナー設定
 */
function setupEventListeners() {
  // ボトムナビゲーション
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      const view = e.currentTarget.dataset.view;
      showView(view);
    });
  });

  // 設定ボタン
  document.getElementById('settingsBtn')?.addEventListener('click', () => {
    showView('settings');
  });

  // 設定画面のボタン
  document.getElementById('saveSettingsBtn')?.addEventListener('click', handleSaveSettings);
  document.getElementById('testConnectionBtn')?.addEventListener('click', handleTestConnection);
  document.getElementById('closeSettingsBtn')?.addEventListener('click', () => {
    showView('dashboard');
  });

  // ダッシュボードのボタン
  document.getElementById('refreshBtn')?.addEventListener('click', loadAllData);
  document.getElementById('goToSettingsBtn')?.addEventListener('click', () => {
    showView('settings');
  });

  // 検索
  const searchInput = document.getElementById('searchInput');
  searchInput?.addEventListener('input', handleSearch);

  document.getElementById('clearSearchBtn')?.addEventListener('click', () => {
    searchInput.value = '';
    handleSearch();
  });

  // フィルター・ソート
  document.getElementById('filterBtn')?.addEventListener('click', showFilterModal);
  document.getElementById('sortBtn')?.addEventListener('click', showFilterModal);

  // モーダル
  document.getElementById('closeModalBtn')?.addEventListener('click', closeDetailModal);
  document.getElementById('closeFilterModalBtn')?.addEventListener('click', closeFilterModal);
  document.querySelector('#detailModal .modal-overlay')?.addEventListener('click', closeDetailModal);
  document.querySelector('#filterModal .modal-overlay')?.addEventListener('click', closeFilterModal);

  document.getElementById('applyFilterBtn')?.addEventListener('click', applyFilter);
  document.getElementById('resetFilterBtn')?.addEventListener('click', resetFilter);

  // 接続方法の切り替え
  document.getElementById('useApiKey')?.addEventListener('change', toggleConnectionMethod);
  document.getElementById('useGas')?.addEventListener('change', toggleConnectionMethod);
}

/**
 * 接続方法の表示切り替え
 */
function toggleConnectionMethod() {
  const useGas = document.getElementById('useGas').checked;
  const gasSettings = document.getElementById('gasSettings');
  const apiKeyField = document.getElementById('apiKey').parentElement;
  const spreadsheetIdField = document.getElementById('spreadsheetId').parentElement;

  if (useGas) {
    gasSettings.style.display = 'block';
    apiKeyField.style.display = 'none';
    spreadsheetIdField.style.display = 'none';
  } else {
    gasSettings.style.display = 'none';
    apiKeyField.style.display = 'block';
    spreadsheetIdField.style.display = 'block';
  }
}

/**
 * ビュー切り替え
 */
function showView(viewName) {
  currentView = viewName;

  // すべてのビューを非表示
  document.querySelectorAll('.view').forEach(view => {
    view.classList.add('hidden');
  });

  // ナビゲーションのアクティブ状態更新
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');

    // memoEditorが表示されているとき、nav上はmemoをアクティブにする
    const targetView = viewName === 'memoEditor' ? 'memo' : viewName;
    if (item.dataset.view === targetView) {
      item.classList.add('active');
    }
  });

  // 指定されたビューを表示
  if (viewName === 'settings') {
    document.getElementById('settingsView')?.classList.remove('hidden');
  } else if (viewName === 'dashboard') {
    document.getElementById('dashboardView')?.classList.remove('hidden');
  } else if (viewName === 'memo') {
    document.getElementById('memoView')?.classList.remove('hidden');
    // メモ一覧をリフレッシュ
    if (memoView) memoView.render();
  } else if (viewName === 'memoEditor') {
    document.getElementById('memoEditorView')?.classList.remove('hidden');
  } else {
    // 未実装のビュー
    showNotification(`${viewName}機能は次のフェーズで実装予定です`, 'info');
  }
}

/**
 * 設定をUIに読み込み
 */
function loadSettingsToUI() {
  const settings = loadSettings();
  document.getElementById('apiKey').value = settings.apiKey;
  document.getElementById('spreadsheetId').value = settings.spreadsheetId;
  document.getElementById('autoRefreshInterval').value = settings.autoRefreshInterval || '300000';
  document.getElementById('gasUrl').value = settings.gasUrl || '';

  // 接続方法の設定
  if (settings.useGas) {
    document.getElementById('useGas').checked = true;
  } else {
    document.getElementById('useApiKey').checked = true;
  }

  // 表示を更新
  toggleConnectionMethod();
}

/**
 * 設定を保存
 */
async function handleSaveSettings() {
  const useGas = document.getElementById('useGas').checked;

  const settings = {
    apiKey: document.getElementById('apiKey').value.trim(),
    spreadsheetId: document.getElementById('spreadsheetId').value.trim(),
    autoRefreshInterval: document.getElementById('autoRefreshInterval').value,
    gasUrl: document.getElementById('gasUrl').value.trim(),
    useGas: useGas,
  };

  // バリデーション
  if (useGas) {
    if (!settings.gasUrl) {
      showNotification('GAS Web App URLを入力してください', 'error');
      return;
    }
  } else {
    if (!settings.apiKey || !settings.spreadsheetId) {
      showNotification('APIキーとスプレッドシートIDを入力してください', 'error');
      return;
    }
  }

  saveSettings(settings);
  showNotification('設定を保存しました', 'success');

  // 自動更新タイマーを再設定
  setupAutoRefresh();

  // データを読み込み
  await loadAllData();
  showView('dashboard');
}

/**
 * 接続テスト
 */
async function handleTestConnection() {
  const useGas = document.getElementById('useGas').checked;

  showLoading(true);

  try {
    if (useGas) {
      // GAS経由で接続
      const gasUrl = document.getElementById('gasUrl').value.trim();

      if (!gasUrl) {
        showNotification('GAS Web App URLを入力してください', 'error');
        showLoading(false);
        return;
      }

      const { fetchSheetListViaGAS } = await import('./api/gasApi.js');
      const sheetList = await fetchSheetListViaGAS(gasUrl);
      showNotification(`✅ GAS接続成功! ${sheetList.length}個のシートが見つかりました`, 'success');
    } else {
      // APIキー経由で接続
      const apiKey = document.getElementById('apiKey').value.trim();
      const spreadsheetId = document.getElementById('spreadsheetId').value.trim();

      if (!apiKey || !spreadsheetId) {
        showNotification('APIキーとスプレッドシートIDを入力してください', 'error');
        showLoading(false);
        return;
      }

      const sheetList = await fetchSheetList(apiKey, spreadsheetId);
      showNotification(`✅ 接続成功! ${sheetList.length}個のシートが見つかりました`, 'success');
    }
  } catch (error) {
    console.error('接続テストエラー:', error);
    showNotification(`❌ 接続失敗: ${error.message}`, 'error');
  } finally {
    showLoading(false);
  }
}

/**
 * すべてのシートのデータを読み込み
 */
async function loadAllData() {
  const settings = loadSettings();

  // 設定チェック
  if (settings.useGas) {
    if (!settings.gasUrl) {
      showEmptyState();
      return;
    }
  } else {
    if (!settings.apiKey || !settings.spreadsheetId) {
      showEmptyState();
      return;
    }
  }

  showLoading(true);

  try {
    let sheetList;

    if (settings.useGas) {
      // GAS経由でデータ取得
      const { fetchSheetListViaGAS, fetchAllSheetsViaGAS } = await import('./api/gasApi.js');

      sheetList = await fetchSheetListViaGAS(settings.gasUrl);

      if (sheetList.length === 0) {
        showEmptyState();
        return;
      }

      allSheetsData = await fetchAllSheetsViaGAS(settings.gasUrl);
    } else {
      // APIキー経由でデータ取得
      sheetList = await fetchSheetList(settings.apiKey, settings.spreadsheetId);

      if (sheetList.length === 0) {
        showEmptyState();
        return;
      }

      allSheetsData = await fetchAllSheets(settings.apiKey, settings.spreadsheetId);
    }

    // シートタブを表示
    renderSheetTabs(sheetList);

    // 最初のシートを表示
    if (!currentSheet && sheetList.length > 0) {
      currentSheet = sheetList[0].title;
    }

    displaySheetData(currentSheet);

    // キャッシュに保存
    cacheData({ sheets: allSheetsData, sheetList, currentSheet });

    // 最終更新時刻を表示
    updateLastUpdateTime();

    showNotification(`✅ ${sheetList.length}個のシートを読み込みました`, 'success');
  } catch (error) {
    console.error('データ読み込みエラー:', error);
    showNotification(`❌ データ読み込み失敗: ${error.message}`, 'error');

    // キャッシュがあれば表示
    const cached = getCachedData();
    if (cached && cached.sheets) {
      allSheetsData = cached.sheets;
      currentSheet = cached.currentSheet;
      renderSheetTabs(cached.sheetList);
      displaySheetData(currentSheet);
      showNotification('⚠️ キャッシュデータを表示しています', 'warning');
    } else {
      showEmptyState();
    }
  } finally {
    showLoading(false);
  }
}

/**
 * シートタブをレンダリング
 */
function renderSheetTabs(sheetList) {
  const tabsContainer = document.getElementById('tabsContainer');
  const sheetTabs = document.getElementById('sheetTabs');

  if (!tabsContainer || !sheetList || sheetList.length === 0) return;

  tabsContainer.innerHTML = sheetList.map(sheet => `
    <button class="sheet-tab ${sheet.title === currentSheet ? 'active' : ''}" 
            data-sheet="${escapeHtml(sheet.title)}">
      ${escapeHtml(sheet.title)}
    </button>
  `).join('');

  // タブクリックイベント
  tabsContainer.querySelectorAll('.sheet-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      const sheetName = e.currentTarget.dataset.sheet;
      switchSheet(sheetName);
    });
  });

  sheetTabs.classList.remove('hidden');
}

/**
 * シートを切り替え
 */
function switchSheet(sheetName) {
  currentSheet = sheetName;

  // タブのアクティブ状態を更新
  document.querySelectorAll('.sheet-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.sheet === sheetName);
  });

  // データを表示
  displaySheetData(sheetName);
}

/**
 * シートのデータを表示
 */
function displaySheetData(sheetName) {
  if (!allSheetsData[sheetName]) {
    showEmptyState();
    return;
  }

  currentData = allSheetsData[sheetName];
  filteredData = currentData;

  // タイトルを更新
  document.getElementById('dashboardTitle').textContent = `📈 ${sheetName}`;

  // 統計を表示
  displayStats(currentData);

  // データカードを表示
  renderDataCards(filteredData);

  // フィルター・ソートのフィールドを更新
  updateFilterFields();
}

/**
 * 統計を表示
 */
function displayStats(data) {
  const stats = calculateStats(data);
  const statsContainer = document.getElementById('dataStats');

  document.getElementById('statTotal').textContent = stats.total;
  document.getElementById('statToday').textContent = stats.today;
  document.getElementById('statWeek').textContent = stats.thisWeek;
  document.getElementById('statMonth').textContent = stats.thisMonth;

  statsContainer.classList.remove('hidden');
}

/**
 * 検索処理
 */
function handleSearch() {
  const query = document.getElementById('searchInput').value;
  const clearBtn = document.getElementById('clearSearchBtn');

  // クリアボタンの表示/非表示
  clearBtn.classList.toggle('hidden', !query);

  // 検索実行
  filteredData = searchData(currentData, query);
  renderDataCards(filteredData);
}

/**
 * フィルター・ソートモーダルを表示
 */
function showFilterModal() {
  document.getElementById('filterModal').classList.remove('hidden');
}

/**
 * フィルター・ソートモーダルを閉じる
 */
function closeFilterModal() {
  document.getElementById('filterModal').classList.add('hidden');
}

/**
 * フィルター・ソートのフィールドを更新
 */
function updateFilterFields() {
  const sortField = document.getElementById('sortField');

  if (!currentData || currentData.length === 0) return;

  const fields = Object.keys(currentData[0]);
  sortField.innerHTML = '<option value="">選択してください</option>' +
    fields.map(field => `<option value="${escapeHtml(field)}">${escapeHtml(field)}</option>`).join('');
}

/**
 * フィルター・ソートを適用
 */
function applyFilter() {
  const sortField = document.getElementById('sortField').value;
  const sortDirection = document.getElementById('sortDirection').value;

  if (sortField) {
    filteredData = sortData(filteredData, sortField, sortDirection);
    renderDataCards(filteredData);
    showNotification(`✅ ${sortField}でソートしました`, 'success');
  }

  closeFilterModal();
}

/**
 * フィルター・ソートをリセット
 */
function resetFilter() {
  document.getElementById('sortField').value = '';
  document.getElementById('sortDirection').value = 'asc';
  document.getElementById('searchInput').value = '';

  filteredData = currentData;
  renderDataCards(filteredData);

  closeFilterModal();
  showNotification('✅ フィルターをリセットしました', 'success');
}

/**
 * データカードをレンダリング
 */
function renderDataCards(data) {
  const container = document.getElementById('dataContainer');

  if (!data || data.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">🔍</div><h3>データが見つかりません</h3><p>検索条件を変更してください</p></div>';
    return;
  }

  // 空の状態を非表示
  const emptyState = document.getElementById('emptyState');
  if (emptyState) {
    emptyState.style.display = 'none';
  }

  // データカードを生成
  container.innerHTML = data.map((item, index) => createDataCard(item, index)).join('');

  // カードクリックイベント
  container.querySelectorAll('.data-card').forEach((card, index) => {
    card.addEventListener('click', () => {
      showDetailModal(data[index]);
    });
  });
}

/**
 * データカードを作成
 */
function createDataCard(item, index) {
  const keys = Object.keys(item);
  const title = item[keys[0]] || `データ ${index + 1}`;
  const content = keys.slice(1, 4).map(key => `<strong>${escapeHtml(key)}:</strong> ${escapeHtml(item[key])}`).join('<br>');

  return `
    <div class="data-card">
      <div class="card-header">
        <h3 class="card-title">${escapeHtml(title)}</h3>
        <span class="card-badge">#${index + 1}</span>
      </div>
      <div class="card-content">
        ${content}
      </div>
      <div class="card-meta">
        <span>📊 ${keys.length}項目</span>
        <span>🕒 ${formatDate(new Date().toISOString())}</span>
      </div>
    </div>
  `;
}

/**
 * 詳細モーダルを表示
 */
function showDetailModal(item) {
  const modal = document.getElementById('detailModal');
  const modalBody = document.getElementById('modalBody');
  const modalTitle = document.getElementById('modalTitle');

  const keys = Object.keys(item);
  modalTitle.textContent = item[keys[0]] || '詳細情報';

  modalBody.innerHTML = keys.map(key => `
    <div class="detail-row">
      <div class="detail-label">${escapeHtml(key)}</div>
      <div class="detail-value">${escapeHtml(item[key])}</div>
    </div>
  `).join('');

  modal.classList.remove('hidden');
}

/**
 * 詳細モーダルを閉じる
 */
function closeDetailModal() {
  document.getElementById('detailModal').classList.add('hidden');
}

/**
 * 空の状態を表示
 */
function showEmptyState() {
  const container = document.getElementById('dataContainer');
  const emptyState = document.getElementById('emptyState');
  const sheetTabs = document.getElementById('sheetTabs');
  const dataStats = document.getElementById('dataStats');

  container.innerHTML = '';
  if (emptyState) {
    emptyState.style.display = 'block';
    container.appendChild(emptyState);
  }

  sheetTabs.classList.add('hidden');
  dataStats.classList.add('hidden');
}

/**
 * ローディング表示
 */
function showLoading(show) {
  const loading = document.getElementById('loading');
  if (loading) {
    loading.classList.toggle('hidden', !show);
  }
}

/**
 * 最終更新時刻を更新
 */
function updateLastUpdateTime() {
  const lastUpdate = document.getElementById('lastUpdate');
  const lastUpdateTime = document.getElementById('lastUpdateTime');

  if (lastUpdate && lastUpdateTime) {
    const now = new Date();
    lastUpdateTime.textContent = now.toLocaleTimeString('ja-JP');
    lastUpdate.classList.remove('hidden');
  }
}

/**
 * 自動更新を設定
 */
function setupAutoRefresh() {
  // 既存のタイマーをクリア
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer);
    autoRefreshTimer = null;
  }

  const settings = loadSettings();
  const interval = parseInt(settings.autoRefreshInterval || '0');

  if (interval > 0) {
    autoRefreshTimer = setInterval(() => {
      console.log('🔄 自動更新実行');
      loadAllData();
    }, interval);

    console.log(`✅ 自動更新を設定しました (${interval / 1000}秒ごと)`);
  }
}

/**
 * 通知を表示
 */
function showNotification(message, type = 'info') {
  console.log(`[${type.toUpperCase()}] ${message}`);

  const notification = document.createElement('div');
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 80px;
    left: 50%;
    transform: translateX(-50%);
    background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : type === 'warning' ? '#f59e0b' : '#6366f1'};
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    z-index: 1000;
    animation: slideDown 0.3s ease-out;
    max-width: 90%;
  `;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'slideUp 0.3s ease-out';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

/**
 * HTMLエスケープ
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// アニメーション追加
const style = document.createElement('style');
style.textContent = `
  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translate(-50%, -20px);
    }
    to {
      opacity: 1;
      transform: translate(-50%, 0);
    }
  }
  @keyframes slideUp {
    from {
      opacity: 1;
      transform: translate(-50%, 0);
    }
    to {
      opacity: 0;
      transform: translate(-50%, -20px);
    }
  }
`;
document.head.appendChild(style);

// アプリケーション起動
init();

// 自動更新を設定
setupAutoRefresh();
