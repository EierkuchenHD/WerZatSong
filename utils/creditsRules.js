/*
 * The rules of the pklz credits, everything utils/credits.js and
 * scripts/credits.js need to understand names and the credits sheet:
 *   1. how pklz, folder and people's names are compared, who the people are
 *      (PEOPLE) and which packs have a known maker (FAMILIES,
 *      FOLDER_FAMILIES): edit those to add people or packs;
 *   2. reading the sheet from its .xlsx, its HTML export or CSV files, the
 *      links in its cells included;
 *   3. tying a pklz to the rows of the sheet.
 */

const { readFileSync, readdirSync, statSync } = require('node:fs')
const { basename, extname, join } = require('node:path')
const { inflateRawSync } = require('node:zlib')

/*
 * How pklz names, folder names and people's names are compared, for the
 * pklz credits (utils/credits.js).
 *
 * A name is cut into tokens: runs of letters and runs of digits, lower case,
 * everything else dropped. "MYSPACE_DRAGON_HOARD_2010_07.pklz" and
 * "myspace-dragon-hoard-2010 #7" are the same tokens, so the separators and
 * leading zeros people use never matter, but "yt-ChannelMix-5" and
 * "yt-ChannelMix-57" stay different.
 */

const ARCHIVE_EXTENSION = /\.(?:pklz|zip|7z|rar|tar\.gz|tgz|tar)$/i

// Words that only number or size a part of a pklz ("-NEW-3-8min",
// "(Part 001)", "-01-NOTRENAMED"), never say what it is.
const NUMBERING_WORDS = new Set(['new', 'part', 'notrenamed', 'old', 'disk', 'disc'])

function isNumber(token){
    return /^\d+$/.test(token)
}

// Tokens of a name. Digits lose their leading zeros, so "007" is "7".
function nameTokens(name){
    const text = String(name ?? '').normalize('NFKC').toLowerCase().replace(ARCHIVE_EXTENSION, '')
    const tokens = []
    for(const match of text.matchAll(/\d+|[\p{L}\p{M}]+/gu)){
        const token = match[0]
        tokens.push(/^\d/.test(token) ? token.replace(/^0+(?=\d)/, '') : token)
    }
    return tokens
}

// The key a pklz is looked up by.
function nameKey(name){
    return nameTokens(name).join(' ')
}

// A pklz named with numbers only ("1.pklz", "10_5.pklz"). The name says
// nothing about who made it: many collections number their files, and the
// "_5" the database's rename script adds only tells which copy it came to
// first. Only the folder such a pklz is in can say whose it is.
function isNumberOnly(name){
    const tokens = nameTokens(name)
    return tokens.length > 0 && tokens.every(isNumber)
}

// Folders that hold everything and say nothing.
const ROOT_FOLDERS = new Set(['database', 'huggingface co', 'wzs cosine club', 'werzatdb archive', 'werzatdb', 'backups', 'archive', 'compare', 'assets'])

// Folders that only number the parts of a collection ("disk-2", "CD 1",
// "Part 3").
const PLAIN_FOLDER_WORDS = new Set([...NUMBERING_WORDS, 'cd', 'vol', 'volume', 'side'])

const folderName = folder => String(folder ?? '').trim().replace(ARCHIVE_EXTENSION, '')
const isRootFolder = folder => ROOT_FOLDERS.has(nameKey(folderName(folder)))

function isPlainFolder(folder){
    const tokens = nameTokens(folderName(folder))
    return tokens.every(token => isNumber(token) || PLAIN_FOLDER_WORDS.has(token))
}

// The folders that say what a pklz is part of, nearest first, without an
// archive's extension ("gymforma.zip" is "gymforma").
function namedFolders(folders){
    return folders.filter(folder => !isRootFolder(folder) && !isPlainFolder(folder)).map(folderName)
}

// "8min", "5min", "15_Minutes": the fingerprint settings a pklz was made
// with. Taken off before two names are compared, so "...-90-X-5min" in the
// sheet is the same pklz as "...-90-13-5min" on disk.
const SIZE_WORDS = new Set(['min', 'minute', 'minutes'])

function withoutSizes(tokens){
    const out = []
    for(let i = 0; i < tokens.length; i++){
        if(isNumber(tokens[i]) && SIZE_WORDS.has(tokens[i + 1])){
            i += 1
            continue
        }
        out.push(tokens[i])
    }
    return out
}

function isNumbering(token){
    return isNumber(token) || NUMBERING_WORDS.has(token)
}

// Compares two digit runs as numbers, however long they are.
function compareNumbers(a, b){
    if(a.length !== b.length)
        return a.length < b.length ? -1 : 1
    return a < b ? -1 : a > b ? 1 : 0
}

/* ------------------------------------------------------------------------
 * People
 * --------------------------------------------------------------------- */

// The people whose names also show up inside pklz, folder and dataset names,
// spelled the way the credits show them. aliases: how the sheet and other
// people write them. pattern: how they show up inside a file or folder name
// (lower case, separators kept), whole words only so "sonoton" is not
// Sonolux and "grantnelson" is not Nel.
const PEOPLE = [
    { name: 'AzureBlast', aliases: ['azure', 'azureblast', 'azure blast'], pattern: /(?:^|[^a-z])azure(?:blast)?(?![a-z])|azureblast/ },
    { name: 'weezytweezy', aliases: ['weezy', 'weezytweezy'], pattern: /(?:^|[^a-z])weezy(?:tweezy)?(?![a-z])/ },
    { name: 'some random account', aliases: ['somerandomaccount', 'sra', 'some random account', "some random account's"], pattern: /some[ _-]?random[ _-]?account|(?:^|[^a-z])sra(?![a-z])/ },
    { name: 'Nel', aliases: ['nel', 'nel80s'], pattern: /(?:^|[^a-z])nel(?:80s)?(?![a-z])/ },
    { name: 'SDB', aliases: ['sdb', 'spicydrinkbottle', 'spicy drink bottle'], pattern: /(?:^|[^a-z])sdb(?![a-z])|spicy[ _-]?drink[ _-]?bottle/ },
    { name: 'Rocket', aliases: ['rocket', 'rocketballboi'], pattern: /rocketballboi|(?:^|[^a-z])rocket(?![a-z])/ },
    { name: 'Sonolux', aliases: ['sono', 'sonolux'], pattern: /sonolux|(?:^|[^a-z])sono(?![a-z])/ },
    { name: 'Mystic65', aliases: ['mystic', 'mystic65'], pattern: /(?:^|[^a-z])mystic(?:65)?(?![a-z])/ },
    { name: 'Numerophobe', aliases: ['numero', 'numerophobe'], pattern: /numerophobe|(?:^|[^a-z])numero(?![a-z])/ },
    { name: 'Rayzox57', aliases: ['rayzox', 'rayzox57'], pattern: /(?:^|[^a-z])rayzox/ },
    { name: 'EierkuchenHD', aliases: ['pancake', 'eierkuchen', 'eierkuchenhd'], pattern: /eierkuchen|(?:^|[^a-z])pancake(?![a-z])/ },
    { name: 'wy', aliases: ['w3y6', 'wy'], pattern: /(?:^|[^a-z0-9])(?:w3y6|wy)(?![a-z0-9])/ },
    { name: 'Connor', aliases: ['connor'], pattern: /(?:^|[^a-z])connor(?![a-z])/ },
    { name: 'polymood', aliases: ['polymood'], pattern: /polymood/ },
    // His folder is "Murp_misc". Only "murp" as a whole word, so
    // "michaeljonmurphy9858" or a song by Eddie Murphy is not him.
    { name: 'Murphy', aliases: ['murp', 'murphy'], pattern: /(?:^|[^a-z])murp(?![a-z])/ },
    // Not in the nickname list, but they have their own folders on
    // wzs.cosine.club and in the database dumps.
    { name: 'acaruso', aliases: ['acaruso'], pattern: /acaruso/ },
    { name: 'Cr1TiKa7', aliases: ['cr1tika7'], pattern: /cr1tika7/ },
    { name: 'lastpariahs', aliases: ['lastpariahs', 'lastpariah'], pattern: /lastpariahs?/ },
    { name: 'VoidGod', aliases: ['voidgod'], pattern: /voidgod/ }
]

