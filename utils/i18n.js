/*
 * The language WerZatSong talks in.
 *
 * Chosen with --language on the command line (English when it is left out).
 * The value is compared without case or accents, so "italian", "Italiano" and
 * "ITALIANO" all work, as do "Portugues" and "francais". An unknown value is
 * reported in English by werzatsong.js and the run carries on in English.
 *
 * The scripts werzatsong.js starts (scripts/*.js, the audfprint Python code)
 * never see --language; they get the language through WERZATSONG_LANGUAGE,
 * which is set here and inherited by every child process.
 *
 * Texts live in localizations/console_strings_<language>.json, and every
 * such file is a language: adding one is all it takes. A key missing from a
 * translation falls back to the English text, and a key missing from that to
 * the key itself, so a gap never stops a run.
 */

const { readFileSync, readdirSync } = require('node:fs')
const { join } = require('node:path')

const LOCALIZATIONS_FOLDER = join(__dirname, '..', 'localizations')
const LANGUAGE_ENV = 'WERZATSONG_LANGUAGE'
const DEFAULT_LANGUAGE = 'English'
const STRINGS_FILE = /^console_strings_(.+)\.json$/

function fold(text){
    return String(text ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()
}

const asciiCode = text => fold(text).replace(/[^a-z0-9_-]/g, '')

function readJson(path){
    try {
        const parsed = JSON.parse(readFileSync(path, 'utf-8'))
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null
    }
    catch {
        return null
    }
}

/*
 * The languages of a localizations folder, English first. For each one:
 * names: what --language accepts (the file's own <language>, then the
 * "language_names" it lists, such as "Italiano, Italian"). code: what child
 * processes get in WERZATSONG_LANGUAGE ("language_code", plain ASCII). yargs:
 * the locale of yargs' own texts ("yargs_locale"). file: the file itself,
 * spelled as the folder has it.
 */
function findLanguages(folder = LOCALIZATIONS_FOLDER){
    let files = []
    try { files = readdirSync(folder) }
    catch {}
    const found = new Map()
    for(const file of files.sort()){
        const match = STRINGS_FILE.exec(file)
        const strings = match ? readJson(join(folder, file)) : null
        if(!strings)
            continue
        const language = match[1].normalize('NFC')
        const listed = String(strings.language_names ?? '').split(',').map(name => name.trim()).filter(Boolean)
        const code = asciiCode(strings.language_code || language) || asciiCode(language)
        if(found.has(language) || [...found.values()].some(known => known.code === code))
            continue
        found.set(language, { names: [...new Set([language, ...listed])], code, yargs: String(strings.yargs_locale || code), file: join(folder, file) })
    }
    if(!found.has(DEFAULT_LANGUAGE))
        found.set(DEFAULT_LANGUAGE, { names: [DEFAULT_LANGUAGE], code: 'en', yargs: 'en', file: join(folder, `console_strings_${DEFAULT_LANGUAGE}.json`) })
    const order = [...found.keys()].sort((a, b) => a === DEFAULT_LANGUAGE ? -1 : b === DEFAULT_LANGUAGE ? 1 : fold(a).localeCompare(fold(b)))
    return Object.fromEntries(order.map(language => [language, found.get(language)]))
}

const LANGUAGES = findLanguages()

// The language a --language value stands for, or null.
function resolveLanguage(value){
    const wanted = fold(value)
    if(wanted === '')
        return null
    for(const [language, { names }] of Object.entries(LANGUAGES)){
        if(names.some(name => fold(name) === wanted))
            return language
    }
    return null
}

function languageFromCode(code){
    const wanted = fold(code)
    return Object.keys(LANGUAGES).find(language => LANGUAGES[language].code === wanted) || null
}

// The value given with --language, '' when it has none, undefined when the
// option is not there. Read straight from the arguments because the texts are
// needed before yargs runs (its --help is translated too). The last one wins,
// as it does in yargs.
function languageFromArgv(args){
    let found
    for(let i = 0; i < args.length; i++){
        const arg = String(args[i])
        if(arg === '--')
            break
        if(arg === '--language'){
            const next = args[i + 1]
            found = next !== undefined && !String(next).startsWith('-') ? String(next) : ''
        }
        else if(arg.startsWith('--language='))
            found = arg.slice('--language='.length)
    }
    return found
}

function pickLanguage(args = process.argv.slice(2), env = process.env){
    const requested = languageFromArgv(args)
    if(requested !== undefined){
        const language = resolveLanguage(requested)
        return language ? { language, unsupported: null } : { language: DEFAULT_LANGUAGE, unsupported: requested }
    }
    return { language: languageFromCode(env[LANGUAGE_ENV]) || DEFAULT_LANGUAGE, unsupported: null }
}

function stringsFile(language){
    return LANGUAGES[language]?.file || join(LOCALIZATIONS_FOLDER, `console_strings_${language}.json`)
}

function loadStrings(language){
    try {
        const parsed = JSON.parse(readFileSync(stringsFile(language), 'utf-8'))
        return parsed && typeof parsed === 'object' ? parsed : {}
    }
    catch {
        return {}
    }
}

// {name} is replaced by vars.name in one pass, so a value that itself holds
// "{something}" (a file name, say) is never replaced a second time. A
// placeholder without a value is left as it is.
function fill(template, vars = {}){
    return String(template).replace(/\{(\w+)\}/g, (whole, name) =>
        Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : whole)
}

const { language, unsupported } = pickLanguage()
const english = loadStrings(DEFAULT_LANGUAGE)
const strings = language === DEFAULT_LANGUAGE ? english : loadStrings(language)
process.env[LANGUAGE_ENV] = LANGUAGES[language].code

function has(key){
    return Object.prototype.hasOwnProperty.call(strings, key) || Object.prototype.hasOwnProperty.call(english, key)
}

function t(key, vars = {}){
    const template = strings[key] ?? english[key] ?? key
    return fill(template, vars)
}

// The English text, whatever the language: for the few messages that have to
// be readable before the language is known to be valid.
function tEnglish(key, vars = {}){
    return fill(english[key] ?? key, vars)
}

const supportedLanguageNames = Object.values(LANGUAGES).flatMap(({ names }) => names)

module.exports = {
    DEFAULT_LANGUAGE,
    LANGUAGE_ENV,
    LANGUAGES,
    LOCALIZATIONS_FOLDER,
    asciiCode,
    fill,
    findLanguages,
    has,
    language,
    languageFromArgv,
    loadStrings,
    pickLanguage,
    resolveLanguage,
    stringsFile,
    supportedLanguageNames,
    t,
    tEnglish,
    unsupportedLanguage: unsupported,
    yargsLocale: LANGUAGES[language].yargs
}
