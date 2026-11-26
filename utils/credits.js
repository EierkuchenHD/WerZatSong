/*
 * pklz credits: who fingerprinted the pklz a match came from and who
 * suggested its source. The rules (names, people, packs, reading the sheet)
 * are in utils/creditsRules.js; this file has the credits themselves.
 *
 * WHERE THEY COME FROM
 *   resources/credits/pklz-credits.tsv  the credits WerZatSong comes with,
 *                                       one line per pklz (then the sheet's
 *                                       YouTube channels, the folder of the
 *                                       pklz the sheet only matches by
 *                                       folder, and every row the sheet has
 *                                       had), built by npm run credits:build
 *                                       and kept up to date by the hourly
 *                                       GitHub workflow update-credits.yml
 *   cache/credits-sheet.tsv             what the sheet said at the last
 *                                       update that the above does not
 *   credits-overrides.tsv               optional, local only: wins over all
 *
 * THE ONLINE SHEET
 *   A search never downloads anything. When some results have credits nobody
 *   is known for, it says to run update-credits (npm run credits:update).
 *   That downloads the sheet (CREDITS_SHEET) as .xlsx, only ever reading it,
 *   adds its rows to the ones already known (a deleted row stays, an edited
 *   one counts as it is now, a cell left empty erases no name), looks every
 *   pklz up again (the map's, and the ones only the local database has) and keeps
 *   what differs in cache/credits-sheet.tsv. A sheet that names someone else
 *   for a lot of sources at once changes nothing without --force. Then it
 *   fills in the credits nobody knew in the result files in logs.
 *
 * LOOKING A MATCH UP (first that works)
 *   1. the pklz's name in the map; "name_1.pklz" (what the database's rename
 *      script makes of a second "name.pklz") gets the credits of "name.pklz"
 *      if every known file of that name agrees; then a sheet name the pklz
 *      is a part of ("vol-600:719" for "vol-650");
 *   2. for a merged shard, the pklz its matched track came from
 *      (<shard>.sources.json, see writeMergeSources);
 *   3. a folder the pklz is in, named like a sheet name;
 *   4. sure: a person's name in the file name, a known pack, a folder named
 *      after a person. Possibly, and the line says so: a folder known to be
 *      one person's, a short name with other words in the file or folder
 *      name, other pklz named the same way all made by the same people.
 *   Then, if the matched song's path names its YouTube channel (a channel ID,
 *   or an @handle or yt-handle folder) and the sheet has that channel, its
 *   row is used too (see resolveCredit).
 *
 * Several rows or lines only give the names they all agree on.
 *
 * The sheet comes first: who claimed a source on the sheet is shown as who
 * fingerprinted it, and names in file or folder names count only when the
 * sheet has nobody. credits-overrides.tsv wins over the sheet.
 */

const { createHash } = require('node:crypto')
const { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, unlinkSync, writeFileSync } = require('node:fs')
const { basename, dirname, isAbsolute, join, relative, sep } = require('node:path')
const {
    ROW_FIELDS,
    buildIndex,
    channelCredits,
    channelIdsIn,
    exactFamilyOf,
    exactPatternKey,
    familyOf,
    folderFamilyOf,
    folderKeyIn,
    folderName,
    agreedNames,
    isNumberOnly,
    isRootFolder,
    mergeRows,
    nameKey,
    namedFolders,
    claimersForPklz,
    namesPklz,
    pathMakersOf,
    nameStem,
    nameTokens,
    parsePattern,
    patternMatches,
    peopleWithCertainty,
    readSheetBuffer,
    readTabs,
    sharedNames,
    sheetCredits,
    sheetMakersOf,
    sheetRowsFor,
    withoutSizes
} = require('./creditsRules')
const consts = require('./consts')
const { listPklz, partsInside } = require('./database')
const { LANGUAGES, fill, stringsFile, t } = require('./i18n')
const { info, success, warning } = require('./messages')
const { creditFilesSay, scanDatabase } = require('./creditFiles')

/*
 * The pklz credits map: one line per pklz with who fingerprinted it, who
 * claimed it in the sheet and who suggested its source.
 *
 *   pklz <tab> fingerprinters <tab> claimers <tab> suggesters
 *
 * Several names are separated by ", ". A blank field means nobody is known.
 * Lines starting with # are comments.
 *
 * A first field ending in .pklz is one file. Anything else is a name as the
 * sheet writes it ("azureblast-variety-mix-vol-600:719",
 * "ChannelMix-numerophobe-90-X-5min", "yt-sunnyboy66"), which also covers the
 * numbered parts of that name, so a pklz the map has never seen still gets
 * credits when the sheet lists it.
 *
 * The sheet comes first: the fingerprinters field is only filled (from the
 * file's own name, the folder it is in, or a known kind of file) when the
 * sheet has nobody in CLAIMED BY, and only shown then.
 */


const HEADER = 'pklz\tfingerprinters\tclaimers\tsuggesters'
const FIELDS = ['fingerprinters', 'claimers', 'suggesters']
// Where a credit comes from. A credits file line can end with the source of
// who made it and of who suggested it, when it is not the usual one (the
// sheet for claimers and suggesters, the built-in lists for fingerprinters).
const SOURCES = new Set(['file', 'overrides', 'sheet', 'site', 'list', 'name', 'folder', 'path'])
const sourceCell = text => SOURCES.has(cleanName(text)) ? cleanName(text) : null

const isFileName = name => /\.pklz$/i.test(name)

function cleanName(text){
    return String(text ?? '').replace(/[\t\r\n]+/g, ' ').replace(/\s+/g, ' ').trim()
}

function splitField(text){
    return String(text ?? '').split(',').map(cleanName).filter(Boolean)
}

// Map(key -> { name, fingerprinters, claimers, suggesters }), from the text
// of a map or its lines.
function parseMap(text){
    const entries = new Map()
    for(const line of Array.isArray(text) ? text : String(text).split(/\r?\n/)){
        if(line.trim() === '' || line.startsWith('#') || line === HEADER)
            continue
        const [name, ...fields] = line.split('\t')
        const entry = { name: cleanName(name) }
        if(entry.name === '')
            continue
        FIELDS.forEach((field, i) => { entry[field] = splitField(fields[i]) })
        const madeFrom = sourceCell(fields[3])
        const suggestedFrom = sourceCell(fields[4])
        if(madeFrom)
            entry.source = madeFrom
        if(suggestedFrom)
            entry.suggestedFrom = suggestedFrom
        const key = entryKey(entry.name)
        if(key === '')
            continue
        entries.set(key, entries.has(key) ? mergeEntry(entries.get(key), entry) : entry)
    }
    return entries
}

// The pklz lines of a credits file (see "The credits file" below).
function readMap(path){
    return readCredits(path).map
}

// Files and sheet names never share a key: a file is "f:" + its tokens.
function entryKey(name){
    const tokens = nameKey(name)
    if(tokens === '')
        return ''
    return isFileName(name) ? `f:${tokens}` : `n:${name.toLowerCase().replace(/\.pklz$/i, '').replace(/\s+/g, ' ').trim()}`
}

// Later fields win when they name somebody; a blank never erases.
function mergeEntry(base, update){
    const out = { name: base.name }
    for(const field of FIELDS)
        out[field] = update[field] && update[field].length > 0 ? [...update[field]] : [...(base[field] || [])]
    // The sheet comes first: with claimers, the fingerprinters field is not used.
    if(out.claimers.length > 0)
        out.fingerprinters = []
    const made = entry => (entry.claimers || []).length > 0 || (entry.fingerprinters || []).length > 0
    const source = made(update) ? update.source : base.source
    const suggestedFrom = (update.suggesters || []).length > 0 ? update.suggestedFrom : base.suggestedFrom
    if(source)
        out.source = source
    if(suggestedFrom)
        out.suggestedFrom = suggestedFrom
    return out
}

// A pklz looked up in the sheet again: what the sheet says now replaces what
// it said before. The fingerprinters (from file and folder names) stay when
// nothing new is known. When the sheet has no rows about it at all
// (fromSheet: false), nothing is taken away.
function withSheet(base, update){
    if(update.fromSheet === false)
        return mergeEntry(base, update)
    const claimers = [...(update.claimers || [])]
    const fingerprinters = claimers.length > 0 ? [] : (update.fingerprinters || []).length > 0 ? [...update.fingerprinters] : [...(base.fingerprinters || [])]
    const source = claimers.length > 0 || (update.fingerprinters || []).length > 0 ? update.source : base.source
    const out = { name: base.name, fingerprinters, claimers, suggesters: [...(update.suggesters || [])] }
    if(source)
        out.source = source
    if(update.suggestedFrom)
        out.suggestedFrom = update.suggestedFrom
    return out
}

