import { useEffect, useMemo, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  Alert,
  Dimensions,
  GestureResponderEvent,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  LayoutAnimation,
  Animated,
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';

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
// Her kullanıcı için ayrı storage key'leri
function getUserGoldKey(name: string) {
  return `word-crush-gold-${name.trim().toLocaleLowerCase('tr-TR')}`;
}
function getUserInventoryKey(name: string) {
  return `word-crush-inventory-${name.trim().toLocaleLowerCase('tr-TR')}`;
}

// Her kullanıcı için ayrı history key'i
function getUserHistoryKey(name: string) {
  return `word-crush-history-${name.trim().toLocaleLowerCase('tr-TR')}`;
}

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

  // Ana kelimeyi her zaman ekle (sözlükte olduğu zaten doğrulanmış)
  if (normalized.length >= 3 && WORD_DICTIONARY.has(normalized)) {
    combos.add(normalized);
  }

  // Alt kelimeleri bul (ana kelimenin harf sırasına göre substring'ler)
  for (let i = 0; i < normalized.length; i += 1) {
    let current = '';
    for (let j = i; j < normalized.length; j += 1) {
      current += normalized[j];
      if (current.length >= 3 && current !== normalized && WORD_DICTIONARY.has(current)) {
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

function parseDurationMinutes(duration: string): number {
  // Desteklenen formatlar: "6 dk", "1 saat", "1 saat 25 dk"
  const saatMatch = duration.match(/(\d+)\s*saat/);
  const dkMatch = duration.match(/(\d+)\s*dk/);
  const hours = saatMatch ? parseInt(saatMatch[1], 10) : 0;
  const minutes = dkMatch ? parseInt(dkMatch[1], 10) : 0;
  return hours * 60 + minutes;
}

function buildScoreSummary(records: SavedGameRecord[]) {
  const totalGames = records.length;
  const highestScore = totalGames > 0 ? Math.max(...records.map((record) => record.score)) : 0;
  const averageScore = totalGames > 0 ? Math.round(records.reduce((sum, record) => sum + record.score, 0) / totalGames) : 0;
  const totalWords = records.reduce((sum, record) => sum + record.wordCount, 0);
  const longestWord = records.reduce((longest, record) => (record.longestWord.length > longest.length ? record.longestWord : longest), '');
  const totalDuration = records.reduce((sum, record) => sum + parseDurationMinutes(record.duration), 0);

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

  // Belirli bir kullanıcının geçmişini yükler
  const loadUserHistory = async (name: string) => {
    const key = getUserHistoryKey(name);
    const stored = await AsyncStorage.getItem(key);
    if (stored) {
      try {
        setGameHistory(JSON.parse(stored) as SavedGameRecord[]);
      } catch {
        setGameHistory([]);
      }
    } else {
      setGameHistory([]);
    }
  };

  // Kullanıcıya özel altın ve joker verilerini yükler
  const loadUserResources = async (name: string) => {
    const goldKey = getUserGoldKey(name);
    const invKey = getUserInventoryKey(name);
    
    const storedGold = await AsyncStorage.getItem(goldKey);
    const storedInventory = await AsyncStorage.getItem(invKey);

    if (storedGold !== null) {
      setGold(Number(storedGold));
    } else {
      setGold(10000); // Varsayılan başlangıç altını
    }

    if (storedInventory) {
      try {
        setJokerInventory(JSON.parse(storedInventory) as JokerInventory);
      } catch {
        setJokerInventory({ balık: 0, tekerlek: 0, lolipop: 0, değiştirme: 0, karıştırma: 0, parti: 0 });
      }
    } else {
      setJokerInventory({ balık: 0, tekerlek: 0, lolipop: 0, değiştirme: 0, karıştırma: 0, parti: 0 });
    }
  };

  useEffect(() => {
    const loadInitialData = async () => {
      const storedName = await AsyncStorage.getItem(STORAGE_KEY);

      if (storedName) {
        setPlayerName(storedName);
        // Kaydedilmiş kullanıcının geçmişini ve kaynaklarını yükle
        await loadUserHistory(storedName);
        await loadUserResources(storedName);
      }

      setIsReady(true);
    };

    void loadInitialData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const trimmedDraftName = useMemo(() => draftName.trim(), [draftName]);

  const savePlayerName = async () => {
    if (!trimmedDraftName) {
      Alert.alert('Uyarı', 'Lütfen kullanıcı adını yazın.');
      return;
    }

    await AsyncStorage.setItem(STORAGE_KEY, trimmedDraftName);
    setPlayerName(trimmedDraftName);
    // Yeni kullanıcının geçmişini ve kaynaklarını yükle
    await loadUserHistory(trimmedDraftName);
    await loadUserResources(trimmedDraftName);
    setDraftName('');
  };

  const changePlayerName = async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setPlayerName('');
    setDraftName('');
    // Önceki kullanıcının geçmişini ve kaynaklarını temizle ekranda
    setGameHistory([]);
    setGold(10000);
    setJokerInventory({ balık: 0, tekerlek: 0, lolipop: 0, değiştirme: 0, karıştırma: 0, parti: 0 });
    setScreen('home');
  };

  const saveGameRecord = async (record: SavedGameRecord) => {
    const nextRecord = {
      ...record,
      gameNumber: gameHistory.length + 1,
    };
    const nextHistory = [nextRecord, ...gameHistory];

    setGameHistory(nextHistory);
    // Kullanıcıya özel key ile kaydet
    await AsyncStorage.setItem(getUserHistoryKey(playerName), JSON.stringify(nextHistory));
    setSelectedGrid(null);
    setSelectedMoves(null);
    setScreen('scoreTable');
  };

  const renderScreenContent = () => {
    if (screen === 'newGame') {
      if (!selectedGrid) {
        return (
          <>
            <Pressable style={styles.topRightBackButton} onPress={() => setScreen('home')}>
              <Text style={styles.topRightBackButtonText}>✕ Çık</Text>
            </Pressable>
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
            </View>
          </>
        );
      }

      if (!selectedMoves) {
        return (
          <>
            <Pressable style={styles.topRightBackButton} onPress={() => setSelectedGrid(null)}>
              <Text style={styles.topRightBackButtonText}>↩ Geri</Text>
            </Pressable>
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
            </View>
          </>
        );
      }
    }

    if (screen === 'scoreTable') {
      const scoreSummary = gameHistory.length > 0 ? buildScoreSummary(gameHistory) : SCORE_SUMMARY;
      const records = gameHistory.length > 0 ? gameHistory : GAME_HISTORY;

      return (
        <>
          <Pressable style={styles.topRightBackButton} onPress={() => setScreen('home')}>
            <Text style={styles.topRightBackButtonText}>✕ Çık</Text>
          </Pressable>
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
        </ScrollView>
        </>
      );
    }

    if (screen === 'market') {
      return (
        <>
          <Pressable style={styles.topRightBackButton} onPress={() => setScreen('home')}>
            <Text style={styles.topRightBackButtonText}>✕ Çık</Text>
          </Pressable>
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
                          AsyncStorage.setItem(getUserGoldKey(playerName), String(nextGold));
                          return nextGold;
                        });
                        setJokerInventory((inv) => {
                          const nextInv = {
                            ...inv,
                            [item.id]: inv[item.id as JokerType] + 1,
                          };
                          AsyncStorage.setItem(getUserInventoryKey(playerName), JSON.stringify(nextInv));
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
        </ScrollView>
        </>
      );
    }

    if (screen === 'game' && selectedGrid && selectedMoves) {
      return (
        <GameScreen
          playerName={playerName}
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
      <View style={styles.menuWrapper}>
        <Image source={require('./assets/logo.png')} style={styles.logo} />
        <Text style={styles.title}>Word Crush</Text>
        <Text style={styles.subtitle}>Hoş geldin, {playerName}.</Text>

        <View style={styles.menuCard}>
          <Text style={styles.menuTitle}>Ana Menü</Text>

          <MenuButton label="Yeni Oyun" onPress={() => setScreen('newGame')} />
          <MenuButton label="Skor Tablosu" onPress={() => setScreen('scoreTable')} />
          <MenuButton label="Market" onPress={() => setScreen('market')} />
        </View>
      </View>
    );
  };

  if (!isReady) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.container}>
          <StatusBar style="light" />
          <Image source={require('./assets/logo.png')} style={styles.logo} />
          <Text style={styles.title}>Word Crush</Text>
          <Text style={styles.subtitle}>Yükleniyor...</Text>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  if (!playerName) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.container}>
          <StatusBar style="light" />
          <Image source={require('./assets/logo.png')} style={styles.logo} />
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
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />

        <Pressable onPress={changePlayerName} style={styles.nameBadge}>
          <Text style={styles.nameBadgeLabel}>Kullanıcı</Text>
          <Text style={styles.nameBadgeValue}>{playerName}</Text>
        </Pressable>

        {renderScreenContent()}
      </SafeAreaView>
    </SafeAreaProvider>
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

type FloatingScore = {
  id: string;
  points: number;
  x: number;
  y: number;
};

function FloatingScoreDisplay({ score, onComplete }: { score: FloatingScore; onComplete: () => void }) {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: -60, duration: 800, useNativeDriver: false }),
      Animated.timing(opacity, { toValue: 0, duration: 800, useNativeDriver: false }),
    ]).start(() => onComplete());
  }, []);

  return (
    <Animated.Text
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: score.x,
        top: score.y,
        transform: [{ translateY }],
        opacity,
        color: '#FCD34D',
        fontSize: 26,
        fontWeight: '900',
        textShadowColor: '#D97706',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 8,
        zIndex: 100,
      }}
    >
      +{score.points}
    </Animated.Text>
  );
}

