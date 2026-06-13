// Enriquecimiento del "anthem" (banda sonora) de un arco a partir de su link.
// Spotify expone oEmbed PUBLICO (sin API key ni OAuth): devuelve la caratula
// (thumbnail_url) y un titulo. Suficiente para decorar la tarjeta. Para metadata
// mas rica (artista/album/duracion) haria falta la Spotify Web API con credenciales.

export interface AnthemMeta {
  title?: string;
  coverUrl?: string;
}

export const isSpotifyUrl = (url?: string | null): boolean =>
  !!url && /(^|\.)spotify\.com|spotify:/.test(url);

/**
 * Trae caratula + titulo de un link de Spotify via oEmbed. Falla en silencio
 * (devuelve {}) si no hay red, el link no es de Spotify o la respuesta no sirve.
 */
export const fetchAnthemMeta = async (url: string): Promise<AnthemMeta> => {
  try {
    if (!isSpotifyUrl(url)) return {};
    const res = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`);
    if (!res.ok) return {};
    const j: any = await res.json();
    return { title: j?.title || undefined, coverUrl: j?.thumbnail_url || undefined };
  } catch (e) {
    return {};
  }
};
