/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */

function __awaiter(thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
}

function __classPrivateFieldGet(receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
}

function __classPrivateFieldSet(receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
}

// Bundled with Packemon: https://packemon.dev

const LATEST_EMOJI_VERSION = '14.0';

function getFetchUrl(path, version, cdnUrl) {
  let fetchUrl = `https://cdn.jsdelivr.net/npm/emojibase-data@${version}/${path}`;

  if (typeof cdnUrl === 'function') {
    fetchUrl = cdnUrl(path, version);
  } else if (typeof cdnUrl === 'string') {
    fetchUrl = `${cdnUrl}/${path}`;
  }

  return fetchUrl;
}
/**
 * This function will fetch `emojibase-data` JSON files from our CDN, parse them,
 * and return the response. It requires a file path relative to the `emojibase-data` package
 * as the 1st argument and an optional object of options as the 2rd argument.
 *
 * ```ts
 * import { fetchFromCDN } from 'emojibase';
 *
 * await fetchFromCDN('ja/compact.json', { version: '2.1.3' });
 * await fetchFromCDN('ja/compact.json', { cdnUrl: 'https://example.com/cdn/emojidata/latest' });
 * await fetchFromCDN('ja/compact.json', {
 *     cdnUrl: (path: string, version: string) => {
 *         return `https://example.com/cdn/emojidata/${version}/${path}`;
 *     }
 * });
 * ```
 */


async function fetchFromCDN(path, options = {}) {
  const {
    local = false,
    version = 'latest',
    cdnUrl,
    ...opts
  } = options;
  const fetchUrl = getFetchUrl(path, version, cdnUrl);
  const storage = local ? localStorage : sessionStorage;
  const cacheKey = `emojibase/${version}/${path}`;
  const cachedData = storage.getItem(cacheKey); // Check the cache first

  if (cachedData) {
    return Promise.resolve(JSON.parse(cachedData));
  } // eslint-disable-next-line compat/compat


  const response = await fetch(fetchUrl, {
    credentials: 'omit',
    mode: 'cors',
    redirect: 'error',
    ...opts
  });

  if (!response.ok) {
    throw new Error('Failed to load Emojibase dataset.');
  }

  const data = await response.json();

  try {
    storage.setItem(cacheKey, JSON.stringify(data));
  } catch {// Do not allow quota errors to break the app
  }

  return data;
}

const ALIASES = {
  discord: 'joypixels',
  slack: 'iamcal'
};
/**
 * Fetches and returns localized shortcodes for the defined preset from our CDN.
 * The response is a mapping of emoji hexcodes to shortcodes (either a string or array of strings).
 * Uses `fetchFromCDN` under the hood.
 *
 * ```ts
 * import { fetchShortcodes } from 'emojibase';
 *
 * await fetchShortcodes('ja', 'cldr', { version: '2.1.3' });
 * ```
 */

async function fetchShortcodes(locale, preset, options) {
  var _ALIASES$preset;

  return fetchFromCDN(`${locale}/shortcodes/${(_ALIASES$preset = ALIASES[preset]) !== null && _ALIASES$preset !== void 0 ? _ALIASES$preset : preset}.json`, options);
}
/**
 * Will join shortcodes from multiple shortcode datasets into a single emoji object
 * using its hexcode. Will remove duplicates in the process.
 */


function joinShortcodesToEmoji(emoji, shortcodeDatasets) {
  if (shortcodeDatasets.length === 0) {
    return emoji;
  }

  const list = new Set(emoji.shortcodes);
  shortcodeDatasets.forEach(dataset => {
    const shortcodes = dataset[emoji.hexcode];

    if (Array.isArray(shortcodes)) {
      shortcodes.forEach(code => list.add(code));
    } else if (shortcodes) {
      list.add(shortcodes);
    }
  });
  emoji.shortcodes = [...list];

  if (emoji.skins) {
    emoji.skins.forEach(skin => {
      joinShortcodesToEmoji(skin, shortcodeDatasets);
    });
  }

  return emoji;
}

function flattenEmojiData(data, shortcodeDatasets = []) {
  const emojis = [];
  data.forEach(emoji => {
    if (emoji.skins) {
      // Dont include nested skins array
      const {
        skins,
        ...baseEmoji
      } = emoji;
      emojis.push(joinShortcodesToEmoji(baseEmoji, shortcodeDatasets)); // Push each skin modification into the root list

      skins.forEach(skin => {
        const skinEmoji = { ...skin
        }; // Inherit tags from parent if they exist

        if (baseEmoji.tags) {
          skinEmoji.tags = [...baseEmoji.tags];
        }

        emojis.push(joinShortcodesToEmoji(skinEmoji, shortcodeDatasets));
      });
    } else {
      emojis.push(joinShortcodesToEmoji(emoji, shortcodeDatasets));
    }
  });
  return emojis;
}

function joinShortcodes(emojis, shortcodeDatasets) {
  if (shortcodeDatasets.length === 0) {
    return emojis;
  }

  emojis.forEach(emoji => {
    joinShortcodesToEmoji(emoji, shortcodeDatasets);
  });
  return emojis;
}

async function fetchEmojis(locale, options = {}) {
  const {
    compact = false,
    flat = false,
    shortcodes: presets = [],
    ...opts
  } = options;
  const emojis = await fetchFromCDN(`${locale}/${compact ? 'compact' : 'data'}.json`, opts);
  let shortcodes = [];

  if (presets.length > 0) {
    shortcodes = await Promise.all(presets.map(preset => {
      let promise;

      if (preset.includes('/')) {
        const [customLocale, customPreset] = preset.split('/');
        promise = fetchShortcodes(customLocale, customPreset, opts);
      } else {
        promise = fetchShortcodes(locale, preset, opts);
      } // Ignore as the primary dataset should still load


      return promise.catch(() => ({}));
    }));
  }

  return flat ? flattenEmojiData(emojis, shortcodes) : joinShortcodes(emojis, shortcodes);
}
/**
 * Fetches and returns localized messages for emoji related information like groups and sub-groups.
 * Uses `fetchFromCDN` under the hood.
 *
 * ```ts
 * import { fetchMessages } from 'emojibase';
 *
 * await fetchMessages('zh', { version: '2.1.3' });
 * ```
 */


async function fetchMessages(locale, options) {
  return fetchFromCDN(`${locale}/messages.json`, options);
}

function getEmojiForEvent(event, emojis) {
    const target = event.target;
    const emojiElement = target.closest('[data-emoji]');
    if (emojiElement) {
        const emoji = emojis.find(e => e.emoji === emojiElement.dataset.emoji);
        if (emoji) {
            return emoji;
        }
    }
    return null;
}
function shouldAnimate(options) {
    var _a;
    const matcher = (_a = window.matchMedia) === null || _a === void 0 ? void 0 : _a.call(window, '(prefers-reduced-motion: reduce)');
    return options.animate && !(matcher === null || matcher === void 0 ? void 0 : matcher.matches);
}
function caseInsensitiveIncludes(str, search) {
    return str.toLowerCase().includes(search.toLowerCase());
}
/**
 * Creates a throttled version of a function.
 *
 * @param fn The function to throttle
 * @param wait The wait time in milliseconds
 * @returns a throttled version of fn
 */
function throttle(fn, wait) {
    let timeout = null;
    return () => {
        if (timeout) {
            return;
        }
        timeout = window.setTimeout(() => {
            fn();
            timeout = null;
        }, wait);
    };
}
/**
 * Creates a debounced version of a function.
 *
 * @param fn the function to debounce
 * @param wait the wait time in milliseconds
 * @returns a debounced version of fn
 */
function debounce(fn, wait) {
    let timeout = null;
    return (...args) => {
        if (timeout) {
            window.clearTimeout(timeout);
        }
        timeout = window.setTimeout(() => {
            fn(...args);
            timeout = null;
        }, wait);
    };
}
function animate(element, keyframes, options, pickerOptions) {
    if (shouldAnimate(pickerOptions) && element.animate) {
        return element.animate(keyframes, options).finished;
    }
    return Promise.resolve();
}
/**
 * Takes a rendered HTML string and renders a DOM node from it.
 *
 * @param html the HTML text
 * @returns the generated HTMLElement
 */
function toElement(html) {
    var _a;
    const template = document.createElement('template');
    template.innerHTML = html;
    return (_a = template.content) === null || _a === void 0 ? void 0 : _a.firstElementChild;
}
function computeHash(obj) {
    return __awaiter(this, void 0, void 0, function* () {
        const arr = new TextEncoder().encode(obj);
        const hashBuffer = yield crypto.subtle.digest('SHA-256', arr);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    });
}

/**
 * Generates the URLs for emoji data for a given emojibase version and locale.
 *
 * @param version the emojibase version (usually 'latest' is what you want)
 * @param locale the locale for the data
 * @returns an object containing the two URLs
 */
function getCdnUrls(version, locale) {
    // const base = `https://cdn.jsdelivr.net/npm/emojibase-data@${version}/${locale}`;
    const base = `/ui/lib/picmo`;
    return {
        emojisUrl: `${base}/data.json`,
        messagesUrl: `${base}/messages.json`,
    };
}
/**
 * Gets the ETag for the given URL by making a HEAD request.
 *
 * @param url the URL to check
 * @returns the ETag value, or null if no ETag was found
 */
function getEtag(url) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const response = yield fetch(url, { method: 'HEAD' });
            return response.headers.get('etag');
        }
        catch (error) {
            return null;
        }
    });
}
/**
 * Gets the ETags for the emoji and message data.
 *
 * @param emojisUrl the URL of the emoji data
 * @param messagesUrl the URL of the message data
 * @returns a Promise that resolves to an array of the ETag values
 */
function getEtags(locale) {
    const { emojisUrl, messagesUrl } = getCdnUrls('latest', locale);
    try {
        return Promise.all([
            getEtag(emojisUrl),
            getEtag(messagesUrl),
        ]);
    }
    catch (error) {
        return Promise.all([null, null]);
    }
}
/**
 * Checks if the category or emoji data is out of date.
 *
 * This is determined by checking the ETag of the data from the CDN, and downloading the latest if the
 * ETags don't match.
 *
 * @param db the database
 * @param emojisEtag the ETag of the emojis data
 * @param messagesEtag the ETag of the messages data
 */
function checkUpdates(db, emojisEtag, messagesEtag) {
    return __awaiter(this, void 0, void 0, function* () {
        let etags;
        try {
            etags = yield db.getEtags();
        }
        catch (error) {
            etags = {};
        }
        const { storedEmojisEtag, storedMessagesEtag } = etags;
        // If either ETag does not match, repopulate the database with the latest CDN data
        if (messagesEtag !== storedMessagesEtag || emojisEtag !== storedEmojisEtag) {
            const [messages, emojis] = yield Promise.all([fetchMessages(db.locale), fetchEmojis(db.locale)]);
            yield db.populate({
                groups: messages.groups,
                emojis,
                emojisEtag,
                messagesEtag
            });
        }
    });
}
/**
 * Checks for a new version of local emoji data. This is done by comparing the stored hash with the
 * newly computed one.
 *
 * @param db The database
 * @param hash The hash of the local emoji data
 * @returns true if there is a hash mismatch and a database update is required
 */
function checkLocalUpdates(db, hash) {
    return __awaiter(this, void 0, void 0, function* () {
        const storedHash = yield db.getHash();
        return hash !== storedHash;
    });
}
/**
 * Opens the database.
 *
 * @param locale the database locale
 * @param existingDb any existing database to use
 * @returns Promise that resolves to the database instance
 */
function openDatabase(locale, factory, existingDb) {
    return __awaiter(this, void 0, void 0, function* () {
        const db = existingDb || factory(locale);
        yield db.open();
        return db;
    });
}
/**
 * Initializes an emoji database with data from the CDN.
 *
 * @param locale the locale for the database
 * @param existingDb any existing database to repopulate
 * @returns a Promise that resolves to a fully populated database instance
 */
function initDatabaseFromCdn(locale, factory, existingDb) {
    return __awaiter(this, void 0, void 0, function* () {
        const db = yield openDatabase(locale, factory, existingDb);
        const [emojisEtag, messagesEtag] = yield getEtags(locale);
        if (!(yield db.isPopulated())) {
            const [messages, emojis] = yield Promise.all([fetchMessages(locale), fetchEmojis(locale)]);
            yield db.populate({ groups: messages.groups, emojis, emojisEtag, messagesEtag });
        }
        else if (emojisEtag && messagesEtag) {
            yield checkUpdates(db, emojisEtag, messagesEtag);
        }
        return db;
    });
}
/**
 * Initializes an emoji database with local data from the emojibase-data package.
 *
 * @param locale the locale
 * @param messages the messages dataset
 * @param emojis the emoji dataset
 * @param existingDb any existing database to repopulate
 * @returns a Promise that resolves to a fully populated database instance
 */
function initDatabaseWithLocalData(locale, factory, messages, emojis, existingDb) {
    return __awaiter(this, void 0, void 0, function* () {
        const db = yield openDatabase(locale, factory, existingDb);
        const hash = yield computeHash(emojis);
        if (!(yield db.isPopulated()) || (yield checkLocalUpdates(db, hash))) {
            yield db.populate({ groups: messages.groups, emojis, hash });
        }
        return db;
    });
}
/**
 * Public API for initializing a database.
 *
 * @param locale the locale
 * @param staticMessages local messages dataset, if any
 * @param staticEmojis local emoji dataset, if any
 * @param existingDb any existing database to repopulate
 * @returns a Promise that resolves to the database instance
 */
function initDatabase(locale, factory, staticMessages, staticEmojis, existingDb) {
    return __awaiter(this, void 0, void 0, function* () {
        if (staticMessages && staticEmojis) {
            return initDatabaseWithLocalData(locale, factory, staticMessages, staticEmojis, existingDb);
        }
        else {
            return initDatabaseFromCdn(locale, factory, existingDb);
        }
    });
}
/**
 * Deletes a database instance for a locale.
 * @param locale the locale to delete
 */
function deleteDatabase(factory, locale) {
    factory.deleteDatabase(locale);
}

var _Events_instances, _Events_events, _Events_getBindings, _Events_addListener;
class Events {
    constructor() {
        _Events_instances.add(this);
        _Events_events.set(this, new Map());
    }
    on(event, handler, context) {
        __classPrivateFieldGet(this, _Events_instances, "m", _Events_addListener).call(this, event, handler, context);
    }
    once(event, handler, context) {
        __classPrivateFieldGet(this, _Events_instances, "m", _Events_addListener).call(this, event, handler, context, true);
    }
    off(event, handler) {
        const bindings = __classPrivateFieldGet(this, _Events_instances, "m", _Events_getBindings).call(this, event);
        __classPrivateFieldGet(this, _Events_events, "f").set(event, bindings.filter(h => h.handler !== handler));
    }
    emit(event, ...args) {
        const bindings = __classPrivateFieldGet(this, _Events_instances, "m", _Events_getBindings).call(this, event);
        bindings.forEach((binding) => {
            binding.handler.apply(binding.context, args);
            if (binding.once) {
                this.off(event, binding.handler);
            }
        });
    }
    removeAll() {
        __classPrivateFieldGet(this, _Events_events, "f").clear();
    }
}
_Events_events = new WeakMap(), _Events_instances = new WeakSet(), _Events_getBindings = function _Events_getBindings(event) {
    if (!__classPrivateFieldGet(this, _Events_events, "f").has(event)) {
        __classPrivateFieldGet(this, _Events_events, "f").set(event, []);
    }
    return __classPrivateFieldGet(this, _Events_events, "f").get(event);
}, _Events_addListener = function _Events_addListener(event, handler, context, once = false) {
    const bindings = __classPrivateFieldGet(this, _Events_instances, "m", _Events_getBindings).call(this, event);
    bindings.push({ context, handler, once });
};

class AppEvents extends Events {
}

class ExternalEvents extends Events {
}

