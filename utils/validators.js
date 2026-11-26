const { readFileSync, writeFileSync } = require('node:fs')
const readline = require('node:readline')
const consts = require('./consts')
const { t } = require('./i18n')
const { exit, warning } = require('./messages')
const postWebhook = require('./webhook')
const { postAudiotag } = require('../scripts/audiotag')

const ACOUSTID_KEY_REGEX = /^[a-zA-Z0-9_.-]{10}$/
const AUDIOTAG_KEY_REGEX = /^[a-z0-9]{32}$/
const DEFAULT_DURATION = '140:360' // min:max
const DEFAULT_EXTENSION = 10 // seconds
const DURATION_REGEX = /^\d+:\d+$/
const MAX_DURATION_ALLOWED = 600 // seconds
const MIN_DURATION_ALLOWED = 30 // seconds
const MAX_EXTENSION_ALLOWED = 25 // seconds
const MIN_EXTENSION_ALLOWED = 1 // seconds
// Every form Discord hands out: discord.com or the older discordapp.com, the
// ptb. and canary. clients, an optional API version (/api/v10/...), and an
// optional query string such as ?thread_id=... to post into a thread.
const WEBHOOK_REGEX = /^https:\/\/(?:(?:ptb|canary)\.)?discord(?:app)?\.com\/api\/(?:v\d+\/)?webhooks\/\d+\/[a-zA-Z0-9_.-]+\/?(?:\?[^\s#]*)?$/

// Lines that came in together with an answer (pasted or piped in all at
// once): they are the answers to the next questions.
const pendingAnswers = []
let inputEnded = false

// One answer from the console. null when nothing more can be read from it
// (input closed or redirected from an empty file): asking again would never
// end, so the caller stops instead.
async function requestValue(request){
    if(pendingAnswers.length > 0){
        process.stdout.write(`${request}\n`)
        return pendingAnswers.shift().trim()
    }
    if(inputEnded)
        return null
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    })
    return await new Promise(resolve => {
        let answer = null
        rl.on('line', line => {
            if(answer !== null){
                pendingAnswers.push(line)
                return
            }
            answer = line
            // Closed once the rest of what arrived with it has been read, so
            // an open console does not keep WerZatSong running afterwards.
            setImmediate(() => rl.close())
        })
        rl.on('close', () => {
            if(answer === null)
                inputEnded = true
            resolve(answer === null ? null : answer.trim())
        })
        rl.setPrompt(request)
        rl.prompt()
    })
}