function GameScreen({
  playerName,
  gridOption,
  moveOption,
  jokerInventory,
  setJokerInventory,
  onBack,
  onFinish,
}: {
  playerName: string;
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
  const [floatingScores, setFloatingScores] = useState<FloatingScore[]>([]);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const [selectedCells, setSelectedCells] = useState<GameCell[]>([]);
  const [remainingMoves, setRemainingMoves] = useState(moveOption.moves);
  const [score, setScore] = useState(0);
  const [wordCount, setWordCount] = useState(0);
  const [longestWord, setLongestWord] = useState('');
  const [validWordCount, setValidWordCount] = useState(0);
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [message, setMessage] = useState('Bir kelime oluşturmak için komşu harfleri seç.');
  const [activeJoker, setActiveJoker] = useState<JokerType | null>(null);
  const [jokerTarget, setJokerTarget] = useState<GameCell | null>(null);
  const [gridWidth, setGridWidth] = useState(0);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [gameOverRecord, setGameOverRecord] = useState<SavedGameRecord | null>(null);
  const startedAtRef = useRef(Date.now());
  const isFinishedRef = useRef(false);

  // Dinamik hücre boyutu — ekran genişliğine göre hesaplanır
  const screenWidth = Dimensions.get('window').width;
  const CELL_GAP = 3;
  const availableWidth = Math.min(screenWidth - 52, 344);
  const CELL_INNER = Math.max(26, Math.floor((availableWidth - (gridOption.size - 1) * CELL_GAP) / gridOption.size));
  const CELL_STEP = CELL_INNER + CELL_GAP;

  useEffect(() => {
    // Ağır hesaplamayı render'ı bloke etmemesi için defer ediyoruz
    const timer = setTimeout(() => {
      const disjointCount = countNonOverlappingWords(board);
      setValidWordCount(disjointCount);

      if (disjointCount === 0 && !isFinishedRef.current && remainingMoves > 0) {
        setMessage('Kelime kalmadı, tahta yeniden üretiliyor...');
        setTimeout(() => {
          const newBoard = ensureBoardHasWords(gridOption.size);
          setBoard(newBoard);
        }, 1000);
      }
    }, 100);

    return () => clearTimeout(timer);
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
        AsyncStorage.setItem(getUserInventoryKey(playerName), JSON.stringify(nextInv));
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
          AsyncStorage.setItem(getUserInventoryKey(playerName), JSON.stringify(nextInv));
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
      AsyncStorage.setItem(getUserInventoryKey(playerName), JSON.stringify(nextInv));
      return nextInv;
    });
  };

  const finishGame = (
    finalScore = score,
    finalWordCount = wordCount,
    finalLongestWord = longestWord,
  ) => {
    if (isFinishedRef.current) return;
    isFinishedRef.current = true;
    const elapsedMinutes = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 60000));
    // Direkt kaydetmek yerine oyun sonu modalını göster
    setGameOverRecord({
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
    const { locationX, locationY } = evt.nativeEvent;
    const col = Math.floor(locationX / CELL_STEP);
    const row = Math.floor(locationY / CELL_STEP);
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
    if (isAlreadySelected) {
      // Eğer parmak bir önceki seçili hücreye geri döndüyse, son seçimi iptal et (Geri sürükleyerek silme)
      if (selectedCells.length > 1) {
        const secondLastCell = selectedCells[selectedCells.length - 2];
        if (cellKey(secondLastCell) === cellKeyStr) {
          setSelectedCells((prev) => prev.slice(0, -1));
          return;
        }
      }
      return;
    }

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
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: false }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: false }),
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: false }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: false }),
      ]).start();
      resetSelection();
      if (nextMoves === 0) {
        finishGame(score, wordCount, longestWord);
      }
      return;
    }

    const candidateWord = selectedWord.toLocaleLowerCase('tr-TR');
    if (!WORD_DICTIONARY.has(candidateWord)) {
      setMessage(`"${selectedWord}" sözlükte bulunamadı. Hamle yine de kullanıldı.`);
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: false }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: false }),
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: false }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: false }),
      ]).start();
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
    setFoundWords((prev) => [selectedWord.toLocaleUpperCase('tr-TR'), ...prev]);

    setExplodingCellKeys(new Set(cellsToCollapse.map(cellKey)));
    isAnimatingRef.current = true;
    
    // Yüzen Puan Animasyonunu Başlat
    const fx = lastCell ? lastCell.col * CELL_STEP : 0;
    const fy = lastCell ? lastCell.row * CELL_STEP : 0;
    const scoreId = Date.now().toString();
    setFloatingScores((prev) => [...prev, { id: scoreId, points: totalGainedPoints, x: fx, y: fy }]);

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
          // Collapse sonrası lastCell pozisyonundaki hücreye doğrudan erişim
          collapsed[lastCell.row][lastCell.col].powerType = newPowerType;
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
      <>
        <Pressable style={styles.topRightBackButton} onPress={handleBackPress}>
          <Text style={styles.topRightBackButtonText}>✕ Çık</Text>
        </Pressable>
        <ScrollView
          style={styles.gameCard}
          contentContainerStyle={styles.gameCardContent}
          scrollEnabled={scrollEnabled}
      >
        {/* Oyun üst bilgileri */}
        <View style={styles.gameStatsRow}>
          <StatBadge label="Hamle" value={String(remainingMoves)} danger={remainingMoves <= 5} />
          <StatBadge label="Puan" value={String(score)} />
          <StatBadge label="Kelime" value={String(validWordCount)} />
        </View>

        {/* Oyun grid — dinamik hücre boyutu */}
        <View
          style={[
            styles.gridBoard,
            { width: boardSize * CELL_STEP - CELL_GAP, height: boardSize * CELL_STEP - CELL_GAP, alignSelf: 'center' },
          ]}
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
                {
                  position: 'absolute',
                  top: cell.row * CELL_STEP,
                  left: cell.col * CELL_STEP,
                  width: CELL_INNER,
                  height: CELL_INNER,
                },
                selectedCellKeys.has(cellKey(cell)) && styles.gridCellSelected,
                cell.powerType && styles.gridCellPower,
                explodingCellKeys.has(cellKey(cell)) && styles.gridCellExploding,
              ]}
            >
              <Text style={styles.gridCellText}>{cell.letter}</Text>
              <Text style={styles.gridCellScore}>{LETTER_POINTS[cell.letter] ?? 1}</Text>
              {cell.powerType ? (
                <View
                  style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    backgroundColor: '#7C3AED',
                    borderRadius: 4,
                    width: 13,
                    height: 13,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  pointerEvents="none"
                >
                  <Text
                    style={{
                      color: '#FFF',
                      fontSize: 8,
                      fontWeight: '900',
                      lineHeight: 10,
                    }}
                  >
                    {POWER_SYMBOLS[cell.powerType]}
                  </Text>
                </View>
              ) : null}
            </View>
          ))}
          {floatingScores.map((score) => (
            <FloatingScoreDisplay
              key={score.id}
              score={score}
              onComplete={() => setFloatingScores((prev) => prev.filter((s) => s.id !== score.id))}
            />
          ))}
        </View>

        <Text style={styles.gameMessage}>{message}</Text>
        <Animated.Text style={[styles.gameMessage, { transform: [{ translateX: shakeAnim }] }]}>
          Seçili: {selectedWord || '-'}
        </Animated.Text>

        {foundWords.length > 0 && (
          <View style={styles.foundWordsContainer}>
            <Text style={styles.foundWordsTitle}>Bulunan Kelimeler:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.foundWordsScroll}>
              {foundWords.map((word, idx) => (
                <View key={`${word}-${idx}`} style={styles.wordPill}>
                  <Text style={styles.wordPillText}>{word}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

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
      </ScrollView>

      {/* Oyun Sonu Modalı */}
      <Modal
        visible={gameOverRecord !== null}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>🎉 Oyun Bitti!</Text>
            <View style={styles.modalRow}>
              <Text style={styles.modalLabel}>Toplam Puan</Text>
              <Text style={styles.modalValue}>{gameOverRecord?.score ?? 0}</Text>
            </View>
            <View style={styles.modalRow}>
              <Text style={styles.modalLabel}>Bulunan Kelime</Text>
              <Text style={styles.modalValue}>{gameOverRecord?.wordCount ?? 0}</Text>
            </View>
            <View style={styles.modalRow}>
              <Text style={styles.modalLabel}>En Uzun Kelime</Text>
              <Text style={styles.modalValue}>
                {gameOverRecord?.longestWord !== '-' ? `"${gameOverRecord?.longestWord}"` : '-'}
              </Text>
            </View>
            <View style={styles.modalRow}>
              <Text style={styles.modalLabel}>Süre</Text>
              <Text style={styles.modalValue}>{gameOverRecord?.duration}</Text>
            </View>
            <Pressable
              style={styles.primaryButton}
              onPress={() => {
                if (gameOverRecord) onFinish(gameOverRecord);
              }}
            >
              <Text style={styles.primaryButtonText}>Skoru Kaydet →</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      </>
    );
  } catch (err) {
    console.error('[GameScreen render error]:', err);
    return (
      <>
        <Pressable style={styles.topRightBackButton} onPress={onBack}>
          <Text style={styles.topRightBackButtonText}>✕ Çık</Text>
        </Pressable>
        <View style={styles.menuCard}>
          <Text style={styles.detailTitle}>Render Hatası</Text>
          <Text style={styles.screenDescription}>{String(err)}</Text>
        </View>
      </>
    );
  }
}

function StatBadge({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <View style={[styles.statBadge, danger && styles.statBadgeDanger]}>
      <Text style={[styles.statBadgeValue, danger && styles.statBadgeValueDanger]}>{value}</Text>
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
    backgroundColor: '#0A0515',
    padding: 20,
    paddingTop: 80, // Üstteki badge ile çakışmayı önlemek için eklendi
    gap: 14,
  },
  menuWrapper: {
    alignItems: 'center',
    gap: 14,
    width: '100%',
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 30,
    marginBottom: -10,
    borderWidth: 2,
    borderColor: '#7C3AED',
  },
  title: {
    color: '#FAF5FF',
    fontSize: 40,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 2,
    textShadowColor: '#A855F7',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
  },
  subtitle: {
    color: '#C4B5FD',
    fontSize: 17,
    textAlign: 'center',
    fontWeight: '500',
  },
  caption: {
    color: '#6D5A8A',
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 320,
  },
  input: {
    width: '100%',
    maxWidth: 320,
    borderWidth: 1.5,
    borderColor: '#4C1D95',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#160B2E',
    color: '#FAF5FF',
    fontSize: 16,
  },
  primaryButton: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 10,
  },
  primaryButtonText: {
    color: '#FAF5FF',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  nameBadge: {
    position: 'absolute',
    top: 56,
    left: 16,
    backgroundColor: '#160B2E',
    borderWidth: 1.5,
    borderColor: '#4C1D95',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  nameBadgeLabel: {
    color: '#A78BFA',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  nameBadgeValue: {
    color: '#FAF5FF',
    fontSize: 15,
    fontWeight: '700',
  },
  topRightBackButton: {
    position: 'absolute',
    top: 56,
    right: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#160B2E',
    borderWidth: 1.5,
    borderColor: '#6D5A8A',
    borderRadius: 16,
    zIndex: 999,
  },
  topRightBackButtonText: {
    color: '#FAF5FF',
    fontSize: 15,
    fontWeight: '800',
  },
  menuCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#160B2E',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1.5,
    borderColor: '#2D1B69',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 14,
    gap: 16,
  },
  foundWordsContainer: {
    width: '100%',
    paddingHorizontal: 20,
    marginVertical: 10,
  },
  foundWordsTitle: {
    color: '#C4B5FD',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  foundWordsScroll: {
    flexDirection: 'row',
  },
  wordPill: {
    backgroundColor: '#4C1D95',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#7C3AED',
  },
  wordPillText: {
    color: '#FAF5FF',
    fontSize: 13,
    fontWeight: '700',
  },
  menuTitle: {
    color: '#FAF5FF',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  menuButton: {
    backgroundColor: '#1E0B40',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#3B1F7A',
    paddingVertical: 16,
    paddingHorizontal: 14,
  },
  detailCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#160B2E',
    borderRadius: 24,
    padding: 20,
    gap: 14,
    borderWidth: 1.5,
    borderColor: '#2D1B69',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 14,
  },
  scrollContent: {
    gap: 14,
    paddingBottom: 24,
  },
  detailTitle: {
    color: '#FAF5FF',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  menuButtonText: {
    color: '#DDD6FE',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '700',
  },
  menuButtonSubtext: {
    color: '#6D5A8A',
    fontSize: 12,
    textAlign: 'center',
  },
  screenDescription: {
    color: '#A78BFA',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  secondaryButton: {
    backgroundColor: '#2D1B69',
    paddingVertical: 13,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#4C1D95',
  },
  secondaryButtonText: {
    color: '#DDD6FE',
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 15,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  summaryItem: {
    width: '48%',
    backgroundColor: '#1E0B40',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#3B1F7A',
    alignItems: 'center',
  },
  summaryValue: {
    color: '#A855F7',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  summaryLabel: {
    color: '#A78BFA',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  historyList: {
    gap: 12,
  },
  historyCard: {
    backgroundColor: '#1E0B40',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#3B1F7A',
    gap: 5,
  },
  historyTitle: {
    color: '#DDD6FE',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 4,
  },
  historyLine: {
    color: '#A78BFA',
    fontSize: 13,
  },
  gameCard: {
    width: '100%',
    backgroundColor: '#0A0515',
    flex: 1,
  },
  gameCardContent: {
    paddingBottom: 24,
    paddingHorizontal: 12,
    paddingTop: 12,
    gap: 10,
    alignItems: 'center',
  },
  gameHeader: {
    gap: 6,
  },
  gameStatsRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 4,
  },
  statBadge: {
    flex: 1,
    backgroundColor: '#160B2E',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderWidth: 1.5,
    borderColor: '#2D1B69',
    alignItems: 'center',
  },
  statBadgeDanger: {
    backgroundColor: '#3B0000',
    borderColor: '#B91C1C',
  },
  statBadgeValue: {
    color: '#FAF5FF',
    fontSize: 20,
    fontWeight: '800',
  },
  statBadgeValueDanger: {
    color: '#F87171',
  },
  statBadgeLabel: {
    color: '#A78BFA',
    fontSize: 11,
    marginTop: 2,
    fontWeight: '600',
  },
  wordPreviewCard: {
    backgroundColor: '#1E0B40',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#3B1F7A',
    padding: 14,
    gap: 4,
  },
  wordPreviewLabel: {
    color: '#A78BFA',
    fontSize: 12,
    fontWeight: '600',
  },
  wordPreviewValue: {
    color: '#FAF5FF',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 2,
  },
  gridBoard: {
    position: 'relative',
  },
  gridRow: {
    flexDirection: 'row',
    gap: 3,
    justifyContent: 'center',
  },
  gridCell: {
    borderRadius: 8,
    backgroundColor: '#1A0840',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#3B1F7A',
  },
  gridCellSelected: {
    backgroundColor: '#7C3AED',
    borderColor: '#A855F7',
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 10,
  },
  gridCellExploding: {
    backgroundColor: '#EC4899',
    borderColor: '#F9A8D4',
    transform: [{ scale: 1.1 }],
    zIndex: 10,
    elevation: 10,
    shadowColor: '#EC4899',
    shadowOpacity: 0.9,
    shadowRadius: 10,
  },
  gridCellText: {
    color: '#FAF5FF',
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 16,
  },
  gridCellScore: {
    color: '#A78BFA',
    fontSize: 8,
    fontWeight: '700',
    lineHeight: 9,
  },
  gridCellPower: {
    backgroundColor: '#78350F',
    borderWidth: 2,
    borderColor: '#F59E0B',
    shadowColor: '#F59E0B',
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 8,
  },
  gridCellPowerText: {
    fontSize: 16,
    color: '#FCD34D',
  },
  gameMessage: {
    color: '#C4B5FD',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 8,
  },
  gameActionRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    paddingHorizontal: 4,
  },
  jokerButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 4,
  },
  goldBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#160B2E',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#2D1B69',
  },
  goldBannerLabel: {
    color: '#A78BFA',
    fontSize: 14,
    fontWeight: '600',
  },
  goldBannerValue: {
    color: '#FBBF24',
    fontSize: 24,
    fontWeight: '800',
  },
  disabledButton: {
    backgroundColor: '#2D1B69',
    opacity: 0.5,
  },
  jokerContainer: {
    backgroundColor: '#1E0B40',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#3B1F7A',
    gap: 10,
  },
  jokerTitle: {
    color: '#FAF5FF',
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  jokerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  jokerButton: {
    width: 48,
    height: 48,
    backgroundColor: '#1E0B40',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#3B1F7A',
  },
  jokerButtonActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#A855F7',
    shadowColor: '#A855F7',
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 8,
  },
  jokerButtonDisabled: {
    opacity: 0.35,
  },
  activeJokerButton: {
    backgroundColor: '#7C3AED',
    borderColor: '#A855F7',
  },
  jokerButtonText: {
    fontSize: 22,
  },
  jokerButtonCount: {
    color: '#A78BFA',
    fontSize: 10,
    fontWeight: '800',
    position: 'absolute',
    bottom: 2,
    right: 5,
  },
  jokerCount: {
    color: '#A78BFA',
    fontSize: 12,
    fontWeight: '700',
  },
  // Oyun sonu modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10,5,21,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#160B2E',
    borderRadius: 28,
    padding: 28,
    gap: 16,
    borderWidth: 2,
    borderColor: '#7C3AED',
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 20,
  },
  modalTitle: {
    color: '#FAF5FF',
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2D1B69',
  },
  modalLabel: {
    color: '#A78BFA',
    fontSize: 14,
    fontWeight: '600',
  },
  modalValue: {
    color: '#FAF5FF',
    fontSize: 18,
    fontWeight: '800',
  },
});

