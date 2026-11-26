const { homedir } = require('node:os')
const { join, resolve } = require('node:path')

const ROOT_PATH = join(__dirname, '..')

// A folder setting as a full path: "~" is the home folder, and a path that
// is not a full one is taken from WerZatSong's folder, wherever it is run from.
function folderPath(path){
    const text = String(path)
    const home = /^~(?=$|[\\/])/.test(text) ? homedir() + text.slice(1) : text
    return resolve(ROOT_PATH, home)
}

const consts = {
    // Limits
    MAX_CORES_ALLOWED: 16, // avoid out of memory error
    // Endpoints
    ACOUSTID_LOOKUP_ENDPOINT: 'https://api.acoustid.org/v2/lookup',
    ACOUSTID_TRACK_ENDPOINT: 'https://acoustid.org/track',
    AUDIOTAG_ENDPOINT: 'https://audiotag.info/api',
    // Folders
    // Where the PKLZ files are: WerZatSong's own "database" folder, or any
    // other folder, for example 'D:/pklz', '/Volumes/Drive/pklz' or
    // '~/pklz' (write / between folders).
    DATABASE_FOLDER: 'database',
    INPUT_FOLDER: join(ROOT_PATH, 'input'),
    LOGS_FOLDER: join(ROOT_PATH, 'logs'),
    PRECOMPUTED_FOLDER: join(ROOT_PATH, 'precomputed'),
    PROCESSED_FOLDER: join(ROOT_PATH, 'processed'),
    TEMP_FOLDER: join(ROOT_PATH, 'temp'),
    // Files
    AFPTS_FILE: join(ROOT_PATH, 'temp', '_afpts.txt'),
    AUDFPRINT_PROGRAM: join(ROOT_PATH, 'libs', 'audfprint', 'audfprint.py'),
    AUDFPRINT_SCRIPT: join(ROOT_PATH, 'scripts', 'audfprint.js'),
    ENV_FILE: join(ROOT_PATH, '.env'),
    EXAMPLE_ENV_FILE: join(ROOT_PATH, '.env.example'),
    FILLER_FILE: join(ROOT_PATH, 'resources', 'filler.mp3'),
    FPCALC_SCRIPT: join(ROOT_PATH, 'scripts', 'fpcalc.js'),
    MUSICBRAINZ_SCRIPT: join(ROOT_PATH, 'scripts', 'musicbrainz.js'),
    PKLZS_FILE: join(ROOT_PATH, 'temp', '_pklzs.txt'),
    RESULTS_FILE: join(ROOT_PATH, 'temp', '_results.json'),
    SHAZAM_SCRIPT: join(ROOT_PATH, 'scripts', 'shazam.py')
}

consts.DEFAULT_DATABASE_FOLDER = folderPath('database')
consts.DATABASE_FOLDER = folderPath(consts.DATABASE_FOLDER)
consts.folderPath = folderPath

module.exports = consts
