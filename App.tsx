import { useEffect, useMemo, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  Alert,
  GestureResponderEvent,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const FallAnimation = {
  duration: 400,
  create: {
    type: LayoutAnimation.Types.spring,
    property: LayoutAnimation.Properties.scaleXY,
    springDamping: 0.6,
  },
  update: {
    type: LayoutAnimation.Types.spring,
    springDamping: 0.6,
  },
  delete: {
    type: LayoutAnimation.Types.easeOut,
    property: LayoutAnimation.Properties.opacity,
    duration: 200,
  },
};

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'word-crush-player-name';
const HISTORY_STORAGE_KEY = 'word-crush-game-history';
const GOLD_STORAGE_KEY = 'word-crush-gold';
const INVENTORY_STORAGE_KEY = 'word-crush-inventory';

type Screen = 'home' | 'newGame' | 'scoreTable' | 'market' | 'game';
type GridOption = {
  label: string;
  size: number;
};
type MoveOption = {
  label: string;
  moves: number;
};

type GameCell = {
  id: string;
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
  purpose: string;
  usage: string;
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

import { WORD_DICTIONARY_ARRAY } from './dictionary';

class TrieNode {
  children: Record<string, TrieNode> = {};
  isWord: boolean = false;
}

class Trie {
  root: TrieNode = new TrieNode();

  insert(word: string) {
    let node = this.root;
    for (const char of word) {
      if (!node.children[char]) {
        node.children[char] = new TrieNode();
      }
      node = node.children[char];
    }
    node.isWord = true;
  }
}

const wordTrie = new Trie();
const WORD_DICTIONARY = new Set<string>();
for (const word of WORD_DICTIONARY_ARRAY) {
  const normalized = word.toLocaleLowerCase('tr-TR');
  wordTrie.insert(normalized);
  WORD_DICTIONARY.add(normalized);
}


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
  { label: '6x6 Grid', size: 6 },
  { label: '8x8 Grid', size: 8 },
  { label: '10x10 Grid', size: 10 },
];

const MOVE_OPTIONS: MoveOption[] = [
  { label: 'Kolay Level (25 Hamle)', moves: 25 },
  { label: 'Orta Level (20 Hamle)', moves: 20 },
  { label: 'Zor Level (15 Hamle)', moves: 15 },
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
      id: Math.random().toString(36).substring(2, 10),
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
    node: TrieNode,
    currentWord: string,
  ) => {
    const cellKey = `${row}-${col}`;
    if (visited.has(cellKey)) return;

    const cell = board[row][col];
    const letter = cell.letter.toLocaleLowerCase('tr-TR');
    
    if (!node.children[letter]) return;
    
    const nextNode = node.children[letter];
    const nextWord = currentWord + cell.letter;
    
    if (nextNode.isWord && nextWord.length >= 3) {
      foundWords.add(nextWord.toLocaleLowerCase('tr-TR'));
    }

    visited.add(cellKey);

    if (nextWord.length < 10) {
      for (let dr = -1; dr <= 1; dr += 1) {
        for (let dc = -1; dc <= 1; dc += 1) {
          if (dr === 0 && dc === 0) continue;
          const nr = row + dr;
          const nc = col + dc;
          if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
            dfs(nr, nc, visited, nextNode, nextWord);
          }
        }
      }
    }

    visited.delete(cellKey);
  };

  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      dfs(row, col, new Set<string>(), wordTrie.root, '');
    }
  }

  return Array.from(foundWords);
}

