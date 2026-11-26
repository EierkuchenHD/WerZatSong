This adds:
1) languages;
2) PKLZ credits on every Audfprint result, each saying where it comes from, and credit files that packages of PKLZ files can come with;
3) a GitHub workflow that keeps those credits up to date by itself;
4) the possibility to start WerZatSong without inserting both API keys and/or the Discord webhook (--no-prompt and --no-discord all/keep-match/keep-nomatch);
5) a lot of misc bugfixes and changes.

## Languages

- New `--language` option backported from WerZatSonGUI, working in essentially the same way. WerZatSong supports English (still the default), Italian, Portuguese (Brazilian) and French. `Italiano`/`Italian`, `Português`/`Portuguese` and `Français`/`French` all work, and capital letters and accents don't matter.

- Everything is translated, not just the main messages: `--help`, the setup questions, the result files (legend, labels, summary), the Discord messages, the progress line, the "already running" line, the merge, resume, tools and memory messages, the credits commands and the messages of the bundled Audfprint.

- The texts are in the `localizations` folder, one file per language. The welcome message credits each translation: Italian by some random account, French by jacktorrance_overlook, Brazilian Portuguese marked as a work in progress.

- A new language is just a new file: a `console_strings_<language>.json` dropped into `localizations` is found on the next run, with the names `--language` accepts listed at the top of the file. Nothing else needs to change, the bundled Audfprint included. `TRANSLATION_GUIDE.md` explains how to add one.

- The README is translated too: `translated_READMEs/README_ITA.md`, `README_FRA.md` and `README_POR.md`, linked from the top of `README.md` and from each other, with the same translation credits. It now also explains where the results are and how the result files are laid out.

- A language WerZatSong doesn't know is reported in English, and the run carries on in English.

- The messages read the same way in every language.

- Two things used to be recognised by reading Audfprint's English messages: a clip too short to fingerprint, and how many hashes a merged shard lost. Since those messages are now translated, Audfprint also writes a hidden result line that WerZatSong reads instead, so both work the same in every language.

## PKLZ Credits

- Every Audfprint result now has a third line saying who fingerprinted the PKLZ file it came from and who suggested its source, in the result files and in the Discord messages:

  ```
  [VERY STRONG] 59 aligned / 61 raw (96.72%) | x1 | #0 | azureblast-variety-mix-vol-1500.pklz | offset 31.27s
  Some Song.mp3 (files/@transmit13/Some Song.mp3)
  Credits: fingerprinted by AzureBlast (sheet) | suggested by S3V3R3DH3AD (sheet)
  ```

- The credits come in one file, `resources/credits/pklz-credits.tsv`: one line for each of the 59,665 PKLZ files known from the database dumps, wzs.cosine.club and Hugging Face, plus the sheet's names for groups of files, its YouTube channels, and a copy of every row of the sheet. Looking a match up is a single look in a table, so it adds nothing to a search.

- The Lostwave Fingerprints sheet comes first: whoever claimed a source there is who fingerprinted it. Names in file and folder names (`azureblast-...`, `sdb-...`, `nel-...`, a `sonolux` folder) and packs whose makers are known (Sonolux's `channelsNNNN`, Rayzox57's `HifidelityPotpourri`, Mystic65's `AudioSparx`, ...) are only used when the sheet has nobody. Only the folders inside `database` count, not the ones WerZatSong itself is in.

- A guess says **possibly fingerprinted by:** a short name next to other words in a file or folder name, a folder known to hold one person's PKLZ files, or a way of naming files that always meant the same people. Guesses are never written into the credits file.

- Only what is certain is shown. A PKLZ file made from many sources gets the people every one of its rows on the sheet names as claimers, and its suggesters only when every row names the same ones. Its file name narrows it down further: `yt-ChannelMix-87-numerophobe-19-8min.pklz` is Numerophobe's, even for a channel claimed by Numerophobe and Sonolux.

- Credits are about each PKLZ file, not only its source. When a row names several people who each made their own files, each file gets only the one who made it, told by the file names on the row, the folder the file is in on wzs.cosine.club or in a pack, a way of naming files only one person uses, or the stored path of the matched song. A channel's row that names other PKLZ files says who suggested the channel, not who made a different file of it. When nothing tells which of them made a file, all of them stay. Credits saved by an earlier version are looked up again with these rules.

- Every part of the line ends with where it comes from: a package's credit file, `credits-overrides.tsv`, the sheet, wzs.cosine.club, the built-in lists, the file name, the database folder or the matched song's stored path, translated like the rest of the line. The result files' legend says that the Lostwave Fingerprints sheet is the main source, used alongside experimental prediction algorithms, and that a package's credit file comes first wherever there is one. The result-file update keeps the sources already written and adds them to what it fills in.

- The two WatZatSong sets are told apart by their names: `WZS<range>.pklz` files are Mystic65's and `Watzatsong-<date>-<n>.pklz` files are Numerophobe's.

- When the matched song's path names its YouTube channel (a channel ID, an `@handle` folder or a `yt-handle` folder, though not the downloader's own `yt-dlp` folder) and that channel's row on the sheet is about the same PKLZ file, the row says who suggested the song's source. A channel's claimers only narrow down who made the file, and say who made it only when nothing else does and the row is about that file.