// The lines of an update replace the ones they are about.
function mergeMaps(base, update){
    const out = new Map(base)
    for(const [key, entry] of update)
        out.set(key, withSheet(entry, entry))
    return out
}

function isEmpty(entry){
    return FIELDS.every(field => !entry[field] || entry[field].length === 0)
}

// keepEmpty: also the sheet names with nobody on them (an update says so
// when the sheet no longer agrees on anybody for one).
function serializeMap(entries, comments = [], keepEmpty = false){
    const files = []
    const names = []
    for(const entry of entries.values()){
        // Every known pklz gets a line, even with nobody on it yet.
        if(isEmpty(entry) && !isFileName(entry.name) && !keepEmpty)
            continue
        const fingerprinters = entry.claimers && entry.claimers.length > 0 ? [] : entry.fingerprinters || []
        const cells = [entry.name, fingerprinters.join(', '), (entry.claimers || []).join(', '), (entry.suggesters || []).join(', ')]
        if(entry.source || entry.suggestedFrom)
            cells.push(entry.source || '')
        if(entry.suggestedFrom)
            cells.push(entry.suggestedFrom)
        const line = cells.join('\t')
        ;(isFileName(entry.name) ? files : names).push([entry.name.toLowerCase(), line])
    }
    const sort = list => list.sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0).map(([, line]) => line)
    return [
        ...comments.map(comment => `# ${comment}`.trimEnd()),
        HEADER,
        ...sort(files),
        '# Names as the sheet writes them. They also cover numbered parts ("name-3.pklz", "name #3") and the',
        '# ranges and X placeholders the sheet uses.',
        ...sort(names)
    ].join('\n') + '\n'
}

function writeFileAtomic(path, text){
    mkdirSync(dirname(path), { recursive: true })
    const partial = `${path}.${process.pid}.partial`
    try {
        writeFileSync(partial, text, 'utf-8')
        renameSync(partial, path)
    }
    catch(error){
        try { unlinkSync(partial) }
        catch { /* never written */ }
        throw error
    }
}

function writeMap(path, entries, comments){
    writeCredits(path, { map: entries, comments })
}

/* ------------------------------------------------------------------------
 * Looking up
 * --------------------------------------------------------------------- */

// The map made ready to look pklz up in: file names by key, sheet names by
// their first word.
// The database's rename script gives a second file called "name.pklz" the
// name "name_1.pklz" (or _2, _3, ... until the name is free), so a copy can
// be told apart from its original.
const RENAMED = /^(.*)_\d+(\.pklz)?$/i

function indexMap(entries){
    const files = new Map()
    const names = new Map()
    const plain = new Map()
    // Sheet names with numbers too ("disk-5").
    const exact = new Map()
    // original's key -> every known file of that name, the original included
    const copies = new Map()
    for(const [key, entry] of entries){
        if(key.startsWith('f:')){
            files.set(key.slice(2), entry)
            for(let base = entry.name, match; (match = RENAMED.exec(base)); ){
                base = `${match[1]}.pklz`
                const original = nameKey(base)
                if(!copies.has(original))
                    copies.set(original, [])
                copies.get(original).push(entry)
            }
            continue
        }
        const pattern = parsePattern(entry.name)
        if(!pattern)
            continue
        const exactKey = exactPatternKey(pattern)
        if(exactKey !== null && !exact.has(exactKey))
            exact.set(exactKey, entry)
        const first = pattern[0].kind === 'word' ? pattern[0].value : '*'
        if(!names.has(first))
            names.set(first, [])
        names.get(first).push({ pattern, entry })
        if(pattern.every(part => part.kind === 'word'))
            plain.set(pattern.map(part => part.value).join(' '), entry)
    }
    return { files, names, plain, copies, exact }
}

const makersOf = entry => JSON.stringify(entry.claimers.length > 0 ? entry.claimers : entry.fingerprinters)

// The entry of one file name, or the entries of the sheet names it belongs
// to (all of them: a part of "vol-600:719" is also a part of "vol-600:847").
function findInMap(index, name){
    const key = nameKey(name)
    if(index.files.has(key))
        return [index.files.get(key)]
    // "name_1.pklz": a copy of "name.pklz". It gets the original's credits
    // only when all the known files of that name were made by the same
    // people: "1.pklz" in two folders can be two people's.
    for(let base = name, match; (match = RENAMED.exec(base)); ){
        base = `${match[1]}.pklz`
        const original = index.files.get(nameKey(base))
        if(!original)
            continue
        const known = [original, ...(index.copies?.get(nameKey(base)) || [])].filter(entry => makersOf(entry) !== '[]')
        if(known.length > 0 && known.every(entry => makersOf(entry) === makersOf(known[0])))
            return [original]
        break
    }
    const tokens = withoutSizes(nameTokens(name))
    if(tokens.length === 0)
        return []
    const candidates = [...(index.names.get(tokens[0]) || []), ...(index.names.get('*') || [])]
    return candidates.filter(candidate => patternMatches(candidate.pattern, tokens)).map(candidate => candidate.entry)
}

// The sheet name a folder is named like ("WFMU_FINGERPRINTS"), the same way
// credits:build matches folders (folderKeyIn in utils/creditsRules.js).
function findFolderInMap(index, folder){
    const key = folderKeyIn(index.plain, folder)
    return key !== null ? [index.plain.get(key)] : []
}

/*
 * The credits of a pklz named with numbers only, from its folders (nearest
 * first): the first folder with a name ("gymforma", not "disk-2") that is
 * named like a sheet name. When there is no folder with a name at all, a
 * numbered folder named like a sheet name ("disk-5") is only possibly it.
 * -> { entries, possibly }
 */
function findNumberedInFolders(index, folders){
    for(const folder of namedFolders(folders)){
        const key = folderKeyIn(index.exact, folder)
        if(key !== null)
            return { entries: [index.exact.get(key)], possibly: false }
    }
    if(namedFolders(folders).length === 0){
        for(const folder of folders.filter(folder => !isRootFolder(folder))){
            const key = folderKeyIn(index.exact, folderName(folder))
            if(key !== null)
                return { entries: [index.exact.get(key)], possibly: true }
        }
    }
    return { entries: [], possibly: false }
}


// The pklz credits sheet (Lostwave Fingerprints). A link to it, its ID or a
// "Publish to the web" link all work. It is also the link the result files
// point people to. Empty: no online check, only the map that comes with
// WerZatSong.
const CREDITS_SHEET = 'https://docs.google.com/spreadsheets/d/1JtbAJhd78Ji18LMKVmKrRbGEq_Q1zB7SrnIbCXrihxc/edit?usp=sharing'

// What to run to get the newest credits, on this computer. "sh" works even
// when the file lost its permission to run (copied from Windows or a zip).
const UPDATE_LAUNCHER = process.platform === 'win32' ? 'update-credits.cmd' : 'sh update-credits.sh'


const ROOT = join(__dirname, '..')
// The credits WerZatSong comes with: one file.
const SHIPPED_MAP = join(ROOT, 'resources', 'credits', 'pklz-credits.tsv')
const SHEET_MAP = join(ROOT, 'cache', 'credits-sheet.tsv')
const OVERRIDES = join(ROOT, 'credits-overrides.tsv')

const DOWNLOAD_TIMEOUT_MS = 45 * 1000
const MAX_DOWNLOAD_BYTES = 64 * 1024 * 1024

const MAP_COMMENTS = [
    'WerZatSong pklz credits.',
    'pklz <tab> fingerprinters <tab> claimers <tab> suggesters. Several names are separated by ", ", blank = nobody known.',
    'claimers and suggesters are the names all the sheet\'s rows about it agree on. fingerprinters is only filled, and only shown, when the',
    'sheet has nobody in CLAIMED BY: it then comes from the file or folder name, or from a known kind of file.',
    'Built by npm run credits:build (scripts/credits.js). Lines are only ever added or updated, never taken out.',
    'Further down: the YouTube channels of the sheet, pklz the sheet only knows by their folder, and every row the sheet has had.'
]