const peopleKey = name => String(name ?? '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '')

const ALIASES = new Map()
for(const person of PEOPLE){
    for(const alias of [person.name, ...person.aliases])
        ALIASES.set(peopleKey(alias), person.name)
}

// Cell values that mean nobody in particular.
const NOBODY = new Set(['', 'na', 'none', 'nobody', 'unknown', 'unknownuser', 'multipleusers', 'various', 'varioususers', 'tbd', 'x'])

// Spellings seen in the sheet for people not in PEOPLE (key -> spelling),
// set by usePreferredSpellings() so "Acaruso" and "acaruso" read the same.
let spellings = new Map()

function usePreferredSpellings(map){
    spellings = new Map(map)
}

// A name as written in a cell, without the "&" or "," left over from
// splitting the cell.
function cleanPersonText(name){
    return String(name ?? '').replace(/\s+/g, ' ').trim().replace(/^[&,;/+]+|[&,;/+]+$/g, '').trim()
}

// A person as the credits show them, or null for "nobody".
function canonicalPerson(name){
    const text = cleanPersonText(name)
    const key = peopleKey(text)
    if(NOBODY.has(key) || /^[?\-.*/]+$/.test(text))
        return null
    return ALIASES.get(key) || spellings.get(key) || text
}

// The people one CLAIMED BY / SUGGESTED BY cell names, in order.
// "AzureBlast & Nel", "Sonolux, Nel", "Sonolux/Rocket" and names on several
// lines are all split; "B&Y Studios" and "u/Ablonging7" are kept whole.
function splitPeople(cell){
    const parts = String(cell ?? '')
        .split(/\s*[\r\n]+\s*|\s+&\s+|\s*,\s*|\s*;\s*|\s*\|\s*|\s+and\s+|\s+\+\s+/i)
        .flatMap(part => /^u\//i.test(part) ? [part] : part.split(/(?<=[^\s/]{2})\s*\/\s*(?=[^\s/]{2})/))
    const people = []
    for(const part of parts){
        const person = canonicalPerson(part)
        if(person && !people.includes(person))
            people.push(person)
    }
    return people
}

// People named inside a file, folder or dataset name.
function peopleIn(text){
    const lower = String(text ?? '').normalize('NFKC').toLowerCase()
    return PEOPLE.filter(person => person.pattern.test(lower)).map(person => person.name)
}

// Words that say nothing about who made a pklz: "polymood-songs-pklz",
// "some random account_s fingerprints", "Murp_misc".
const FILLER_WORDS = new Set(['s', 'pklz', 'pklzs', 'fingerprint', 'fingerprints', 'misc', 'songs', 'files', 'uploads'])

// The words packs are named with ("weezy-variety2-1", "nel-80s-channels-mix-1"):
// after a short name at the start, they keep it sure.
const PACK_WORDS = new Set([
    'variety', 'varieties', 'mix', 'mixes', 'mixed', 'channel', 'channels', 'youtube', 'yt', 'dailymotion', 'dm',
    'playlist', 'playlists', 'vol', 'volume', 'volumes', 'batch', 'batches', 'pack', 'packs', 'collection', 'collections',
    'compilation', 'compilations', 'update', 'updates', 'set', 'sets', 'series', 'archive', 'archives', 'dump', 'dumps', 'various'
])

// Words anybody could use, even though they are someone's nickname.
const COMMON_ALIASES = new Set(['pancake'])

// A person's full name ("azureblast", "rayzox57", "some random account"), not
// a short one ("sdb", "nel", "sono", "numero") that could be part of anything.
function isFullName(alias){
    const letters = nameTokens(alias).join('')
    return !COMMON_ALIASES.has(alias) && (letters.length >= 7 || (/\d/.test(letters) && letters.length >= 4))
}

/*
 * The people named in a file or folder name, and how sure that is. Sure when
 * the name is all there is (numbers and words like "pklz" or "fingerprints"
 * aside: "sonolux", "sonolux_3", "Murp_misc"), when it is someone's full
 * name ("azureblast-variety-mix"), or when a short name starts the name with
 * a "-" or "_" right after it ("sdb-panamrailways", "nel_lyon"). Only
 * possibly theirs when a short name comes with other words anywhere else
 * ("emozioni nel cuore", "Nel blu dipinto di blu": "nel" is Italian too).
 */
function peopleWithCertainty(text){
    const people = peopleIn(text)
    if(people.length === 0)
        return { people, possibly: false }
    const lower = String(text ?? '').normalize('NFKC').toLowerCase().replace(/\.pklz$/, '')
    const tokens = nameTokens(lower)
    const used = tokens.map(() => false)
    const ways = []
    for(const name of people){
        const person = PEOPLE.find(candidate => candidate.name === name)
        let byName = false
        let byPrefix = false
        let found = false
        for(const alias of [person.name.toLowerCase(), ...person.aliases]){
            const aliasTokens = nameTokens(alias)
            for(let i = 0; aliasTokens.length > 0 && i + aliasTokens.length <= tokens.length; i++){
                if(!aliasTokens.every((token, j) => tokens[i + j] === token))
                    continue
                found = true
                byName = byName || isFullName(alias)
                byPrefix = byPrefix || (i === 0 && new RegExp(`^@?${aliasTokens.join('[^\\p{L}\\p{N}]*')}[-_]`, 'u').test(lower))
                aliasTokens.forEach((token, j) => { used[i + j] = true })
            }
        }
        // Inside a longer word ("sonoluxchannels"): sure only for a full name.
        if(!found)
            byName = person.aliases.some(alias => isFullName(alias) && lower.includes(alias))
        ways.push({ byName, byPrefix })
    }
    const rest = tokens.filter((token, i) => !used[i] && !isNumber(token) && !FILLER_WORDS.has(token))
    // A short name at the start ("sdb-", "nel_") is sure when only numbers
    // and pack words follow it ("sdb-12", "sdb-variety-3"), not other words
    // ("nel-cuore-1").
    const packOnly = rest.every(token => PACK_WORDS.has(token))
    const full = ways.every(({ byName, byPrefix }) => byName || (byPrefix && packOnly))
    return { people, possibly: rest.length > 0 && !full }
}

/* ------------------------------------------------------------------------
 * Families: kinds of pklz the sheet does not list one by one
 * --------------------------------------------------------------------- */

const FAMILIES = [
    // Sonolux's channel batches.
    { test: tokens => tokens.length === 2 && tokens[0] === 'channels' && isNumber(tokens[1]), fingerprinters: ['Sonolux'], suggesters: [] },
    // Fingerprinted by some random account.
    { test: (tokens, name) => /^(?:cuculo48due-aniello salatiello #|ildiscollezionista #|mmasimo-massimiliano bruno)/i.test(name), fingerprinters: ['some random account'], suggesters: [], alone: true },
    // Fingerprinted and suggested by some random account.
    { test: tokens => tokens[0] === 'misc' && tokens[1] === 'italian' && /^pklzs?$/.test(tokens[2] || ''), fingerprinters: ['some random account'], suggesters: ['some random account'] },
    // Packs whose names say nothing about who made them.
    { test: tokens => tokens[0] === 'hifidelitypotpourri' || (tokens[0] === 'hifidelity' && tokens[1] === 'potpourri'), fingerprinters: ['Rayzox57'], suggesters: [] },
    { test: tokens => tokens[0] === 'soundclick', fingerprinters: ['weezytweezy'], suggesters: [] },
    { test: tokens => tokens[0] === 'stevewonda', fingerprinters: ['weezytweezy'], suggesters: [] },
    // These exact pklz from some random account's own folder, not anything
    // else with a similar name: #1 to #27 and #1 to #2, plus the "_1"
    // copies the database makes of them. DISCHI TOGHI was redone later by
    // EierkuchenHD. exact: no other pklz is guessed to be theirs because of
    // these (see learnTrends in utils/credits.js).
    { test: tokens => tokens[0] === 'nostalgiedelaboue' && tokens[1] === 'blogspot' && numbered(tokens, 2, 27), fingerprinters: ['some random account', 'Sonolux'], suggesters: [], exact: true },
    { test: tokens => tokens.slice(0, 3).join(' ') === 'provinciattiva roberto lentino' && numbered(tokens, 3, 2), fingerprinters: ['some random account', 'Sonolux'], suggesters: [], exact: true },
    { test: tokens => tokens.slice(0, 4).join(' ') === 'dischitoghi 1229 dischi toghi' && numbered(tokens, 4, 2), fingerprinters: ['some random account', 'EierkuchenHD'], suggesters: [], exact: true },
    // Music libraries.
    { test: tokens => tokens[0] === 'audiosparx', fingerprinters: ['Mystic65'], suggesters: [] },
    { test: tokens => tokens[0] === 'epidemicsound' || (tokens[0] === 'epidemic' && tokens[1] === 'sound'), fingerprinters: ['Mystic65'], suggesters: [] },
    { test: tokens => tokens[0] === 'muzie', fingerprinters: ['Mystic65'], suggesters: [] },
    { test: tokens => tokens[0] === 'purevolume', fingerprinters: ['wy'], suggesters: [] },
    // Channels and sites.
    { test: tokens => tokens[0] === 'user' && tokens[1] === 'qlostwave', fingerprinters: ['EierkuchenHD'], suggesters: [] },
    { test: tokens => tokens.slice(0, 3).join(' ') === 'mic ueber deutschland', fingerprinters: ['EierkuchenHD'], suggesters: [] },
    { test: tokens => tokens[0] === 'alessio' && tokens[1] === 'neomelodico', fingerprinters: ['EierkuchenHD', 'VoidGod'], suggesters: [] },
    { test: tokens => tokens.length === 2 && isNumber(tokens[0]) && tokens[1] === 'marcosoverini', fingerprinters: ['EierkuchenHD'], suggesters: [] },
    { test: tokens => tokens[0] === 'jim' && tokens[1] === 'fouratt', fingerprinters: ['lastpariahs'], suggesters: [] },
    { test: tokens => tokens[0] === 'alleluliaclan' || tokens[0] === 'alleluiaclan', fingerprinters: ['VoidGod'], suggesters: [] },
    { test: tokens => tokens[0] === 'musicanapolisaviano', fingerprinters: ['VoidGod'], suggesters: [] },
    { test: tokens => tokens[0] === 'sokvinyl', fingerprinters: ['EierkuchenHD'], suggesters: [] },
    // The WerZatDB server's own shards (backups/audiodb).
    { test: tokens => (tokens.length === 2 && tokens[0] === 'shard' && isNumber(tokens[1]) && Number(tokens[1]) <= 11) || (tokens.length === 1 && tokens[0] === 'refs'), fingerprinters: ['polymood'], suggesters: ['polymood'] }
]

// Sheet names (PKLZ FILENAME) whose pklz were all made by these people,
// whoever claimed the sources on the sheet.
const SHEET_MAKERS = new Map([
    ['LostwaveItalia-October2026', ['EierkuchenHD']]
].map(([name, people]) => [nameKey(name), people]))

// Folders whose PKLZ files are all made by one person, as the listings give
// them: "wzs.cosine.club/nel". A folder elsewhere with the same name says nothing.
const OWN_FOLDER_PARENTS = ['wzs.cosine.club', 'LostwaveItalia']
const OWN_FOLDERS = new Map([
    ['LostwaveItalia/eierkuchenhd', 'EierkuchenHD'],
    ['wzs.cosine.club/Cr1TiKa7_s PKLZs', 'Cr1TiKa7'],
    ['wzs.cosine.club/nel', 'Nel'],
    ['wzs.cosine.club/numerophobe', 'Numerophobe'],
    ['wzs.cosine.club/rayzox', 'Rayzox57'],
    ['wzs.cosine.club/weezy', 'weezytweezy']
].map(([folder, person]) => [folder.toLowerCase(), person]))
function siteMakersOf(folders){
    const found = []
    for(const folder of folders){
        const person = OWN_FOLDERS.get(String(folder).toLowerCase())
        if(person && !found.includes(person))
            found.push(person)
    }
    return found
}

function sheetMakersOf(names){
    const found = []
    for(const name of names)
        for(const person of SHEET_MAKERS.get(nameKey(String(name).replace(/\.pklz$/i, ''))) || [])
            if(!found.includes(person))
                found.push(person)
    return found
}

// Folders whose pklz were all made by one person, whatever the pklz are
// called (the pklz inside are named after the channels).
const FOLDER_FAMILIES = [
    { test: tokens => tokens[0] === 'lostwavechannelreuploaders', fingerprinters: ['EierkuchenHD'], suggesters: [] },
    // One pklz per song, in the WerZatDB server's backups (compare/legacy).
    { test: tokens => tokens.join(' ') === '10 anni fa', fingerprinters: ['polymood'], suggesters: ['polymood'] }
]

// tokens[at] is a part number from 1 to last, and after it there is at most
// the "_1" the database adds to a copy.
function numbered(tokens, at, last){
    const part = Number(tokens[at])
    return isNumber(tokens[at] || '') && part >= 1 && part <= last && tokens.length <= at + 2 && tokens.slice(at + 1).every(isNumber)
}

function familyOf(name){
    const tokens = nameTokens(name)
    return FAMILIES.find(family => family.test(tokens, String(name ?? ''))) || null
}

// A pklz's name without its numbers and sizes: "dnalounge-1552.pklz" and
// "dnalounge-7.pklz" are both "dnalounge". Names that say nothing about who
// made them have none: "1.pklz", WerZatSong's own "merged-001.pklz".
const GENERIC_STEMS = new Set(['merged', 'shard', 'refs', 'part', 'vol', 'volume', 'pklz', 'pklzs', 'misc', 'new', 'old', 'mix', 'various', 'test', 'db', 'database', 'disk', 'disc', 'batch', 'channel', 'channels mix'])

function nameStem(name, tokens = nameTokens(name)){
    const stem = withoutSizes(tokens).filter(token => !isNumber(token)).join(' ')
    return stem.length >= 3 && !GENERIC_STEMS.has(stem) ? stem : ''
}

// A pack credited one file at a time on purpose (exact: true), if the name
// is one of its files.
const EXACT_FAMILIES = FAMILIES.filter(family => family.exact)
function exactFamilyOf(name, tokens = nameTokens(name)){
    return EXACT_FAMILIES.find(family => family.test(tokens)) || null
}

// The first of the folders (nearest first) that is known to be one person's.
function folderFamilyOf(folders){
    for(const folder of folders){
        const tokens = nameTokens(folder)
        const family = FOLDER_FAMILIES.find(candidate => candidate.test(tokens))
        if(family)
            return family
    }
    return null
}

/* ------------------------------------------------------------------------
 * Channels and handles
 * --------------------------------------------------------------------- */

const CHANNEL_ID = /UC[A-Za-z0-9_-]{22}/g

function channelIdsIn(text){
    return [...String(text ?? '').matchAll(CHANNEL_ID)].map(match => match[0])
}

// The channel or account name a pklz is named after, as a key:
// "@retromeng-27.pklz", "yt-sunnyboy66-4-8min.pklz" and "dm-f1213128972.pklz"
// all give the channel's name. null when nothing is left.
const HANDLE_PREFIXES = /^(?:@|yt[-_]|dm[-_]|mixc[-_]|mixcloud[-_]+|tiktok[-_]|tokyvideo[-_]|sc[-_])/i

function handleKey(name){
    let text = String(name ?? '').normalize('NFKC').replace(ARCHIVE_EXTENSION, '').trim()
    // "1-MatteoB.pklz", "4-cinzialaf2942.pklz": numbered in front.
    text = text.replace(/^\d{1,3}[-_ ]+(?=\D)/, '')
    const prefixed = HANDLE_PREFIXES.test(text)
    text = text.replace(HANDLE_PREFIXES, '')
    text = text.replace(/[-_ ]*UC[A-Za-z0-9_-]{22}.*$/, '')
    let previous
    do {
        previous = text
        text = text
            .replace(/[-_ ]*\d+\s*min$/i, '')
            .replace(/[-_ ]*(?:new|notrenamed|old|legacy)$/i, '')
            .replace(/[-_ #.(]+(?:part\s*)?\d+\)?$/i, '')
    } while(text !== previous)
    const key = peopleKey(text)
    if(key.length < (prefixed ? 3 : 5))
        return null
    return key
}

function handleFromCell(text){
    const value = String(text ?? '').trim()
    if(value === '')
        return null
    const handle = /youtube\.com\/(?:@|c\/|user\/)([^/?#\s]+)/i.exec(value) || /^@([^/\s]+)$/.exec(value)
    if(handle)
        return peopleKey(decodeURIComponentSafe(handle[1]))
    return null
}

function decodeURIComponentSafe(text){
    try { return decodeURIComponent(text) }
    catch { return text }
}

/*
 * Reading the pklz credits sheet from the files Google Sheets gives out:
 * the whole spreadsheet as .xlsx (what WerZatSong downloads), the HTML
 * export (File > Download > Web page, a .zip or the folder it unzips to) or
 * one .csv per tab. Every reader returns the same thing:
 * [{ name: tab name, cells: [[cell text, ...], ...] }].
 *
 * Only Node's own modules are used, so nothing new has to be installed.
 */


/* ------------------------------------------------------------------------
 * Zip
 * --------------------------------------------------------------------- */

class SheetFileError extends Error {}

// name -> Buffer for every file in a zip.
function unzip(buffer){
    let end = -1
    for(let i = buffer.length - 22; i >= Math.max(0, buffer.length - 22 - 65535); i--){
        if(buffer.readUInt32LE(i) === 0x06054b50){
            end = i
            break
        }
    }
    if(end === -1)
        throw new SheetFileError('not a zip file')
    const count = buffer.readUInt16LE(end + 10)
    let at = buffer.readUInt32LE(end + 16)
    const files = new Map()
    for(let n = 0; n < count; n++){
        if(buffer.readUInt32LE(at) !== 0x02014b50)
            throw new SheetFileError('damaged zip file')
        const method = buffer.readUInt16LE(at + 10)
        const compressedSize = buffer.readUInt32LE(at + 20)
        const nameLength = buffer.readUInt16LE(at + 28)
        const extraLength = buffer.readUInt16LE(at + 30)
        const commentLength = buffer.readUInt16LE(at + 32)
        const localAt = buffer.readUInt32LE(at + 42)
        const name = buffer.toString('utf-8', at + 46, at + 46 + nameLength)
        at += 46 + nameLength + extraLength + commentLength
        const dataAt = localAt + 30 + buffer.readUInt16LE(localAt + 26) + buffer.readUInt16LE(localAt + 28)
        const data = buffer.subarray(dataAt, dataAt + compressedSize)
        if(method === 0)
            files.set(name, data)
        else if(method === 8)
            files.set(name, inflateRawSync(data))
    }
    return files
}

/* ------------------------------------------------------------------------
 * Text
 * --------------------------------------------------------------------- */

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }

function decodeEntities(text){
    return String(text).replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, entity) => {
        if(entity[0] === '#'){
            const code = entity[1] === 'x' || entity[1] === 'X' ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10)
            return Number.isFinite(code) ? String.fromCodePoint(code) : whole
        }
        return ENTITIES[entity.toLowerCase()] ?? whole
    })
}

function attribute(tag, name){
    const match = new RegExp(`\\s${name}\\s*=\\s*"([^"]*)"`, 'i').exec(tag) || new RegExp(`\\s${name}\\s*=\\s*'([^']*)'`, 'i').exec(tag)
    return match ? decodeEntities(match[1]) : null
}

/* ------------------------------------------------------------------------
 * .xlsx
 * --------------------------------------------------------------------- */

function columnIndex(reference){
    const letters = /^([A-Z]+)/i.exec(reference || '')
    if(!letters)
        return null
    let index = 0
    for(const letter of letters[1].toUpperCase())
        index = index * 26 + (letter.charCodeAt(0) - 64)
    return index - 1
}

function runsText(xml){
    // Phonetic runs (<rPh>) are not part of the text.
    const clean = xml.replace(/<rPh\b[\s\S]*?<\/rPh>/g, '')
    let text = ''
    for(const match of clean.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g))
        text += decodeEntities(match[1])
    return text
}

function readXlsx(buffer){
    const files = unzip(buffer)
    const read = name => {
        const file = files.get(name)
        return file ? file.toString('utf-8') : null
    }
    const workbook = read('xl/workbook.xml')
    if(!workbook)
        throw new SheetFileError('no workbook in the .xlsx file')
    const targets = new Map()
    for(const match of (read('xl/_rels/workbook.xml.rels') || '').matchAll(/<Relationship\b[^>]*>/g)){
        const id = attribute(match[0], 'Id')
        let target = attribute(match[0], 'Target') || ''
        target = target.startsWith('/') ? target.slice(1) : `xl/${target}`
        targets.set(id, target)
    }
    const shared = []
    for(const match of (read('xl/sharedStrings.xml') || '').matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g))
        shared.push(runsText(match[1]))
    const tabs = []
    for(const match of workbook.matchAll(/<sheet\b[^>]*>/g)){
        const name = attribute(match[0], 'name')
        const path = targets.get(attribute(match[0], 'r:id')) || ''
        const xml = read(path)
        if(name === null || xml === null)
            continue
        // Where the linked cells point: a cell can show "@oldname" and link
        // to the channel as it is called now, or to its channel ID.
        const sheetLinks = new Map()
        for(const rel of (read(path.replace(/([^/]+)$/, '_rels/$1.rels')) || '').matchAll(/<Relationship\b[^>]*>/g))
            sheetLinks.set(attribute(rel[0], 'Id'), attribute(rel[0], 'Target') || '')
        const linkAt = new Map()
        for(const link of xml.matchAll(/<hyperlink\b[^>]*>/g)){
            const target = sheetLinks.get(attribute(link[0], 'r:id'))
            const ref = attribute(link[0], 'ref')
            if(target && ref)
                linkAt.set(ref.split(':')[0].toUpperCase(), target)
        }
        const cells = []
        const links = []
        for(const row of xml.matchAll(/<row\b([^>]*)>([\s\S]*?)<\/row>|<row\b([^>]*)\/>/g)){
            const rowNumber = Number(attribute(row[1] ?? row[3], 'r')) || cells.length + 1
            const values = []
            const rowLinks = []
            let next = 0
            for(const cell of (row[2] || '').matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)){
                const ref = attribute(` ${cell[1]}`, 'r')
                const at = columnIndex(ref) ?? next
                const type = attribute(` ${cell[1]}`, 't')
                const inner = cell[2] || ''
                const formula = /<f\b[^>]*>([\s\S]*?)<\/f>/.exec(inner)
                const hyperlink = formula && /HYPERLINK\(\s*"([^"]+)"/i.exec(decodeEntities(formula[1]))
                const link = (ref && linkAt.get(ref.toUpperCase())) || hyperlink?.[1] || ''
                if(link)
                    rowLinks[at] = link
                const raw = /<v\b[^>]*>([\s\S]*?)<\/v>/.exec(inner)
                let value = ''
                if(type === 's')
                    value = raw ? shared[Number(raw[1])] ?? '' : ''
                else if(type === 'inlineStr')
                    value = runsText(/<is\b[^>]*>([\s\S]*?)<\/is>/.exec(inner)?.[1] || '')
                else if(type === 'b')
                    value = raw ? (raw[1] === '1' ? 'TRUE' : 'FALSE') : ''
                else {
                    value = raw ? decodeEntities(raw[1]) : ''
                    // Google writes whole numbers as "2001.0"; the sheet shows 2001.
                    if((type === null || type === 'n') && /^-?\d+\.0+$/.test(value))
                        value = value.replace(/\.0+$/, '')
                }
                values[at] = value
                next = at + 1
            }
            for(let i = 0; i < values.length; i++)
                values[i] = values[i] ?? ''
            cells[rowNumber - 1] = values
            links[rowNumber - 1] = rowLinks
        }
        for(let i = 0; i < cells.length; i++){
            cells[i] = cells[i] || []
            links[i] = links[i] || []
        }
        tabs.push({ name, cells, links })
    }
    return tabs
}

