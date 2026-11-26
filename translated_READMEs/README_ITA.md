# WerZatSong

WerZatSong è uno strumento che aiuta a scoprire il nome delle canzoni partendo dai loro file audio. Ha diverse modalità di ricerca per trovare corrispondenze: **Audfprint, Audiotag, MusicBrainz (AcoustID) e Shazam.** Si può usare una sola modalità o combinarne più di una. Se ne vengono scelte più di una, vengono eseguite in quest'ordine di priorità:

1. **MusicBrainz** (AcoustID)

2. **Audiotag**

3. **Shazam**

4. **Audfprint**

Questo documento è una semplice guida passo passo per installare, configurare e usare WerZatSong.

> **For English speakers:** the original English version of this document is [**README.md.**](../README.md)

> **Pour les francophones:** une traduction intégrale de ce document est disponible dans [**README_FRA.md.**](README_FRA.md)

> **Para quem fala português:** uma tradução completa deste documento está disponível em [**README_POR.md.**](README_POR.md)

## Requisiti e installazione

Prima di iniziare, bisogna installare questi programmi:

### Requisiti di sistema

- [**Node.js**](https://nodejs.org) (v20.0 o superiore) → Aggiungerlo al PATH e controllarlo nel terminale con `node -v` e `npm -v`.

- [**Python**](https://www.python.org/downloads) (v3.13 o superiore) → Aggiungerlo al PATH e controllarlo nel terminale con `python --version` e `pip --version`. Su macOS e Linux spesso si chiamano `python3` e `pip3`: usare quelli nei comandi più sotto (WerZatSong trova `python3` da solo).

- [**FFmpeg**](https://www.gyan.dev/ffmpeg/builds) → Aggiungerlo al PATH e controllarlo nel terminale con `ffmpeg -version`.

  ![Programmi](../images/programs.png)

### Requisiti del programma

Per usare WerZatSong al meglio, servono anche:

- **Link webhook di Discord** → Per ricevere le notifiche delle corrispondenze (vedere *"Come ottenere un link webhook di Discord"* più sotto).

- **Chiave API di Audiotag** → Necessaria per la modalità di ricerca Audiotag (vedere *"Come ottenere una chiave API di Audiotag"* più sotto).

- **Chiave API di AcoustID** → Necessaria per la modalità di ricerca MusicBrainz (vedere *"Come ottenere una chiave API di AcoustID"* più sotto).

- **Database per Audfprint** → Necessario per la modalità di ricerca Audfprint (vedere *"Scaricare il database di Audfprint"* più sotto).

  - **Attenzione allo spazio** → Il database occupa parecchio spazio su disco. Per prestazioni migliori è consigliato un **SSD.**

WerZatSong chiede la chiave API di una modalità solo quando quella modalità è nel comando, e del webhook e di entrambe le chiavi si può fare a meno (vedere *"Eseguire senza webhook o senza una chiave API"* più sotto).

#### Come ottenere un link webhook di Discord

1. Aprire Discord e creare un server (se non ce n'è già uno).

2. Nel canale testuale **#generale,** cliccare sull'icona dell'ingranaggio (**Modifica canale**).

3. Andare su **Integrazioni** → **Webhook.**

4. Cliccare su **Crea webhook,** poi aprirlo e selezionare **Copia URL webhook.**

5. Tenerlo da parte per ora, servirà a breve.

#### Come ottenere una chiave API di Audiotag

1. Andare sul sito di [Audiotag.](https://audiotag.info)

2. Creare un nuovo account, oppure accedere a uno esistente.

3. Andare nella [**User Section**](https://user.audiotag.info) e cliccare sulla scheda **API keys.**

4. Cliccare sul pulsante **Create new API key,** copiare la chiave e tenerla da parte per ora.

#### Come ottenere una chiave API di AcoustID

1. Andare sul sito di [AcoustID.](https://acoustid.org)

2. Creare un nuovo account, oppure accedere a uno esistente.

3. In [**My Applications,**](https://acoustid.org/my-applications) cliccare sul pulsante **Register a new application.**

4. Compilare i campi con informazioni di base (possono essere a caso) e cliccare su **Register.**

5. Copiare la **API key** dell'applicazione che compare e tenerla da parte per ora.

#### Scaricare il database di Audfprint

- Scaricare le **cartelle del database** con i **file PKLZ** creati dalla community da [**qui.**](https://wzs.cosine.club)

### Installazione del programma

1. **Scaricare WerZatSong:**

   - Andare nella repository, cliccare su **<> Code** → **Download ZIP.**

   - Estrarre il file in una cartella qualsiasi.

   - Ora dovrebbe esserci una cartella chiamata `WerZatSong-main`.

2. **Entrare nella cartella:**

   - Spostarsi nella cartella estratta con il comando `cd` nel terminale:

     ```bash
     cd WerZatSong-main
     ```

3. **Eseguire questo comando per installare le dipendenze di Node.js:**

    ```bash
    npm install
    ```

4. **Eseguire questi comandi uno alla volta per installare le dipendenze di Python:**

    ```bash
    pip install -r requirements.txt
    pip install audioop-lts
    pip install shazamio
    ```

    - **Nota:** se durante l'installazione di queste dipendenze compare un errore, potrebbe mancare qualcos'altro. Ecco due problemi comuni e come risolverli:

        - **Errore di Rust** (vedere lo screenshot qui sotto):

            - Installare Rust dal [sito ufficiale.](https://www.rust-lang.org/tools/install)

            - Dopo l'installazione, controllare che funzioni eseguendo `rustc --version` nel terminale.

            - Una volta installato Rust, riprovare i comandi `pip install` qui sopra.

            ![Errore di Rust](../images/rust-error.png)

        - **Errore dei C++ Build Tools** (vedere lo screenshot qui sotto):

            - Installare i Build Tools per Visual Studio 2017 o successivo dal [sito ufficiale.](https://visualstudio.microsoft.com/thank-you-downloading-visual-studio/?sku=BuildTools&rel=16)

            - Durante l'installazione, selezionare il carico di lavoro *"Sviluppo di applicazioni desktop con C++"* (gli strumenti C++).

            - Dopo l'installazione, riavviare il computer.

            - Riprovare i comandi `pip install` qui sopra.

            ![Errore di Shazam](../images/shazam-error.png)

Fatto! Ora WerZatSong è pronto per essere configurato.

## Configurazione iniziale

### Configurare WerZatSong per la prima volta

Nel terminale, eseguire questo comando:
```bash
node werzatsong.js --audiotag --musicbrainz
```

Al **primo avvio,** questo comando:

- Crea automaticamente tutte le cartelle necessarie.

- Chiede il **link webhook di Discord, la chiave API di Audiotag e la chiave API di AcoustID.**

- Si chiude da solo con un messaggio di errore quando la configurazione è finita.

  ![Configurazione](../images/setup.png)

Se qualcosa di incollato non va bene, WerZatSong lo dice e lo richiede, quindi un errore di battitura non costringe a rifare la configurazione. Indica anche l'opzione che permette di farne a meno, per quello che si preferisce impostare più avanti. Il link del webhook viene salvato solo dopo che WerZatSong ci ha pubblicato un messaggio di benvenuto, e la chiave di Audiotag solo dopo che Audiotag l'ha accettata.

### Configurare il database di Audfprint

Dopo il primo avvio, mettere le cartelle scaricate con i file PKLZ dentro la cartella `database` appena creata. Questo passaggio è necessario per la modalità di ricerca Audfprint. Per tenerle da un'altra parte, per esempio su un altro disco, scrivere quella cartella come `DATABASE_FOLDER` in `utils/consts.js` (per esempio `'D:/pklz'`, `'/Volumes/Disco/pklz'` o `'~/pklz'`):

  ![Database](../images/database.png)

## Come usare WerZatSong

1. **Preparare i file MP3**

    - Mettere i file MP3 da identificare nella cartella `input` (creata automaticamente dopo la configurazione).

    - C'è un limite di **30 file MP3 per esecuzione,** quindi è meglio non metterne di più.

    - Evitare i file MP3 troppo corti (sotto i 5 secondi), perché potrebbero non essere elaborati correttamente.

    - Evitare nomi di file con caratteri unicode rari o speciali, per prevenire possibili errori.

2. **Avviare WerZatSong**

    - Usare questo comando nel terminale con la modalità o le modalità scelte. Per esempio, per usarle tutte:

        ```bash
        node werzatsong.js --audfprint --audiotag --musicbrainz --shazam
        ```

### Opzioni generali

- **`--audfprint`** → Attiva la modalità di ricerca Audfprint.

- **`--audiotag`** → Attiva la modalità di ricerca Audiotag.

- **`--musicbrainz`** → Attiva la modalità di ricerca MusicBrainz (AcoustID).

- **`--shazam`** → Attiva la modalità di ricerca Shazam.

- **`--trim <secondi>`** → Accorcia i file MP3 alla durata indicata (ad esempio `--trim 60` per 60 secondi). Dovrebbe velocizzare le cose quando si identificano file lunghi [**predefinito:** nessun taglio].

- **`--language <lingua>`** → La lingua di tutto quello che WerZatSong mostra e scrive (vedere *"Lingue"* più sotto) [**predefinito:** inglese].

- **`--no-discord`** → Non pubblica niente su Discord in questa esecuzione, anche se il file `.env` ha un webhook, e non lo chiede. I risultati vengono salvati lo stesso come sempre in `logs`.

  Per tenere solo alcuni messaggi, aggiungere `keep-match` (solo i messaggi di corrispondenza trovata) o `keep-nomatch` (solo quelli di nessuna corrispondenza trovata): in quel caso serve il webhook, e l'avviso sui file del database che non si sono potuti cercare viene inviato comunque. Scrivere invece `--no-discord all` equivale a scrivere `--no-discord` da solo.

- **`--no-prompt`** → Non si ferma mai a chiedere niente all'utente. Principalmente pensato per le esecuzioni che nessuno segue, come script o esecuzioni programmate (vedere *"Eseguire senza webhook o senza una chiave API"* più sotto).

### Eseguire senza webhook o senza una chiave API

WerZatSong chiede il webhook di Discord a ogni esecuzione che non ce l'ha, a meno che ci sia `--no-discord` (da solo o con `all`), e una chiave API solo quando la sua modalità è nel comando: una ricerca con solo `--audfprint` o `--shazam` non chiede mai la chiave di Audiotag o di AcoustID. Per cercare senza una chiave, basta togliere la sua modalità dal comando.

`--no-prompt` serve per le esecuzioni in cui nessuno può rispondere. WerZatSong usa quello che c'è nel file `.env` e non chiede niente:

- **Nessun webhook di Discord** → non viene pubblicato niente su Discord, e WerZatSong lo dice all'avvio. I risultati vengono comunque salvati in `logs`.

- **Nessuna chiave API di Audiotag o di AcoustID** → quella modalità non viene eseguita e WerZatSong lo segnala, mentre le altre modalità funzionano come al solito. Se non resta nessuna delle modalità scelte, si ferma.

Per esempio, con un file `.env` vuoto, questo comando esegue Audfprint e Shazam, salta MusicBrainz e Audiotag e non pubblica niente su Discord:

```bash
node werzatsong.js --audfprint --musicbrainz --audiotag --shazam --no-prompt
```

Per aggiungere il webhook o una chiave più avanti, avviare WerZatSong una volta senza queste opzioni e incollarlo quando viene chiesto, oppure scriverlo direttamente nel file `.env` (`WEBHOOK_URL`, `AUDIOTAG_KEY`, `ACOUSTID_KEY`).

### Lingue

WerZatSong supporta attualmente italiano, inglese, portoghese (brasiliano) e francese. Aggiungere `--language` con uno di questi:

- `Italiano` o `Italian`

- `English`

- `Português` o `Portuguese`

- `Français` o `French`

Maiuscole e accenti non contano, quindi anche `--language portugues` funziona. Per esempio:

```bash
node werzatsong.js --audfprint --language Italiano
```

I messaggi nel terminale, `--help`, le domande della configurazione, i file dei risultati e i messaggi su Discord saranno tutti in quella lingua. Se si chiede una lingua che WerZatSong non ha, lo dice in inglese e continua in inglese.

Per tradurre WerZatSong in un'altra lingua, o per migliorare una traduzione, leggere [**TRANSLATION_GUIDE.md**](../TRANSLATION_GUIDE.md) (in inglese). Un nuovo file di traduzione funzionerà non appena messo nella cartella `localizations`.

## Modalità di ricerca spiegate

### 1. Audfprint

Trova le corrispondenze confrontando i propri file MP3 con un database locale di fingerprint (file PKLZ):

```bash
node werzatsong.js --audfprint
```

#### Opzioni aggiuntive di Audfprint

- **`--folder <sottocartella>`** → Per scegliere una sottocartella specifica dentro la cartella `database`. È utile per cercare solo tra i fingerprint di un certo genere o di una certa fonte invece di passare tutti i fingerprint di tutte le cartelle in una volta, che richiede più tempo (ad esempio `--folder "indie-rock"`). Si scrive il suo percorso rispetto alla cartella `database` (`--folder "generi/indie-rock"`, con `/` o `\`), o solo il suo nome se nel database c'è una sola cartella con quel nome. Maiuscole e minuscole non contano.

- **`--threads <numero>`** → Imposta il numero di thread di elaborazione (ad esempio `--threads 4`) [**massimo:** 16] [**predefinito:** il massimo dei thread disponibili sul computer].

- **`--shifts <numero>`** → Lo `--shifts` di audfprint lato ricerca, da 1 a 8. Più è alto, più la ricerca è affidabile ma lenta (ad esempio `--shifts 2` per una ricerca più veloce) [**predefinito:** 4].

- **`--shard-timeout <minuti>`** → Quanto tempo può richiedere un file del database prima che il suo matcher venga fermato e il file venga segnalato come non riuscito [**predefinito:** 15].

- **`--resume`** → Riprende una ricerca Audfprint che si è fermata a metà (crash, annullamento): vengono cercati solo i file del database che non aveva finito, poi i risultati vengono riportati come al solito.

- **`--merge <sottocartella>`** → Manutenzione del database (avanzato): unisce i file PKLZ di una sottocartella del database (indicata come con `--folder`) in pochi shard grandi, messi accanto a lei in `<sottocartella>__merged`, poi esce (usare `""` per tutta la cartella `database`). `--shard-files <numero>` [**predefinito:** 64] imposta quanti file PKLZ vanno in ogni shard, e `--max-dropped <percentuale>` [**predefinito:** 3] scarta uno shard che perde più di quella quota dei suoi hash. Accanto a ogni shard c'è un piccolo file `.sources.json` che si ricorda da quale file PKLZ viene ogni canzone, così le corrispondenze trovate nello shard mantengono i loro crediti (vedere *"Crediti dei PKLZ"* più sotto). Usare con moderazione e principalmente per PKLZ molto piccoli.

#### Velocità di ricerca di Audfprint

Alcune impostazioni facoltative possono rendere una ricerca Audfprint più veloce o più scrupolosa. Nessuna è necessaria:

- **isal** → `python -m pip install isal` rende il caricamento dei file del database circa tre volte più veloce. WerZatSong lo usa appena è installato; `FAST_INFLATE=off` nel `.env` lo disattiva.

- **`VERIFY_CHECKSUMS=always`** nel `.env` → senza isal, il checksum di un file del database viene verificato la prima volta che viene letto e poi circa una volta al mese, finché il file non cambia. Con questa impostazione ogni file viene verificato a ogni ricerca. Con isal ogni file viene comunque verificato ogni volta.

- **`DISK_PRIORITY=normal`** nel `.env` → Solo su Windows. WerZatSong può ereditare una priorità del disco bassa dal programma che lo avvia, e questo rallenta molto una ricerca; con questa impostazione il database viene letto comunque con priorità normale.

Quando `--audfprint` viene eseguito insieme a `--musicbrainz`, `--audiotag` o `--shazam`, quelle modalità cercano mentre Audfprint legge il database, quindi un'esecuzione dura più o meno quanto la più lenta delle due. Le altre modalità pubblicano i loro risultati man mano, e quelli di Audfprint arrivano dopo. `SEQUENTIAL_MODES=on` nel `.env` esegue invece prima le altre modalità e poi Audfprint. Se un'esecuzione si ferma a metà, `--resume` elenca anche i file che le altre modalità non avevano ancora cercato.

### 2. Audiotag

Usa l'API di Audiotag per cercare corrispondenze nel suo database online:

```bash
node werzatsong.js --audiotag
```

### 3. MusicBrainz (AcoustID)

Usa MusicBrainz (API di AcoustID) per cercare corrispondenze nel suo database online:

```bash
node werzatsong.js --musicbrainz
```

#### Opzioni aggiuntive di MusicBrainz

Queste opzioni aiutano MusicBrainz a trovare corrispondenze cambiando il modo in cui cerca nei file MP3:

- **`--duration <min:max>`**

  - **Cosa fa:** imposta l'intervallo di durata della canzone (in secondi) in cui MusicBrainz cerca le corrispondenze, come `"140:360"` [**predefinito:** `--duration "140:360"`].

  - **Perché usarla:** se la canzone è molto più corta o più lunga, basta regolare l'intervallo in modo che ci rientri. Per esempio, `--duration "30:200"` per le canzoni corte o `--duration "300:600"` per quelle più lunghe.

  - **Limiti:** il minimo è 30 secondi, il massimo è 600 secondi.

- **`--extension <secondi>`**

  - **Cosa fa:** aiuta MusicBrainz a trovare corrispondenze quando l'inizio del file MP3 deve allinearsi meglio [**predefinito:** `--extension 10`].

  - **Perché usarla:** se alla canzone manca l'inizio, per esempio perché parte in ritardo. Provare `--extension 15` se l'inizio sembra spostato di circa 15 secondi.

  - **Limiti:** il massimo è 25 secondi.

### 4. Shazam

Usa l'API ufficiale di Shazam per identificare le canzoni:

```bash
node werzatsong.js --shazam
```

## Dove trovare i risultati

Ogni esecuzione ha una sua cartella dentro **`logs`,** chiamata con la data e l'ora in cui è partita (per esempio `logs/2026-11-25_14-03-51`), e alla fine il terminale indica dov'è. Ogni modalità che trova qualcosa ci scrive un file `.txt` per ogni file MP3: `<nome del file>.audfprint.txt`, `<nome del file>.musicbrainz.txt`, `<nome del file>.audiotag.txt` e `<nome del file>.shazam.txt`.

Le corrispondenze vengono anche pubblicate sul **webhook di Discord,** se l'esecuzione ne ha uno, e quando un file non ha corrispondenze arriva un breve messaggio che lo dice. I risultati pubblicati su Discord sono i più affidabili (i meno soggetti a falsi positivi), mentre i file `.txt` possono contenere anche falsi positivi.

## Formato dei log

I file di MusicBrainz, Audiotag e Shazam sono brevi: MusicBrainz scrive una riga per ogni corrispondenza, con il punteggio e il link della traccia su AcoustID, Audiotag scrive la corrispondenza così come la manda Audiotag, e Shazam scrive la canzone che ha trovato.

I file di Audfprint elencano ogni candidato trovato dalla ricerca, partendo da quelli con più hash allineati. Iniziano con una legenda che spiega il formato, poi ogni voce occupa tre righe:

```
[MOLTO FORTE] 59 allineati / 61 grezzi (96.72%) | x1 | #0 | azureblast-variety-mix-vol-1500.pklz | offset 31.27s
Some Song.mp3 (files/@transmit13/Some Song.mp3)
Crediti: fingerprint di AzureBlast (foglio) | suggerito da S3V3R3DH3AD (foglio)
```

La prima riga descrive la corrispondenza:

- **ETICHETTA** → quanto è probabile la corrispondenza. **MOLTO FORTE,** **FORTE** e **PROBABILE** vengono pubblicate anche su Discord, **AL LIMITE** vale la pena di controllarla a mano, e **NON TROVATA** è sotto ogni soglia ed è elencata solo per completezza.

- **allineati** → gli hash corrispondenti che coincidono nel tempo. È la prova principale: più di 5 o 6 di solito indicano una corrispondenza vera.

- **grezzi** → tutti gli hash che il file cercato e la corrispondenza hanno in comune, allineati o no.

- **cons%** → allineati diviso grezzi. I file che non c'entrano niente restano sotto l'1% circa, quindi anche pochi punti percentuali contano.

- **hits** → quante volte i due file sono risultati allineati.

- **rank** → la posizione della corrispondenza nella prima classifica di Audfprint. È un'informazione utile, non una misura dell'affidabilità.

- **pklz di origine** → il file PKLZ da cui viene la corrispondenza.

- **offset** → dove il file cercato si allinea con la corrispondenza, in secondi (negativo vuol dire che il file cercato inizia prima).

La seconda riga è la canzone trovata, con il percorso che aveva quando ne è stata fatta la fingerprint, e la terza riga riporta i crediti (vedere *"Crediti dei PKLZ"* più sotto).

In ogni lingua la legenda e le parole di ogni voce sono tradotte, ma i campi e il loro ordine restano gli stessi.

## Crediti dei PKLZ

I file PKLZ li fanno persone della community, e anche trovare buone fonti da suggerire richiede tempo. La terza riga di ogni voce di Audfprint dice chi se n'è occupato:

- **fingerprint di** → chi ha fatto il file PKLZ: chi ha rivendicato la fonte sul [foglio Lostwave Fingerprints.](https://docs.google.com/spreadsheets/d/1JtbAJhd78Ji18LMKVmKrRbGEq_Q1zB7SrnIbCXrihxc/edit?usp=sharing) Quando una riga indica più persone che hanno fatto ognuna i propri file, ogni file riceve solo chi l'ha fatto. Quando il foglio non lo dice, può dirlo il nome del file o della sua cartella.

- **forse fingerprint di** → solo un'ipotesi, usata quando non si sa niente di sicuro.

- **suggerito da** → chi ha suggerito la fonte, quando il foglio lo dice con certezza.

- **nessun credito noto per questo pklz** → niente dice chi ha fatto il file o chi ne ha suggerito la fonte.

Quello che non si sa viene omesso, quindi `Crediti: fingerprint di EierkuchenHD (foglio)` vuol dire che non si sa con certezza chi abbia suggerito quella fonte. I file dei risultati contengono anche il link al foglio, così ogni credito si può ricontrollare lì.

Ogni parte finisce con la sua provenienza: `(file dei crediti)`, `(credits-overrides.tsv)`, `(foglio)`, `(wzs.cosine.club)`, `(elenco integrato)`, `(nome del file)`, `(cartella del database)` o `(percorso della canzone)`. Il foglio Lostwave Fingerprints è la fonte principale, usato insieme a ipotesi sperimentali dalle altre, e il file dei crediti di un pacchetto viene prima di tutte.

### File dei crediti

Un pacchetto di file PKLZ può avere un file dei crediti, un piccolo file `.wzsc` accanto ai file PKLZ che dice chi ne ha fatto la fingerprint e chi ne ha suggerito la fonte, per tutto il pacchetto o per singoli file. WerZatSong legge ogni file dei crediti nella cartella `database`, e i loro crediti vengono prima di tutto il resto, `credits-overrides.tsv` compreso. I nomi del pacchetto valgono per ogni file PKLZ nella cartella del file dei crediti e nelle cartelle al suo interno, e ogni file elencato si trova anche dal suo checksum in qualunque punto della cartella `database`, quindi rinominare un file o spostare altrove il file dei crediti non cambia niente. Quello che un file dei crediti non dice, come chi ha suggerito una fonte, viene comunque dal foglio quando lo dice con certezza. Un file dei crediti che non si può leggere viene ignorato con un avviso.

### Aggiornare i crediti

I crediti arrivano insieme a WerZatSong, in `resources/credits/pklz-credits.tsv`. Quel file viene aggiornato con il foglio ogni ora, quindi aggiornando WerZatSong arrivano anche i crediti più recenti. Una ricerca non scarica mai niente; quando mancano dei crediti, WerZatSong lo dice alla fine.

Per avere subito quello che dice il foglio, fare doppio clic su **`update-credits.cmd`** su Windows, oppure eseguire **`sh update-credits.sh`** su Linux e macOS (`npm run credits:update` funziona ovunque). Legge il foglio, cerca per nome i file PKLZ della cartella `database` (un file PKLZ viene letto solo per confrontarlo con il checksum di un file dei crediti) e completa i crediti mancanti nei file dei risultati già presenti in `logs`, in qualunque lingua siano scritti. I nomi già presenti non vengono mai cambiati. Se il foglio non è raggiungibile, lo dice e non cambia niente. `-- --save <file>` salva una copia del foglio, e `-- --logs <cartella>` o `-- --database <cartella>` usano altre cartelle.

Per correggere o aggiungere un credito solo su un computer, creare **`credits-overrides.tsv`** nella cartella di WerZatSong, con una riga per ogni file PKLZ: il suo nome, poi chi ne ha fatto la fingerprint, chi l'ha rivendicato e chi l'ha suggerito, separati da tabulazioni (più nomi separati da `, `). Queste righe hanno la precedenza su tutto tranne i file dei crediti, foglio compreso.

Per aggiungere crediti per tutti, compilare il foglio: le colonne claimed by, suggested by e PKLZ filename sono tutto quello che serve a WerZatSong.

### Quando il foglio cambia

- **Una riga nuova** → viene aggiunta.

- **Una riga modificata** → quello che dice ora sostituisce quello che diceva prima. Una cella svuotata tiene il nome che aveva.

- **Una riga eliminata** → resta conosciuta. Ogni riga che il foglio abbia mai avuto viene tenuta nel file dei crediti, quindi una riga tolta dal foglio, per sbaglio o no, non si porta via nessun credito.

- **Righe, schede o colonne spostate** → non cambia niente. Una riga viene riconosciuta da ciò di cui parla (l'ID del suo canale YouTube, altrimenti il suo URL, titolo, intervallo di ID o tag, e il tipo di scheda in cui si trova), non da dove si trova, e le colonne vengono trovate dalle loro intestazioni.

- **Il foglio svuotato o eliminato** → non si perde niente, per lo stesso motivo.

- **Il foglio che all'improvviso indica qualcun altro per tante fonti tutte insieme** (più del 5% delle sue righe, o più di 200 se sono di più), come farebbe un foglio danneggiato o vandalizzato → non viene cambiato niente, e l'aggiornamento spiega perché. Se le modifiche sono giuste, eseguirlo di nuovo con `--force` (`npm run credits:update -- --force`).

### Tenere aggiornati i crediti

Questi servono a chi mantiene WerZatSong. Funzionano anche con `--language`.

- **`.github/workflows/update-credits.yml`** → ogni ora GitHub legge il foglio, esegue `npm run credits:build` e fa il commit di `resources/credits/pklz-credits.tsv` quando qualcosa è cambiato. Se il foglio non si può scaricare, l'esecuzione finisce con un avviso e non cambia niente. Se il foglio indica qualcun altro per tante fonti tutte insieme, l'esecuzione fallisce; quando quelle modifiche sono giuste, avviare il workflow a mano dalla scheda **Actions** con *force* spuntato.

- **`npm run credits:build`** → la stessa cosa a mano. Cerca di nuovo ogni file PKLZ del file dei crediti e non toglie mai niente. `-- --sheet <file o link>` legge una copia scaricata del foglio (`.xlsx`, la sua esportazione HTML o file `.csv`) o un altro link. `-- --fresh --list <file> --list <file>` ricostruisce il file da elenchi di file PKLZ (filetree di cartelle del database o un percorso per riga, dal più recente), che devono includere il contenuto degli archivi da cui arrivano alcuni file, come i lotti Reverbnation. `--report <file>` scrive anche da dove viene ogni credito. Termina con il codice di uscita 3 quando il foglio non si può scaricare.

- **`npm run credits:report -- --database <cartella>`** → elenca i crediti che riceverebbe ogni file PKLZ di una cartella, e come è stato trovato ognuno. `--tree <file>` prende invece i nomi da un elenco, e `--logs <cartella>` passa in rassegna i file dei risultati precedenti.

Il link del foglio è `CREDITS_SHEET` all'inizio di `utils/credits.js`. Il foglio viene solo letto, quindi deve restare condiviso con "Chiunque abbia il link" come visualizzatore. Le regole sui nomi sono in `utils/creditsRules.js`: `PEOPLE` contiene il nome che i crediti mostrano per ogni nickname, `FAMILIES` i gruppi di cui si sa chi li ha fatti (aggiungere lì un gruppo quando qualcuno dice che è suo), `SHEET_MAKERS` i nomi del foglio i cui file PKLZ sono fatti tutti dalle stesse persone, chiunque abbia rivendicato le loro righe, `NAMING_STYLES` gli stili di nome dei file che usa una sola persona, `NAMED_MAKERS` i modi di chiamare i file PKLZ che dicono chi li ha fatti, `PATH_MAKERS` i percorsi delle canzoni salvati nei file che dicono chi ha fatto un file PKLZ, `OWN_FOLDERS` le cartelle i cui file PKLZ sono fatti tutti da una sola persona, e `FOLDER_FAMILIES` le cartelle che contengono i file PKLZ di una sola persona, che danno sempre e solo *forse.*

## Crediti di sviluppo

Sviluppato da **Nel** con contributi di **Numerophobe,** **AzureBlast,** **Mystic65,** **EierkuchenHD** e **some random account.**

Traduzione in italiano a cura di **some random account.**