/* ------------------------------------------------------------------------
 * The credits file
 *
 * resources/credits/pklz-credits.tsv (and cache/credits-sheet.tsv, the same
 * way) is one file:
 *   pklz <tab> fingerprinters <tab> claimers <tab> suggesters, one per pklz,
 *     then the sheet's own names the same way;
 *   after "channel <tab> claimers <tab> suggesters": the YouTube channels of
 *     the sheet, by channel ID or @handle, for a matched song whose path
 *     names the channel it came from;
 *   after "pklz <tab> folders": the pklz the sheet only matches by the folder
 *     they are in ("Volume-1 & 2", Reverbnation batches 1 to 40), and that
 *     folder, as a search reading the sheet again does not know it;
 *   after "row <tab> kind <tab> ...": every row the sheet has had, the cells
 *     the credits come from. Rows taken off the sheet stay here, so what they
 *     said is never forgotten; an edited row replaces what was there.
 * --------------------------------------------------------------------- */

const CHANNELS_HEADER = 'channel\tclaimers\tsuggesters'
const FOLDERS_HEADER = 'pklz\tfolders'
const ROW_COLUMNS = ['row', 'kind', 'source', 'link', 'channel id', 'status', 'claimed by', 'suggested by', 'pklz filename', 'download link']
const ROWS_HEADER = ROW_COLUMNS.join('\t')
const ROW_COMMENTS = [
    'Every row of the Lostwave Fingerprints sheet the credits come from, deleted ones too.',
    'Tabs, new lines and backslashes in a cell are written as \\t, \\n and \\\\.'
]
const escapeCell = text => String(text ?? '').replace(/\\/g, '\\\\').replace(/\t/g, '\\t').replace(/\r?\n|\r/g, '\\n')
const unescapeCell = text => String(text).replace(/\\(\\|t|n)/g, (_, code) => code === 't' ? '\t' : code === 'n' ? '\n' : '\\')
const CHANNEL_COMMENTS = [
    'YouTube channels: who claimed and who suggested each one on the sheet, by channel ID or @handle,',
    'then the PKLZ FILENAME names of its rows. Used when the path of a matched song names the channel',
    'it was downloaded from.'
]
const FOLDER_COMMENTS = [
    'pklz the sheet only matches by the folder they are in, and that folder.'
]

function parseCredits(text){
    const mapLines = []
    const channels = new Map()
    const folderLines = []
    const rowLines = []
    let section = 'map'
    const sections = new Map([[HEADER, 'map'], [CHANNELS_HEADER, 'channels'], [FOLDERS_HEADER, 'folders'], [ROWS_HEADER, 'rows']])
    for(const line of String(text).split(/\r?\n/)){
        if(sections.has(line)){
            section = sections.get(line)
            continue
        }
        if(line.trim() === '' || line.startsWith('#'))
            continue
        if(section === 'map')
            mapLines.push(line)
        else if(section === 'channels'){
            const [channel, claimers = '', suggesters = '', ...files] = line.split('\t')
            const split = field => field === '' ? [] : field.split(',').map(name => name.trim()).filter(Boolean)
            if(channel.trim() !== '')
                channels.set(channel.trim(), { claimers: split(claimers), suggesters: split(suggesters), files: files.map(file => file.trim()).filter(Boolean) })
        }
        else if(section === 'folders')
            folderLines.push(line)
        else
            rowLines.push(line)
    }
    const state = /^# updated (\S+) sha256 (\S+)(?: rules (\d+))?/m.exec(text)
    return { map: parseMap(mapLines), channels, folderLines, folders: null, rowLines, rows: null, updated: state?.[1] || null, hash: state?.[2] || null, rules: Number(state?.[3] || 0) }
}

// The sheet rows, only read when an update or a build needs them.
function parseRows(lines){
    const rows = []
    for(const line of lines){
        const [key, ...cells] = line.split('\t').map(unescapeCell)
        if(key.trim() === '')
            continue
        rows.push({ key, ...Object.fromEntries(ROW_FIELDS.map((field, at) => [field, cells[at] ?? ''])) })
    }
    return rows
}

// The folder lines, only read when an update or a build needs them.
function parseFolders(lines){
    const folders = new Map()
    for(const line of lines){
        const [name, ...list] = line.split('\t')
        const kept = list.map(folder => folder.trim()).filter(Boolean)
        if(name.trim() !== '' && kept.length > 0)
            folders.set(entryKey(name.trim()), { name: name.trim(), folders: kept })
    }
    return folders
}

// Read once per change: a search and an update read the same file more than once.
const readFiles = new Map()

function readCredits(path){
    let stat
    try { stat = statSync(path) }
    catch(error){
        if(error.code === 'ENOENT')
            return { map: new Map(), channels: new Map(), folders: new Map(), rows: [], updated: null, hash: null, rules: 0 }
        throw error
    }
    const stamp = `${stat.mtimeMs}:${stat.size}`
    let known = readFiles.get(path)
    if(!known || known.stamp !== stamp){
        known = { stamp, parsed: parseCredits(readFileSync(path, 'utf-8')) }
        readFiles.set(path, known)
    }
    // Copies: whoever reads may add to them.
    const parsed = known.parsed
    return {
        get map(){ return new Map(parsed.map) },
        get channels(){ return new Map(parsed.channels) },
        get folders(){
            parsed.folders = parsed.folders || parseFolders(parsed.folderLines)
            return new Map(parsed.folders)
        },
        get rows(){
            parsed.rows = parsed.rows || parseRows(parsed.rowLines)
            return parsed.rows.map(row => ({ ...row }))
        },
        updated: parsed.updated,
        hash: parsed.hash,
        rules: parsed.rules
    }
}

const readChannels = path => readCredits(path).channels
const readFolders = path => readCredits(path).folders
const readRows = path => readCredits(path).rows

// state: { updated, hash } of the last update, for cache/credits-sheet.tsv.
function writeCredits(path, { map = new Map(), channels = null, folders = null, rows = null, comments = [], state = null }){
    const lines = comments.map(comment => `# ${comment}`.trimEnd())
    if(state)
        lines.push(`# updated ${state.updated} sha256 ${state.hash} rules ${CREDIT_RULES}`)
    lines.push(serializeMap(map, [], Boolean(state)).trimEnd())
    if(channels && channels.size > 0){
        lines.push(...CHANNEL_COMMENTS.map(comment => `# ${comment}`), CHANNELS_HEADER)
        for(const channel of [...channels.keys()].sort()){
            const { claimers, suggesters, files = [] } = channels.get(channel)
            lines.push([channel, claimers.join(', '), suggesters.join(', '), ...files.map(file => String(file).replace(/\s+/g, ' ').trim())].join('\t'))
        }
    }
    if(folders && folders.size > 0){
        lines.push(...FOLDER_COMMENTS.map(comment => `# ${comment}`), FOLDERS_HEADER)
        const entries = [...folders.values()].sort((a, b) => a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1)
        for(const { name, folders: list } of entries)
            lines.push([name, ...list].join('\t'))
    }
    if(rows && rows.length > 0){
        lines.push(...ROW_COMMENTS.map(comment => `# ${comment}`), ROWS_HEADER)
        for(const row of [...rows].sort((a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0))
            lines.push([row.key, ...ROW_FIELDS.map(field => row[field])].map(escapeCell).join('\t'))
    }
    readFiles.delete(path)
    writeFileAtomic(path, lines.join('\n') + '\n')
}

/* ------------------------------------------------------------------------
 * Name trends
 *
 * pklz named the same way, numbers aside ("dnalounge-1552", "dnalounge-7"),
 * that were all made by the same people. A new pklz named that way is
 * possibly theirs when nothing else knows it. Learnt from the credits the
 * first time a search needs one.
 * --------------------------------------------------------------------- */

// At least this many pklz named that way, all by the same people; or this
// many and nearly all of them.
const TREND_ALL = 3
const TREND_MOST = { files: 20, share: 0.95 }

function learnTrends(map){
    const stems = new Map()
    for(const entry of map.values()){
        // Credited one file at a time on purpose: nothing to learn from.
        if(!/\.pklz$/i.test(entry.name))
            continue
        const tokens = nameTokens(entry.name)
        if(exactFamilyOf(entry.name, tokens))
            continue
        const stem = nameStem(entry.name, tokens)
        const makers = entry.claimers.length > 0 ? entry.claimers : entry.fingerprinters
        if(!stem || makers.length === 0)
            continue
        if(!stems.has(stem))
            stems.set(stem, new Map())
        const counts = stems.get(stem)
        const key = makers.join('\t')
        counts.set(key, (counts.get(key) || 0) + 1)
    }
    const trends = new Map()
    for(const [stem, counts] of stems){
        const total = [...counts.values()].reduce((sum, count) => sum + count, 0)
        const [makers, count] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]
        if((count === total && total >= TREND_ALL) || (total >= TREND_MOST.files && count / total >= TREND_MOST.share))
            trends.set(stem, { makers: makers.split('\t'), files: total })
    }
    return trends
}

