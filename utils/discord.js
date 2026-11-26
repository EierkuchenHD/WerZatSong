/*
 * Text that goes to Discord outside a code block, made harmless.
 *
 * Discord reads markdown in a message: *x* is italic, **x** bold, __x__
 * underlined, ~~x~~ struck through, ||x|| a spoiler, `x` inline code, ```
 * opens a code block, "# " at the start of a line a heading, "> " a quote,
 * "- " a list, [x](y) a link, :name: an emoji. A file name like
 * "**demo** _final_ (live).mp3" would come out mangled, and one with three
 * backticks in it would wreck the rest of the message.
 *
 * - inlineCode(): for file names. They go between backticks, where Discord
 *   shows everything as written; the only thing that could end the inline
 *   code early is a backtick, so any backtick in the name is taken out.
 * - escapeMarkdown(): for any other text with something in it WerZatSong
 *   did not write (a file name, an error). Every character Discord could
 *   read as markdown gets a backslash in front of it, which makes Discord
 *   show that character as it is: nothing is lost.
 *
 * Text inside a fenced code block needs neither: werzatsong.js only has to
 * keep three backticks in a row from closing the block (fenceSafe).
 * Mentions (@everyone, @here, <@id>) are made harmless by utils/webhook.js
 * for every message, wherever they are.
 */

// Shown when a name is nothing but backticks: inline code cannot be empty.
const EMPTY_PLACEHOLDER = '-'

function inlineCode(text){
    const cleaned = String(text ?? '')
        .replace(/`/g, '')
        // A line break would end the inline code; file names have none, but
        // the text is not always a file name.
        .replace(/[\r\n]+/g, ' ')
        .trim()
    return `\`${cleaned === '' ? EMPTY_PLACEHOLDER : cleaned}\``
}

// Discord treats a backslash before any ASCII punctuation as "show this
// character as it is", so every one that can start or end markdown gets one:
// emphasis, spoilers, code, quotes, headings, lists (- + 1.), links and
// emoji (:name:).
const MARKDOWN_CHARACTERS = /[\\*_~|`>#\-+[\]()<:.]/g

function escapeMarkdown(text){
    return String(text ?? '').replace(MARKDOWN_CHARACTERS, '\\$&')
}

module.exports = { EMPTY_PLACEHOLDER, escapeMarkdown, inlineCode }