function countNonOverlappingWords(board: GameCell[][]): number {
  const size = board.length;
  const usedCells = new Set<string>();
  let count = 0;

  const dfs = (
    row: number,
    col: number,
    visited: Set<string>,
    node: TrieNode,
    currentPath: string[],
  ): boolean => {
    const cellKey = `${row}-${col}`;
    if (visited.has(cellKey) || usedCells.has(cellKey)) return false;

    const cell = board[row][col];
    const letter = cell.letter.toLocaleLowerCase('tr-TR');
    
    if (!node.children[letter]) return false;
    
    const nextNode = node.children[letter];
    const newPath = [...currentPath, cellKey];
    visited.add(cellKey);

    if (nextNode.isWord && newPath.length >= 3) {
      newPath.forEach((k) => usedCells.add(k));
      return true;
    }

    if (newPath.length < 10) {
      for (let dr = -1; dr <= 1; dr += 1) {
        for (let dc = -1; dc <= 1; dc += 1) {
          if (dr === 0 && dc === 0) continue;
          const nr = row + dr;
          const nc = col + dc;
          if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
            if (dfs(nr, nc, visited, nextNode, newPath)) {
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
      if (!usedCells.has(`${row}-${col}`)) {
        if (dfs(row, col, new Set<string>(), wordTrie.root, [])) {
          count += 1;
        }
      }
    }
  }

  return count;
}


function hasValidWords(board: GameCell[][]): boolean {
  const size = board.length;
  let found = false;

  const dfs = (
    row: number,
    col: number,
    visited: Set<string>,
    node: TrieNode,
    currentWord: string,
  ) => {
    if (found) return;
    const cellKey = `${row}-${col}`;
    if (visited.has(cellKey)) return;

    const cell = board[row][col];
    const letter = cell.letter.toLocaleLowerCase('tr-TR');
    
    if (!node.children[letter]) return;
    
    const nextNode = node.children[letter];
    const nextWord = currentWord + cell.letter;
    
    if (nextNode.isWord && nextWord.length >= 3) {
      found = true;
      return;
    }

    visited.add(cellKey);

    if (nextWord.length < 10) {
      for (let dr = -1; dr <= 1; dr += 1) {
        for (let dc = -1; dc <= 1; dc += 1) {
          if (dr === 0 && dc === 0) continue;
          const nr = row + dr;
          const nc = col + dc;
          if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
            dfs(nr, nc, visited, nextNode, nextWord);
            if (found) return;
          }
        }
      }
    }

    visited.delete(cellKey);
  };

  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      dfs(row, col, new Set<string>(), wordTrie.root, '');
      if (found) return true;
    }
  }

  return false;
}

function ensureBoardHasWords(size: number): GameCell[][] {
  let board = createBoard(size);
  while (!hasValidWords(board)) {
    board = createBoard(size);
  }
  return board;
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
    const keptCells: { id: string; letter: string; powerType: GameCell['powerType'] }[] = [];

    for (let row = 0; row < size; row += 1) {
      const cell = board[row][col];
      if (!removedCellKeys.has(cellKey(cell))) {
        keptCells.push({ id: cell.id, letter: cell.letter, powerType: cell.powerType });
      }
    }

    const newCells = Array.from({ length: size - keptCells.length }, () => ({
      id: Math.random().toString(36).substring(2, 10),
      letter: randomLetter(),
      powerType: null as GameCell['powerType'],
    }));
    return [...newCells, ...keptCells];
  });

  return Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, col) => ({
      id: rebuiltColumns[col][row].id,
      row,
      col,
      letter: rebuiltColumns[col][row].letter,
      powerType: rebuiltColumns[col][row].powerType,
    })),
  );
}

function calculateWordScore(letters: string[]) {
  return letters.reduce((total, letter) => total + (LETTER_POINTS[letter] ?? 1), 0);
}