// The name trends of the loaded credits, learnt the first time one is needed.
function trendsOf(loaded){
    if(!loaded.trends)
        loaded.trends = learnTrends(loaded.map)
    return loaded.trends
}


/* ------------------------------------------------------------------------
 * Downloading the sheet
 * --------------------------------------------------------------------- */

// A sheet link, a bare sheet ID or a "Publish to the web" link -> the link
// of the whole spreadsheet as .xlsx.
function downloadUrl(setting){
    const value = String(setting ?? '').trim()
    if(value === '')
        return null
    const published = /docs\.google\.com\/spreadsheets\/d\/e\/([a-zA-Z0-9_-]+)/.exec(value)
    if(published)
        return `https://docs.google.com/spreadsheets/d/e/${published[1]}/pub?output=xlsx`
    const sheet = /docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/.exec(value)
    if(sheet)
        return `https://docs.google.com/spreadsheets/d/${sheet[1]}/export?format=xlsx`
    if(/^[a-zA-Z0-9_-]{25,}$/.test(value))
        return `https://docs.google.com/spreadsheets/d/${value}/export?format=xlsx`
    return value
}

class DownloadError extends Error {
    constructor(reason, detail = {}){
        super(reason)
        this.reason = reason
        Object.assign(this, detail)
    }
}

async function fetchBytes(url){
    const response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS) })
    if(response.status !== 200){
        await response.body?.cancel().catch(() => {})
        throw new DownloadError('http', { status: response.status })
    }
    const chunks = []
    let size = 0
    for await(const chunk of response.body){
        size += chunk.length
        if(size > MAX_DOWNLOAD_BYTES)
            throw new DownloadError('too_big')
        chunks.push(chunk)
    }
    return Buffer.concat(chunks)
}

// The sheet's file, as Google sends it. Throws a DownloadError with a reason.
async function fetchSheet(setting = CREDITS_SHEET){
    const url = downloadUrl(setting)
    if(!url)
        throw new DownloadError('not_configured')
    const bytes = await fetchBytes(url)
    // A private sheet answers with Google's sign-in page instead.
    if(/^\s*</.test(bytes.subarray(0, 64).toString('utf-8')) && /accounts\.google\.com|ServiceLogin/i.test(bytes.toString('utf-8')))
        throw new DownloadError('private')
    return bytes
}

// The tabs in a downloaded sheet file.
function readSheetFile(bytes){
    let tabs
    try { tabs = readSheetBuffer(bytes) }
    catch(error){ throw new DownloadError('unreadable', { detail: error.message }) }
    if(readTabs(tabs).length === 0)
        throw new DownloadError('unreadable', { detail: t('credits_reason_no_tabs') })
    return tabs
}

const hashOf = bytes => createHash('sha256').update(bytes).digest('hex')

// The sheet as tabs. Throws a DownloadError with a reason.
async function downloadSheet(setting = CREDITS_SHEET){
    const bytes = await fetchSheet(setting)
    return { tabs: readSheetFile(bytes), hash: hashOf(bytes) }
}

function reasonText(error){
    switch(error?.reason){
        case 'not_configured': return t('credits_reason_not_configured')
        case 'http': return t('credits_reason_http', { status: error.status })
        case 'too_big': return t('credits_reason_too_big', { size: Math.round(MAX_DOWNLOAD_BYTES / 1024 / 1024) })
        case 'private': return t('credits_reason_private')
        case 'unreadable': return t('credits_reason_unreadable', { detail: error.detail })
    }
    if(error?.name === 'TimeoutError' || error?.name === 'AbortError')
        return t('credits_reason_timeout', { seconds: DOWNLOAD_TIMEOUT_MS / 1000 })
    return t('credits_reason_network', { error: error?.cause?.message || error?.message || String(error) })
}

/*
 * cache/credits-sheet.tsv: what the last update-credits found on the sheet
 * that differs from the credits WerZatSong comes with, in one file. pklz
 * lines (same format as the map), then channel lines after a
 * "channel <tab> claimers <tab> suggesters" header, and when it was written
 * in a comment. Deleting it only means going back to the shipped credits
 * until the next update.
 */
const UPDATE_COMMENTS = [
    'What the Lostwave Fingerprints sheet said at the last update-credits that the credits',
    'WerZatSong comes with (resources/credits) do not. Written by utils/credits.js; lines are',
    'only ever added or updated. Delete this file to go back to the credits WerZatSong comes with.'
]

// The way credits are worked out from the rows. An update made the way
// they were worked out before only gives its rows, until the next update.
const CREDIT_RULES = 4

function readUpdates(path){
    const { map, channels, rows, updated, hash, rules } = readCredits(path)
    if(rules !== CREDIT_RULES)
        return { map: new Map(), channels: new Map(), rows, updated: null, hash: null }
    return { map, channels, rows, updated, hash }
}

function writeUpdates(path, { map, channels, rows = [], updated, hash }){
    writeCredits(path, { map, channels, rows, comments: UPDATE_COMMENTS, state: { updated, hash } })
}

const sameEntry = (a, b) => Boolean(a) && Boolean(b) && FIELDS.every(field => JSON.stringify(a[field] || []) === JSON.stringify(b[field] || []))
const sameChannel = (a, b) => Boolean(a) && Boolean(b) && JSON.stringify(a) === JSON.stringify(b)

/*
 * What the sheet says about every pklz the maps know, added on top of the
 * last update. Returns how many pklz got new or changed credits.
 *
 * Every pklz is looked up again in the sheet as it is now, so a row edited
 * since the last time gives its new names. A cell the sheet now leaves
 * empty, or a row that is gone, takes nothing away: the rows keep it.
 *
 * database: [{ name, folders }], the pklz in the database (only their names
 * and the folders they are in, nearest first). The ones the maps do not know
 * yet are looked up too, every way the sheet allows.
 */
/*
 * The rows known so far plus the sheet's (see "Remembering the rows of the
 * sheet" in utils/creditsRules.js). When the sheet names someone else as who
 * claimed or suggested more sources than edits usually change at once, it
 * may have been damaged or vandalized: nothing is changed, and the error
 * says to run again with --force if the changes are right.
 */
const suspiciousOverwrites = knownRows => Math.max(200, Math.round(knownRows * 0.05))


function rememberRows(known, sheetRows, { force = false } = {}){
    const merged = mergeRows(known, sheetRows)
    if(!force && merged.overwritten > suspiciousOverwrites(known.length)){
        const error = new Error(t('credits_sheet_suspicious', { count: merged.overwritten }))
        error.reason = 'suspicious'
        throw error
    }
    return merged
}

