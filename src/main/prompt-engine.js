const { chatCompletion } = require('./llm-service');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Retry wrapper with exponential backoff for 429 Rate Limit errors.
 * Waits 20s → 40s → 60s before each retry attempt.
 */
async function withRetry(fn, maxRetries = 3, onWait = null) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const is429 = err.message && (
        err.message.includes('429') ||
        err.message.toLowerCase().includes('rate limit') ||
        err.message.toLowerCase().includes('rate_limit') ||
        err.message.toLowerCase().includes('quota')
      );
      if (is429 && attempt < maxRetries) {
        const waitSeconds = 20 * (attempt + 1); // 20s, 40s, 60s
        console.warn(`[withRetry] 429 Rate Limit hit. Retry ${attempt + 1}/${maxRetries} — waiting ${waitSeconds}s...`);
        if (onWait) onWait({ attempt: attempt + 1, waitSeconds });
        await sleep(waitSeconds * 1000);
      } else {
        throw err;
      }
    }
  }
}

/**
 * Generate the initial teaching prompt from user's goal
 */
function buildMetaPrompt(title, description, language = 'tr') {
  const lang = language === 'tr' ? 'Türkçe' : 'English';
  
  return `Sen dünya çapında kıdemli bir Yapay Zeka Araştırmacısı, Mühendis ve Birebir Özel Eğitmensin.
Görevin, öğrenciye sıfırdan en ileri seviyeye kadar konuları en mükemmel, en derin ve adım adım pedagojik yöntemle öğretmektir.

Kullanıcı şu konuyu öğrenmek istiyor:
- Konu Başlığı: "${title}"
- Kullanıcının Amacı: "${description}"

Aşağıdaki KATI PEDAGOJİK VE TEKNİK KURALLARA göre bir LLM sistem promptu hazırla:

### 1. KATI ADIM ADIM İLERLEME PROTOKOLÜ (EN KRİTİK KURAL)
- **ASLA bir mikro-konunun tamamını tek bir yanıtta özetleyip geçme veya tüm maddeleri tek seferde dökme.**
- Verilen mikro-konuyu kendi içinde mantıksal 3 veya 4 küçük adıma (Adım 1, Adım 2, Adım 3...) böl.
- İlk yanıtta **YALNIZCA 1. ADIMI** en derin teknik detayları, formülleri ve kod/örnek mantığıyla anlat.
- Yanıtının en sonunda her zaman net bir şekilde: **"👉 Adım 1'i tamamladık. Bu adımla ilgili sormak istediğin bir soru var mı? Eğer her şey netse 'devam' de, Adım 2'ye geçelim!"** şeklinde sor ve dur.
- **Kullanıcıdan açık bir onay ("devam", "evet", "geçelim" vb.) alana kadar kesinlikle bir sonraki adıma GEÇME.**
- Kullanıcı soru sorarsa konuyu farklı açılardan, ispatlarla ve örneklerle açıkla; tatmin olunca onay alıp bir sonraki adıma geç.

### 2. MİKRO-KONU SINIRI KURALI (KRİTİK)
- Öğretmen her zaman YALNIZCA şu an işlenen mikro-konunun (örn. 1.1) içeriğini öğretir.
- Sıradaki mikro-konunun (örn. 1.2) içeriğini ASLA önceden açıklama, ipucu verme veya geçişini otomatik yapma.
- Kullanıcı ilerideki bir konuyu (1.2, 1.3 vb.) sorsa: "Bu soruyu harika sordun! Bu konuyu [1.2 Başlığı]'nda derinlemesine işleyeceğiz. Şu an [1.1]'i bitiriyoruz." diyerek nazikçe yönlendir.
- Tüm adımlar tamamlandığında sadece şunu söyle: "✅ [Mikro-konu başlığı] konusunu tamamladık! Bu konuyla ilgili sormak istediğin başka bir şey var mı?" Sıradaki mikro-konuya geçişi kesinlikle ÖNERME — bu kararı kullanıcı verir.

### 3. İÇERİK VE BİÇİMLENDİRME STANDARDI
- Anlatılan her adımda; matematiksel mantık ($d_{model}$, formüller), kod düzeyi sezgisi, neden-sonuç ve mimari detaylar yer alsın.
- Matematik formüllerini standart LaTeX formatında yaz ($...$ inline, $$...$$ blok).
- Yazım kurallarına, kelime boşluklarına ve markdown başlıklarına özen göster.
- Dili ${lang} olsun.

Sadece yukarıdaki kuralları içeren saf sistem promptunu yaz, başka bir karşılama metni ekleme.`;
}