function findCombos(word: string): string[] {
  const normalized = word.toLocaleLowerCase('tr-TR');
  const combos = new Set<string>();

  for (let i = 0; i < normalized.length; i += 1) {
    let current = '';
    for (let j = i; j < normalized.length; j += 1) {
      current += normalized[j];
      if (current.length >= 3 && WORD_DICTIONARY.has(current)) {
        combos.add(current);
      }
    }
  }

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
    purpose: 'Alan açmak',
    usage: 'Seçildiğinde rastgele 5 harfi anında yok eder.',
    icon: '🐟',
  },
  {
    id: 'tekerlek',
    name: 'Tekerlek',
    cost: 200,
    description: 'Gridde seçilen harfin bulunduğu satır ve sütundaki tüm harfler yok olmaktadır.',
    purpose: 'Geniş alan temizliği',
    usage: 'Seçtiğiniz harfin satırını ve sütununu tamamen temizler.',
    icon: '🎡',
  },
  {
    id: 'lolipop',
    name: 'Lolipop Kırıcı',
    cost: 75,
    description: 'Gridde seçilen bir harf yok etmek için kullanılmaktadır.',
    purpose: 'Nokta atışı',
    usage: 'Seçtiğiniz tek bir harfi yok eder.',
    icon: '🍭',
  },
  {
    id: 'değiştirme',
    name: 'Serbest Değiştirme',
    cost: 125,
    description: 'Gridde birbirine temas eden iki harfin yer değiştirilmesini sağlamaktadır.',
    purpose: 'Stratejik konumlandırma',
    usage: 'Önce birinci harfi, sonra komşusu olan ikinci harfi seçin.',
    icon: '🔄',
  },
  {
    id: 'karıştırma',
    name: 'Harf Karıştırma',
    cost: 300,
    description: 'Gridde bulunan harflerin rastgele bir şekilde karıştırılmasını sağlamaktadır.',
    purpose: 'Tıkanıklığı açmak',
    usage: 'Seçildiğinde tüm harfler rastgele yer değiştirir.',
    icon: '🔀',
  },
  {
    id: 'parti',
    name: 'Parti Güçlendiricisi',
    cost: 400,
    description: 'Gridde bulunan tüm harfler yok edilir ve tekrardan rastgele harfler eklenir.',
    purpose: 'Tamamen sıfırlama',
    usage: 'Seçildiğinde tahtadaki tüm harfler yenilenir.',
    icon: '🎉',
  },
];

function buildScoreSummary(records: SavedGameRecord[]) {
  const totalGames = records.length;
  const highestScore = totalGames > 0 ? Math.max(...records.map((record) => record.score)) : 0;
  const averageScore = totalGames > 0 ? Math.round(records.reduce((sum, record) => sum + record.score, 0) / totalGames) : 0;
  const totalWords = records.reduce((sum, record) => sum + record.wordCount, 0);
  const longestWord = records.reduce((longest, record) => (record.longestWord.length > longest.length ? record.longestWord : longest), '');
  const totalDuration = records.reduce((sum, record) => sum + Number(record.duration.replace(/\D/g, '')) || 0, 0);

  const formatDuration = (mins: number) => {
    if (mins === 0) return '0 dk';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0) return m > 0 ? `${h} saat ${m} dk` : `${h} saat`;
    return `${m} dk`;
  };

  return [
    { label: 'Toplam Oyun', value: String(totalGames) },
    { label: 'En Yüksek Puan', value: String(highestScore) },
    { label: 'Ortalama Puan', value: String(averageScore) },
    { label: 'Toplam Kelime', value: String(totalWords) },
    { label: 'En Uzun Kelime', value: longestWord ? `"${longestWord}"` : '-' },
    { label: 'Toplam Süre', value: formatDuration(totalDuration) },
  ];
}