class View {
    constructor({ template, classes, parent }) {
        this.isDestroyed = false;
        this.appEvents = {};
        this.uiEvents = [];
        this.uiElements = {};
        this.ui = {};
        this.template = template;
        this.classes = classes;
        this.parent = parent;
        this.keyBindingHandler = this.keyBindingHandler.bind(this);
    }
    initialize() {
        this.bindAppEvents();
    }
    setCustomEmojis(customEmojis) {
        this.customEmojis = customEmojis;
    }
    setEvents(events) {
        this.events = events;
    }
    setPickerId(pickerId) {
        this.pickerId = pickerId;
    }
    emit(event, ...args) {
        this.events.emit(event, ...args);
    }
    setI18n(i18n) {
        this.i18n = i18n;
    }
    setRenderer(renderer) {
        this.renderer = renderer;
    }
    setEmojiData(emojiDataPromise) {
        this.emojiDataPromise = emojiDataPromise;
        emojiDataPromise.then(emojiData => {
            this.emojiData = emojiData;
        });
    }
    updateEmojiData(emojiData) {
        this.emojiData = emojiData;
        this.emojiDataPromise = Promise.resolve(emojiData);
    }
    setOptions(options) {
        this.options = options;
    }
    renderSync(templateData = {}) {
        this.el = this.template.renderSync(Object.assign({ classes: this.classes, i18n: this.i18n, pickerId: this.pickerId }, templateData));
        this.postRender();
        return this.el;
    }
    render(templateData = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.emojiDataPromise;
            this.el = yield this.template.renderAsync(Object.assign({ classes: this.classes, i18n: this.i18n, pickerId: this.pickerId }, templateData));
            this.postRender();
            return this.el;
        });
    }
    postRender() {
        this.bindUIElements();
        this.bindKeyBindings();
        this.bindUIEvents();
        this.scheduleShowAnimation();
    }
    bindAppEvents() {
        Object.keys(this.appEvents).forEach(event => {
            this.events.on(event, this.appEvents[event], this);
        });
        this.events.on('data:ready', this.updateEmojiData, this);
    }
    unbindAppEvents() {
        Object.keys(this.appEvents).forEach(event => {
            this.events.off(event, this.appEvents[event]);
        });
        this.events.off('data:ready', this.updateEmojiData);
    }
    keyBindingHandler(event) {
        const handler = this.keyBindings[event.key];
        if (handler) {
            handler.call(this, event);
        }
    }
    bindKeyBindings() {
        if (this.keyBindings) {
            this.el.addEventListener('keydown', this.keyBindingHandler);
        }
    }
    unbindKeyBindings() {
        if (this.keyBindings) {
            this.el.removeEventListener('keydown', this.keyBindingHandler);
        }
    }
    bindUIElements() {
        this.ui = Object.keys(this.uiElements).reduce((result, key) => (Object.assign(Object.assign({}, result), { [key]: this.el.querySelector(this.uiElements[key]) })), {});
    }
    bindUIEvents() {
        this.uiEvents.forEach((binding) => {
            binding.handler = binding.handler.bind(this);
            const target = binding.target ? this.ui[binding.target] : this.el;
            target.addEventListener(binding.event, binding.handler, binding.options);
        });
    }
    unbindUIEvents() {
        this.uiEvents.forEach((binding) => {
            const target = binding.target ? this.ui[binding.target] : this.el;
            target.removeEventListener(binding.event, binding.handler);
        });
    }
    destroy() {
        this.unbindAppEvents();
        this.unbindUIEvents();
        this.unbindKeyBindings();
        this.el.remove();
        this.isDestroyed = true;
    }
    scheduleShowAnimation() {
        if (this.parent) {
            const observer = new MutationObserver(list => {
                const [record] = list;
                if (record.type === 'childList' && record.addedNodes[0] === this.el) {
                    if (shouldAnimate(this.options) && this.animateShow) {
                        this.animateShow();
                    }
                    observer.disconnect;
                }
            });
            observer.observe(this.parent, { childList: true });
        }
    }
    static childEvent(target, event, handler, options = {}) {
        return { target, event, handler, options };
    }
    static uiEvent(event, handler, options = {}) {
        return { event, handler, options };
    }
    static byClass(className) {
        return `.${className}`;
    }
}

function styleInject(css, ref) {
  if ( ref === void 0 ) ref = {};
  var insertAt = ref.insertAt;

  if (!css || typeof document === 'undefined') { return; }

  var head = document.head || document.getElementsByTagName('head')[0];
  var style = document.createElement('style');
  style.type = 'text/css';

  if (insertAt === 'top') {
    if (head.firstChild) {
      head.insertBefore(style, head.firstChild);
    } else {
      head.appendChild(style);
    }
  } else {
    head.appendChild(style);
  }

  if (style.styleSheet) {
    style.styleSheet.cssText = css;
  } else {
    style.appendChild(document.createTextNode(css));
  }
}

var classes$d = {"emojiCategory":"EmojiCategory_emojiCategory__7G3mq","categoryName":"EmojiCategory_categoryName__zHcOq","noRecents":"EmojiCategory_noRecents__Pk1Ys","recentEmojis":"EmojiCategory_recentEmojis__CybhN"};

class BaseEmojiCategory extends View {
    constructor({ template, category, showVariants, lazyLoader }) {
        super({ template, classes: classes$d });
        this.baseUIElements = {
            categoryName: View.byClass(classes$d.categoryName)
        };
        this.category = category;
        this.showVariants = showVariants;
        this.lazyLoader = lazyLoader;
    }
    setActive(active, focusTarget, performFocus) {
        this.emojiContainer.setActive(active, focusTarget, performFocus);
    }
}

var classes$c = {"icon":"icons_icon__YUQ3S","icon-small":"icons_icon-small__fEcU6","icon-medium":"icons_icon-medium__e5lKJ","icon-large":"icons_icon-large__t5mwg","icon-2x":"icons_icon-2x__on8is","icon-3x":"icons_icon-3x__RBDYg","icon-4x":"icons_icon-4x__UjvXP","icon-5x":"icons_icon-5x__zRG9K","icon-8x":"icons_icon-8x__PsCPS","icon-10x":"icons_icon-10x__WLjku"};

var clock = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\"><!--! Font Awesome Pro 6.1.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2022 Fonticons, Inc. --><path d=\"M256 512C114.6 512 0 397.4 0 256C0 114.6 114.6 0 256 0C397.4 0 512 114.6 512 256C512 397.4 397.4 512 256 512zM232 256C232 264 236 271.5 242.7 275.1L338.7 339.1C349.7 347.3 364.6 344.3 371.1 333.3C379.3 322.3 376.3 307.4 365.3 300L280 243.2V120C280 106.7 269.3 96 255.1 96C242.7 96 231.1 106.7 231.1 120L232 256z\"/></svg>";

var flag = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\"><!--! Font Awesome Pro 6.1.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2022 Fonticons, Inc. --><path d=\"M64 496C64 504.8 56.75 512 48 512h-32C7.25 512 0 504.8 0 496V32c0-17.75 14.25-32 32-32s32 14.25 32 32V496zM476.3 0c-6.365 0-13.01 1.35-19.34 4.233c-45.69 20.86-79.56 27.94-107.8 27.94c-59.96 0-94.81-31.86-163.9-31.87C160.9 .3055 131.6 4.867 96 15.75v350.5c32-9.984 59.87-14.1 84.85-14.1c73.63 0 124.9 31.78 198.6 31.78c31.91 0 68.02-5.971 111.1-23.09C504.1 355.9 512 344.4 512 332.1V30.73C512 11.1 495.3 0 476.3 0z\"/></svg>";

var frown = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\"><!--! Font Awesome Pro 6.1.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2022 Fonticons, Inc. --><path d=\"M0 256C0 114.6 114.6 0 256 0C397.4 0 512 114.6 512 256C512 397.4 397.4 512 256 512C114.6 512 0 397.4 0 256zM176.4 240C194 240 208.4 225.7 208.4 208C208.4 190.3 194 176 176.4 176C158.7 176 144.4 190.3 144.4 208C144.4 225.7 158.7 240 176.4 240zM336.4 176C318.7 176 304.4 190.3 304.4 208C304.4 225.7 318.7 240 336.4 240C354 240 368.4 225.7 368.4 208C368.4 190.3 354 176 336.4 176zM259.9 369.4C288.8 369.4 316.2 375.2 340.6 385.5C352.9 390.7 366.7 381.3 361.4 369.1C344.8 330.9 305.6 303.1 259.9 303.1C214.3 303.1 175.1 330.8 158.4 369.1C153.1 381.3 166.1 390.6 179.3 385.4C203.7 375.1 231 369.4 259.9 369.4L259.9 369.4z\"/></svg>";

var gamepad = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 640 512\"><!--! Font Awesome Pro 6.1.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2022 Fonticons, Inc. --><path d=\"M448 64H192C85.96 64 0 149.1 0 256s85.96 192 192 192h256c106 0 192-85.96 192-192S554 64 448 64zM247.1 280h-32v32c0 13.2-10.78 24-23.98 24c-13.2 0-24.02-10.8-24.02-24v-32L136 279.1C122.8 279.1 111.1 269.2 111.1 256c0-13.2 10.85-24.01 24.05-24.01L167.1 232v-32c0-13.2 10.82-24 24.02-24c13.2 0 23.98 10.8 23.98 24v32h32c13.2 0 24.02 10.8 24.02 24C271.1 269.2 261.2 280 247.1 280zM431.1 344c-22.12 0-39.1-17.87-39.1-39.1s17.87-40 39.1-40s39.1 17.88 39.1 40S454.1 344 431.1 344zM495.1 248c-22.12 0-39.1-17.87-39.1-39.1s17.87-40 39.1-40c22.12 0 39.1 17.88 39.1 40S518.1 248 495.1 248z\"/></svg>";

var lightbulb = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 384 512\"><!--! Font Awesome Pro 6.1.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2022 Fonticons, Inc. --><path d=\"M112.1 454.3c0 6.297 1.816 12.44 5.284 17.69l17.14 25.69c5.25 7.875 17.17 14.28 26.64 14.28h61.67c9.438 0 21.36-6.401 26.61-14.28l17.08-25.68c2.938-4.438 5.348-12.37 5.348-17.7L272 415.1h-160L112.1 454.3zM191.4 .0132C89.44 .3257 16 82.97 16 175.1c0 44.38 16.44 84.84 43.56 115.8c16.53 18.84 42.34 58.23 52.22 91.45c.0313 .25 .0938 .5166 .125 .7823h160.2c.0313-.2656 .0938-.5166 .125-.7823c9.875-33.22 35.69-72.61 52.22-91.45C351.6 260.8 368 220.4 368 175.1C368 78.61 288.9-.2837 191.4 .0132zM192 96.01c-44.13 0-80 35.89-80 79.1C112 184.8 104.8 192 96 192S80 184.8 80 176c0-61.76 50.25-111.1 112-111.1c8.844 0 16 7.159 16 16S200.8 96.01 192 96.01z\"/></svg>";

var mug = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 640 512\"><!--! Font Awesome Pro 6.1.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2022 Fonticons, Inc. --><path d=\"M512 32H120c-13.25 0-24 10.75-24 24L96.01 288c0 53 43 96 96 96h192C437 384 480 341 480 288h32c70.63 0 128-57.38 128-128S582.6 32 512 32zM512 224h-32V96h32c35.25 0 64 28.75 64 64S547.3 224 512 224zM560 416h-544C7.164 416 0 423.2 0 432C0 458.5 21.49 480 48 480h480c26.51 0 48-21.49 48-48C576 423.2 568.8 416 560 416z\"/></svg>";

var plane = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 576 512\"><!--! Font Awesome Pro 6.1.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2022 Fonticons, Inc. --><path d=\"M482.3 192C516.5 192 576 221 576 256C576 292 516.5 320 482.3 320H365.7L265.2 495.9C259.5 505.8 248.9 512 237.4 512H181.2C170.6 512 162.9 501.8 165.8 491.6L214.9 320H112L68.8 377.6C65.78 381.6 61.04 384 56 384H14.03C6.284 384 0 377.7 0 369.1C0 368.7 .1818 367.4 .5398 366.1L32 256L.5398 145.9C.1818 144.6 0 143.3 0 142C0 134.3 6.284 128 14.03 128H56C61.04 128 65.78 130.4 68.8 134.4L112 192H214.9L165.8 20.4C162.9 10.17 170.6 0 181.2 0H237.4C248.9 0 259.5 6.153 265.2 16.12L365.7 192H482.3z\"/></svg>";

var robot = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 640 512\"><!--! Font Awesome Pro 6.1.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2022 Fonticons, Inc. --><path d=\"M9.375 233.4C3.375 239.4 0 247.5 0 256v128c0 8.5 3.375 16.62 9.375 22.62S23.5 416 32 416h32V224H32C23.5 224 15.38 227.4 9.375 233.4zM464 96H352V32c0-17.62-14.38-32-32-32S288 14.38 288 32v64H176C131.8 96 96 131.8 96 176V448c0 35.38 28.62 64 64 64h320c35.38 0 64-28.62 64-64V176C544 131.8 508.3 96 464 96zM256 416H192v-32h64V416zM224 296C201.9 296 184 278.1 184 256S201.9 216 224 216S264 233.9 264 256S246.1 296 224 296zM352 416H288v-32h64V416zM448 416h-64v-32h64V416zM416 296c-22.12 0-40-17.88-40-40S393.9 216 416 216S456 233.9 456 256S438.1 296 416 296zM630.6 233.4C624.6 227.4 616.5 224 608 224h-32v192h32c8.5 0 16.62-3.375 22.62-9.375S640 392.5 640 384V256C640 247.5 636.6 239.4 630.6 233.4z\"/></svg>";

var sad = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\">\n  <defs>\n    <radialGradient gradientUnits=\"userSpaceOnUse\" cy=\"10%\" id=\"gradient-0\">\n      <stop offset=\"0\" style=\"stop-color: hsl(50, 100%, 50%);\"/>\n      <stop offset=\"1\" style=\"stop-color: hsl(50, 100%, 60%);\"/>\n    </radialGradient>\n  </defs>\n  <!--! Font Awesome Pro 6.1.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2022 Fonticons, Inc. -->\n  <ellipse style=\"stroke: rgb(0, 0, 0); fill: rgba(0, 0, 0, 0.59);\" cx=\"172.586\" cy=\"207.006\" rx=\"39.974\" ry=\"39.974\"/>\n  <ellipse style=\"stroke: rgb(0, 0, 0); fill: rgba(0, 0, 0, 0.59);\" cx=\"334.523\" cy=\"207.481\" rx=\"39.974\" ry=\"39.974\"/>\n  <ellipse style=\"stroke: rgb(0, 0, 0); fill: rgba(0, 0, 0, 0.59);\" cx=\"313.325\" cy=\"356.208\" rx=\"91.497\" ry=\"59.893\"/>\n  <path style=\"fill: rgb(85, 167, 255);\" d=\"M 159.427 274.06 L 102.158 363.286 L 124.366 417.011 L 160.476 423.338 L 196.937 414.736 L 218.502 375.214\"></path>\n  <path style=\"fill: url(#gradient-0);\" d=\"M256 0C397.4 0 512 114.6 512 256C512 397.4 397.4 512 256 512C114.6 512 0 397.4 0 256C0 114.6 114.6 0 256 0zM256 352C290.9 352 323.2 367.8 348.3 394.9C354.3 401.4 364.4 401.7 370.9 395.7C377.4 389.7 377.7 379.6 371.7 373.1C341.6 340.5 301 320 256 320C247.2 320 240 327.2 240 336C240 344.8 247.2 352 256 352H256zM208 369C208 349 179.6 308.6 166.4 291.3C163.2 286.9 156.8 286.9 153.6 291.3C140.6 308.6 112 349 112 369C112 395 133.5 416 160 416C186.5 416 208 395 208 369H208zM303.6 208C303.6 225.7 317.1 240 335.6 240C353.3 240 367.6 225.7 367.6 208C367.6 190.3 353.3 176 335.6 176C317.1 176 303.6 190.3 303.6 208zM207.6 208C207.6 190.3 193.3 176 175.6 176C157.1 176 143.6 190.3 143.6 208C143.6 225.7 157.1 240 175.6 240C193.3 240 207.6 225.7 207.6 208z\" />\n</svg>";

var search = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\"><!--! Font Awesome Pro 6.1.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2022 Fonticons, Inc. --><path d=\"M500.3 443.7l-119.7-119.7c27.22-40.41 40.65-90.9 33.46-144.7C401.8 87.79 326.8 13.32 235.2 1.723C99.01-15.51-15.51 99.01 1.724 235.2c11.6 91.64 86.08 166.7 177.6 178.9c53.8 7.189 104.3-6.236 144.7-33.46l119.7 119.7c15.62 15.62 40.95 15.62 56.57 0C515.9 484.7 515.9 459.3 500.3 443.7zM79.1 208c0-70.58 57.42-128 128-128s128 57.42 128 128c0 70.58-57.42 128-128 128S79.1 278.6 79.1 208z\"/></svg>";