/* ------------------------------------------------------------------------
 * HTML export
 * --------------------------------------------------------------------- */

function cellText(html){
    const text = html
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '')
    return decodeEntities(text).replace(/[ \t]+\n/g, '\n').trim()
}

// Where the first link in an HTML cell points ("" without one). Google's
// redirect links are unwrapped.
function cellLink(html){
    const href = /<a\b[^>]*\bhref\s*=\s*"([^"]*)"/i.exec(html)?.[1]
    if(!href)
        return ''
    const link = decodeEntities(href)
    const wrapped = /^https?:\/\/www\.google\.com\/url\?(?:.*&)?q=([^&]+)/i.exec(link)
    return wrapped ? decodeURIComponent(wrapped[1]) : link
}

// One tab of Google Sheets' HTML export.
function readSheetHtml(html, name){
    const body = /<tbody>([\s\S]*?)<\/tbody>/i.exec(html)?.[1] ?? html
    const cells = []
    const links = []
    const spans = []
    for(const row of body.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)){
        const values = []
        const rowLinks = []
        let column = 0
        const take = () => {
            while(spans[column] && spans[column].left > 0){
                values[column] = spans[column].text
                rowLinks[column] = spans[column].link
                spans[column].left -= 1
                column += 1
            }
        }
        for(const cell of row[1].matchAll(/<td\b([^>]*)>([\s\S]*?)<\/td>|<td\b([^>]*)\/>/gi)){
            const tag = ` ${cell[1] ?? cell[3] ?? ''}`
            if(/freezebar/.test(attribute(tag, 'class') || ''))
                continue
            take()
            const text = cellText(cell[2] || '')
            const link = cellLink(cell[2] || '')
            const colspan = Math.max(1, Number(attribute(tag, 'colspan')) || 1)
            const rowspan = Math.max(1, Number(attribute(tag, 'rowspan')) || 1)
            for(let k = 0; k < colspan; k++){
                values[column] = text
                rowLinks[column] = link
                if(rowspan > 1)
                    spans[column] = { text, link, left: rowspan - 1 }
                column += 1
            }
        }
        take()
        cells.push(values.map(value => value ?? ''))
        links.push(rowLinks.map(value => value ?? ''))
    }
    return { name, cells, links }
}

