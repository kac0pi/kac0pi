# kac0pi — personal website

Nowoczesna, responsywna strona osobista z blogiem IT i dwiema mini-grami. Projekt działa jako statyczna witryna GitHub Pages — bez PHP, bazy danych i procesu budowania.

## Zawartość

- `index.html` — strona główna, bio, projekty i odliczanie do 18-stki.
- `blog.html` — lista artykułów, wyszukiwarka, filtry tagów i podgląd wpisu.
- `gry.html` — Snake oraz Hacker Clicker.
- `style.css` — cały wygląd i RWD.
- `script.js` — interakcje, gry, blog, rok w stopce.
- `posts/` — wpisy Markdown i indeks JSON.
- `admin/` — panel Decap CMS.
- `.github/workflows/` i `scripts/` — automatyczne odświeżanie indeksu wpisów.

## Publikacja na GitHub Pages

1. Utwórz publiczne repozytorium, np. `kac0pi.github.io` (dla strony użytkownika) albo `kac0pi-site` (dla strony projektu).
2. Rozpakuj ZIP i wgraj całą zawartość repozytorium do głównego katalogu repo (nie sam folder nadrzędny).
3. W `admin/config.yml` podmień `OWNER/REPO`, `OWNER.github.io/REPO` i `public_folder` na swoje dane. Dla repozytorium `OWNER.github.io` usuń `/REPO` ze ścieżek.
4. W `script.js` ustaw `CONFIG.birthday18` na swoją datę w formacie `YYYY-MM-DD`. Możesz zostawić wartość domyślną, aby odliczanie pokazywało instrukcję.
5. W GitHub: **Settings → Pages → Build and deployment → Deploy from a branch → main / root**. Zapisz i poczekaj na publikację.
6. Wejdź na adres GitHub Pages.

## Blog i CMS — ważne informacje o bezpieczeństwie

Witryna jest publiczna, więc wszystkie artykuły, pliki i kod w repozytorium są publiczne. To normalne dla GitHub Pages.

Panel `/admin/` jest tylko interfejsem CMS — sam ukryty adres ani skrót klawiszowy nie stanowią zabezpieczenia. Dostęp do zapisu musi być kontrolowany przez GitHub OAuth i uprawnienia repozytorium.

**GitHub Pages nie uruchamia backendu OAuth.** Dlatego w `admin/config.yml` znajduje się pole `base_url` jako placeholder dla zaufanego zewnętrznego OAuth proxy. Nie wpisuj do publicznego repozytorium client secret, tokenu GitHub ani hasła. Nie używaj przypadkowego, publicznego proxy OAuth. Skonfiguruj własny OAuth proxy / zaufaną usługę, ogranicz ją do swojego konta lub użytkowników z uprawnieniem write do repozytorium, a dopiero potem uzupełnij `base_url`. W GitHub OAuth App ustaw callback URL dokładnie zgodnie z dokumentacją wybranego proxy. Włącz 2FA na koncie GitHub.

Jeżeli nie chcesz utrzymywać OAuth proxy, bezpieczniejszą i prostszą opcją jest edytowanie wpisów bezpośrednio w GitHub (przycisk Edit) albo skorzystanie z usługi CMS, która zapewnia własny, prawidłowo skonfigurowany backend OAuth. Samo dodanie pliku `admin/config.yml` nie aktywuje logowania.

### Jak publikować artykuły przez Decap CMS

Po skonfigurowaniu OAuth:
1. Otwórz `https://OWNER.github.io/REPO/admin/`.
2. Zaloguj się kontem GitHub, które ma uprawnienie write do repozytorium.
3. Wybierz **Artykuły → New Artykuł**.
4. Uzupełnij tytuł, datę, opis, tagi i treść, a następnie zapisz / opublikuj.

CMS zapisuje artykuły jako Markdown w `posts/`. Workflow GitHub Actions aktualizuje `posts/posts.json`, z którego korzysta frontend bloga.

## Konfiguracja odliczania

W `script.js` znajdź:

```js
birthday18: "USTAW-DATE-YYYY-MM-DD",
```

i wpisz datę swoich 18. urodzin, np. `2028-04-17`. Przykład jest wyłącznie formatem — wpisz własną datę.

## Gry

- Snake: strzałki / WASD, sterowanie dotykowe na telefonie, najlepszy wynik w LocalStorage.
- Hacker Clicker: klikaj rdzeń i kupuj ulepszenia; postęp jest zapisany w LocalStorage tej przeglądarki.

## Drobne rzeczy do podmiany

- Linki `https://github.com/` w HTML zamień na adres swojego profilu.
- Uzupełnij `admin/config.yml`.
- Ustaw datę 18-stki w `script.js`.
- Możesz zmienić treść bio i przykładowy artykuł.