- Whatever nobody is known for is left out of the line: `Credits: fingerprinted by EierkuchenHD (sheet)`.

- A copy the database's rename script called `name_1.pklz` gets the credits of `name.pklz` when every known file of that name agrees. Names that are only a few letters apart are never matched otherwise.

- A PKLZ file named with numbers only (`1.pklz`, `10_5.pklz`) is credited by the folder it is in, never by its name, since many collections number their files and the rename script's `_5` only says which copy it came to first. Without a folder that says whose it is, it gets no credits.

- A search never downloads the sheet. When some credits are unknown, it says to run `update-credits.cmd` on Windows or `sh update-credits.sh` on Linux and macOS (`npm run credits:update` anywhere). That downloads the sheet, only ever reading it, looks the PKLZ files of the database up in it, and fills in the credits nobody knew in the result files already in `logs`, leaving every name already there alone. When it fails, it says so plainly and changes nothing.

- The result files (not the Discord messages) point to the Lostwave Fingerprints sheet, to double-check credits there.

- `credits-overrides.tsv` lets anyone fix a credit on their own computer, and `.gitignore` keeps it out of commits. It wins over everything, the sheet included.

- `--merge` keeps a small `.sources.json` next to each shard with the PKLZ file every song came from, so matches from merged shards keep their credits, also when the database was merged on another system.

## Credit Files

- A package of PKLZ files can come with a credit file, a small `.wzsc` JSON file next to its PKLZ files that says who fingerprinted them and who suggested their source, for the whole package or file by file. Its credits come before every other source, `credits-overrides.tsv` included.

- A listed file is found by its name and size in the credit file's folder and the folders inside it, then by its size and SHA-256 anywhere in the database, so a renamed file or a credit file in another folder still gives the right credits. Only a PKLZ file with the same size as a listed one is ever hashed. The package's names also cover the files it doesn't list, in its own folders only.

- What a credit file doesn't say comes from the other sources, and a suggester from the sheet only when the sheet says it for sure. A credit file that can't be read is skipped with a warning.

## When the Sheet Changes

- A new row is added, and an edited row counts as it is now. A cell that was emptied keeps the name it had.

- A deleted row is still known: every row the sheet has ever had is kept in the credits file, so neither a mistake nor an emptied sheet can take credits away.

- Moving rows, tabs or columns around changes nothing.

- When the sheet suddenly names someone else for a lot of sources at once (more than 5% of its rows, or more than 200), as a damaged or vandalized sheet would, nothing is changed and the update says why. `--force` applies it anyway.

## Hourly Credits Update

- `.github/workflows/update-credits.yml` downloads the sheet once an hour, runs `npm run credits:build` and commits the credits file only when something changed, so every download of WerZatSong has the newest credits.

- When the sheet can't be downloaded, the run ends with a warning and nothing changes. When the sheet names someone else for a lot of sources at once, the run fails and nothing changes; if those changes are right, the workflow can be started by hand from the **Actions** tab with *force* ticked.