// "YouTube Sources (17066 21362).html" -> "YouTube Sources (17066 21362)".
function tabNameOf(file){
    return basename(file, extname(file))
}

/* ------------------------------------------------------------------------
 * CSV
 * --------------------------------------------------------------------- */

function parseCsv(text){
    const rows = []
    let row = []
    let field = ''
    let quoted = false
    const input = String(text).replace(/^﻿/, '')
    for(let i = 0; i < input.length; i++){
        const character = input[i]
        if(quoted){
            if(character === '"'){
                if(input[i + 1] === '"'){
                    field += '"'
                    i += 1
                }
                else
                    quoted = false
            }
            else
                field += character
        }
        else if(character === '"')
            quoted = true
        else if(character === ','){
            row.push(field)
            field = ''
        }
        else if(character === '\n' || character === '\r'){
            if(character === '\r' && input[i + 1] === '\n')
                i += 1
            row.push(field)
            rows.push(row)
            row = []
            field = ''
        }
        else
            field += character
    }
    if(field !== '' || row.length > 0){
        row.push(field)
        rows.push(row)
    }
    return rows
}

/* ------------------------------------------------------------------------
 * Any of them
 * --------------------------------------------------------------------- */

function looksLikeZip(buffer){
    return buffer.length > 4 && buffer.readUInt32LE(0) === 0x04034b50
}

// Tabs from a downloaded file (Buffer) whose kind is not known in advance.
function readSheetBuffer(buffer, name = 'sheet'){
    if(looksLikeZip(buffer)){
        const files = unzip(buffer)
        if(files.has('xl/workbook.xml'))
            return readXlsx(buffer)
        const tabs = []
        for(const [file, data] of files)
            if(/\.html?$/i.test(file))
                tabs.push(readSheetHtml(data.toString('utf-8'), tabNameOf(file)))
        if(tabs.length > 0)
            return tabs
        throw new SheetFileError('the zip has neither a spreadsheet nor web pages in it')
    }
    const text = buffer.toString('utf-8')
    if(/<table\b/i.test(text))
        return [readSheetHtml(text, name)]
    return [{ name, cells: parseCsv(text) }]
}

// Tabs from files or folders on disk.
function readSheetPaths(paths){
    const tabs = []
    for(const path of paths){
        if(statSync(path).isDirectory()){
            const inside = readdirSync(path).filter(file => /\.(?:html?|csv|xlsx|zip)$/i.test(file)).sort()
            tabs.push(...readSheetPaths(inside.map(file => join(path, file))))
            continue
        }
        tabs.push(...readSheetBuffer(readFileSync(path), tabNameOf(path)))
    }
    return tabs
}

/*
 * What the pklz credits sheet says about a pklz.
 *
 * The sheet comes in as tabs of plain cells (read above from the sheet's
 * .xlsx, its HTML export or CSV files). Every tab with a
 * CLAIMED BY column is used, whatever it is called, so tabs can be renamed
 * and new ones added.
 *
 * A pklz is tied to sheet rows, first way that works:
 *   1. its name against the PKLZ FILENAME cells (and DOWNLOAD LINK cells
 *      that hold a file name): "a & b", "a, b", "a | b", "Volume-1 & 2",
 *      "vol-1476:1600", "vol-1 to 5", "-X-" and "YEAR" placeholders, and
 *      numbered parts of a name ("name-3.pklz", "name #3", "name_0001-1178",
 *      "name-NEW-3-8min");
 *   2. Bandcamp batches by their tag or year, Reverbnation batches by the
 *      mp3 ID range in their name, or by the batch folder they are in;
 *   3. a YouTube channel ID in its name;
 *   4. the channel or account it is named after ("@name-2", "yt-name",
 *      "dm-name") against the channel cells;
 *   5. a folder it is in, named like a PKLZ FILENAME cell
 *      ("WFMU_FINGERPRINTS", "musify2", "librarymusic/").
 * All the rows found the first way that works count, and only the names
 * they all agree on are used (see certainCredits).
 */


/* ------------------------------------------------------------------------
 * PKLZ FILENAME cells
 * --------------------------------------------------------------------- */

// The names one cell stands for, as written ("Volume-1 & 2" gives
// "Volume-1" and "Volume-2").
function cellNames(cell){
    const text = String(cell ?? '').replace(/[\r\n]+/g, ' | ').trim()
    if(text === '')
        return []
    const parts = text.split(/\s*\|\s*|\s*&\s*|\s*,\s*|\s+\/\s+/)
    const names = []
    let previous = null
    for(let part of parts){
        part = part.trim().replace(/^&\s*/, '').trim()
        if(part === '' || /^[-_.\s]+$/.test(part))
            continue
        // "AzureBlast-Various-80s-Wave_Volume-1 & 2": the 2 is a Volume-2.
        if(previous !== null && /^\d+$/.test(part) && /\d+(?=\D*$)/.test(previous))
            part = previous.replace(/\d+(?=\D*$)/, part)
        // "...-PToxd0Q-MAIN / LIVE / NEWORDER": "...-PToxd0Q-LIVE" and so on.
        else if(previous !== null && /^[A-Z]+$/.test(part) && /-[A-Z]+$/.test(previous))
            part = previous.replace(/[A-Z]+$/, part)
        names.push(part)
        previous = part
    }
    return names
}