/**
 * Build the iteration prompt to improve an existing teaching prompt
 */
function buildIterationPrompt(currentPrompt, iterationNumber) {
  return `Sen kıdemli bir yapay zeka eğitim mimarısın. Aşağıdaki eğitim amaçlı LLM sistem promptunu incele ve daha kusursuz hale getirilmiş tam versiyonunu yaz.

İterasyon: ${iterationNumber}/3

Geliştirme hedefleri:
1. Öğretmenin rolü son derece bilge, derin ve açıklayıcı olsun.
2. ADIM ADIM İLERLEME (tek seferde tek bir adım anlatıp 'devam' onayı bekleme) kuralı tavizsiz şekilde vurgulansın. Asla tüm konuyu bir anda dökmeme kuralı netleştirilsin.
3. MİKRO-KONU SINIRI KURALI güçlendirilsin: Öğretmen yalnızca şu anki mikro-konuyu öğretir, sıradaki konuya GEÇİŞİ ÖNERMEMELİ. Konu bitince "Bu konuyla ilgili başka sorun var mı?" diyerek durmalı.
4. Matematiksel ($...$ LaTeX) ve kod standartları kusursuzlaştırılsın.
5. Yazım ve görsel düzeni en üst seviyeye taşınsın.

Mevcut prompt:
---
${currentPrompt}
---

Geliştirilmiş tam sistem promptunu yaz. Sadece nihai promptu döndür, ekstra açıklama ekleme.`;
}

/**
 * Build the roadmap generation prompt
 */
function buildRoadmapPrompt(title, description, language = 'tr') {
  const lang = language === 'tr' ? 'Türkçe' : 'English';
  
  return `Kullanıcı şu konuyu öğrenmek istiyor:
- Konu: "${title}"
- Amaç: "${description}"

Bu konu için kapsamlı, mantıksal bir sırayla temelden ileri seviyeye giden bir müfredat (roadmap) oluştur.
Bölüm başlıklarında "Faz 1:", "Faz 2:" gibi ekler KULLANMA, doğrudan bölümün saf ismini yaz (Örn: "Temel NLP ve Yapay Sinir Ağları", "Transformer Mimarisi").

ÖNEMLİ KURAL: Her mikro-konu (1.1, 1.2, 1.3 vb.) kendi başına bağımsız bir içerik kapsamı oluşturmalı. Bir konuda işlenecek içerik bir sonraki konuda tekrar edilmemeli. Konular arasında net bir ilerleme sırası olmalı: 1.1'de öğrenilmeden 1.2 anlaşılamaz olmalı.

Yanıtını SADECE geçerli bir JSON formatında ver. Markdown kod bloğu haricinde hiçbir ek metin yazma:

{
  "phases": [
    {
      "title": "[Bölüm Başlığı - örn: Temel NLP ve Yapay Sinir Ağları]",
      "subtopics": [
        { "id": "1.1", "title": "[Mikro Başlık]" },
        { "id": "1.2", "title": "[Mikro Başlık]" }
      ]
    },
    {
      "title": "[Bölüm Başlığı - örn: Transformer Mimarisi]",
      "subtopics": [
        { "id": "2.1", "title": "[Mikro Başlık]" }
      ]
    }
  ]
}

Konu derinliğine göre en az 3, en fazla 8 faz oluştur.
Her fazda 2-5 alt başlık olsun.
Dil: ${lang}`;
}

