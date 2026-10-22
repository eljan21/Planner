# Plan it!

Şəxsi tapşırıqlar üçün həftəlik planlayıcı: Gmail ilə giriş, günlər üzrə sürüklə-burax, notlar, tamamlananlar bölməsi, Excel hesabatları, gecə rejimi və geniş fərdiləşdirmə.

## Günün dostu

Hər gün Friends, Harry Potter və Avengers-dən bir personaj (Rachel, Hermione, Natasha, Monica, Harry, Phoebe, Wanda, Chandler)
yuxarıdakı tünd göy zolaqda dayanır və nə etdiyinə reaksiya verir:

- tapşırıq bitəndə əl çalır və ya öz "imza" hərəkətini edir (Rachel qəhvə içir, Harry sehr edir, Phoebe gitara çalır...)
- tapşırığı sonrakı günə atanda qollarını çarpazlayır, alnına şillə vurur və ya çiyinlərini çəkib sataşır
- 3 və 5 ardıcıl tapşırıqda rəqs edir, günün bütün işləri bitəndə 8 personaj birlikdə tullanır; cümə günü qrup şəkli
- gözləri siçanı izləyir, üstünə klikləyəndə diksinir, uzun müddət heç nə etməsən əsnəyib yuxuya gedir
- gün dəyişəndə dünənki personaj əl yelləyib çıxır, yenisi gəlir

Personajlar `src/characters/` qovluğundadır: `people.js` (replikalar), `figure.js` (SVG fiqurlar), `characters.css` (pozalar).
Animasiyalar və alqış səsi Ayarlar və ya menyudan dəyişdirilir.

## İmkanlar

- **Google (Gmail) ilə giriş** — `ALLOWED_EMAILS` ilə yalnız dostunun hesabına icazə verə bilərsən
- **5 günlük board** — tapşırığı tutub başqa günə sürüşdür; kənardakı zonaya atsan növbəti/əvvəlki həftəyə keçir. Digər günlər (həftəsonu daxil) yuxarıdakı təqvimdən açılır
- Telefonda günlər arasında **sağa/sola sürüşdür** (tapşırığı sürükləmək üçün barmağı bir az saxla)
- **Kateqoriyalar** — tam fərdiləşdirilə bilən: yarat (+), adını/rəngini dəyiş (✎), sil. İçində tapşırıq olan
  kateqoriyanı silərkən xəbərdarlıq çıxır və əvvəlcə həmin kateqoriyanı Excel-ə yükləmək tövsiyə olunur
- **Notlarım** — həftəlik qeydlər; hər notu istəsən bir düymə ilə istədiyin günə tapşırıq (xatırlatma) kimi əlavə edə bilərsən
- **Tamamlananlar** — ayrıca bölmə, statistika, "geri al"
- **Hesabat** — həftəlik və bütün dövr; hər ikisi **Excel (.xlsx)** kimi yüklənir
- **Gecə rejimi** (tünd göy) — ay/günəş düyməsi, seçim yadda qalır
- **Tapşırıqlar** — vaxt, prioritet (aşağı/orta/yüksək), alt-tapşırıqlar (checklist), təkrarlama
  (hər gün / həftənin seçilmiş günləri / hər ay; 6 ay qabağa avtomatik yaradılır)
- **Ayarlar** — planlayıcının adı, gecə/gündüz/sistem rejimi, personaj animasiyaları və alqış səsi, rahat/kompakt sıxlıq,
  həftənin ilk günü, gün daxilində sıralama (əl ilə / vaxt / prioritet)
- **Kateqoriyalara emoji** və menyuda sürükləyib **sıralama**
- **Notlarda `#etiket`** — mətndə `#ailə` yaz, etiketə görə bütün həftələrdən filtr et; axtarış notları da tapır
- **Tamamlananlar filtri** — dövr (bu həftə / bu ay / aralıq) və kateqoriya
- **Fərdi Excel hesabatı** — istənilən tarix aralığı + seçilmiş kateqoriyalar
- Klaviatura: `N` yeni tapşırıq, `⌘K`/`Ctrl+K` axtarış, `←` `→` həftələr, `T` bu gün, `1`–`5` bölmələr