var smiley = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\"><!--! Font Awesome Pro 6.1.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2022 Fonticons, Inc. --><path d=\"M0 256C0 114.6 114.6 0 256 0C397.4 0 512 114.6 512 256C512 397.4 397.4 512 256 512C114.6 512 0 397.4 0 256zM256.3 331.8C208.9 331.8 164.1 324.9 124.5 312.8C112.2 309 100.2 319.7 105.2 331.5C130.1 390.6 188.4 432 256.3 432C324.2 432 382.4 390.6 407.4 331.5C412.4 319.7 400.4 309 388.1 312.8C348.4 324.9 303.7 331.8 256.3 331.8H256.3zM176.4 176C158.7 176 144.4 190.3 144.4 208C144.4 225.7 158.7 240 176.4 240C194 240 208.4 225.7 208.4 208C208.4 190.3 194 176 176.4 176zM336.4 240C354 240 368.4 225.7 368.4 208C368.4 190.3 354 176 336.4 176C318.7 176 304.4 190.3 304.4 208C304.4 225.7 318.7 240 336.4 240z\"/></svg>";

var symbols = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\"><!--! Font Awesome Pro 6.1.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2022 Fonticons, Inc. --><path d=\"M500.3 7.251C507.7 13.33 512 22.41 512 31.1V175.1C512 202.5 483.3 223.1 447.1 223.1C412.7 223.1 383.1 202.5 383.1 175.1C383.1 149.5 412.7 127.1 447.1 127.1V71.03L351.1 90.23V207.1C351.1 234.5 323.3 255.1 287.1 255.1C252.7 255.1 223.1 234.5 223.1 207.1C223.1 181.5 252.7 159.1 287.1 159.1V63.1C287.1 48.74 298.8 35.61 313.7 32.62L473.7 .6198C483.1-1.261 492.9 1.173 500.3 7.251H500.3zM74.66 303.1L86.5 286.2C92.43 277.3 102.4 271.1 113.1 271.1H174.9C185.6 271.1 195.6 277.3 201.5 286.2L213.3 303.1H239.1C266.5 303.1 287.1 325.5 287.1 351.1V463.1C287.1 490.5 266.5 511.1 239.1 511.1H47.1C21.49 511.1-.0019 490.5-.0019 463.1V351.1C-.0019 325.5 21.49 303.1 47.1 303.1H74.66zM143.1 359.1C117.5 359.1 95.1 381.5 95.1 407.1C95.1 434.5 117.5 455.1 143.1 455.1C170.5 455.1 191.1 434.5 191.1 407.1C191.1 381.5 170.5 359.1 143.1 359.1zM440.3 367.1H496C502.7 367.1 508.6 372.1 510.1 378.4C513.3 384.6 511.6 391.7 506.5 396L378.5 508C372.9 512.1 364.6 513.3 358.6 508.9C352.6 504.6 350.3 496.6 353.3 489.7L391.7 399.1H336C329.3 399.1 323.4 395.9 321 389.6C318.7 383.4 320.4 376.3 325.5 371.1L453.5 259.1C459.1 255 467.4 254.7 473.4 259.1C479.4 263.4 481.6 271.4 478.7 278.3L440.3 367.1zM116.7 219.1L19.85 119.2C-8.112 90.26-6.614 42.31 24.85 15.34C51.82-8.137 93.26-3.642 118.2 21.83L128.2 32.32L137.7 21.83C162.7-3.642 203.6-8.137 231.6 15.34C262.6 42.31 264.1 90.26 236.1 119.2L139.7 219.1C133.2 225.6 122.7 225.6 116.7 219.1H116.7z\"/></svg>";

var tree = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 448 512\"><!--! Font Awesome Pro 6.1.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2022 Fonticons, Inc. --><path d=\"M413.8 447.1L256 448l0 31.99C256 497.7 241.8 512 224.1 512c-17.67 0-32.1-14.32-32.1-31.99l0-31.99l-158.9-.0099c-28.5 0-43.69-34.49-24.69-56.4l68.98-79.59H62.22c-25.41 0-39.15-29.8-22.67-49.13l60.41-70.85H89.21c-21.28 0-32.87-22.5-19.28-37.31l134.8-146.5c10.4-11.3 28.22-11.3 38.62-.0033l134.9 146.5c13.62 14.81 2.001 37.31-19.28 37.31h-10.77l60.35 70.86c16.46 19.34 2.716 49.12-22.68 49.12h-15.2l68.98 79.59C458.7 413.7 443.1 447.1 413.8 447.1z\"/></svg>";

var users = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 640 512\"><!--! Font Awesome Pro 6.1.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2022 Fonticons, Inc. --><path d=\"M224 256c70.7 0 128-57.31 128-128S294.7 0 224 0C153.3 0 96 57.31 96 128S153.3 256 224 256zM274.7 304H173.3c-95.73 0-173.3 77.6-173.3 173.3C0 496.5 15.52 512 34.66 512H413.3C432.5 512 448 496.5 448 477.3C448 381.6 370.4 304 274.7 304zM479.1 320h-73.85C451.2 357.7 480 414.1 480 477.3C480 490.1 476.2 501.9 470 512h138C625.7 512 640 497.6 640 479.1C640 391.6 568.4 320 479.1 320zM432 256C493.9 256 544 205.9 544 144S493.9 32 432 32c-25.11 0-48.04 8.555-66.72 22.51C376.8 76.63 384 101.4 384 128c0 35.52-11.93 68.14-31.59 94.71C372.7 243.2 400.8 256 432 256z\"/></svg>";

var warning = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\">\n  <defs>\n    <radialGradient id=\"radial\" cy=\"85%\">\n      <stop offset=\"20%\" stop-color=\"var(--color-secondary)\" />\n      <stop offset=\"100%\" stop-color=\"var(--color-primary)\" />\n    </radialGradient>\n  </defs>\n  <!--! Font Awesome Pro 6.1.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2022 Fonticons, Inc. -->\n  <path fill=\"url('#radial')\" d=\"M506.3 417l-213.3-364c-16.33-28-57.54-28-73.98 0l-213.2 364C-10.59 444.9 9.849 480 42.74 480h426.6C502.1 480 522.6 445 506.3 417zM232 168c0-13.25 10.75-24 24-24S280 154.8 280 168v128c0 13.25-10.75 24-23.1 24S232 309.3 232 296V168zM256 416c-17.36 0-31.44-14.08-31.44-31.44c0-17.36 14.07-31.44 31.44-31.44s31.44 14.08 31.44 31.44C287.4 401.9 273.4 416 256 416z\" />\n</svg>";

var xmark = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 320 512\"><!--! Font Awesome Pro 6.1.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2022 Fonticons, Inc. --><path d=\"M310.6 361.4c12.5 12.5 12.5 32.75 0 45.25C304.4 412.9 296.2 416 288 416s-16.38-3.125-22.62-9.375L160 301.3L54.63 406.6C48.38 412.9 40.19 416 32 416S15.63 412.9 9.375 406.6c-12.5-12.5-12.5-32.75 0-45.25l105.4-105.4L9.375 150.6c-12.5-12.5-12.5-32.75 0-45.25s32.75-12.5 45.25 0L160 210.8l105.4-105.4c12.5-12.5 32.75-12.5 45.25 0s12.5 32.75 0 45.25l-105.4 105.4L310.6 361.4z\"/></svg>";

function createIcon(iconName, svg) {
    const el = toElement(svg);
    el.dataset.icon = iconName;
    el.classList.add(classes$c.icon);
    return el;
}
const icons = {
    clock,
    flag,
    frown,
    gamepad,
    lightbulb,
    mug,
    plane,
    robot,
    sad,
    search,
    smiley,
    symbols,
    tree,
    users,
    warning,
    xmark,
};
const categoryIcons = {
    'recents': 'clock',
    'smileys-emotion': 'smiley',
    'people-body': 'users',
    'animals-nature': 'tree',
    'food-drink': 'mug',
    'activities': 'gamepad',
    'travel-places': 'plane',
    'objects': 'lightbulb',
    'symbols': 'symbols',
    'flags': 'flag',
    'custom': 'robot'
};
function icon(name, size) {
    if (!(name in icons)) {
        console.warn(`Unknown icon: "${name}"`);
        return document.createElement('div');
    }
    const icon = createIcon(name, icons[name]);
    // const icon = icons[name].cloneNode(true);
    if (size) {
        icon.classList.add(classes$c[`icon-${size}`]);
    }
    return icon;
}

var _Template_instances, _Template_templateFn, _Template_mode, _Template_renderChildViews, _Template_bindIcons, _Template_bindPlaceholders;
const defaultOptions$1 = {
    mode: 'sync'
};
class Template {
    constructor(templateFn, options = {}) {
        _Template_instances.add(this);
        _Template_templateFn.set(this, void 0);
        _Template_mode.set(this, void 0);
        __classPrivateFieldSet(this, _Template_templateFn, templateFn, "f");
        __classPrivateFieldSet(this, _Template_mode, options.mode || defaultOptions$1.mode, "f");
    }
    renderSync(data = {}) {
        const result = toElement(__classPrivateFieldGet(this, _Template_templateFn, "f").call(this, data));
        __classPrivateFieldGet(this, _Template_instances, "m", _Template_bindPlaceholders).call(this, result, data);
        __classPrivateFieldGet(this, _Template_instances, "m", _Template_bindIcons).call(this, result);
        __classPrivateFieldGet(this, _Template_instances, "m", _Template_renderChildViews).call(this, result, data);
        return result;
    }
    renderAsync(data = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = toElement(__classPrivateFieldGet(this, _Template_templateFn, "f").call(this, data));
            __classPrivateFieldGet(this, _Template_instances, "m", _Template_bindPlaceholders).call(this, result, data);
            __classPrivateFieldGet(this, _Template_instances, "m", _Template_bindIcons).call(this, result);
            yield __classPrivateFieldGet(this, _Template_instances, "m", _Template_renderChildViews).call(this, result, data);
            return result;
        });
    }
    render(data) {
        return __classPrivateFieldGet(this, _Template_mode, "f") === 'sync' ? this.renderSync(data) : this.renderAsync(data);
    }
}
_Template_templateFn = new WeakMap(), _Template_mode = new WeakMap(), _Template_instances = new WeakSet(), _Template_renderChildViews = function _Template_renderChildViews(result, data) {
    return __awaiter(this, void 0, void 0, function* () {
        const placeholders = result.querySelectorAll('[data-view]');
        const asyncViews = [];
        for (const placeholder of placeholders) {
            const view = data[placeholder.dataset.view];
            if (view) {
                if (placeholder.dataset.render !== 'sync') {
                    asyncViews.push(view.render().then(result => {
                        placeholder.replaceWith(result);
                        return result;
                    }));
                }
                else {
                    placeholder.replaceWith(view.renderSync());
                }
            }
            else {
                placeholder.remove();
            }
        }
        return Promise.all(asyncViews);
    });
}, _Template_bindIcons = function _Template_bindIcons(result) {
    const icons = result.querySelectorAll('i[data-icon]');
    icons.forEach((placeholder) => {
        const { icon: iconKey, size } = placeholder.dataset;
        placeholder.replaceWith(icon(iconKey, size));
    });
}, _Template_bindPlaceholders = function _Template_bindPlaceholders(result, data) {
    const placeholders = result.querySelectorAll('[data-placeholder]');
    placeholders.forEach((placeholder) => {
        const key = placeholder.dataset.placeholder;
        if (key && data[key]) {
            const replacement = data[key];
            placeholder.replaceWith(...[replacement].flat());
        }
        else {
            console.warn(`Missing placeholder element for key "${key}"`);
        }
    });
    return result;
};

var template$d = new Template(({ classes, emoji }) => /* html */ `
  <button
    class="${classes.emoji}"
    title="${emoji.label}"
    data-emoji="${emoji.emoji}"
    tabindex="-1">
    <div data-placeholder="emojiContent"></div>
  </button>
`);

var classes$b = {"emoji":"Emoji_emoji__iKc1G"};

class Emoji extends View {
    constructor({ emoji, lazyLoader, category }) {
        super({ template: template$d, classes: classes$b });
        this.emoji = emoji;
        this.lazyLoader = lazyLoader;
        this.category = category;
    }
    initialize() {
        this.uiEvents = [
            View.uiEvent('focus', this.handleFocus)
        ];
        super.initialize();
    }
    handleFocus() {
        if (this.category) {
            this.events.emit('focus:change', this.category);
        }
    }
    activateFocus(performFocus) {
        this.el.tabIndex = 0;
        if (performFocus) {
            this.el.focus();
        }
    }
    deactivateFocus() {
        this.el.tabIndex = -1;
    }
    renderSync() {
        return super.renderSync({
            emoji: this.emoji,
            emojiContent: this.renderer.doRender(this.emoji, this.lazyLoader)
        });
    }
}

/**
 * Represents an array of emojis as a grid with rows and columns as they appear in the UI.
 * This makes focus traversal calculations less complex in the EmojiContainer.
 *
 * The grid is given a flat array of emojis for the current category and the number of columns. It will create
 * a virtual grid structure mapping those emojis to rows of the desired length.
 *
 * The focus can be traversed left, right, up, and down, or to a specific row and column coordinate. Later, the currently
 * selected grid cell can be translated back to the index in the original emoji array.
 *
 * The grid emits three events:
 * - focus:change - when the focused cell changes
 *                  Event properties: from (the previous index), to (the new index), and performFocus (whether to focus the new cell)
 *
 * - focus:underflow - when the focus tries to move below the first emoji in the category
 *                     Event properties: index (the current index within the grid)
 *
 * - focus:overflow - when the focus tries to move beyond the last emoji in the category
 *                     Event properties: index (the current index within the grid)
 */