export default function App() {
  const [playerName, setPlayerName] = useState('');
  const [draftName, setDraftName] = useState('');
  const [isReady, setIsReady] = useState(false);
  const [gameHistory, setGameHistory] = useState<SavedGameRecord[]>([]);
  const [screen, setScreen] = useState<Screen>('home');
  const [selectedGrid, setSelectedGrid] = useState<GridOption | null>(null);
  const [selectedMoves, setSelectedMoves] = useState<MoveOption | null>(null);
  const [gold, setGold] = useState(10000);
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
      const storedGold = await AsyncStorage.getItem(GOLD_STORAGE_KEY);
      const storedInventory = await AsyncStorage.getItem(INVENTORY_STORAGE_KEY);

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

      if (storedGold !== null) {
        setGold(Number(storedGold));
      }

      if (storedInventory) {
        try {
          setJokerInventory(JSON.parse(storedInventory) as JokerInventory);
        } catch {}
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
    setSelectedMoves(null);
    setScreen('scoreTable');
  };

  const renderScreenContent = () => {
    if (screen === 'newGame') {
      if (!selectedGrid) {
        return (
          <View style={styles.menuCard}>
            <Text style={styles.menuTitle}>Grid Boyutu Seçimi</Text>
            <Text style={styles.screenDescription}>
              Önce oynamak istediğin oyun alanının boyutunu seç.
            </Text>

            {GRID_OPTIONS.map((option) => (
              <Pressable
                key={option.label}
                style={styles.menuButton}
                onPress={() => setSelectedGrid(option)}
              >
                <Text style={styles.menuButtonText}>{option.label}</Text>
              </Pressable>
            ))}

            <Pressable style={styles.secondaryButton} onPress={() => setScreen('home')}>
              <Text style={styles.secondaryButtonText}>Geri Dön</Text>
            </Pressable>
          </View>
        );
      }

      if (!selectedMoves) {
        return (
          <View style={styles.menuCard}>
            <Text style={styles.menuTitle}>Hamle Sayısı Seçimi</Text>
            <Text style={styles.screenDescription}>
              Oyunun zorluk seviyesini (hamle sayısını) belirle.
            </Text>

            {MOVE_OPTIONS.map((option) => (
              <Pressable
                key={option.label}
                style={styles.menuButton}
                onPress={() => {
                  setSelectedMoves(option);
                  setScreen('game');
                }}
              >
                <Text style={styles.menuButtonText}>{option.label}</Text>
              </Pressable>
            ))}

            <Pressable style={styles.secondaryButton} onPress={() => setSelectedGrid(null)}>
              <Text style={styles.secondaryButtonText}>Geri Dön</Text>
            </Pressable>
          </View>
        );
      }
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
                <Text style={styles.historyLine}>En Uzun Kelime: {game.longestWord !== '-' ? `"${game.longestWord}"` : '-'}</Text>
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
                  <Text style={styles.historyTitle}>{item.icon} {item.name}</Text>
                  <Text style={styles.historyLine}>Özellik: {item.description}</Text>
                  <Text style={styles.historyLine}>Amaç: {item.purpose}</Text>
                  <Text style={styles.historyLine}>Kullanım: {item.usage}</Text>
                  <Text style={styles.historyLine}>Maliyet: {item.cost} altın</Text>
                  <Text style={styles.historyLine}>Sahip Olduğun: {owned}</Text>
                  <Pressable
                    style={[styles.primaryButton, !canBuy && styles.disabledButton]}
                    onPress={() => {
                      if (canBuy) {
                        setGold((g) => {
                          const nextGold = g - item.cost;
                          AsyncStorage.setItem(GOLD_STORAGE_KEY, String(nextGold));
                          return nextGold;
                        });
                        setJokerInventory((inv) => {
                          const nextInv = {
                            ...inv,
                            [item.id]: inv[item.id as JokerType] + 1,
                          };
                          AsyncStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(nextInv));
                          return nextInv;
                        });
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

    if (screen === 'game' && selectedGrid && selectedMoves) {
      return (
        <GameScreen
          gridOption={selectedGrid}
          moveOption={selectedMoves}
          jokerInventory={jokerInventory}
          setJokerInventory={setJokerInventory}
          onBack={() => {
            setSelectedGrid(null);
            setSelectedMoves(null);
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
  moveOption,
  jokerInventory,
  setJokerInventory,
  onBack,
  onFinish,
}: {
  gridOption: GridOption;
  moveOption: MoveOption;
  jokerInventory: JokerInventory;
  setJokerInventory: (inv: JokerInventory | ((prev: JokerInventory) => JokerInventory)) => void;
  onBack: () => void;
  onFinish: (record: SavedGameRecord) => void;
}) {
  const [board, setBoard] = useState(() => {
    const newBoard = ensureBoardHasWords(gridOption.size);
    return newBoard;
  });
  
  const [explodingCellKeys, setExplodingCellKeys] = useState<Set<string>>(new Set());
  const isAnimatingRef = useRef(false);

  const [selectedCells, setSelectedCells] = useState<GameCell[]>([]);
  const [remainingMoves, setRemainingMoves] = useState(moveOption.moves);
  const [score, setScore] = useState(0);
  const [wordCount, setWordCount] = useState(0);
  const [longestWord, setLongestWord] = useState('');
  const [validWordCount, setValidWordCount] = useState(0);
  const [message, setMessage] = useState('Bir kelime oluşturmak için komşu harfleri seç.');
  const [activeJoker, setActiveJoker] = useState<JokerType | null>(null);
  const [jokerTarget, setJokerTarget] = useState<GameCell | null>(null);
  const [gridWidth, setGridWidth] = useState(0);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const startedAtRef = useRef(Date.now());
  const isFinishedRef = useRef(false);

  useEffect(() => {
    const disjointCount = countNonOverlappingWords(board);
    setValidWordCount(disjointCount);
    
    if (disjointCount === 0 && !isFinishedRef.current && remainingMoves > 0) {
      setMessage('Kelime kalmadı, tahta yeniden üretiliyor...');
      setTimeout(() => {
        const newBoard = ensureBoardHasWords(gridOption.size);
        setBoard(newBoard);
      }, 1000);
    }
  }, [board, gridOption.size, remainingMoves]);

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
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
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
      setMessage('Harfler karıştırıldı!');
      setJokerInventory((inv: JokerInventory) => {
        const nextInv = { ...inv, [activeJoker as JokerType]: inv[activeJoker as JokerType] - 1 };
        AsyncStorage.setItem('word-crush-inventory', JSON.stringify(nextInv));
        return nextInv;
      });
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
        if (!areAdjacent(jokerTarget, cell)) {
          setMessage('Sadece birbirine temas eden harfler yer değiştirebilir.');
          return;
        }
        setBoard((currentBoard) => {
          const newBoard = currentBoard.map((r) => [...r]);
          const tempLetter = newBoard[jokerTarget.row][jokerTarget.col].letter;
          const tempPower = newBoard[jokerTarget.row][jokerTarget.col].powerType;
          newBoard[jokerTarget.row][jokerTarget.col].letter = newBoard[cell.row][cell.col].letter;
          newBoard[jokerTarget.row][jokerTarget.col].powerType = newBoard[cell.row][cell.col].powerType;
          newBoard[cell.row][cell.col].letter = tempLetter;
          newBoard[cell.row][cell.col].powerType = tempPower;
          return newBoard;
        });
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setMessage('Harfler değiştirildi!');
        setJokerInventory((inv: JokerInventory) => {
          const nextInv = { ...inv, [activeJoker as JokerType]: inv[activeJoker as JokerType] - 1 };
          AsyncStorage.setItem('word-crush-inventory', JSON.stringify(nextInv));
          return nextInv;
        });
        setActiveJoker(null);
        setJokerTarget(null);
        return;
      }
      setJokerTarget(cell);
      setMessage('İkinci harfi seç.');
      return;
    }

    if (removedCells.length > 0) {
      setExplodingCellKeys(new Set(removedCells.map(cellKey)));
      isAnimatingRef.current = true;
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      
      setTimeout(() => {
        setExplodingCellKeys(new Set());
        LayoutAnimation.configureNext(FallAnimation);
        setBoard((currentBoard) => collapseBoard(currentBoard, removedCells));
        setMessage(`${activeJoker} joker kullanıldı!`);
        isAnimatingRef.current = false;
      }, 400);
    }

    setActiveJoker(null);
    setJokerTarget(null);
    setJokerInventory((inv: JokerInventory) => {
      const nextInv = {
        ...inv,
        [activeJoker || 'balık']: inv[activeJoker as JokerType] - 1,
      };
      AsyncStorage.setItem('word-crush-inventory', JSON.stringify(nextInv));
      return nextInv;
    });
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

  const getCellFromEvent = (evt: GestureResponderEvent) => {
    if (gridWidth === 0) return null;
    const { locationX, locationY } = evt.nativeEvent;
    const totalCellsWidth = gridOption.size * 36 + (gridOption.size - 1) * 6;
    const startX = (gridWidth - totalCellsWidth) / 2;
    const x = locationX - startX;
    const y = locationY;
    const cellSize = 42; // 36 width/height + 6 gap
    const col = Math.floor(x / cellSize);
    const row = Math.floor(y / cellSize);
    if (row >= 0 && row < gridOption.size && col >= 0 && col < gridOption.size) {
      return board[row][col];
    }
    return null;
  };

  const handleTouchStart = (evt: GestureResponderEvent) => {
    if (isAnimatingRef.current) return;
    setScrollEnabled(false);
    const cell = getCellFromEvent(evt);
    if (!cell) return;

    if (activeJoker) {
      handleJokerActivation(cell);
      return;
    }

    setSelectedCells([cell]);
    setMessage('İlk harf seçildi. Parmağınızı sürükleyin.');
  };

  const handleTouchMove = (evt: GestureResponderEvent) => {
    if (isAnimatingRef.current || activeJoker) return;
    const cell = getCellFromEvent(evt);
    if (!cell) return;
    if (selectedCells.length === 0) return;

    const cellKeyStr = cellKey(cell);
    const isAlreadySelected = selectedCells.some((c) => cellKey(c) === cellKeyStr);
    if (isAlreadySelected) return;

    const lastCell = selectedCells[selectedCells.length - 1];
    if (areAdjacent(lastCell, cell)) {
      setSelectedCells((prev) => [...prev, cell]);
      setMessage('Harf eklendi.');
    }
  };

  const handleTouchEnd = () => {
    setScrollEnabled(true);
  };

  const submitSelection = () => {
    if (isAnimatingRef.current) return;
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

    const normalizedCandidate = candidateWord;
    
    const combos = findCombos(selectedWord.toLocaleUpperCase('tr-TR'));
    const totalGainedPoints = calculateComboScore(combos);

    const triggeredPowers = selectedCells.filter((c) => c.powerType);
    const cellsToCollapse = [...selectedCells];
    
    triggeredPowers.forEach((powerCell) => {
      const affected = activatePowerCell(board, powerCell, powerCell.powerType as string);
      affected.forEach((ac) => {
        if (!cellsToCollapse.some((c) => c.row === ac.row && c.col === ac.col)) {
          cellsToCollapse.push(ac);
        }
      });
    });
    
    const nextScore = score + totalGainedPoints;
    const nextWordCount = wordCount + 1;
    const nextLongestWord =
      normalizedCandidate.length > longestWord.length ? normalizedCandidate.toLocaleUpperCase('tr-TR') : longestWord;

    const newPowerType = getPowerTypeForWordLength(selectedCells.length);
    const lastCell = selectedCells[selectedCells.length - 1];

    setScore(nextScore);
    setWordCount(nextWordCount);
    setLongestWord(nextLongestWord);

    setExplodingCellKeys(new Set(cellsToCollapse.map(cellKey)));
    isAnimatingRef.current = true;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    setTimeout(() => {
      setExplodingCellKeys(new Set());
      LayoutAnimation.configureNext(FallAnimation);
      setBoard((currentBoard) => {
        const boardWithPowersCleared = currentBoard.map((r) => r.map((c) => ({ ...c })));
        triggeredPowers.forEach((p) => {
          boardWithPowersCleared[p.row][p.col].powerType = null;
        });

        const collapsed = collapseBoard(boardWithPowersCleared, cellsToCollapse);

        if (newPowerType && lastCell) {
          for (let row = 0; row < collapsed.length; row += 1) {
            for (let col = 0; col < collapsed[0].length; col += 1) {
              const cell = collapsed[row][col];
              if (cell.row === lastCell.row && cell.col === lastCell.col) {
                (cell as { powerType: string | null }).powerType = newPowerType;
                break;
              }
            }
          }
        }

        return collapsed;
      });

      const triggeredPowerMsg = triggeredPowers.length > 0 ? ` Özel Güç Tetiklendi!` : '';
      const powerMsg = newPowerType ? ` Ödül oluştu: ${POWER_SYMBOLS[newPowerType] || '?'}` : '';
      const comboMsg = combos.length > 1 ? ` (${combos.length}x Combo!)` : '';
      setMessage(`"${selectedWord}" geçerli. +${totalGainedPoints} puan${comboMsg}.${triggeredPowerMsg}${powerMsg}`);
      isAnimatingRef.current = false;
      
      if (nextMoves === 0) {
        finishGame(nextScore, nextWordCount, nextLongestWord);
      }
    }, 400);

    resetSelection();
  };

  const handleBackPress = () => {
    Alert.alert(
      'Çıkmak istediğinize emin misiniz?',
      'Oyundan çıkarsanız mevcut puanınız skor tablosuna kaydedilecek.',
      [
        { text: 'Hayır', style: 'cancel' },
        { 
          text: 'Evet', 
          style: 'destructive',
          onPress: () => {
            finishGame();
          }
        }
      ]
    );
  };

  const boardSize = gridOption.size;

  try {
    return (
      <ScrollView 
        style={styles.gameCard} 
        contentContainerStyle={styles.gameCardContent}
        scrollEnabled={scrollEnabled}
      >
        <Text style={styles.detailTitle}>OYUN BAŞLADI ✓</Text>
        <Text style={styles.screenDescription}>
          {gridOption.label} - Puan: {score}
          {'\n'}Oluşturulabilir Kelime Sayısı: {validWordCount}
        </Text>
        
        <View style={styles.gameStatsRow}>
          <StatBadge label="Hamle" value={String(remainingMoves)} />
          <StatBadge label="Puan" value={String(score)} />
        </View>

        <View 
          style={[styles.gridBoard, { width: boardSize * 42 - 6, height: boardSize * 42 - 6, alignSelf: 'center' }]}
          onLayout={(e) => setGridWidth(e.nativeEvent.layout.width)}
          onStartShouldSetResponder={() => true}
          onResponderGrant={handleTouchStart}
          onResponderMove={handleTouchMove}
          onResponderRelease={handleTouchEnd}
          onResponderTerminate={handleTouchEnd}
        >
          {board.flat().map((cell) => (
            <View
              key={cell.id}
              pointerEvents="none"
              style={[
                styles.gridCell,
                { position: 'absolute', top: cell.row * 42, left: cell.col * 42 },
                selectedCellKeys.has(cellKey(cell)) && styles.gridCellSelected, 
                cell.powerType && styles.gridCellPower,
                explodingCellKeys.has(cellKey(cell)) && styles.gridCellExploding
              ]}
            >
              <Text style={[styles.gridCellText, cell.powerType && styles.gridCellPowerText]}>
                {cell.letter}
                {cell.powerType ? ` ${POWER_SYMBOLS[cell.powerType]}` : ''}
              </Text>
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
              <Text style={styles.jokerButtonText}>
                {JOKER_ITEMS.find((j) => j.id === jokerType)?.icon || jokerType[0].toUpperCase()}
              </Text>
              <Text style={styles.jokerButtonCount}>{jokerInventory[jokerType]}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable style={styles.secondaryButton} onPress={handleBackPress}>
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
  gridCellExploding: {
    backgroundColor: '#EF4444',
    transform: [{ scale: 1.15 }],
    zIndex: 10,
    elevation: 10,
    shadowColor: '#EF4444',
    shadowOpacity: 0.9,
    shadowRadius: 10,
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
