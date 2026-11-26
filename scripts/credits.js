/*
 * The pklz credits commands, for whoever looks after WerZatSong's credits:
 *
 *   npm run credits:update   (update-credits.cmd on Windows, sh update-credits.sh
 *                            on Linux and macOS) gets the newest credits from the
 *                            online sheet and fills in old result files
 *   npm run credits:build    brings the credits file in resources/credits up to
 *                            date with the online sheet (or rebuilds it from
 *                            listings of pklz files)
 *   npm run credits:report   lists the credits a database's pklz would get
 *
 * (node scripts/credits.js update|build|report ...)
 */

const { readFileSync, writeFileSync } = require('node:fs')
const { join, relative, resolve } = require('node:path')
const consts = require('../utils/consts')
const credits = require('../utils/credits')
const { creditsLookup, databasePklz, entryKey, fillLogCredits, formatCreditLine, isEmpty, loadCredits, matchedFileOf, pklzOf, resultFiles, syncSheet } = credits
const { buildIndex, channelCredits, creditsOfRows, familyOf, folderFamilyOf, isNumberOnly, isRootFolder, nameKey, OWN_FOLDER_PARENTS, nameStem, peopleWithCertainty, readSheetPaths, readTabs, sheetCredits, sheetMakersOf, sheetRowsFor } = require('../utils/creditsRules')
const { listPklz } = require('../utils/database')
const { t } = require('../utils/i18n')
const messages = require('../utils/messages')

/* ------------------------------------------------------------------------
 * Listings of pklz files (for credits:build)
 * --------------------------------------------------------------------- */

/*
 * Reading the lists of pklz files the credits map is built from
 * (credits:build). Three kinds of list are understood, told apart
 * by how they look:
 *
 *   - paths, one per line ("wzs.cosine.club/nel/x.pklz"): exact.
 *   - a tree drawn with "│   " guides: every entry sits under the folder
 *     drawn above it. The database dumps from Google Drive are drawn this way
 *     but their folders are not always where they should be, so only the
 *     folder a file sits right in is trusted ("parent").
 *   - a tree drawn with spaces only, where each folder lists its files, then
 *     its folders, and the folders' contents follow later without their name
 *     being repeated. The folder of a file is worked out again (see
 *     rebuildTree below); where that can go two ways the folder is marked as
 *     not sure ("unsure") and is not used to give credits.
 *
 * Every reader returns [{ name, folders: [nearest first], trust }] with
 * trust 'exact', 'parent', 'sure' or 'unsure'.
 */


function isPklz(name){
    return /\.pklz$/i.test(name)
}

/* ------------------------------------------------------------------------
 * Paths
 * --------------------------------------------------------------------- */

function readPathList(text){
    const files = []
    for(const line of text.split(/\r?\n/)){
        const path = line.trim().replace(/\\/g, '/')
        if(path === '' || path.startsWith('#'))
            continue
        const parts = path.split('/').filter(Boolean)
        const name = parts.pop()
        if(name && isPklz(name))
            files.push({ name, folders: parts.reverse(), trust: 'exact' })
    }
    return files
}

/* ------------------------------------------------------------------------
 * Trees with guides
 * --------------------------------------------------------------------- */

function readGuidedTree(text){
    const files = []
    const stack = []
    for(const line of text.split(/\r?\n/)){
        if(line.trim() === '')
            continue
        const match = /^((?:[│ ] {3})*)(?:[├└]── )?(.*)$/.exec(line)
        const connector = /^(?:[│ ] {3})*[├└]── /.test(line)
        const depth = match[1].length / 4 + (connector ? 1 : 0)
        const name = match[2]
        while(stack.length > 0 && stack[stack.length - 1].depth >= depth)
            stack.pop()
        if(name.endsWith('/'))
            stack.push({ depth, name: name.slice(0, -1) })
        else if(isPklz(name))
            files.push({ name, folders: stack.map(entry => entry.name).reverse(), trust: 'parent' })
    }
    return files
}

/* ------------------------------------------------------------------------
 * Trees without guides
 * --------------------------------------------------------------------- */

const GENERIC = ['fingerprints', 'fingerprint', 'collection', 'archives', 'archive', 'youtube', 'channels', 'channel',
    'music', 'pklzs', 'pklz', 'batch', 'variety', 'random', 'other', 'misc', 'temp', 'shared', 'songs', 'sources',
    'source', 'extsource', 'database', 'the', 'and', 'mix', 'vol', 'with', 'mainly', 'blogs', 'blog']

