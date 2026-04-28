import { useEffect, useMemo, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'word-crush-player-name';
const HISTORY_STORAGE_KEY = 'word-crush-game-history';

type Screen = 'home' | 'newGame' | 'scoreTable' | 'market' | 'game';
type GridOption = {
  label: string;
  level: string;
  moves: number;
  size: number;
};

type GameCell = {
  row: number;
  col: number;
  letter: string;
  powerType?: 'row-clear' | 'bomb' | 'column-clear' | 'mega' | null;
};

type JokerType = 'balık' | 'tekerlek' | 'lolipop' | 'değiştirme' | 'karıştırma' | 'parti';

type JokerItem = {
  id: JokerType;
  name: string;
  cost: number;
  description: string;
  icon?: string;
};

type JokerInventory = {
  balık: number;
  tekerlek: number;
  lolipop: number;
  değiştirme: number;
  karıştırma: number;
  parti: number;
};

const POWER_THRESHOLDS = {
  'row-clear': 4,
  'bomb': 5,
  'column-clear': 6,
  'mega': 7,
};

const POWER_SYMBOLS: Record<string, string> = {
  'row-clear': '⇆',
  'bomb': '✹',
  'column-clear': '⇅',
  'mega': '✪',
};

const WORD_DICTIONARY = new Set([
  'soru', 'kedi', 'masa', 'oyun', 'harf', 'ses', 'yol', 'kale', 'ana', 'kumaş', 'kelime',
  'kitap', 'kalem', 'defter', 'kağıt', 'taş', 'su', 'ateş', 'rüzgar', 'yer', 'göğ',
  'güneş', 'ay', 'yıldız', 'kırmızı', 'mavi', 'yeşil', 'sarı', 'beyaz', 'siyah',
  'köpek', 'kuş', 'balık', 'at', 'gemi', 'uçak', 'araba', 'tren', 'ev', 'şehir',
  'dağ', 'deniz', 'nehir', 'göl', 'orman', 'ağaç', 'yaprak', 'çiçek', 'elma', 'portakal',
  'ekmek', 'çorba', 'yemek', 'kahve', 'çay', 'süt', 'peynir', 'yoğurt', 'et', 'tavuk',
  'başlangıç', 'bitiş', 'skor', 'puan', 'hamle', 'kazanmak', 'kaybetmek', 'bilgisayar',
  'telefon', 'tablet', 'ekran', 'tuş', 'yazıcı', 'tarayıcı', 'kare', 'daire', 'üçgen',
  'dikdörtgen', 'kenar', 'köşe', 'açı', 'bir', 'iki', 'üç', 'dört', 'beş', 'altı',
  'yedi', 'sekiz', 'dokuz', 'on', 'yüz', 'ağır', 'hafif', 'yüksek', 'alçak', 'geniş',
  'dar', 'uzun', 'kısa', 'kalın', 'ince', 'sert', 'yumuşak', 'sıcak', 'soğuk', 'ılık',
  'güzel', 'çirkin', 'iyi', 'kötü', 'büyük', 'küçük', 'yeni', 'eski', 'temiz', 'kirli',
  'hızlı', 'yavaş', 'açık', 'kapalı', 'dolu', 'boş', 'geç', 'erken', 'sabah', 'akşam',
  'gece', 'gün', 'hafta', 'ay', 'yıl', 'pazartesi', 'salı', 'çarşamba', 'perşembe',
  'cuma', 'cumartesi', 'pazar', 'ocak', 'şubat', 'mart', 'nisan', 'mayıs', 'haziran',
  'temmuz', 'ağustos', 'eylül', 'ekim', 'kasım', 'aralık', 'anne', 'baba', 'kız',
  'oğlan', 'erkek', 'kadın', 'çocuk', 'genç', 'yaşlı', 'doktor', 'öğretmen', 'mühendis',
  'mutlu', 'üzgün', 'öfkeli', 'korkulan', 'utangaç', 'cesur', 'aktif', 'pasif', 'akıllı',
  'aptal', 'alımlı', 'canını', 'dost', 'düşman', 'sevgi', 'nefret', 'korku', 'umut',
  'başarı', 'başarısızlık', 'çalışma', 'dinlenme', 'uyku', 'uyanış', 'yeme', 'içme',
]);

const LETTER_POINTS: Record<string, number> = {
  A: 1,
  B: 3,
  C: 4,
  Ç: 4,
  D: 3,
  E: 1,
  F: 7,
  G: 5,
  Ğ: 8,
  H: 5,
  I: 2,
  İ: 1,
  J: 10,
  K: 1,
  L: 1,
  M: 2,
  N: 1,
  O: 2,
  Ö: 7,
  P: 5,
  R: 1,
  S: 2,
  Ş: 4,
  T: 1,
  U: 2,
  Ü: 3,
  V: 7,
  Y: 3,
  Z: 4,
};

function randomLetter() {
  return LETTER_POOL[Math.floor(Math.random() * LETTER_POOL.length)];
}

const GRID_OPTIONS: GridOption[] = [
  { label: '6x6 Grid', level: 'Zor Seviye', moves: 15, size: 6 },
  { label: '8x8 Grid', level: 'Orta Seviye', moves: 20, size: 8 },
  { label: '10x10 Grid', level: 'Kolay Seviye', moves: 25, size: 10 },
];

const LETTER_POOL = [
  ...Array(10).fill('A'),
  ...Array(10).fill('E'),
  ...Array(8).fill('İ'),
  ...Array(8).fill('L'),
  ...Array(8).fill('R'),
  ...Array(7).fill('N'),
  ...Array(7).fill('K'),
  ...Array(7).fill('M'),
  ...Array(7).fill('T'),
  ...Array(6).fill('S'),
  ...Array(6).fill('Y'),
  ...Array(6).fill('D'),
  ...Array(3).fill('O'),
  ...Array(3).fill('U'),
  ...Array(2).fill('B'),
  ...Array(2).fill('C'),
  ...Array(2).fill('Ç'),
  ...Array(2).fill('P'),
  ...Array(2).fill('V'),
  ...Array(1).fill('F'),
  ...Array(1).fill('G'),
  ...Array(1).fill('Ğ'),
  ...Array(1).fill('H'),
  ...Array(1).fill('J'),
  ...Array(1).fill('Ö'),
  ...Array(1).fill('Ş'),
  ...Array(1).fill('Ü'),
  ...Array(1).fill('Z'),
];

function createBoard(size: number) {
  return Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, col) => ({
      row,
      col,
      letter: randomLetter(),
      powerType: null,
    })),
  );
}

