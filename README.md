# scanchart

**Barkod okuyucular için göz testi.** Okuyucunun hangi barkod türlerini, ne kadar küçük ve ne kadar uzaktan okuduğunu ölçen, yazdırılabilir test tabloları.

Canlı: https://kiliczsh.github.io/scanchart

## Sayfalar

1. **Tür tablosu:** 28 tür. 1D, 2D ve özel testler: ters renk, 0,25 mm modül, US ve Türkçe Q klavye düzeni, Türkçe karakter, 304 karakter.
2. **QR keskinlik:** QR 21×21, modül 1,6 mm'den 0,25 mm'ye 9 satır.
3. **Data Matrix keskinlik:** Data Matrix 10×10, modül 3 mm'den 0,25 mm'ye 12 satır.
4. **Test formu:** Elle doldurmak için.

Her sayfanın altında 10 cm'lik bir cetvel var. Kâğıtta tam 10 cm ölçmüyorsa baskı ölçeklenmiş demektir.

## Kullanım

- **Ekrandan ya da kâğıttan okut:** Sayfa açıkken okuyucu klavye gibi yazar. Okunan kodun yanına küçük bir "okundu" notu düşülür.
- **Uzaklık:** Üst çubuktan uzaklığı seç. Her okuma o uzaklıkla kaydedilir.
- **Sonuç:** "Sonucu kopyala" bir metin özeti verir. "CSV" bütün okumaları indirir.
- **Yazdır / PDF:** A4, kenar boşluğu yok, ölçek %100. Tarayıcının yazdırma ekranında "PDF olarak kaydet" seçilir.
- **Tek tek test:** Kodlar ekranda tek tek, büyük gösterilir. Okununca kendiliğinden ilerler; "Okudu / Okumadı" ile elle de işaretlenebilir.

Klavye düzeninden bağımsız çalışır: sayfa karakterleri değil fiziksel tuş kodlarını okur.

## Yerelde çalıştırma

Derleme adımı yok, düz statik dosyalar.

```bash
bunx serve .
```

## Dosyalar

- `index.html`: sayfa
- `assets/codes.js`: tablo içerikleri (türler, satır boyutları, kod içerikleri)
- `assets/app.js`: SVG çizim, okuyucu dinleme, sonuçlar
- `assets/style.css`: ekran ve baskı stilleri