function bare(text){
    let out = String(text).normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '')
    for(const word of GENERIC)
        out = out.split(word).join('')
    return out
}

const stems = new Map()
function stem(name){
    if(!stems.has(name))
        stems.set(name, bare(name.replace(/\.[A-Za-z0-9]{1,6}$/, '')))
    return stems.get(name)
}

const affinities = new Map()

// How much a file or folder name has in common with a folder's name: the
// longest run of characters they share (4 or more), or 4 when the initials
// of the name spell the start of the folder ("no longer forgotten music" in
// "nlfm_fingerprints").
function affinity(item, folder){
    const key = `${item}\u0000${folder}`
    if(affinities.has(key))
        return affinities.get(key)
    const a = stem(item)
    const b = bare(folder)
    let best = 0
    if(a.length >= 3 && b.length >= 3){
        let previous = new Array(b.length + 1).fill(0)
        for(let i = 1; i <= a.length; i++){
            const current = new Array(b.length + 1).fill(0)
            for(let j = 1; j <= b.length; j++){
                if(a[i - 1] === b[j - 1]){
                    current[j] = previous[j - 1] + 1
                    if(current[j] > best)
                        best = current[j]
                }
            }
            previous = current
        }
    }
    let value = best >= 4 ? best : 0
    // A short folder name ("nel", "wy") written as a whole word of the name.
    if(b.length >= 2 && b.length < 4 && item.toLowerCase().split(/[^\p{L}\p{N}]+/u).includes(b))
        value = Math.max(value, 4)
    if(value === 0 && b.length >= 3){
        const words = item.replace(/\.[A-Za-z0-9]{1,6}$/, '').split(/[^0-9A-Za-z]+/).filter(word => word && !/^\d+$/.test(word))
        const initials = words.map(word => word[0].toLowerCase()).join('')
        if(initials.length >= 3 && b.startsWith(initials))
            value = 4
    }
    affinities.set(key, value)
    return value
}

function parseFlatLines(text){
    const entries = []
    for(const line of text.split(/\r?\n/)){
        if(line.trim() === '')
            continue
        const match = /^( *)(?:[├└]── )?(.*)$/.exec(line)
        const connector = /^ *[├└]── /.test(line)
        const depth = connector ? match[1].length / 4 : 0
        const name = match[2]
        const folder = name.endsWith('/')
        entries.push({ depth, name: folder ? name.slice(0, -1) : name, folder })
    }
    return entries
}

/*
 * The contents of `folders` (all at depth d, in the order they are walked)
 * start at entries[i], one level deeper. Each folder's own list is its files
 * (sorted) then its folders (sorted); a folder list followed by deeper lines
 * means the walk went into those folders. Where one list ends and the next
 * begins is plain when the sort order goes backwards, a file follows a
 * folder or a deeper part ends. Otherwise the split that best matches the
 * folders' names wins; `tie` (a tiny plus or minus) decides between splits
 * that match equally well, so running it both ways shows which are sure.
 */