function findAllValidWords(board: GameCell[][]): string[] {
  const foundWords = new Set<string>();
  const size = board.length;

  const dfs = (
    row: number,
    col: number,
    visited: Set<string>,
    currentWord: string,
  ) => {
    const cellKey = `${row}-${col}`;
    if (visited.has(cellKey)) return;

    const cell = board[row][col];
    const nextWord = currentWord + cell.letter;
    visited.add(cellKey);

    if (nextWord.length >= 3) {
      const normalized = nextWord.toLocaleLowerCase('tr-TR');
      if (WORD_DICTIONARY.has(normalized)) {
        foundWords.add(normalized);
      }
    }

    if (nextWord.length < 10) {
      for (let dr = -1; dr <= 1; dr += 1) {
        for (let dc = -1; dc <= 1; dc += 1) {
          if (dr === 0 && dc === 0) continue;
          const nr = row + dr;
          const nc = col + dc;
          if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
            dfs(nr, nc, visited, nextWord);
          }
        }
      }
    }

    visited.delete(cellKey);
  };

  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      dfs(row, col, new Set<string>(), '');
    }
  }

  return Array.from(foundWords);
}

function hasValidWords(board: GameCell[][]): boolean {
  const size = board.length;
  let foundWord = false;

  const dfs = (
    row: number,
    col: number,
    visited: Set<string>,
    currentWord: string,
  ): boolean => {
    if (foundWord) return true;
    
    const cellKey = `${row}-${col}`;
    if (visited.has(cellKey)) return false;

    const cell = board[row][col];
    const nextWord = currentWord + cell.letter;
    visited.add(cellKey);

    if (nextWord.length >= 3) {
      const normalized = nextWord.toLocaleLowerCase('tr-TR');
      if (WORD_DICTIONARY.has(normalized)) {
        foundWord = true;
        visited.delete(cellKey);
        return true;
      }
    }

    if (nextWord.length < 10) {
      for (let dr = -1; dr <= 1; dr += 1) {
        for (let dc = -1; dc <= 1; dc += 1) {
          if (dr === 0 && dc === 0) continue;
          const nr = row + dr;
          const nc = col + dc;
          if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
            if (dfs(nr, nc, visited, nextWord)) {
              visited.delete(cellKey);
              return true;
            }
          }
        }
      }
    }

    visited.delete(cellKey);
    return false;
  };

  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      if (dfs(row, col, new Set<string>(), '')) {
        return true;
      }
    }
  }

  return false;
}

function ensureBoardHasWords(size: number): GameCell[][] {
  console.log('[ensureBoardHasWords] Creating board without word validation (for dev speed)');
  // TODO: re-enable word validation once findAllValidWords is optimized
  return createBoard(size);
}

function getPowerTypeForWordLength(length: number): 'row-clear' | 'bomb' | 'column-clear' | 'mega' | null {
  if (length >= 7) return 'mega';
  if (length >= 6) return 'column-clear';
  if (length >= 5) return 'bomb';
  if (length >= 4) return 'row-clear';
  return null;
}

function activatePowerCell(
  board: GameCell[][],
  powerCell: GameCell,
  powerType: string,
): GameCell[] {
  const size = board.length;
  const removedCells: GameCell[] = [];

  if (powerType === 'row-clear') {
    for (let col = 0; col < size; col += 1) {
      removedCells.push(board[powerCell.row][col]);
    }
  } else if (powerType === 'column-clear') {
    for (let row = 0; row < size; row += 1) {
      removedCells.push(board[row][powerCell.col]);
    }
  } else if (powerType === 'bomb') {
    for (let dr = -1; dr <= 1; dr += 1) {
      for (let dc = -1; dc <= 1; dc += 1) {
        const r = powerCell.row + dr;
        const c = powerCell.col + dc;
        if (r >= 0 && r < size && c >= 0 && c < size) {
          removedCells.push(board[r][c]);
        }
      }
    }
  } else if (powerType === 'mega') {
    for (let dr = -2; dr <= 2; dr += 1) {
      for (let dc = -2; dc <= 2; dc += 1) {
        const r = powerCell.row + dr;
        const c = powerCell.col + dc;
        if (r >= 0 && r < size && c >= 0 && c < size) {
          removedCells.push(board[r][c]);
        }
      }
    }
  }

  return removedCells;
}

