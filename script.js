const firebaseConfig = {
  apiKey: "AIzaSyAnnWPevbP6A1aJxD8fU9KhFFuJjxPwp6g",
  authDomain: "type-de78f.firebaseapp.com",
  projectId: "type-de78f",
  storageBucket: "type-de78f.firebasestorage.app",
  messagingSenderId: "570465490318",
  appId: "1:570465490318:web:267da0c52ec45330d6c0df",
  measurementId: "G-0ZGFB4SVGR"
};

// Firebaseの初期化
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const rankingsCol = db.collection('rankings'); // 'rankings' コレクションを参照

document.addEventListener('DOMContentLoaded', () => {
    
    // --- グローバル変数・定数 ---

    // デバッグ用 (APIを叩かずに固定のジョークを使う)
    const DEBUG_TYPE = false; 
    const DEBUG_JOKE = "Why do programmers prefer dark mode? ... Because light attracts bugs!";
    const DEBUG_JOKE_JP = "なぜプログラマーはダークモードを好むのか？ ... 光はバグを引き寄せるからさ！";
    const DEBUG_HIRAGANA = "なぜぷろぐらまーはだーくもーどをこのむのか？ひかりはばぐをひきよせるからさ！";
    
    // Official Joke API
    const JOKE_API_URL = 'https://official-joke-api.appspot.com/random_joke';

    // kuroshiro API プロキシサーバー URL
    const KUROSHIRO_API_PROXY_URL = 'https://typing-game-server-3bal.onrender.com/convert';

    // Deepl API プロキシサーバー URL
    const DEEPL_API_PROXY_URL = 'https://typing-game-server-3bal.onrender.com/translate';

    const GAME_TIME_SEC = 60; // 制限時間（秒）

    // 画面要素
    const screens = {
        start: document.getElementById('start-screen'),
        game: document.getElementById('game-screen'),
        result: document.getElementById('result-screen'),
    };
    const loadingMessage = document.getElementById('loading-message');
    const startMessage = document.getElementById('start-message');
    const modeSelectContainer = document.getElementById('mode-select');
    const modeButtons = document.querySelectorAll('.mode-button');
    const jokeStreamContainer = document.getElementById('joke-stream-container');
    
    const japaneseTextElem = document.getElementById('japanese-text');
    const romajiTextElem = document.getElementById('romaji-text');
    const progressBar = document.getElementById('progress-bar');
    const errorMessageElem = document.getElementById('error-message');

    const scoreValueElem = document.getElementById('score-value');
    const correctStrokesElem = document.getElementById('correct-strokes');
    const missStrokesElem = document.getElementById('miss-strokes');
    const accuracyElem = document.getElementById('accuracy');
    const retryButton = document.getElementById('retry-button');

    // ★ 新規追加: リザルト画面の要素
    const usernameInput = document.getElementById('username-input');
    const submitScoreButton = document.getElementById('submit-score-button');
    const submitMessage = document.getElementById('submit-message');
    const rankingList = document.getElementById('ranking-list');
    const scoreSubmissionForm = document.getElementById('score-submission');


    // ゲーム状態
    let timerInterval = null;
    let timeLeft = GAME_TIME_SEC;
    let isGameRunning = false;
    let isTypingStarted = false;
    let currentGameMode = 'japanese'; // 'japanese' or 'english'

    // タイピングデータ
    let englishOriginal = ''; // 英語原文
    let japaneseOriginal = '';
    let hiraganaText = ''; // kuroshiroの変換結果 (ひらがな/カタカナ)
    let typingData = []; // { kana: 'か', romajiOptions: ['ka'], currentOptions: ['ka'], typedRomaji: '' }
    let currentKanaIndex = 0;
    let currentRomajiIndex = 0; // 現在のカナの中で何文字目か

    // スコアリング
    let correctStrokes = 0;
    let missStrokes = 0;

    // ★ 新規追加: 最終スコアを保持
    let lastCalculatedScore = 0;


    // --- 1. 初期化処理 ---

    /**
     * ローマ字変換マップ (複数表記・カタカナ対応)
     */
    const romajiMap = {
        'あ': ['a'], 'い': ['i'], 'う': ['u'], 'え': ['e'], 'お': ['o'],
        'か': ['ka'], 'き': ['ki'], 'く': ['ku'], 'け': ['ke'], 'こ': ['ko'],
        'さ': ['sa'], 'し': ['shi', 'si'], 'す': ['su'], 'せ': ['se'], 'そ': ['so'],
        'た': ['ta'], 'ち': ['chi', 'ti'], 'つ': ['tsu', 'tu'], 'て': ['te'], 'と': ['to'],
        'な': ['na'], 'に': ['ni'], 'ぬ': ['nu'], 'ね': ['ne'], 'の': ['no'],
        'は': ['ha'], 'ひ': ['hi'], 'ふ': ['fu', 'hu'], 'へ': ['he'], 'ほ': ['ho'],
        'ま': ['ma'], 'み': ['mi'], 'む': ['mu'], 'め': ['me'], 'も': ['mo'],
        'や': ['ya'], 'ゆ': ['yu'], 'よ': ['yo'],
        'ら': ['ra'], 'り': ['ri'], 'る': ['ru'], 'れ': ['re'], 'ろ': ['ro'],
        'わ': ['wa'], 'を': ['wo'],
        'が': ['ga'], 'ぎ': ['gi'], 'ぐ': ['gu'], 'げ': ['ge'], 'ご': ['go'],
        'ざ': ['za'], 'じ': ['ji', 'zi'], 'ず': ['zu'], 'ぜ': ['ze'], 'ぞ': ['zo'],
        'だ': ['da'], 'ぢ': ['di', 'ji'], 'づ': ['du', 'zu'], 'で': ['de'], 'ど': ['do'],
        'ば': ['ba'], 'び': ['bi'], 'ぶ': ['bu'], 'べ': ['be'], 'ぼ': ['bo'],
        'ぱ': ['pa'], 'ぴ': ['pi'], 'ぷ': ['pu'], 'ぺ': ['pe'], 'ぽ': ['po'],
        'きゃ': ['kya'], 'きゅ': ['kyu'], 'きょ': ['kyo'],
        'しゃ': ['sha', 'sya'], 'しゅ': ['shu', 'syu'], 'しょ': ['sho', 'syo'],
        'ちゃ': ['cha', 'tya'], 'ちゅ': ['chu', 'tyu'], 'ちょ': ['cho', 'tyo'],
        'にゃ': ['nya'], 'にゅ': ['nyu'], 'にょ': ['nyo'],
        'ひゃ': ['hya'], 'ひゅ': ['hyu'], 'ひょ': ['hyo'],
        'みゃ': ['mya'], 'みゅ': ['myu'], 'みょ': ['myo'],
        'りゃ': ['rya'], 'りゅ': ['ryu'], 'りょ': ['ryo'],
        'ぎゃ': ['gya'], 'ぎゅ': ['gyu'], 'ぎょ': ['gyo'],
        'じゃ': ['ja', 'jya', 'zya'], 'じゅ': ['ju', 'jyu', 'zyu'], 'じょ': ['jo', 'jyo', 'zyo'],
        'ぢゃ': ['dya', 'ja', 'jya', 'zya'], 'ぢゅ': ['dyu', 'ju', 'jyu', 'zyu'], 'ぢょ': ['dyo', 'jo', 'jyo', 'zyo'],
        'びゃ': ['bya'], 'びゅ': ['byu'], 'びょ': ['byo'],
        'ぴゃ': ['pya'], 'ぴゅ': ['pyu'], 'ぴょ': ['pyo'],
        'うぁ': ['wha'], 'うぃ': ['wi'], 'うぇ': ['we'], 'うぉ': ['who'],
        'ふぁ': ['fa'], 'ふぃ': ['fi'], 'ふぇ': ['fe'], 'ふぉ': ['fo'],
        'てぃ': ['thi'], 'とぅ': ['twu'], 'でぃ': ['dhi'], 'どぅ': ['dwu'],

        // カタカナ追加
        'ア': ['a'], 'イ': ['i'], 'ウ': ['u'], 'エ': ['e'], 'オ': ['o'],
        'カ': ['ka'], 'キ': ['ki'], 'ク': ['ku'], 'ケ': ['ke'], 'コ': ['ko'],
        'サ': ['sa'], 'シ': ['shi', 'si'], 'ス': ['su'], 'セ': ['se'], 'ソ': ['so'],
        'タ': ['ta'], 'チ': ['chi', 'ti'], 'ツ': ['tsu', 'tu'], 'テ': ['te'], 'ト': ['to'],
        'ナ': ['na'], 'ニ': ['ni'], 'ヌ': ['nu'], 'ネ': ['ne'], 'ノ': ['no'],
        'ハ': ['ha'], 'ヒ': ['hi'], 'フ': ['fu', 'hu'], 'ヘ': ['he'], 'ホ': ['ho'],
        'マ': ['ma'], 'ミ': ['mi'], 'ム': ['mu'], 'メ': ['me'], 'モ': ['mo'],
        'ヤ': ['ya'], 'ユ': ['yu'], 'ヨ': ['yo'],
        'ラ': ['ra'], 'リ': ['ri'], 'ル': ['ru'], 'レ': ['re'], 'ロ': ['ro'],
        'ワ': ['wa'], 'ヲ': ['wo'],
        'ガ': ['ga'], 'ギ': ['gi'], 'グ': ['gu'], 'ゲ': ['ge'], 'ゴ': ['go'],
        'ザ': ['za'], 'ジ': ['ji', 'zi'], 'ズ': ['zu'], 'ゼ': ['ze'], 'ゾ': ['zo'],
        'ダ': ['da'], 'ヂ': ['di', 'ji'], 'ヅ': ['du', 'zu'], 'デ': ['de'], 'ド': ['do'],
        'バ': ['ba'], 'ビ': ['bi'], 'ブ': ['bu'], 'ベ': ['be'], 'ボ': ['bo'],
        'パ': ['pa'], 'ピ': ['pi'], 'プ': ['pu'], 'ペ': ['pe'], 'ポ': ['po'],
        'キャ': ['kya'], 'キュ': ['kyu'], 'キョ': ['kyo'],
        'シャ': ['sha', 'sya'], 'シュ': ['shu', 'syu'], 'ショ': ['sho', 'syo'],
        'チャ': ['cha', 'tya'], 'チュ': ['chu', 'tyu'], 'チョ': ['cho', 'tyo'],
        'ニャ': ['nya'], 'ニュ': ['nyu'], 'ニョ': ['nyo'],
        'ヒャ': ['hya'], 'ヒュ': ['hyu'], 'ヒョ': ['hyo'],
        'ミャ': ['mya'], 'ミュ': ['myu'], 'ミョ': ['myo'],
        'リャ': ['rya'], 'リュ': ['ryu'], 'リョ': ['ryo'],
        'ギャ': ['gya'], 'ギュ': ['gyu'], 'ギョ': ['gyo'],
        'ジャ': ['ja', 'jya', 'zya'], 'ジュ': ['ju', 'jyu', 'zyu'], 'ジョ': ['jo', 'jyo', 'zyo'],
        'ヂャ': ['dya', 'ja', 'jya', 'zya'], 'ヂュ': ['dyu', 'ju', 'jyu', 'zyu'], 'ヂョ': ['dyo', 'jo', 'jyo', 'zyo'],
        'ビャ': ['bya'], 'ビュ': ['byu'], 'ビョ': ['byo'],
        'ピャ': ['pya'], 'ピュ': ['pyu'], 'ピョ': ['pyo'],
        'ヴァ': ['va'], 'ヴィ': ['vi'], 'ヴ': ['vu'], 'ヴェ': ['ve'], 'ヴォ': ['vo'],
        'ウィ': ['wi'], 'ウェ': ['we'], 'ウォ': ['who'],
        'ファ': ['fa'], 'フィ': ['fi'], 'フェ': ['fe'], 'フォ': ['fo'],
        'ティ': ['thi'], 'トゥ': ['twu'], 'ディ': ['dhi'], 'ドゥ': ['dwu'],
        'チェ': ['che'], 'シェ': ['she'], 'ジェ': ['je'], 
        
        // 記号
        '、': [','], '。': ['.'], 'ー': ['-'], ' ': [' '], '　': [' '],
        '！': ['!'], '？': ['?'], '（': ['('], '）': [')'],
        '１': ['1'], '２': ['2'], '３': ['3'], '４': ['4'], '５': ['5'],
        '６': ['6'], '７': ['7'], '８': ['8'], '９': ['9'], '０': ['0'],
    };

    /**
     * 日本語文字列(ひらがな/カタカナ)をタイピングデータに変換 (拗音、促音、撥音を処理)
     */
    function parseTextToTypingData(text) {
        const data = [];
        let i = 0;
        while (i < text.length) {
            let kana = text[i];
            let options = [];

            // 拗音・小文字 (きゃ、キャ など)
            if (i + 1 < text.length && 'ゃゅょぁぃぅぇぉャュョァィゥェォ'.includes(text[i + 1])) {
                let combinedKana = text.substring(i, i + 2);
                if (romajiMap[combinedKana]) {
                    kana = combinedKana;
                    options = [...romajiMap[kana]];
                    i++;
                }
            }
            
            // 促音 (っ, ッ)
            if (kana === 'っ' || kana === 'ッ') {
                if (i + 1 < text.length) {
                    let nextKana = text[i + 1];
                    // 次のカナが拗音の場合
                    if (i + 2 < text.length && 'ゃゅょャュョ'.includes(text[i + 2])) {
                        nextKana = text.substring(i + 1, i + 3);
                    }
                    
                    const nextOptions = getRomajiOptions(nextKana); // 次のカナのローマ字候補
                    if (nextOptions.length > 0) {
                        const firstChar = nextOptions[0][0];
                        // 子音でない場合 (あ、い、う、え、お、ん、など)
                        if (!'aiueon'.includes(firstChar)) { 
                            options = [firstChar, 'xtu', 'xtsu', 'ltu', 'ltsu']; // 'tta' の 't' 部分, 'xtu'なども許可
                        } else {
                            options = ['xtu', 'xtsu', 'ltu', 'ltsu']; // 'っあ' などの場合
                        }
                    } else {
                        options = ['xtu', 'xtsu', 'ltu', 'ltsu']; // マップにない文字
                    }
                } else {
                    options = ['xtu', 'xtsu', 'ltu', 'ltsu']; // 文末の 'っ'
                }
            
            // 撥音 (ん, ン)
            } else if (kana === 'ん' || kana === 'ン') {
                if (i + 1 < text.length) {
                    const nextChar = text[i + 1];
                    // 次が母音(あいうえおアイウエオ)、や行(やゆよヤユヨ)、な行(なにぬねのナニヌネノ)の場合
                    if ('あいうえおやゆよなにぬねのアイウエオヤユヨナニヌネノ'.includes(nextChar)) {
                        options = ["n'", "nn", "xn"];
                    } else {
                        options = ['n', 'nn', "n'", "xn"]; // 'nn', "n'", "xn" は常に許可
                    }
                } else {
                    options = ['n', 'nn', "n'", "xn"]; // 文末の 'ん'
                }
            
            // その他の文字
            } else if (romajiMap[kana]) {
                options = [...romajiMap[kana]];
            } else {
                options = [kana]; // 不明な文字はそのまま
            }

            // ★修正: 新しいプロパティ名に合わせる
            data.push({
                kana: kana,
                romajiOptions: options, // 全候補
                currentOptions: [...options], // 現在有効な候補（初期値は全候補）
                typedRomaji: '' // 入力済み文字列
            });
            i++;
        }
        return data;
    }

    /**
     * 英語文字列をタイピングデータに変換 (1文字ずつ)
     */
    function parseEnglishToTypingData(english) {
        const data = [];
        for (let i = 0; i < english.length; i++) {
            const char = english[i];
            // ★修正: 新しいプロパティ名に合わせる
            data.push({
                kana: char, // 英語ではkanaにも文字そのものを入れる
                romajiOptions: [char],
                currentOptions: [char], // 英語モードでは常に1つの候補
                typedRomaji: ''
            });
        }
        return data;
    }


    /**
     * ひらがな/カタカナ(拗音含む)からローマ字候補を取得するヘルパー
     */
    function getRomajiOptions(kana) {
        if (romajiMap[kana]) {
            return romajiMap[kana];
        }
        // 拗音チェック
        if (kana.length === 2 && 'ゃゅょャュョ'.includes(kana[1])) {
             if (romajiMap[kana]) {
                return romajiMap[kana];
             }
        }
        // 通常のカナ
        if (kana.length > 0 && romajiMap[kana[0]]) {
             return romajiMap[kana[0]];
        }
        return [];
    }


    // --- 2. API連携 ---

    /**
     * Joke APIからジョークを取得
     */
    async function fetchJoke() {
        if (DEBUG_TYPE) {
            englishOriginal = DEBUG_JOKE;
            return englishOriginal;
        }

        try {
            const response = await fetch(JOKE_API_URL);
            if (!response.ok) throw new Error('Joke API request failed');
            const joke = await response.json();
            englishOriginal = `${joke.setup} ... ${joke.punchline}`;
            return englishOriginal;
        } catch (error) {
            console.error(error);
            showError('Failed to fetch joke. Using fallback.');
            englishOriginal = 'Failed to fetch joke. This is a fallback joke.';
            return englishOriginal;
        }
    }

    /**
     * DeepL APIで翻訳
     */
    async function translateText(text, targetLang = 'JA') {
        if (DEBUG_TYPE) {
            japaneseOriginal = DEBUG_JOKE_JP;
            return japaneseOriginal;
        }

        try {
            const response = await fetch(DEEPL_API_PROXY_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ text: text }) 
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Translation server error');
            }

            const data = await response.json();
            
            if (data.translation) {
                japaneseOriginal = data.translation;
                return data.translation;
            } else {
                throw new Error('Invalid response from server');
            }
        } catch (error) {
            console.error('翻訳エラー:', error);
            showError('Failed to translate. Using fallback.');
            japaneseOriginal = '翻訳に失敗しました。';
            return japaneseOriginal;
        }
    }

    /**
     * kuroshiroでひらがな/カタカナに変換
     */
    async function convertToHiragana(text) {
        if (DEBUG_TYPE) {
            return DEBUG_HIRAGANA; // 固定のひらがなテキスト
        }

        try {
            const response = await fetch(KUROSHIRO_API_PROXY_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: text,
                    to: 'hiragana' // API側でカタカナも混じる設定
                })
            });

            const data = await response.json();

            if (response.ok) {
                return data.converted;
            } else {
                return `エラー: ${data.error || '不明なエラー'}`;
            }

        } catch (error) {
            console.error("Fetch Error:", error);
            showError('Failed to convert. Using fallback.');
            return 'ヘンカンニシッパイシマシタ';
        }
    }


    // --- 3. ゲームロジック ---

    /**
     * 画面切り替え
     */
    function switchScreen(screenName) {
        Object.values(screens).forEach(screen => screen.classList.remove('active'));
        if (screens[screenName]) {
            screens[screenName].classList.add('active');
        }
    }

    /**
     * ゲーム開始処理
     */
    async function startGame() {
        switchScreen('game');
        resetGame();
        showError('');
        console.log(`Starting game in ${currentGameMode} mode...`);

        // ★新規追加: ロードメッセージの表示
        japaneseTextElem.textContent = 'Loading phrase...';
        romajiTextElem.innerHTML = '<span class="untyped">Please wait...</span>';

        // 1. ジョーク取得 (英語原文が englishOriginal にセットされる)
        await fetchJoke();
        console.log('Fetched Joke (English):', englishOriginal);

        if (currentGameMode === 'japanese') {
            // 2. 翻訳
            await translateText(englishOriginal);
            console.log('Japanese Translation:', japaneseOriginal);
            
            // 3. ひらがな＆ローマ字データ生成
            hiraganaText = await convertToHiragana(japaneseOriginal);
            console.log('Hiragana/Katakana Text:', hiraganaText);
            typingData = parseTextToTypingData(hiraganaText); // カタカナ対応版

            japaneseTextElem.textContent = japaneseOriginal; // 日本語原文
            romajiTextElem.classList.remove('english-mode');
        
        } else { // 'english' モード
            // 3. 英語用タイピングデータ生成
            typingData = parseEnglishToTypingData(englishOriginal);
            
            japaneseTextElem.textContent = "Type the English text below:"; // 英語モード用の指示
            romajiTextElem.classList.add('english-mode');
        }

        if (typingData.length === 0) {
            showError('Failed to create typing data. Retrying...');
            setTimeout(startGame, 1000); // 1秒後にリトライ
            return;
        }

        // 4. 画面描画
        currentKanaIndex = 0;
        currentRomajiIndex = 0;
        updateRomajiDisplay();
        
        isGameRunning = true;
    }

    /**
     * ゲームリセット
     */
    function resetGame() {
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = null;
        timeLeft = GAME_TIME_SEC;
        isGameRunning = false;
        isTypingStarted = false;
        
        correctStrokes = 0;
        missStrokes = 0;
        
        progressBar.style.width = '100%';
        romajiTextElem.innerHTML = '';
        japaneseTextElem.textContent = 'Loading phrase...';
    }

    /**
     * タイマースタート/再開
     */
    function startTimer() {
        if (timerInterval) return; // 既にタイマーが動いていたら何もしない
        
        isTypingStarted = true; // タイピング開始フラグを立てる (startGame直後のキー入力でのみ使用)
        
        timerInterval = setInterval(() => {
            timeLeft--;
            const widthPercent = (timeLeft / GAME_TIME_SEC) * 100;
            progressBar.style.width = `${widthPercent}%`;

            if (timeLeft <= 0) {
                endGame();
            }
        }, 1000);
    }

    /**
     * タイマーを一時停止する
     */
    function pauseTimer() {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
    }

    /**
     * ゲーム終了 (時間切れ)
     */
    function endGame() {
        if (!isGameRunning) return; 

        isGameRunning = false;
        pauseTimer(); // ★修正: pauseTimer() を使用
        
        showResult();
        switchScreen('result');
    }

    /**
     * リザルト表示 (★ 修正)
     */
    function showResult() {
        const totalStrokes = correctStrokes + missStrokes;
        const accuracy = totalStrokes > 0 ? (correctStrokes / totalStrokes) * 100 : 0;
        
        const rawScore = (correctStrokes - missStrokes) / GAME_TIME_SEC * 1000;
        
        // ★ 最終スコアをグローバル変数に保存
        lastCalculatedScore = Math.max(0, Math.floor(rawScore)); 

        // ★ 新規追加: 紙吹雪の起動
        // (canvas-confetti ライブラリを使用する場合)
        launchConfetti();

        scoreValueElem.textContent = lastCalculatedScore; // 保存したスコアを表示
        correctStrokesElem.textContent = correctStrokes;
        missStrokesElem.textContent = missStrokes;
        accuracyElem.textContent = `${accuracy.toFixed(1)}%`;

        // ★ スコア送信フォームをリセットして表示
        scoreSubmissionForm.classList.remove('hidden');
        submitMessage.classList.add('hidden');
        submitMessage.classList.remove('error');
        usernameInput.value = '';
        submitScoreButton.disabled = false;

        // ★ ランキングを読み込む
        fetchAndDisplayRankings();
    }

    /**
     * ★ 新規追加: 紙吹雪を起動する関数
     * (canvas-confetti ライブラリのラッパー)
     */
    function launchConfetti() {
        if (typeof confetti === 'function') {
            // スコアが高いほど、長く派手に演出するように調整可能
            const particleCount = lastCalculatedScore > 500 ? 300 : 150;
            
            // 画面中央から上向きに紙吹雪を打ち上げる
            confetti({
                particleCount: particleCount,
                spread: 90,
                origin: { y: 0.6 } // 画面の60%の高さから
            });
            
            // 2回目（クラッカーのような爆発をシミュレート）
             confetti({
                particleCount: 100,
                spread: 60,
                origin: { x: 0.2, y: 0.8 } 
            });
            confetti({
                particleCount: 100,
                spread: 60,
                origin: { x: 0.8, y: 0.8 } 
            });
        }
    }

    /**
     * ローマ字表示の更新 (異表記対応済み)
     */
    function updateRomajiDisplay() {
        let html = '';
        
        // 全体の文字列を構築 (この関数内で fullString を使うのは危険なため、処理を変更します)

        // === 1. 完了済みのカナのローマ字を表示 ===
        for (let i = 0; i < currentKanaIndex; i++) {
            // 完了済みのカナの最終的なローマ字表記（ typedRomaji に最終結果が入っている想定）
            // 英語モードの場合はそのまま文字を使用
            const typedText = typingData[i].typedRomaji || typingData[i].romajiOptions[0];
            html += `<span class="typed">${escapeHTML(typedText)}</span>`;
        }
        
        // === 2. 現在入力中のカナ（ハイライト）を表示 ===
        if (currentKanaIndex < typingData.length) {
            const currentData = typingData[currentKanaIndex];
            const typed = currentData.typedRomaji; // 入力済みの部分 (例: 's')
            
            // ★修正点: 現在有効な候補の中で最も短いものを取得し、打つべき文字列とする
            const shortestOption = currentData.currentOptions.reduce((a, b) => a.length <= b.length ? a : b);
            
            // 1. 入力済み (typed) の部分
            if (typed.length > 0) {
                html += `<span class="typed">${escapeHTML(typed)}</span>`;
            }
            
            // 2. 現在打つべき文字 (current) の部分
            const remainingRomaji = shortestOption.substring(typed.length);
            
            if (remainingRomaji.length > 0) {
                
                // 英語モードでスペースの場合、見やすくする
                if (currentGameMode === 'english' && shortestOption === ' ' && typed.length === 0) {
                    // スペースを '_' で表示し、ハイライトする
                    html += `<span class="current space">_</span>`;
                } else {
                    // 現在の文字 (ハイライト)
                    html += `<span class="current">${escapeHTML(remainingRomaji.charAt(0))}</span>`;

                    // 未入力 (untyped) の部分
                    if (remainingRomaji.length > 1) {
                        html += `<span class="untyped">${escapeHTML(remainingRomaji.substring(1))}</span>`;
                    }
                }
            }
        }

        // === 3. 未入力のカナのローマ字を表示 ===
        for (let i = currentKanaIndex + 1; i < typingData.length; i++) {
            const untypedData = typingData[i];
            
            // 未入力のカナのローマ字表記（最初の候補を使用）
            const untypedText = untypedData.romajiOptions[0] || untypedData.kana;
            html += `<span class="untyped">${escapeHTML(untypedText)}</span>`;
        }

        romajiTextElem.innerHTML = html;
    }

    /**
     * HTMLエスケープ用ヘルパー
     */
    function escapeHTML(str) {
        if (typeof str !== 'string') return '';
        return str.replace(/[&<>"']/g, function(match) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            }[match];
        });
    }


    // --- 4. スタート画面アニメーション ---

    const sampleJokes = [
        "Why don't scientists trust atoms? Because they make up everything!",
        "科学者を信用できないのはなぜ？ ... 彼らはすべてをデッチ上げている(make up)からね！",
        "I told my wife she was drawing her eyebrows too high. She looked surprised.",
        "妻に「眉毛を高く描きすぎだよ」と言ったら、彼女は驚いた顔をしていた。",
        "Why did the scarecrow win an award? Because he was outstanding in his field!",
        "カカシが賞をもらったのはなぜ？ ... 彼はその分野(field=畑)で際立って(outstanding=外に立って)いたから！",
        "What do you call fake spaghetti? An Impasta!",
        "偽物のスパゲッティを何と呼ぶ？ ... インパスタ（詐欺師）！",
        "Did you hear about the mathematician who’s afraid of negative numbers? He’ll stop at nothing to avoid them.",
        "負の数が怖い数学者の話聞いた？ ... 彼はそれを避けるためなら何でも(nothing=0)するんだ。",
        "What does an angry pepper do? ... It gets jalapeño face.",
        "怒った唐辛子は何をする？ ... ジャラペーニョ顔になる。",
        "Why did the butcher work extra hours at the shop? ... To make ends meat.",
        "肉屋が店で残業したのはなぜ？ ... 収支を合わせるために(meat=肉をmeat=meetにかけている)。",
        "Why don't programmers like nature? It has too many bugs.",
        "プログラマーが自然を嫌うのはなぜ？ ... バグ(bugs)が多すぎるから。",
        "Did you hear about the bread factory burning down? ... They say the business is toast.",
        "パン工場が燃えたのを聞いた？ ... そのビジネスはトースト(toast=焼けたパン/終わった)だと言われている。",
    ];

    /**
     * スタート画面の背景ジョークを流す
     */
    function startJokeStream() {
        if (!jokeStreamContainer) return;
        
        jokeStreamContainer.innerHTML = ''; 
        const containerHeight = screens.start.offsetHeight;
        const itemCount = 20; 

        for (let i = 0; i < itemCount; i++) {
            const jokeElem = document.createElement('div');
            jokeElem.classList.add('joke-stream-item');
            
            const jokeText = sampleJokes[Math.floor(Math.random() * sampleJokes.length)];
            jokeElem.textContent = jokeText;
            
            const yPos = Math.random() * containerHeight;
            const delay = Math.random() * 15; 
            const duration = 10 + Math.random() * 10; 
            
            jokeElem.style.top = `${yPos}px`;
            jokeElem.style.animationDelay = `-${delay}s`; 
            jokeElem.style.animationDuration = `${duration}s`;
            
            jokeElem.style.fontSize = `${0.8 + Math.random() * 0.6}rem`;
            jokeElem.style.opacity = 0.2 + Math.random() * 0.3; 
            
            jokeStreamContainer.appendChild(jokeElem);
        }
    }

    /**
     * ★ 新規追加: Firestoreにスコアを送信
     */
    async function handleSubmitScore() {
        const username = usernameInput.value.trim();

        if (!username) {
            submitMessage.textContent = 'Please enter a name!';
            submitMessage.classList.add('error');
            submitMessage.classList.remove('hidden');
            return;
        }

        if (username.length > 10) {
            submitMessage.textContent = 'Name must be 10 characters or less.';
            submitMessage.classList.add('error');
            submitMessage.classList.remove('hidden');
            return;
        }

        submitScoreButton.disabled = true;
        submitMessage.textContent = 'Submitting...';
        submitMessage.classList.remove('error');
        submitMessage.classList.remove('hidden');

        try {
            // Firestoreにデータを追加
            await rankingsCol.add({
                name: username,
                score: lastCalculatedScore,
                mode: currentGameMode, // どのモードのスコアか保存
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });

            submitMessage.textContent = 'Score submitted!';
            scoreSubmissionForm.classList.add('hidden'); // 送信後はフォームを隠す

            // ランキングを再読み込み
            fetchAndDisplayRankings();

        } catch (error) {
            console.error('Error adding document: ', error);
            submitMessage.textContent = 'Error submitting score. Please try again.';
            submitMessage.classList.add('error');
            submitScoreButton.disabled = false;
        }
    }

    /**
     * ★ 新規追加: Firestoreからランキングを取得して表示
     */
    async function fetchAndDisplayRankings() {
        rankingList.innerHTML = '<li>Loading...</li>';

        try {
            const snapshot = await rankingsCol
                .where('mode', '==', currentGameMode) // 現在のモードのランキングのみ取得
                .orderBy('score', 'desc')           // スコアの高い順
                .limit(10)                          // 上位10件
                .get();

            if (snapshot.empty) {
                rankingList.innerHTML = '<li>No scores yet. Be the first!</li>';
                return;
            }

            rankingList.innerHTML = ''; // リストをクリア
            let rank = 1;

            snapshot.forEach(doc => {
                const data = doc.data();
                const li = document.createElement('li');
                
                // escapeHTMLは以前のscript.jsにある想定
                const safeName = escapeHTML(data.name); 

                li.innerHTML = `<span>${rank}. ${safeName}</span> <span>${data.score}</span>`;
                rankingList.appendChild(li);
                rank++;
            });

        } catch (error) {
            console.error('Error fetching rankings: ', error);
            rankingList.innerHTML = '<li>Error loading rankings.</li>';
        }
    }


    // --- 5. イベントハンドラ ---

    /**
     * キー入力処理
     */
    function handleKeyDown(e) {
        // 起動画面
        if (screens.start.classList.contains('active')) {
            if (e.code === 'Space') {
                e.preventDefault(); 
                startGame();
            }
            return;
        }
        
        // リザルト画面
        if (screens.result.classList.contains('active')) {
            if (e.code === 'Space') {
                e.preventDefault();
                switchScreen('start');
                startJokeStream(); // スタートに戻ったらアニメーション再開
            }
            return;
        }

        // タイピング画面
        if (isGameRunning) {
            const key = e.key;

            // 制御文字(Shift, Ctrlなど)以外は基本的に受け付ける
            if (key.length > 1) { 
                return;
            }

            e.preventDefault(); // ゲーム中のキー入力を無効化

            if (!isTypingStarted) {
                // ★修正: 初回のみ時間とフラグを設定
                timeLeft = GAME_TIME_SEC; 
                isTypingStarted = true; // ここで初めてフラグをtrueにする
                startTimer();
            }

            if (currentKanaIndex >= typingData.length) {
                return; // 全て打ち終わった
            }
            
            // 英語モードの処理（そのまま）
            if (currentGameMode === 'english') {
                handleEnglishTyping(key);
                return;
            }

            // --- 以下、日本語モードの処理 ---
            const inputKeyLower = key.toLowerCase();
            const currentData = typingData[currentKanaIndex];
            
            // (A) 記号の直接入力チェック
            // 現在のカナが記号 (例: '！') で、romajiMap にそのキー (例: '!') があるか
            if (romajiMap[currentData.kana] && romajiMap[currentData.kana].includes(key)) {
                // 記号は1文字でカナが完了する
                currentData.typedRomaji = key; // ★修正: typedRomajiに保存
                
                // --- 正しい入力 ---
                handleCorrectStroke(); // スコア加算とエラークリア

                // 次のカナへ進む
                currentKanaIndex++;
                // currentRomajiIndex は使わないが、念のため 0 にする
                currentRomajiIndex = 0; 

                if (currentKanaIndex >= typingData.length) {
                    loadNextPhrase();
                } 
                // else 以降の updateRomajiDisplay() に処理を任せる
                
                updateRomajiDisplay();
                return;
            }


            // ★★★ 核心的な修正: 異表記対応のロジック ★★★

            const typed = currentData.typedRomaji;
            const nextTyped = typed + inputKeyLower; // 次に入力される文字列

            // 1. 新しい入力文字列 (nextTyped) をプレフィックスとして含む候補を探す
            
            // 候補を絞り込む
            let matchingOptions = currentData.currentOptions.filter(option => 
                option.startsWith(nextTyped)
            );

            // 2. 特殊文字のチェックと処理
            const isSpecialKana = ['っ', 'ッ', 'ん', 'ン'].includes(currentData.kana);

            // 【促音 'っ' の判定】
            if (['っ', 'ッ'].includes(currentData.kana) && typed.length === 0) {
                 if (currentKanaIndex + 1 < typingData.length) {
                    const nextOptions = typingData[currentKanaIndex + 1].romajiOptions;
                    // 次のカナの最初の文字が子音であるかチェック
                    const firstCharOfNextKana = nextOptions[0][0];
                    const isConsonant = !['a', 'i', 'u', 'e', 'o', 'n', 'y', 'w'].includes(firstCharOfNextKana);
                    
                    if (isConsonant && inputKeyLower === firstCharOfNextKana) {
                        // 子音重ね打ちによる促音確定
                        currentData.typedRomaji = inputKeyLower; // 例: 'k'
                        matchingOptions = [inputKeyLower]; // 確定した候補
                        
                        // 促音は確定と同時に完了
                        handleCorrectStroke();
                        currentKanaIndex++;
                        currentRomajiIndex = 0;
                        updateRomajiDisplay();
                        
                        if (currentKanaIndex >= typingData.length) {
                             loadNextPhrase();
                        }
                        return;
                    }
                }
            } 
            
            // 【撥音 'ん' の判定】
            // 次のカナをチェックし、'n' を打った後の挙動を変更する
            if (['ん', 'ン'].includes(currentData.kana)) {
                let nextIsVowelOrY = false;
                if (currentKanaIndex + 1 < typingData.length) {
                    const nextKana = typingData[currentKanaIndex + 1].kana;
                    if ('あいうえおやゆよアイウエオヤユヨ'.includes(nextKana)) {
                        nextIsVowelOrY = true;
                    }
                }
                
                if (typed === '' && inputKeyLower === 'n') {
                    if (!nextIsVowelOrY && currentData.romajiOptions.includes('n')) {
                        // 次が母音・ヤ行でなく、'n' が候補にある場合（例: 'んて' -> 'nte', 文末）
                        currentData.typedRomaji = 'n'; // 'n' に確定
                        matchingOptions = ['n']; 
                        
                        // 撥音は確定と同時に完了
                        handleCorrectStroke();
                        currentKanaIndex++;
                        currentRomajiIndex = 0;
                        updateRomajiDisplay();

                        if (currentKanaIndex >= typingData.length) {
                             loadNextPhrase();
                        }
                        return;
                    } else if (nextIsVowelOrY) {
                         // 次が母音・ヤ行の場合、'n' はまだ完了ではない（'nn' or "n'"が必要）
                         // 候補を 'nn' と "n'" のみに絞り込む
                         currentData.typedRomaji = 'n';
                         currentData.currentOptions = currentData.romajiOptions.filter(opt => opt.startsWith('n') && opt.length > 1);
                         matchingOptions = currentData.currentOptions;
                         
                         // スコアは加算して表示を更新
                         handleCorrectStroke();
                         updateRomajiDisplay();
                         return; // 完了ではないので次のカナに進まない
                    }
                }
            }
            
            
            // 3. 判定と次のアクション（一般カナと、特殊文字の非確定入力）
            if (matchingOptions.length > 0) {
                // --- 正しい入力 ---
                handleCorrectStroke(); 

                // 状態を更新
                currentData.typedRomaji = nextTyped;
                currentData.currentOptions = matchingOptions; 
                
                // ★修正: 最短のオプションと比較して完了判定を行う
                const shortestOption = currentData.romajiOptions.reduce((a, b) => a.length <= b.length ? a : b);
                
                const isCompleted = nextTyped.length >= shortestOption.length && 
                                    currentData.romajiOptions.some(opt => opt === nextTyped);
                                    
                if (isCompleted) {
                    // 次のカナへ進む
                    currentKanaIndex++;
                    // 次のカナに備えてリセット（typedRomajiは完了したカナとして残す）
                    currentData.currentOptions = currentData.romajiOptions; 

                    if (currentKanaIndex >= typingData.length) {
                        loadNextPhrase(); 
                    }
                } 
                
                updateRomajiDisplay();

            } else {
                // --- 間違った入力 ---
                handleMissStroke();
            }
        }
    }

    /**
     * 英語モードのタイピング処理
     */
    function handleEnglishTyping(inputKey) {
        const currentData = typingData[currentKanaIndex];
        // ★修正: currentOptionsから期待文字を取得
        const expectedChar = currentData.currentOptions[0]; 

        // 英語モード：大文字小文字を区別しない
        if (inputKey.toLowerCase() === expectedChar.toLowerCase()) {
            correctStrokes++; // スコア加算
            
            // 英語モードでは typedRomajiを更新しないが、次のカナに進むことで完了したカナとして表示される。
            // 完了済み表示ロジックは typedRomajiが空なら romajiOptions[0] を使うため、このままでOK。
            
            currentKanaIndex++; // 英語は1文字ずつ進む
            
            if (currentKanaIndex >= typingData.length) {
                if (isGameRunning) {
                    loadNextPhrase();
                }
            }
            
            updateRomajiDisplay();
            showError('');
            
        } else {
            handleMissStroke();
        }
    }

    /**
     * 正解打鍵処理 (日本語モード/英語モード共通)
     * ★CRASH FIX: 不要なインデックス進行ロジックを削除
     */
    function handleCorrectStroke() {
        correctStrokes++;
        // currentKanaIndex/currentRomajiIndexの更新、loadNextPhraseの呼び出しは
        // 異表記対応ロジック（handleKeyDown/handleEnglishTyping内）に完全に移譲します。
        showError(''); 
    }

    /**
     * ミス打鍵処理
     */
    function handleMissStroke() {
        missStrokes++;
        // ミスしても演出はなし
        // showError('Miss!');
        // setTimeout(() => {
        //     // エラーメッセージが 'Miss!' の場合のみクリアする
        //     if (errorMessageElem.textContent === 'Miss!') {
        //         showError('');
        //     }
        // }, 500);
    }

    /**
     * 次のフレーズをロード (タイマーは止めない)
     */
    async function loadNextPhrase() {
        // ★修正点1: タイマーを停止
        const wasTypingStarted = isTypingStarted && timerInterval; // ロード前にタイマーが動いていたか
        if (isGameRunning && wasTypingStarted) {
            pauseTimer();
        }

        romajiTextElem.innerHTML = '<span class="typed">...Loading next phrase...</span>';
        japaneseTextElem.textContent = '...Loading...';

        await fetchJoke(); 

        if (currentGameMode === 'japanese') {
            await translateText(englishOriginal);
            hiraganaText = await convertToHiragana(japaneseOriginal);
            typingData = parseTextToTypingData(hiraganaText); 
            japaneseTextElem.textContent = japaneseOriginal;
        
        } else { // 'english' モード
            typingData = parseEnglishToTypingData(englishOriginal);
            japaneseTextElem.textContent = "Type the English text below:";
        }
        
        currentKanaIndex = 0;
        currentRomajiIndex = 0;
        
        if (isGameRunning) { // 時間切れでなければ表示更新
            updateRomajiDisplay();

            // ★修正点2: ロード完了後、以前動いていた場合のみタイマーを再開
            if (wasTypingStarted) {
                startTimer(); // startTimerは動いていなければ再開するようになった
            }
        }
    }

    /**
     * エラーメッセージ表示
     */
    function showError(message) {
        if (message) {
            errorMessageElem.textContent = message;
            errorMessageElem.classList.remove('hidden');
        } else {
            errorMessageElem.classList.add('hidden');
        }
    }

    // --- 6. イベントリスナー登録 ---
    
    // キーボード入力
    window.addEventListener('keydown', handleKeyDown);

    // リトライボタン (★ 修正)
    retryButton.addEventListener('click', () => {
        switchScreen('start'); 
        startJokeStream(); // スタートに戻ったらアニメーション再開
        
        // ★ 送信フォームを隠す
        scoreSubmissionForm.classList.add('hidden');
    });

    // モード選択ボタン
    modeButtons.forEach(button => {
        button.addEventListener('click', () => {
            modeButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            currentGameMode = button.dataset.mode;
            console.log('Mode changed to:', currentGameMode);
        });
    });

    // ★ 新規追加: スコア送信ボタン
    submitScoreButton.addEventListener('click', handleSubmitScore);

    // --- 実行開始 ---
    loadingMessage.classList.add('hidden');
    startMessage.classList.remove('hidden');
    modeSelectContainer.classList.remove('hidden'); // モード選択を表示
    
    // スタート画面アニメーション開始
    startJokeStream();

    // ウィンドウリサイズ時にも再計算
    window.addEventListener('resize', startJokeStream);

});