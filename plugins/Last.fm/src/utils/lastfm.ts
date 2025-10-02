// ...existing code...

// Add these methods to the main LastFMClient class body below:
//
//   public async fetchTopArtist(): Promise<{ name: string; url: string; image?: string }> {
//     this.validateSettings();
//     const data = await this.makeRequest({
//       method: "user.gettopartists",
//       user: currentSettings.username,
//       limit: "1",
//     });
//     const artist = data?.topartists?.artist?.[0];
//     if (!artist) throw new Error("No top artist found");
//     return {
//       name: artist.name,
//       url: artist.url,
//       image: artist.image?.find((x: any) => x.size === "large")?.["#text"],
//     };
//   }
//
//   public async fetchTopTrack(): Promise<{ name: string; artist: string; url: string; image?: string }> {
//     this.validateSettings();
//     const data = await this.makeRequest({
//       method: "user.gettoptracks",
//       user: currentSettings.username,
//       limit: "1",
//     });
//     const track = data?.toptracks?.track?.[0];
//     if (!track) throw new Error("No top track found");
//     return {
//       name: track.name,
//       artist: track.artist?.name,
//       url: track.url,
//       image: track.image?.find((x: any) => x.size === "large")?.["#text"],
//     };
//   }
//
//   public async fetchTopAlbum(): Promise<{ name: string; artist: string; url: string; image?: string }> {
//     this.validateSettings();
//     const data = await this.makeRequest({
//       method: "user.gettopalbums",
//       user: currentSettings.username,
//       limit: "1",
//     });
//     const album = data?.topalbums?.album?.[0];
//     if (!album) throw new Error("No top album found");
//     return {
//       name: album.name,
//       artist: album.artist?.name,
//       url: album.url,
//       image: album.image?.find((x: any) => x.size === "large")?.["#text"],
//     };
//   }
import { getAssetIDByName } from "@vendetta/ui/assets";
import { showToast } from "@vendetta/ui/toasts";
import { currentSettings } from "..";
import { Track } from "../../../defs";
import Constants from "../constants";
import { setDebugInfo } from "./debug";

interface LastFMError {
  error: number;
  message: string;
}

interface LastFMResponse {
  recenttracks?: {
    track: LastFMTrack[];
  };
  track?: {
    duration: string;
  };
  topartists?: {
    artist: Array<{
      name: string;
      url: string;
      image?: { size: string; "#text": string }[];
    }>;
  };
  toptracks?: {
    track: Array<{
      name: string;
      artist: { name: string };
      url: string;
      image?: { size: string; "#text": string }[];
    }>;
  };
  topalbums?: {
    album: Array<{
      name: string;
      artist: { name: string };
      url: string;
      image?: { size: string; "#text": string }[];
    }>;
  };
  error?: number;
  message?: string;
}

interface LastFMTrack {
  name: string;
  artist: {
    name: string;
  };
  album: {
    "#text": string;
  };
  image?: {
    size: string;
    "#text": string;
  }[];
  url: string;
  date?: {
    "#text": string;
  };
  "@attr"?: {
    nowplaying: boolean;
  };
  loved: string;
}

class LastFMClient {
  /**
   * Fetches the user's top artist
   */
  public async fetchTopArtist(): Promise<{ name: string; url: string; image?: string }> {
    this.validateSettings();
    const data = await this.makeRequest({
      method: "user.gettopartists",
      user: currentSettings.username,
      limit: "1",
    });
    const artist = data?.topartists?.artist?.[0];
    if (!artist) throw new Error("No top artist found");
    return {
      name: artist.name,
      url: artist.url,
      image: artist.image?.find((x: any) => x.size === "large")?.["#text"],
    };
  }

  /**
   * Fetches the user's top track
   */
  public async fetchTopTrack(): Promise<{ name: string; artist: string; url: string; image?: string }> {
    this.validateSettings();
    const data = await this.makeRequest({
      method: "user.gettoptracks",
      user: currentSettings.username,
      limit: "1",
    });
    const track = data?.toptracks?.track?.[0];
    if (!track) throw new Error("No top track found");
    return {
      name: track.name,
      artist: track.artist?.name,
      url: track.url,
      image: track.image?.find((x: any) => x.size === "large")?.["#text"],
    };
  }

  /**
   * Fetches the user's top album
   */
  public async fetchTopAlbum(): Promise<{ name: string; artist: string; url: string; image?: string }> {
    this.validateSettings();
    const data = await this.makeRequest({
      method: "user.gettopalbums",
      user: currentSettings.username,
      limit: "1",
    });
    const album = data?.topalbums?.album?.[0];
    if (!album) throw new Error("No top album found");
    return {
      name: album.name,
      artist: album.artist?.name,
      url: album.url,
      image: album.image?.find((x: any) => x.size === "large")?.["#text"],
    };
  }
  private static instance: LastFMClient;
  private retryCount: number = 0;
  private lastError: number = 0;

