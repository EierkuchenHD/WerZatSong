# Adding a New Language to WerZatSong

WerZatSong currently supports English, Italian, French and Portuguese (Brazilian). That's not a limit, just the languages translated so far. This guide shows everything involved in translating WerZatSong into another language. A finished translation can be sent as a pull request (or as an issue with the files attached), and it can then be added for everyone.

WerZatSong's text lives in two places: one file per language in the `localizations` folder, which holds everything the program shows and writes, and the READMEs.

This guide uses **Esperanto** as the example. For another language, write its name the way it's written in that language wherever the guide says `Esperanto`, and use its short code wherever the guide says `eo`. For Spanish, that would be `Español` and `es`.

## 1. The texts (`localizations/console_strings_Esperanto.json`)

Everything WerZatSong shows and writes comes from these files: the terminal messages and their `[INFO]`, `[WARNING]`, ... tags, `--help`, the setup questions, the result files in `logs`, the Discord messages and what the Audfprint engine prints (the keys starting with `py_`). Each file is a list of `"key": "text"` pairs. If a key is missing from a translation, the English text is used, so nothing breaks while a translation is still in progress.

**To add Esperanto:**

1. Copy `console_strings_English.json` and name the copy `console_strings_Esperanto.json`. The part after `console_strings_` is the name of the language.

2. Fill in the three keys at the top:

   - `language_names` → the names `--language` should accept, separated by commas, for example `"Esperanto"` (for Spanish, `"Español, Spanish"`). The name in the file name always works too, and capital letters and accents never matter.

   - `language_code` → a short code made of plain letters, like `eo`. WerZatSong uses it to tell its own programs which language to use, so every language needs a different one.

   - `yargs_locale` → the language of the few words `--help` adds by itself, like *Options.* It's one of the file names in `node_modules/yargs/locales` (there after `npm install`) without `.json`, like `es` or `pt_BR`. If the language isn't there, write the same code as `language_code`: those few words will stay in English.

3. Translate every other value.

That's it: the next time WerZatSong runs, it finds the file, and `--language Esperanto` works.

### What to keep as it is

- **Placeholders** like `{count}` or `{file}` are filled in while WerZatSong runs. Keep them exactly as they are, brackets and spelling included, or that part of the text won't be filled in. They can be moved around in the sentence.

- **Line breaks** (`\n`): keep the same number of lines as the English text.

- **Names of options, commands, files and folders** (`--audfprint`, `npm install`, `logs`, `.env`) stay in English.

- **Discord formatting** in `webhook_welcome_message`: `**bold**` and `__underlined__` work the same in every language.

### How the texts are written

- **Nobody is addressed directly.** The texts never say "you" or "your": in languages where instructions would otherwise address the reader, they use the infinitive or an impersonal form instead (Italian *"Controllare la connessione",* French *"Vérifier la connexion"*).

- **Full sentences end with a period,** just like in the English text. Where the English text has no period, leave it out too: that's where a text ends with a path, a command, an error or a list, or where it's only part of a longer line.

- **Punctuation that follows bold or underlined text goes inside it,** like `**some random account.**` or `__WerZatSong!__`.

### The result files

The Audfprint result files start with a legend (the keys starting with `log_legend_`) that is laid out in columns. Keep every `:` lined up under the one above it, and start the lines that continue an explanation right under the text after the `:`, using spaces.

Each entry in those files is made from `format_match_entry` (its first line) and the `credits_` keys (its third line). The labels, **VERY STRONG,** **STRONG,** **PROBABLE,** **BORDERLINE** and **NO MATCH,** are `label_very_strong`, `label_strong`, `label_probable`, `label_borderline` and `label_no_match`. The parts of the credits line are joined with ` | `, so don't use ` | ` inside them. Each part ends with where its names come from, written with `credits_source` and one of the `credits_source_` keys, so every source has to be worded differently from the others. The file names and paths in an entry come from the database and are never translated.

When the credits are updated, WerZatSong fills in what was missing in earlier result files in every language it has, by recognizing these texts. Once a translation is in use, changing its `credits_` texts means result files written before the change won't be updated anymore.

### Crediting the translator

`webhook_translation_credit` is shown at the end of the welcome message WerZatSong posts on Discord when it's set up. Write something like "Translated into Esperanto by **name.**", with the translator's name in bold. In English it stays empty.

## 2. The README (`README.md`)

The README is the guide people see first on the project's GitHub page.

**To add Esperanto:**

1. Copy `README.md`, translate it, name it `README_ESP.md` (with a three-letter code, like `README_ITA.md`, `README_FRA.md` and `README_POR.md`) and put it in the `translated_READMEs` folder.

2. At the top of `README.md` and of every translated README, add a line pointing to it next to the ones that are already there, and add the language to the list in the *Languages* section.

3. At the end of the new README, after the development credits, add a line saying who translated it, like the other translations do.

The READMEs follow the same writing style as the texts above.

## A few things for every file

Save the files as UTF-8, so accented letters come out right. When in doubt about how formal or casual to be, go with whatever is easiest to understand for the most people.
