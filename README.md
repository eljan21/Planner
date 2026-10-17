# Khaya's Planner

Şəxsi tapşırıqlar üçün həftəlik planlayıcı: Gmail ilə giriş, günlər üzrə sürüklə-burax, notlar, tamamlananlar bölməsi, Excel hesabatları, gecə rejimi və geniş fərdiləşdirmə.

## İmkanlar

- **Google (Gmail) ilə giriş** — `ALLOWED_EMAILS` ilə yalnız dostunun hesabına icazə verə bilərsən
- **Həftəlik board** — tapşırığı tutub başqa günə sürüşdür; ekranın kənarındakı zonaya atsan növbəti/əvvəlki həftəyə keçir
- Telefonda **sağa/sola sürüşdürmə** ilə həftə dəyişir (tapşırığı sürükləmək üçün barmağı bir az saxla)
- **Kateqoriyalar** — tam fərdiləşdirilə bilən: yarat (+), adını/rəngini dəyiş (✎), sil. İçində tapşırıq olan
  kateqoriyanı silərkən xəbərdarlıq çıxır və əvvəlcə həmin kateqoriyanı Excel-ə yükləmək tövsiyə olunur
- **Notlarım** — həftəlik qeydlər; hər notu istəsən bir düymə ilə istədiyin günə tapşırıq (xatırlatma) kimi əlavə edə bilərsən
- **Tamamlananlar** — ayrıca bölmə, statistika, "geri al"
- **Hesabat** — həftəlik və bütün dövr; hər ikisi **Excel (.xlsx)** kimi yüklənir
- **Gecə rejimi** (tünd göy) — ay/günəş düyməsi, seçim yadda qalır
- **Tapşırıqlar** — vaxt, prioritet (aşağı/orta/yüksək), alt-tapşırıqlar (checklist), təkrarlama
  (hər gün / həftənin seçilmiş günləri / hər ay; 6 ay qabağa avtomatik yaradılır)
- **Ayarlar** — planlayıcının adı, əsas rəng (7 variant), gecə/gündüz/sistem rejimi, rahat/kompakt sıxlıq,
  həftənin ilk günü, boş olanda gizlədilən günlər, hər günün başlıq rəngi, gün daxilində sıralama (əl ilə / vaxt / prioritet)
- **Kateqoriyalara emoji** və sol paneldə sürükləyib **sıralama**
- **Notlarda `#etiket`** — mətndə `#ailə` yaz, etiketə görə bütün həftələrdən filtr et; axtarış notları da tapır
- **Tamamlananlar filtri** — dövr (bu həftə / bu ay / aralıq) və kateqoriya
- **Fərdi Excel hesabatı** — istənilən tarix aralığı + seçilmiş kateqoriyalar
- Klaviatura: `N` yeni tapşırıq, `⌘K`/`Ctrl+K` axtarış, `←` `→` həftələr, `T` bu gün, `1`–`5` bölmələr

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