class FocusGrid {
    /**
     * Creates a FocusGrid.
     *
     * @param columnCount The number of columns in the emoji picker.
     * @param emojiCount The total number of emojis in this category.
     * @param initialRow The initial focused row.
     * @param initialColumn The initial focused column.
     */
    constructor(columnCount, emojiCount, initialRow = 0, initialColumn = 0, wrap = false) {
        this.events = new Events();
        /** Maps focus traversal keys to their associated handlers. */
        this.keyHandlers = {
            ArrowLeft: this.focusPrevious.bind(this),
            ArrowRight: this.focusNext.bind(this),
            ArrowUp: this.focusUp.bind(this),
            ArrowDown: this.focusDown.bind(this)
        };
        this.rowCount = Math.ceil(emojiCount / columnCount);
        this.columnCount = columnCount;
        this.focusedRow = initialRow;
        this.focusedColumn = initialColumn;
        this.emojiCount = emojiCount;
        this.wrap = wrap;
        this.handleKeyDown = this.handleKeyDown.bind(this);
    }
    /**
     * Removes all bound event listeners.
     */
    destroy() {
        this.events.removeAll();
    }
    /**
     * Public API for listening for focus events.
     */
    on(event, handler) {
        this.events.on(event, handler);
    }
    /**
     * Handles keydown events that are forwarded from the EmojiContainer and executes
     * the appropriate focus function.
     * @param event the KeyboardEvent that occurred
     */
    handleKeyDown(event) {
        if (event.key in this.keyHandlers) {
            event.preventDefault();
            this.keyHandlers[event.key]();
        }
    }
    /**
     * Sets the focused cell to a specific row and, optionally, column. If no column is specified,
     * the focused column remains unchanged.
     *
     * The `performFocus` flag determines whether the focus should be moved to the new cell. If it
     * is false, the focused element will be changed but the actual focus() call will not be triggered yet.
     *
     * @param row The new focused row
     * @param column The new focused column, if specified
     * @param performFocus Whether or not to perform the actual focus operation.
     */
    setCell(row, column, performFocus = true) {
        const previousIndex = this.getIndex();
        this.focusedRow = row;
        if (column !== undefined) {
            // If the column exceeds the column count, focus the last column.
            this.focusedColumn = Math.min(this.columnCount, column);
        }
        // If the given cell is out of bounds, focus to the last cell.
        if (this.focusedRow >= this.rowCount || this.getIndex() >= this.emojiCount) {
            this.focusedRow = this.rowCount - 1;
            this.focusedColumn = (this.emojiCount % this.columnCount) - 1;
        }
        this.events.emit('focus:change', { from: previousIndex, to: this.getIndex(), performFocus });
    }
    setFocusedIndex(index, performFocus = true) {
        const row = Math.floor(index / this.columnCount);
        const column = index % this.columnCount;
        this.setCell(row, column, performFocus);
    }
    /**
     * Moves the focus to the next cell in the current row.
     * Emits `focus:overflow` if there is no next cell.
     */
    focusNext() {
        if (this.focusedColumn < this.columnCount - 1 && this.getIndex() < this.emojiCount - 1) {
            this.setCell(this.focusedRow, this.focusedColumn + 1);
        }
        else if (this.focusedRow < this.rowCount - 1) {
            this.setCell(this.focusedRow + 1, 0);
        }
        else if (this.wrap) {
            this.setCell(0, 0);
        }
        else {
            this.events.emit('focus:overflow', 0);
        }
    }
    /**
     * Moves the focus to the previous cell in the current row.
     * Emits `focus:underflow` if there is no previous cell.
     */
    focusPrevious() {
        if (this.focusedColumn > 0) {
            this.setCell(this.focusedRow, this.focusedColumn - 1);
        }
        else if (this.focusedRow > 0) {
            this.setCell(this.focusedRow - 1, this.columnCount - 1);
        }
        else if (this.wrap) {
            this.setCell(this.rowCount - 1, this.columnCount - 1);
        }
        else {
            this.events.emit('focus:underflow', this.columnCount - 1);
        }
    }
    /**
     * Moves the focus to the cell directly above the current one.
     * Emits `focus:underflow` if the current cell is in the first row.
     */
    focusUp() {
        if (this.focusedRow > 0) {
            this.setCell(this.focusedRow - 1, this.focusedColumn);
        }
        else {
            this.events.emit('focus:underflow', this.focusedColumn);
        }
    }
    /**
     * Moves the focus to the cell directly below the current one.
     * Emits `focus:overflow` if the current cell is in the last row.
     */
    focusDown() {
        if (this.focusedRow < this.rowCount - 1) {
            this.setCell(this.focusedRow + 1, this.focusedColumn);
        }
        else {
            this.events.emit('focus:overflow', this.focusedColumn);
        }
    }
    /**
     * Moves the focus to a specific emoji in the category.
     * @param index the index of the emoji to focus on
     */
    focusToIndex(index) {
        this.setCell(Math.floor(index / this.columnCount), index % this.columnCount);
    }
    /**
     * Gets the index in the emoji array of the currently focused cell.
     * @returns the currently focused cell's index
     */
    getIndex() {
        return (this.focusedRow * this.columnCount) + this.focusedColumn;
    }
    /**
     * Gets the row and column of the currently focused cell.
     * @returns the row and column data
     */
    getCell() {
        return { row: this.focusedRow, column: this.focusedColumn };
    }
    /**
     * Gets the total number of rows in the grid
     * @returns the number of rows in the grid
     */
    getRowCount() {
        return this.rowCount;
    }
}

var template$c = new Template(({ classes }) => /* html */ `
  <div class="${classes.emojiContainer}">
    <div data-placeholder="emojis"></div>
  </div>
`);

var classes$a = {"emojiContainer":"EmojiContainer_emojiContainer__4SPb5"};

/**
 * An EmojiContainer contains all the emojis in a given category.
 *
 * It manages keybaord focus for all emojis in the category.
 */
class EmojiContainer extends View {
    constructor({ emojis, showVariants, preview = true, lazyLoader, category, fullHeight = false }) {
        super({ template: template$c, classes: classes$a });
        this.fullHeight = false;
        this.showVariants = showVariants;
        this.lazyLoader = lazyLoader;
        this.preview = preview;
        this.emojis = emojis;
        this.category = category;
        this.fullHeight = fullHeight;
        this.setFocus = this.setFocus.bind(this);
        this.triggerNextCategory = this.triggerNextCategory.bind(this);
        this.triggerPreviousCategory = this.triggerPreviousCategory.bind(this);
    }
    initialize() {
        this.grid = new FocusGrid(this.options.emojisPerRow, this.emojiCount, 0, 0, !this.category);
        this.grid.on('focus:change', this.setFocus);
        this.grid.on('focus:overflow', this.triggerNextCategory);
        this.grid.on('focus:underflow', this.triggerPreviousCategory);
        this.uiEvents = [
            View.uiEvent('click', this.selectEmoji),
            View.uiEvent('keydown', this.grid.handleKeyDown)
        ];
        if (this.preview) {
            this.uiEvents.push(View.uiEvent('mouseover', this.showPreview), View.uiEvent('mouseout', this.hidePreview), View.uiEvent('focus', this.showPreview, { capture: true }), View.uiEvent('blur', this.hidePreview, { capture: true }));
        }
        super.initialize();
    }
    /**
     * Marks the specified cell in the emoji grid as focused.
     *
     * @param focusTarget The target emoji to make focusable.
     * @param performFocus Whether or not to actually focus the new target.
     */
    setFocusedView(focusTarget, performFocus) {
        if (!focusTarget) {
            return;
        }
        if (typeof focusTarget === 'string') {
            const index = this.emojis.findIndex(emoji => emoji.emoji === focusTarget);
            this.grid.setFocusedIndex(index, false);
            setTimeout(() => {
                var _a, _b, _c, _d;
                const targetView = this.emojiViews[index].el;
                targetView.scrollIntoView();
                // Need to scroll up a bit to offset the sticky header
                const header = (_a = targetView.parentElement) === null || _a === void 0 ? void 0 : _a.previousElementSibling;
                const emojiArea = (_c = (_b = targetView.parentElement) === null || _b === void 0 ? void 0 : _b.parentElement) === null || _c === void 0 ? void 0 : _c.parentElement;
                emojiArea.scrollTop -= (_d = header === null || header === void 0 ? void 0 : header.offsetHeight) !== null && _d !== void 0 ? _d : 0;
            });
        }
        else if (focusTarget.row === 'first' || focusTarget.row === 0) {
            this.grid.setCell(0, focusTarget.offset, performFocus);
        }
        else if (focusTarget.row === 'last') {
            this.grid.setCell(this.grid.getRowCount() - 1, focusTarget.offset, performFocus);
        }
    }
    /**
     * Sets the active state of this category's emojis. If a category is active, its emojis
     * are focusable.
     *
     * @param active the desired active state
     * @param focusTarget the target emoji to make focusable if active is true
     * @param performFocus whether or not to actually focus the new target if active is true
     */
    setActive(active, focusTarget, performFocus) {
        var _a;
        if (active) {
            this.setFocusedView(focusTarget, performFocus);
        }
        else {
            (_a = this.emojiViews[this.grid.getIndex()]) === null || _a === void 0 ? void 0 : _a.deactivateFocus();
        }
    }
    renderSync() {
        this.emojiViews = this.emojis.map(emoji => this.viewFactory.create(Emoji, {
            emoji,
            category: this.category,
            lazyLoader: this.lazyLoader,
            renderer: this.renderer
        }));
        this.emojiElements = this.emojiViews.map(view => view.renderSync());
        return super.renderSync({
            emojis: this.emojiElements,
            i18n: this.i18n
        });
    }
    destroy() {
        super.destroy();
        this.emojiViews.forEach(view => view.destroy());
        this.grid.destroy();
    }
    /**
     * Causes the previous category to become active/focusable due to a focus:underflow event.
     * @param column the currently focused column
     */
    triggerPreviousCategory(column) {
        this.events.emit('category:previous', column);
    }
    /**
     * Causes the next category to become active/focusable due to a focus:overflow event.
     * @param column the currently focused column
     */
    triggerNextCategory(column) {
        if (this.category) {
            this.events.emit('category:next', column);
        }
    }
    /**
     * Reacts to a focus:change event from the grid.
     *
     * The current emoji is deactivated, and the new emoji is activated.
     * An event is then emitted which will pause the scroll listener in the main emoji area,
     * otherwise the active category tab can get out of sync.
     *
     * @param event The focus:change event.
     */
    setFocus({ from, to, performFocus }) {
        var _a, _b;
        (_a = this.emojiViews[from]) === null || _a === void 0 ? void 0 : _a.deactivateFocus();
        (_b = this.emojiViews[to]) === null || _b === void 0 ? void 0 : _b.activateFocus(performFocus);
    }
    selectEmoji(event) {
        const emoji = getEmojiForEvent(event, this.emojis);
        if (emoji) {
            this.events.emit('emoji:select', {
                emoji,
                showVariants: this.showVariants
            });
        }
    }
    showPreview(event) {
        const target = event.target;
        const button = target.closest('button');
        const content = button === null || button === void 0 ? void 0 : button.firstElementChild;
        const emoji = getEmojiForEvent(event, this.emojis);
        if (emoji) {
            this.events.emit('preview:show', emoji, content === null || content === void 0 ? void 0 : content.cloneNode(true));
        }
    }
    hidePreview(event) {
        const emoji = getEmojiForEvent(event, this.emojis);
        if (emoji) {
            this.events.emit('preview:hide');
        }
    }
    get emojiCount() {
        return this.emojis.length;
    }
}

var template$b = new Template(({ classes, category, pickerId, icon, i18n }) => /* html */ `
  <section class="${classes.emojiCategory}" role="tabpanel" aria-labelledby="${pickerId}-category-${category.key}">
    <h3 data-category="${category.key}" class="${classes.categoryName}">
      <i data-icon="${icon}"></i>
      ${i18n.get(`categories.${category.key}`, category.message || category.key)}
    </h3>
    <div data-view="emojis" data-render="sync"></div>
  </section>
`);

class EmojiCategory extends BaseEmojiCategory {
    constructor({ category, showVariants, lazyLoader, emojiVersion }) {
        super({ category, showVariants, lazyLoader, template: template$b });
        this.showVariants = showVariants;
        this.lazyLoader = lazyLoader;
        this.emojiVersion = emojiVersion;
    }
    initialize() {
        this.uiElements = Object.assign({}, this.baseUIElements);
        super.initialize();
    }
    render() {
        const _super = Object.create(null, {
            render: { get: () => super.render }
        });
        return __awaiter(this, void 0, void 0, function* () {
            yield this.emojiDataPromise;
            const emojis = yield this.emojiData.getEmojis(this.category, this.emojiVersion);
            this.emojiContainer = this.viewFactory.create(EmojiContainer, {
                emojis,
                showVariants: this.showVariants,
                lazyLoader: this.lazyLoader,
                category: this.category.key
            });
            return _super.render.call(this, {
                category: this.category,
                emojis: this.emojiContainer,
                emojiCount: emojis.length,
                icon: categoryIcons[this.category.key]
            });
        });
    }
}

class RecentEmojiContainer extends EmojiContainer {
    constructor({ category, emojis, preview = true, lazyLoader }) {
        super({ category, emojis, showVariants: false, preview, lazyLoader });
    }
    addOrUpdate(emoji) {
        return __awaiter(this, void 0, void 0, function* () {
            // If the emoji already exists, remove it as it is being moved to the front
            const existing = this.el.querySelector(`[data-emoji="${emoji.emoji}"]`);
            if (existing) {
                this.el.removeChild(existing);
                this.emojis = this.emojis.filter(e => e !== emoji);
            }
            // Add the new emoji to the beginning of the list
            const newView = this.viewFactory.create(Emoji, { emoji });
            this.el.insertBefore(newView.renderSync(), this.el.firstChild);
            this.emojis = [
                emoji,
                ...this.emojis.filter(e => e !== emoji)
            ];
            // Prune the list to the maximum length
            if (this.emojis.length > this.options.maxRecents) {
                this.emojis = this.emojis.slice(0, this.options.maxRecents);
                const excess = this.el.childElementCount - this.options.maxRecents;
                for (let i = 0; i < excess; i++) {
                    if (this.el.lastElementChild) {
                        this.el.removeChild(this.el.lastElementChild);
                    }
                }
            }
        });
    }
}

const LOCAL_STORAGE_KEY = 'PicMo:recents';
function clear() {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
}
function getRecents(maxCount) {
    var _a;
    try {
        const recents = JSON.parse((_a = localStorage.getItem(LOCAL_STORAGE_KEY)) !== null && _a !== void 0 ? _a : '[]');
        return recents.slice(0, maxCount);
    }
    catch (error) { // localStorage is not available, no recents
        return [];
    }
}
function addOrUpdateRecent(emoji, maxCount) {
    // Add the new recent to the beginning of the list, removing it if it exists already
    const recents = [
        emoji,
        ...getRecents(maxCount).filter(recent => recent.hexcode !== emoji.hexcode)
    ].slice(0, maxCount);
    try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(recents));
    }
    catch (error) {
        // localStorage is not available, no recents
    }
}

var template$a = new Template(({ emojiCount, classes, category, pickerId, icon, i18n }) => /* html */ `
  <section class="${classes.emojiCategory}" role="tabpanel" aria-labelledby="${pickerId}-category-${category.key}">
  <h3 data-category="${category.key}" class="${classes.categoryName}">
    <i data-icon="${icon}"></i>
    ${i18n.get(`categories.${category.key}`, category.message || category.key)}
  </h3>
  <div data-empty="${emojiCount === 0}" class="${classes.recentEmojis}">
    <div data-view="emojis" data-render="sync"></div>
  </div>
  <div class="${classes.noRecents}">
    ${i18n.get('recents.none')}
  </div>
</section>
`, { mode: 'async' });

class RecentEmojiCategory extends BaseEmojiCategory {
    constructor({ category, lazyLoader }) {
        super({ category, showVariants: false, lazyLoader, template: template$a });
    }
    initialize() {
        this.uiElements = Object.assign(Object.assign({}, this.baseUIElements), { recents: View.byClass(classes$d.recentEmojis) });
        this.appEvents = {
            'recent:add': this.addRecent
        };
        super.initialize();
    }
    addRecent(recent) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.emojiContainer.addOrUpdate(recent);
            this.ui.recents.dataset.empty = 'false';
        });
    }
    render() {
        const _super = Object.create(null, {
            render: { get: () => super.render }
        });
        return __awaiter(this, void 0, void 0, function* () {
            const recents = getRecents(this.options.maxRecents);
            this.emojiContainer = this.viewFactory.create(RecentEmojiContainer, {
                emojis: recents,
                showVariants: false,
                lazyLoader: this.lazyLoader,
                category: this.category.key
            });
            yield _super.render.call(this, {
                category: this.category,
                emojis: this.emojiContainer,
                emojiCount: recents.length,
                icon: categoryIcons[this.category.key]
            });
            return this.el;
        });
    }
}

var template$9 = new Template(({ classes, category, pickerId, icon, i18n }) => /* html */ `
  <section class="${classes.emojiCategory}" role="tabpanel" aria-labelledby="${pickerId}-category-${category.key}">
    <h3 data-category="${category.key}" class="${classes.categoryName}">
      <i data-icon="${icon}"></i>
      ${i18n.get(`categories.${category.key}`, category.message || category.key)}
    </h3>
    <div data-view="emojis" data-render="sync"></div>
  </section>
`);

class CustomEmojiCategory extends BaseEmojiCategory {
    constructor({ category, lazyLoader }) {
        super({ template: template$9, showVariants: false, lazyLoader, category });
    }
    initialize() {
        this.uiElements = Object.assign({}, this.baseUIElements);
        super.initialize();
    }
    render() {
        const _super = Object.create(null, {
            render: { get: () => super.render }
        });
        return __awaiter(this, void 0, void 0, function* () {
            this.emojiContainer = this.viewFactory.create(EmojiContainer, {
                emojis: this.customEmojis,
                showVariants: this.showVariants,
                lazyLoader: this.lazyLoader,
                category: this.category.key
            });
            return _super.render.call(this, {
                category: this.category,
                emojis: this.emojiContainer,
                emojiCount: this.customEmojis.length,
                icon: categoryIcons[this.category.key]
            });
        });
    }
}