function walk(entries, i, d, folders, out, tie){
    const items = []
    while(i < entries.length && entries[i].depth > d){
        const entry = entries[i]
        if(entry.depth !== d + 1){
            i += 1
            continue
        }
        const item = { name: entry.name, folder: entry.folder, deeper: null, ended: false }
        items.push(item)
        i += 1
        if(entry.folder && i < entries.length && entries[i].depth > d + 1){
            const run = []
            for(let k = items.length - 1; k >= 0 && items[k].folder && !items[k].ended; k--)
                run.unshift(k)
            const inside = new Map()
            i = walk(entries, i, d + 1, run.map(k => items[k].name), inside, tie)
            item.deeper = { run, inside }
            item.ended = true
        }
    }
    const n = items.length
    const K = folders.length
    if(n === 0 || K === 0)
        return i
    const forced = new Array(n).fill(false)
    for(let t = 1; t < n; t++){
        const a = items[t - 1]
        const b = items[t]
        forced[t] = a.ended || (a.folder && !b.folder) || (a.folder === b.folder && b.name < a.name)
    }
    const votes = new Map()
    for(const item of items){
        if(!item.deeper)
            continue
        const names = [...item.deeper.inside.values()].flat().slice(0, 400)
        if(names.length > 0)
            for(const k of item.deeper.run)
                votes.set(k, names)
    }
    const score = (t, j) => {
        let value = affinity(items[t].name, folders[j])
        const names = votes.get(t)
        if(names)
            value += 2 * names.reduce((sum, name) => sum + affinity(name, folders[j]), 0) / names.length
        return value + tie * j
    }
    const NONE = -Infinity
    let best = folders.map((folder, j) => score(0, j))
    const back = [new Array(K).fill(-1)]
    for(let t = 1; t < n; t++){
        const next = new Array(K).fill(NONE)
        const from = new Array(K).fill(-1)
        let prefix = NONE
        let prefixAt = -1
        for(let j = 0; j < K; j++){
            let candidate = prefix
            let at = prefixAt
            if(!forced[t] && best[j] > candidate){
                candidate = best[j]
                at = j
            }
            if(candidate > NONE){
                next[j] = candidate + score(t, j)
                from[j] = at
            }
            if(best[j] > prefix){
                prefix = best[j]
                prefixAt = j
            }
        }
        best = next
        back.push(from)
    }
    let j = 0
    for(let k = 1; k < K; k++)
        if(best[k] > best[j])
            j = k
    const assigned = new Array(n)
    for(let t = n - 1; t >= 0; t--){
        assigned[t] = j
        j = back[t][j]
    }
    for(let t = 0; t < n; t++){
        const item = items[t]
        const folder = folders[assigned[t]]
        if(!item.folder){
            if(!out.has(folder))
                out.set(folder, [])
            out.get(folder).push(item.name)
        }
        if(item.deeper){
            for(const [inner, names] of item.deeper.inside){
                const path = `${folder}/${inner}`
                if(!out.has(path))
                    out.set(path, [])
                out.get(path).push(...names)
            }
        }
    }
    return i
}

function rebuildTree(text, tie){
    const entries = parseFlatLines(text)
    const out = new Map()
    affinities.clear()
    if(entries.length > 0)
        walk(entries, 1, 0, [entries[0].name], out, tie)
    return out
}

function readFlatTree(text){
    const early = rebuildTree(text, -1e-6)
    const late = rebuildTree(text, 1e-6)
    const lateFolders = new Map()
    for(const [path, names] of late)
        for(const name of names)
            if(isPklz(name)){
                if(!lateFolders.has(name))
                    lateFolders.set(name, [])
                lateFolders.get(name).push(path)
            }
    const files = []
    const seen = new Map()
    for(const [path, names] of early){
        for(const name of names){
            if(!isPklz(name))
                continue
            // The same name can be listed more than once; pair them in order.
            const count = seen.get(name) || 0
            seen.set(name, count + 1)
            const other = (lateFolders.get(name) || [])[count]
            files.push({ name, folders: path.split('/').reverse(), trust: other === path ? 'sure' : 'unsure', otherFolders: other && other !== path ? other.split('/').reverse() : null })
        }
    }
    return files
}

function readListing(path){
    const text = readFileSync(path, 'utf-8')
    if(/[├└]── /.test(text))
        return text.includes('│') ? readGuidedTree(text) : readFlatTree(text)
    return readPathList(text)
}

/* ------------------------------------------------------------------------
 * credits:build
 * --------------------------------------------------------------------- */

/*
 * Builds (or adds to) the pklz credits file that comes with WerZatSong,
 * resources/credits/pklz-credits.tsv.
 *
 *   npm run credits:build
 *   npm run credits:build -- [--list <file> ...] [--sheet <file or folder> ...] [--fresh] [--report <file>]
 *
 * --list: lists of pklz files (filetrees of database folders, or one path per
 *         line, see the listings section above), newest first: when two put a
 *         pklz in different people's folders, the first one wins. Every pklz
 *         in them gets a line. The listings do not come with WerZatSong:
 *         without --list, the pklz already in the file are looked up again.
 * --sheet: the credits sheet, as its .xlsx, its HTML export (zip or folder),
 *          .csv files or a link to download it from. Without --sheet, the
 *          Lostwave Fingerprints sheet is downloaded.
 * --fresh: start from an empty file instead of adding to the one there
 *          (needs --list).
 * --force: apply the sheet even when it names someone else for more sources
 *          than edits usually change at once (see rememberRows in
 *          utils/credits.js).
 * --report <file>: also write which pklz got credits from where, and which
 *          got none.
 *
 * Nothing already in the map is ever taken out. Every row the sheet has had
 * is kept in the file: a row deleted from the sheet still counts, an edited
 * one counts as it is now. What the rows say now replaces what the map had
 * for a pklz; a cell left empty never erases a name. Exit code 3 means the
 * online sheet could not be downloaded and nothing was changed.
 */


