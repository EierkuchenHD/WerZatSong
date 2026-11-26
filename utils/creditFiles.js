'use strict'

const { createHash } = require('crypto')
const { closeSync, openSync, readFileSync, readSync, readdirSync, statSync } = require('fs')
const { basename, dirname, join, relative, resolve, isAbsolute } = require('path')

/*
 * Credit files
 *
 * A credit file (.wzsc) comes with a package of pklz and says who
 * fingerprinted them and who suggested their source. It is a UTF-8 JSON file:
 *
 *   {
 *     "wzsCredits": 1,
 *     "fingerprintedBy": ["Numerophobe"],
 *     "suggestedBy": ["Nel"],
 *     "files": [
 *       { "name": "pack-1.pklz", "bytes": 1048576, "sha256": "<64 hex digits>" },
 *       { "name": "pack-2.pklz", "bytes": 2097152, "sha256": "<64 hex digits>", "fingerprintedBy": ["AzureBlast"] }
 *     ]
 *   }
 *
 * A listed pklz is found by its name and size in the credit file's folder
 * and the folders inside it, then anywhere in the database by its size and
 * SHA-256, so a renamed pklz or a credit file in another folder still finds
 * its files. The package's names cover the pklz it does not list too, but only
 * in its folder and the folders inside it. A file's own names come before the
 * package's, and what neither gives is left to the other credits. The credit
 * file nearest to a pklz comes first. With several credit files in one
 * folder, a pklz takes the credits of the one that lists it, and one none of
 * them lists the package credits they all agree on.
 */

const CREDIT_FILE_EXTENSION = '.wzsc'

const cleanNames = value => Array.isArray(value)
    ? [...new Set(value.map(name => String(name ?? '').replace(/\s+/g, ' ').trim()).filter(Boolean))]
    : []
// A list with at least one name, or null: an empty or missing list says nothing.
const namesGiven = value => {
    const list = cleanNames(value)
    return list.length > 0 ? list : null
}

function parseCreditFile(text){
    const data = JSON.parse(String(text).replace(/^﻿/, ''))
    if(!data || typeof data !== 'object' || Array.isArray(data) || !Number.isInteger(data.wzsCredits) || data.wzsCredits < 1)
        throw new Error('not a WerZatSong credit file')
    const files = (Array.isArray(data.files) ? data.files : [])
        .filter(file => file && typeof file === 'object')
        .map(file => ({
            name: typeof file.name === 'string' && file.name.trim() !== '' ? file.name.trim().split(/[\\/]/).pop() : null,
            bytes: Number.isSafeInteger(file.bytes) && file.bytes >= 0 ? file.bytes : null,
            sha256: typeof file.sha256 === 'string' && /^[0-9a-f]{64}$/i.test(file.sha256.trim()) ? file.sha256.trim().toLowerCase() : null,
            fingerprinters: namesGiven(file.fingerprintedBy),
            suggesters: namesGiven(file.suggestedBy)
        }))
        .filter(file => file.name || file.sha256)
    return { fingerprinters: namesGiven(data.fingerprintedBy), suggesters: namesGiven(data.suggestedBy), files }
}

/*
 * The credit files of a database and where its pklz are. Each folder's credit
 * files are read in name order. unreadable: the credit files that are not
 * valid JSON in this format.
 */
function scanDatabase(root){
    const scan = { root: root ? resolve(root) : null, creditFiles: new Map(), pklz: new Map(), unreadable: [] }
    if(!scan.root)
        return scan
    const walk = folder => {
        let entries
        try { entries = readdirSync(folder, { withFileTypes: true }) }
        catch { return }
        entries.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)
        for(const entry of entries){
            const path = join(folder, entry.name)
            if(entry.isDirectory()){
                walk(path)
                continue
            }
            if(!entry.isFile())
                continue
            const lower = entry.name.toLowerCase()
            if(lower.endsWith(CREDIT_FILE_EXTENSION)){
                try {
                    const list = scan.creditFiles.get(folder) || []
                    list.push({ path, ...parseCreditFile(readFileSync(path, 'utf-8')) })
                    scan.creditFiles.set(folder, list)
                }
                catch { scan.unreadable.push(path) }
            }
            else if(lower.endsWith('.pklz')){
                const list = scan.pklz.get(lower) || []
                list.push(path)
                scan.pklz.set(lower, list)
            }
        }
    }
    walk(scan.root)
    // The listed files with a checksum, by size.
    scan.bySize = new Map()
    for(const creditFiles of scan.creditFiles.values())
        for(const creditFile of creditFiles)
            for(const file of creditFile.files)
                if(file.sha256 && file.bytes !== null){
                    const list = scan.bySize.get(file.bytes) || []
                    list.push({ creditFile, file })
                    scan.bySize.set(file.bytes, list)
                }
    return scan
}