const RANGE = '\u0000'

// A cell name as a pattern: tokens, where a token is a word, a number, a
// range of numbers ("1476:1600", "1 to 5", "2654:" open ended) or any number
// ("X", "YEAR"). null when the name has nothing to compare.
const ANY = '\u0001'

// A web address names its pklz without the ".com": the cell
// "newfunkclassicmaster.blogspot.com" is newfunkclassicmaster-blogspot-1.pklz,
// and so is a folder called that.
function withoutDomainEnding(text){
    return String(text).replace(/^([^\s/]+)\.(?:com|net|org|info)$/i, '$1')
}

function parsePattern(name){
    // Placeholders are written in capitals: "-X-", "musify.club-YEAR".
    let text = String(name ?? '').normalize('NFKC').replace(/(?<![A-Za-z])(?:X|YEAR)(?![A-Za-z])/g, ` ${ANY} `).toLowerCase().trim()
    text = text.replace(/\.pklz$/i, '').replace(/\/+$/, '').trim()
    text = withoutDomainEnding(text)
    // "weezy-variety-3:1-100": variety 3, batches 1 to 100.
    text = text.replace(/(\d+)\s*:\s*(\d+)\s*-\s*(\d+)\s*$/, (whole, series, from, to) => `${series} ${RANGE}${from}${RANGE}${to}${RANGE}`)
    // "1476:1600", "1 to 5". Not "Year 2006 to 2021" (a title, not a range).
    text = text.replace(/(?<!year\s*)(?<!\d)(\d+)\s*(?::|\s+to\s+)\s*(\d+)/g, (whole, from, to) => `${RANGE}${from}${RANGE}${to}${RANGE}`)
    text = text.replace(/(\d+)\s*:\s*$/, (whole, from) => `${RANGE}${from}${RANGE}inf${RANGE}`)
    const pattern = []
    const tokenizer = new RegExp(`${RANGE}(\\d+)${RANGE}(\\d+|inf)${RANGE}|${ANY}|\\d+|[\\p{L}\\p{M}]+`, 'gu')
    for(const match of text.matchAll(tokenizer)){
        if(match[1] !== undefined){
            pattern.push({ kind: 'range', from: strip(match[1]), to: match[2] === 'inf' ? null : strip(match[2]) })
            continue
        }
        const token = match[0]
        if(token === ANY)
            pattern.push({ kind: 'any' })
        else if(/^\d/.test(token))
            pattern.push({ kind: 'word', value: strip(token) })
        else
            pattern.push({ kind: 'word', value: token })
    }
    // A bare "X", a lone number or "!pklz" names nothing.
    if(!pattern.some(part => part.kind === 'word' && !isNumber(part.value) && !['pklz', 'pklzs', 'zip', 'tar', 'gz'].includes(part.value)))
        return null
    // Sizes ("-5min") are not compared (see withoutSizes).
    const compact = []
    for(let i = 0; i < pattern.length; i++){
        const next = pattern[i + 1]
        if(next && next.kind === 'word' && ['min', 'minute', 'minutes'].includes(next.value) && (pattern[i].kind !== 'word' || isNumber(pattern[i].value))){
            i += 1
            continue
        }
        compact.push(pattern[i])
    }
    return compact
}

function strip(digits){
    return digits.replace(/^0+(?=\d)/, '')
}

function partMatches(part, token){
    if(part.kind === 'word')
        return part.value === token
    if(!isNumber(token))
        return false
    if(part.kind === 'any')
        return true
    return compareNumbers(token, part.from) >= 0 && (part.to === null || compareNumbers(token, part.to) <= 0)
}

// Does a pklz name (its tokens, sizes taken off) belong to a pattern? The
// pattern has to be the start of the name and whatever is left can only
// number the part.
function patternMatches(pattern, tokens){
    if(tokens.length < pattern.length)
        return false
    for(let i = 0; i < pattern.length; i++){
        if(!partMatches(pattern[i], tokens[i]))
            return false
    }
    for(let i = pattern.length; i < tokens.length; i++){
        if(!isNumbering(tokens[i]))
            return false
    }
    return true
}

// The key of a pattern with no ranges or placeholders, null otherwise.
function exactPatternKey(pattern){
    if(pattern.some(part => part.kind !== 'word'))
        return null
    return pattern.map(part => part.value).join(' ')
}

function firstWord(pattern){
    return pattern[0].kind === 'word' ? pattern[0].value : '*'
}

/* ------------------------------------------------------------------------
 * Tabs
 * --------------------------------------------------------------------- */

const COLUMN_NAMES = {
    status: [/^source status$/],
    claimed: [/^claimed by$/],
    suggested: [/^suggested by$/],
    file: [/^pklz filename$/, /^zip\/7z filename$/, /filename/],
    download: [/^download link$/],
    channelId: [/channel id/],
    source: [/url|title|name|range/]
}

function tabKind(name, header){
    const text = `${name} ${header.join(' ')}`.toLowerCase()
    if(/reverb\s*nation/.test(text))
        return 'reverbnation'
    if(/bandcamp/.test(name.toLowerCase()) || /tag\/year/.test(text))
        return 'bandcamp'
    if(/youtube/.test(text))
        return 'youtube'
    if(/dailymotion/.test(text))
        return 'dailymotion'
    return 'other'
}

// The order of the tabs on the sheet. The rows are always put in this order,
// whatever order a file has the tabs in, so the same sheet always gives the
// same names in the same order.
const TAB_ORDER = ['youtube', 'dailymotion', 'reverbnation', 'bandcamp', 'other']

// tabs: [{ name, cells: [[text, ...], ...], links? }] -> the rows the credits
// use. links: where linked cells point, same shape as cells.
function readTabs(tabs){
    const rows = []
    for(const tab of tabs){
        const cells = tab.cells || []
        const headerAt = cells.findIndex(row => row.some(cell => /^claimed by$/i.test(String(cell).trim())))
        if(headerAt === -1)
            continue
        const header = cells[headerAt].map(cell => String(cell ?? '').replace(/\s+/g, ' ').trim().toLowerCase())
        const column = {}
        for(const [field, patterns] of Object.entries(COLUMN_NAMES)){
            for(const pattern of patterns){
                const at = header.findIndex((name, index) => pattern.test(name) && !Object.values(column).includes(index))
                if(at !== -1){
                    column[field] = at
                    break
                }
            }
        }
        if(column.source === undefined)
            column.source = 0
        const kind = tabKind(tab.name, header)
        for(let r = headerAt + 1; r < cells.length; r++){
            const row = cells[r]
            const get = field => column[field] === undefined ? '' : String(row[column[field]] ?? '').trim()
            const linkOf = field => column[field] === undefined ? '' : String(tab.links?.[r]?.[column[field]] ?? '').trim()
            const record = {
                tab: tab.name,
                row: r + 1,
                kind,
                source: get('source'),
                channelId: get('channelId'),
                status: get('status'),
                claimedCell: get('claimed'),
                suggestedCell: get('suggested'),
                fileCell: get('file'),
                downloadCell: get('download'),
                // Where the source cell links to, when it is a link.
                sourceLink: linkOf('source')
            }
            if([record.source, record.claimedCell, record.suggestedCell, record.fileCell].every(value => value === ''))
                continue
            rows.push(record)
        }
    }
    const place = kind => TAB_ORDER.includes(kind) ? TAB_ORDER.indexOf(kind) : TAB_ORDER.length
    return rows.sort((a, b) => place(a.kind) - place(b.kind))
}

// The spelling most of the sheet uses for each person PEOPLE does not know.
function preferredSpellings(rows){
    const votes = new Map()
    for(const row of rows){
        for(const cell of [row.claimedCell, row.suggestedCell]){
            for(const part of String(cell).split(/\s*[\r\n]+\s*|\s+&\s+|\s*,\s*|\s*;\s*|\s+and\s+/i)){
                const text = cleanPersonText(part)
                const key = peopleKey(text)
                if(key === '')
                    continue
                if(!votes.has(key))
                    votes.set(key, new Map())
                votes.get(key).set(text, (votes.get(key).get(text) || 0) + 1)
            }
        }
    }
    const chosen = new Map()
    for(const [key, counts] of votes)
        chosen.set(key, [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0])
    return chosen
}

/* ------------------------------------------------------------------------
 * Remembering the rows of the sheet
 *
 * The credits file keeps every row the sheet has had. A row is known by
 * what it is about, not by where it is: its YouTube channel ID, otherwise
 * its source (channel URL, title, ID range, tag) in the kind of tab it is
 * in, otherwise its file name. So a row moved, sorted or put in another tab
 * of the same kind is the same row, an edited row replaces what was known
 * about it, and a deleted row is still known.
 * --------------------------------------------------------------------- */

// The cells of a row that are kept, in the order the credits file has them.
// Not the tab's name: it has the number of rows in it, which changes all the
// time.
const ROW_FIELDS = ['kind', 'source', 'sourceLink', 'channelId', 'status', 'claimedCell', 'suggestedCell', 'fileCell', 'downloadCell']