function parseBuildArguments(argv){
    const options = { lists: [], sheets: [], fresh: false, force: false, report: null, out: credits.SHIPPED_MAP }
    for(let i = 0; i < argv.length; i++){
        const argument = argv[i]
        const value = () => {
            if(i + 1 >= argv.length)
                throw new Error(t('credits_build_usage'))
            return argv[++i]
        }
        if(argument === '--list')
            options.lists.push(resolve(value()))
        else if(argument === '--sheet'){
            const sheet = value()
            options.sheets.push(/^https?:\/\//i.test(sheet) ? sheet : resolve(sheet))
        }
        else if(argument === '--report')
            options.report = resolve(value())
        else if(argument === '--out')
            options.out = resolve(value())
        else if(argument === '--force')
            options.force = true
        else if(argument === '--fresh')
            options.fresh = true
        // Read by utils/i18n.js.
        else if(argument === '--language')
            i += 1
        else if(!argument.startsWith('--language='))
            throw new Error(t('credits_build_usage'))
    }
    if(options.fresh && options.lists.length === 0)
        throw new Error(t('credits_build_fresh_needs_list'))
    return options
}


// The people the folders of a file name, nearest folder first. Exact
// listings first, then the ones whose folders were worked out; among those,
// the list given first wins (give the newest dump first).
// The people a folder of the pklz is named after, and whether that is only
// possibly them (a short name with other words: see peopleWithCertainty).
function folderPeople(places){
    const order = ['exact', 'sure', 'unsure', 'parent']
    for(const trust of order){
        for(const place of places.filter(place => place.trust === trust)){
            let folders = place.folders
            if(trust === 'parent')
                folders = folders.filter(folder => folder.length > 2).slice(0, 1)
            const found = firstPeople(folders)
            // Not sure where it is: only when both ways it can go agree.
            if(trust === 'unsure' && JSON.stringify(found.people) !== JSON.stringify(firstPeople(place.otherFolders || []).people))
                continue
            if(found.people.length > 0)
                return found
        }
    }
    return { people: [], possibly: false }
}

function firstPeople(folders){
    for(const folder of folders){
        if(isRootFolder(folder))
            continue
        const found = peopleWithCertainty(folder)
        if(found.people.length > 0)
            return found
    }
    return { people: [], possibly: false }
}

function peopleOf(rows){
    const { claimers, suggesters } = creditsOfRows(rows)
    return claimers.length > 0 || suggesters.length > 0
}

// Folder names a file is in, nearest first, to compare with the sheet.
function knownFolders(places){
    const folders = []
    const rank = { exact: 0, sure: 1, parent: 2 }
    const ordered = places.filter(place => place.trust in rank).sort((a, b) => rank[a.trust] - rank[b.trust])
    for(const place of ordered){
        let list = place.folders
        if(place.trust === 'unsure')
            continue
        if(place.trust === 'parent')
            list = list.slice(0, 1)
        list.forEach((folder, i) => {
            // A folder named after who made what is in it, kept with its parent's name.
            const parent = OWN_FOLDER_PARENTS.find(name => name.toLowerCase() === String(list[i + 1] || '').toLowerCase())
            const site = parent ? `${parent}/${folder}` : null
            for(const name of [folder, site])
                if(name && !isRootFolder(name) && !folders.includes(name))
                    folders.push(name)
        })
    }
    return folders
}

// The spelling of a name most listings use.
function spelling(counts){
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0]
}

// Exit code when the online sheet could not be had: nothing was changed.
const SHEET_UNREACHABLE = 3

