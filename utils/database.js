/*
 * The database folder: finding the subfolder --folder and --merge name, and
 * the PKLZ files in it. The same on Windows, Linux and macOS: / and \ both
 * separate folders, and a folder name matches whatever its case, as it does
 * on Windows and macOS.
 */

const { readdirSync, realpathSync, statSync } = require('node:fs')
const { basename, isAbsolute, join, relative, resolve, sep } = require('node:path')

const MERGED_SUFFIX = '__merged'

const sameName = (a, b) => a.normalize('NFC').toLowerCase() === b.normalize('NFC').toLowerCase()

const isMerged = name => name.toLowerCase().endsWith(MERGED_SUFFIX)

function isFolder(path){
    try { return statSync(path).isDirectory() }
    catch { return false }
}

function entriesOf(dir){
    try { return readdirSync(dir, { withFileTypes: true }) }
    catch { return null }
}

// The folders of a path, without empty parts and ".".
const partsOf = text => String(text).split(/[\\/]+/).filter(part => part !== '' && part !== '.')

// path inside root -> the folders between them ([] for root itself), else null.
function partsInside(root, path){
    const inside = relative(root, path)
    if(inside === '')
        return []
    if(isAbsolute(inside) || partsOf(inside)[0] === '..')
        return null
    return partsOf(inside)
}

// The subfolder of dir named like name: the exact name first, then the same
// name in any case. null when there is none.
function childFolder(dir, name){
    if(isFolder(join(dir, name)))
        return join(dir, name)
    const entries = entriesOf(dir) || []
    const found = entries.find(entry => sameName(entry.name, name) && isFolder(join(dir, entry.name)))
    return found ? join(dir, found.name) : null
}

// The folder parts lead to from dir, one name at a time, or null.
function followParts(dir, parts){
    let at = dir
    for(const part of parts){
        if(part === '..')
            return null
        at = childFolder(at, part)
        if(at === null)
            return null
    }
    return at
}

// Every folder in the database whose path ends with parts. A "__merged"
// folder only when asked for one. Folders linked into the database are
// followed, each real folder once.
function foldersEndingWith(database, parts){
    const found = []
    const seen = new Set()
    const wantMerged = isMerged(parts[parts.length - 1])
    const walk = (dir, path) => {
        let real
        try { real = realpathSync(dir) }
        catch { return }
        if(seen.has(real))
            return
        seen.add(real)
        for(const entry of entriesOf(dir) || []){
            const full = join(dir, entry.name)
            if(!(entry.isDirectory() || (entry.isSymbolicLink() && isFolder(full))))
                continue
            if(isMerged(entry.name) && !wantMerged)
                continue
            const next = [...path, entry.name]
            if(next.length >= parts.length && parts.every((part, i) => sameName(next[next.length - parts.length + i], part)))
                found.push(full)
            walk(full, next)
        }
    }
    walk(database, [])
    return found
}

/*
 * The folder to search, from what --folder or --merge says:
 *   nothing, "." or the database folder itself: the whole database;
 *   a path inside the database ("indie-rock", "genres/indie-rock"), with or
 *   without the database folder's own name in front ("database/indie-rock"),
 *   or a full path to a folder inside it;
 *   otherwise the folder anywhere in the database whose path ends like that
 *   ("indie-rock" for "genres/indie-rock"), when only one does.
 * -> { path, parts } (parts: its folders inside the database), or
 *    { error: 'missing' | 'outside' | 'ambiguous', matches: [paths] }
 */
function findSearchFolder(database, asked){
    const text = String(asked ?? '').trim().replace(/^(["'])(.*)\1$/, '$2').trim()
    if(text === '')
        return { path: database, parts: [] }
    if(isAbsolute(text) || /^[A-Za-z]:[\\/]/.test(text) || /^[\\/]{2}/.test(text)){
        const parts = partsInside(database, resolve(text))
        if(parts !== null){
            const path = followParts(database, parts)
            return path ? { path, parts: partsInside(database, path) } : { error: 'missing', matches: [] }
        }
        // "/genres": written from the top of the database.
        if(/^[\\/][^\\/]/.test(text)){
            const found = findInside(database, partsOf(text))
            if(!found.error || found.error === 'ambiguous')
                return found
        }
        return { error: 'outside', matches: [] }
    }
    return findInside(database, partsOf(text))
}

// A path inside the database, or a folder's name anywhere in it.
function findInside(database, parts){
    if(parts.length === 0)
        return { path: database, parts: [] }
    if(parts.includes('..')){
        const inside = partsInside(database, resolve(database, ...parts))
        if(inside === null)
            return { error: 'outside', matches: [] }
        const path = followParts(database, inside)
        return path ? { path, parts: inside } : { error: 'missing', matches: [] }
    }
    const tries = [parts]
    if(sameName(parts[0], basename(database)))
        tries.push(parts.slice(1))
    for(const tried of tries){
        const path = followParts(database, tried)
        if(path)
            return { path, parts: partsInside(database, path) ?? tried }
    }
    const matches = foldersEndingWith(database, parts)
    if(matches.length === 1)
        return { path: matches[0], parts: partsInside(database, matches[0]) ?? parts }
    return { error: matches.length > 1 ? 'ambiguous' : 'missing', matches }
}

/*
 * The PKLZ files in a folder and the folders in it, sorted, so every system
 * lists them in the same order. Files and folders linked into it are
 * followed, each real folder once. skipMerged: leave out "<name>__merged"
 * folders (--merge output). A folder that cannot be read (a drive's system
 * folders, no permission) is left out and listed in unreadable.
 * -> { files, unreadable }
 */
function listPklz(folder, { skipMerged = false } = {}){
    const files = []
    const unreadable = []
    const seen = new Set()
    const walk = dir => {
        let real
        try { real = realpathSync(dir) }
        catch { return }
        if(seen.has(real))
            return
        seen.add(real)
        const entries = entriesOf(dir)
        if(entries === null){
            unreadable.push(dir)
            return
        }
        for(const entry of entries){
            const full = join(dir, entry.name)
            let kind = entry.isDirectory() ? 'dir' : entry.isFile() ? 'file' : null
            if(entry.isSymbolicLink()){
                try { kind = statSync(full).isDirectory() ? 'dir' : 'file' }
                catch { kind = null }
            }
            if(kind === 'dir' && !(skipMerged && isMerged(entry.name)))
                walk(full)
            else if(kind === 'file' && /\.pklz$/i.test(entry.name))
                files.push(full)
        }
    }
    walk(folder)
    // By the path inside folder, with / on every system, since \ and /
    // would put the same files in a different order.
    const key = file => relative(folder, file).split(sep).join('/')
    const keys = new Map(files.map(file => [file, key(file)]))
    const order = (a, b) => keys.get(a) < keys.get(b) ? -1 : keys.get(a) > keys.get(b) ? 1 : 0
    return { files: files.sort(order), unreadable }
}

// How a folder of the database is shown: its path inside it, with / on
// every system ("genres/indie-rock"), or the database folder itself.
const shownFolder = (database, parts) => parts.length > 0 ? parts.join('/') : database

module.exports = { MERGED_SUFFIX, findSearchFolder, isFolder, isMerged, listPklz, partsInside, shownFolder }