// SHA-256 of a file, kept while its size and time stay the same.
const hashes = new Map()
function sha256Of(path, stat){
    const key = `${path}\u0000${stat.size}\u0000${stat.mtimeMs}`
    if(hashes.has(key))
        return hashes.get(key)
    const hash = createHash('sha256')
    const buffer = Buffer.alloc(1 << 20)
    const handle = openSync(path, 'r')
    try {
        let read
        while((read = readSync(handle, buffer, 0, buffer.length, null)) > 0)
            hash.update(buffer.subarray(0, read))
    }
    finally { closeSync(handle) }
    const digest = hash.digest('hex')
    hashes.set(key, digest)
    return digest
}

const statOf = path => {
    try { return statSync(path) }
    catch { return null }
}

// The entry of a credit file about the pklz at path, by its name and size.
function entryFor(creditFile, path, stat){
    const name = basename(path).toLowerCase()
    const sameSize = file => file.bytes === null || stat === null || file.bytes === stat.size
    return creditFile.files.find(file => file.name && file.name.toLowerCase() === name && sameSize(file)) || null
}

// A listed file anywhere in the database with this pklz's size and SHA-256.
function entryBySum(scan, path, stat){
    const candidates = stat ? scan.bySize.get(stat.size) || [] : []
    if(candidates.length === 0)
        return null
    let digest
    try { digest = sha256Of(path, stat) }
    catch { return null }
    return candidates.find(({ file }) => file.sha256 === digest) || null
}

const sameList = (a, b) => JSON.stringify(a) === JSON.stringify(b)

const entryCredits = (creditFile, entry) => ({
    fingerprinters: entry.fingerprinters || creditFile.fingerprinters,
    suggesters: entry.suggesters || creditFile.suggesters
})

// What the package credits of one folder's credit files say about a pklz none
// of them lists.
function packageSays(creditFiles){
    const agreed = field => {
        const lists = creditFiles.map(creditFile => creditFile[field])
        return lists.every(list => list && sameList(list, lists[0])) ? lists[0] : null
    }
    return { fingerprinters: agreed('fingerprinters'), suggesters: agreed('suggesters') }
}

const inside = (folder, root) => {
    const way = relative(root, folder)
    return way === '' || (!way.startsWith('..') && !isAbsolute(way))
}

/*
 * What the credit files say about a pklz, by its path or, when only its name
 * is known, by where a pklz of that name is in the database:
 * { fingerprinters, suggesters }, each null when they say nothing.
 */
function creditFilesSay(scan, { pklzPath = null, pklzName = null } = {}){
    const found = { fingerprinters: null, suggesters: null }
    if(!scan || scan.creditFiles.size === 0)
        return found
    // By name only when the database has one pklz of that name.
    const named = pklzName ? scan.pklz.get(basename(String(pklzName)).toLowerCase()) || [] : []
    const path = pklzPath ? resolve(pklzPath) : named.length === 1 ? named[0] : null
    if(!path || !inside(dirname(path), scan.root))
        return found
    const add = said => {
        found.fingerprinters = found.fingerprinters || said.fingerprinters
        found.suggesters = found.suggesters || said.suggesters
    }
    const stat = statOf(path)
    // The credit files of its folder and of the folders around it, nearest first.
    const around = []
    for(let folder = dirname(path); ; folder = dirname(folder)){
        if(scan.creditFiles.has(folder))
            around.push(scan.creditFiles.get(folder))
        if(folder === scan.root || dirname(folder) === folder)
            break
    }
    // Listed by name in its own package first, then by checksum anywhere.
    for(const creditFiles of around){
        const listed = creditFiles.map(creditFile => [creditFile, entryFor(creditFile, path, stat)]).find(([, entry]) => entry)
        if(listed){
            add(entryCredits(...listed))
            break
        }
    }
    if(!found.fingerprinters || !found.suggesters){
        const bySum = entryBySum(scan, path, stat)
        if(bySum)
            add(entryCredits(bySum.creditFile, bySum.file))
    }
    for(const creditFiles of around){
        if(found.fingerprinters && found.suggesters)
            break
        add(packageSays(creditFiles))
    }
    return found
}

module.exports = {
    CREDIT_FILE_EXTENSION,
    creditFilesSay,
    parseCreditFile,
    scanDatabase,
    sha256Of
}