- New maintainer commands: `npm run credits:build` does the same by hand, and `npm run credits:report` lists the credits the PKLZ files of a database folder would get. Both are explained in the README.

## Discord Messages

- Another backport from the GUI: file names are sent as inline code with any backticks taken out, so a file name with backticks in it can't break the rest of the message.

- Everything else outside the results has Discord's formatting characters escaped (`*`, `_`, `~`, `|`, `` ` ``, `#`, `>` and the rest), so it shows up exactly as written.

## First-Time Setup

- Another backport from the GUI: wrong webhook URL or API key is asked for again instead of ending the run. The webhook URL is only saved once the welcome message has really been posted with it, and the Audiotag key once Audiotag has accepted it.

- Webhook URLs from discordapp.com, from the PTB and Canary apps, with an API version (`/api/v10/...`) or with `?thread_id=` at the end are accepted.

- Quotes around a pasted value are taken off, answers pasted all at once are used one question at a time, and when the console has nothing more to give, the setup stops with a clear message instead of asking forever.

## Running Without a Webhook or an API Key

- The Discord webhook and the Audiotag and AcoustID API keys are no longer all required. An API key is only asked for when its mode is in the command, as before, so a search without a key just leaves its mode out.

- `--no-discord` posts nothing on Discord for that run, even when `.env` has a webhook, and doesn't ask for one. The results are saved in `logs` as usual. `--no-discord keep-match` still sends the "match found" messages, and `--no-discord keep-nomatch` the "no match found" ones, along with the note about database files that couldn't be searched. `--no-discord all` is the same as `--no-discord` alone.

- `--no-prompt` is for runs nobody is watching, like scripts or scheduled runs: WerZatSong never stops to ask for anything and uses what `.env` has. Without a webhook nothing is posted on Discord, and a mode without its API key doesn't run, with a warning, while the other modes run as usual.

- Like the other options, both can go anywhere in the command. When WerZatSong asks for the webhook or a key, it also says how to do without it, and when it skips one, it says how to add it later.

- `.env` is read from WerZatSong's own folder, where the setup writes it, wherever WerZatSong is started from. A `.env` without `NODE_COMMAND`, `PYTHON_COMMAND` or `FFMPEG_COMMAND` uses the ones in `.env.example`, and `python3` is used when `python` isn't there, as on macOS and many Linux systems.

## The Database Folder and `--folder`

- `DATABASE_FOLDER` in `utils/consts.js` is now a plain folder: WerZatSong's own `database`, a full path such as `D:/pklz` or `/Volumes/Drive/pklz`, or `~/pklz`. A path that isn't a full one is taken from WerZatSong's folder, wherever WerZatSong is started from. Before, a full path there was glued onto WerZatSong's folder and pointed nowhere.

- A database folder set there that doesn't exist, like one on a drive that isn't connected, is said plainly when Audfprint mode starts. It is no longer created on the system disk, and modes that don't need it run as usual.

- `--folder` takes the path of a folder inside the database (`genres/indie-rock`, with `/` or `\`, with or without the database folder's own name in front, or the full path), or just its name when only one folder in the database has it. Upper and lower case don't matter on any system. When several folders have that name, WerZatSong lists them; a path outside the database, or a folder that isn't there, is said with the database folder it looked in.

- The PKLZ files are listed the same way everywhere: sorted, `.PKLZ` counted too, folders and files linked into the database followed (each real folder once), and a folder that can't be read (a drive's system folders, no permission) skipped with a warning instead of stopping the search.

- `--merge` finds its folder the same way and puts the shards next to it (`genres/indie-rock__merged`), so `--folder` finds them. Every message names the real folder instead of `database/`.

## Other Fixes

- MusicBrainz mode works when WerZatSong's folder has a space in its path, on every system.

- The welcome line and `--version` now say v3.1.1, the current version, instead of v1.0.0.

## After Merging

1. Open the **Actions** tab, click **Update credits,** then **Run workflow,** once, to check it works. After that it runs every hour by itself.

2. Only if that run fails with a permission error: **Settings > Actions > General > Workflow permissions,** choose **Read and write permissions** and save.

GitHub pauses hourly workflows when a repository has no activity for 60 days; it can be switched back on from the **Actions** tab.
