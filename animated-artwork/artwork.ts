export interface ArtworkQuery {
    title: string;
    artist: string;
    album: string;
}

interface ITunesResult {
    collectionName?: string;
    collectionViewUrl?: string;
}

const cache = new Map<string, Promise<string | null>>();

const normalize = (value: string): string => value.toLowerCase().replace(/\s+-\s+(single|ep)$/, '').replace(/\s*[([][^)\]]*[)\]]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const decodeEntities = (value: string): string => value.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');

async function findAlbumPage(query: ArtworkQuery): Promise<string | null> {
    const params = new URLSearchParams({
        country: 'us',
        media: 'music',
        entity: 'song',
        limit: '10',
        term: `${query.title} ${query.artist}`
    });

    const response = await fetch(`https://itunes.apple.com/search?${params}`);
    if (!response.ok) throw new Error(`iTunes search HTTP ${response.status}`);

    const json = await response.json() as { results?: ITunesResult[] };
    const results = (json.results ?? []).filter(result => result.collectionViewUrl);
    if (results.length === 0) return null;

    const album = normalize(query.album);
    const match = results.find(result => normalize(result.collectionName ?? '') === album)
        ?? results.find(result => {
            const name = normalize(result.collectionName ?? '');
            return name.length > 0 && (name.startsWith(album) || album.startsWith(name));
        })
        ?? results[0];

    return match.collectionViewUrl ?? null;
}

async function lookup(query: ArtworkQuery): Promise<string | null> {
    const page = await findAlbumPage(query);
    if (!page) return null;

    const response = await fetch(page);
    if (!response.ok) throw new Error(`Apple Music HTTP ${response.status}`);

    const html = await response.text();
    const video = /<amp-ambient-video\b[^>]*?\ssrc="([^"]+)"/.exec(html);

    return video ? decodeEntities(video[1]) : null;
}

export function findAnimatedArtwork(query: ArtworkQuery): Promise<string | null> {
    const key = `${normalize(query.album)}\u0000${normalize(query.artist)}`;

    let result = cache.get(key);
    if (!result) {
        result = lookup(query);
        cache.set(key, result);

        result.catch(() => cache.delete(key));
    }

    return result;
}