class LazyLoader {
    constructor() {
        this.elements = new Map();
    }
    lazyLoad(placeholder, callback) {
        this.elements.set(placeholder, callback);
        return placeholder;
    }
    observe(root) {
        if (window.IntersectionObserver) {
            const observer = new IntersectionObserver(entries => {
                entries
                    .filter(entry => entry.intersectionRatio > 0)
                    .map(entry => entry.target)
                    .forEach(element => {
                    const callback = this.elements.get(element);
                    callback === null || callback === void 0 ? void 0 : callback();
                    observer.unobserve(element);
                });
            }, {
                root
            });
            this.elements.forEach((callback, element) => {
                observer.observe(element);
            });
        }
        else {
            this.elements.forEach(callback => {
                callback();
            });
        }
    }
}

var classes$9 = {"emojis":"EmojiArea_emojis__L4mMq"};

const template$8 = new Template(({ classes }) => /* html */ `
  <div class="${classes.emojis}">
    <div data-placeholder="emojis"></div>
  </div>
`, { mode: 'async' });
const categoryClasses = {
    recents: RecentEmojiCategory,
    custom: CustomEmojiCategory
};
function getCategoryClass(category) {
    return categoryClasses[category.key] || EmojiCategory;
}
function getFocusTarget(focus) {
    if (!focus || focus === 'button') {
        return {
            row: 'first',
            offset: 0
        };
    }
    return focus;
}
/**
 * The EmojiArea is the main view of the picker, it contains all the categories and their emojis inside
 * a main scrollable area.
 */
class EmojiArea extends View {
    constructor({ categoryTabs, categories, emojiVersion }) {
        super({ template: template$8, classes: classes$9 });
        this.selectedCategory = 0;
        this.scrollListenerState = 'active';
        this.lazyLoader = new LazyLoader();
        this.categoryTabs = categoryTabs;
        this.categories = categories;
        this.emojiVersion = emojiVersion;
        this.handleScroll = throttle(this.handleScroll.bind(this), 100);
    }
    initialize() {
        this.appEvents = {
            'category:select': this.handleCategorySelect,
            'category:previous': this.focusPreviousCategory,
            'category:next': this.focusNextCategory,
            'focus:change': this.updateFocusedCategory
        };
        this.uiElements = { emojis: View.byClass(classes$9.emojis) };
        this.uiEvents = [View.uiEvent('scroll', this.handleScroll)];
        super.initialize();
    }
    get focusableEmoji() {
        return this.el.querySelector('[tabindex="0"]');
    }
    render() {
        const _super = Object.create(null, {
            render: { get: () => super.render }
        });
        return __awaiter(this, void 0, void 0, function* () {
            this.emojiCategories = this.categories.map(this.createCategory, this);
            const categoryEmojiElements = {};
            this.categories.forEach((category, index) => {
                categoryEmojiElements[`emojis-${category.key}`] = this.emojiCategories[index];
            });
            yield _super.render.call(this, {
                emojis: yield Promise.all(this.emojiCategories.map(category => category.render()))
            });
            this.lazyLoader.observe(this.el);
            // We need to watch for changes in the scroll height. This will happen if a new recent emoji is 
            // added such that a new row is added to the recents category, which will shift the scroll height.
            // This will compensate so that from the user's perspective, the scroll position stays the same.
            if (window.ResizeObserver) {
                this.observer = new ResizeObserver(() => {
                    const heightChange = this.el.scrollHeight - this.scrollHeight;
                    const scrollTopChange = this.el.scrollTop - this.scrollTop;
                    if (scrollTopChange === 0 && heightChange > 0) {
                        this.el.scrollTop += heightChange;
                    }
                    this.scrollHeight = this.el.scrollHeight;
                    this.scrollTop = this.el.scrollTop;
                });
                this.emojiCategories.forEach(category => {
                    this.observer.observe(category.el);
                });
            }
            return this.el;
        });
    }
    destroy() {
        super.destroy();
        this.emojiCategories.forEach(category => {
            var _a;
            (_a = this.observer) === null || _a === void 0 ? void 0 : _a.unobserve(category.el);
            category.destroy();
        });
    }
    handleCategorySelect(category, options) {
        this.selectCategory(category, options);
    }
    createCategory(category) {
        const Category = getCategoryClass(category);
        return this.viewFactory.create(Category, {
            category,
            showVariants: true,
            lazyLoader: this.lazyLoader,
            emojiVersion: this.emojiVersion
        });
    }
    determineInitialCategory() {
        var _a;
        if (this.options.initialCategory) {
            if (this.categories.find(c => c.key === this.options.initialCategory)) {
                return this.options.initialCategory;
            }
        }
        return (_a = this.categories.find(c => c.key !== 'recents')) === null || _a === void 0 ? void 0 : _a.key;
    }
    determineFocusTarget(category) {
        const categoryView = this.emojiCategories.find(c => c.category.key === category);
        if (this.options.initialEmoji && (categoryView === null || categoryView === void 0 ? void 0 : categoryView.el.querySelector(`[data-emoji="${this.options.initialEmoji}"]`))) {
            return this.options.initialEmoji;
        }
        return 'button';
    }
    reset() {
        this.events.emit('preview:hide');
        const category = this.determineInitialCategory();
        if (category) {
            this.selectCategory(category, {
                focus: this.determineFocusTarget(category),
                performFocus: true,
                scroll: 'jump'
            });
            this.selectedCategory = this.getCategoryIndex(category);
        }
    }
    /**
     * Given a category key, returns the index of the category in the categories array.
     * @param key
     * @returns
     */
    getCategoryIndex(key) {
        return this.categories.findIndex(category => category.key === key);
    }
    focusPreviousCategory(column) {
        if (this.selectedCategory > 0) {
            this.focusCategory(this.selectedCategory - 1, { row: 'last', offset: column !== null && column !== void 0 ? column : this.options.emojisPerRow });
        }
    }
    focusNextCategory(column) {
        if (this.selectedCategory < this.categories.length - 1) {
            this.focusCategory(this.selectedCategory + 1, { row: 'first', offset: column !== null && column !== void 0 ? column : 0 });
        }
    }
    /**
     * Changes the focused category.
     *
     * @param category the index of the category
     * @param focusTarget the desired focus target in the new category
     */
    focusCategory(category, focusTarget) {
        this.selectCategory(category, {
            focus: focusTarget,
            performFocus: true
        });
    }
    /**
     * Changes the current category, optionally animating, scrolling, and changing the focus.
     *
     * Supported options are:
     * - focus: The target element that should become focusable
     * - performFocus: Whether or not to actually focus the new focusable element
     * - scroll: Whether the scrolling should be immediate (jump), animated (animate), or none (undefined).
     * - animate: Whether or not to animate active indicator under the button.
     *
     * @param category The key or index of the category to select.
     * @param options The options for the category selection.
     */
    selectCategory(category, options = {}) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            this.scrollListenerState = 'suspend';
            const { focus, performFocus, scroll } = Object.assign({ performFocus: false }, options);
            this.emojiCategories[this.selectedCategory].setActive(false);
            const categoryIndex = this.selectedCategory = typeof category === 'number' ? category : this.getCategoryIndex(category);
            (_a = this.categoryTabs) === null || _a === void 0 ? void 0 : _a.setActiveTab(this.selectedCategory, performFocus, focus === 'button');
            const targetPosition = this.emojiCategories[categoryIndex].el.offsetTop;
            this.emojiCategories[categoryIndex].setActive(true, getFocusTarget(focus), focus !== 'button' && performFocus);
            if (scroll) {
                this.el.scrollTop = targetPosition;
            }
            this.scrollListenerState = 'resume';
        });
    }
    /**
     * Updates the category tabs to reflect the currently focused category.
     * @param category the key of the currently focused category
     */
    updateFocusedCategory(category) {
        var _a;
        // Do nothing if this is already the focused category
        if (this.categories[this.selectedCategory].key === category) {
            return;
        }
        this.scrollListenerState = 'suspend';
        this.selectedCategory = this.getCategoryIndex(category);
        (_a = this.categoryTabs) === null || _a === void 0 ? void 0 : _a.setActiveTab(this.selectedCategory, false);
        this.scrollListenerState = 'resume';
    }
    /**
     * On scroll, checks the new scroll position and highlights a new category if necessary.
     */
    handleScroll() {
        // Do nothing if we are in the 'suspend' state or if category tabs are disabled.
        if (this.scrollListenerState === 'suspend' || !this.categoryTabs) {
            return;
        }
        // If we are in the 'resume' state, don't handle the scroll but re-enable the listener for the
        // next scroll event.
        if (this.scrollListenerState === 'resume') {
            this.scrollListenerState = 'active';
            return;
        }
        const currentPosition = this.el.scrollTop;
        const maxScroll = this.el.scrollHeight - this.el.offsetHeight;
        const targetCategory = this.emojiCategories.findIndex((category, index) => {
            var _a;
            return currentPosition < ((_a = (this.emojiCategories[index + 1])) === null || _a === void 0 ? void 0 : _a.el.offsetTop);
        });
        if (currentPosition === 0) {
            this.categoryTabs.setActiveTab(0, false);
        }
        else if (Math.floor(currentPosition) === Math.floor(maxScroll) || targetCategory < 0) {
            this.categoryTabs.setActiveTab(this.categories.length - 1, false);
        }
        else {
            this.categoryTabs.setActiveTab(targetCategory, false);
        }
    }
}

var errorTemplate = new Template(({ classList, classes, icon, message }) => /* html */ `
<div class="${classList}" role="alert">
  <div class="${classes.icon}"><i data-size="10x" data-icon="${icon}"></i></div>
  <h3 class="${classes.title}">${message}</h3>
</div>
`);

var classes$8 = {"error":"ErrorMessage_error__7I7y1","icon":"ErrorMessage_icon__4---V","appear-grow":"ErrorMessage_appear-grow__oBenJ","title":"ErrorMessage_title__shDDT","appear":"ErrorMessage_appear__kry-R"};

class ErrorMessage extends View {
    constructor({ message, icon = 'warning', template = errorTemplate, className }) {
        super({ template, classes: classes$8 });
        this.message = message;
        this.icon = icon;
        this.className = className;
    }
    renderSync() {
        const classList = [classes$8.error, this.className].join(' ').trim();
        return super.renderSync({ message: this.message, icon: this.icon, classList });
    }
}

var classes$7 = {"dataError":"DataError_dataError__jyJ0H"};

var template$7 = new Template(({ classList, classes, icon, i18n, message }) => /* html */ `
  <div class="${classList}">
    <div class="${classes.icon}"><i data-size="10x" data-icon="${icon}"></i></div>
    <h3 class="${classes.title}">${message}</h3>
    <button>${i18n.get('retry')}</button>
  </div>
`);

class DataError extends ErrorMessage {
    constructor({ message }) {
        super({ message, template: template$7, className: classes$7.dataError });
    }
    initialize() {
        this.uiElements = { retryButton: 'button' };
        this.uiEvents = [View.childEvent('retryButton', 'click', this.onRetry)];
        super.initialize();
    }
    onRetry() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.emojiData) {
                yield this.emojiData.delete();
            }
            else {
                yield this.options.dataStore.deleteDatabase(this.options.locale);
            }
            this.events.emit('reinitialize');
            const db = yield initDatabase(this.options.locale, this.options.dataStore, this.options.messages, this.options.emojiData, this.emojiData);
            this.viewFactory.setEmojiData(db);
            this.events.emit('data:ready', db);
        });
    }
}

var classes$6 = {"preview":"Preview_preview__HcFH6","previewEmoji":"Preview_previewEmoji__vjUki","previewName":"Preview_previewName__C79nL","tagList":"Preview_tagList__DielP","tag":"Preview_tag__aUSTM"};

const tagTemplate = new Template(({ classes, tag }) => /* html */ `
  <li class="${classes.tag}">${tag}</li>
`);
const template$6 = new Template(({ classes }) => /* html */ `
  <div class="${classes.preview}">
    <div class="${classes.previewEmoji}"></div>
    <div class="${classes.previewName}"></div>
    <ul class="${classes.tagList}"></ul>
  </div>
`);
class EmojiPreview extends View {
    constructor() {
        super({ template: template$6, classes: classes$6 });
    }
    initialize() {
        this.uiElements = {
            emoji: View.byClass(classes$6.previewEmoji),
            name: View.byClass(classes$6.previewName),
            tagList: View.byClass(classes$6.tagList)
        };
        this.appEvents = {
            'preview:show': this.showPreview,
            'preview:hide': this.hidePreview
        };
        super.initialize();
    }
    showPreview(emoji, content) {
        this.ui.emoji.replaceChildren(content);
        this.ui.name.textContent = emoji.label;
        if (emoji.tags) {
            this.ui.tagList.style.display = 'flex';
            const tags = emoji.tags.map(tag => tagTemplate.renderSync({ tag, classes: classes$6 }));
            this.ui.tagList.replaceChildren(...tags);
        }
    }
    hidePreview() {
        this.ui.emoji.replaceChildren();
        this.ui.name.textContent = '';
        this.ui.tagList.replaceChildren();
    }
}

var classes$5 = {"searchContainer":"Search_searchContainer__aJW7V","searchField":"Search_searchField__tENKn","clearButton":"Search_clearButton__oFTEY","searchAccessory":"Search_searchAccessory__0rdYO","clearSearchButton":"Search_clearSearchButton__AoDtB","notFound":"Search_notFound__rOdr1"};

const clearSearchButtonTemplate = new Template(({ classes, i18n }) => /* html */ `
  <button title="${i18n.get('search.clear')}" class="${classes.clearSearchButton}">
    <i data-icon="xmark"></i>
  </button>
`);
const searchTemplate = new Template(({ classes, i18n }) => /* html */ `
<div class="${classes.searchContainer}">
  <input class="${classes.searchField}" placeholder="${i18n.get('search')}">
  <span class="${classes.searchAccessory}"></span>
</div>
`, { mode: 'async' });

class Search extends View {
    constructor({ categories, emojiVersion }) {
        super({ template: searchTemplate, classes: classes$5 });
        this.categories = categories.filter((category) => category.key !== 'recents');
        this.emojiVersion = emojiVersion;
        this.search = debounce(this.search.bind(this), 100);
    }
    initialize() {
        this.uiElements = {
            searchField: View.byClass(classes$5.searchField),
            searchAccessory: View.byClass(classes$5.searchAccessory)
        };
        this.uiEvents = [
            View.childEvent('searchField', 'keydown', this.onKeyDown),
            View.childEvent('searchField', 'input', this.onSearchInput)
        ];
        super.initialize();
    }
    render() {
        const _super = Object.create(null, {
            render: { get: () => super.render }
        });
        return __awaiter(this, void 0, void 0, function* () {
            yield _super.render.call(this);
            this.searchIcon = icon('search');
            this.notFoundMessage = this.viewFactory.create(ErrorMessage, {
                message: this.i18n.get('search.notFound'),
                className: classes$5.notFound,
                icon: 'sad'
            });
            this.notFoundMessage.renderSync();
            this.errorMessage = this.viewFactory.create(ErrorMessage, { message: this.i18n.get('search.error') });
            this.errorMessage.renderSync();
            this.clearSearchButton = clearSearchButtonTemplate.render({
                classes: classes$5,
                i18n: this.i18n
            });
            this.clearSearchButton.addEventListener('click', (event) => this.onClearSearch(event));
            this.searchField = this.ui.searchField;
            this.showSearchIcon();
            return this.el;
        });
    }
    showSearchIcon() {
        this.showSearchAccessory(this.searchIcon);
    }
    showClearSearchButton() {
        this.showSearchAccessory(this.clearSearchButton);
    }
    showSearchAccessory(accessory) {
        this.ui.searchAccessory.replaceChildren(accessory);
    }
    clear() {
        this.searchField.value = '';
        this.showSearchIcon();
    }
    focus() {
        this.searchField.focus();
    }
    onClearSearch(event) {
        var _a;
        event.stopPropagation();
        this.searchField.value = '';
        (_a = this.resultsContainer) === null || _a === void 0 ? void 0 : _a.destroy();
        this.resultsContainer = null;
        this.showSearchIcon();
        this.events.emit('content:show');
        this.searchField.focus();
    }
    handleResultsKeydown(event) {
        if (this.resultsContainer) {
            if (event.key === 'Escape') {
                this.onClearSearch(event);
            }
        }
    }
    onKeyDown(event) {
        var _a;
        if (event.key === 'Escape' && this.searchField.value) {
            this.onClearSearch(event);
        }
        else if ((event.key === 'Enter' || event.key === 'ArrowDown') && this.resultsContainer) {
            event.preventDefault();
            (_a = this.resultsContainer.el.querySelector('[tabindex="0"]')) === null || _a === void 0 ? void 0 : _a.focus();
        }
    }
    onSearchInput(event) {
        if (this.searchField.value) {
            this.showClearSearchButton();
            this.search();
        }
        else {
            this.onClearSearch(event);
        }
    }
    search() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.searchField.value) {
                return;
            }
            try {
                const searchResults = yield this.emojiData.searchEmojis(this.searchField.value, this.customEmojis, this.emojiVersion, this.categories);
                this.events.emit('preview:hide');
                if (searchResults.length) {
                    const lazyLoader = new LazyLoader();
                    this.resultsContainer = this.viewFactory.create(EmojiContainer, {
                        emojis: searchResults,
                        fullHeight: true,
                        showVariants: true,
                        lazyLoader
                    });
                    this.resultsContainer.renderSync();
                    if ((_a = this.resultsContainer) === null || _a === void 0 ? void 0 : _a.el) {
                        lazyLoader.observe(this.resultsContainer.el);
                        this.resultsContainer.setActive(true, { row: 0, offset: 0 }, false);
                        this.resultsContainer.el.addEventListener('keydown', event => this.handleResultsKeydown(event));
                        this.events.emit('content:show', this.resultsContainer);
                    }
                }
                else {
                    this.events.emit('content:show', this.notFoundMessage);
                }
            }
            catch (error) {
                this.events.emit('content:show', this.errorMessage);
            }
        });
    }
}

