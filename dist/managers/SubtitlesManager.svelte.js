import { EventManager } from './EventManager.js';
import { normalizeSubtitle } from '../adapters/subtitleHelpers.js';
import { SubtitleWithCompactWordsShape } from '..';
import { get, omit } from 'lodash-es';
import { v4 as uuidv4 } from 'uuid';
// Default settings
const DEFAULT_SETTINGS = {
    punctuation: true,
    mergeGap: 0.3
};
// Helper functions for word timing validation and adjustment
function splitTextIntoWords(text) {
    return text.split(/\s+/).filter((word) => word.trim() !== '');
}
function generateWordsFromText(text, startTime, endTime) {
    const words = splitTextIntoWords(text);
    if (words.length === 0)
        return [];
    const totalChars = words.reduce((sum, word) => sum + word.length, 0);
    const duration = endTime - startTime;
    const timePerChar = duration / totalChars;
    let currentTime = startTime;
    return words.map((word) => {
        const wordDuration = word.length * timePerChar;
        const wordStart = currentTime;
        const wordEnd = currentTime + wordDuration;
        currentTime = wordEnd;
        return [
            word,
            parseFloat(wordStart.toFixed(6)),
            parseFloat(wordEnd.toFixed(6))
        ];
    });
}
function validateAndAdjustWordTiming(originalWords, text, startTime, endTime) {
    // If no words provided, generate from text
    if (!originalWords || originalWords.length === 0) {
        return generateWordsFromText(text, startTime, endTime);
    }
    // Check if words match the text
    const textWords = splitTextIntoWords(text);
    const wordTexts = originalWords.map((w) => w[0]);
    // If text doesn't match, fall back to character-based distribution
    if (textWords.length !== wordTexts.length ||
        !textWords.every((word, i) => word === wordTexts[i])) {
        return generateWordsFromText(text, startTime, endTime);
    }
    // Check timing boundaries
    const firstWordStart = originalWords[0]?.[1] ?? startTime;
    const lastWordEnd = originalWords[originalWords.length - 1]?.[2] ?? endTime;
    // If timing fits perfectly within bounds, use original
    if (firstWordStart >= startTime && lastWordEnd <= endTime) {
        // Check if words cover the full duration, if not extend last word
        if (lastWordEnd < endTime) {
            const adjustedWords = [...originalWords];
            const lastIndex = adjustedWords.length - 1;
            const lastWord = adjustedWords[lastIndex];
            adjustedWords[lastIndex] = [
                lastWord[0],
                lastWord[1],
                endTime,
                ...(lastWord.length > 3 ? [lastWord[3]] : [])
            ];
            return adjustedWords;
        }
        return originalWords;
    }
    // Need to adjust timing - compress/shift to fit within bounds
    const originalDuration = lastWordEnd - firstWordStart;
    const targetDuration = endTime - startTime;
    if (originalDuration <= 0) {
        // Fallback if timing is invalid
        return generateWordsFromText(text, startTime, endTime);
    }
    // Calculate compression ratio and offset
    const compressionRatio = targetDuration / originalDuration;
    const timeOffset = startTime - firstWordStart;
    return originalWords.map((word) => {
        const [text, originalStart, originalEnd, ...metadata] = word;
        // Apply offset and compression
        const adjustedStart = startTime + (originalStart - firstWordStart) * compressionRatio;
        const adjustedEnd = startTime + (originalEnd - firstWordStart) * compressionRatio;
        const result = [
            text,
            parseFloat(adjustedStart.toFixed(6)),
            parseFloat(adjustedEnd.toFixed(6))
        ];
        // Preserve metadata if it exists
        if (metadata.length > 0 && metadata[0] !== undefined && metadata[0] !== null) {
            result.push(metadata[0]);
        }
        return result;
    });
}
// Natural, word-safe splitting helper: prefers punctuation/space boundaries and never splits inside a word
function findNaturalSplitIndex(text, targetChars, tolerance = 12) {
    const length = text.length;
    if (length <= targetChars)
        return -1;
    const windowStart = Math.max(1, targetChars - tolerance);
    const windowEnd = Math.min(length - 1, targetChars + tolerance);
    const strong = new Set(['.', '!', '?']);
    const medium = new Set([',', ';', ':']);
    const advanceAfterBreak = (i) => {
        let j = i + 1;
        while (j < length && text[j] === ' ')
            j++;
        return j;
    };
    const isWordChar = (ch) => !!ch && /[\p{L}\p{N}_]/u.test(ch);
    const punctuationOnly = (s) => /^[\s,.!?:;]+$/.test(s);
    const validSplit = (pos) => {
        if (pos <= 0 || pos >= length)
            return false;
        // never split inside a word
        if (isWordChar(text[pos - 1]) && isWordChar(text[pos]))
            return false;
        const first = text.slice(0, pos).trim();
        const second = text.slice(pos).trim();
        if (first.length === 0 || second.length === 0)
            return false;
        // avoid creating punctuation-only segments
        if (punctuationOnly(first) || punctuationOnly(second))
            return false;
        // avoid starting next with punctuation when possible
        if (/^[,.!?:;]/.test(second))
            return false;
        return true;
    };
    // 1) Strong punctuation, search backward then forward
    for (let i = Math.min(targetChars, windowEnd); i >= windowStart; i--) {
        if (strong.has(text[i])) {
            const splitAt = advanceAfterBreak(i);
            if (validSplit(splitAt))
                return splitAt;
        }
    }
    for (let i = Math.max(targetChars + 1, windowStart); i <= windowEnd; i++) {
        if (strong.has(text[i])) {
            const splitAt = advanceAfterBreak(i);
            if (validSplit(splitAt))
                return splitAt;
        }
    }
    // 2) Medium punctuation, search backward then forward
    for (let i = Math.min(targetChars, windowEnd); i >= windowStart; i--) {
        if (medium.has(text[i])) {
            const splitAt = advanceAfterBreak(i);
            if (validSplit(splitAt))
                return splitAt;
        }
    }
    for (let i = Math.max(targetChars + 1, windowStart); i <= windowEnd; i++) {
        if (medium.has(text[i])) {
            const splitAt = advanceAfterBreak(i);
            if (validSplit(splitAt))
                return splitAt;
        }
    }
    // 3) Whitespace, prefer splitting after a space
    for (let i = Math.min(targetChars, windowEnd); i >= windowStart; i--) {
        if (text[i] === ' ') {
            const splitAt = i + 1; // next non-space is handled by advance per earlier cases
            if (validSplit(splitAt))
                return splitAt;
        }
    }
    for (let i = Math.max(targetChars + 1, windowStart); i <= windowEnd; i++) {
        if (text[i] === ' ') {
            const splitAt = i + 1;
            if (validSplit(splitAt))
                return splitAt;
        }
    }
    // 4) Wider search for nearest whitespace anywhere in the string
    for (let i = targetChars; i >= 1; i--) {
        if (text[i - 1] === ' ' && validSplit(i))
            return i;
    }
    for (let i = targetChars + 1; i < length; i++) {
        if (text[i - 1] === ' ' && validSplit(i))
            return i;
    }
    // If no safe boundary exists (e.g., single long word), do not split
    return -1;
}
function buildSubtitlesManager(timeManager, eventManager, sceneData, subtitles) {
    // Source of truth - assetId -> lang -> id -> subtitle
    let index = $state({});
    // Settings state
    const sceneSubtitlesSettings = get(sceneData, 'settings.subtitles', {});
    let settings = $state({ ...DEFAULT_SETTINGS, ...sceneSubtitlesSettings });
    const configuredMergeGap = typeof settings?.mergeGap === 'number' ? settings.mergeGap : (DEFAULT_SETTINGS.mergeGap ?? 0);
    // Cache for validated subtitle IDs - tracks which subtitles have clean/validated words
    // This optimization prevents expensive word validation on every reactive update.
    // When a subtitle is modified (text, timing, split, merge), it's marked dirty.
    // The derived subtitlesData block only validates dirty subtitles, skipping clean ones.
    // This reduces a 50ms+ operation to <1ms for most subtitle edits.
    let validatedSubtitles = new Set();
    // Cache for validated subtitle collections per asset/language
    // Key format: "assetId:lang"
    // This prevents recalculating unchanged languages when editing a single language
    let validatedCollections = new Map();
    function getSubtitlesCharactersList() {
        // loop all subtitles in index
        let charactersList = [];
        for (const [assetId, assetIndex] of Object.entries(index)) {
            for (const [lang, langIndex] of Object.entries(assetIndex)) {
                for (const [subtitleId, subtitle] of Object.entries(langIndex)) {
                    const text = subtitle.text;
                    const characters = text.split('');
                    if (characters && characters.length > 0) {
                        for (const char of characters) {
                            if (!charactersList.includes(char)) {
                                charactersList.push(char);
                            }
                        }
                    }
                }
            }
        }
        // remove duplicates
        charactersList = [...new Set(charactersList)];
        return charactersList;
    }
    // Mark subtitle as dirty (needs word validation)
    function markSubtitleDirty(subtitleId) {
        validatedSubtitles.delete(subtitleId);
    }
    function markAllSubtitlesDirty() {
        validatedSubtitles.clear();
    }
    // Mark subtitle as clean (words are validated)
    function markSubtitleClean(subtitleId) {
        validatedSubtitles.add(subtitleId);
    }
    function markAllLanguagesDirty() {
        validatedCollections.clear();
    }
    // Mark an entire asset/language as needing revalidation
    function markLanguageDirty(assetId, lang) {
        const key = `${assetId}:${lang}`;
        validatedCollections.delete(key);
    }
    // Cache validated collection for an asset/language
    function cacheValidatedCollection(assetId, lang, collection) {
        const key = `${assetId}:${lang}`;
        validatedCollections.set(key, collection);
    }
    // Get cached collection if available
    function getCachedCollection(assetId, lang) {
        const key = `${assetId}:${lang}`;
        return validatedCollections.get(key);
    }
    // Derived from index - converts to collection format with word timing validation
    const subtitlesData = $derived.by(() => {
        const result = {};
        for (const [assetId, assetIndex] of Object.entries(index)) {
            const collection = {};
            for (const [lang, langIndex] of Object.entries(assetIndex)) {
                // Check if we have a cached collection for this asset/language
                const cached = getCachedCollection(assetId, lang);
                const subsInOrder = Object.values(langIndex).sort((a, b) => a.start_at - b.start_at);
                // Check if any subtitle in this language is dirty
                const hasDirtySubtitles = subsInOrder.some((sub) => sub && !validatedSubtitles.has(sub.id));
                // Use cached collection if available and no dirty subtitles
                if (cached && !hasDirtySubtitles) {
                    collection[lang] = cached;
                    continue;
                }
                // Need to revalidate this language
                const validatedCollection = subsInOrder.map((subtitle, i) => {
                    // Adjust end time based on mergeGap relative to the next subtitle
                    const next = subsInOrder[i + 1];
                    let endAt = subtitle?.end_at;
                    if (endAt && next) {
                        const gap = next?.start_at - endAt;
                        if (gap >= 0 && gap <= configuredMergeGap) {
                            endAt = next?.start_at;
                        }
                    }
                    // Only validate and adjust word timing if subtitle is dirty (not in cache)
                    let adjustedWords = [];
                    if (subtitle && validatedSubtitles.has(subtitle.id)) {
                        // Subtitle is clean, use existing words
                        adjustedWords = (subtitle?.words || []);
                    }
                    else if (subtitle) {
                        // Subtitle is dirty, validate and cache
                        adjustedWords = validateAndAdjustWordTiming((subtitle.words || []), subtitle.text, subtitle.start_at, endAt);
                        markSubtitleClean(subtitle.id);
                    }
                    // Return subtitle with adjusted words (never modify the source)
                    return {
                        ...subtitle,
                        end_at: endAt,
                        words: adjustedWords
                    };
                });
                // Cache the validated collection
                cacheValidatedCollection(assetId, lang, validatedCollection);
                collection[lang] = validatedCollection;
            }
            result[assetId] = collection;
        }
        return result;
    });
    // Derived from subtitlesData - sorted arrays for time-based lookups
    const sorted = $derived.by(() => {
        const result = {};
        for (const [assetId, collection] of Object.entries(subtitlesData)) {
            const assetSorted = {};
            for (const [lang, subs] of Object.entries(collection)) {
                assetSorted[lang] = [...subs].sort((a, b) => a.start_at - b.start_at);
            }
            result[assetId] = assetSorted;
        }
        return result;
    });
    // Initialize with provided data - do this synchronously before derived computations
    function initializeData() {
        if (Object.keys(subtitles).length > 0) {
            const firstValue = Object.values(subtitles)[0];
            if (Array.isArray(firstValue)) {
                // Legacy format: Record<string, Subtitle[]>
                processLegacySubtitles(subtitles);
            }
            else {
                // New format: Record<string, SubtitleCollection>
                processSubtitleCollections(subtitles);
            }
        }
    }
    // Initialize immediately
    initializeData();
    // Process subtitles from scene data assets (async)
    initializeSceneAssetSubtitles(sceneData);
    function recomputeIndex() {
        const newIndex = {};
        for (const [assetId, assetIndex] of Object.entries(index)) {
            const newAssetIndex = {};
            for (const [lang, langIndex] of Object.entries(assetIndex)) {
                // Get current subtitles and sort them by start_at
                const subs = Object.values(langIndex).sort((a, b) => a.start_at - b.start_at);
                // Create new langIndex with insertion order matching sorted order
                const newLangIndex = {};
                for (const sub of subs) {
                    newLangIndex[sub.id] = sub;
                }
                newAssetIndex[lang] = newLangIndex;
            }
            newIndex[assetId] = newAssetIndex;
        }
        // Assign the new index to trigger reactivity
        index = newIndex;
    }
    // Optimized version that only recomputes a specific asset/language
    function recomputeIndexForLanguage(assetId, lang) {
        const assetIndex = index[assetId];
        if (!assetIndex)
            return;
        const langIndex = assetIndex[lang];
        if (!langIndex)
            return;
        // Get current subtitles and sort them by start_at
        const subs = Object.values(langIndex).sort((a, b) => a.start_at - b.start_at);
        // Create new langIndex with insertion order matching sorted order
        const newLangIndex = {};
        for (const sub of subs) {
            newLangIndex[sub.id] = sub;
        }
        // Update only the affected language in the index
        index = {
            ...index,
            [assetId]: {
                ...assetIndex,
                [lang]: newLangIndex
            }
        };
    }
    function processSubtitleCollections(collections) {
        const newIndex = {};
        for (const [assetId, collection] of Object.entries(collections)) {
            const assetIndex = {};
            for (const [lang, subs] of Object.entries(collection)) {
                const langIndex = {};
                for (const sub of subs) {
                    langIndex[sub.id] = normalizeSubtitle(sub);
                }
                assetIndex[lang] = langIndex;
            }
            newIndex[assetId] = assetIndex;
        }
        // Assign the new index to trigger reactivity
        index = newIndex;
    }
    function processLegacySubtitles(legacySubtitles) {
        // Group by assetId, handling both assetId and assetId-languageCode patterns
        const assetGroups = {};
        for (const [key, subtitles] of Object.entries(legacySubtitles)) {
            let assetId;
            let languageCode;
            // Check if key contains language code (assetId-languageCode pattern)
            const dashIndex = key.lastIndexOf('-');
            if (dashIndex > 0 && dashIndex < key.length - 1) {
                // Potential assetId-languageCode format
                assetId = key.substring(0, dashIndex);
                languageCode = key.substring(dashIndex + 1);
            }
            else {
                // Plain assetId format
                assetId = key;
                languageCode = 'default';
            }
            // Group subtitles by assetId
            if (!assetGroups[assetId]) {
                assetGroups[assetId] = {};
            }
            assetGroups[assetId][languageCode] = subtitles.map((sub) => normalizeSubtitle(sub));
        }
        // Create new index and populate it
        const newIndex = {};
        for (const [assetId, languageGroups] of Object.entries(assetGroups)) {
            const assetIndex = {};
            for (const [lang, subs] of Object.entries(languageGroups)) {
                const langIndex = {};
                for (const sub of subs) {
                    if (sub && sub.id) {
                        langIndex[sub.id] = sub;
                    }
                }
                assetIndex[lang] = langIndex;
            }
            newIndex[assetId] = assetIndex;
        }
        // Assign the new index to trigger reactivity
        index = newIndex;
    }
    function initializeSceneAssetSubtitles(sceneData) {
        // Process async without blocking constructor
        processSceneAssetSubtitles(sceneData).catch((error) => {
            console.error('SubtitlesManager: Error processing scene asset subtitles:', error);
        });
    }
    async function processSceneAssetSubtitles(sceneData) {
        for (const asset of sceneData.assets || []) {
            if (asset.subtitles && asset.subtitles.length > 0) {
                const assetId = asset.id;
                // Prepare language groups for this asset
                const languageGroups = {};
                for (const subtitleEntry of asset.subtitles) {
                    if (subtitleEntry.url) {
                        // Handle URL-based subtitles - fetch from URL and process
                        const fetchedSubtitles = await fetchSubtitlesFromUrl(subtitleEntry.url);
                        if (fetchedSubtitles) {
                            const languageCode = subtitleEntry.language_code || 'default';
                            languageGroups[languageCode] = fetchedSubtitles;
                        }
                        continue;
                    }
                    if (subtitleEntry.subtitles) {
                        const languageCode = subtitleEntry.language_code || 'default';
                        languageGroups[languageCode] = subtitleEntry.subtitles.map((sub) => normalizeSubtitle(sub));
                    }
                }
                // If we have subtitle data, replace existing collection
                if (Object.keys(languageGroups).length > 0) {
                    // Check if subtitles already exist for this asset and warn about replacement
                    const existingIndex = index[assetId];
                    if (existingIndex && Object.keys(existingIndex).length > 0) {
                        console.warn(`SubtitlesManager: Replacing existing subtitles for asset ${assetId} with scene data subtitles`);
                    }
                    const assetIndex = {};
                    for (const [lang, subs] of Object.entries(languageGroups)) {
                        const langIndex = {};
                        for (const sub of subs) {
                            langIndex[sub.id] = sub;
                        }
                        assetIndex[lang] = langIndex;
                    }
                    index = {
                        ...index,
                        [assetId]: assetIndex
                    };
                    // Emit event for async updates
                    eventManager.emit('subtitleschange');
                    recomputeIndex();
                }
            }
        }
    }
    async function fetchSubtitlesFromUrl(url) {
        try {
            const response = await fetch(url);
            // Skip if not successful (404, error, etc.)
            if (!response.ok) {
                console.warn(`SubtitlesManager: Failed to fetch subtitles from ${url}: ${response.status} ${response.statusText}`);
                return null;
            }
            const data = await response.json();
            // Validate that the data matches the expected Subtitle[] format
            if (!isValidSubtitlesArray(data)) {
                console.warn(`SubtitlesManager: Invalid subtitle format from ${url}, skipping`);
                return null;
            }
            return data;
        }
        catch (error) {
            console.warn(`SubtitlesManager: Error fetching subtitles from ${url}:`, error);
            return null;
        }
    }
    function isValidSubtitlesArray(data) {
        // Check if it's an array
        if (!Array.isArray(data)) {
            return false;
        }
        // Check if each item has the required Subtitle properties
        return data.every((item) => {
            const result = SubtitleWithCompactWordsShape.safeParse(item);
            if (!result.success) {
                console.warn(`SubtitlesManager: Invalid subtitle format, skipping`);
                return false;
            }
            return true;
        });
    }
    function getDefaultLanguage(assetId) {
        return 'default'; // or logic to find first available
    }
    // Public interface
    return {
        get data() {
            return subtitlesData;
        },
        get settings() {
            return { ...settings };
        },
        getSubtitlesCharactersList() {
            return getSubtitlesCharactersList();
        },
        updateSettings(newSettings) {
            settings = { ...settings, ...newSettings };
            eventManager.emit('subtitlessettingschange');
        },
        getAssetSubtitlesForSceneData(assetId) {
            const collection = subtitlesData[assetId];
            if (!collection) {
                return [];
            }
            const result = [];
            for (const [languageCode, subtitles] of Object.entries(collection)) {
                result.push({
                    language_code: languageCode,
                    subtitles: subtitles
                });
            }
            return result;
        },
        getAssetSubtitles(assetId) {
            if (!subtitlesData[assetId]) {
                console.warn('-- subtitlesData does not have assetId', assetId, subtitlesData, index, subtitles);
            }
            return subtitlesData[assetId] || {};
        },
        getText(assetId, language = '') {
            const lang = language || getDefaultLanguage(assetId);
            const collection = subtitlesData[assetId];
            if (!collection || !collection[lang]) {
                return '';
            }
            const subtitles = collection[lang];
            if (subtitles.length === 0) {
                return '';
            }
            // Return all subtitle texts joined with spaces
            return subtitles
                .map((sub) => sub.text || '')
                .join(' ')
                .trim();
        },
        setAssetSubtitles(assetId, subtitles) {
            const assetIndex = {};
            const langIndex = {};
            for (const sub of subtitles) {
                langIndex[sub.id] = sub;
            }
            assetIndex['default'] = langIndex;
            index = {
                ...index,
                [assetId]: assetIndex
            };
            recomputeIndex();
            markAllSubtitlesDirty();
            markAllLanguagesDirty();
            eventManager.emit('subtitleschange');
        },
        replaceCollection(assetId, newCollection, language = '') {
            const assetIndex = {};
            for (const [lang, subs] of Object.entries(newCollection)) {
                const langIndex = {};
                for (const sub of subs) {
                    langIndex[sub.id] = sub;
                }
                assetIndex[lang] = langIndex;
            }
            index = {
                ...index,
                [assetId]: assetIndex
            };
            recomputeIndex();
            markAllSubtitlesDirty();
            markAllLanguagesDirty();
            eventManager.emit('subtitleschange');
        },
        // Split all subtitles in an asset/language to be near maxChars, using natural breakpoints.
        splitByChars(assetId, language = '', maxChars) {
            const lang = language || getDefaultLanguage(assetId);
            if (!assetId || maxChars <= 0)
                return;
            let list = sorted[assetId]?.[lang] || [];
            if (!list || list.length === 0)
                return;
            const maxOps = 2000;
            let ops = 0;
            // First pass: split long subtitles
            for (let i = 0; i < list.length; i++) {
                let sub = list[i];
                if (!sub || typeof sub.text !== 'string')
                    continue;
                while (sub.text.length > maxChars) {
                    if (++ops > maxOps) {
                        console.warn('SubtitlesManager.splitByChars: aborting due to excessive operations (split)');
                        return;
                    }
                    const tolerance = Math.max(8, Math.floor(maxChars * 0.35));
                    const splitAt = findNaturalSplitIndex(sub.text, maxChars, tolerance);
                    // Guard against pathological cases
                    if (splitAt <= 0 || splitAt >= sub.text.length)
                        break;
                    this.splitSubtitle(assetId, sub.id, lang, splitAt);
                    // Refresh list and current sub reference
                    list = sorted[assetId]?.[lang] || [];
                    sub = list[i]; // original id keeps first part, second is inserted after
                    if (!sub)
                        break;
                }
            }
            // Second pass: merge adjacent short subtitles when reasonable
            list = sorted[assetId]?.[lang] || [];
            for (let i = 0; i < list.length; i++) {
                let sub = list[i];
                if (!sub)
                    continue;
                const trimmedLen = (sub.text || '').trim().length;
                if (trimmedLen === 0)
                    continue;
                const threshold = Math.max(4, Math.floor(maxChars * 0.45));
                if (trimmedLen < threshold) {
                    const next = list[i + 1];
                    if (next) {
                        const combinedLen = (sub.text.trim() + ' ' + (next.text || '').trim()).length;
                        const gap = next.start_at - sub.end_at;
                        // allow slight overflow and require small temporal gap
                        if (combinedLen <= Math.round(maxChars * 1.15) && gap <= 0.7) {
                            if (++ops > maxOps) {
                                console.warn('SubtitlesManager.splitByChars: aborting due to excessive operations (merge)');
                                return;
                            }
                            this.mergeSubtitles(assetId, sub.id, lang, 'start');
                            // After merge, refresh and re-evaluate current index
                            list = sorted[assetId]?.[lang] || [];
                            i = Math.max(i - 1, -1); // -1 because loop will i++
                            continue;
                        }
                    }
                }
            }
            markAllSubtitlesDirty();
            markLanguageDirty(assetId, lang);
        },
        updateSubtitleProps(assetId, subtitleId, props, language = '') {
            const lang = language || getDefaultLanguage(assetId);
            const sub = index[assetId]?.[lang]?.[subtitleId];
            if (!sub)
                return;
            const updates = omit(props, ['id', 'text', 'words', 'start_at', 'end_at']);
            const updatedSub = {
                ...sub,
                ...updates
            };
            index = {
                ...index,
                [assetId]: {
                    ...index[assetId],
                    [lang]: {
                        ...index[assetId][lang],
                        [subtitleId]: updatedSub
                    }
                }
            };
            markSubtitleDirty(subtitleId);
            markLanguageDirty(assetId, lang);
            eventManager.emit('subtitlechange', {
                assetId,
                language,
                subtitleId,
                subtitle: updatedSub
            });
            eventManager.emit('subtitleschange');
        },
        updateSubtitleText(assetId, subtitleId, newText, language = '') {
            const lang = language || getDefaultLanguage(assetId);
            const sub = index[assetId]?.[lang]?.[subtitleId];
            if (!sub)
                return;
            const oldWords = (sub.words || []);
            // Filter out empty words from split - use safe filtering
            const newWords = newText.split(' ').filter((word) => word.trim() !== '');
            let newWordsArray;
            // Handle empty text case
            if (newText.trim() === '' || newWords.length === 0) {
                newWordsArray = [];
            }
            else if (newWords.length === oldWords.length) {
                // Preserve timings with safe tuple access
                newWordsArray = newWords.map((word, i) => {
                    const oldWord = oldWords[i];
                    if (!oldWord) {
                        // Fallback if old word doesn't exist
                        return [word, sub.start_at, sub.end_at];
                    }
                    // Safely access tuple elements
                    const startTime = oldWord[1] ?? sub.start_at;
                    const endTime = oldWord[2] ?? sub.end_at;
                    const metadata = oldWord.length > 3 ? oldWord[3] : undefined;
                    // Build tuple with proper type safety
                    const tuple = [word, startTime, endTime];
                    if (metadata !== undefined && metadata !== null) {
                        tuple.push(metadata);
                    }
                    return tuple;
                });
            }
            else {
                // Redistribute proportionally
                const duration = sub.end_at - sub.start_at;
                const step = duration / newWords.length;
                newWordsArray = newWords.map((word, i) => [
                    word,
                    parseFloat((sub.start_at + i * step).toFixed(6)),
                    parseFloat((sub.start_at + (i + 1) * step).toFixed(6))
                ]);
            }
            // Create a NEW object - this is the key for reactivity!
            const updatedSub = {
                ...sub,
                text: newText,
                words: newWordsArray
            };
            // Mark as dirty since words changed
            markSubtitleDirty(subtitleId);
            markLanguageDirty(assetId, lang);
            // Update the subtitle - this will trigger reactivity
            index = {
                ...index,
                [assetId]: {
                    ...index[assetId],
                    [lang]: {
                        ...index[assetId][lang],
                        [subtitleId]: updatedSub
                    }
                }
            };
            eventManager.emit('subtitleschange');
            eventManager.emit('subtitlechange', {
                assetId,
                language,
                subtitleId,
                subtitle: updatedSub
            });
        },
        getSubtitle(assetId, timeOrId, language = '') {
            const lang = language || getDefaultLanguage(assetId);
            const langIndex = index[assetId]?.[lang];
            if (typeof timeOrId === 'string') {
                return langIndex?.[timeOrId];
            }
            else {
                const sortedSubs = sorted[assetId]?.[lang] || [];
                // Binary search for time
                let low = 0, high = sortedSubs.length - 1;
                while (low <= high) {
                    const mid = Math.floor((low + high) / 2);
                    const sub = sortedSubs[mid];
                    if (timeOrId >= sub.start_at && timeOrId <= sub.end_at)
                        return sub;
                    if (timeOrId < sub.start_at)
                        high = mid - 1;
                    else
                        low = mid + 1;
                }
                return undefined;
            }
        },
        setStart(assetId, subtitleId, start, language = '') {
            const lang = language || getDefaultLanguage(assetId);
            const sub = this.getSubtitle(assetId, subtitleId, language);
            if (sub) {
                const updatedSub = {
                    ...sub,
                    start_at: timeManager.transformTime(start)
                };
                // Mark as dirty since timing changed (might affect word validation)
                markSubtitleDirty(subtitleId);
                markLanguageDirty(assetId, lang);
                const assetIndex = index[assetId];
                if (assetIndex) {
                    const newLangIndex = { ...assetIndex[lang] };
                    newLangIndex[subtitleId] = updatedSub;
                    index = {
                        ...index,
                        [assetId]: {
                            ...assetIndex,
                            [lang]: newLangIndex
                        }
                    };
                    recomputeIndexForLanguage(assetId, lang);
                    eventManager.emit('subtitleschange');
                    eventManager.emit('subtitlechange', {
                        assetId,
                        language,
                        subtitleId,
                        subtitle: updatedSub
                    });
                }
            }
        },
        setEnd(assetId, subtitleId, end, language = '') {
            const lang = language || getDefaultLanguage(assetId);
            const sub = this.getSubtitle(assetId, subtitleId, language);
            if (sub) {
                const updatedSub = {
                    ...sub,
                    end_at: timeManager.transformTime(end)
                };
                // Mark as dirty since timing changed (might affect word validation)
                markSubtitleDirty(subtitleId);
                markLanguageDirty(assetId, lang);
                const assetIndex = index[assetId];
                if (assetIndex) {
                    const newLangIndex = { ...assetIndex[lang] };
                    newLangIndex[subtitleId] = updatedSub;
                    index = {
                        ...index,
                        [assetId]: {
                            ...assetIndex,
                            [lang]: newLangIndex
                        }
                    };
                    recomputeIndexForLanguage(assetId, lang);
                    eventManager.emit('subtitleschange');
                    eventManager.emit('subtitlechange', {
                        assetId,
                        language,
                        subtitleId,
                        subtitle: updatedSub
                    });
                }
            }
        },
        splitSubtitle(assetId, subtitleId, language = '', splitAt) {
            const lang = language || getDefaultLanguage(assetId);
            const sub = this.getSubtitle(assetId, subtitleId, language);
            if (!sub) {
                console.warn(`SubtitlesManager: Subtitle ${subtitleId} not found for asset ${assetId}`);
                return;
            }
            // Ignore split if splitAt is 0 or after the last character
            if (splitAt <= 0 || splitAt >= sub.text.length) {
                console.warn(`SubtitlesManager: Invalid split position ${splitAt} for subtitle with length ${sub.text.length}`);
                return;
            }
            const words = (sub.words || []);
            const totalDuration = sub.end_at - sub.start_at;
            // Calculate text for first and second subtitle early
            const firstText = sub.text.substring(0, splitAt).trim();
            const secondText = sub.text.substring(splitAt).trim();
            // Guard against accidental empty parts early
            if (firstText.length === 0 || secondText.length === 0) {
                console.warn('SubtitlesManager: Skipping split that would create empty text segments');
                return;
            }
            // Calculate timing split point proportionally
            const splitRatio = splitAt / sub.text.length;
            const splitTime = sub.start_at + totalDuration * splitRatio;
            // Find the word boundaries around the split position
            let currentCharPos = 0;
            let splitWordIndex = -1;
            let splitCharInWord = 0;
            // Find which word contains the split position with safe tuple access
            for (let i = 0; i < words.length; i++) {
                const wordTuple = words[i];
                if (!wordTuple || wordTuple.length < 3)
                    continue; // Skip invalid tuples
                const word = wordTuple[0];
                if (typeof word !== 'string')
                    continue; // Skip invalid word text
                const wordLength = word.length;
                if (currentCharPos <= splitAt && splitAt < currentCharPos + wordLength) {
                    splitWordIndex = i;
                    splitCharInWord = splitAt - currentCharPos;
                    break;
                }
                currentCharPos += wordLength + 1; // +1 for space
            }
            // Create words arrays for both subtitles
            let firstWords = [];
            let secondWords = [];
            if (splitWordIndex === -1) {
                // Split at word boundary - simple distribution
                currentCharPos = 0;
                for (let i = 0; i < words.length; i++) {
                    const wordTuple = words[i];
                    if (!wordTuple || wordTuple.length < 3)
                        continue;
                    const word = wordTuple[0];
                    if (typeof word !== 'string')
                        continue;
                    const wordLength = word.length;
                    if (currentCharPos + wordLength <= splitAt) {
                        firstWords.push(wordTuple);
                    }
                    else {
                        secondWords.push(wordTuple);
                    }
                    currentCharPos += wordLength + 1; // +1 for space
                }
            }
            else {
                // Split within a word
                const splitWord = words[splitWordIndex];
                if (!splitWord || splitWord.length < 3) {
                    console.warn('SubtitlesManager: Invalid word tuple for splitting');
                    return;
                }
                const originalWord = splitWord[0];
                const originalStartTime = splitWord[1];
                const originalEndTime = splitWord[2];
                const originalMetadata = splitWord.length > 3 ? splitWord[3] : undefined;
                // Type safety checks
                if (typeof originalWord !== 'string' ||
                    typeof originalStartTime !== 'number' ||
                    typeof originalEndTime !== 'number') {
                    console.warn('SubtitlesManager: Invalid word tuple data types for splitting');
                    return;
                }
                // Split the word timing proportionally
                const wordDuration = originalEndTime - originalStartTime;
                const wordSplitRatio = splitCharInWord / originalWord.length;
                const wordSplitTime = originalStartTime + wordDuration * wordSplitRatio;
                // Create split word parts
                const firstWordPart = [
                    originalWord.substring(0, splitCharInWord),
                    originalStartTime,
                    wordSplitTime
                ];
                const secondWordPart = [
                    originalWord.substring(splitCharInWord),
                    wordSplitTime,
                    originalEndTime
                ];
                // Add metadata if it exists
                if (originalMetadata !== undefined && originalMetadata !== null) {
                    firstWordPart.push(originalMetadata);
                    secondWordPart.push(originalMetadata);
                }
                // Distribute words to respective subtitles - use simple loops
                firstWords = words.slice(0, splitWordIndex);
                firstWords.push(firstWordPart);
                secondWords.push(secondWordPart);
                if (splitWordIndex + 1 < words.length) {
                    secondWords.push(...words.slice(splitWordIndex + 1));
                }
            }
            // Create new subtitle ID for the second part
            const newSubtitleId = uuidv4();
            // Create the subtitles
            const updatedSub = {
                ...sub,
                text: firstText,
                end_at: splitTime,
                words: firstWords
            };
            const newSub = {
                id: newSubtitleId,
                text: secondText,
                start_at: splitTime,
                end_at: sub.end_at,
                words: secondWords
            };
            // Mark both subtitles as dirty since we manually created their words
            markSubtitleDirty(subtitleId);
            markSubtitleDirty(newSubtitleId);
            markLanguageDirty(assetId, lang);
            // Update the index - build new langIndex directly
            const assetIndex = index[assetId];
            const langIndex = assetIndex?.[lang];
            if (langIndex) {
                const newLangIndex = { ...langIndex };
                newLangIndex[subtitleId] = updatedSub;
                newLangIndex[newSubtitleId] = newSub;
                index = {
                    ...index,
                    [assetId]: {
                        ...assetIndex,
                        [lang]: newLangIndex
                    }
                };
                // Use optimized recompute for just this language
                recomputeIndexForLanguage(assetId, lang);
                // Emit events
                eventManager.emit('subtitleschange');
                eventManager.emit('subtitlesplit', {
                    assetId,
                    language,
                    subtitleId,
                    subtitle: updatedSub,
                    newSubtitle: newSub
                });
            }
        },
        mergeSubtitles(assetId, sourceSubtitleId, language = '', mergeTo) {
            const lang = language || getDefaultLanguage(assetId);
            const sourceSub = this.getSubtitle(assetId, sourceSubtitleId, language);
            if (!sourceSub) {
                console.warn(`SubtitlesManager: Subtitle ${sourceSubtitleId} not found for asset ${assetId}`);
                return;
            }
            const sortedSubs = sorted[assetId]?.[lang] || [];
            const sourceIndex = sortedSubs.findIndex((sub) => sub.id === sourceSubtitleId);
            if (sourceIndex === -1) {
                console.warn(`SubtitlesManager: Source subtitle ${sourceSubtitleId} not found in sorted list`);
                return;
            }
            let targetSub;
            let subtitleToDeleteId;
            let survivingSubtitle;
            if (mergeTo === 'start') {
                // The source subtitle merges into the NEXT one. The next one survives.
                if (sourceIndex >= sortedSubs.length - 1) {
                    console.warn(`SubtitlesManager: No next subtitle to merge with for ${sourceSubtitleId}`);
                    return;
                }
                targetSub = sortedSubs[sourceIndex + 1];
                subtitleToDeleteId = sourceSubtitleId;
                survivingSubtitle = {
                    ...targetSub, // The target subtitle survives, keep its ID
                    text: sourceSub.text + ' ' + targetSub.text,
                    start_at: sourceSub.start_at, // Use the start time of the first subtitle
                    // end_at remains targetSub.end_at
                    words: [...(sourceSub.words || []), ...(targetSub.words || [])]
                };
            }
            else {
                // mergeTo === 'end'
                // The source subtitle merges into the PREVIOUS one. The previous one survives.
                if (sourceIndex === 0) {
                    console.warn(`SubtitlesManager: No previous subtitle to merge with for ${sourceSubtitleId}`);
                    return;
                }
                targetSub = sortedSubs[sourceIndex - 1];
                subtitleToDeleteId = sourceSubtitleId;
                survivingSubtitle = {
                    ...targetSub, // The target subtitle survives, keep its ID
                    text: targetSub.text + ' ' + sourceSub.text,
                    // start_at remains targetSub.start_at
                    end_at: sourceSub.end_at, // Use the end time of the last subtitle
                    words: [...(targetSub.words || []), ...(sourceSub.words || [])]
                };
            }
            // --- State Update ---
            const assetIndex = index[assetId];
            const langIndex = assetIndex?.[lang];
            if (langIndex) {
                // Create a new map for the updated language subtitles
                const newLangIndex = { ...langIndex };
                // 1. Update the surviving subtitle with the merged content
                newLangIndex[survivingSubtitle.id] = survivingSubtitle;
                // 2. CRUCIAL: Delete the other subtitle
                delete newLangIndex[subtitleToDeleteId];
                // Mark surviving subtitle as dirty since we merged words
                markSubtitleDirty(survivingSubtitle.id);
                markLanguageDirty(assetId, lang);
                // Update the main index immutably
                index = {
                    ...index,
                    [assetId]: {
                        ...assetIndex,
                        [lang]: newLangIndex
                    }
                };
                recomputeIndexForLanguage(assetId, lang);
                // Emit events
                eventManager.emit('subtitleschange');
                eventManager.emit('subtitlemerge', {
                    assetId,
                    language,
                    targetSubtitle: survivingSubtitle,
                    sourceSubtitle: sourceSub,
                    mergeTo
                });
            }
        },
        addNewSubtitleAfter(assetId, subtitleId, language = '') {
            const lang = language || getDefaultLanguage(assetId);
            const currentSub = this.getSubtitle(assetId, subtitleId, language);
            if (!currentSub) {
                console.warn(`SubtitlesManager: Subtitle ${subtitleId} not found for asset ${assetId}`);
                return;
            }
            const sortedSubs = sorted[assetId]?.[lang] || [];
            const currentIndex = sortedSubs.findIndex((sub) => sub.id === subtitleId);
            if (currentIndex === -1) {
                console.warn(`SubtitlesManager: Subtitle ${subtitleId} not found in sorted list`);
                return;
            }
            let nextStart;
            let isLast = currentIndex === sortedSubs.length - 1;
            if (!isLast) {
                // Get next subtitle's start time
                nextStart = sortedSubs[currentIndex + 1].start_at;
            }
            else {
                // Use scene duration for last subtitle
                nextStart = timeManager.duration; // Assuming sceneData has duration property
                if (nextStart === undefined) {
                    console.warn(`SubtitlesManager: Scene duration not available`);
                    return;
                }
            }
            const gap = nextStart - currentSub.end_at;
            const minGap = 0.2; // Minimum meaningful gap in seconds
            const maxDuration = 5; // Maximum new subtitle duration in seconds
            if (gap <= minGap) {
                console.warn(`SubtitlesManager: Gap too small (${gap}s) to insert new subtitle after ${subtitleId}`);
                return;
            }
            // Calculate new subtitle times
            const newStart = currentSub.end_at;
            const newEnd = Math.min(newStart + maxDuration, nextStart);
            // Create new subtitle
            const newSubtitleId = uuidv4();
            const newSub = {
                id: newSubtitleId,
                text: '', // Empty text for new subtitle
                start_at: newStart,
                end_at: newEnd,
                words: []
            };
            // Add to index
            const assetIndex = index[assetId];
            const langIndex = assetIndex?.[lang];
            if (langIndex) {
                index = {
                    ...index,
                    [assetId]: {
                        ...index[assetId],
                        [lang]: {
                            ...index[assetId][lang],
                            [newSubtitleId]: newSub
                        }
                    }
                };
                // Emit events
                eventManager.emit('subtitleschange');
                eventManager.emit('subtitlechange', {
                    assetId,
                    language,
                    subtitleId: newSubtitleId,
                    subtitle: newSub
                });
            }
        },
        destroy() { }
    };
}
export class SubtitlesManager {
    builder;
    assetId;
    language = 'default';
    constructor(cradle) {
        this.builder = buildSubtitlesManager(cradle.timeManager, cradle.eventManager, cradle.sceneData, cradle.subtitles);
    }
    get data() {
        return this.builder.data;
    }
    get settings() {
        return this.builder.settings;
    }
    setAssetId(assetId) {
        return (this.assetId = assetId);
    }
    setLanguage(language) {
        return (this.language = language);
    }
    getAssetSubtitlesForSceneData(assetId) {
        return this.builder.getAssetSubtitlesForSceneData(assetId);
    }
    getAssetSubtitles(assetId) {
        return this.builder.getAssetSubtitles(assetId);
    }
    setAssetSubtitles(assetId, subtitles) {
        return this.builder.setAssetSubtitles(assetId, subtitles);
    }
    replaceCollection(assetId, newCollection, language = '') {
        return this.builder.replaceCollection(assetId, newCollection, language);
    }
    updateSubtitleText(subtitleId, newText) {
        if (!this.assetId || !this.language) {
            console.warn('SubtitlesManager: Asset ID or language is not set');
            return;
        }
        return this.builder.updateSubtitleText(this.assetId, subtitleId, newText, this.language);
    }
    updateSubtitleProps(subtitleId, props) {
        if (!this.assetId || !this.language) {
            console.warn('SubtitlesManager: Asset ID or language is not set');
            return;
        }
        return this.builder.updateSubtitleProps(this.assetId, subtitleId, props, this.language);
    }
    splitSubtitle(subtitleId, splitAt) {
        if (!this.assetId || !this.language) {
            console.warn('SubtitlesManager: Asset ID or language is not set');
            return;
        }
        return this.builder.splitSubtitle(this.assetId, subtitleId, this.language, splitAt);
    }
    mergeSubtitles(sourceSubtitleId, mergeTo) {
        if (!this.assetId || !this.language) {
            console.warn('SubtitlesManager: Asset ID or language is not set');
            return;
        }
        return this.builder.mergeSubtitles(this.assetId, sourceSubtitleId, this.language, mergeTo);
    }
    getSubtitle(timeOrId) {
        if (!this.assetId || !this.language) {
            console.warn('SubtitlesManager: Asset ID or language is not set');
            return undefined;
        }
        return this.builder.getSubtitle(this.assetId, timeOrId, this.language);
    }
    // this is a convenience method to set the start and end times for a subtitle in a specific asset and language
    // we use it in subtitles timeline so we don't change assetId and language which would cause conflict to subtitles editor lol
    // TODO fix, refactor
    setTimesForSubtitleInAssetAndLanguage(assetId, language, subtitleId, start, end) {
        if (typeof start === 'number') {
            this.builder.setStart(assetId, subtitleId, start, language);
        }
        if (typeof end === 'number') {
            this.builder.setEnd(assetId, subtitleId, end, language);
        }
    }
    setStart(subtitleId, start) {
        if (!this.assetId || !this.language) {
            console.warn('SubtitlesManager: Asset ID or language is not set');
            return;
        }
        return this.builder.setStart(this.assetId, subtitleId, start, this.language);
    }
    setEnd(subtitleId, end) {
        if (!this.assetId || !this.language) {
            console.warn('SubtitlesManager: Asset ID or language is not set');
            return;
        }
        return this.builder.setEnd(this.assetId, subtitleId, end, this.language);
    }
    addNewSubtitleAfter(subtitleId, newText) {
        if (!this.assetId || !this.language) {
            console.warn('SubtitlesManager: Asset ID or language is not set');
            return;
        }
        return this.builder.addNewSubtitleAfter(this.assetId, subtitleId, this.language);
    }
    splitByChars(maxChars) {
        if (!this.assetId || !this.language) {
            console.warn('SubtitlesManager: Asset ID or language is not set');
            return;
        }
        return this.builder.splitByChars(this.assetId, this.language, maxChars);
    }
    getText() {
        if (!this.assetId || !this.language) {
            console.warn('SubtitlesManager: Asset ID or language is not set');
            return;
        }
        return this.builder.getText(this.assetId, this.language);
    }
    getSubtitlesCharactersList() {
        return this.builder.getSubtitlesCharactersList();
    }
    updateSettings(newSettings) {
        return this.builder.updateSettings(newSettings);
    }
    findTextChunkTiming(searchText, options = {}) {
        if (!this.assetId || !this.language) {
            return [];
        }
        const collection = this.data[this.assetId];
        if (!collection || !collection[this.language]) {
            return [];
        }
        const subtitles = collection[this.language];
        const results = [];
        // Normalize search text
        const normalizedSearchText = (options.caseSensitive ? searchText : searchText.toLowerCase()).trim();
        // Return empty array if search text is empty after trimming
        if (normalizedSearchText.length === 0) {
            return [];
        }
        // Build a continuous text stream with timing information
        const textStream = [];
        for (const subtitle of subtitles) {
            // Words are always present after auto-generation, so always use word-level timing
            if (subtitle.words && subtitle.words.length > 0) {
                // Use word-level timing
                for (const word of subtitle.words) {
                    // Handle both compact tuple format [text, start_at, end_at, metadata?] and object format
                    if (Array.isArray(word)) {
                        textStream.push({
                            text: word[0],
                            startTime: word[1],
                            endTime: word[2],
                            subtitleId: subtitle.id
                        });
                    }
                    else {
                        textStream.push({
                            text: word.text,
                            startTime: word.start_at,
                            endTime: word.end_at,
                            subtitleId: subtitle.id
                        });
                    }
                }
            }
            else {
                // Fallback: if somehow no words are present, use subtitle-level timing
                textStream.push({
                    text: subtitle.text,
                    startTime: subtitle.start_at,
                    endTime: subtitle.end_at,
                    subtitleId: subtitle.id
                });
            }
        }
        // Build a continuous text string with timing markers
        const continuousText = [];
        for (let i = 0; i < textStream.length; i++) {
            const item = textStream[i];
            // Add the word characters
            for (let j = 0; j < item.text.length; j++) {
                continuousText.push({
                    char: item.text[j],
                    startTime: item.startTime,
                    endTime: item.endTime,
                    subtitleId: item.subtitleId
                });
            }
            // Add a space after each word (except the very last word)
            if (i < textStream.length - 1) {
                // Add space between words (both within and across subtitles)
                continuousText.push({
                    char: ' ',
                    startTime: item.endTime,
                    endTime: item.endTime,
                    subtitleId: item.subtitleId
                });
            }
        }
        // Convert to string for searching
        const fullText = continuousText.map((item) => item.char).join('');
        const searchPattern = options.caseSensitive
            ? normalizedSearchText
            : normalizedSearchText.toLowerCase();
        const textToSearch = options.caseSensitive ? fullText : fullText.toLowerCase();
        // Find all occurrences of the search text
        let startIndex = 0;
        while (true) {
            const foundIndex = textToSearch.indexOf(searchPattern, startIndex);
            if (foundIndex === -1)
                break;
            // Find the timing information for this match
            const startChar = continuousText[foundIndex];
            const endChar = continuousText[foundIndex + searchPattern.length - 1];
            // Build the matched text from the original (non-lowercased) text
            const matchedText = fullText.substring(foundIndex, foundIndex + searchPattern.length);
            results.push({
                startTime: startChar.startTime,
                endTime: endChar.endTime,
                startSubtitleId: startChar.subtitleId,
                endSubtitleId: endChar.subtitleId,
                matchedText: matchedText
            });
            startIndex = foundIndex + 1;
        }
        return results;
    }
    destroy() {
        return this.builder.destroy();
    }
}
