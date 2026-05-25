# SMS Manager Desktop

Firemní desktop aplikace pro Windows pro správu a odesílání SMS zákazníkům přes Android SMS Gateway.

---

## Tech Stack

| Vrstva | Technologie |
|--------|-------------|
| Desktop runtime | Electron 29 |
| Frontend | Next.js 14 + TypeScript + TailwindCSS |
| Databáze | SQLite + Prisma ORM |
| SMS Gateway | sms-gate.app REST API |
| UI komponenty | shadcn/ui + lucide-react |
| Formuláře | react-hook-form + zod |

---

## Předpoklady

- **Node.js** 18+ (doporučeno 20 LTS)
- **npm** 9+
- Android telefon s aplikací **SMS Gateway** od sms-gate.app
- Účet na [app.sms-gate.app](https://app.sms-gate.app)

---

## Instalace a spuštění

### 1. Klonování / rozbalení projektu

```bash
cd sms-desktop-app
```

### 2. Instalace závislostí

```bash
npm install
```

> ⚠️ Automaticky se spustí `prisma generate` a `electron-builder install-app-deps`.

### 3. Nastavení databáze

```bash
# Vytvoří databázi a aplikuje schéma
npm run prisma:push

# Naplní výchozími šablonami SMS
npm run prisma:seed
```

### 4. Spuštění ve vývojovém režimu

```bash
npm run dev
```

Tím se spustí:
- Next.js dev server na `http://localhost:3000`
- Electron okno (čeká na Next.js server)

---

## Nastavení Android SMS Gateway

### Krok 1 – Instalace aplikace na Android

1. Otevřete Google Play na Android telefonu
2. Vyhledejte **"SMS Gateway"** od Cubeacon (nebo použijte přímý odkaz)  
   → [https://play.google.com/store/apps/details?id=me.capcom.smsgateway](https://play.google.com/store/apps/details?id=me.capcom.smsgateway)
3. Nainstalujte a otevřete aplikaci

### Krok 2 – Vytvoření účtu

1. Přejděte na [https://app.sms-gate.app](https://app.sms-gate.app)
2. Zaregistrujte se nebo se přihlaste
3. Zapamatujte si své **e-mailové přihlašovací jméno** a **heslo**

### Krok 3 – Propojení telefonu s Cloud relay

1. V Android aplikaci SMS Gateway klepněte na **"Přihlásit se"**
2. Zadejte stejné přihlašovací údaje jako na webu
3. Povolte **Cloud relay** (telefon se zaregistruje jako SMS brána)
4. Zkontrolujte, že aplikace má povolení pro odesílání SMS

> ℹ️ Telefon musí mít aktivní SIM kartu a být připojený k internetu nebo datům.

### Krok 4 – Nastavení v desktop aplikaci

1. Otevřete SMS Manager
2. Přejděte na **Nastavení** (ozubené kolečko vlevo dole)
3. Vyplňte:
   - **API URL**: `https://app.sms-gate.app/api/v1` (výchozí, neměňte)
   - **Uživatelské jméno**: váš e-mail od sms-gate.app
   - **Heslo**: vaše heslo
4. Klikněte na **Test připojení**
5. Pokud vidíte zelené "Připojení úspěšné", vše funguje!
6. Klikněte na **Uložit nastavení**

---

## Build a distribuce (.exe)

### Build pro Windows

```bash
# Sestaví Next.js + Electron + vytvoří instalátor
npm run dist
```

Výstup v adresáři `release/`:
- `SMS Manager Setup x.x.x.exe` — instalátor NSIS
- `SMS-Manager-Portable-x.x.x.exe` — portable verze

### Build bez instalátoru (pro testování)

```bash
npm run dist:dir
```

Výstup v `release/win-unpacked/` — spouštitelný adresář.

---

## Struktura projektu

```
sms-desktop-app/
├── electron/                    # Electron main process (Node.js)
│   ├── main.ts                  # Vstupní bod Electronu
│   ├── preload.ts               # IPC bridge (contextBridge)
│   ├── ipc/
│   │   ├── sms.ts               # IPC handlers pro SMS
│   │   ├── customers.ts         # IPC handlers pro zákazníky
│   │   ├── templates.ts         # IPC handlers pro šablony
│   │   └── settings.ts          # IPC handlers pro nastavení
│   ├── services/
│   │   └── sms-gateway.ts       # REST API klient pro sms-gate.app
│   └── lib/
│       └── database.ts          # Prisma inicializace + migrace
├── prisma/
│   ├── schema.prisma            # Databázové schéma
│   ├── seed.ts                  # Výchozí šablony
│   └── migrations/              # SQL migrace
├── src/                         # Next.js renderer (React)
│   ├── app/
│   │   ├── layout.tsx           # Root layout
│   │   ├── page.tsx             # Dashboard
│   │   ├── send/page.tsx        # Odeslání SMS
│   │   ├── templates/page.tsx   # Správa šablon
│   │   ├── history/page.tsx     # Historie SMS
│   │   ├── customers/page.tsx   # Správa zákazníků
│   │   └── settings/page.tsx    # Nastavení
│   ├── components/
│   │   └── layout/              # AppLayout, Sidebar, Titlebar
│   ├── hooks/
│   │   └── useElectron.ts       # Hook pro Electron API
│   ├── lib/
│   │   └── utils.ts             # Utility funkce
│   └── types/
│       └── index.ts             # TypeScript typy
├── resources/                   # Ikony aplikace
├── package.json
├── tsconfig.json                # Next.js TypeScript config
├── tsconfig.electron.json       # Electron TypeScript config
├── next.config.mjs
├── tailwind.config.ts
└── electron-builder.yml
```

---

## Databáze

SQLite databáze se v produkci ukládá do:
```
C:\Users\<user>\AppData\Roaming\SMS Manager\sms-manager.db
```

Pro přímý přístup k databázi:
```bash
npm run prisma:studio
```

---

## Funkce aplikace

### Dashboard
- Statistiky dnešních SMS (celkem, odesláno, chyby, čeká)
- Rychlé akce pro nejčastější šablony
- Přehled posledních zpráv

### Odeslat SMS
- Výběr šablony jedním klikem
- Automatické generování textu z proměnných (`{zakazka}`, `{cena}`, `{poznamka}`, `{telefon}`)
- Vyhledávání zákazníků z databáze
- Počítadlo znaků a SMS

### Šablony
- CRUD šablon s živým náhledem
- Vkládání proměnných kliknutím
- Nastavení výchozí šablony

### Historie
- Kompletní log odeslaných SMS
- Filtrace dle stavu (odeslano/chyba/čeká)
- Vyhledávání dle čísla/textu
- Možnost znovu odeslat nebo smazat

### Zákazníci
- Lokální adresář zákazníků
- Přímé odeslání SMS z karty zákazníka
- CRUD operace

### Nastavení
- Konfigurace SMS Gateway API
- Test připojení
- Informace o aplikaci a databázi
- Smazání historie

---

## Windows UX funkce

| Funkce | Popis |
|--------|-------|
| Custom titlebar | Vlastní záhlaví s ovládacími tlačítky |
| Tray icon | Minimalizace do lišty systému |
| Desktop notifikace | Upozornění po odeslání SMS |
| Single instance | Pouze jedna instance aplikace |
| Offline podpora | Databáze běží lokálně bez internetu |

---

## Proměnné šablon

| Proměnná | Popis |
|----------|-------|
| `{zakazka}` | Číslo zakázky |
| `{cena}` | Cena v Kč |
| `{poznamka}` | Volitelná poznámka |
| `{telefon}` | Telefonní číslo zákazníka |

---

## Troubleshooting

### "Gateway offline" v sidebaru
1. Zkontrolujte přihlašovací údaje v Nastavení
2. Ověřte, že Android aplikace SMS Gateway běží a je přihlášena
3. Zkuste Test připojení v Nastavení

### Electron se nespustí
```bash
# Zkontrolujte, zda Next.js server běží
npm run next:dev
# V jiném terminálu:
npm run electron:dev
```

### Chyba při `npm install`
```bash
# Smažte node_modules a zkuste znovu
rm -rf node_modules
npm install
```

### Prisma chyba "Cannot find module @prisma/client"
```bash
npm run prisma:generate
```

### Build selže s "icon not found"
Přidejte ikony do složky `resources/`:
- `resources/icon.ico` (Windows)

---

## Vývoj

### Přidání nové šablony
1. Přejděte do Šablon
2. Klikněte na Nová šablona
3. Použijte proměnné `{zakazka}`, `{cena}`, atd.

### Přidání nového IPC handleru
1. Vytvořte handler v `electron/ipc/`
2. Zaregistrujte v `electron/main.ts`
3. Přidejte do preload bridge v `electron/preload.ts`
4. Použijte `window.electronAPI.*` v React komponentě

---

## Licence

UNLICENSED — interní firemní software