function collapseBoard(board: GameCell[][], removedCells: GameCell[]) {
  const size = board.length;
  const removedCellKeys = new Set(removedCells.map(cellKey));

  const rebuiltColumns = Array.from({ length: size }, (_, col) => {
    const keptLetters: string[] = [];

    for (let row = 0; row < size; row += 1) {
      const cell = board[row][col];
      if (!removedCellKeys.has(cellKey(cell))) {
        keptLetters.push(cell.letter);
      }
    }

    const newLetters = Array.from({ length: size - keptLetters.length }, () => randomLetter());
    return [...newLetters, ...keptLetters];
  });

  return Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, col) => ({
      row,
      col,
      letter: rebuiltColumns[col][row],
      powerType: null,
    })),
  );
}

function calculateWordScore(letters: string[]) {
  return letters.reduce((total, letter) => total + (LETTER_POINTS[letter] ?? 1), 0);
}

function findCombos(word: string): string[] {
  const normalized = word.toLocaleLowerCase('tr-TR');
  const combos = new Set<string>();

  const generateSubsequences = (
    str: string,
    index: number,
    current: string,
  ) => {
    if (current.length >= 3) {
      if (WORD_DICTIONARY.has(current)) {
        combos.add(current);
      }
    }

    if (index >= str.length) {
      return;
    }

    for (let i = index; i < str.length; i += 1) {
      generateSubsequences(str, i + 1, current + str[i]);
    }
  };

  generateSubsequences(normalized, 0, '');
  return Array.from(combos);
}

function calculateComboScore(combos: string[]): number {
  const uniqueCombos = new Set(combos);
  let totalScore = 0;

  uniqueCombos.forEach((combo) => {
    const letters = combo.split('');
    const score = calculateWordScore(letters);
    totalScore += score;
  });

  return totalScore;
}

function areAdjacent(first: GameCell, second: GameCell) {
  const rowDifference = Math.abs(first.row - second.row);
  const colDifference = Math.abs(first.col - second.col);
  return rowDifference <= 1 && colDifference <= 1 && (rowDifference + colDifference > 0);
}

function cellKey(cell: GameCell) {
  return `${cell.row}-${cell.col}`;
}

type GameSummary = {
  label: string;
  value: string;
};

type GameHistoryItem = {
  gameNumber: number;
  date: string;
  grid: string;
  score: number;
  wordCount: number;
  longestWord: string;
  duration: string;
};

type MarketItem = {
  id: string;
  name: string;
  description: string;
  purpose: string;
  cost: number;
  usage: string;
};

type SavedGameRecord = {
  gameNumber: number;
  date: string;
  grid: string;
  score: number;
  wordCount: number;
  longestWord: string;
  duration: string;
};

const SCORE_SUMMARY: GameSummary[] = [];

const GAME_HISTORY: GameHistoryItem[] = [];

const MARKET_ITEMS: MarketItem[] = [
  {
    id: 'row-clear',
    name: 'Satır Temizleme',
    description: 'Aynı satırı tamamen temizler.',
    purpose: 'Uzun kelime sonrası alan açmak',
    cost: 250,
    usage: 'Bir satırda kullandığın simgeyi tekrar seç.',
  },
  {
    id: 'bomb',
    name: 'Alan Patlatma',
    description: 'Komşu harfleri yok eden bomba oluşturur.',
    purpose: 'Yoğun alanları kırmak',
    cost: 350,
    usage: 'Bomba simgesini tekrar kullan.',
  },
  {
    id: 'column-clear',
    name: 'Sütun Temizleme',
    description: 'Seçilen sütunu tamamen temizler.',
    purpose: 'Dikey akış oluşturmak',
    cost: 300,
    usage: 'Sütun simgesini yeniden tetikle.',
  },
];

const JOKER_ITEMS: JokerItem[] = [
  {
    id: 'balık',
    name: 'Balık',
    cost: 100,
    description: 'Gridde rastgele harfler yok etmektedir.',
  },
  {
    id: 'tekerlek',
    name: 'Tekerlek',
    cost: 200,
    description: 'Gridde seçilen harfin bulunduğu satır ve sütundaki tüm harfler yok olmaktadır.',
  },
  {
    id: 'lolipop',
    name: 'Lolipop Kırıcı',
    cost: 75,
    description: 'Gridde seçilen bir harf yok etmek için kullanılmaktadır.',
  },
  {
    id: 'değiştirme',
    name: 'Serbest Değiştirme',
    cost: 125,
    description: 'Gridde birbirine temas eden iki harfin yer değiştirilmesini sağlamaktadır.',
  },
  {
    id: 'karıştırma',
    name: 'Harf Karıştırma',
    cost: 300,
    description: 'Gridde bulunan harflerin rastgele bir şekilde karıştırılmasını sağlamaktadır.',
  },
  {
    id: 'parti',
    name: 'Parti Güçlendiricisi',
    cost: 400,
    description: 'Gridde bulunan tüm harfler yok edilir ve tekrardan rastgele harflar eklenir.',
  },
];