function applySheet(tabs, { shipped = SHIPPED_MAP, sheetMap = SHEET_MAP, database = [], hash = null, force = false } = {}){
    const shippedRows = readRows(shipped)
    const last = readUpdates(sheetMap)
    // What the last update added to the shipped rows, then the sheet.
    const known = mergeRows(shippedRows, last.rows).rows
    const merged = rememberRows(known, readTabs(tabs), { force })
    const index = buildIndex(merged.rows)
    const foldersOfPklz = readFolders(shipped)
    const inDatabase = new Map()
    for(const { name, folders } of database){
        const key = entryKey(name)
        if(key.startsWith('f:') && !inDatabase.has(key))
            inDatabase.set(key, { name, folders })
    }
    const shippedMap = readMap(shipped)
    const before = mergeMaps(shippedMap, last.map)
    const now = new Map(before)
    let changed = 0
    const update = (key, entry) => {
        const old = now.get(key)
        if(!old && isEmpty(entry))
            return
        const next = withSheet(old || { name: entry.name }, entry)
        if(!old || !sameEntry(old, next))
            changed += 1
        now.set(key, next)
    }
    for(const [key, entry] of before){
        if(!key.startsWith('f:') || isNumberOnly(entry.name))
            continue
        // The folders credits:build found it in; for a pklz only the local
        // database has, the folders it is in there.
        const folders = foldersOfPklz.get(key)?.folders || (shippedMap.has(key) ? [] : inDatabase.get(key)?.folders) || []
        update(key, lineFromSheet(entry.name, sheetRowsFor(index, entry.name, folders)))
    }
    for(const [key, { name, folders }] of inDatabase){
        // Named with numbers only: credited by its folder at search time.
        if(before.has(key) || isNumberOnly(name))
            continue
        update(key, lineFromSheet(name, sheetRowsFor(index, name, folders)))
    }
    for(const [key, { name, rows }] of sheetNames(index))
        update(key, lineFromSheet(name, { rows, makers: sheetMakersOf([name]) }))
    // Only what differs from the credits WerZatSong comes with is kept.
    const updates = new Map()
    for(const [key, entry] of now)
        if(!sameEntry(entry, shippedMap.get(key)))
            updates.set(key, entry)
    const shippedChannelMap = readChannels(shipped)
    const channels = new Map([...shippedChannelMap, ...last.channels])
    for(const [channel, credit] of channelCredits(index))
        channels.set(channel, credit)
    const channelUpdates = new Map([...channels].filter(([channel, credit]) => !sameChannel(credit, shippedChannelMap.get(channel))))
    const shippedByKey = new Map(shippedRows.map(row => [row.key, row]))
    const rowUpdates = merged.rows.filter(row => !sameRow(row, shippedByKey.get(row.key)))
    writeUpdates(sheetMap, { map: updates, channels: channelUpdates, rows: rowUpdates, updated: new Date().toISOString(), hash: hash || last.hash || '-' })
    return { changed, rows: merged }
}

// A pklz's line from what sheetRowsFor() found. When the sheet names nobody
// who made it, a name the file is surely named after or a known pack does.
function lineFromSheet(name, found){
    const entry = { name, fingerprinters: [], ...sheetCredits(found), fromSheet: found.rows.length > 0 }
    if(entry.claimers.length > 0){
        if((found.makers || []).length > 0 && found.makerSource !== null)
            entry.source = found.makerSource || 'name'
        return entry
    }
    const family = familyOf(name)
    const inName = peopleWithCertainty(name)
    if(inName.people.length > 0 && !inName.possibly)
        entry.fingerprinters = inName.people
    else if(family)
        entry.fingerprinters = [...family.fingerprinters]
    if(entry.fingerprinters.length > 0)
        entry.source = 'name'
    if(entry.suggesters.length === 0 && family && family.suggesters.length > 0){
        entry.suggesters = [...family.suggesters]
        entry.suggestedFrom = 'name'
    }
    return entry
}

// The sheet's own names ("librarymusic/" is "librarymusic"), by key, with
// their rows.
function sheetNames(index){
    const names = new Map()
    for(const sheetEntry of index.entries){
        const name = sheetEntry.name.replace(/\.pklz$/i, '').replace(/[\\/]+$/, '')
        const key = entryKey(name)
        if(!names.has(key))
            names.set(key, { name, rows: [] })
        for(const row of sheetEntry.rows)
            if(!names.get(key).rows.includes(row))
                names.get(key).rows.push(row)
    }
    return names
}

const sameRow = (a, b) => Boolean(a && b) && ROW_FIELDS.every(field => String(a[field] ?? '') === String(b[field] ?? ''))

/*
 * The pklz in a database folder and the folders each one is in, nearest
 * first. Only the names are read: the files themselves are never opened.
 */
function databasePklz(folder){
    return listPklz(folder).files.map(path => ({ name: basename(path), folders: (partsInside(folder, path) || []).slice(0, -1).reverse() }))
}

/*
 * Downloads the online sheet and adds what it says on top of the map. Only
 * run when asked (npm run credits:update). Never throws; returns the messages
 * to show, and whether the credits could be updated.
 *
 * details: also say how big the download was and what is in it.
 * save: keep a copy of the downloaded file there.
 */
async function syncSheet({ setting = CREDITS_SHEET, details = false, save = null, force = false, ...paths } = {}){
    const messages = []
    const say = (kind, text) => messages.push({ kind, text })
    if(!downloadUrl(setting)){
        say('warning', t('credits_sync_not_configured'))
        return { messages, ok: false }
    }
    // Each way it can fail says so plainly, and changes nothing.
    let bytes
    let tabs
    try {
        const started = Date.now()
        bytes = await fetchSheet(setting)
        if(details)
            say('info', t('credits_sync_details', { size: (bytes.length / 1024 / 1024).toFixed(2), seconds: ((Date.now() - started) / 1000).toFixed(1) }))
        tabs = readSheetFile(bytes)
    }
    catch(error){
        say('warning', t('credits_sync_failed', { reason: reasonText(error) }))
        return { messages, ok: false }
    }
    const hash = hashOf(bytes)
    if(details){
        const rows = readTabs(tabs)
        for(const tab of new Set(rows.map(row => row.tab)))
            say('info', t('credits_sync_tab', { tab, rows: rows.filter(row => row.tab === tab).length }))
    }
    try {
        if(save){
            writeFileAtomic(save, bytes)
            say('info', t('credits_sync_saved', { file: save }))
        }
        const last = readUpdates(paths.sheetMap || SHEET_MAP)
        if(hash === last.hash && last.updated)
            say('info', t('credits_sync_up_to_date', { date: last.updated.slice(0, 10) }))
        // Read again even when unchanged: a newer WerZatSong or a bigger
        // database may have more pklz to look up.
        const { changed, rows } = applySheet(tabs, { ...paths, hash, force })
        if(details)
            say('info', t('credits_rows_summary', { added: rows.added, edited: rows.edited, kept: rows.kept }))
        say('success', t('credits_sync_updated', { count: changed }))
    }
    catch(error){
        if(error?.reason === 'suspicious')
            say('warning', error.message)
        else
            say('warning', t('credits_update_save_failed', { reason: error?.message || String(error) }))
        return { messages, ok: false }
    }
    return { messages, ok: true }
}

/* ------------------------------------------------------------------------
 * --merge: which pklz each track of a shard came from
 * --------------------------------------------------------------------- */

// --merge puts many pklz files into one shard, and a match from it only
// names the shard. Next to each shard WerZatSong keeps which pklz every track
// came from (<shard>.sources.json), so a match gets the credits of the pklz
// its track was in. Paths are kept relative to the database folder, with /
// on every system, so a database merged on one system works on the others.
function mergeSourcesFile(shardPath){
    return `${shardPath}.sources.json`
}

// sources: [{ pklz: path, names: [track names, as the shard keeps them] }]
function writeMergeSources(shardPath, sources, databaseFolder){
    const data = {
        version: 1,
        sources: sources.map(source => ({ pklz: relative(databaseFolder, source.pklz).split(sep).join('/'), tracks: source.names }))
    }
    writeFileSync(mergeSourcesFile(shardPath), JSON.stringify(data), 'utf-8')
}

// Track name -> [pklz paths], or null when the shard has no such file.
function readMergeSources(shardPath){
    try {
        const data = JSON.parse(readFileSync(mergeSourcesFile(shardPath), 'utf-8'))
        if(data?.version !== 1 || !Array.isArray(data.sources))
            return null
        const byTrack = new Map()
        for(const source of data.sources){
            for(const track of Array.isArray(source.tracks) ? source.tracks : []){
                if(!byTrack.has(track))
                    byTrack.set(track, [])
                if(!byTrack.get(track).includes(source.pklz))
                    byTrack.get(track).push(source.pklz)
            }
        }
        return byTrack
    }
    catch {
        return null
    }
}

/* ------------------------------------------------------------------------
 * Looking matches up
 * --------------------------------------------------------------------- */