  private constructor() { }

  public static getInstance(): LastFMClient {
    if (!LastFMClient.instance) {
      LastFMClient.instance = new LastFMClient();
    }
    return LastFMClient.instance;
  }

  private validateSettings(): void {
    if (!currentSettings.username) {
      throw new Error("Last.fm username is not set");
    }
    if (!currentSettings.apiKey) {
      throw new Error("Last.fm API key is not set");
    }
  }

  private async handleError(error: LastFMError): Promise<never> {
    this.lastError = error.error;

    const errorMessages: { [key: number]: string } = {
      2: "Invalid API key",
      11: "Service temporarily unavailable",
      16: "Service temporarily unavailable",
      29: "Rate limit exceeded",
    };

    const message =
      errorMessages[error.error] || error.message || "Unknown error";
    showToast(`Last.fm Error: ${message}`, getAssetIDByName("Small"));

    throw new Error(`Last.fm API Error ${error.error}: ${message}`);
  }

  private async makeRequest(
    params: Record<string, string>,
  ): Promise<LastFMResponse> {
    const queryParams = new URLSearchParams({
      ...params,
      api_key: currentSettings.apiKey,
      format: "json",
    }).toString();

    const response = await fetch(
      `${Constants.LFM_API_BASE_URL}?${queryParams}`,
    );
    const data: LastFMResponse = await response.json();

    if (!response.ok || data.error) {
      await this.handleError(data as LastFMError);
    }

    return data;
  }

  public async fetchLatestScrobble(): Promise<
    Track & { from: number; to: number | null }
  > {
    try {
      this.validateSettings();

      const data = await this.makeRequest({
        method: "user.getrecenttracks",
        user: currentSettings.username,
        limit: "1",
        extended: "1",
      });

      const lastTrack = data?.recenttracks?.track?.[0];
      setDebugInfo("lastAPIResponse", lastTrack);

      if (!lastTrack) {
        throw new Error("No tracks found");
      }

      // Reset retry count on successful request
      this.retryCount = 0;

      const isNowPlaying = Boolean(lastTrack["@attr"]?.nowplaying);
      let from: number;
      if (isNowPlaying) {
        from = Math.floor(Date.now() / 1000);
      } else if (lastTrack?.date && typeof lastTrack.date === "object" && "uts" in lastTrack.date) {
        from = parseInt((lastTrack.date as any).uts);
      } else {
        from = Math.floor(Date.now() / 1000);
      }

      let to: number | null = null;
      try {
        const trackInfo = await this.makeRequest({
          method: "track.getInfo",
          track: lastTrack.name,
          artist: lastTrack.artist.name,
          username: currentSettings.username,
        });

        const duration = parseInt(trackInfo?.track?.duration);
        if (duration > 0) {
          to = from + Math.floor(duration / 1000);
        }
      } catch (err) {
        console.warn("Failed to fetch track duration", err);
      }

      return {
        name: lastTrack.name,
        artist: lastTrack.artist.name,
        album: lastTrack.album["#text"],
        albumArt: await this.handleAlbumCover(
          lastTrack.image?.find((x) => x.size === "large")?.["#text"],
        ),
        url: lastTrack.url,
        date: lastTrack.date?.["#text"] ?? "now",
        nowPlaying: isNowPlaying,
        loved: lastTrack.loved === "1",
        from,
        to,
      };
    } catch (error) {
      // Increment retry count and throw if we've exceeded max retries
      this.retryCount++;
      if (this.retryCount > Constants.MAX_RETRY_ATTEMPTS) {
        this.retryCount = 0;
        throw error;
      }

      // Wait before retrying
      await new Promise((resolve) =>
        setTimeout(resolve, Constants.RETRY_DELAY),
      );
      return this.fetchLatestScrobble();
    }
  }

  public async handleAlbumCover(cover?: string): Promise<string | null> {
    if (!cover) return null;
    if (Constants.LFM_DEFAULT_COVER_HASHES.some((hash) => cover.includes(hash))) {
      return null;
    }
    return cover;
  }

  public getLastError(): number {
    return this.lastError;
  }

  public resetRetryCount(): void {
    this.retryCount = 0;
  }
}

// Export a singleton instance
export const lastfmClient = LastFMClient.getInstance();

/** Fetches the latest user's scrobble */
export async function fetchLatestScrobble(): Promise<
  Track & { from: number; to: number | null }
> {
  return lastfmClient.fetchLatestScrobble();
}

/**
 * Handles album cover processing
 * @param cover The album cover given by Last.fm
 */
export async function handleAlbumCover(cover: string): Promise<string | null> {
  return lastfmClient.handleAlbumCover(cover);
}