function buildScoreSummary(records: SavedGameRecord[]) {
  const totalGames = records.length;
  const highestScore = totalGames > 0 ? Math.max(...records.map((record) => record.score)) : 0;
  const averageScore = totalGames > 0 ? Math.round(records.reduce((sum, record) => sum + record.score, 0) / totalGames) : 0;
  const totalWords = records.reduce((sum, record) => sum + record.wordCount, 0);
  const longestWord = records.reduce((longest, record) => (record.longestWord.length > longest.length ? record.longestWord : longest), '');
  const totalDuration = records.reduce((sum, record) => sum + Number(record.duration.replace(/\D/g, '')) || 0, 0);

  return [
    { label: 'Toplam Oyun', value: String(totalGames) },
    { label: 'En Yüksek Puan', value: String(highestScore) },
    { label: 'Ortalama Puan', value: String(averageScore) },
    { label: 'Toplam Kelime', value: String(totalWords) },
    { label: 'En Uzun Kelime', value: longestWord || '-' },
    { label: 'Toplam Süre', value: totalDuration > 0 ? `${totalDuration} dk` : '0 dk' },
  ];
}

export default function App() {
  const [playerName, setPlayerName] = useState('');
  const [draftName, setDraftName] = useState('');
  const [isReady, setIsReady] = useState(false);
  const [gameHistory, setGameHistory] = useState<SavedGameRecord[]>([]);
  const [screen, setScreen] = useState<Screen>('home');
  const [selectedGrid, setSelectedGrid] = useState<GridOption | null>(null);
  const [gold, setGold] = useState(1500);
  const [jokerInventory, setJokerInventory] = useState<JokerInventory>({
    balık: 0,
    tekerlek: 0,
    lolipop: 0,
    değiştirme: 0,
    karıştırma: 0,
    parti: 0,
  });

  useEffect(() => {
    const loadInitialData = async () => {
      const storedName = await AsyncStorage.getItem(STORAGE_KEY);
      const storedHistory = await AsyncStorage.getItem(HISTORY_STORAGE_KEY);

      if (storedName) {
        setPlayerName(storedName);
      }

      if (storedHistory) {
        try {
          setGameHistory(JSON.parse(storedHistory) as SavedGameRecord[]);
        } catch {
          setGameHistory([]);
        }
      }

      setIsReady(true);
    };

    void loadInitialData();
  }, []);

  const trimmedDraftName = useMemo(() => draftName.trim(), [draftName]);

  const savePlayerName = async () => {
    if (!trimmedDraftName) {
      Alert.alert('Uyarı', 'Lütfen kullanıcı adını yazın.');
      return;
    }

    await AsyncStorage.setItem(STORAGE_KEY, trimmedDraftName);
    setPlayerName(trimmedDraftName);
    setDraftName('');
  };

  const changePlayerName = async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setPlayerName('');
    setDraftName('');
    setScreen('home');
  };

  const saveGameRecord = async (record: SavedGameRecord) => {
    const nextRecord = {
      ...record,
      gameNumber: gameHistory.length + 1,
    };
    const nextHistory = [nextRecord, ...gameHistory];

    setGameHistory(nextHistory);
    await AsyncStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(nextHistory));
    setSelectedGrid(null);
    setScreen('scoreTable');
  };

  const renderScreenContent = () => {
    if (screen === 'newGame') {
      if (!selectedGrid) {
        return (
          <View style={styles.menuCard}>
            <Text style={styles.menuTitle}>Yeni Oyun</Text>
            <Text style={styles.screenDescription}>
              Önce grid boyutunu seç.
            </Text>

            {GRID_OPTIONS.map((option) => (
              <Pressable
                key={option.label}
                style={styles.menuButton}
                onPress={() => setSelectedGrid(option)}
              >
                <Text style={styles.menuButtonText}>{option.label}</Text>
                <Text style={styles.menuButtonSubtext}>
                  {option.level} · {option.moves} hamle
                </Text>
              </Pressable>
            ))}

            <Pressable style={styles.secondaryButton} onPress={() => setScreen('home')}>
              <Text style={styles.secondaryButtonText}>Geri Dön</Text>
            </Pressable>
          </View>
        );
      }

      return (
        <MenuScreen
          title="Hamle Seçimi"
          description={`${selectedGrid.label} için önerilen hamle sayısı ${selectedGrid.moves}. Bu seçimle oyun başlatılacak.`}
          actionLabel="Oyuna Başla"
          onAction={() => setScreen('game')}
          onBack={() => setSelectedGrid(null)}
        />
      );
    }

    if (screen === 'scoreTable') {
      const scoreSummary = gameHistory.length > 0 ? buildScoreSummary(gameHistory) : SCORE_SUMMARY;
      const records = gameHistory.length > 0 ? gameHistory : GAME_HISTORY;

      return (
        <ScrollView style={styles.detailCard} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.detailTitle}>Skor Tablosu</Text>
          <Text style={styles.screenDescription}>
            Geçmiş performans ve oyun özeti burada gösterilecek.
          </Text>

          <View style={styles.summaryGrid}>
            {scoreSummary.map((item) => (
              <View key={item.label} style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{item.value}</Text>
                <Text style={styles.summaryLabel}>{item.label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.historyList}>
            {records.map((game) => (
              <View key={game.gameNumber} style={styles.historyCard}>
                <Text style={styles.historyTitle}>Oyun {game.gameNumber}</Text>
                <Text style={styles.historyLine}>Tarih: {game.date}</Text>
                <Text style={styles.historyLine}>Grid: {game.grid}</Text>
                <Text style={styles.historyLine}>Puan: {game.score}</Text>
                <Text style={styles.historyLine}>Kelime Sayısı: {game.wordCount}</Text>
                <Text style={styles.historyLine}>En Uzun Kelime: {game.longestWord}</Text>
                <Text style={styles.historyLine}>Süre: {game.duration}</Text>
              </View>
            ))}
          </View>

          <Pressable style={styles.secondaryButton} onPress={() => setScreen('home')}>
            <Text style={styles.secondaryButtonText}>Geri Dön</Text>
          </Pressable>
        </ScrollView>
      );
    }

    if (screen === 'market') {
      return (
        <ScrollView style={styles.detailCard} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.detailTitle}>Market</Text>
          <Text style={styles.screenDescription}>
            Başlangıç altını ile joker satın alma alanı.
          </Text>

          <View style={styles.goldBanner}>
            <Text style={styles.goldBannerLabel}>Mevcut Altın</Text>
            <Text style={styles.goldBannerValue}>{gold}</Text>
          </View>

          <Text style={styles.menuTitle}>Jokerler</Text>
          <View style={styles.historyList}>
            {JOKER_ITEMS.map((item) => {
              const canBuy = gold >= item.cost;
              const owned = jokerInventory[item.id as JokerType];

              return (
                <View key={item.id} style={styles.historyCard}>
                  <Text style={styles.historyTitle}>{item.name}</Text>
                  <Text style={styles.historyLine}>{item.description}</Text>
                  <Text style={styles.historyLine}>Maliyet: {item.cost} altın</Text>
                  <Text style={styles.historyLine}>Sahip Olduğun: {owned}</Text>
                  <Pressable
                    style={[styles.primaryButton, !canBuy && styles.disabledButton]}
                    onPress={() => {
                      if (canBuy) {
                        setGold((g) => g - item.cost);
                        setJokerInventory((inv) => ({
                          ...inv,
                          [item.id]: inv[item.id as JokerType] + 1,
                        }));
                      }
                    }}
                    disabled={!canBuy}
                  >
                    <Text style={styles.primaryButtonText}>
                      {canBuy ? 'Satın Al' : 'Yetersiz Altın'}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>

          <Pressable style={styles.secondaryButton} onPress={() => setScreen('home')}>
            <Text style={styles.secondaryButtonText}>Geri Dön</Text>
          </Pressable>
        </ScrollView>
      );
    }

    if (screen === 'game' && selectedGrid) {
      return (
        <GameScreen
          gridOption={selectedGrid}
          jokerInventory={jokerInventory}
          setJokerInventory={setJokerInventory}
          onBack={() => {
            setSelectedGrid(null);
            setScreen('home');
          }}
          onFinish={saveGameRecord}
        />
      );
    }

    return (
      <View style={styles.menuCard}>
        <Text style={styles.menuTitle}>Ana Menü</Text>

        <MenuButton label="Yeni Oyun" onPress={() => setScreen('newGame')} />
        <MenuButton label="Skor Tablosu" onPress={() => setScreen('scoreTable')} />
        <MenuButton label="Market" onPress={() => setScreen('market')} />
      </View>
    );
  };

  if (!isReady) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <Text style={styles.title}>Word Crush</Text>
        <Text style={styles.subtitle}>Yükleniyor...</Text>
      </SafeAreaView>
    );
  }

  if (!playerName) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <Text style={styles.title}>Word Crush</Text>
        <Text style={styles.subtitle}>Başlamak için kullanıcı adını gir.</Text>

        <TextInput
          value={draftName}
          onChangeText={setDraftName}
          placeholder="Kullanıcı adı"
          placeholderTextColor="#64748B"
          style={styles.input}
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={savePlayerName}
        />

        <Pressable style={styles.primaryButton} onPress={savePlayerName}>
          <Text style={styles.primaryButtonText}>Devam Et</Text>
        </Pressable>

        <Text style={styles.caption}>
          İsim bir kez girildikten sonra cihazda saklanacak.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      <Pressable onPress={changePlayerName} style={styles.nameBadge}>
        <Text style={styles.nameBadgeLabel}>Kullanıcı</Text>
        <Text style={styles.nameBadgeValue}>{playerName}</Text>
      </Pressable>

      <Text style={styles.title}>Word Crush</Text>
      <Text style={styles.subtitle}>Hoş geldin, {playerName}.</Text>

      {renderScreenContent()}

      <Text style={styles.caption}>
        İlk bölüm tamamlandı. Şimdi yeni oyun akışını inşa ediyoruz.
      </Text>
    </SafeAreaView>
  );
}

function MenuScreen({
  title,
  description,
  actionLabel,
  onAction,
  onBack,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  onBack: () => void;
}) {
  return (
    <View style={styles.menuCard}>
      <Text style={styles.menuTitle}>{title}</Text>
      <Text style={styles.screenDescription}>{description}</Text>
      {actionLabel ? (
        <Pressable
          style={styles.primaryButton}
          onPress={() => {
            onAction && onAction();
          }}
        >
          <Text style={styles.primaryButtonText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
      <Pressable style={styles.secondaryButton} onPress={onBack}>
        <Text style={styles.secondaryButtonText}>Geri Dön</Text>
      </Pressable>
    </View>
  );
}

function GameScreen({
  gridOption,
  jokerInventory,
  setJokerInventory,
  onBack,
  onFinish,
}: {
  gridOption: GridOption;
  jokerInventory: JokerInventory;
  setJokerInventory: (inv: JokerInventory | ((prev: JokerInventory) => JokerInventory)) => void;
  onBack: () => void;
  onFinish: (record: SavedGameRecord) => void;
}) {
  const [board, setBoard] = useState(() => {
    const newBoard = ensureBoardHasWords(gridOption.size);
    return newBoard;
  });
  
  const [selectedCells, setSelectedCells] = useState<GameCell[]>([]);
  const [remainingMoves, setRemainingMoves] = useState(gridOption.moves);
  const [score, setScore] = useState(0);
  const [wordCount, setWordCount] = useState(0);
  const [longestWord, setLongestWord] = useState('');
    const [validWordCount, setValidWordCount] = useState(0);
    const [message, setMessage] = useState('Bir kelime oluşturmak için komşu harfleri seç.');
    const [activeJoker, setActiveJoker] = useState<JokerType | null>(null);
    const [jokerTarget, setJokerTarget] = useState<GameCell | null>(null);
    const startedAtRef = useRef(Date.now());
    const isFinishedRef = useRef(false);

  useEffect(() => {
    // TODO: optimize findAllValidWords before re-enabling
    // const count = findAllValidWords(board).length;
    // setValidWordCount(count);
    setValidWordCount(0); // Disabled for dev speed

    // if (count === 0 && !isFinishedRef.current) {
    //   const newBoard = ensureBoardHasWords(gridOption.size);
    //   setBoard(newBoard);
    //   setValidWordCount(findAllValidWords(newBoard).length);
    // }
  }, [board, gridOption.size]);

  const selectedCellKeys = new Set(selectedCells.map(cellKey));
  const selectedWord = selectedCells.map((cell) => cell.letter).join('');

  const resetSelection = () => {
    setSelectedCells([]);
  };

  const handleJokerActivation = (cell: GameCell) => {
    const size = board.length;
    const removedCells: GameCell[] = [];

    if (activeJoker === 'balık') {
      for (let i = 0; i < 5; i += 1) {
        const randomRow = Math.floor(Math.random() * size);
        const randomCol = Math.floor(Math.random() * size);
        removedCells.push(board[randomRow][randomCol]);
      }
    } else if (activeJoker === 'tekerlek') {
      for (let col = 0; col < size; col += 1) {
        removedCells.push(board[cell.row][col]);
      }
      for (let row = 0; row < size; row += 1) {
        if (!removedCells.find((c) => c.row === row && c.col === cell.col)) {
          removedCells.push(board[row][cell.col]);
        }
      }
    } else if (activeJoker === 'lolipop') {
      removedCells.push(cell);
    } else if (activeJoker === 'karıştırma') {
      const allCells: GameCell[] = [];
      for (let row = 0; row < size; row += 1) {
        for (let col = 0; col < size; col += 1) {
          allCells.push(board[row][col]);
        }
      }
      setBoard((currentBoard) => {
        const shuffledBoard = [...currentBoard];
        const letters = shuffledBoard.flat().map((c) => c.letter);
        for (let i = letters.length - 1; i > 0; i -= 1) {
          const j = Math.floor(Math.random() * (i + 1));
          [letters[i], letters[j]] = [letters[j], letters[i]];
        }
        let letterIndex = 0;
        for (let row = 0; row < size; row += 1) {
          for (let col = 0; col < size; col += 1) {
            shuffledBoard[row][col].letter = letters[letterIndex];
            letterIndex += 1;
          }
        }
        return shuffledBoard;
      });
      setMessage('Harflar karıştırıldı!');
      setActiveJoker(null);
      return;
    } else if (activeJoker === 'parti') {
      for (let row = 0; row < size; row += 1) {
        for (let col = 0; col < size; col += 1) {
          removedCells.push(board[row][col]);
        }
      }
    } else if (activeJoker === 'değiştirme') {
      if (jokerTarget) {
        setBoard((currentBoard) => {
          const newBoard = currentBoard.map((r) => [...r]);
          const temp = newBoard[jokerTarget.row][jokerTarget.col].letter;
          newBoard[jokerTarget.row][jokerTarget.col].letter = newBoard[cell.row][cell.col].letter;
          newBoard[cell.row][cell.col].letter = temp;
          return newBoard;
        });
        setMessage('Harflar değiştirildi!');
        setActiveJoker(null);
        setJokerTarget(null);
        return;
      }
      setJokerTarget(cell);
      setMessage('İkinci harfi seç.');
      return;
    }

    if (removedCells.length > 0) {
      setBoard((currentBoard) => collapseBoard(currentBoard, removedCells));
      setMessage(`${activeJoker} joker kullanıldı!`);
    }

    setActiveJoker(null);
    setJokerTarget(null);
    setJokerInventory((inv: JokerInventory) => ({
      ...inv,
      [activeJoker || 'balık']: inv[activeJoker as JokerType] - 1,
    }));
  };

  const finishGame = (
    finalScore = score,
    finalWordCount = wordCount,
    finalLongestWord = longestWord,
  ) => {
    if (isFinishedRef.current) {
      return;
    }

    isFinishedRef.current = true;
    const elapsedMinutes = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 60000));

    onFinish({
      gameNumber: 0,
      date: new Date().toLocaleDateString('tr-TR'),
      grid: gridOption.label,
      score: finalScore,
      wordCount: finalWordCount,
      longestWord: finalLongestWord || '-',
      duration: `${elapsedMinutes} dk`,
    });
  };

  const handleCellPress = (cell: GameCell) => {
    if (activeJoker) {
      handleJokerActivation(cell);
      return;
    }

    if (cell.powerType && !selectedCells.length) {
      const affectedCells = activatePowerCell(board, cell, cell.powerType);
      setBoard((currentBoard) => collapseBoard(currentBoard, affectedCells));
      setMessage(`Özel güç aktivitesi: ${POWER_SYMBOLS[cell.powerType] || '?'}`);
      return;
    }

    if (selectedCells.length === 0) {
      setSelectedCells([cell]);
      setMessage('İlk harf seçildi.');
      return;
    }

    const lastCell = selectedCells[selectedCells.length - 1];
    if (selectedCellKeys.has(cellKey(cell))) {
      setMessage('Aynı hücre tekrar seçilemez.');
      return;
    }

    if (!areAdjacent(lastCell, cell)) {
      setMessage('Sadece komşu hücreler seçilebilir.');
      return;
    }

    setSelectedCells((currentCells) => [...currentCells, cell]);
    setMessage('Harf eklendi.');
  };

  const submitSelection = () => {
    if (remainingMoves <= 0) {
      setMessage('Hamle hakkın kalmadı.');
      return;
    }

    const nextMoves = remainingMoves - 1;
    setRemainingMoves(nextMoves);

    if (selectedCells.length < 3) {
      setMessage('En az 3 harf seçmelisin. Bu deneme yine de bir hamle sayıldı.');
      resetSelection();
      if (nextMoves === 0) {
        finishGame(score, wordCount, longestWord);
      }
      return;
    }

    const candidateWord = selectedWord.toLocaleLowerCase('tr-TR');
    if (!WORD_DICTIONARY.has(candidateWord)) {
      setMessage(`"${selectedWord}" sözlükte bulunamadı. Hamle yine de kullanıldı.`);
      resetSelection();
      if (nextMoves === 0) {
        finishGame(score, wordCount, longestWord);
      }
      return;
    }

    const gainedPoints = calculateWordScore(selectedCells.map((cell) => cell.letter));
    const normalizedCandidate = candidateWord;
    
    const combos = findCombos(selectedWord.toLocaleUpperCase('tr-TR'));
    const comboScore = calculateComboScore(combos);
    const totalGainedPoints = gainedPoints + comboScore;
    
    const nextScore = score + totalGainedPoints;
    const nextWordCount = wordCount + 1;
    const nextLongestWord =
      normalizedCandidate.length > longestWord.length ? normalizedCandidate.toLocaleUpperCase('tr-TR') : longestWord;

    const powerType = getPowerTypeForWordLength(selectedCells.length);
    const lastCell = selectedCells[selectedCells.length - 1];

    setScore(nextScore);
    setWordCount(nextWordCount);
    setLongestWord(nextLongestWord);

    setBoard((currentBoard) => {
      const collapsed = collapseBoard(currentBoard, selectedCells);

      if (powerType && lastCell) {
        for (let row = 0; row < collapsed.length; row += 1) {
          for (let col = 0; col < collapsed[0].length; col += 1) {
            const cell = collapsed[row][col];
            if (cell.row === lastCell.row && cell.col === lastCell.col) {
              (cell as { powerType: string | null }).powerType = powerType;
              break;
            }
          }
        }
      }

      return collapsed;
    });

    const powerMsg = powerType ? ` Ödül oluştu: ${POWER_SYMBOLS[powerType] || '?'}` : '';
    const comboMsg = combos.length > 1 ? ` +${combos.length} combo! (${comboScore} bonus puan)` : '';
    setMessage(`"${selectedWord}" geçerli. +${gainedPoints} puan${comboMsg}.${powerMsg}`);
    resetSelection();

    if (nextMoves === 0) {
      finishGame(nextScore, nextWordCount, nextLongestWord);
    }
  };

  const boardSize = gridOption.size;

  try {
    return (
      <ScrollView style={styles.gameCard} contentContainerStyle={styles.gameCardContent}>
        <Text style={styles.detailTitle}>OYUN BAŞLADI ✓</Text>
        <Text style={styles.screenDescription}>{gridOption.label} - Puan: {score}</Text>
        
        <View style={styles.gameStatsRow}>
          <StatBadge label="Hamle" value={String(remainingMoves)} />
          <StatBadge label="Puan" value={String(score)} />
        </View>

        <View style={styles.gridBoard}>
          {board.map((row) => (
            <View key={row[0].row} style={styles.gridRow}>
              {row.map((cell) => (
                <Pressable
                  key={cellKey(cell)}
                  style={[styles.gridCell, selectedCellKeys.has(cellKey(cell)) && styles.gridCellSelected]}
                  onPress={() => handleCellPress(cell)}
                >
                  <Text style={styles.gridCellText}>{cell.letter}</Text>
                </Pressable>
              ))}
            </View>
          ))}
        </View>

        <Text style={styles.gameMessage}>{message}</Text>
        <Text style={styles.gameMessage}>Seçili: {selectedWord || '-'}</Text>

        <View style={styles.gameActionRow}>
          <Pressable style={styles.primaryButton} onPress={submitSelection}>
            <Text style={styles.primaryButtonText}>Gönder</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={resetSelection}>
            <Text style={styles.secondaryButtonText}>Temizle</Text>
          </Pressable>
        </View>

        <View style={styles.jokerButtonsRow}>
          {(['balık', 'tekerlek', 'lolipop', 'değiştirme', 'karıştırma', 'parti'] as JokerType[]).map((jokerType) => (
            <Pressable
              key={jokerType}
              style={[
                styles.jokerButton,
                activeJoker === jokerType && styles.jokerButtonActive,
                jokerInventory[jokerType] === 0 && styles.jokerButtonDisabled,
              ]}
              onPress={() => {
                if (jokerInventory[jokerType] > 0) {
                  setActiveJoker(activeJoker === jokerType ? null : jokerType);
                  setMessage(activeJoker === jokerType ? 'Joker iptal edildi.' : `${jokerType} joker seçildi. Hücre seç.`);
                }
              }}
              disabled={jokerInventory[jokerType] === 0}
            >
              <Text style={styles.jokerButtonText}>{jokerType[0].toUpperCase()}</Text>
              <Text style={styles.jokerButtonCount}>{jokerInventory[jokerType]}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable style={styles.secondaryButton} onPress={onBack}>
          <Text style={styles.secondaryButtonText}>Geri Dön</Text>
        </Pressable>
      </ScrollView>
    );
  } catch (err) {
    console.error('[GameScreen render error]:', err);
    return (
      <View style={styles.menuCard}>
        <Text style={styles.detailTitle}>Render Hatası</Text>
        <Text style={styles.screenDescription}>{String(err)}</Text>
        <Pressable style={styles.secondaryButton} onPress={onBack}>
          <Text style={styles.secondaryButtonText}>Geri Dön</Text>
        </Pressable>
      </View>
    );
  }
}

function StatBadge({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statBadge}>
      <Text style={styles.statBadgeValue}>{value}</Text>
      <Text style={styles.statBadgeLabel}>{label}</Text>
    </View>
  );
}

function MenuButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.menuButton} onPress={onPress}>
      <Text style={styles.menuButtonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0B1020',
    padding: 24,
    gap: 16,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 36,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    color: '#CBD5E1',
    fontSize: 18,
    textAlign: 'center',
  },
  caption: {
    color: '#94A3B8',
    fontSize: 14,
    textAlign: 'center',
    maxWidth: 320,
  },
  input: {
    width: '100%',
    maxWidth: 320,
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#111827',
    color: '#F8FAFC',
    fontSize: 16,
  },
  primaryButton: {
    backgroundColor: '#F97316',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
  },
  primaryButtonText: {
    color: '#0B1020',
    fontSize: 16,
    fontWeight: '700',
  },
  nameBadge: {
    position: 'absolute',
    top: 56,
    left: 24,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },
  nameBadgeLabel: {
    color: '#94A3B8',
    fontSize: 12,
  },
  nameBadgeValue: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
  },
  menuCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  menuTitle: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  menuButton: {
    backgroundColor: '#0F172A',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 4,
  },
  detailCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 20,
    gap: 14,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  scrollContent: {
    gap: 14,
    paddingBottom: 20,
  },
  detailTitle: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  menuButtonText: {
    color: '#CBD5E1',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '600',
  },
  menuButtonSubtext: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
  },
  screenDescription: {
    color: '#94A3B8',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  secondaryButton: {
    backgroundColor: '#1E293B',
    paddingVertical: 12,
    borderRadius: 14,
  },
  secondaryButtonText: {
    color: '#F8FAFC',
    textAlign: 'center',
    fontWeight: '700',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  summaryItem: {
    width: '48%',
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  summaryValue: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  summaryLabel: {
    color: '#94A3B8',
    fontSize: 12,
  },
  historyList: {
    gap: 12,
  },
  historyCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
    gap: 4,
  },
  historyTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  historyLine: {
    color: '#CBD5E1',
    fontSize: 13,
  },
  gameCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  gameCardContent: {
    paddingBottom: 20,
    gap: 14,
  },
  gameHeader: {
    gap: 6,
  },
  gameStatsRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  statBadge: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
    alignItems: 'center',
  },
  statBadgeValue: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
  },
  statBadgeLabel: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  wordPreviewCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 14,
    gap: 4,
  },
  wordPreviewLabel: {
    color: '#94A3B8',
    fontSize: 12,
  },
  wordPreviewValue: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
  },
  gridBoard: {
    gap: 6,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
  },
  gridCell: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridCellSelected: {
    backgroundColor: '#F97316',
  },
  gridCellText: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
  },
  gridCellPower: {
    backgroundColor: '#8B5CF6',
    borderWidth: 2,
    borderColor: '#A78BFA',
  },
  gridCellPowerText: {
    fontSize: 16,
    color: '#FCD34D',
  },
  gameMessage: {
    color: '#CBD5E1',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  gameActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  jokerButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  goldBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  goldBannerLabel: {
    color: '#94A3B8',
    fontSize: 14,
  },
  goldBannerValue: {
    color: '#FBBF24',
    fontSize: 22,
    fontWeight: '700',
  },
  disabledButton: {
    backgroundColor: '#334155',
  },
  jokerContainer: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
    gap: 10,
  },
  jokerTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  jokerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  jokerButton: {
    width: '48%',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 8,
    alignItems: 'center',
    gap: 4,
    borderWidth: 2,
    borderColor: '#334155',
  },
  jokerButtonActive: {
    backgroundColor: '#F97316',
    borderColor: '#F97316',
  },
  jokerButtonDisabled: {
    opacity: 0.4,
  },
  activeJokerButton: {
    backgroundColor: '#F97316',
    borderColor: '#F97316',
  },
  jokerButtonText: {
    color: '#F8FAFC',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  jokerButtonCount: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
  },
  jokerCount: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
  },
});