// What was pasted, without the quotes a copied value sometimes comes with.
async function requestCleanValue(request){
    const rawInput = await requestValue(request)
    if(rawInput === null)
        exit(t('setup_input_closed'))
    return rawInput.replace(/^["']|["']$/g, '').trim()
}

// Sets NAME=value in .env: the line that is there is replaced, or one is
// added. Written with a function, so a "$" in the value stays as it is.
function saveEnvValue(name, value){
    const envContent = readFileSync(consts.ENV_FILE, 'utf-8')
    const line = new RegExp(`^${name}=.*$`, 'm')
    const updatedEnv = line.test(envContent)
        ? envContent.replace(line, () => `${name}=${value}`)
        : `${envContent.trim()}\n${name}=${value}\n`
    writeFileSync(consts.ENV_FILE, updatedEnv)
}

// Until a key AudioTag accepts is given: on the first run, a typo costs a
// second try, not the whole setup.
async function validateAudiotag(key){
    if(!key || !AUDIOTAG_KEY_REGEX.test(key)){
        warning(t('audiotag_key_missing_warning'))
        while(true){
            const keyInput = await requestCleanValue(t('audiotag_key_prompt'))
            if(AUDIOTAG_KEY_REGEX.test(keyInput)){
                let keyValidated = false
                try {
                    const { success } = await postAudiotag('info', true, keyInput)
                    keyValidated = Boolean(success)
                }
                catch { /* no answer from AudioTag counts as a key it did not accept */ }
                if(keyValidated){
                    saveEnvValue('AUDIOTAG_KEY', keyInput)
                    return keyInput
                }
            }
            warning(t('audiotag_key_invalid'))
        }
    }
    return null
}

function validateDuration(duration){
    if(typeof duration === 'string' && duration.length > 0 && DURATION_REGEX.test(duration.trim())){
        const [min, max] = duration.split(':').map(Number)
        return (min >= MIN_DURATION_ALLOWED && max <= MAX_DURATION_ALLOWED) ? duration.trim() : DEFAULT_DURATION
    }
    return DEFAULT_DURATION
}

function validateExtension(extension){
    if(typeof extension === 'number')
        return (extension <= MAX_EXTENSION_ALLOWED && extension >= MIN_EXTENSION_ALLOWED) ? extension : DEFAULT_EXTENSION
    return DEFAULT_EXTENSION
}

async function validateMusicbrainz(key){
    let keys = null
    if(key?.length > 0){
        const filtered = key.split(',').filter(k => ACOUSTID_KEY_REGEX.test(k))
        keys = filtered.length > 0 ? filtered : null
    }
    if(!key || !keys){
        warning(t('acoustid_key_missing_warning'))
        while(true){
            const keyInput = await requestCleanValue(t('acoustid_key_prompt'))
            const validKeys = keyInput.split(',').map(k => k.trim()).filter(k => ACOUSTID_KEY_REGEX.test(k))
            if(validKeys.length > 0){
                const joinedKeys = validKeys.join(',')
                saveEnvValue('ACOUSTID_KEY', joinedKeys)
                return joinedKeys
            }
            warning(t('acoustid_key_invalid'))
        }
    }
    return null
}

// The welcome message, with who translated WerZatSong when it isn't English.
function welcomeMessage(){
    return [t('webhook_welcome_message'), t('webhook_translation_credit')].filter(Boolean).join(' ')
}

// A URL is only kept once the welcome message has really been posted with it.
async function validateWebhook(webhook){
    if(!webhook || !WEBHOOK_REGEX.test(webhook)){
        warning(t('webhook_missing_warning'))
        while(true){
            const webhookInput = await requestCleanValue(t('webhook_prompt'))
            if(WEBHOOK_REGEX.test(webhookInput) && await postWebhook(webhookInput, welcomeMessage())){
                saveEnvValue('WEBHOOK_URL', webhookInput)
                return webhookInput
            }
            warning(t('webhook_invalid'))
        }
    }
    return null
}

// What .env has, as the checks above see it.
const hasWebhook = value => WEBHOOK_REGEX.test(value || '')
const hasAudiotagKey = value => AUDIOTAG_KEY_REGEX.test(value || '')
const hasAcoustidKey = value => String(value || '').split(',').some(key => ACOUSTID_KEY_REGEX.test(key))

// --no-discord: nothing is posted on Discord this run. --no-prompt: nothing
// is asked; the run goes with what .env has.
const RUN_OPTIONS = {
    discord: 'no-discord',
    prompt: 'no-prompt'
}

// The values --no-discord takes: all (the same as --no-discord alone, no
// messages), keep-match (only the "match found" messages) and keep-nomatch
// (only the "no match found" messages).
const NO_DISCORD_VALUES = ['all', 'keep-match', 'keep-nomatch']

// The value --no-discord was given -> one of NO_DISCORD_VALUES; null when it
// was not given, undefined for a value it does not know.
function noDiscordChoice(value){
    if(value === undefined || value === null || value === false)
        return null
    const text = value === true ? '' : String(value).trim().toLowerCase()
    if(text === '')
        return 'all'
    return NO_DISCORD_VALUES.includes(text) ? text : undefined
}

/*
 * What a run does about the Discord webhook and the two API keys, before
 * anything is asked. The webhook is used unless --no-discord leaves out every
 * message; a key only when its mode is in the command. Whatever is missing is
 * asked for, unless --no-prompt is given: then a missing webhook means no
 * Discord messages, and a missing key means its mode does not run.
 *
 * env: what .env has. modes: the modes of the run. noDiscord: the value of
 * --no-discord (see noDiscordChoice; true is 'all'). noPrompt: whether
 * --no-prompt was given.
 * -> {
 *   discordOff: null, 'option' (--no-discord) or 'missing' (no webhook,
 *     with --no-prompt),
 *   keptPosts: null, 'match' or 'nomatch', the only kind of match message
 *     still sent (keep-match, keep-nomatch),
 *   skippedModes: [modes that will not run]
 * }
 */
function planSetup({ env = {}, modes = [], noDiscord = null, noPrompt = false }){
    const choice = noDiscord === true ? 'all' : noDiscord || null
    const missing = {
        audiotag: !hasAudiotagKey(env.AUDIOTAG_KEY),
        musicbrainz: !hasAcoustidKey(env.ACOUSTID_KEY)
    }
    const discordOff = choice === 'all' ? 'option' : noPrompt && !hasWebhook(env.WEBHOOK_URL) ? 'missing' : null
    const kept = { 'keep-match': 'match', 'keep-nomatch': 'nomatch' }
    return {
        discordOff,
        keptPosts: discordOff === null ? kept[choice] || null : null,
        skippedModes: noPrompt ? modes.filter(mode => missing[mode]) : []
    }
}

module.exports = {
    ACOUSTID_KEY_REGEX,
    AUDIOTAG_KEY_REGEX,
    NO_DISCORD_VALUES,
    RUN_OPTIONS,
    noDiscordChoice,
    WEBHOOK_REGEX,
    hasAcoustidKey,
    hasAudiotagKey,
    hasWebhook,
    planSetup,
    saveEnvValue,
    validateAudiotag,
    validateDuration,
    validateExtension,
    validateMusicbrainz,
    validateWebhook
}
