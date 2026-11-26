# coding=utf-8
"""
wzs_i18n.py - LOCAL ADDITION to audfprint (not upstream).

The messages this library prints, in the language WerZatSong runs in.

werzatsong.js passes the language down as WERZATSONG_LANGUAGE (its
"language_code", such as en or it) and the texts come from the same files it
uses itself, localizations/console_strings_<language>.json, under the "py_"
keys. Every
call also carries the original English text, so the library prints exactly
what upstream audfprint prints when it runs on its own, without WerZatSong
or its localizations folder.

WERZATSONG_EVENTS=1 (set by werzatsong.js for precompute and --merge) also
makes a few results come out as a line of their own:
    WZS-EVENT {"event": "<name>", ...}
werzatsong.js reads those instead of the wording of the human messages, which
changes with the language. Nobody else sets the variable, so nobody else sees
them.

Re-apply this if audfprint is ever updated from upstream.
"""
from __future__ import print_function

import json
import os
import re
import unicodedata

_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..',
                       'localizations')
_STRINGS_FILE = re.compile(r'^console_strings_(.+)\.json$')
_PLACEHOLDER = re.compile(r'\{(\w+)\}')
EVENT_PREFIX = 'WZS-EVENT '


def _code(text):
    """ A language code the way werzatsong.js writes it: plain ASCII. """
    text = unicodedata.normalize('NFD', str(text or ''))
    text = re.sub(u'[\u0300-\u036f]', '', text).strip().lower()
    return re.sub(r'[^a-z0-9_-]', '', text)


def _read(path):
    try:
        with open(path, encoding='utf-8') as f:
            strings = json.load(f)
        return strings if isinstance(strings, dict) else None
    except Exception:
        return None


def _load(code):
    """ The texts of the localization file whose code is <code>, {} for
        English or when there is none. """
    if code in ('', 'en'):
        return {}
    try:
        files = sorted(os.listdir(_FOLDER))
    except OSError:
        return {}
    for name in files:
        match = _STRINGS_FILE.match(name)
        strings = _read(os.path.join(_FOLDER, name)) if match else None
        if strings is None:
            continue
        language = unicodedata.normalize('NFC', match.group(1))
        if language == 'English':
            continue
        if (_code(strings.get('language_code') or language) or _code(language)) == code:
            return strings
    return {}


_strings = _load(_code(os.environ.get('WERZATSONG_LANGUAGE', '')))
_events = os.environ.get('WERZATSONG_EVENTS', '').strip() == '1'


def t(key, english, **values):
    """ The text for <key> in the current language (<english> when there is
        none), with each {name} replaced by values[name]. """
    template = _strings.get(key)
    if not isinstance(template, str):
        template = english

    def value(match):
        name = match.group(1)
        return str(values[name]) if name in values else match.group(0)

    return _PLACEHOLDER.sub(value, template)


def event_line(_event_name, **fields):
    """ The WZS-EVENT line for <_event_name>, or None when nobody asked for
        them. (The odd parameter name leaves "name" free for a field.) """
    if not _events:
        return None
    fields['event'] = _event_name
    return EVENT_PREFIX + json.dumps(fields, sort_keys=True)


def emit(_event_name, **fields):
    """ Print the WZS-EVENT line for <_event_name>, when they were asked for. """
    line = event_line(_event_name, **fields)
    if line is not None:
        print(line, flush=True)