// Several entries (a pklz in many sheet names, a track in many pklz) -> one:
// the names they all agree on.
function combine(entries){
    const claimers = sharedNames(entries.map(entry => entry.claimers))
    const makers = entries.filter(entry => (entry.claimers || []).length === 0)
    const fingerprinters = claimers.length > 0 ? [] : sharedNames(makers.map(entry => entry.fingerprinters))
    const suggesters = agreedNames(entries.map(entry => entry.suggesters || []))
    // Who made it comes from a line of credits-overrides.tsv.
    const own = entries.some(entry => entry.own)
    const ownSuggesters = entries.some(entry => entry.ownSuggesters)
    const one = list => list.length > 0 && list.every(source => source === list[0]) ? list[0] : null
    const from = own ? 'overrides'
        : claimers.length > 0 ? one(entries.filter(entry => (entry.claimers || []).length > 0).map(entry => entry.source || 'sheet'))
        : fingerprinters.length > 0 ? one(makers.filter(entry => (entry.fingerprinters || []).length > 0).map(entry => entry.source || 'list'))
        : null
    const suggestedFrom = suggesters.length === 0 ? null : ownSuggesters ? 'overrides'
        : one(entries.filter(entry => (entry.suggesters || []).length > 0).map(entry => entry.suggestedFrom || 'sheet'))
    return { claimers, fingerprinters, suggesters, own, ownSuggesters, from, suggestedFrom }
}

// The folders a pklz is in, nearest first. In WerZatSong's database only
// the folders inside it count: the ones it sits in (where WerZatSong is
// installed, whose computer it is) say nothing about who made the file.
function foldersOf(path, root = consts.DATABASE_FOLDER){
    let text = String(path ?? '')
    if(text !== '' && root && isAbsolute(text)){
        const inside = relative(root, text)
        if(inside !== '' && !isAbsolute(inside) && !/^\.\.(?:[\\/]|$)/.test(inside))
            text = inside
    }
    const parts = text.split(/[\\/]+/).filter(Boolean)
    parts.pop()
    return parts.reverse()
}

// A YouTube channel the song's path names: a channel ID, or an @handle or
// yt-handle folder.
function channelOf(channels, matchedFile){
    if(!matchedFile || channels.size === 0)
        return null
    for(const id of channelIdsIn(matchedFile))
        if(channels.has(id))
            return channels.get(id)
    for(const part of String(matchedFile).split(/[\\/]+/).slice(0, -1).reverse()){
        const handle = /^@([^\s/]+)$/.exec(part.trim()) || /^yt-([^\s/]+)$/i.exec(part.trim())
        // "yt-dlp" is the folder of the downloader itself, not a channel.
        if(handle && /^yt-dlp$/i.test(part.trim()))
            continue
        if(handle && channels.has(`@${handle[1].toLowerCase()}`))
            return channels.get(`@${handle[1].toLowerCase()}`)
    }
    return null
}

function loadCredits({ shipped = SHIPPED_MAP, sheetMap = SHEET_MAP, overrides = OVERRIDES, database = consts.DATABASE_FOLDER } = {}){
    const updates = readUpdates(sheetMap)
    const map = mergeMaps(readMap(shipped), updates.map)
    // Lines of credits-overrides.tsv win outright: one that says who made the pklz
    // (fingerprinters or claimers) replaces both, so a fingerprinter written
    // there is shown even when the sheet has a claimer.
    for(const [key, mine] of readMap(overrides)){
        const base = map.get(key) || { name: mine.name, fingerprinters: [], claimers: [], suggesters: [] }
        const maker = mine.fingerprinters.length > 0 || mine.claimers.length > 0
        map.set(key, {
            name: base.name,
            fingerprinters: maker ? (mine.claimers.length > 0 ? [] : [...mine.fingerprinters]) : base.fingerprinters,
            claimers: maker ? [...mine.claimers] : base.claimers,
            suggesters: mine.suggesters.length > 0 ? [...mine.suggesters] : base.suggesters,
            own: maker || Boolean(base.own),
            ownSuggesters: mine.suggesters.length > 0 || Boolean(base.ownSuggesters),
            ...(!maker && base.source ? { source: base.source } : {}),
            ...(mine.suggesters.length === 0 && base.suggestedFrom ? { suggestedFrom: base.suggestedFrom } : {})
        })
    }
    const channels = readChannels(shipped)
    for(const [channel, credit] of updates.channels)
        channels.set(channel, credit)
    const creditFiles = scanDatabase(database && existsSync(database) ? database : null)
    for(const path of creditFiles.unreadable)
        warning(t('credits_file_unreadable', { file: path }))
    return { map, index: indexMap(map), channels, trends: null, creditFiles }
}

/*
 * { pklzPath, pklzName, matchedFile } -> {
 *   found, fingerprinters: [who made it, as shown], suggesters: [names], how,
 *   possibly: the fingerprinters are only a guess,
 *   from, suggestedFrom: where each comes from (SOURCES), null when unknown
 * }
 */