// --sheet: files, or the link of a sheet to download instead of the
// Lostwave Fingerprints one.
async function loadSheet(paths){
    const links = paths.filter(path => /^https?:\/\//i.test(path))
    if(paths.length > 0 && links.length === 0)
        return readSheetPaths(paths)
    try {
        return (await credits.downloadSheet(links[0])).tabs
    }
    catch(error){
        const failed = new Error(t('credits_sync_failed', { reason: credits.reasonText(error) }))
        failed.exitCode = SHEET_UNREACHABLE
        throw failed
    }
}

async function build(args){
    const options = parseBuildArguments(args)

    // Every pklz the lists know, by key.
    const files = new Map()
    for(const list of options.lists){
        console.log(t('credits_build_reading', { file: list }))
        const listed = readListing(list)
        for(const file of listed){
            const key = nameKey(file.name)
            if(key === '')
                continue
            if(!files.has(key))
                files.set(key, { spellings: new Map(), places: [] })
            const known = files.get(key)
            known.spellings.set(file.name, (known.spellings.get(file.name) || 0) + 1)
            known.places.push(file)
        }
        console.log(t('credits_build_listing', { file: list, count: listed.length }))
    }

    const tabs = await loadSheet(options.sheets)
    const sheetRows = readTabs(tabs)
    console.log(t('credits_build_sheet', { tabs: new Set(sheetRows.map(row => row.tab)).size, rows: sheetRows.length }))
    const before = options.fresh ? { map: new Map(), channels: new Map(), folders: new Map(), rows: [] } : credits.readCredits(options.out)
    // Every row the file knew, with the sheet's edits; deleted rows stay.
    const known = before.rows
    const remembered = credits.rememberRows(known, sheetRows, { force: options.force })
    console.log(t('credits_rows_summary', { added: remembered.added, edited: remembered.edited, kept: remembered.kept }))
    const index = buildIndex(remembered.rows)

    const map = before.map
    const fresh = new Map()
    const report = { name: 0, batch: 0, channel: 0, handle: 0, folder: 0, filename: 0, family: 0, folders: 0, trend: 0, none: [] }
    const howOf = new Map()
    // pklz only possibly made by someone (see above): for the report.
    const guesses = new Map()
    const foldersOfPklz = before.folders

    // Files: the lists' and the ones already in the map.
    const names = new Map()
    for(const [key, known] of files)
        names.set(`f:${key}`, { name: spelling(known.spellings), places: known.places })
    for(const [key, entry] of map)
        if(key.startsWith('f:') && !names.has(key))
            names.set(key, { name: entry.name, places: [] })

    for(const [key, { name, places }] of names){
        // The folders the listings put it in, then the one the file already
        // knew (the Reverbnation 7z batches are in no listing).
        const folders = places.length > 0 ? knownFolders(places) : []
        for(const folder of foldersOfPklz.get(key)?.folders || [])
            if(!folders.includes(folder))
                folders.push(folder)
        let found = sheetRowsFor(index, name, folders)
        let used = folders
        // Not sure which folder it is in: fine when only one of the two
        // folders it can be in, or both the same way, names a sheet entry.
        const unsure = places.filter(place => place.trust === 'unsure')
        if(!peopleOf(found.rows) && unsure.length > 0){
            const ways = [unsure.flatMap(place => place.folders), unsure.flatMap(place => place.otherFolders || [])]
                .map(list => [...folders, ...list.filter(folder => !isRootFolder(folder))])
                .map(tried => ({ found: sheetRowsFor(index, name, tried), tried }))
                .filter(way => peopleOf(way.found.rows))
            if(ways.length === 1 || (ways.length === 2 && JSON.stringify(sheetCredits(ways[0].found)) === JSON.stringify(sheetCredits(ways[1].found))))
                ({ found, tried: used } = ways[0])
        }
        const how = found.how
        const { claimers, suggesters } = sheetCredits(found)
        // Found by its folder: keep the folder, so a later look at the sheet
        // finds the same entry. Only the one that does it, if one does.
        const creditOf = way => JSON.stringify({ ...sheetCredits(way), source: way.makerSource || null })
        const credited = creditOf(found)
        const sameRows = tried => creditOf(sheetRowsFor(index, name, tried)) === credited
        if((peopleOf(found.rows) || found.makers.length > 0) && used.length > 0 && !sameRows([])){
            const one = used.find(folder => sameRows([folder]))
            foldersOfPklz.set(key, { name, folders: one !== undefined ? [one] : used })
        }
        const entry = { name, fingerprinters: [], claimers, suggesters, fromSheet: found.rows.length > 0 }
        if(claimers.length > 0 && found.makers.length > 0 && found.makerSource)
            entry.source = found.makerSource
        let source = claimers.length > 0 || suggesters.length > 0 ? how : null
        if(claimers.length === 0){
            const family = familyOf(name) || folderFamilyOf(places.flatMap(place => place.folders))
            const inName = peopleWithCertainty(name)
            const inFolders = folderPeople(places)
            // Only what is sure goes in the map. A short name with other
            // words is only possibly them: a search works that out again
            // and says "possibly".
            if(inName.people.length > 0 && !inName.possibly){
                entry.fingerprinters = inName.people
                entry.source = 'name'
                source = source || 'filename'
            }
            else if(family){
                entry.fingerprinters = [...family.fingerprinters]
                entry.source = 'name'
                source = source || 'family'
            }
            else if(inFolders.people.length > 0 && !inFolders.possibly){
                entry.fingerprinters = inFolders.people
                source = source || 'folders'
            }
            else if(inName.people.length > 0 || inFolders.people.length > 0)
                guesses.set(name, inName.people.length > 0 ? inName.people : inFolders.people)
            if(entry.suggesters.length === 0 && family && family.suggesters.length > 0){
                entry.suggesters = [...family.suggesters]
                entry.suggestedFrom = 'name'
            }
        }
        howOf.set(name, source)
        if(source)
            report[source] += 1
        else
            report.none.push(name)
        fresh.set(key, entry)
    }

    // The sheet's own names, for pklz the lists do not have yet.
    for(const [key, { name, rows }] of credits.sheetNames(index))
        fresh.set(key, credits.lineFromSheet(name, { rows, makers: sheetMakersOf([name]) }))

    // pklz named with numbers only ("1.pklz", "10_5.pklz") get no line of
    // their own: the name says nothing, and a search goes by their folder.
    // The one exception is a number that is a YouTube channel's handle.
    for(const [key, { name }] of names){
        // Unless the number is a channel's own ("240252-1.pklz" is @240252).
        if(!isNumberOnly(name) || howOf.get(name) === 'handle' || howOf.get(name) === 'channel')
            continue
        fresh.delete(key)
        foldersOfPklz.delete(key)
    }
    for(const [key, entry] of [...map])
        if(key.startsWith('f:') && isNumberOnly(entry.name) && !fresh.has(key))
            map.delete(key)

    let merged = new Map(map)
    for(const [key, entry] of fresh)
        merged.set(key, credits.withSheet(merged.get(key) || { name: entry.name }, entry))

    // Ways of naming pklz that always mean the same people. Only a guess, so
    // they stay out of the map: a search uses them for pklz nothing else
    // knows, and says "possibly".
    const trends = credits.learnTrends(merged)
    const possibly = new Map()
    for(const name of report.none){
        const trend = trends.get(nameStem(name))
        if(guesses.has(name))
            possibly.set(name, guesses.get(name))
        else if(trend)
            possibly.set(name, trend.makers)
    }
    report.trend = possibly.size

    const channels = before.channels
    for(const [channel, credit] of channelCredits(index))
        channels.set(channel, credit)
    credits.writeCredits(options.out, { map: merged, channels, folders: foldersOfPklz, rows: remembered.rows, comments: credits.MAP_COMMENTS })
    const fileLines = [...merged.values()].filter(entry => /\.pklz$/i.test(entry.name)).length
    const nameLines = [...merged.values()].filter(entry => !/\.pklz$/i.test(entry.name) && !isEmpty(entry)).length
    console.log(t('credits_build_done', { file: options.out, files: fileLines, names: nameLines, channels: channels.size }))

    if(options.report){
        const out = []
        out.push(t('credits_build_report_title'), '')
        for(const how of ['name', 'batch', 'channel', 'handle', 'folder', 'filename', 'family', 'folders', 'trend'])
            out.push(`${t(`credits_build_how_${how}`)}: ${report[how]}`)
        out.push(`${t('credits_build_how_none')}: ${report.none.length}`, '')
        out.push(t('credits_build_report_none'), '')
        out.push(...report.none.sort((a, b) => a.toLowerCase() < b.toLowerCase() ? -1 : 1).map(name => possibly.has(name) ? `${name}\t(${t('credits_possibly_fingerprinted_by', { names: possibly.get(name).join(', ') })})` : name))
        out.push('', t('credits_build_report_all'), '')
        for(const [name, how] of [...howOf.entries()].sort((a, b) => a[0].toLowerCase() < b[0].toLowerCase() ? -1 : 1))
            out.push(`${name}\t${how || '-'}`)
        writeFileSync(options.report, out.join('\n') + '\n', 'utf-8')
        console.log(t('credits_build_report_written', { file: options.report }))
    }
}

/* ------------------------------------------------------------------------
 * credits:update
 * --------------------------------------------------------------------- */

/*
 * Gets the newest pklz credits: downloads the Lostwave Fingerprints sheet
 * (only reading it), adds what it says on top of the map that comes with
 * WerZatSong (cache/credits-sheet.tsv), then fills in the credits nobody knew
 * in the result files already written. Names already in a result file are
 * never changed. A search never does this by itself; it says to run this
 * when some credits are unknown.
 *
 *   npm run credits:update                  (or update-credits.cmd / sh update-credits.sh)
 *   npm run credits:update -- --force       also when the sheet names someone else for a lot of sources at once
 *   npm run credits:update -- --save <file> also keeps the downloaded sheet
 *   npm run credits:update -- --logs <dir>  result files somewhere else
 *   npm run credits:update -- --database <dir>  pklz somewhere else
 *
 * The pklz in the database the map does not know yet are looked up in the
 * sheet too, with the folders they are in. Only their names are read.
 */


function parseUpdateArguments(argv){
    const options = { save: null, logs: consts.LOGS_FOLDER, database: consts.DATABASE_FOLDER, force: false }
    for(let i = 0; i < argv.length; i++){
        if(argv[i] === '--force')
            options.force = true
        else if(argv[i] === '--save' && i + 1 < argv.length)
            options.save = resolve(argv[++i])
        else if(argv[i] === '--logs' && i + 1 < argv.length)
            options.logs = resolve(argv[++i])
        else if(argv[i] === '--database' && i + 1 < argv.length)
            options.database = resolve(argv[++i])
        // Read by utils/i18n.js.
        else if(argv[i] === '--language')
            i += 1
        else if(!argv[i].startsWith('--language='))
            throw new Error(t('credits_update_usage'))
    }
    return options
}

async function update(args){
    const { save, logs, database: databaseFolder, force } = parseUpdateArguments(args)
    const database = databasePklz(databaseFolder)
    const known = loadCredits().map
    const unknown = new Set(database.map(({ name }) => entryKey(name)).filter(key => key.startsWith('f:') && !known.has(key))).size
    messages.info(t('credits_sync_start'))
    const { messages: said, ok } = await syncSheet({ details: true, save, database, force })
    for(const { kind, text } of said)
        messages[kind](text)
    if(ok && unknown > 0)
        messages.info(t('credits_update_database', { count: unknown, folder: databaseFolder }))
    // Even without the sheet, a newer WerZatSong may know more than the
    // result files do.
    messages.info(t('credits_update_logs_start', { folder: logs }))
    const lookup = creditsLookup(loadCredits()).lookup
    const result = fillLogCredits(logs, lookup)
    if(!result.exists)
        messages.info(t('credits_update_no_logs', { folder: logs }))
    else if(result.lines > 0)
        messages.success(t('credits_update_logs_done', { lines: result.lines, files: result.files }))
    else
        messages.info(t('credits_update_logs_none', { checked: result.checked }))
    if(result.failed > 0)
        messages.warning(t('credits_update_logs_failed', { count: result.failed, folder: logs }))
    // Said last, so it is the line people see.
    if(!ok){
        messages.warning(t('credits_update_failed'))
        process.exitCode = 1
    }
}

/* ------------------------------------------------------------------------
 * credits:report
 * --------------------------------------------------------------------- */

/*
 * What credits WerZatSong would give the pklz files of a database, and how
 * it found each one, to check the credits against a real database.
 *
 *   npm run credits:report -- --database <folder> [--output <file>]
 *   npm run credits:report -- --tree <list of pklz files> [--output <file>]
 *   npm run credits:report -- --logs <folder of .audfprint.txt logs> [--output <file>]
 *
 * --database only lists the folder's file names; no pklz is opened.
 * --tree takes any list credits:build reads (filetrees, paths).
 * --logs reads the matches of earlier logs, so the song paths are used too.
 * The credits used are the ones a search would use now: the map that comes
 * with WerZatSong, the last check of the online sheet and credits-overrides.tsv.
 */



// Entries of earlier audfprint result files: (pklz name, matched song path),
// in whichever language they were written. The song path can name the exact
// channel the song came from.
function entriesFromLogs(folder){
    const entries = new Map()
    for(const path of resultFiles(folder)){
        const lines = readFileSync(path, 'utf-8').split(/\r?\n/)
        lines.forEach((line, i) => {
            const pklzName = pklzOf(line)
            const matchedFile = matchedFileOf(lines[i + 1] || '')
            if(pklzName && matchedFile)
                entries.set(`${pklzName}\u0000${matchedFile}`, { pklzName, matchedFile })
        })
    }
    return [...entries.values()]
}

// The pklz in a folder, as paths inside it (see listPklz in utils/database.js).
function pklzInFolder(folder){
    return listPklz(folder).files.map(path => relative(folder, path))
}

function write(argv, text){
    if(argv.output)
        writeFileSync(argv.output, text, 'utf-8')
    else
        process.stdout.write(text)
}

function parseReportArguments(args){
    const argv = {}
    for(let i = 0; i < args.length; i++){
        const option = /^--(database|tree|logs|output|language)(?:=(.*))?$/.exec(args[i])
        if(!option)
            throw new Error(t('report_usage'))
        argv[option[1]] = option[2] ?? args[++i]
        if(argv[option[1]] === undefined)
            throw new Error(t('report_usage'))
    }
    return argv
}

function report(args){
    const argv = parseReportArguments(args)
    const { lookup } = creditsLookup(loadCredits())
    if(argv.logs){
        const out = []
        const byHow = new Map()
        let found = 0
        const entries = entriesFromLogs(argv.logs)
        for(const entry of entries){
            const credit = lookup(entry)
            const step = credit.how || '-'
            byHow.set(step, (byHow.get(step) || 0) + 1)
            if(credit.found)
                found += 1
            out.push(`${entry.pklzName}  <-  ${entry.matchedFile}\n    ${formatCreditLine(credit)}\n    [${step}]`)
        }
        const head = [t('report_logs_found', { found, total: entries.length }), '', t('report_how'),
            ...[...byHow.entries()].sort((a, b) => b[1] - a[1]).map(([step, count]) => `  ${String(count).padStart(6)}  ${step}`), '']
        write(argv, [...head, ...out, ''].join('\n'))
        return
    }
    let paths
    if(argv.database)
        paths = pklzInFolder(argv.database)
    else if(argv.tree)
        paths = readListing(argv.tree).map(file => [...file.folders].reverse().concat(file.name).join('/'))
    else {
        throw new Error(t('report_usage'))
    }
    const lines = []
    const unresolved = new Map()
    const byHow = new Map()
    const byFolder = new Map()
    let found = 0
    for(const path of paths.sort((a, b) => a.localeCompare(b))){
        const credit = lookup({ pklzPath: path })
        const step = credit.how || '-'
        byHow.set(step, (byHow.get(step) || 0) + 1)
        const top = path.split(/[\\/]/).length > 1 ? path.split(/[\\/]/)[0] : '.'
        if(!byFolder.has(top))
            byFolder.set(top, new Map())
        const line = formatCreditLine(credit)
        byFolder.get(top).set(line, (byFolder.get(top).get(line) || 0) + 1)
        if(credit.found)
            found += 1
        else {
            const folder = path.split(/[\\/]/).slice(0, -1).join('/') || '.'
            if(!unresolved.has(folder))
                unresolved.set(folder, [])
            unresolved.get(folder).push(path.split(/[\\/]/).pop())
        }
        lines.push(`${path}\n    ${line}\n    [${step}]`)
    }
    const out = []
    out.push(t('report_files_found', { found, total: paths.length, percent: (100 * found / Math.max(1, paths.length)).toFixed(1) }), '')
    out.push(t('report_how'))
    for(const [step, count] of [...byHow.entries()].sort((a, b) => b[1] - a[1]))
        out.push(`  ${String(count).padStart(6)}  ${step}`)
    out.push('', t('report_not_found_by_folder'))
    for(const [folder, names] of [...unresolved.entries()].sort((a, b) => b[1].length - a[1].length))
        out.push(`  ${folder} (${names.length}): ${names.slice(0, 6).join(', ')}${names.length > 6 ? ', ...' : ''}`)
    out.push('', t('report_by_top_folder'))
    for(const [folder, counts] of [...byFolder.entries()].sort((a, b) => a[0].localeCompare(b[0]))){
        const total = [...counts.values()].reduce((sum, count) => sum + count, 0)
        out.push(`  ${folder} (${total})`)
        const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1])
        for(const [line, count] of sorted.slice(0, 8))
            out.push(`    ${String(count).padStart(5)}  ${line}`)
        if(sorted.length > 8)
            out.push(`           ${t('report_more_lines', { count: sorted.length - 8 })}`)
    }
    out.push('', t('report_every_file'), '', ...lines, '')
    write(argv, out.join('\n'))
}

/* ------------------------------------------------------------------------
 * Which command
 * --------------------------------------------------------------------- */

const COMMANDS = { build, update, report }

if(require.main === module){
    const [command, ...args] = process.argv.slice(2)
    const run = COMMANDS[command]
    Promise.resolve()
        .then(() => {
            if(!run)
                throw new Error(t('credits_usage'))
            return run(args)
        })
        .catch(error => {
            messages.warning(error.message || String(error))
            process.exitCode = error.exitCode || 1
        })
}

module.exports = { folderPeople, knownFolders, readFlatTree, readGuidedTree, readListing, readPathList }