class FocusTrap {
    constructor() {
        this.handleKeyDown = this.handleKeyDown.bind(this);
    }
    activate(rootElement) {
        this.rootElement = rootElement;
        this.rootElement.addEventListener('keydown', this.handleKeyDown);
    }
    deactivate() {
        var _a;
        (_a = this.rootElement) === null || _a === void 0 ? void 0 : _a.removeEventListener('keydown', this.handleKeyDown);
    }
    get focusableElements() {
        return this.rootElement.querySelectorAll('input, [tabindex="0"]');
    }
    get lastFocusableElement() {
        return this.focusableElements[this.focusableElements.length - 1];
    }
    get firstFocusableElement() {
        return this.focusableElements[0];
    }
    checkFocus(event, referenceElement, targetElement) {
        if (event.target === referenceElement) {
            targetElement.focus();
            event.preventDefault();
        }
    }
    handleKeyDown(event) {
        if (event.key === 'Tab') {
            this.checkFocus(event, event.shiftKey ? this.firstFocusableElement : this.lastFocusableElement, event.shiftKey ? this.lastFocusableElement : this.firstFocusableElement);
        }
    }
}

var template$5 = new Template(({ classes }) => /* html */ `
  <div class="${classes.variantOverlay}">
    <div class="${classes.variantPopup}">
      <div data-view="emojis" data-render="sync"></div>
    </div>
  </div>
`);

var classes$4 = {"variantOverlay":"VariantPopup_variantOverlay__gGwue","variantPopup":"VariantPopup_variantPopup__c2pHF"};

const animationOptions = {
    easing: 'ease-in-out',
    duration: 250,
    fill: 'both'
};
const overlayAnimation = {
    opacity: [0, 1]
};
const popupAnimation = {
    opacity: [0, 1],
    transform: ['scale3d(0.8, 0.8, 0.8)', 'scale3d(1, 1, 1)']
};
class VariantPopup extends View {
    constructor({ emoji, parent }) {
        super({ template: template$5, classes: classes$4, parent });
        this.focusedEmojiIndex = 0;
        this.focusTrap = new FocusTrap();
        this.animateShow = () => Promise.all([
            animate(this.el, overlayAnimation, animationOptions, this.options),
            animate(this.ui.popup, popupAnimation, animationOptions, this.options)
        ]);
        this.emoji = emoji;
    }
    initialize() {
        this.uiElements = {
            popup: View.byClass(classes$4.variantPopup)
        };
        this.uiEvents = [
            View.uiEvent('click', this.handleClick),
            View.uiEvent('keydown', this.handleKeydown)
        ];
        super.initialize();
    }
    animateHide() {
        const hideOptions = Object.assign(Object.assign({}, animationOptions), { direction: 'reverse' });
        return Promise.all([
            animate(this.el, overlayAnimation, hideOptions, this.options),
            animate(this.ui.popup, popupAnimation, hideOptions, this.options),
        ]);
    }
    hide() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.animateHide();
            this.events.emit('variantPopup:hide');
        });
    }
    handleKeydown(event) {
        if (event.key === 'Escape') {
            this.hide();
            event.stopPropagation();
        }
    }
    handleClick(event) {
        if (!this.ui.popup.contains(event.target)) {
            this.hide();
        }
    }
    getEmoji(index) {
        return this.renderedEmojis[index];
    }
    setFocusedEmoji(newIndex) {
        const currentFocusedEmoji = this.getEmoji(this.focusedEmojiIndex);
        currentFocusedEmoji.tabIndex = -1;
        this.focusedEmojiIndex = newIndex;
        const newFocusedEmoji = this.getEmoji(this.focusedEmojiIndex);
        newFocusedEmoji.tabIndex = 0;
        newFocusedEmoji.focus();
    }
    destroy() {
        this.emojiContainer.destroy();
        this.focusTrap.deactivate();
        super.destroy();
    }
    renderSync() {
        const baseEmoji = Object.assign(Object.assign({}, this.emoji), { skins: null });
        const variants = (this.emoji.skins || []).map(variant => (Object.assign(Object.assign({}, variant), { label: this.emoji.label, tags: this.emoji.tags })));
        const emojis = [baseEmoji, ...variants];
        this.emojiContainer = this.viewFactory.create(EmojiContainer, {
            emojis,
            preview: false
        });
        super.renderSync({ emojis: this.emojiContainer });
        if (emojis.length < this.options.emojisPerRow) {
            this.el.style.setProperty('--emojis-per-row', emojis.length.toString());
        }
        return this.el;
    }
    activate() {
        this.emojiContainer.setActive(true, { row: 0, offset: 0 }, true);
        this.focusTrap.activate(this.el);
    }
}

var template$4 = new Template(({ classes, i18n, category, pickerId, icon }) => /* html */ `
<li class="${classes.categoryTab}">
  <button
    aria-selected="false"
    role="tab"
    class="${classes.categoryButton}"
    tabindex="-1"
    title="${i18n.get(`categories.${category.key}`, category.message || category.key)}"
    type="button"
    data-category="${category.key}"
    id="${pickerId}-category-${category.key}"
  >
    <i data-icon="${icon}"></i>
</li>
`);

var classes$3 = {"categoryButtons":"CategoryTabs_categoryButtons__dJVp-","categoryButton":"CategoryTabs_categoryButton__AsR9b","categoryTab":"CategoryTabs_categoryTab__fAgQT","categoryTabActive":"CategoryTabs_categoryTabActive__691be"};

class CategoryTab extends View {
    constructor({ category, icon }) {
        super({ template: template$4, classes: classes$3 });
        this.isActive = false;
        this.category = category;
        this.icon = icon;
    }
    initialize() {
        this.uiElements = {
            button: View.byClass(classes$3.categoryButton)
        };
        this.uiEvents = [
            View.childEvent('button', 'click', this.selectCategory),
        ];
        super.initialize();
    }
    renderSync() {
        super.renderSync({
            category: this.category,
            icon: this.icon
        });
        this.ui.button.ariaSelected = 'false';
        return this.el;
    }
    /**
     * Sets the active state of the tab.
     *
     * @param isActive The new active state
     * @param changeFocus Whether or not to change the active focusable element to the tab button
     * @param scroll Whether or not to scroll to the new category
     */
    setActive(isActive, changeFocus = true, scroll = false) {
        this.el.classList.toggle(classes$3.categoryTabActive, isActive);
        if (changeFocus) {
            this.setFocused(isActive, scroll);
        }
        this.isActive = isActive;
    }
    /**
     * Changes the focused state of the tab button.
     * @param isFocused The new active state
     * @param scroll Whether or not to scroll to the new category
     */
    setFocused(isFocused, scroll = false) {
        this.ui.button.ariaSelected = isFocused.toString();
        if (isFocused) {
            this.ui.button.tabIndex = 0;
            this.ui.button.focus();
            if (scroll) {
                this.events.emit('category:select', this.category.key, { scroll: 'animate', focus: 'button', performFocus: false });
            }
        }
        else {
            this.ui.button.tabIndex = -1;
        }
    }
    selectCategory() {
        if (!this.isActive) {
            this.events.emit('category:select', this.category.key, { scroll: 'animate', focus: 'button', performFocus: true });
        }
    }
}

var template$3 = new Template(({ classes }) => /* html */ `
  <ul role="tablist" class="${classes.categoryButtons}">
    <div data-placeholder="tabs"></div>
  </ul>
`);

class CategoryTabs extends View {
    constructor({ categories }) {
        super({ template: template$3, classes: classes$3 });
        this.activeCategoryIndex = 0;
        this.categories = categories;
    }
    initialize() {
        this.keyBindings = {
            ArrowLeft: this.stepSelectedTab(-1),
            ArrowRight: this.stepSelectedTab(1)
        };
        super.initialize();
    }
    renderSync() {
        this.tabViews = this.categories.map(category => this.viewFactory.create(CategoryTab, { category, icon: categoryIcons[category.key] }));
        super.renderSync({
            tabs: this.tabViews.map(view => view.renderSync())
        });
        this.currentTabView.setActive(true);
        return this.el;
    }
    get currentCategory() {
        return this.categories[this.activeCategoryIndex];
    }
    get currentTabView() {
        return this.tabViews[this.activeCategoryIndex];
    }
    setActiveTab(index, focus = true, scroll = true) {
        // Don't do anything if the desired tab is already active
        if (index === this.activeCategoryIndex) {
            return;
        }
        const oldCategory = this.currentTabView;
        const newCategory = this.tabViews[index];
        oldCategory.setActive(false, focus);
        newCategory.setActive(true, focus, scroll);
        this.activeCategoryIndex = index;
    }
    getTargetCategory(index) {
        if (index < 0) {
            return this.categories.length - 1;
        }
        if (index >= this.categories.length) {
            return 0;
        }
        return index;
    }
    stepSelectedTab(step) {
        return () => {
            const newIndex = this.activeCategoryIndex + step;
            this.setActiveTab(this.getTargetCategory(newIndex));
        };
    }
}

// Representative emojis for each emoji version. If a given emoji is supported,
// we assume the system supports that emoji version.
const TEST_EMOJIS = [
    { version: 15, emoji: String.fromCodePoint(0x1FAE8) },
    { version: 14, emoji: String.fromCodePoint(0x1F6DD) },
    { version: 13, emoji: String.fromCodePoint(0x1FAC1) },
    { version: 12, emoji: String.fromCodePoint(0x1F9A9) },
    { version: 11, emoji: String.fromCodePoint(0x1F9B7) },
    { version: 5, emoji: String.fromCodePoint(0x1F92A) },
    { version: 4, emoji: String.fromCodePoint(0x2695) },
    { version: 3, emoji: String.fromCodePoint(0x1F922) },
    { version: 2, emoji: String.fromCodePoint(0x1F5E8) },
    { version: 1, emoji: String.fromCodePoint(0x1F600) }
];
/**
 * Determines the latest emoji version that is supported by the browser.
 * @returns the supported emoji version number
 */
function determineEmojiVersion() {
    var _a;
    const supportedEmoji = TEST_EMOJIS.find(emoji => supportsEmoji(emoji.emoji));
    return (_a = supportedEmoji === null || supportedEmoji === void 0 ? void 0 : supportedEmoji.version) !== null && _a !== void 0 ? _a : 1;
}
/**
 * Checks if the given emoji is rendered correctly by the browser.
 *
 * @param emoji the emoji to attempt to render
 * @returns true if the emoji renders correctly, false otherwise
 */
function supportsEmoji(emoji) {
    const context = document.createElement('canvas').getContext('2d');
    if (context) {
        context.textBaseline = 'top';
        context.font = '32px Arial';
        context.fillText(emoji, 0, 0);
        return context.getImageData(16, 16, 1, 1).data[0] !== 0;
    }
}

function repeat(count, content) {
    return Array.from({ length: count }, () => content).join('');
}
function header({ showHeader, classes }) {
    return showHeader ? /* html */ `
    <header class="${classes.header}">
      <div data-view="search"></div>
      <div data-view="categoryTabs" data-render="sync"></div>
    </header>
  ` : '';
}
function renderPicker(data) {
    const { classes, theme, className = '' } = data;
    return /* html */ `
    <div class="${classes.picker} ${theme} ${className}">
      ${header(data)}
      <div class="${classes.content}">
        <div data-view="emojiArea"></div>
      </div>
      <div data-view="preview"></div>
    </div>
  `;
}
function renderPlaceholder(data) {
    const { emojiCount, classes, theme, className } = data;
    const search = ({ showSearch, classes }) => showSearch ? /* html */ `
    <div class="${classes.searchSkeleton}">
      <div class="${classes.searchInput} ${classes.placeholder}"></div>
    </div>
  ` : '';
    const categoryTabs = ({ showCategoryTabs, classes }) => showCategoryTabs ? /* html */ `
    <div class="${classes.categoryTabsSkeleton}">
      ${repeat(10, /* html */ `<div class="${classes.placeholder} ${classes.categoryTab}"></div>`)}
    </div>
  ` : '';
    const header = ({ showHeader, classes }) => showHeader ? /* html */ `
    <header class="${classes.header}">
      ${search(data)}
      ${categoryTabs(data)}
    </header>
  ` : '';
    const preview = ({ showPreview, classes }) => showPreview ? /* html */ `
    <div class="${classes.previewSkeleton}">
      <div class="${classes.placeholder} ${classes.previewEmoji}"></div>
      <div class="${classes.placeholder} ${classes.previewName}"></div>
      <ul class="${classes.tagList}">
        ${repeat(3, /* html */ `<li class="${classes.placeholder} ${classes.tag}"></li>`)}
      </ul>
    </div>
  ` : '';
    return /* html */ `
    <div class="${classes.skeleton} ${classes.picker} ${theme} ${className}">
      ${header(data)}
      <div class="${classes.contentSkeleton}">
        <div class="${classes.placeholder} ${classes.categoryName}"></div>
        <div class="${classes.emojiGrid}">
          ${repeat(emojiCount, /* html */ `<div class="${classes.placeholder} ${classes.emoji}"></div>`)}
        </div>
      </div>
      ${preview(data)}
    </div>
  `;
}
var template$2 = new Template(data => {
    return data.isLoaded ? renderPicker(data) : renderPlaceholder(data);
});

var classes$2 = {"picker":"EmojiPicker_picker__19Vln","skeleton":"EmojiPicker_skeleton__M1a2g","placeholder":"EmojiPicker_placeholder__YDJn-","shine":"EmojiPicker_shine__s-vEs","searchSkeleton":"EmojiPicker_searchSkeleton__gNgdU","searchInput":"EmojiPicker_searchInput__tpaBs","categoryTabsSkeleton":"EmojiPicker_categoryTabsSkeleton__2dISl","categoryTab":"EmojiPicker_categoryTab__mmSVF","contentSkeleton":"EmojiPicker_contentSkeleton__UWfQu","categoryName":"EmojiPicker_categoryName__d2-Ed","emojiGrid":"EmojiPicker_emojiGrid__WnoCI","emoji":"EmojiPicker_emoji__jaN-w","previewSkeleton":"EmojiPicker_previewSkeleton__Bjqkm","previewEmoji":"EmojiPicker_previewEmoji__uOLbA","previewName":"EmojiPicker_previewName__QJ47d","tagList":"EmojiPicker_tagList__tc6nv","tag":"EmojiPicker_tag__gAU6B","overlay":"EmojiPicker_overlay__kDT99","content":"EmojiPicker_content__xT6Kl","fullHeight":"EmojiPicker_fullHeight__7kz2H","pluginContainer":"EmojiPicker_pluginContainer__Gz3yT","header":"EmojiPicker_header__eDZPD"};

const variableNames = {
    emojisPerRow: '--emojis-per-row',
    visibleRows: '--row-count',
    emojiSize: '--emoji-size'
};
/**
 * The main emoji picker view. Contains the full picker UI and an event emitter to react to
 * emoji selection events.
 */
