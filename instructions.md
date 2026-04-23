# 🎭 Czółko — Specyfikacja Aplikacji

## Przegląd

**Czółko** to przeglądarkowa gra towarzyska dla grup znajomych, inspirowana klasyczną grą "Kim jestem?". Gracze odgadują przypisane im postacie/rzeczy, zadając pytania, na które reszta odpowiada. Aplikacja działa w czasie rzeczywistym dzięki **Convex**, z interfejsem w **Next.js**.

---

## Stack Technologiczny

- **Frontend:** Next.js 14+ (App Router)
- **Backend / Realtime / DB:** Convex
- **Styling:** Tailwind CSS + shadcn/ui
- **Język:** TypeScript

---

## Architektura Danych (Convex Schema)

### Tabele

```ts
// users — tymczasowi użytkownicy sesji (usuwani po zakończeniu gry)
users: {
  name: string;            // nick gracza
  roomId: Id<"rooms">;
  isHost: boolean;
  assignedCharacter?: string;   // postać przypisana TEMU graczowi przez poprzednika
  hasGuessed: boolean;          // czy już wygrał
  order: number;                // kolejność w rundzie
}

// rooms — pokoje gry (usuwane po zakończeniu)
rooms: {
  code: string;            // 4-6 literowy kod pokoju (np. "KOTKI")
  hostId: Id<"users">;
  status: "lobby" | "assigning" | "playing" | "finished";
  currentTurnUserId?: Id<"users">;
  playerIds: Id<"users">[];
  createdAt: number;
}

// messages — wiadomości czatu (usuwane po zakończeniu gry)
messages: {
  roomId: Id<"rooms">;
  authorId: Id<"users">;
  authorName: string;
  content: string;
  type: "question" | "answer" | "system" | "guess_attempt";
  targetUserId?: Id<"users">; // dla pytań — kto pyta (wyświetlanie kontekstu)
  timestamp: number;
}

// votes — głosowania nad zgadnięciem (usuwane po zakończeniu tury)
votes: {
  roomId: Id<"rooms">;
  targetUserId: Id<"users">;  // kto próbuje zgadnąć
  voterId: Id<"users">;
  vote: "yes" | "no";
  round: number;
}
```

---

## Ekrany i Przepływ Aplikacji

### 1. Strona Główna `/`

- Duży nagłówek z nazwą **Czółko 🎭**
- Przycisk **„Stwórz pokój"** → formularz: podaj nick → tworzy pokój i przechodzi do lobby
- Pole **„Dołącz do pokoju"** → wpisz kod + nick → dołącza do istniejącego pokoju
- Przyjazny, kolorowy design — duże przyciski, czytelne fonty

---

### 2. Lobby `/room/[code]` — status: `lobby`

- Wyświetla kod pokoju (duży, czytelny, do skopiowania)
- Lista graczy (w czasie rzeczywistym przez Convex `useQuery`)
- Host widzi przycisk **„Rozpocznij grę"** (aktywny gdy ≥ 3 graczy)
- Pozostali widzą napis „Czekaj na hosta..."
- Opcja opuszczenia pokoju

---

### 3. Faza Przypisywania `/room/[code]` — status: `assigning`

**Logika kolejności:**
- Gracz nr 1 przypisuje postać graczowi nr 2
- Gracz nr 2 przypisuje postać graczowi nr 3
- ...Ostatni gracz przypisuje postać graczowi nr 1

**UI:**
- Każdy gracz widzi formularz: „Wpisz postać/rzecz dla: **[imię następnika]**"
- Pole tekstowe + przycisk „Zatwierdź"
- Pasek postępu: „X/Y graczy przypisało postacie"
- Gdy wszystkie postacie przypisane → automatyczne przejście do fazy gry

**Ważne:** Gracz **NIE WIDZI** swojej własnej postaci w żadnym momencie gry.

---

### 4. Faza Gry `/room/[code]` — status: `playing`

#### Layout główny

```
┌─────────────────────────────────────────┐
│  Czółko 🎭          Pokój: KOTKI        │
├─────────────────────────────────────────┤
│  👤 Gracze:                             │
│  ✅ Ania (już zgadła!)                  │
│  🎯 Bartek ← TERAZ GRA                 │
│  ⏳ Celina                              │
│  ⏳ Dawid                               │
├─────────────────────────────────────────┤
│  💬 Historia pytań i odpowiedzi         │
│  ┌─────────────────────────────────┐   │
│  │ Bartek: Czy jestem rośliną? 🌿  │   │
│  │ Wszyscy: NIE                    │   │
│  │ Bartek: Czy jestem zwierzęciem? │   │
│  │ Wszyscy: TAK ✅                 │   │
│  └─────────────────────────────────┘   │
├─────────────────────────────────────────┤
│  [Tylko gdy Twoja tura]                 │
│  ○ Zadaj pytanie  ○ Zgaduję!           │
│  [pole tekstowe]  [przycisk]            │
└─────────────────────────────────────────┘
```

#### Mechanika tury

