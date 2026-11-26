# WerZatSong

WerZatSong is a tool that helps figure out song names from audio files. It provides different search modes to find matches: **Audfprint, Audiotag, MusicBrainz (AcoustID) and Shazam.** A single mode can run on its own, or several can be combined. If multiple modes are selected, they run in the following order of priority:

1. **MusicBrainz** (AcoustID)

2. **Audiotag**

3. **Shazam**

4. **Audfprint**

This document is a simple step-by-step guide to installing, setting up and using WerZatSong.

> **Per chi parla italiano:** una traduzione completa di questo documento è disponibile in [**README_ITA.md.**](translated_READMEs/README_ITA.md)

> **Pour les francophones:** une traduction intégrale de ce document est disponible dans [**README_FRA.md.**](translated_READMEs/README_FRA.md)

> **Para quem fala português:** uma tradução completa deste documento está disponível em [**README_POR.md.**](translated_READMEs/README_POR.md)

## Requirements and Installation

Before starting, these programs need to be installed:

### System Requirements

- [**Node.js**](https://nodejs.org) (v20.0 or higher) → Add it to PATH and check it in the terminal with `node -v` and `npm -v`.

- [**Python**](https://www.python.org/downloads) (v3.13 or higher) → Add it to PATH and check it in the terminal with `python --version` and `pip --version`. On macOS and Linux they're often called `python3` and `pip3`: use those in the commands below (WerZatSong finds `python3` by itself).

- [**FFmpeg**](https://www.gyan.dev/ffmpeg/builds) → Add it to PATH and check it in the terminal with `ffmpeg -version`.

  ![Programs](images/programs.png)

### Program Requirements

To use WerZatSong at its best, these are needed too:

- **Discord Webhook URL** → For receiving match notifications (see *"How to Get a Discord Webhook URL"* below).

- **Audiotag API key** → Required for the Audiotag search mode (see *"How to Get an Audiotag API Key"* below).

- **AcoustID API key** → Required for the MusicBrainz search mode (see *"How to Get an AcoustID API Key"* below).

- **Database for Audfprint** → Required for the Audfprint search mode (see *"Download the Audfprint Database"* below).

  - **Storage alert** → The database takes a lot of disk space. An **SSD** is recommended for better performance.

WerZatSong only asks for an API key when its mode is in the command, and the webhook and both keys can be left out (see *"Running Without a Webhook or an API Key"* below).

#### How to Get a Discord Webhook URL

1. Open Discord and create a server (if there isn't one already).

2. In the **#general** text channel, click the gear icon (**Edit Channel**).

3. Go to **Integrations** → **Webhooks.**

4. Click **Create Webhook,** then open it and select **Copy Webhook URL.**

5. Keep it aside for now, it's needed soon.

#### How to Get an Audiotag API Key

1. Go to the [Audiotag](https://audiotag.info) website.

2. Create a new account, or log in to an existing one.

3. Go to the [**User Section**](https://user.audiotag.info) and click the **API keys** tab.

4. Click the **Create new API key** button, copy the key and keep it aside for now.

#### How to Get an AcoustID API Key

1. Go to the [AcoustID](https://acoustid.org) website.

2. Create a new account, or log in to an existing one.

3. In [**My Applications,**](https://acoustid.org/my-applications) click the **Register a new application** button.

4. Fill in the fields with basic info (it can be random) and click **Register.**

5. Copy the application's **API key** that appears and keep it aside for now.

#### Download the Audfprint Database

- Download the **database folders** that contain the **PKLZ files** created by the community from [**here.**](https://wzs.cosine.club)

### Program Installation

1. **Download WerZatSong:**

   - Go to the repository, click **<> Code** → **Download ZIP.**

   - Unzip the file to any folder.

   - A folder called `WerZatSong-main` should now be there.

2. **Navigate to the folder:**

   - Go to the unzipped folder with the `cd` command in the terminal:

     ```bash
     cd WerZatSong-main
     ```

3. **Run this command to install the Node.js dependencies:**

    ```bash
    npm install
    ```

4. **Run these commands one by one to install the Python dependencies:**

    ```bash
    pip install -r requirements.txt
    pip install audioop-lts
    pip install shazamio
    ```

    - **Note:** if an error appears while installing these dependencies, something else may be missing. Here are two common issues and how to solve them:

        - **Rust error** (see the screenshot below):

            - Install Rust from [the official website.](https://www.rust-lang.org/tools/install)

            - After installation, check that it works by running `rustc --version` in the terminal.

            - Once Rust is installed, retry the `pip install` commands above.

            ![Rust Error](images/rust-error.png)

        - **C++ Build Tools error** (see the screenshot below):

            - Install the Build Tools for Visual Studio 2017 or later from [the official website.](https://visualstudio.microsoft.com/thank-you-downloading-visual-studio/?sku=BuildTools&rel=16)

            - During installation, select the *"Desktop development with C++"* workload (the C++ tools).

            - After installation, restart the computer.

            - Retry the `pip install` commands above.

            ![Shazam Error](images/shazam-error.png)

Done! WerZatSong is now ready to be set up.

## Initial Setup

### Set Up WerZatSong for the First Time

In the terminal, run the following command:
```bash
node werzatsong.js --audiotag --musicbrainz
```

On the **first run,** this command:

- Creates all the necessary folders automatically.

- Asks for the **Discord Webhook URL, the Audiotag API key and the AcoustID API key.**

- Exits by itself with an error message once the setup is complete.

  ![Setup](images/setup.png)

If something pasted isn't right, WerZatSong says so and asks again, so a typo doesn't mean starting the setup over. It also names the option that runs without it, for anything better left for later. The webhook URL is saved only after WerZatSong has posted a welcome message with it, and the Audiotag key only after Audiotag has accepted it.

### Set Up the Audfprint Database

After the first run, place the downloaded folders containing the PKLZ files inside the newly created `database` folder. This step is required for the Audfprint search mode. To keep them somewhere else, like another drive, write that folder as `DATABASE_FOLDER` in `utils/consts.js` (for example `'D:/pklz'`, `'/Volumes/Drive/pklz'` or `'~/pklz'`):

  ![Database](images/database.png)

## How to Use WerZatSong

1. **Prepare the MP3 files**

    - Put the MP3 files to identify in the `input` folder (created automatically after the setup).

    - There is a limit of **30 MP3 files per run,** so avoid adding more than that.

    - Avoid MP3 files that are too short (under 5 seconds), as they may not be processed correctly.

    - Avoid file names with rare unicode or special characters, to prevent possible errors.

2. **Run WerZatSong**

    - Use this command in the terminal with the chosen mode or modes. For example, to use all of them:

        ```bash
        node werzatsong.js --audfprint --audiotag --musicbrainz --shazam
        ```

### General Options

- **`--audfprint`** → Enables the Audfprint search mode.

- **`--audiotag`** → Enables the Audiotag search mode.

- **`--musicbrainz`** → Enables the MusicBrainz (AcoustID) search mode.

- **`--shazam`** → Enables the Shazam search mode.

- **`--trim <seconds>`** → Shortens the MP3 files to the given length (e.g., `--trim 60` for 60 seconds). This should speed things up when identifying long files [**default:** no trim].

- **`--language <language>`** → The language of everything WerZatSong shows and writes (see *"Languages"* below) [**default:** English].

- **`--no-discord`** → Posts nothing on Discord for this run, even when `.env` has a webhook, and doesn't ask for one. The results are still saved in `logs` as usual.

  To keep only some messages, add `keep-match` (only the "match found" messages) or `keep-nomatch` (only the "no match found" messages): the webhook is needed then, and the note about database files that couldn't be searched is still sent. Writing `--no-discord all` is the same as writing `--no-discord` alone.

- **`--no-prompt`** → Never stops to ask the user for anything. Mainly meant for runs nobody is watching, like scripts or scheduled runs (see *"Running Without a Webhook or an API Key"* below).

### Running Without a Webhook or an API Key

WerZatSong asks for the Discord webhook on every run that doesn't have one, unless `--no-discord` is there (alone or with `all`), and for an API key only when its mode is in the command: a search with only `--audfprint` or `--shazam` never asks for the Audiotag or AcoustID key. To search without a key, leave its mode out of the command.

`--no-prompt` is for runs where nobody can answer. WerZatSong uses what `.env` has and asks for nothing:

- **No Discord webhook** → nothing is posted on Discord, and WerZatSong says so when it starts. The results are still saved in `logs`.

- **No Audiotag or AcoustID API key** → that mode doesn't run and WerZatSong warns about it, while the other modes run as usual. If none of the chosen modes is left, it stops.

For example, with an empty `.env`, this runs Audfprint and Shazam, skips MusicBrainz and Audiotag, and posts nothing on Discord:

```bash
node werzatsong.js --audfprint --musicbrainz --audiotag --shazam --no-prompt
```

To add the webhook or a key later, run WerZatSong once without these options and paste it when asked, or write it in `.env` directly (`WEBHOOK_URL`, `AUDIOTAG_KEY`, `ACOUSTID_KEY`).

### Languages

WerZatSong currently supports English, Italian, Portuguese (Brazilian) and French. Add `--language` with one of these:

- `English`

- `Italiano` or `Italian`

- `Português` or `Portuguese`

- `Français` or `French`

Capital letters and accents don't matter, so `--language portugues` works too. For example:

```bash
node werzatsong.js --audfprint --language Italiano
```

The terminal messages, `--help`, the setup questions, the result files and the Discord messages are all in that language. If a language WerZatSong doesn't have is asked for, it says so in English and carries on in English.

To translate WerZatSong into another language, or to improve a translation, see [**TRANSLATION_GUIDE.md.**](TRANSLATION_GUIDE.md) A new translation file works as soon as it's put in the `localizations` folder.

## Search Modes Explained

### 1. Audfprint

Finds matches by comparing the MP3 files to a local database of fingerprints (PKLZ files):

```bash
node werzatsong.js --audfprint
```

#### Additional Audfprint Options

- **`--folder <subfolder>`** → Selects a specific subfolder inside the `database` folder. Useful for searching only the fingerprints of a certain genre or source, instead of processing all the fingerprints of all the folders at once, which takes longer (e.g., `--folder "indie-rock"`). Its path is written relative to the `database` folder (`--folder "genres/indie-rock"`, with `/` or `\`), or just its name when only one folder in the database has it. Upper and lower case don't matter.

- **`--threads <number>`** → Sets the number of processing threads (e.g., `--threads 4`) [**max:** 16] [**default:** the most threads available on the computer].

- **`--shifts <number>`** → The query-side audfprint `--shifts`, from 1 to 8. Higher is more robust but slower (e.g., `--shifts 2` for a quicker search) [**default:** 4].

- **`--shard-timeout <minutes>`** → How long one database file may take before its matcher is stopped and the file is reported as failed [**default:** 15].

- **`--resume`** → Continues an Audfprint search that stopped part-way (crash, cancel): only the database files it had not finished are searched, then the results are reported as usual.

- **`--merge <subfolder>`** → Database maintenance (advanced): merges the PKLZ files of a subfolder of the database (named as with `--folder`) into a few large shards, put next to it in `<subfolder>__merged`, then exits (use `""` for the whole `database` folder). `--shard-files <number>` [**default:** 64] sets how many PKLZ files go into each shard, and `--max-dropped <percent>` [**default:** 3] throws away a shard that loses more than that share of its hashes. Each shard gets a small `.sources.json` file next to it that remembers which PKLZ file each song came from, so matches from the shard keep their credits (see *"PKLZ Credits"* below). Use sparingly, and mainly for very small PKLZ files.

#### Audfprint Search Speed

A few optional settings can make an Audfprint search faster or more thorough. None of them is needed:

- **isal** → `python -m pip install isal` makes loading database files about three times faster. WerZatSong uses it as soon as it's installed; `FAST_INFLATE=off` in `.env` turns it off.

- **`VERIFY_CHECKSUMS=always`** in `.env` → without isal, the checksum of a database file is checked the first time it's read and about once a month after that, as long as the file doesn't change. This setting checks every file on every search. With isal, every file is checked every time anyway.

- **`DISK_PRIORITY=normal`** in `.env` → Windows only. WerZatSong can inherit a low disk priority from the program that starts it, which slows a search down a lot; this setting reads the database at normal priority anyway.

When `--audfprint` runs together with `--musicbrainz`, `--audiotag` or `--shazam`, those modes search while Audfprint reads the database, so a run takes about as long as the slower of the two. They post their results as they go, and the Audfprint results come after them. `SEQUENTIAL_MODES=on` in `.env` runs the other modes first and Audfprint after them instead. If a run stops part-way, `--resume` also lists the files the other modes hadn't searched yet.

### 2. Audiotag

Uses the Audiotag API to search for matches in its online database:

```bash
node werzatsong.js --audiotag
```

### 3. MusicBrainz (AcoustID)

Uses MusicBrainz (AcoustID API) to search for matches in its online database:

```bash
node werzatsong.js --musicbrainz
```

#### Additional MusicBrainz Options

These options help MusicBrainz find matches by changing how it searches the MP3 files:

- **`--duration <min:max>`**

  - **What it does:** sets the song duration range (in seconds) in which MusicBrainz looks for matches, like `"140:360"` [**default:** `--duration "140:360"`].

  - **Why use it:** if the song is much shorter or longer, adjust it so the song fits. For example, `--duration "30:200"` for short songs or `--duration "300:600"` for longer ones.

  - **Limits:** the minimum is 30 seconds, the maximum is 600 seconds.

- **`--extension <seconds>`**

  - **What it does:** helps MusicBrainz find matches when the start of the MP3 file needs to line up better [**default:** `--extension 10`].

  - **Why use it:** if the song is missing its beginning, for example because it starts late. Try `--extension 15` if the beginning seems off by about 15 seconds.

  - **Limits:** the maximum is 25 seconds.

### 4. Shazam

Uses the official Shazam API to identify songs:

```bash
node werzatsong.js --shazam
```

## Where to Find the Results

Each run gets its own folder inside **`logs`,** named after the date and time it started (for example `logs/2026-11-25_14-03-51`), and the terminal shows where it is when the run ends. Every mode that finds something writes one `.txt` file per MP3 file there: `<file name>.audfprint.txt`, `<file name>.musicbrainz.txt`, `<file name>.audiotag.txt` and `<file name>.shazam.txt`.

Matches are also posted to the **Discord Webhook,** if the run has one, and a short message says so when a file has no match. The results posted on Discord are the most reliable ones (the least likely to be false positives), while the `.txt` files can contain false positives too.

## Log Format

MusicBrainz, Audiotag and Shazam files are short: MusicBrainz writes one line per match, with its score and the AcoustID track link, Audiotag writes the match as Audiotag sends it, and Shazam writes the song it found.

Audfprint files list every candidate the search found, the ones with the most aligned hashes first. They start with a legend explaining the format, then each entry takes three lines:

```
[VERY STRONG] 59 aligned / 61 raw (96.72%) | x1 | #0 | azureblast-variety-mix-vol-1500.pklz | offset 31.27s
Some Song.mp3 (files/@transmit13/Some Song.mp3)
Credits: fingerprinted by AzureBlast (sheet) | suggested by S3V3R3DH3AD (sheet)
```

The first line describes the match:

- **LABEL** → how likely the match is. **VERY STRONG,** **STRONG** and **PROBABLE** are posted on Discord too, **BORDERLINE** is worth checking by hand, and **NO MATCH** is below every threshold and only listed for completeness.

- **aligned** → the matching hashes that line up in time. This is the main evidence: more than 5 or 6 usually means a real match.

- **raw** → all the hashes the searched file and the match have in common, lined up or not.

- **cons%** → aligned divided by raw. Unrelated files stay under about 1%, so even a few percent means something.

- **hits** → how many times the two files were found to line up.

- **rank** → where the match came in Audfprint's first ranking. It's useful context, not a measure of confidence.

- **source pklz** → the PKLZ file the match came from.

- **offset** → where the searched file lines up with the match, in seconds (negative means the searched file starts earlier).

The second line is the matched song, with the path it had when it was fingerprinted, and the third line gives the credits (see *"PKLZ Credits"* below).

In every language, the legend and the words in each entry are translated, but the fields and their order stay the same.

## PKLZ Credits

PKLZ files are made by people from the community, and finding good sources to suggest takes time too. The third line of every Audfprint entry says who did it:

- **fingerprinted by** → who made the PKLZ file: whoever claimed the source on the [Lostwave Fingerprints sheet.](https://docs.google.com/spreadsheets/d/1JtbAJhd78Ji18LMKVmKrRbGEq_Q1zB7SrnIbCXrihxc/edit?usp=sharing) When a row names several people who each made their own files, each file only gets the one who made it. When the sheet doesn't say, the name of the file or of its folder can tell.

- **possibly fingerprinted by** → only a guess, used when nothing sure is known.

- **suggested by** → who suggested the source, when the sheet says it for sure.

- **no credits known for this pklz** → nothing says who made the file or who suggested its source.

Whatever nobody is known for is left out, so `Credits: fingerprinted by EierkuchenHD (sheet)` means it isn't known for sure who suggested that source. The result files also link to the sheet, so any credit can be double-checked there.

Each part ends with where it comes from: `(credit file)`, `(credits-overrides.tsv)`, `(sheet)`, `(wzs.cosine.club)`, `(built-in list)`, `(file name)`, `(database folder)` or `(song path)`. The Lostwave Fingerprints sheet is the main source, used alongside experimental guesses from the others, and a package's credit file comes before all of them.

### Credit Files

A package of PKLZ files can come with a credit file, a small `.wzsc` file next to the PKLZ files that says who fingerprinted them and who suggested their source, for the whole package or for single files. WerZatSong reads every credit file in the `database` folder, and their credits come before everything else, `credits-overrides.tsv` included. The package's names cover every PKLZ file in the credit file's folder and in the folders inside it, and each listed file is also found by its checksum anywhere in the `database` folder, so renaming a file or moving the credit file elsewhere changes nothing. Whatever a credit file doesn't say, such as who suggested a source, still comes from the sheet when it says it for sure. A credit file that can't be read is skipped with a warning.

### Updating the Credits

The credits come with WerZatSong, in `resources/credits/pklz-credits.tsv`. That file is brought up to date with the sheet every hour, so updating WerZatSong brings the newest credits too. A search never downloads anything; when some credits are missing, WerZatSong says so at the end.

To get what the sheet says right now, double-click **`update-credits.cmd`** on Windows, or run **`sh update-credits.sh`** on Linux and macOS (`npm run credits:update` works everywhere). It reads the sheet, looks up the PKLZ files in the `database` folder by their names (a PKLZ file is only read to compare it with the checksum in a credit file), and fills in the missing credits in the earlier result files in `logs`, in whatever language they were written. Names already there are never changed. If the sheet can't be reached, it says so and nothing changes. `-- --save <file>` keeps a copy of the sheet, and `-- --logs <folder>` or `-- --database <folder>` use other folders.

To fix or add a credit on one computer only, create **`credits-overrides.tsv`** in the WerZatSong folder, with one line per PKLZ file: its name, then who fingerprinted it, who claimed it and who suggested it, separated by tabs (several names separated by `, `). These lines win over everything except credit files, the sheet included.

To add credits for everyone, fill in the sheet: the claimed by, suggested by and PKLZ filename columns are all WerZatSong needs.

### When the Sheet Changes

- **A new row** → added.

- **An edited row** → what it says now replaces what it said before. A cell that was emptied keeps the name it had.

- **A deleted row** → still known. Every row the sheet has ever had is kept in the credits file, so a row taken off the sheet, by mistake or not, takes no credits with it.

- **Rows, tabs or columns moved around** → nothing changes. A row is known by what it is about (its YouTube channel ID, otherwise its URL, title, ID range or tag, and the kind of tab it is in), not by where it is, and columns are found by their headers.

- **The sheet emptied or deleted** → nothing is lost, for the same reason.

- **The sheet suddenly naming someone else for a lot of sources at once** (more than 5% of its rows, or more than 200 when that's more), the way a damaged or vandalized sheet would → nothing is changed, and the update says why. If the changes are right, run it again with `--force` (`npm run credits:update -- --force`).

### Keeping the Credits Up to Date

These are for whoever maintains WerZatSong. They work with `--language` too.

- **`.github/workflows/update-credits.yml`** → every hour, GitHub reads the sheet, runs `npm run credits:build` and commits `resources/credits/pklz-credits.tsv` when something changed. If the sheet can't be downloaded, the run ends with a warning and nothing changes. If the sheet names someone else for a lot of sources at once, the run fails; when those changes are right, start the workflow by hand from the **Actions** tab with *force* ticked.

- **`npm run credits:build`** → the same by hand. It looks every PKLZ file in the credits file up again and never takes anything out. `-- --sheet <file or link>` reads a downloaded copy of the sheet (`.xlsx`, its HTML export or `.csv` files) or another link. `-- --fresh --list <file> --list <file>` rebuilds the file from lists of PKLZ files (filetrees of database folders or one path per line, newest first), which have to include the contents of the archives some files come in, like the Reverbnation batches. `--report <file>` also writes where every credit came from. It ends with exit code 3 when the sheet can't be downloaded.

- **`npm run credits:report -- --database <folder>`** → lists the credits every PKLZ file in a folder would get, and how each was found. `--tree <file>` reads the names from a list instead, and `--logs <folder>` goes through earlier result files.

The sheet's link is `CREDITS_SHEET` at the top of `utils/credits.js`. It's only ever read, so it has to stay shared with "Anyone with the link" as a viewer. The rules for names are in `utils/creditsRules.js`: `PEOPLE` has the name the credits show for each nickname, `FAMILIES` the packs whose makers are known (add a pack there when someone says it's theirs), `SHEET_MAKERS` the names on the sheet whose PKLZ files are all made by the same people, whoever claimed their rows, `NAMING_STYLES` the file name styles only one person uses, `NAMED_MAKERS` the ways of naming PKLZ files that tell who made them, `PATH_MAKERS` the stored song paths that tell who made a PKLZ file, `OWN_FOLDERS` the folders whose PKLZ files are all made by one person, and `FOLDER_FAMILIES` the folders that hold one person's PKLZ files, which only ever give *possibly.*

## Development Credits

Developed by **Nel** with contributions from **Numerophobe,** **AzureBlast,** **Mystic65,** **EierkuchenHD** and **some random account.**