class EmojiPicker extends View {
    constructor() {
        super({ template: template$2, classes: classes$2 });
        this.pickerReady = false;
        this.externalEvents = new ExternalEvents();
    }
    initialize() {
        this.uiElements = {
            pickerContent: View.byClass(classes$2.content),
            header: View.byClass(classes$2.header)
        };
        this.uiEvents = [
            View.uiEvent('keydown', this.handleKeyDown)
        ];
        this.appEvents = {
            error: this.onError,
            reinitialize: this.reinitialize,
            'data:ready': this.onDataReady,
            'content:show': this.showContent,
            'variantPopup:hide': this.hideVariantPopup,
            'emoji:select': this.selectEmoji
        };
        super.initialize();
    }
    /**
     * Destroys the picker when it is no longer needed.
     * After calling this method, the picker will no longer be usable.
     *
     * @returns a Promise that resolves when the destroy is complete.
     */
    destroy() {
        var _a, _b;
        super.destroy();
        (_a = this.search) === null || _a === void 0 ? void 0 : _a.destroy();
        this.emojiArea.destroy();
        (_b = this.categoryTabs) === null || _b === void 0 ? void 0 : _b.destroy();
        this.events.removeAll();
        this.externalEvents.removeAll();
    }
    /**
     * Listens for a picker event.
     *
     * @param event The event to listen for
     * @param callback The callback to call when the event is triggered
     */
    addEventListener(event, callback) {
        this.externalEvents.on(event, callback);
    }
    /**
     * Removes a recent emoji from the picker.
     *
     * @param event The event to stop listening for
     * @param callback The previously bound event listener
     */
    removeEventListener(event, callback) {
        this.externalEvents.off(event, callback);
    }
    /**
     * Finishes setting up the picker view once the data is ready.
     * This will only be called if the emoji data is available and all
     * emoji picker views have been rendered.
     *
     * This is the last thing to happen before the emoji picker UI becomes visible.
     */
    initializePickerView() {
        if (this.pickerReady) {
            this.showContent();
            this.emojiArea.reset();
        }
    }
    handleKeyDown(event) {
        const isShortcut = event.ctrlKey || event.metaKey;
        if (event.key === 's' && isShortcut && this.search) {
            event.preventDefault();
            this.search.focus();
        }
    }
    /**
     * Builds the three sections of the picker:
     *
     * - preview area (if enabled in options)
     * - search area (if enabled in options)
     * - emoji area (always shown)
     *
     * @returns an array containing the three child views. The preview and search
     *          views are optional, and will be undefined if they are not enabled.
     */
    buildChildViews() {
        if (this.options.showPreview) {
            this.preview = this.viewFactory.create(EmojiPreview);
        }
        if (this.options.showSearch) {
            this.search = this.viewFactory.create(Search, {
                categories: this.categories,
                emojiVersion: this.emojiVersion
            });
        }
        if (this.options.showCategoryTabs) {
            this.categoryTabs = this.viewFactory.create(CategoryTabs, {
                categories: this.categories
            });
        }
        this.currentView = this.emojiArea = this.viewFactory.create(EmojiArea, {
            categoryTabs: this.categoryTabs,
            categories: this.categories,
            emojiVersion: this.emojiVersion
        });
        return [this.preview, this.search, this.emojiArea, this.categoryTabs];
    }
    /**
     * Sets any CSS variables corresponding to options that were set.
     */
    setStyleProperties() {
        if (!this.options.showSearch) {
            this.el.style.setProperty('--search-height-full', '0px');
        }
        if (!this.options.showCategoryTabs) {
            this.el.style.setProperty('--category-tabs-height', '0px');
            this.el.style.setProperty('--category-tabs-offset', '0px');
        }
        if (!this.options.showPreview) {
            this.el.style.setProperty('--emoji-preview-height-full', '0px');
        }
        Object.keys(variableNames).forEach(key => {
            if (this.options[key]) {
                this.el.style.setProperty(variableNames[key], this.options[key].toString());
            }
        });
    }
    reinitialize() {
        this.renderSync();
    }
    onError(error) {
        const errorView = this.viewFactory.create(DataError, { message: this.i18n.get('error.load') });
        const height = this.el.offsetHeight || 375;
        this.el.style.height = `${height}px`;
        this.el.replaceChildren(errorView.renderSync());
        throw error;
    }
    /**
     * Called when the emoji database is ready to be used.
     *
     * This will replace the loader placeholder with the full picker UI.
     */
    onDataReady(db) {
        const _super = Object.create(null, {
            render: { get: () => super.render }
        });
        return __awaiter(this, void 0, void 0, function* () {
            // Save the current el so we can replace it in the DOM after the new render.
            const currentView = this.el;
            try {
                if (db) {
                    this.emojiData = db;
                }
                else {
                    yield this.emojiDataPromise;
                }
                if (this.options.emojiVersion === 'auto') {
                    this.emojiVersion = determineEmojiVersion() || parseFloat(LATEST_EMOJI_VERSION);
                }
                else {
                    this.emojiVersion = this.options.emojiVersion;
                }
                this.categories = yield this.emojiData.getCategories(this.options);
                const [preview, search, emojiArea, categoryTabs] = this.buildChildViews();
                yield _super.render.call(this, {
                    isLoaded: true,
                    search,
                    categoryTabs,
                    emojiArea,
                    preview,
                    showHeader: Boolean(this.search || this.categoryTabs),
                    theme: this.options.theme,
                    className: this.options.className
                });
                this.el.style.setProperty('--category-count', this.categories.length.toString());
                this.pickerReady = true;
                currentView.replaceWith(this.el);
                this.setStyleProperties();
                this.initializePickerView();
                this.setInitialFocus();
                this.externalEvents.emit('data:ready');
            }
            catch (error) {
                this.events.emit('error', error);
            }
        });
    }
    /**
     * Renders the picker.
     *
     * @returns the root element of the picker
     */
    renderSync() {
        super.renderSync({
            isLoaded: false,
            theme: this.options.theme,
            showSearch: this.options.showSearch,
            showPreview: this.options.showPreview,
            showCategoryTabs: this.options.showCategoryTabs,
            showHeader: this.options.showSearch || this.options.showCategoryTabs,
            emojiCount: this.options.emojisPerRow * this.options.visibleRows
        });
        if (!this.options.rootElement) {
            throw new Error('Picker must be given a root element via the rootElement option');
        }
        this.options.rootElement.replaceChildren(this.el);
        this.setStyleProperties();
        if (this.pickerReady) {
            this.initializePickerView();
        }
        return this.el;
    }
    /**
     * Sets the initial autofocus, depending on options.
     */
    setInitialFocus() {
        if (!this.pickerReady) {
            return;
        }
        if (this.search && this.options.autoFocusSearch) {
            this.search.focus();
        }
        else {
            this.emojiArea.focusableEmoji.focus();
        }
    }
    /**
     * Resets the picker to its default, "inactive" state.
     */
    reset() {
        if (this.pickerReady) {
            this.emojiArea.reset();
            this.showContent(this.emojiArea);
        }
        if (this.search) {
            this.search.clear();
        }
    }
    /**
     * Shows content in the main picker content area.
     * If no View is specified, the built-in emoji area will be shown.
     *
     * The currently shown view will be removed from the DOM and destroyed.
     *
     * @param content The View to show
     */
    showContent(content = this.emojiArea) {
        var _a, _b;
        if (content === this.currentView) {
            return;
        }
        if (this.currentView !== this.emojiArea) {
            (_a = this.currentView) === null || _a === void 0 ? void 0 : _a.destroy();
        }
        this.ui.pickerContent.classList.toggle(classes$2.fullHeight, content !== this.emojiArea);
        this.ui.pickerContent.replaceChildren(content.el);
        this.currentView = content;
        if (content === this.emojiArea) {
            this.emojiArea.reset();
            if (this.categoryTabs) {
                this.ui.header.appendChild(this.categoryTabs.el);
            }
        }
        else {
            (_b = this.categoryTabs) === null || _b === void 0 ? void 0 : _b.el.remove();
        }
    }
    /**
     * Closes and destroys the variant popup.
     */
    hideVariantPopup() {
        var _a;
        (_a = this.variantPopup) === null || _a === void 0 ? void 0 : _a.destroy();
    }
    /**
     * Given a mouse event, determines if the event occurred on the picker or one of its components.
     *
     * @param event The mouse event
     * @returns true if the click should be treated as on the picker, false otherwise
     */
    isPickerClick(event) {
        var _a, _b;
        const clickedNode = event.target;
        const isClickInsidePicker = this.el.contains(clickedNode);
        const isClickOnVariantPopup = (_b = (_a = this.variantPopup) === null || _a === void 0 ? void 0 : _a.el) === null || _b === void 0 ? void 0 : _b.contains(clickedNode);
        return isClickInsidePicker || isClickOnVariantPopup;
    }
    /**
     * Handles a click on an emoji.
     * @param emoji The emoji that was clicked
     * @returns a Promise that resolves when either the variant popup is shown or the emoji is rendered and emitted
     */
    selectEmoji({ emoji }) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            // Show the variant popup if the emoji has variants
            if (((_a = emoji.skins) === null || _a === void 0 ? void 0 : _a.length) && this.options.showVariants && !this.isVariantPopupOpen) {
                this.showVariantPopup(emoji);
            }
            else {
                yield ((_b = this.variantPopup) === null || _b === void 0 ? void 0 : _b.animateHide());
                this.events.emit('variantPopup:hide');
                yield this.emitEmoji(emoji);
            }
        });
    }
    get isVariantPopupOpen() {
        return this.variantPopup && !this.variantPopup.isDestroyed;
    }
    /**
     * Shows the variant popup for an emoji.
     *
     * @param emoji The emoji whose variants are to be shown.
     * @returns a Promise that resolves when the popup is shown
     */
    showVariantPopup(emoji) {
        return __awaiter(this, void 0, void 0, function* () {
            const currentFocus = document.activeElement;
            this.events.once('variantPopup:hide', () => {
                currentFocus === null || currentFocus === void 0 ? void 0 : currentFocus.focus();
            });
            this.variantPopup = this.viewFactory.create(VariantPopup, { emoji, parent: this.el });
            this.el.appendChild(this.variantPopup.renderSync());
            this.variantPopup.activate();
        });
    }
    /**
     * Renders an emoji, and emits a public emoji:select event with the rendered result.
     * @param emoji the emoji that was selected.
     */
    emitEmoji(emoji) {
        return __awaiter(this, void 0, void 0, function* () {
            this.externalEvents.emit('emoji:select', yield this.renderer.doEmit(emoji));
            addOrUpdateRecent(emoji, this.options.maxRecents);
            this.events.emit('recent:add', emoji);
        });
    }
}

class ViewFactory {
    constructor({ events, i18n, renderer, emojiData, options, customEmojis = [], pickerId }) {
        this.events = events;
        this.i18n = i18n;
        this.renderer = renderer;
        this.emojiData = emojiData;
        this.options = options;
        this.customEmojis = customEmojis;
        this.pickerId = pickerId;
    }
    setEmojiData(emojiData) {
        this.emojiData = Promise.resolve(emojiData);
    }
    create(constructor, ...args) {
        const view = new constructor(...args);
        view.setPickerId(this.pickerId);
        view.setEvents(this.events);
        view.setI18n(this.i18n);
        view.setRenderer(this.renderer);
        view.setEmojiData(this.emojiData);
        view.setOptions(this.options);
        view.setCustomEmojis(this.customEmojis);
        view.viewFactory = this;
        view.initialize();
        return view;
    }
}

var _Bundle_dictionary;
class Bundle {
    constructor(dictionary = {}) {
        _Bundle_dictionary.set(this, void 0);
        __classPrivateFieldSet(this, _Bundle_dictionary, new Map(Object.entries(dictionary)), "f");
    }
    get(key, fallback = key) {
        return __classPrivateFieldGet(this, _Bundle_dictionary, "f").get(key) || fallback;
    }
}
_Bundle_dictionary = new WeakMap();

var classes$1 = {"imagePlaceholder":"common_imagePlaceholder__FRWLu","placeholder":"common_placeholder__qe-fo","shine":"common_shine__tUVG2"};

const template$1 = new Template(({ classes }) => /* html */ `
  <div class="${classes.placeholder} ${classes.imagePlaceholder}"></div>
`);
class Image extends View {
    constructor({ classNames } = {}) {
        super({ template: template$1, classes: classes$1 });
        this.classNames = classNames;
    }
    load(src) {
        const img = document.createElement('img');
        if (this.classNames) {
            img.className = this.classNames;
        }
        img.addEventListener('load', () => {
            this.el.replaceWith(img);
        }, { once: true });
        Promise.resolve(src).then(src => img.src = src);
    }
    renderSync() {
        super.renderSync();
        if (this.classNames) {
            const classNames = this.classNames.split(' ');
            classNames.forEach(className => this.el.classList.add(className));
        }
        return this.el;
    }
}

var classes = {"customEmoji":"custom_customEmoji__Kspg6"};

class Renderer {
    renderElement(content) {
        return { content };
    }
    renderImage(classNames = '', urlResolver) {
        const image = new Image({ classNames });
        image.renderSync();
        const resolver = () => {
            image.load(urlResolver());
            return image.el;
        };
        return { content: image, resolver };
    }
    doRender(emoji, lazyLoader, classNames) {
        if (emoji.custom) {
            return this.renderCustom(emoji, lazyLoader, classNames);
        }
        const { content, resolver } = this.render(emoji, classNames);
        const contentElement = content instanceof HTMLElement ? content : content.el;
        if (lazyLoader && resolver) {
            return lazyLoader.lazyLoad(contentElement, resolver);
        }
        if (resolver) {
            resolver();
        }
        return contentElement;
    }
    doEmit(emoji) {
        if (emoji.custom) {
            return this.emitCustom(emoji);
        }
        return this.emit(emoji);
    }
    emitCustom({ url, label, emoji, data }) {
        return { url, label, emoji, data };
    }
    renderCustom(emoji, lazyLoader, additionalClasses = '') {
        const classNames = [classes.customEmoji, additionalClasses].join(' ').trim();
        const { content, resolver } = this.renderImage(classNames, () => emoji.url);
        const contentElement = content instanceof HTMLElement ? content : content.el;
        if (resolver) {
            resolver();
        }
        return contentElement;
    }
}

const template = new Template(({ emoji }) => /* html */ `<span>${emoji}</span>`);
class NativeRenderer extends Renderer {
    render(emoji) {
        return this.renderElement(template.renderSync({ emoji: emoji.emoji }));
    }
    emit({ emoji, hexcode, label }) {
        return { emoji, hexcode, label };
    }
}

var themes = {"lightTheme":"themes_lightTheme__mMNem","darkTheme":"themes_darkTheme__qgrZP","autoTheme":"themes_autoTheme__tik-v"};

const { autoTheme, lightTheme, darkTheme } = themes;

var en = {
    'categories.activities': 'Activities',
    'categories.animals-nature': 'Animals & Nature',
    'categories.custom': 'Custom',
    'categories.flags': 'Flags',
    'categories.food-drink': 'Food & Drink',
    'categories.objects': 'Objects',
    'categories.people-body': 'People & Body',
    'categories.recents': 'Recently Used',
    'categories.smileys-emotion': 'Smileys & Emotion',
    'categories.symbols': 'Symbols',
    'categories.travel-places': 'Travel & Places',
    'error.load': 'Failed to load emojis',
    'recents.clear': 'Clear recent emojis',
    'recents.none': 'You haven\'t selected any emojis yet.',
    'retry': 'Try again',
    'search.clear': 'Clear search',
    'search.error': 'Failed to search emojis',
    'search.notFound': 'No results found',
    'search': 'Search emojis...'
};

const rules = [
    // Prior to Emoji 14, the handshake emoji's skin tone variants was not standardized
    // and will not render correctly as a native emoji. 
    (emoji, emojiVersion) => {
        if (emoji.hexcode === '1F91D' && emojiVersion < 14) {
            emoji.skins = [];
        }
        return emoji;
    },
    // Filter out variants that are not supported by the current version of the emoji.
    // If a variant doesn't specify a version, it will be included. Only variants that
    // specify a version that is greater than the current version will be filtered out.
    (emoji, emojiVersion) => {
        if (emoji.skins) {
            emoji.skins = emoji.skins.filter((skin) => !skin.version || skin.version <= emojiVersion);
        }
        return emoji;
    }
];
function applyRulesToEmoji(emoji, emojiVersion) {
    if (rules.some(rule => rule(emoji, emojiVersion) === null)) {
        return null;
    }
    return emoji;
}
function applyRules(emojis, emojiVersion) {
    return emojis.filter(emoji => applyRulesToEmoji(emoji, emojiVersion) !== null);
}

