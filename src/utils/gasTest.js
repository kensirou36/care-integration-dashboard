/**
 * GAS Connection Test Utility
 * モバイルでGAS接続をテストするためのユーティリティ
 */

/**
 * GAS接続をテスト
 * @param {string} gasUrl - GAS Web App URL
 * @returns {Promise<Object>} - テスト結果
 */
export async function testGASConnection(gasUrl) {
    const results = {
        urlValid: false,
        connectionOk: false,
        sheetsAccessible: false,
        errors: []
    };

    // URL形式チェック
    if (!gasUrl) {
        results.errors.push('GAS URL が設定されていません');
        return results;
    }

    if (!gasUrl.startsWith('https://script.google.com/macros/s/')) {
        results.errors.push('GAS URL の形式が正しくありません');
        return results;
    }

    results.urlValid = true;

    // 接続テスト
    try {
        const testUrl = `${gasUrl}?action=getSheetList`;
        console.log('🔍 GAS接続テスト:', testUrl);

        const response = await fetch(testUrl, {
            method: 'GET',
            mode: 'cors',
            cache: 'no-cache'
        });

        if (!response.ok) {
            results.errors.push(`HTTP ${response.status}: ${response.statusText}`);
            return results;
        }

        results.connectionOk = true;

        const data = await response.json();

        if (data.error) {
            results.errors.push(`GASエラー: ${data.error}`);
            return results;
        }

        if (data.sheets && Array.isArray(data.sheets)) {
            results.sheetsAccessible = true;

            // 「メモ」シートの存在確認
            const hasMemoSheet = data.sheets.includes('メモ');
            if (!hasMemoSheet) {
                results.errors.push('「メモ」シートが見つかりません。Google Sheetsに「メモ」という名前のシートを作成してください。');
            }
        }

        console.log('✅ GAS接続テスト成功:', results);
        return results;

    } catch (error) {
        console.error('❌ GAS接続テストエラー:', error);

        if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
            results.errors.push('ネットワークエラー: インターネット接続を確認してください');
        } else {
            results.errors.push(error.message);
        }

        return results;
    }
}

/**
 * GAS接続テストを実行してユーザーに結果を表示
 * @param {string} gasUrl - GAS Web App URL
 */
export async function runGASConnectionTest(gasUrl) {
    const results = await testGASConnection(gasUrl);

    let message = '🔍 GAS接続テスト結果\n\n';

    if (results.urlValid) {
        message += '✅ URL形式: 正常\n';
    } else {
        message += '❌ URL形式: 不正\n';
    }

    if (results.connectionOk) {
        message += '✅ 接続: 成功\n';
    } else {
        message += '❌ 接続: 失敗\n';
    }

    if (results.sheetsAccessible) {
        message += '✅ Sheets アクセス: 成功\n';
    } else {
        message += '❌ Sheets アクセス: 失敗\n';
    }

    if (results.errors.length > 0) {
        message += '\n⚠️ エラー:\n';
        results.errors.forEach(err => {
            message += `- ${err}\n`;
        });
    } else {
        message += '\n🎉 すべてのテストに合格しました！';
    }

    alert(message);
    return results;
}
