# WORD CRUSH OYUNU - PROJE RAPORU
**Yazılım Laboratuvarı II - Yazlab 2, Proje 2**
**Tarih:** 28 Nisan 2026
**Geliştirici:** Semih

---

## 1. PROJE ÖZETİ

**Word Crush** Türkçe kelime oyunu React Native + Expo ile geliştirilmiş, platform bağımsız bir mobil uygulamadır. Oyuncu ekranda parmağını kaydırarak bitişik harfleri seçer, Türkçe kelimeler oluşturur, puan kazanır ve özel güçlerle/jokerlerle oyunu stratejik olarak ilerletir.

**Platform:** iOS / Android (Expo Go)
**Framework:** React Native 0.81.5
**Teknoloji Stack:** TypeScript 5.3.3, React 19.2.5, Expo SDK 54.0.0
**State Management:** React Hooks + AsyncStorage
**Sözlük Yapısı:** 48.696 Kelimelik Genişletilmiş Türkçe Sözlük (Trie Veri Yapısı)

---

## 2. TAMAMLANAN ÖZELLİKLER (✅)

### 2.1 Ana Navigasyon & Menü Sistemi
- ✅ Ana menü (Home Screen) - 3 buton: Yeni Oyun, Skor Tablosu, Market
- ✅ Grid seçim ekranı (6x6, 8x8, 10x10)
- ✅ Ekranlar arası pürüzsüz geçişler (Navigation Flow)
- ✅ Yanlışlıkla çıkışları önlemek için "Geri Dön" uyarı mekanizmaları ve çıkışta skoru otomatik kaydetme.

### 2.2 Kullanıcı Yönetimi
- ✅ Oyuncu adı giriş ekranı
- ✅ AsyncStorage ile oyuncu adının kalıcı olarak saklanması
- ✅ İstenildiği zaman Ana Menü'de oyuncu kartına tıklanarak ismin güncellenebilmesi

### 2.3 Oyun Tahtası (Grid) ve Fizik
- ✅ 6x6 (15 hamle - Zor), 8x8 (20 hamle - Orta), 10x10 (25 hamle - Kolay) zorluk seviyeleri
- ✅ Türkçe harf frekansı ağırlıklı dinamik harf üretimi
- ✅ **Mutlak Konumlandırma (Absolute Positioning):** Harflerin render optimizasyonu.
- ✅ Ekrandaki kaydırma (Pan/Drag) sırasında cihazın kendi ekranının titremesini önleyen kilit (Scroll Lock) sistemi.

### 2.4 Harf Seçimi Mekanizması
- ✅ 8 yönlü (Yatay, Dikey, Çapraz) sürekli seçim ve komşuluk doğrulaması.
- ✅ Parmağı ekrandan kaldırmadan (drag-to-select) akıcı kelime birleştirme hissiyatı.
- ✅ Seçilen harflerin renk değişimiyle görsel bildirimle ayrışması.
- ✅ Canlı seçilen kelime gösterimi.

### 2.5 Kelime Doğrulama & Kapsamlı Sözlük
- ✅ **48.696 kelimeden oluşan** devasa Türkçe sözlük entegrasyonu.
- ✅ Girilen kelimenin Trie ağacında anında aranıp (case-insensitive) bulunması.
- ✅ 3+ harf minimum uzunluk doğrulama sınırı.
- ✅ **Combo Sistemi:** Seçilen büyük kelimenin (örn: ADANA) içinden çıkan anlamlı alt kelimelerin (DANA, ANA, ADA) tespit edilip katlanarak puan artırılması.

### 2.6 Puan & Hamle Sistemi
- ✅ Scrabble tarzı Türkçe özel harf puanlaması (A:1, Z:4, J:10 vb.)
- ✅ Combo çarpanı ile detaylı puan hesaplaması.
- ✅ Kelime geçerli olsa da olmasa da denemelerde hamle düşmesi.
- ✅ Hamle bittiğinde veya çıkış yapıldığında verilerin oyun geçmişine atılması.

### 2.7 Görsel Efektler & Animasyonlar (Game-Feel)
- ✅ **Patlama Gecikmesi (Explosion Effect):** Kelime gönderildiğinde anında silinmek yerine, 400ms boyunca kırmızı bir parlamayla şişerek görsel bir patlama efekti hissettirme.
- ✅ **Candy Crush Fiziği (Bouncy Fall):** Harfler yok olduğunda, üstteki harflerin mutlak koordinatları hesaplanarak "LayoutAnimation" yaylanması (spring) ile havadan esneyerek düşme.
- ✅ **Etkileşim Kilidi (Input Block):** Patlama veya düşme esnasında kullanıcının tıklamalarının bloke edilerek sistemin bozulmasının önüne geçilmesi.

