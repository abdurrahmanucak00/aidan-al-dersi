# 🧠 AI'dan Al Dersi (AI-Powered Personal Tutor & Roadmap Tracker)

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-Windows-lightgrey.svg)
![Electron](https://img.shields.io/badge/Electron-33.x-47848F.svg)
![React](https://img.shields.io/badge/React-19.x-61DAFB.svg)

**AI'dan Al Dersi**, öğrenmek istediğin herhangi bir konuyu (Yapay Zeka, Yazılım, Matematik, Dil vb.) analiz eden, 5 aşamalı yapay zeka iterasyonuyla sana özel bir **Öğrenme Haritası** çıkaran ve konuyu **adım adım, kilitleri aça aça** öğreten masaüstü kişisel özel ders uygulamasıdır.

---

## ✨ Temel Özellikler

- 🗺️ **Ders Haritası:** Konuları bölümlere ayırır; bir alt konuyu tamamlamadan diğerine geçilmez, aşama aşama kilitler açılır.
- 👣 **Mikro-Adım Pedagojisi:** Yapay zeka tüm konuyu bir anda dökmez. Konuyu 3-4 küçük adıma böler, her adımda kavrayışını kontrol eder ve senden onay alarak ilerler.
- 📐 **Zengin Markdown & Matematik (LaTeX):** Formüller ($d_{model}$, matrisler vb.), kod renklendirmeleri ve tablolar ders kitabı kalitesinde gösterilir.
- 🔒 **%100 Yerel & Gizli:** Tüm dersler, notlar ve sohbet geçmişi kendi bilgisayarındaki yerel SQLite veritabanında saklanır.
- ⚡ **Multi-Provider Desteği:** Google Gemini (Ücretsiz), Groq, OpenRouter, OpenAI ve özel yerel modellerle çalışabilir.
- 📑 **Dışa Aktarma (Export):** Ders notlarını ve sohbetleri tek tıkla **Markdown (.md)** veya **PDF** olarak kaydetme.

---

## 🚀 Hızlı Başlangıç (Kullanıcılar İçin)

Kodlarla veya kurulumla uğraşmak istemiyorsan:

1. [Releases](../../releases) sayfasına git.
2. En güncel sürümdeki **`AI'dan Al Dersi 1.0.0.exe`** (veya Setup dosyasını) indir.
3. Çift tıklayarak uygulamayı aç.
4. **⚙️ Ayarlar** sayfasına git:
   - Sağlayıcı olarak **Google Gemini** seç.(İstediğin başka sağlayıcı varsa onu da seçebilirsin)
   - [Google AI Studio](https://aistudio.google.com/apikey) adresinden ücretsiz API anahtarını alıp yapıştır.
   - Modelleri Getir butonuna basıp bir model seç (Örn: `gemini-3.8-flash` veya `gemini-1.5-flash`).
   - **Kaydet**'e tıkla.
5. **➕ Ders Ekle** butonuna bas, öğrenmek istediğin konuyu yaz ve ders haritanda öğrenmeye başla!

---

## 💻 Geliştiriciler İçin (Kaynak Koddan Çalıştırma)

Projeyi kendi bilgisayarında geliştirmek veya kaynak koddan derlemek istiyorsan:

### Gereksinimler
- [Node.js](https://nodejs.org/) (v18 veya üzeri önerilir)
- Git

### Kurulum Adımları

1. Repoyu klonla:
```bash
git clone https://github.com/KULLANICI_ADIN/aidan-al-dersi.git
cd aidan-al-dersi
```

2. Gerekli bağımlılıkları yükle:
```bash
npm install
```

3. Uygulamayı geliştirici modunda başlat:
```bash
npm run dev
```

4. Kendi `.exe` kurulum dosyanı üretmek için:
```bash
npm run build
```
*(Derlenen dosyalar `release/` klasörünün altına gelecektir).*

---

## 🛠️ Kullanılan Teknolojiler

- **Masaüstü Altyapısı:** Electron.js
- **Ön Yüz:** React 19, Vite, Tailwind CSS, Lucide React
- **Veritabanı:** SQLite (`sql.js` WebAssembly)
- **Yapay Zeka API:** OpenAI SDK (Multi-provider compatible)
- **Matematik & Kod Render:** KaTeX, Remark-Math, Rehype-KaTeX, PrismJS

---

## 📄 Lisans
Bu proje [MIT](LICENSE) lisansı ile lisanslanmıştır. Dilediğin gibi kullanabilir ve geliştirebilirsin.