function resolveCredit(loaded, { pklzPath = null, pklzName = null, matchedFile = null }, shards = new Map()){
    const name = basename(String(pklzPath || pklzName || ''))
    // "1.pklz", "10_5.pklz": only its folders can say whose it is.
    const numbered = isNumberOnly(name)
    let how = 'map'
    // A line of its own only when the number is a YouTube channel's handle
    // ("240252-1.pklz" is @240252); no copies, no sheet name patterns.
    const own = name && numbered ? loaded.index.files.get(nameKey(name)) : null
    let entries = !name ? [] : numbered ? (own ? [own] : []) : findInMap(loaded.index, name)
    // A merged shard: credited as the pklz its track came from would be,
    // name, folders and all. Several of them give what they agree on.
    if(entries.length === 0 && pklzPath && matchedFile){
        if(!shards.has(pklzPath))
            shards.set(pklzPath, readMergeSources(pklzPath))
        const origins = (shards.get(pklzPath)?.get(matchedFile) || [])
            .map(origin => join(consts.DATABASE_FOLDER, ...origin.split(/[\\/]+/)))
            .filter(origin => origin !== pklzPath)
        if(origins.length > 0){
            const found = origins.map(origin => resolveCredit(loaded, { pklzPath: origin, pklzName: basename(origin), matchedFile }, shards))
            const fingerprinters = sharedNames(found.map(credit => credit.fingerprinters))
            const suggesters = agreedNames(found.map(credit => credit.suggesters))
            const any = fingerprinters.length > 0 || suggesters.length > 0
            const one = list => list.length > 0 && list.every(source => source === list[0]) ? list[0] : null
            return {
                found: any, fingerprinters, suggesters, how: any ? 'shard' : null,
                possibly: fingerprinters.length > 0 && found.some(credit => credit.possibly),
                from: fingerprinters.length > 0 ? one(found.map(credit => credit.from)) : null,
                suggestedFrom: suggesters.length > 0 ? one(found.map(credit => credit.suggestedFrom)) : null
            }
        }
    }
    let possibly = false
    if(entries.length === 0 && numbered){
        const found = findNumberedInFolders(loaded.index, foldersOf(pklzPath))
        entries = found.entries
        possibly = found.possibly
        how = 'folder'
    }
    if(entries.length === 0 && !numbered){
        for(const folder of foldersOf(pklzPath)){
            entries = findFolderInMap(loaded.index, folder)
            if(entries.length > 0){
                how = 'folder'
                break
            }
        }
    }
    let credit = entries.length > 0 ? combine(entries) : { claimers: [], fingerprinters: [], suggesters: [] }
    let from = credit.from || null
    let suggestedFrom = credit.suggestedFrom || null
    if(!credit.own){
        // In the folder of a pack whose makers are known: theirs alone.
        const pack = sheetMakersOf(foldersOf(pklzPath))
        if(pack.length > 0){
            credit = { ...credit, claimers: pack, fingerprinters: [] }
            possibly = false
            from = 'folder'
        }
        else if(credit.claimers.length > 1)
            credit = { ...credit, claimers: claimersForPklz({ claimers: credit.claimers, files: entries.map(entry => entry.name), pklzName: name }) }
    }
    // Only possibly theirs: shown as "possibly fingerprinted by".
    if(possibly)
        credit = { ...credit, claimers: [], fingerprinters: credit.claimers.length > 0 ? credit.claimers : credit.fingerprinters }
    if(credit.claimers.length === 0 && credit.fingerprinters.length === 0){
        const family = numbered ? null : familyOf(name)
        const folderFamily = folderFamilyOf(foldersOf(pklzPath))
        const inName = numbered ? { people: [], possibly: false } : peopleWithCertainty(name)
        const inFolders = foldersOf(pklzPath).map(peopleWithCertainty).find(found => found.people.length > 0) || { people: [], possibly: false }
        // Sure first: a name in the file name, a known pack, a folder named
        // after them. Then what is only possibly them, which the line says:
        // a folder known to be one person's (anybody can have a folder called
        // that), a short name with other words, or other pklz named the same
        // way all being theirs (worked out only when it comes to that).
        const ways = [
            [() => !inName.possibly && inName.people, false, null, 'name'],
            [() => family?.fingerprinters, false, family, 'name'],
            [() => !inFolders.possibly && inFolders.people, false, null, 'folder'],
            [() => folderFamily?.fingerprinters, true, null, 'folder'],
            [() => inName.people, true, null, 'name'],
            [() => inFolders.people, true, null, 'folder'],
            [() => numbered ? null : trendsOf(loaded).get(nameStem(name))?.makers, true, null, 'name']
        ]
        for(const [find, guessed, pack, source] of ways){
            const people = find()
            if(!people || people.length === 0)
                continue
            const packSuggesters = credit.suggesters.length === 0 && (pack?.suggesters || []).length > 0
            credit = { ...credit, fingerprinters: [...people], suggesters: packSuggesters ? [...pack.suggesters] : credit.suggesters }
            how = 'name'
            possibly = guessed
            from = source
            if(packSuggesters)
                suggestedFrom = 'name'
            break
        }
    }
    const fromOverrides = Boolean(credit.own)
    const channel = channelOf(loaded.channels, matchedFile)
    if(channel){
        // The row of the song's own channel. Its claimers only narrow who is
        // known for sure to have made the pklz; when nobody is, they are who
        // made it if the row's PKLZ FILENAME is this pklz. Lines of
        // credits-overrides.tsv are never changed.
        const about = namesPklz(channel.files, name)
        const known = credit.claimers.length > 0 ? credit.claimers : possibly ? [] : credit.fingerprinters
        let claimers = []
        if(!credit.own && channel.claimers.length > 0){
            const makers = new Set(known.map(person => person.toLowerCase()))
            if(known.length > 0)
                claimers = channel.claimers.filter(person => makers.has(person.toLowerCase()))
            else if(about)
                claimers = claimersForPklz({ claimers: channel.claimers, files: channel.files, pklzName: name })
        }
        const same = agreedNames([channel.suggesters, credit.suggesters]).length > 0
        const keep = credit.ownSuggesters || same
        credit = {
            claimers: claimers.length > 0 ? claimers : credit.claimers,
            fingerprinters: claimers.length > 0 ? [] : credit.fingerprinters,
            suggesters: keep ? credit.suggesters : about ? [...channel.suggesters] : []
        }
        if(claimers.length > 0)
            from = 'sheet'
        if(!keep)
            suggestedFrom = about && channel.suggesters.length > 0 ? 'sheet' : null
        how = 'channel'
    }
    // The song's stored path can tell who made the pklz.
    const ownFolder = pathMakersOf(matchedFile, { own: true })
    const unknown = credit.claimers.length === 0 && (credit.fingerprinters.length === 0 || possibly)
    const named = credit.claimers.length > 0 ? credit.claimers : credit.fingerprinters
    const byPath = pathMakersOf(matchedFile).filter(person => unknown || named.some(other => other.toLowerCase() === person.toLowerCase()))
    if(!fromOverrides && (ownFolder.length > 0 || byPath.length > 0)){
        credit = { ...credit, claimers: ownFolder.length > 0 ? ownFolder : byPath, fingerprinters: [] }
        possibly = false
        how = 'path'
        from = 'path'
    }
    let shown = credit.claimers.length > 0 ? credit.claimers : credit.fingerprinters
    let suggesters = credit.suggesters
    let guess = possibly && credit.claimers.length === 0
    // The credit file of the pklz's package comes before everything else.
    const said = creditFilesSay(loaded.creditFiles, { pklzPath, pklzName: name })
    if(said.fingerprinters){
        shown = said.fingerprinters
        guess = false
        how = 'file'
        from = 'file'
    }
    if(said.suggesters){
        suggesters = said.suggesters
        suggestedFrom = 'file'
    }
    const found = shown.length > 0 || suggesters.length > 0
    return {
        found, fingerprinters: shown, suggesters, how: found ? how : null, possibly: guess,
        from: shown.length > 0 ? from : null,
        suggestedFrom: suggesters.length > 0 ? suggestedFrom : null
    }
}

// What prepareCredits() hands to werzatsong.js. Results are kept per pklz and
// song path: a search reports the same pklz many times.
function creditsLookup(loaded){
    const known = new Map()
    const shards = new Map()
    return {
        lookup({ pklzPath = null, pklzName = null, matchedFile = null }){
            const key = `${pklzPath || pklzName}\u0000${matchedFile || ''}`
            if(!known.has(key))
                known.set(key, resolveCredit(loaded, { pklzPath, pklzName, matchedFile }, shards))
            return known.get(key)
        }
    }
}

// Once per run, before the results are written: the lookup that gives each
// entry its credits, or null (with a warning) when the credits can't be read.
async function prepareCredits(options){
    try {
        return creditsLookup(loadCredits(options))
    }
    catch(error){
        warning(t('credits_no_map', { reason: error.message }))
        return null
    }
}

// A credits line stays one line, whatever the cells hold.
function oneLine(text){
    return String(text).replace(/\s*[\r\n]+\s*/g, ' ').trim()
}

const MAX_SUGGESTERS_SHOWN = 2

// A part of the line with where it comes from, when that is known.
function withSource(part, source, texts = null){
    const text = key => texts ? texts[key] : t(key)
    if(!source || !SOURCES.has(source) || typeof text('credits_source') !== 'string' || typeof text(`credits_source_${source}`) !== 'string')
        return part
    return fill(text('credits_source'), { part, source: text(`credits_source_${source}`) })
}

// What nobody is known for is left out of the line.
function formatCreditLine(credit, { compact = false } = {}){
    const names = list => list.map(oneLine).join(', ')
    const parts = []
    if(credit.found && credit.fingerprinters.length > 0)
        parts.push(withSource(t(credit.possibly ? 'credits_possibly_fingerprinted_by' : 'credits_fingerprinted_by', { names: names(credit.fingerprinters) }), credit.from))
    if(credit.found && credit.suggesters.length > 0){
        if(compact && credit.suggesters.length > MAX_SUGGESTERS_SHOWN)
            parts.push(withSource(t('credits_suggested_by', { names: t('credits_various_users') }), credit.suggestedFrom))
        else
            parts.push(withSource(t('credits_suggested_by', { names: names(credit.suggesters) }), credit.suggestedFrom))
    }
    return t('credits_line', { details: parts.length > 0 ? parts.join(' | ') : t('credits_not_found') })
}

// The credits line as the result files' legend shows it.
function creditLineExample(){
    const who = t('credits_placeholder_who')
    const part = key => fill(t('credits_source'), { part: t(key, { names: who }), source: t('credits_placeholder_source') })
    return t('credits_line', { details: [part('credits_fingerprinted_by'), part('credits_suggested_by')].join(' | ') })
}

/*
 * Filling in the credits nobody knew in result files already written.
 *
 * A result entry is three lines: the match (with the pklz name), the matched
 * song and its path, then "Credits: fingerprinted by X | suggested by Y",
 * either part left out when nobody is known for it. Only what is missing (or
 * says "unknown user", as older result files do), or a whole "no credits
 * known for this pklz", is filled in, and a "possibly fingerprinted by"
 * becomes a plain "fingerprinted by" once somebody is known for sure. A name
 * that is already there for sure is never changed, even if the credits now
 * say something else.
 *
 * Result files can be in any of WerZatSong's languages, and each one keeps
 * its own: the texts come from the localization files.
 */


const escape = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// A text with {placeholders} as a regular expression that captures them.
function templateRegex(template){
    const names = []
    const source = template.split(/(\{\w+\})/).map(part => {
        const placeholder = /^\{(\w+)\}$/.exec(part)
        if(!placeholder)
            return escape(part)
        names.push(placeholder[1])
        return '(.*?)'
    }).join('')
    const regex = new RegExp(`^${source}$`)
    return text => {
        const match = regex.exec(text)
        return match ? Object.fromEntries(names.map((name, i) => [name, match[i + 1]])) : null
    }
}