**Gdy jest Twoja tura:**
- Wybór akcji: **„Zadaj pytanie"** lub **„Zgaduję!"**
- Pytanie: wpisujesz pytanie → wszyscy widzą je w chacie → każdy może kliknąć **TAK** / **NIE** (odpowiedź zbiorowa — wyświetlana jako głosy lub większość)
- Zgadywanie: wpisujesz swoją odpowiedź → reszta głosuje **„Tak, zgadłeś!"** / **„Nie, jeszcze nie"**
  - Większość TAK → gracz wygrywa, dostaje odznakę ✅, może już tylko odpowiadać na pytania innych
  - Większość NIE → tura się kończy, przechodzi do następnej osoby

**Gdy nie jest Twoja tura:**
- Widzisz aktywne pytanie i możesz głosować / odpowiadać
- Widzisz historię w chacie

#### Koniec gry
- Zostaje jedna osoba bez wygranej → gra kończy się
- Ekran podsumowania: ranking graczy, ich postacie odkryte dla wszystkich
- Przycisk „Zagraj ponownie" (wraca do lobby z tym samym składem) lub „Wyjdź"
- **Czyszczenie bazy:** po potwierdzeniu zakończenia usuwane są: pokój, użytkownicy, wiadomości, głosowania

---

## Convex Functions

### Mutations

```ts
createRoom(userName: string) → { roomCode, userId }
joinRoom(code: string, userName: string) → { roomId, userId }
leaveRoom(userId, roomId)
startGame(roomId, hostId)           // zmienia status na "assigning"
assignCharacter(fromUserId, toUserId, character: string)
submitQuestion(userId, roomId, question: string)
submitAnswer(userId, roomId, messageId, answer: string)
submitGuessAttempt(userId, roomId, guessText: string)
submitVote(voterId, targetUserId, roomId, vote: "yes"|"no")
advanceTurn(roomId)                 // przechodzi do następnego gracza
markPlayerWon(userId, roomId)
endGame(roomId)                     // czyści dane
```

### Queries (realtime via useQuery)

```ts
getRoom(code: string) → Room
getPlayers(roomId) → User[]
getMessages(roomId) → Message[]
getVotes(roomId, targetUserId) → Vote[]
getMyCharacter(userId) → string | null  // NIGDY nie zwraca własnej postaci
```

---

## Zasady UX / Design

### Kolorystyka
- Tło: ciemny granat (`#0f172a`) lub głęboki fiolet
- Akcenty: żywy róż/magenta + złoto
- Karty/panele: półprzezroczyste z `backdrop-blur`
- Tekst: biały / jasnoszary

### Komponenty
- Duże, dotykowe przyciski (min. 48px wysokości)
- Animacje wejścia wiadomości (slide-in z dołu)
- Pulsujący wskaźnik „teraz gra" przy aktywnym graczu
- Toast notyfikacje przy ważnych zdarzeniach (ktoś dołączył, tura zmieniła się itp.)
- Responsywność: mobile-first (gra na telefonach w gronie znajomych)

### Dostępność
- Kod pokoju zawsze widoczny i kopiowany jednym kliknięciem
- Wyraźne rozróżnienie: „moja tura" vs „tura kogoś innego"
- Historia czatu przewijalna, najnowsze na dole

---

## Bezpieczeństwo i Czyszczenie Danych

- Użytkownicy są **anonimowi** — tylko nick, bez kont
- `userId` przechowywane w `localStorage` po stronie klienta
- Po zakończeniu gry: scheduled job w Convex usuwa pokój + powiązane rekordy
- Pokoje bez aktywności przez 2h → automatyczne usunięcie (Convex scheduled functions)
- Kod pokoju: losowe 5 wielkich liter (np. "KOTKI", "ZEFIR")

---

## Struktura Projektu

```
/
├── app/
│   ├── page.tsx                  # Strona główna (twórz/dołącz)
│   ├── room/[code]/
│   │   └── page.tsx              # Główny ekran gry (lobby/assigning/playing/finished)
│   └── layout.tsx
├── components/
│   ├── lobby/
│   │   ├── LobbyRoom.tsx
│   │   └── PlayerList.tsx
│   ├── game/
│   │   ├── AssigningPhase.tsx
│   │   ├── PlayingPhase.tsx
│   │   ├── ChatHistory.tsx
│   │   ├── TurnActions.tsx
│   │   ├── VotingPanel.tsx
│   │   └── GameFinished.tsx
│   └── ui/                       # shadcn komponenty
├── convex/
│   ├── schema.ts
│   ├── rooms.ts
│   ├── users.ts
│   ├── messages.ts
│   ├── votes.ts
│   └── _generated/
└── lib/
    └── utils.ts
```

---

## Kolejność Implementacji (dla Claude Code)

1. **Setup:** `npx create-next-app`, dodaj Convex, skonfiguruj Tailwind + shadcn/ui
2. **Schema Convex** — zdefiniuj wszystkie tabele
3. **Strona główna** — tworzenie i dołączanie do pokoju
4. **Lobby** — lista graczy w realtimie, przycisk startu
5. **Faza przypisywania** — formularze, progress bar
6. **Faza gry** — chat, tura, pytania/odpowiedzi
7. **System głosowania** — zgadywanie, wygrywanie
8. **Ekran końcowy + czyszczenie danych**
9. **Polish UI** — animacje, responsywność, dark mode

---

## Przykładowe Środowisko `.env.local`

```
NEXT_PUBLIC_CONVEX_URL=https://xxx.convex.cloud
```

---

*Specyfikacja przygotowana dla Claude Code — użyj tego dokumentu jako głównego pliku referencyjnego przy budowie aplikacji Czółko.*