/**
 * Generate teaching prompt with 5 iterations (with retry on 429 and graceful fallback)
 */
async function generateTeachingPrompt({ title, description, language, provider, apiKey, model, customBaseURL, onIteration }) {
  const metaPrompt = buildMetaPrompt(title, description, language);

  let currentPrompt = await withRetry(
    () => chatCompletion(provider, apiKey, model, [{ role: 'user', content: metaPrompt }], customBaseURL),
    3,
    ({ attempt, waitSeconds }) => {
      if (onIteration) onIteration({ iteration: 0, prompt: '', label: `Rate limit — ${waitSeconds}s bekleniyor (Deneme ${attempt}/3)...` });
    }
  );

  if (onIteration) {
    onIteration({ iteration: 0, prompt: currentPrompt, label: 'İlk taslak oluşturuldu' });
  }

  // YZ: İterasyon sayısını 5'ten 3'e düşürdük, böylece 15 RPM sınırına takılmayız.
  for (let i = 1; i <= 3; i++) {
    // Base delay between iterations
    await sleep(5000);
    try {
      const iterationPrompt = buildIterationPrompt(currentPrompt, i);

      const improvedPrompt = await withRetry(
        () => chatCompletion(provider, apiKey, model, [{ role: 'user', content: iterationPrompt }], customBaseURL),
        2, // Max 2 retries
        ({ attempt, waitSeconds }) => {
          if (onIteration) onIteration({ iteration: i, prompt: currentPrompt, label: `Rate limit — ${waitSeconds}s bekleniyor (Deneme ${attempt}/2)...` });
        }
      );

      if (improvedPrompt && improvedPrompt.length > 50) {
        currentPrompt = improvedPrompt;
      }

      if (onIteration) {
        onIteration({ iteration: i, prompt: currentPrompt, label: `İterasyon ${i}/3 tamamlandı` });
      }
    } catch (err) {
      console.warn(`[generateTeachingPrompt] Iteration ${i} failed after retries:`, err.message);
      if (onIteration) {
        onIteration({ iteration: i, prompt: currentPrompt, label: `İterasyon ${i}/3 (korundu)` });
      }
    }
  }

  return currentPrompt;
}


/**
 * Generate roadmap JSON from the final prompt + course info
 */
async function generateRoadmap({ title, description, language, provider, apiKey, model, customBaseURL, onWait }) {
  // Wait 6s after all iterations before making roadmap call
  await sleep(6000);
  const roadmapPrompt = buildRoadmapPrompt(title, description, language);
  const response = await withRetry(
    () => chatCompletion(provider, apiKey, model, [{ role: 'user', content: roadmapPrompt }], customBaseURL),
    3,
    ({ attempt, waitSeconds }) => {
      if (onWait) onWait({ attempt, waitSeconds });
    }
  );

  let jsonStr = response.trim();
  if (jsonStr.includes('```')) {
    const match = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match) {
      jsonStr = match[1];
    } else {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }
  }
  
  try {
    const roadmap = JSON.parse(jsonStr);
    if (!roadmap.phases || !Array.isArray(roadmap.phases)) {
      throw new Error('Geçersiz faz yapısı');
    }
    return roadmap;
  } catch (error) {
    console.error('Failed to parse roadmap JSON:', jsonStr);
    return {
      phases: [
        {
          title: "Temel Kavramlar & Giriş",
          subtopics: [
            { id: "1.1", title: `${title} Temelleri ve Giriş` },
            { id: "1.2", title: "Temel Kavramlar ve Mimari Yapı" }
          ]
        },
        {
          title: "İleri Düzey Uygulamalar",
          subtopics: [
            { id: "2.1", title: "Derinlemesine Uygulamalar ve Örnekler" },
            { id: "2.2", title: "Optimizasyon ve En İyi Pratikler" }
          ]
        }
      ]
    };
  }
}

module.exports = {
  generateTeachingPrompt,
  generateRoadmap,
  buildMetaPrompt,
  buildIterationPrompt,
  buildRoadmapPrompt,
};