let languages = null

// The credit texts of every language.
function creditTexts(){
    if(languages)
        return languages
    languages = []
    for(const language of Object.keys(LANGUAGES)){
        let strings
        try { strings = JSON.parse(readFileSync(stringsFile(language), 'utf-8')) }
        catch { continue }
        const keys = ['credits_line', 'credits_fingerprinted_by', 'credits_possibly_fingerprinted_by', 'credits_suggested_by', 'credits_unknown_user', 'credits_not_found', 'format_match_entry']
        if(keys.some(key => typeof strings[key] !== 'string'))
            continue
        languages.push({
            language,
            texts: strings,
            line: templateRegex(strings.credits_line),
            fingerprinted: templateRegex(strings.credits_fingerprinted_by),
            possibly: templateRegex(strings.credits_possibly_fingerprinted_by),
            suggested: templateRegex(strings.credits_suggested_by),
            entry: templateRegex(strings.format_match_entry),
            // " (sheet)" and the other source endings of this language.
            sources: typeof strings.credits_source !== 'string' ? [] : [...SOURCES]
                .filter(source => typeof strings[`credits_source_${source}`] === 'string')
                .map(source => ({ source, ending: fill(strings.credits_source, { part: '', source: strings[`credits_source_${source}`] }) }))
        })
    }
    return languages
}

// A credits line in one of the languages: what it says, or null. A part
// nobody is known for is null; possibly: the fingerprinters are a guess.
function readCreditLine(line){
    for(const language of creditTexts()){
        const found = language.line(line)
        if(!found)
            continue
        const { texts } = language
        const read = { language, fingerprinters: null, suggesters: null, possibly: false, from: null, suggestedFrom: null }
        if(found.details === texts.credits_not_found)
            return read
        // Filled in with the names, like an unknown user.
        const names = text => text === texts.credits_unknown_user || text === texts.credits_various_users ? null : text
        const parts = found.details.split(' | ')
        let understood = parts.length <= 2
        for(const [i, written] of parts.entries()){
            const ending = language.sources.find(({ ending }) => ending.trim() !== '' && written.endsWith(ending))
            const part = ending ? written.slice(0, -ending.ending.length) : written
            const fingerprinted = i === 0 ? language.fingerprinted(part) : null
            const guessed = i === 0 && !fingerprinted ? language.possibly(part) : null
            const suggested = fingerprinted || guessed ? null : language.suggested(part)
            if(fingerprinted || guessed){
                read.fingerprinters = names((fingerprinted || guessed).names)
                read.possibly = Boolean(guessed) && read.fingerprinters !== null
                read.from = ending?.source || null
            }
            else if(suggested){
                read.suggesters = names(suggested.names)
                read.suggestedFrom = ending?.source || null
            }
            else
                understood = false
        }
        if(understood)
            return read
    }
    return null
}

// "Song.mp3 (files/@channel/Song.mp3)" -> the path in the brackets.
function matchedFileOf(line){
    const lastPart = path => path.split(/[\\/]/).pop()
    if(!line.endsWith(')'))
        return null
    for(let at = line.indexOf(' ('); at !== -1; at = line.indexOf(' (', at + 1)){
        const file = line.slice(at + 2, -1)
        if(lastPart(file) === line.slice(0, at))
            return file
    }
    return null
}

// The pklz name in the match line, in whichever language it is written.
function pklzOf(line){
    for(const language of creditTexts()){
        const found = language.entry(line)
        if(found?.pklz)
            return found.pklz
    }
    return null
}

/*
 * One result file's text with its unknown credits filled in.
 * lookup({ pklzName, matchedFile }) -> { found, fingerprinters, suggesters }
 * Returns { text, checked, filled }.
 */
function fillCredits(text, lookup){
    const newline = text.includes('\r\n') ? '\r\n' : '\n'
    const lines = text.split(/\r?\n/)
    let checked = 0
    let filled = 0
    for(let i = 2; i < lines.length; i++){
        const old = readCreditLine(lines[i])
        if(!old)
            continue
        checked += 1
        const sure = old.fingerprinters !== null && !old.possibly
        if(sure && old.suggesters !== null)
            continue
        const pklzName = pklzOf(lines[i - 2])
        const matchedFile = matchedFileOf(lines[i - 1])
        if(!pklzName)
            continue
        const credit = lookup({ pklzName, matchedFile })
        const { texts } = old.language
        const known = list => credit.found && list && list.length > 0 ? list.map(name => String(name).replace(/\s+/g, ' ').trim()).join(', ') : null
        let fingerprinters = old.fingerprinters
        let possibly = old.possibly
        const now = known(credit.fingerprinters)
        // Unknown: whatever is known now. A guess: only somebody known for sure.
        if(!sure && now !== null && (old.fingerprinters === null || !credit.possibly)){
            fingerprinters = now
            possibly = Boolean(credit.possibly)
        }
        const suggesters = old.suggesters === null ? known(credit.suggesters) : old.suggesters
        if(fingerprinters === old.fingerprinters && possibly === old.possibly && suggesters === old.suggesters)
            continue
        const parts = []
        const newMakers = fingerprinters !== old.fingerprinters || possibly !== old.possibly
        if(fingerprinters !== null)
            parts.push(withSource(fill(possibly ? texts.credits_possibly_fingerprinted_by : texts.credits_fingerprinted_by, { names: fingerprinters }), newMakers ? credit.from : old.from, texts))
        if(suggesters !== null)
            parts.push(withSource(fill(texts.credits_suggested_by, { names: suggesters }), suggesters !== old.suggesters ? credit.suggestedFrom : old.suggestedFrom, texts))
        lines[i] = fill(texts.credits_line, { details: parts.length > 0 ? parts.join(' | ') : texts.credits_not_found })
        filled += 1
    }
    return { text: lines.join(newline), checked, filled }
}

function resultFiles(folder){
    const found = []
    const walk = dir => {
        let names
        try { names = readdirSync(dir) }
        catch { return }
        for(const name of names){
            const path = join(dir, name)
            let stats
            try { stats = statSync(path) }
            catch { continue }
            if(stats.isDirectory())
                walk(path)
            else if(/\.txt$/i.test(name))
                found.push(path)
        }
    }
    walk(folder)
    return found.sort()
}

/*
 * Fills in the unknown credits of every result file in a folder (and the
 * folders in it). Returns { exists, files, lines, checked }: how many files
 * and lines changed, and how many credit lines were looked at.
 */
function fillLogCredits(folder, lookup){
    if(!existsSync(folder))
        return { exists: false, files: 0, lines: 0, checked: 0, failed: 0 }
    let files = 0
    let lines = 0
    let checked = 0
    let failed = 0
    for(const path of resultFiles(folder)){
        let text
        try { text = readFileSync(path, 'utf-8') }
        catch { continue }
        const result = fillCredits(text, lookup)
        checked += result.checked
        if(result.filled === 0)
            continue
        // A file that cannot be written (read-only, in use) keeps its text.
        try { writeFileAtomic(path, result.text) }
        catch {
            failed += 1
            continue
        }
        files += 1
        lines += result.filled
    }
    return { exists: true, files, lines, checked, failed }
}

module.exports = {
    applySheet,
    creditLineExample,
    CREDITS_SHEET,
    creditsLookup,
    databasePklz,
    downloadSheet,
    reasonText,
    rememberRows,
    downloadUrl,
    entryKey,
    FIELDS,
    fillCredits,
    fillLogCredits,
    findFolderInMap,
    findInMap,
    foldersOf,
    formatCreditLine,
    HEADER,
    indexMap,
    isEmpty,
    isFileName,
    learnTrends,
    lineFromSheet,
    loadCredits,
    MAP_COMMENTS,
    matchedFileOf,
    mergeEntry,
    mergeMaps,
    mergeSourcesFile,
    OVERRIDES,
    parseMap,
    pklzOf,
    prepareCredits,
    readChannels,
    readCredits,
    readCreditLine,
    readFolders,
    readMap,
    readMergeSources,
    readUpdates,
    resolveCredit,
    resultFiles,
    serializeMap,
    SHEET_MAP,
    sheetNames,
    SHIPPED_MAP,
    syncSheet,
    UPDATE_LAUNCHER,
    withSheet,
    writeCredits,
    writeFileAtomic,
    writeMap,
    writeMergeSources
}