## Email + parol ilə giriş (iki addımlı)

- Giriş səhifəsində **Daxil ol / Qeydiyyat**. Qeydiyyatdan sonra telefondakı autentifikator tətbiqi
  (Google Authenticator, Authy…) QR kodla qoşulur və **8 birdəfəlik bərpa kodu** verilir.
- **Yeni cihazdan** girişdə 6 rəqəmli kod soruşulur; sonra həmin cihaz 30 gün yadda qalır. Telefon yoxdursa, bərpa kodu ilə girmək olar.
- Ayarlar → **Təhlükəsizlik**: parolu dəyiş (digər cihazlar unudulur), yeni bərpa kodları, «digər cihazları unut».
- Parollar `scrypt` ilə, autentifikator sirri AES-GCM ilə şifrələnib saxlanır; səhv cəhdlər 15 dəqiqəlik limitlə məhdudlaşdırılır.
- Email göndərmə yoxdur, ona görə «parolu unutdum» da yoxdur — bərpa kodlarını saxlamaq vacibdir.
- Eyni emailə sonradan Google ilə girilsə, ayrı hesab yaranmır — həmin hesaba bağlanır.

## Telefona tətbiq kimi (PWA) və bildirişlər

- **iPhone:** Safari-də saytı aç → Paylaş ⬆︎ → «Ana ekrana əlavə et». **Android / kompüter:** «Quraşdır» düyməsi
  (ana səhifədəki bannerdə və Ayarlar → Tətbiq və bildirişlər). App Store / Google Play lazım deyil, pulsuzdur.
- **Bildirişlər** (Ayarlar → Tətbiq və bildirişlər → «Bildirişləri aç»): deadline xatırlatmaları, dostluq istəkləri,
  qəbul və dəvətlə qoşulma telefonun öz bildirişi ilə gəlir — Telegram qoşulmasa da. iPhone-da bunun üçün tətbiq əvvəlcə
  ana ekrana əlavə olunmalıdır (iOS 16.4+). Android/kompüterdə xatırlatmanın «✅ Bitdi» düyməsi var.
- VAPID açarları ilk işə düşəndə yaradılır və `DATA_DIR/vapid.json`-da saxlanır (və ya `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`).
- **Dəvət linki:** Profil və Dostlar səhifəsində `…/?dost=KOD`. Linki açıb daxil olan / qeydiyyatdan keçən avtomatik dost olur.

## Dostlar və seriyalar

- Hər istifadəçinin 6 simvollu **dost kodu** var (Profil səhifəsində). Dostunu bu kodla və ya **Gmail ünvanı** ilə əlavə edirsən;
  o qəbul edəndə bir-birinizin **seriyasını** (neçə gün ardıcıl ən azı bir tapşırıq bitirib), bu günkü irəliləyişini,
  həftəlik sayını və rekordunu görürsünüz. Tapşırıqların adları heç vaxt paylaşılmır.
- Telegram qoşulubsa, dostluq istəyi gələndə və qəbul olunanda bot xəbər verir.
- **Profil şəkli**: Profil → «Şəkil yüklə». Şəkil brauzerdə kvadrat kəsilib 256×256-ya kiçildilir və bazada saxlanır;
  onu yalnız sən və dostların görür. Şəkil yükləməsən, Google şəklin göstərilir.
- Lokal sınaq üçün giriş səhifəsində ikinci demo hesab var (`DEV_LOGIN=true` olanda).

## Telegram botu (deadline xatırlatmaları)

Tapşırığın içində **Deadline** (tarix + saat) və istənilən sayda **Telegram xatırlatması** (dəqiq tarix + saat) qoymaq olur.
Vaxt çatanda bot mesaj göndərir: tapşırıq, deadline, nə qədər vaxt qaldığı və günün dostundan bir cümlə. Mesajdakı
**✅ Bitdi** düyməsi tapşırığı birbaşa bitirir.