const sourceIdentity = text => String(text || '').toLowerCase()
    .replace(/^\s*https?:\/\/(?:www\.|m\.)?/, '')
    .replace(/[/?#\s]+$/, '')
    .replace(/\s+/g, ' ')
    .trim()

// Every name a row goes by, the one it is kept under first.
function rowKeys(row){
    const keys = channelIdsOf(row).map(id => `channel ${id}`)
    for(const text of sourceTexts(row)){
        const source = sourceIdentity(text)
        if(source !== '')
            keys.push(`${row.kind} ${source}`)
    }
    const file = sourceIdentity(row.fileCell) || sourceIdentity(row.downloadCell)
    if(keys.length === 0 && file !== '')
        keys.push(`${row.kind} file ${file}`)
    return [...new Set(keys)]
}

const sameCell = (a, b) => String(a || '').trim() === String(b || '').trim()

/*
 * known: the rows the credits file has (each with its key); sheet: the rows
 * the sheet has now, or those of another credits file. -> { rows: every row, each with its key, added, edited,
 * overwritten, kept }
 *
 * A sheet row that is about the same thing as a known one replaces it, cell
 * by cell: a cell emptied on the sheet keeps what it said. overwritten counts
 * rows where a name of who claimed or suggested it was replaced by another,
 * kept the known rows the sheet no longer has.
 */
function mergeRows(known, sheet){
    const rows = new Map()
    const byKey = new Map()
    for(const row of known){
        const key = row.key || rowKeys(row)[0]
        if(!key || rows.has(key))
            continue
        const copy = { ...row, key }
        rows.set(key, copy)
        for(const other of [key, ...rowKeys(copy)])
            if(!byKey.has(other))
                byKey.set(other, key)
    }
    const seen = new Set()
    let added = 0
    let edited = 0
    let overwritten = 0
    for(const row of sheet){
        // A row from another credits file keeps the key it had there.
        const keys = [...new Set([row.key, ...rowKeys(row)].filter(Boolean))]
        if(keys.length === 0)
            continue
        // The known row it is about; when the sheet has the same source more
        // than once, the copies are known as "<key> #2", "<key> #3", ...
        const candidates = keys.map(other => byKey.get(other)).filter(found => found !== undefined)
        for(let copy = 2; rows.has(`${keys[0]} #${copy}`); copy++)
            candidates.push(`${keys[0]} #${copy}`)
        let key = candidates.find(found => !seen.has(found))
        if(key === undefined){
            // Not known yet. The same source twice on the sheet: the second
            // one is a row of its own.
            key = keys[0]
            for(let copy = 2; rows.has(key) || seen.has(key); copy++)
                key = `${keys[0]} #${copy}`
            rows.set(key, { key, ...Object.fromEntries(ROW_FIELDS.map(field => [field, row[field] ?? ''])) })
            for(const other of keys)
                if(!byKey.has(other))
                    byKey.set(other, key)
            seen.add(key)
            added += 1
            continue
        }
        seen.add(key)
        const old = rows.get(key)
        const next = { ...old }
        for(const field of ROW_FIELDS){
            const value = String(row[field] ?? '').trim()
            if(value !== '')
                next[field] = value
        }
        const people = field => peopleKey(String(old[field] || '')) !== '' && !sameCell(old[field], next[field])
        if(people('claimedCell') || people('suggestedCell'))
            overwritten += 1
        if(ROW_FIELDS.some(field => !sameCell(old[field], next[field])))
            edited += 1
        rows.set(key, next)
    }
    const kept = [...rows.keys()].filter(key => !seen.has(key)).length
    return { rows: [...rows.values()], added, edited, overwritten, kept }
}

// Rows in an order that does not depend on the sheet's: by kind of tab,
// then by what they are about.
function inSteadyOrder(rows){
    const place = kind => TAB_ORDER.includes(kind) ? TAB_ORDER.indexOf(kind) : TAB_ORDER.length
    const keyOf = row => row.key || rowKeys(row)[0] || ''
    return [...rows].sort((a, b) => place(a.kind) - place(b.kind) || (keyOf(a) < keyOf(b) ? -1 : keyOf(a) > keyOf(b) ? 1 : 0))
}

/* ------------------------------------------------------------------------
 * Bandcamp and Reverbnation
 * --------------------------------------------------------------------- */

const isYear = token => isNumber(token) && token.length === 4 && /^(?:19|20)/.test(token)

function bandcampYears(tokens){
    const years = tokens.filter(isYear)
    return years.length > 0 ? [years[0], years[years.length - 1]] : null
}

function bandcampTag(tokens){
    const words = tokens.filter(token => !isNumber(token) && !['bandcamp', 'batch', 'tag', 'year', 'extra'].includes(token))
    return words.length > 0 ? words.join('') : null
}

function reverbBatch(text){
    const match = /reverb[-_ ]?nation[-_ ]?batch[-_ ]?(\d+)/i.exec(String(text ?? ''))
    return match ? strip(match[1]) : null
}

// "0-50K", "4.75-4.80M", "35.30-35.327" (millions) -> [from, to] mp3 IDs.
function reverbRange(text){
    const match = /^\s*([\d.]+)\s*([km])?\s*-\s*([\d.]+)\s*([km])?\s*$/i.exec(String(text ?? ''))
    if(!match)
        return null
    const unit = (match[4] || match[2] || (Number(match[3]) < 1000 && match[3].includes('.') ? 'm' : '')).toLowerCase()
    const scale = unit === 'm' ? 1e6 : unit === 'k' ? 1e3 : 1
    return [Math.round(Number(match[1]) * scale), Math.round(Number(match[3]) * scale)]
}

// "reverbnation-0001_1-30190-1.pklz": the mp3 IDs in it.
function reverbFileRange(name){
    const match = /^reverbnation-\d+_(\d+)-(\d+)/i.exec(String(name ?? ''))
    return match ? [Number(match[1]), Number(match[2])] : null
}

/* ------------------------------------------------------------------------
 * Index
 * --------------------------------------------------------------------- */

function addTo(map, key, value){
    if(!map.has(key))
        map.set(key, [])
    if(!map.get(key).includes(value))
        map.get(key).push(value)
}

// Keys a source cell of the Other Sources tab can be named after.
function sourceKeys(text){
    const keys = []
    const value = String(text ?? '').trim()
    let url = null
    try { url = new URL(/^[a-z]+:\/\//i.test(value) ? value : `https://${value}`) }
    catch { url = null }
    if(url && /\./.test(url.hostname) && !/\s/.test(value)){
        const host = url.hostname.replace(/^www\./, '')
        const parts = url.pathname.split('/').filter(Boolean)
        const sub = /^([^.]+)\.(?:blogspot|bandcamp|wordpress|tumblr|eklablog|neocities|github|free)\./.exec(host)
        if(sub)
            keys.push(sub[1], host)
        else if(/(?:archive\.org|mixcloud\.com|soundcloud\.com|dailymotion\.com|tiktok\.com|instagram\.com|bilibili\.com)$/.test(host) && parts.length > 0)
            keys.push(parts[parts[0] === 'details' || parts[0] === 'video' ? 1 : 0] || '')
        else if(parts.length === 0)
            keys.push(host)
    }
    return keys.map(key => peopleKey(key)).filter(key => key.length >= 4)
}

// The source cell and, when it is a link to somewhere else, where it links.
function sourceTexts(row){
    return row.sourceLink && row.sourceLink !== row.source ? [row.source, row.sourceLink] : [row.source]
}

// The YouTube channel IDs a row names: its CHANNEL ID cell, its source cell
// and where that links.
function channelIdsOf(row){
    return [...new Set([row.channelId, ...sourceTexts(row).flatMap(channelIdsIn)].filter(id => /^UC[A-Za-z0-9_-]{22}$/.test(id || '')))]
}

/*
 * rows -> {
 *   rows, patterns: Map(first word -> [{ name, pattern, rows }]),
 *   exact: Map(key -> [{ name, pattern, rows }]), channels: Map(id -> rows),
 *   handles: Map(key -> rows), bandcamp: [rows], reverb: [{ range, batch, row }]
 * }
 */
function buildIndex(sheetRows){
    const rows = inSteadyOrder(sheetRows)
    usePreferredSpellings(preferredSpellings(rows))
    const patterns = new Map()
    const exact = new Map()
    const channels = new Map()
    const handles = new Map()
    const bandcamp = []
    const reverb = []
    const byName = new Map()
    for(const row of rows){
        row.claimers = splitPeople(row.claimedCell)
        row.suggesters = splitPeople(row.suggestedCell)
        const names = cellNames(row.fileCell)
        // A download cell sometimes holds the file name instead of a link;
        // only used when the PKLZ FILENAME cell is empty.
        if(names.length === 0 && row.downloadCell && !/:\/\//.test(row.downloadCell) && !/^\d+\/\d+\/\d+$/.test(row.downloadCell))
            names.push(...cellNames(row.downloadCell).filter(name => !/\s(?:fingerprints|zip)$/i.test(name)))
        for(const name of names){
            const pattern = parsePattern(name)
            if(!pattern)
                continue
            const id = JSON.stringify(pattern)
            if(!byName.has(id)){
                const entry = { name, pattern, rows: [] }
                byName.set(id, entry)
                addTo(patterns, firstWord(pattern), entry)
                const key = exactPatternKey(pattern)
                if(key !== null)
                    addTo(exact, key, entry)
            }
            if(!byName.get(id).rows.includes(row))
                byName.get(id).rows.push(row)
        }
        for(const id of channelIdsOf(row))
            addTo(channels, id, row)
        if(row.kind === 'youtube' || row.kind === 'dailymotion' || row.kind === 'other'){
            for(const text of sourceTexts(row)){
                const handle = handleFromCell(text)
                if(handle && handle.length >= 3)
                    addTo(handles, handle, row)
                if(row.kind !== 'youtube')
                    for(const key of sourceKeys(text))
                        addTo(handles, key, row)
            }
        }
        if(row.kind === 'bandcamp')
            bandcamp.push(row)
        if(row.kind === 'reverbnation')
            reverb.push({ range: reverbRange(row.source), batch: reverbBatch(row.fileCell), row })
    }
    return { rows, patterns, exact, channels, handles, bandcamp, reverb, entries: [...byName.values()] }
}

/* ------------------------------------------------------------------------
 * Looking a pklz up
 * --------------------------------------------------------------------- */

function entriesOfPatterns(index, tokens){
    const candidates = [...(index.patterns.get(tokens[0]) || []), ...(index.patterns.get('*') || [])]
    return candidates.filter(entry => patternMatches(entry.pattern, tokens))
}

function rowsOf(entries){
    const found = []
    for(const entry of entries)
        for(const row of entry.rows)
            if(!found.includes(row))
                found.push(row)
    return found
}

function bandcampRows(index, tokens, folders = []){
    if(tokens[0] !== 'bandcamp' || !tokens.includes('batch'))
        return []
    const years = bandcampYears(tokens)
    const yearRows = index.bandcamp.filter(row => /^\d{4}(?:\s*-\s*\d{4})?$/.test(row.source))
    if(years){
        const range = row => {
            const [from, to = from] = row.source.split(/\s*-\s*/)
            return [from, to]
        }
        const inside = yearRows.filter(row => range(row)[0] <= years[0] && years[1] <= range(row)[1])
        if(inside.length > 0)
            return inside
        return yearRows.filter(row => range(row)[0] <= years[1] && years[0] <= range(row)[1])
    }
    // Only the batch of that very tag. Without one in the name, a folder
    // named exactly like a batch of the sheet ("rock", "Indie Rock.zip",
    // "2005") says which; otherwise nobody is known.
    const tag = bandcampTag(tokens)
    if(tag)
        return index.bandcamp.filter(row => !/^\d{4}/.test(row.source) && peopleKey(row.source) === tag)
    for(const folder of folders){
        const key = peopleKey(String(folder).replace(ARCHIVE_EXTENSION, ''))
        const rows = key === '' ? [] : index.bandcamp.filter(row => peopleKey(row.source) === key)
        if(rows.length > 0)
            return rows
    }
    return []
}

function reverbRows(index, name, folders){
    if(!/^reverb[-_ ]?nation/i.test(name))
        return []
    const ids = reverbFileRange(name)
    if(ids){
        const found = index.reverb.filter(entry => entry.range && entry.range[0] <= ids[1] && ids[0] <= entry.range[1]).map(entry => entry.row)
        if(found.length > 0)
            return found
    }
    const batchRows = batch => index.reverb.filter(entry => entry.batch === batch).map(entry => entry.row)
    for(const folder of folders){
        const batch = reverbBatch(folder)
        if(batch !== null && batchRows(batch).length > 0)
            return batchRows(batch)
    }
    // From group 401 on, batch N holds groups 10N-9 to 10N ("reverbnation-
    // 615-3.pklz" is in batch 62), as every batch from 41 on wzs.cosine.club does.
    const group = /^reverbnation-(\d+)-\d+$/i.exec(name.replace(/\.pklz$/i, ''))
    if(group && Number(group[1]) >= 401)
        return batchRows(String(Math.ceil(Number(group[1]) / 10)))
    return []
}

// One letter added, missing or different between two names of at least six
// letters ("moo peel" / "mooo peel").
function closeEnough(a, b){
    if(a === b)
        return true
    if(a.length < 6 || Math.abs(a.length - b.length) > 1)
        return false
    let i = 0
    while(i < a.length && a[i] === b[i])
        i += 1
    return a.slice(i + 1) === b.slice(i + 1) || a.slice(i) === b.slice(i + 1) || a.slice(i + 1) === b.slice(i)
}

// The key, among keys (a Map), that a folder is named like: the same words,
// or one letter off in a name of at least six letters, never a number off.
function folderKeyIn(keys, folder){
    const tokens = withoutSizes(nameTokens(withoutDomainEnding(String(folder).trim())))
    const key = tokens.join(' ')
    if(key === '')
        return null
    if(keys.has(key))
        return key
    const digits = tokens.filter(isNumber).join(' ')
    const letters = tokens.filter(token => !isNumber(token)).join('')
    for(const other of keys.keys()){
        const otherTokens = other.split(' ')
        if(otherTokens.filter(isNumber).join(' ') === digits && closeEnough(letters, otherTokens.filter(token => !isNumber(token)).join('')))
            return other
    }
    return null
}

function folderEntries(index, folders){
    for(const folder of folders){
        const key = folderKeyIn(index.exact, folder)
        if(key !== null)
            return index.exact.get(key)
    }
    return []
}

/*
 * The rows of the sheet a pklz belongs to.
 * folders: names of the folders it is in, nearest first (only the ones
 * known for sure). Returns { rows, how, parts } with how one of 'name',
 * 'batch', 'channel', 'handle', 'folder', or null when the sheet has nothing.
 * parts: the rows of the way that found them, then the rows a later way
 * added for who claimed it, if one did.
 */
// Two file names that share a long enough part: "hellkammer fingerprints"
// and "hellkammer_01.pklz".
function sameFileName(file, name){
    const key = text => String(text).toLowerCase().replace(/\.pklz$/, '').replace(/[^\p{L}\p{N}]+/gu, '')
    const [a, b] = [key(file), key(name)]
    if(a === '' || b === '')
        return false
    let longest = 0
    const row = new Array(b.length + 1).fill(0)
    for(let i = 1; i <= a.length; i++){
        let previous = 0
        for(let j = 1; j <= b.length; j++){
            const kept = row[j]
            row[j] = a[i - 1] === b[j - 1] ? previous + 1 : 0
            longest = Math.max(longest, row[j])
            previous = kept
        }
    }
    return longest >= Math.min(8, a.length, b.length)
}

function sheetRowsFor(index, name, folders = []){
    const found = findSheetRows(index, name, folders)
    const claimersOf = rowClaimersFor(index, found.rows, name)
    // A row found by the channel that names other PKLZ files does not say
    // who made this pklz.
    if(found.how === 'handle' || found.how === 'channel')
        for(const row of found.parts[0] || []){
            const files = cellNames(row.fileCell)
            if(files.length > 0 && !namesPklz(files, name) && !files.some(file => sameFileName(file, name)))
                claimersOf.set(row, [])
        }
    // A file of a pack whose makers are known (it is in the pack's folder, or
    // its rows only list the pack), or in one of OWN_FOLDERS, is theirs
    // alone.
    const listsOnlyPack = row => {
        const files = cellNames(row.fileCell)
        return sheetMakersOf(files).length > 0 && !files.some(file => sheetMakersOf([file]).length === 0 && namesPklz([file], name))
    }
    const inFolder = [...new Set([...sheetMakersOf(folders), ...siteMakersOf(folders)])]
    const named = namedMakersOf(name)
    const makers = inFolder.length > 0 ? inFolder : named.length > 0 ? named : found.rows.length > 0 && found.rows.every(listsOnlyPack) ? sheetMakersOf(found.rows.flatMap(row => cellNames(row.fileCell))) : []
    if(makers.length === 0)
        return { ...found, claimersOf }
    // Where the makers come from: the sheet when its rows already name them,
    // else a folder of wzs.cosine.club, another known folder, or the file's name.
    const fromRows = sheetCredits({ ...found, claimersOf: new Map(claimersOf) }).claimers
    const sameAsRows = fromRows.length === makers.length && makers.every(person => fromRows.some(other => other.toLowerCase() === person.toLowerCase()))
    for(const row of found.rows)
        claimersOf.set(row, [])
    const onSite = siteMakersOf(folders.filter(folder => /^wzs\.cosine\.club\//i.test(String(folder))))
    const makerSource = sameAsRows ? null : inFolder.length === 0 ? (named.length > 0 ? 'name' : 'list') : inFolder.every(person => onSite.includes(person)) ? 'site' : 'list'
    return { ...found, how: found.how || 'folder', makers, claimersOf, makerSource }
}

function findSheetRows(index, name, folders){
    const tokens = withoutSizes(nameTokens(name))
    if(tokens.length === 0)
        return { rows: [], how: null, parts: [], makers: [] }
    const handle = handleKey(name)
    const steps = [
        ['name', () => withMakers(entriesOfPatterns(index, tokens))],
        ['batch', () => [...bandcampRows(index, tokens, folders), ...reverbRows(index, name, folders)]],
        ['channel', () => [...new Set(channelIdsIn(name).flatMap(id => index.channels.get(id) || []))]],
        ['handle', () => handle ? index.handles.get(handle) || [] : []],
        ['folder', () => withMakers(folderEntries(index, folders))]
    ]
    const withMakers = entries => Object.assign(rowsOf(entries), { makers: sheetMakersOf(entries.map(entry => entry.name)) })
    // A way that finds rows naming nobody ("Multiple Users", empty cells)
    // gives way to the next one; if none names anybody, the first rows found
    // are still returned. When the way that names somebody only names who
    // suggested it, a later way may still say who claimed it: its rows are
    // added for that.
    let first = null
    let found = null
    for(const [how, find] of steps){
        const rows = find()
        if(rows.length === 0)
            continue
        const credits = creditsOfRows(rows)
        if(found){
            if(credits.claimers.length > 0){
                const added = rows.filter(row => !found.rows.includes(row))
                return { rows: [...found.rows, ...added], how: found.how, parts: [found.rows, added], makers: [...found.makers, ...(rows.makers || []).filter(person => !found.makers.includes(person))] }
            }
            continue
        }
        const result = { rows: [...rows], how, parts: [rows], makers: rows.makers || [] }
        if(credits.claimers.length > 0)
            return result
        if(credits.suggesters.length > 0)
            found = result
        else if(!first)
            first = result
    }
    return found || first || { rows: [], how: null, parts: [], makers: [] }
}

// Names in many cells, most frequent first (ties: the order they came in,
// which is the steady order of the rows and the order within a cell).
function rank(lists){
    const counts = new Map()
    for(const list of lists)
        for(const name of list)
            counts.set(name, (counts.get(name) || 0) + 1)
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name)
}

function creditsOfRows(rows){
    return { claimers: rank(rows.map(row => row.claimers || splitPeople(row.claimedCell))), suggesters: rank(rows.map(row => row.suggesters || splitPeople(row.suggestedCell))) }
}

const sameNames = list => [...list].map(person => person.toLowerCase()).sort().join('\u0000')

// The names every list that names somebody has, most frequent first.
function sharedNames(lists){
    const named = lists.filter(list => list && list.length > 0)
    return rank(named).filter(person => named.every(list => list.some(other => other.toLowerCase() === person.toLowerCase())))
}

// The names when every list has the same ones, none otherwise.
function agreedNames(lists){
    if(lists.length === 0 || !lists[0] || lists[0].length === 0)
        return []
    return lists.every(list => list && sameNames(list) === sameNames(lists[0])) ? [...lists[0]] : []
}

// The names all the rows agree on.
function certainCredits(rows){
    return {
        claimers: sharedNames(rows.map(row => row.claimers || splitPeople(row.claimedCell))),
        suggesters: agreedNames(rows.map(row => row.suggesters || splitPeople(row.suggestedCell)))
    }
}

// The credits of what sheetRowsFor() found. makers: the people a sheet name
// is known to be made by (SHEET_MAKERS), first.
function sheetCredits({ rows = [], parts = [rows], makers = [], claimersOf = new Map() }){
    const forPklz = list => list.map(row => claimersOf.has(row) ? { ...row, claimers: claimersOf.get(row) } : row)
    const [main = [], added = []] = parts.map(forPklz)
    const credits = certainCredits(main)
    const claimers = credits.claimers.length > 0 ? credits.claimers : certainCredits(added).claimers
    return { claimers: [...makers, ...claimers.filter(person => !makers.some(maker => maker.toLowerCase() === person.toLowerCase()))], suggesters: credits.suggesters }
}

// Channel ID / @handle -> the credits of that one channel, for matches whose
// song path names the channel it was downloaded from.
function channelCredits(index){
    // key -> { rank, rows }: rank 0 for what a row's cells say (its channel
    // ID, its @handle), 1 for where its source cell links to. What a cell
    // says wins over a link (a row can link to another channel by mistake),
    // and rows that say the same count together, so the order of the rows
    // never changes the result.
    const found = new Map()
    const add = (key, rank, row) => {
        const known = found.get(key)
        if(!known || rank < known.rank)
            found.set(key, { rank, rows: [row] })
        else if(rank === known.rank && !known.rows.includes(row))
            known.rows.push(row)
    }
    const handleOf = text => {
        const handle = /^@([^/\s]+)$/.exec(text) || /youtube\.com\/@([^/?#\s]+)/i.exec(text)
        return handle ? `@${decodeURIComponentSafe(handle[1]).toLowerCase()}` : null
    }
    for(const row of index.rows){
        if(row.kind !== 'youtube')
            continue
        const credits = creditsOfRows([row])
        if(credits.claimers.length === 0 && credits.suggesters.length === 0)
            continue
        const cellIds = [row.channelId, ...channelIdsIn(row.source)].filter(id => /^UC[A-Za-z0-9_-]{22}$/.test(id || ''))
        for(const id of channelIdsOf(row))
            add(id, cellIds.includes(id) ? 0 : 1, row)
        const own = handleOf(row.source)
        if(own)
            add(own, 0, row)
        const linked = row.sourceLink && row.sourceLink !== row.source ? handleOf(row.sourceLink) : null
        if(linked)
            add(linked, 1, row)
    }
    const out = new Map()
    for(const [key, { rows }] of found)
        out.set(key, { ...certainCredits(rows), files: [...new Set(rows.flatMap(row => cellNames(row.fileCell)))] })
    return out
}

// Ways of naming pklz that tell who made them, whatever their rows say.
const NAMED_MAKERS = [
    { pattern: /^WZS\d+-\d+\.pklz$/i, person: 'Mystic65' },
    { pattern: /^Watzatsong-\d{8}-\d+\.pklz$/i, person: 'Numerophobe' }
]
function namedMakersOf(name){
    return [...new Set(NAMED_MAKERS.filter(rule => rule.pattern.test(String(name ?? ''))).map(rule => rule.person))]
}

// Stored song paths that tell who made a pklz. own: counts over the sheet;
// the rest only when nothing else says who made it, or to tell which of the
// people it names made it.
const PATH_MAKERS = [
    { pattern: /^[CD]:[\\/]File Dump[\\/]/i, person: 'AzureBlast' },
    { pattern: /[\\/]users[\\/]cr1tika7(?:[\\/]|$)/i, person: 'Cr1TiKa7', own: true },
    { pattern: /^D:[\\/]podzielone[\\/]/i, person: 'Kurty' },
    { pattern: /^\/home\/neleighties\//i, person: 'Nel', own: true },
    { pattern: /^E:[\\/](?:lostwave|music)[\\/]/i, person: 'Nel' },
    { pattern: /^X:[\\/]WFMU[\\/]/i, person: 'polymood' },
    { pattern: /^C:[\\/]Users[\\/]Sam[\\/]/i, person: 'Rocket' },
    { pattern: /^F:[\\/]Fingerprints[\\/]/, person: 'SDB' },
    { pattern: /liberato[\s._-]*toscanelli/i, person: 'some random account', own: true },
    { pattern: /^C:[\\/]Fingerprints[\\/][^\\/]+-UC[\w-]{22}(?:_PART\d+)?[\\/]/, person: 'some random account' },
    { pattern: /^(?:D:[\\/](?:FileDumps|Fingerprinting)|C:[\\/]Users[\\/]David)[\\/]/i, person: 'weezytweezy' }
]

// File name styles only one person uses: they tell which of a row's
// claimers made a file, never anybody else.
const NAMING_STYLES = [
    { pattern: /_\d{4}-\d{4}\.pklz$/i, person: 'AzureBlast' },
    { pattern: /^yt-.+-\d{2}-\d+min\.pklz$/i, person: 'Numerophobe' }
]

function pathMakersOf(path, { own = false } = {}){
    const text = String(path ?? '').normalize('NFKC')
    return [...new Set(PATH_MAKERS.filter(rule => Boolean(rule.own) === own && rule.pattern.test(text)).map(rule => rule.person))]
}

// Who among a row's claimers made this pklz. A row can name several people
// who each fingerprinted the source on their own, with each one's files in
// its PKLZ FILENAME cell. A file belongs to whoever its name surely names,
// and an archive listed on several rows to whoever every one of those rows
// names; the other claimers did the row's other files. Without any of that,
// all the claimers stay.
function claimersForPklz({ claimers = [], files = [], pklzName, archiveOwners = () => [] }){
    if(claimers.length < 2)
        return claimers
    const among = list => claimers.filter(person => list.some(other => other.toLowerCase() === person.toLowerCase()))
    const surely = text => {
        const { people, possibly } = peopleWithCertainty(text)
        return possibly ? [] : among(people)
    }
    const own = surely(pklzName)
    if(own.length > 0)
        return own
    const styled = among(NAMING_STYLES.filter(style => style.pattern.test(String(pklzName ?? ''))).map(style => style.person))
    if(styled.length > 0)
        return styled
    const family = familyOf(pklzName)
    const alone = family?.alone ? among(family.fingerprinters) : []
    if(alone.length > 0)
        return alone
    const archive = file => ARCHIVE_EXTENSION.test(file) && !/\.pklz$/i.test(file)
    const sure = new Map(files.map(file => [file, archive(file) ? among(archiveOwners(file)) : surely(file)]))
    const without = taken => {
        const rest = claimers.filter(person => !taken.includes(person))
        return rest.length > 0 ? rest : claimers
    }
    const ownersOf = file => sure.get(file).length > 0 ? sure.get(file) : without(files.filter(other => other !== file).flatMap(other => sure.get(other)))
    const matched = files.filter(file => namesPklz([file], pklzName))
    const from = matched.length > 0 ? matched : files.filter(archive)
    if(from.length === 0)
        return without(files.flatMap(file => sure.get(file)))
    const owners = from.flatMap(ownersOf)
    return claimers.filter(person => owners.includes(person))
}

// Map(row -> its claimers for this pklz), for the rows where that is fewer
// than the row names.
function rowClaimersFor(index, rows, pklzName){
    if(!index.archiveOwners){
        const listing = new Map()
        for(const row of index.rows)
            for(const file of cellNames(row.fileCell)){
                const key = file.toLowerCase()
                if(!listing.has(key))
                    listing.set(key, [])
                listing.get(key).push(row.claimers || splitPeople(row.claimedCell))
            }
        index.archiveOwners = file => sharedNames(listing.get(file.toLowerCase()) || [])
    }
    const out = new Map()
    for(const row of rows){
        const claimers = row.claimers || splitPeople(row.claimedCell)
        const mine = claimersForPklz({ claimers, files: cellNames(row.fileCell), pklzName, archiveOwners: index.archiveOwners })
        if(mine.length < claimers.length)
            out.set(row, mine)
    }
    return out
}

// Whether one of the PKLZ FILENAME names of the sheet is this pklz.
function namesPklz(files, pklzName){
    const tokens = withoutSizes(nameTokens(pklzName))
    if(tokens.length === 0)
        return false
    return (files || []).some(file => {
        const pattern = parsePattern(file)
        return Boolean(pattern) && patternMatches(pattern, tokens)
    })
}

module.exports = {
    ROW_FIELDS,
    ARCHIVE_EXTENSION,
    buildIndex,
    canonicalPerson,
    cellNames,
    channelCredits,
    channelIdsIn,
    mergeRows,
    rowKeys,
    cleanPersonText,
    compareNumbers,
    agreedNames,
    certainCredits,
    claimersForPklz,
    creditsOfRows,
    namesPklz,
    pathMakersOf,
    sheetCredits,
    decodeEntities,
    decodeURIComponentSafe,
    exactFamilyOf,
    exactPatternKey,
    FAMILIES,
    familyOf,
    folderFamilyOf,
    folderKeyIn,
    folderName,
    handleFromCell,
    handleKey,
    isNumber,
    isNumberOnly,
    isNumbering,
    isPlainFolder,
    isRootFolder,
    nameKey,
    namedFolders,
    nameStem,
    nameTokens,
    parseCsv,
    parsePattern,
    patternMatches,
    PEOPLE,
    peopleIn,
    peopleKey,
    peopleWithCertainty,
    rank,
    readSheetBuffer,
    readSheetHtml,
    readSheetPaths,
    readTabs,
    readXlsx,
    reverbRange,
    SheetFileError,
    sharedNames,
    sheetMakersOf,
    OWN_FOLDER_PARENTS,
    sameFileName,
    siteMakersOf,
    sheetRowsFor,
    splitPeople,
    unzip,
    usePreferredSpellings,
    withoutSizes
}
