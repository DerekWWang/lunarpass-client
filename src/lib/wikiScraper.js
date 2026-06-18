// Scraper + indexer for limbuscompany.wiki.gg character image data.
//
// The wiki runs MediaWiki; its category API lists members, and each character
// may expose SEVERAL sprites (Identities). For the index we want exactly one
// image per character — the character's DEFAULT (base) sprite — and characters
// that have no default sprite are skipped entirely. This module turns those
// responses into a stable, deduplicated index keyed by a character slug, with
// every image URL canonicalized to its full-resolution original.

export const WIKI_BASE_URL = 'https://limbuscompany.wiki.gg';
export const DEFAULT_CHARACTER_CATEGORY = 'Category:Identities';

// Turn a MediaWiki *thumbnail* image URL into the original full-resolution URL,
// dropping any cache-busting query/fragment.
//
//   thumb:    https://host/images/thumb/<File>/<NNN>px-<File>?<hash>
//   original: https://host/images/<File>
//
// Hashed thumb paths (.../images/thumb/a/ab/<File>/<NNN>px-<File>) collapse to
// .../images/a/ab/<File>. Non-thumbnail URLs are returned unchanged except for
// query/fragment removal. Falsy / non-string input is returned as-is.
export function resolveOriginalImageUrl(url) {
  if (!url || typeof url !== 'string') return url;
  let out = url.split('?')[0].split('#')[0];
  const marker = '/images/thumb/';
  const at = out.indexOf(marker);
  if (at !== -1) {
    const prefix = out.slice(0, at) + '/images/';
    const rest = out.slice(at + marker.length);
    const lastSlash = rest.lastIndexOf('/');
    const filePath = lastSlash === -1 ? rest : rest.slice(0, lastSlash);
    out = prefix + filePath;
  }
  return out;
}

// Canonical id for a character name: lowercased, every run of non-alphanumeric
// characters collapsed to a single '-', with leading/trailing '-' trimmed.
//   "Yi Sang"     -> "yi-sang"
//   "Don Quixote" -> "don-quixote"
//   "Hong Lu"     -> "hong-lu"
export function slugify(name) {
  if (!name || typeof name !== 'string') return '';
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Select a character's default sprite URL. A character may expose several sprites
// (Identities); index only the one flagged `default: true`. Returns the URL of
// the first such sprite, or null when the character has no default sprite (or no
// sprites at all).
export function selectDefaultSprite(member) {
  const sprites = member && member.sprites;
  if (!Array.isArray(sprites)) return null;
  for (const sprite of sprites) {
    if (sprite && sprite.default === true && sprite.url) return sprite.url;
  }
  return null;
}

// Parse one page of a category-members API response into { members, continue }.
//   members:  Array<{ name, sprites }>   (one per category member)
//   continue: the next `cmcontinue` token, or null when the listing is complete.
// Tolerates a missing/empty query object.
export function parseCategoryPage(apiResponse) {
  const members = [];
  const raw =
    apiResponse && apiResponse.query && apiResponse.query.categorymembers;
  if (Array.isArray(raw)) {
    for (const m of raw) {
      if (!m) continue;
      members.push({ name: m.title, sprites: m.sprites });
    }
  }
  const cont =
    apiResponse && apiResponse.continue && apiResponse.continue.cmcontinue;
  return { members, continue: cont || null };
}

// Build the action-API URL for a category-members request.
export function buildCategoryUrl(baseUrl, category, cmcontinue) {
  const params = new URLSearchParams({
    action: 'query',
    list: 'categorymembers',
    cmtitle: category,
    cmlimit: '500',
    format: 'json',
  });
  if (cmcontinue) params.set('cmcontinue', cmcontinue);
  return `${baseUrl}/api.php?${params.toString()}`;
}

// Merge scraped members into an index keyed by slug. Each value is
// { name, image }, where `image` is the character's DEFAULT sprite canonicalized
// to full resolution. Characters with a falsy name, an empty slug, or NO default
// sprite are skipped. Within a single call, later entries win on collision.
// Returns a NEW object; neither `existingIndex` nor `members` are mutated.
export function buildImageIndex(members, existingIndex = {}) {
  const index = { ...existingIndex };
  if (!Array.isArray(members)) return index;
  for (const m of members) {
    if (!m || !m.name) continue;
    const url = selectDefaultSprite(m);
    if (!url) continue; // skip characters without a default sprite
    const slug = slugify(m.name);
    if (!slug) continue;
    index[slug] = { name: m.name, image: resolveOriginalImageUrl(url) };
  }
  return index;
}

// Crawl every page of a character category and return the built image index.
// `fetchJson(url)` must resolve to the parsed JSON body. Pagination follows the
// `cmcontinue` token; `maxPages` caps the number of requests. Members from all
// pages are merged (and deduped by slug) into a single index — each character
// contributing only its default sprite.
export async function crawlCharacterImages(fetchJson, options = {}) {
  const {
    category = DEFAULT_CHARACTER_CATEGORY,
    baseUrl = WIKI_BASE_URL,
    maxPages = Infinity,
  } = options;

  let index = {};
  let cont = null;
  let pages = 0;
  do {
    const url = buildCategoryUrl(baseUrl, category, cont);
    const json = await fetchJson(url);
    const { members, continue: next } = parseCategoryPage(json);
    index = buildImageIndex(members, index);
    cont = next;
    pages += 1;
  } while (cont && pages < maxPages);
  return index;
}