### 2.8 Özel Güçler (Kelimeden Üretilen)
- ✅ 4 harfli kelime = Satır Temizleme (⇆)
- ✅ 5 harfli kelime = Alan/Bomba Patlatma (✹)
- ✅ 6 harfli kelime = Sütun Temizleme (⇅)
- ✅ 7+ harfli kelime = Mega Patlatma (✪)
- ✅ Tetiklenen bu güçlerin etrafındaki harfleri zincirleme reaksiyonla patlatması.

### 2.9 Market ve Joker Sistemi
- ✅ **Bakiye Sistemi:** Oyuncuya ait kalıcı altın veritabanı (Başlangıç 10.000 Altın). Marketten güç satın alabilme.
- ✅ **Balık:** 5 rastgele harfi anında siler.
- ✅ **Tekerlek:** Tıklanan harfin bulunduğu tüm satır ve sütunu temizler.
- ✅ **Lolipop:** Tıklanan bir hücreyi yok eder.
- ✅ **Değiştirme:** Yan yana duran iki hücreyi (swap) yer değiştirir.
- ✅ **Karıştırma:** Bütün tahtayı karıştırarak (shuffle) kilitlenen tahtayı açar.
- ✅ Joker butonları, kullanıldığında envanterin eş zamanlı olarak düşmesi.

### 2.10 Akıllı Oyun Tahtası (Otonom Analiz)
- ✅ **Sıfır Kelime Kontrolü:** Oyun başlangıcında tahtanın analiz edilip içerisinde oynanabilir kelime varlığının kesin ölçülmesi (`countNonOverlappingWords`).
- ✅ **Oto-Yenileme (Rejuvenation):** Hamleler sonucunda tahtada tesadüfen oynanabilir kelime kalmazsa sistemin bunu anlık tespit edip "Kelime kalmadı, yeniden üretiliyor..." mesajıyla ücretsiz bir şekilde tahtayı tazelemesi.

### 2.11 Skor Tablosu & İstatistikler
- ✅ Oynanan her oyunun (Puan, Kelime Sayısı, En Uzun Kelime, Süre, Grid ve Tarih) bazında kalıcı olarak geçmişe kaydedilmesi.
- ✅ Skor Tablosu ekranında geçmişin okunması ve toplam özet gösterimi.

---

## 3. PROJE DURUMU VE EKSİKLİKLERİN GİDERİLMESİ

**Proje Durumu: 100% Tamamlanmış (Teslime Hazır)**

Projenin ilk aşamalarında veya dokümantasyonda **"Kısmen Tamamlanmış (🟡)"** veya **"Yapılmamış (❌)"** olarak gözüken tüm açıklar kapatılmıştır:

1. **Kelime Sözlüğü Sıkıntısı:** Sözlük 188 test kelimesinden, **48.696** kelimelik resmi sözlüğe geçirilmiştir.
2. **Animasyonlar ve Yerçekimi Fiziği:** Harflerin havada kalarak değil, gerçek bir x-y koordinat fizik simülasyonunda aşağı düşerek yaylanması sağlanmıştır. "Candy Crush Fiziği" koda başarıyla eklenmiştir.
3. **Akıllı Tahta Analizi:** Optimizasyon sorunları çözülmüş olup; ekranda **"Oluşturulabilir Kelime Sayısı"** anlık ve donmadan gösterilmektedir.
4. **Kilitlenme Senaryoları:** İçinde hiç kelime bulunmayan gridler otomatik olarak temizlenmekte ve baştan oluşturulmaktadır.

---

## 4. KOD YAPISI VE İSTATİSTİKLERİ
- **Ana Component:** `App.tsx` (Yaklaşık 1900 Satır - Tamamen TypeScript)
- **Modüller:** `dictionary.ts` (Sözlük modülü)
- **State Yönetimi:** 15+ reaktif state, kalıcı veri depolaması (`AsyncStorage` ile Gold, History ve Inventory)
- **Layout Optimizasyonu:** `StyleSheet.create` kullanılarak saf CSS benzeri tasarım, `LayoutAnimation` ve Absolute elementlerin render manipülasyonu.

---

## 5. KURULUM VE ÇALIŞTIRMA

Gereksinimler: Node.js, Expo Go veya Expo CLI.

```bash
# Projeyi cihazınıza çekin
git clone https://github.com/semih4101/word-crush-game.git
cd word-crush-game

# Bağımlılıkları kurun
npm install

# Geliştirme sunucusunu başlatın
npm start
```
Terminalde karşınıza çıkan **QR Kodunu** telefonunuzdaki **Expo Go** uygulaması ile okutarak oyunu gerçek bir cihazda (iOS veya Android) canlı olarak oynayabilirsiniz. Herhangi bir native derlemeye ihtiyaç yoktur.