/**
 * Transforms an Emoji from emojibase into an EmojiRecord.
 *
 * @param emoji the Emoji from the database
 * @returns the equivalent EmojiRecord
 */
function getEmojiRecord(emoji) {
    var _a;
    return {
        emoji: emoji.emoji,
        label: emoji.label,
        tags: emoji.tags,
        skins: (_a = emoji.skins) === null || _a === void 0 ? void 0 : _a.map(skin => getEmojiRecord(skin)),
        order: emoji.order,
        custom: false,
        hexcode: emoji.hexcode,
        version: emoji.version
    };
}
/**
 * Given an emoji, determine if the query matches.
 *
 * The emoji matches if the text query matches the name or one of its tags, and if it is in the array of
 * categories (if given).
 *
 * @param emoji The emoji to check
 * @param query The text query
 * @param categories The categories to check
 * @returns a boolean indicating whether or not the emoji matches the query
 */
function queryMatches(emoji, query, categories) {
    var _a;
    if (categories && !categories.some(category => category.order === emoji.group)) {
        return false;
    }
    return (caseInsensitiveIncludes(emoji.label, query) ||
        ((_a = emoji.tags) === null || _a === void 0 ? void 0 : _a.some(tag => caseInsensitiveIncludes(tag, query))));
}
class DataStore {
    constructor(locale = 'en') {
        this.locale = locale;
    }
}

// Base database name. It will have the locale appended to it.
const DATABASE_NAME = 'PicMo';
function IndexedDbStoreFactory(locale) {
    return new IndexedDbStore(locale);
}
IndexedDbStoreFactory.deleteDatabase = (locale) => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.deleteDatabase(`${DATABASE_NAME}-${locale}`);
        request.addEventListener('success', resolve);
        request.addEventListener('error', reject);
    });
};
class IndexedDbStore extends DataStore {
    /**
     * Creates/opens the database.
     *
     * There are three data stores:
     *
     * - category: stores the categories
     * - emoji: stores the emoji data itself
     * - meta: stores metadata such as the ETags
     *
     * @returns a Promise that resolves when the database is ready
     */
    open() {
        return __awaiter(this, void 0, void 0, function* () {
            const request = indexedDB.open(`${DATABASE_NAME}-${this.locale}`);
            return new Promise((resolve, reject) => {
                request.addEventListener('success', (event) => {
                    var _a;
                    this.db = (_a = event.target) === null || _a === void 0 ? void 0 : _a.result;
                    resolve();
                });
                request.addEventListener('error', reject);
                request.addEventListener('upgradeneeded', (event) => __awaiter(this, void 0, void 0, function* () {
                    var _a;
                    this.db = (_a = event.target) === null || _a === void 0 ? void 0 : _a.result;
                    this.db.createObjectStore('category', { keyPath: 'order' });
                    const emojiStore = this.db.createObjectStore('emoji', { keyPath: 'emoji' });
                    emojiStore.createIndex('category', 'group');
                    emojiStore.createIndex('version', 'version');
                    this.db.createObjectStore('meta');
                }));
            });
        });
    }
    delete() {
        return __awaiter(this, void 0, void 0, function* () {
            this.close();
            const request = indexedDB.deleteDatabase(`${DATABASE_NAME}-${this.locale}`);
            yield this.waitForRequest(request);
        });
    }
    close() {
        this.db.close();
    }
    getEmojiCount() {
        return __awaiter(this, void 0, void 0, function* () {
            const transaction = this.db.transaction('emoji', 'readonly');
            const store = transaction.objectStore('emoji');
            const result = yield this.waitForRequest(store.count());
            return result.target.result;
        });
    }
    /**
     * Gets the ETags stored in the meta datastore.
     * @returns a Promise that resolves to the ETag data
     */
    getEtags() {
        return __awaiter(this, void 0, void 0, function* () {
            const transaction = this.db.transaction('meta', 'readonly');
            const store = transaction.objectStore('meta');
            const [emojisEtag, messagesEtag] = yield Promise.all([
                this.waitForRequest(store.get('emojisEtag')),
                this.waitForRequest(store.get('messagesEtag'))
            ]);
            return {
                storedEmojisEtag: emojisEtag.target.result,
                storedMessagesEtag: messagesEtag.target.result
            };
        });
    }
    /**
     * Stores ETag values for the emoji and message data.
     * @param emojisEtag the ETag for the emoji data
     * @param messagesEtag the ETag for the message data
     */
    setMeta(meta) {
        return __awaiter(this, void 0, void 0, function* () {
            const transaction = this.db.transaction('meta', 'readwrite');
            const store = transaction.objectStore('meta');
            return new Promise(resolve => {
                transaction.oncomplete = resolve;
                const properties = Object.keys(meta).filter(Boolean);
                properties.forEach(property => {
                    store.put(meta[property], property);
                });
            });
        });
    }
    getHash() {
        return __awaiter(this, void 0, void 0, function* () {
            const transaction = this.db.transaction('meta', 'readonly');
            const store = transaction.objectStore('meta');
            const result = yield this.waitForRequest(store.get('hash'));
            return result.target.result;
        });
    }
    /**
     * Determines whether or not the database is populated.
     *
     * @returns a Promise that resolves to a boolean indicating the populated state
     */
    isPopulated() {
        return __awaiter(this, void 0, void 0, function* () {
            const transaction = this.db.transaction('category', 'readonly');
            const store = transaction.objectStore('category');
            const categoryCountResult = yield this.waitForRequest(store.count());
            const categoryCount = categoryCountResult.target.result;
            return categoryCount > 0;
        });
    }
    /**
     * Removes any current data and re-populates the data stores with the given data.
     *
     * @param groups the group message data
     * @param emojis the emoji data
     * @param emojisEtag the emoji data ETag
     * @param messagesEtag the message data ETag
     * @returns a Promise that resolves when all data has been written
     */
    populate({ groups, emojis, emojisEtag, messagesEtag, hash }) {
        return __awaiter(this, void 0, void 0, function* () {
            // Wipe out any old data first
            yield this.removeAllObjects('category', 'emoji');
            const tasks = [
                this.addObjects('category', groups),
                this.addObjects('emoji', emojis),
                this.setMeta({ emojisEtag, messagesEtag, hash })
            ];
            yield Promise.all(tasks);
        });
    }
    /**
     * Gets the emoji categories.
     *
     * If an include list is specified, only those categories will be returned - and will be in the same sort order.
     * Otherwise, all categories (except 'component') are returned.
     *
     * @param include an array of CategoryKeys to include
     * @returns an arrya of all categories, or only the ones specified if include is given
     */
    getCategories(options) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const transaction = this.db.transaction('category', 'readonly');
            const categoryStore = transaction.objectStore('category');
            const result = yield this.waitForRequest(categoryStore.getAll());
            let categories = result.target.result.filter(category => category.key !== 'component');
            if (options.showRecents) {
                categories.unshift({ key: 'recents', order: -1 });
            }
            if ((_a = options.custom) === null || _a === void 0 ? void 0 : _a.length) {
                categories.push({ key: 'custom', order: 10 });
            }
            if (options.categories) {
                const includeList = options.categories;
                categories = categories.filter(category => includeList.includes(category.key));
                categories.sort((a, b) => includeList.indexOf(a.key) - includeList.indexOf(b.key));
            }
            else {
                categories.sort((a, b) => a.order - b.order);
            }
            return categories;
        });
    }
    /**
     * Gets all emojis for a particular category and emoji version.
     *
     * @param category the category to get emojis for
     * @param emojiVersion the maximum version for returned emojis
     * @returns a Promise that resolves to an array of the EmojiRecord data
     */
    getEmojis(category, emojiVersion) {
        return __awaiter(this, void 0, void 0, function* () {
            const transaction = this.db.transaction('emoji', 'readonly');
            const emojiStore = transaction.objectStore('emoji');
            const groupsIndex = emojiStore.index('category');
            const result = yield this.waitForRequest(groupsIndex.getAll(category.order));
            const emojis = result.target.result;
            const records = emojis
                .filter((e) => e.version <= emojiVersion)
                .sort((a, b) => {
                if (a.order != null && b.order != null) {
                    return a.order - b.order;
                }
                return 0;
            })
                .map(getEmojiRecord);
            return applyRules(records, emojiVersion);
        });
    }
    /**
     * Searches the database for emojis.
     *
     * @param query the text query
     * @param customEmojis the custom emojis
     * @param emojiVersion the maximum emoji version for search results
     * @param categories the categories to search
     * @returns a Promise that resolves to the matching EmojiRecords
     */
    searchEmojis(query, customEmojis, emojiVersion, categories) {
        return __awaiter(this, void 0, void 0, function* () {
            const results = [];
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction('emoji', 'readonly');
                const emojiStore = transaction.objectStore('emoji');
                const request = emojiStore.openCursor();
                request.addEventListener('success', (event) => {
                    var _a;
                    const cursor = (_a = event.target) === null || _a === void 0 ? void 0 : _a.result;
                    if (!cursor) {
                        return resolve([
                            // matching emojis from the database
                            ...applyRules(results, emojiVersion),
                            // matching custom emojis
                            ...customEmojis.filter(emoji => queryMatches(emoji, query))
                        ]);
                    }
                    const emoji = cursor.value;
                    if (queryMatches(emoji, query, categories) && emoji.version <= emojiVersion) {
                        results.push(getEmojiRecord(emoji));
                    }
                    cursor.continue();
                });
                request.addEventListener('error', (error) => {
                    reject(error);
                });
            });
        });
    }
    /**
     * Waits for a request to complete.
     *
     * @param request the request
     * @returns a Promise that resolves when the request succeeds, or rejects if it fails
     */
    waitForRequest(request) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                request.onsuccess = resolve;
                request.onerror = reject;
            });
        });
    }
    /**
     * Wraps an operation in an IndexedDB transaction.
     *
     * @param storeName the data store(s) to use
     * @param mode the transaction mode
     * @param callback a callback containing the work to do in the transaction
     * @returns a Promise that resolves when the transaction completes, or rejects if it fails
     */
    withTransaction(storeName, mode = 'readwrite', callback) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, mode);
            transaction.oncomplete = resolve;
            transaction.onerror = reject;
            callback(transaction);
        });
    }
    /**
     * Removes all entries from one or more stores.
     * @param storeNames the stores to clear
     * @return a Promise that resolves when the clear is complete
     */
    removeAllObjects(...storeNames) {
        return __awaiter(this, void 0, void 0, function* () {
            const transaction = this.db.transaction(storeNames, 'readwrite');
            const stores = storeNames.map(storeName => transaction.objectStore(storeName));
            yield Promise.all(stores.map(store => this.waitForRequest(store.clear())));
        });
    }
    /**
     * Adds a collection of objects to a data store.
     *
     * @param storeName the store to populate
     * @param objects the objects to add
     * @returns a Promise that resolves when the add is complete, or rejects if it fails
     */
    addObjects(storeName, objects) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.withTransaction(storeName, 'readwrite', transaction => {
                const store = transaction.objectStore(storeName);
                objects.forEach(object => {
                    store.add(object);
                });
            });
        });
    }
}

const defaultOptions = {
    renderer: new NativeRenderer(),
    dataStore: IndexedDbStoreFactory,
    theme: lightTheme,
    animate: true,
    showSearch: true,
    showCategoryTabs: true,
    showVariants: true,
    showRecents: true,
    showPreview: true,
    emojisPerRow: 8,
    visibleRows: 6,
    emojiVersion: 'auto',
    maxRecents: 50,
    i18n: en,
    locale: 'en',
    custom: []
};
function getOptions(options = {}) {
    return Object.assign(Object.assign({}, defaultOptions), options);
}

function initData(options) {
    return initDatabase(options.locale, options.dataStore, options.messages, options.emojiData);
}
let pickerIndex = 0;
function getPickerId() {
    return `picmo-${Date.now()}-${pickerIndex++}`;
}
/**
 * Creates a new emoji picker.
 * @param options The options for the emoji picker.
 * @returns a Promise that resolves to the picker when it is ready.
 */
function createPicker(options) {
    const finalOptions = getOptions(options);
    const customEmojis = ((finalOptions === null || finalOptions === void 0 ? void 0 : finalOptions.custom) || []).map((custom) => (Object.assign(Object.assign({}, custom), { custom: true, tags: ['custom', ...(custom.tags || [])] })));
    const events = new AppEvents();
    const emojiDataPromise = initData(finalOptions);
    const i18n = new Bundle(finalOptions.i18n);
    emojiDataPromise.then(emojiData => {
        events.emit('data:ready', emojiData);
    }).catch(error => {
        events.emit('error', error);
    });
    const viewFactory = new ViewFactory({
        events,
        i18n,
        customEmojis,
        renderer: finalOptions.renderer,
        options: finalOptions,
        emojiData: emojiDataPromise,
        pickerId: getPickerId()
    });
    const picker = viewFactory.create(EmojiPicker);
    picker.renderSync();
    return picker;
}

const instances = {};
function InMemoryStoreFactory(locale) {
    if (!instances[locale]) {
        instances[locale] = new InMemoryStore(locale);
    }
    return instances[locale];
}
InMemoryStoreFactory.deleteDatabase = (locale) => {
    // Not implemented for in memory datastore
};
class InMemoryStore extends DataStore {
    open() {
        return Promise.resolve();
    }
    delete() {
        return Promise.resolve();
    }
    close() {
        // Not implemented for in memory datastore
    }
    isPopulated() {
        return Promise.resolve(false);
    }
    getEmojiCount() {
        return Promise.resolve(this.emojis.length);
    }
    getEtags() {
        // Not implemented for in memory datastore
        return Promise.resolve({ foo: 'bar' });
    }
    getHash() {
        // Not implemented for in memory datastore
        return Promise.resolve('');
    }
    populate(options) {
        this.categories = options.groups;
        this.emojis = options.emojis;
        return Promise.resolve();
    }
    getCategories(options) {
        var _a;
        let categories = this.categories.filter(category => category.key !== 'component');
        if (options.showRecents) {
            categories.unshift({ key: 'recents', order: -1 });
        }
        if ((_a = options.custom) === null || _a === void 0 ? void 0 : _a.length) {
            categories.push({ key: 'custom', order: 10 });
        }
        if (options.categories) {
            const includeList = options.categories;
            categories = categories.filter(category => includeList.includes(category.key));
            categories.sort((a, b) => includeList.indexOf(a.key) - includeList.indexOf(b.key));
        }
        else {
            categories.sort((a, b) => a.order - b.order);
        }
        return Promise.resolve(categories);
    }
    getEmojis(category, emojiVersion) {
        const emojiResults = this.emojis
            .filter(emoji => emoji.group === category.order)
            .filter((e) => e.version <= emojiVersion)
            .sort((a, b) => {
            if (a.order != null && b.order != null) {
                return a.order - b.order;
            }
            return 0;
        }).map(getEmojiRecord);
        return Promise.resolve(applyRules(emojiResults, emojiVersion));
    }
    searchEmojis(query, customEmojis, emojiVersion, categories) {
        const matchingEmojis = this.emojis.filter(emoji => queryMatches(emoji, query, categories)).map(getEmojiRecord);
        const matchingCustom = customEmojis.filter(emoji => queryMatches(emoji, query, categories));
        const results = [
            ...applyRules(matchingEmojis, emojiVersion),
            ...matchingCustom
        ];
        return Promise.resolve(results);
    }
    setMeta(meta) {
        this.meta = meta;
    }
}

function createDatabase(locale, factory, staticMessages, staticEmojis) {
    return __awaiter(this, void 0, void 0, function* () {
        const database = yield initDatabase(locale, factory, staticMessages, staticEmojis);
        database.close();
    });
}

export { EmojiPicker, Events, FocusTrap, InMemoryStoreFactory, IndexedDbStoreFactory, NativeRenderer, Renderer, animate, autoTheme, caseInsensitiveIncludes, computeHash, createDatabase, createPicker, darkTheme, debounce, deleteDatabase, clear as deleteRecents, en, getEmojiForEvent, getOptions, lightTheme, shouldAnimate, throttle, toElement };