1. Telegram-da **@BotFather** → `/newbot` → ad və istifadəçi adı ver (məs. `khayala_planner_bot`). Verdiyi tokeni kopyala.
2. Tokeni `.env`-ə (lokal) və ya Render-də **Environment** bölməsinə yaz: `TELEGRAM_BOT_TOKEN=123456:ABC...`
3. Serveri yenidən başlat. Planlayıcıda **Ayarlar → Telegram → «Telegram-ı qoş»** → açılan botda **Start** bas.
4. «Test mesajı» düyməsi ilə yoxla.

Bot `getUpdates` (long polling) ilə işləyir, webhook lazım deyil — amma server daim oyaq olmalıdır, yoxsa xatırlatmalar
gecikir. Server 6 saatdan çox yatıbsa, köhnəlmiş xatırlatmalar göndərilmir. Bot tokeni eyni anda yalnız bir serverdə işləyə
bilər (lokal və Render-də birlikdə işə salsan, biri xəta verəcək). `/stop` əmri xatırlatmaları dayandırır.

## Lokal işə salmaq

```bash
cp .env.example .env      # DEV_LOGIN=true saxla — Google olmadan "Demo giriş" düyməsi çıxır
npm install
npm run dev               # http://localhost:5173
```

Node 22.13+ lazımdır (verilənlər bazası Node-un daxili `node:sqlite` modulundadır).

## 1. Google Client ID almaq

1. https://console.cloud.google.com → yeni layihə yarat
2. **APIs & Services → OAuth consent screen** → *External* → app adı, öz e-poçtun → yadda saxla.
   *Test users* bölməsinə dostunun Gmail-ini əlavə et (və ya **Publish app** et).
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**
   - Application type: **Web application**
   - **Authorized JavaScript origins**:
     - `https://tasks.sənin-domenin.com`
     - `http://localhost:5173` (lokal test üçün)
   - Redirect URI lazım deyil.
4. Çıxan **Client ID**-ni `.env` faylında `GOOGLE_CLIENT_ID`-yə yaz.

> Google girişi yalnız **HTTPS** domendə işləyir (localhost istisnadır). Ona görə serverə domen lazımdır — ucuz domen və ya pulsuz `duckdns.org` subdomeni olar.

## 2. AWS-də yayımlamaq (EC2 + Docker)

1. **EC2 instance** aç: Ubuntu 24.04, `t3.micro`/`t3.small` kifayətdir.
   Security Group: **22** (SSH), **80** və **443** (HTTP/HTTPS) portlarını aç.
2. **Elastic IP** ayır və instance-a bağla. Domenin DNS-ində **A record** → bu IP.
3. Serverə qoşul və Docker qur:
   ```bash
   ssh ubuntu@<IP>
   curl -fsSL https://get.docker.com | sudo sh
   sudo usermod -aG docker ubuntu && exit   # yenidən qoşul
   ```
4. Layihəni serverə köçür (git və ya `scp -r "Task Panel" ubuntu@<IP>:~/task-panel`), sonra:
   ```bash
   cd ~/task-panel
   cp .env.example .env
   nano .env
   ```
   Doldur:
   ```
   GOOGLE_CLIENT_ID=...apps.googleusercontent.com
   JWT_SECRET=<openssl rand -hex 32 nəticəsi>
   ALLOWED_EMAILS=dostun@gmail.com
   DOMAIN=tasks.sənin-domenin.com
   ```
5. İşə sal:
   ```bash
   docker compose up -d --build
   ```
   Caddy avtomatik olaraq Let's Encrypt HTTPS sertifikatı alır. Bir-iki dəqiqədən sonra `https://DOMAIN` açılır.

### Yeniləmə
```bash
docker compose up -d --build
```

### Backup
Bütün məlumat `taskdata` volume-dakı `tasks.db` faylındadır:
```bash
docker compose cp app:/data/tasks.db ./backup-$(date +%F).db
```

## Struktur

```
server/index.js    Express API, Google token yoxlaması, sessiya (httpOnly cookie)
server/db.js       SQLite sxemi
server/report.js   Excel hesabatı (exceljs)
src/               React frontend (Vite, dnd-kit)
```
