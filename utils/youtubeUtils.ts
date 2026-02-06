
/**
 * YOUTUBE INTELLIGENCE UTILS
 * Mendukung ekstraksi data mendalam melalui YouTube Data API v3.
 */

export const getYoutubeId = (url: string): string | null => {
    if (!url) return null;
    
    // Clean URL from common trailing punctuation that AI might output in text
    const cleanUrl = url.replace(/[).,;\]]+$/, '');

    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = cleanUrl.match(regExp);
    
    // Standard YouTube ID is 11 chars
    if (match && match[2].length === 11) {
        return match[2];
    }
    
    return null;
};

export interface YoutubeComment {
    author: string;
    text: string;
    likeCount: number;
}

export interface YoutubeMetadata {
    id: string;
    title: string;
    description: string;
    publishedAt: string;
    channelTitle: string;
    tags: string[];
    viewCount: string;
    likeCount: string;
    commentCount: string;
    topComments: YoutubeComment[];
    thumbnailUrl: string;
}

export const fetchDetailedYoutubeMetadata = async (videoId: string): Promise<YoutubeMetadata | null> => {
    const API_KEY = process.env.API_KEY;
    if (!API_KEY) return null;

    try {
        // 1. Fetch Video Details
        const videoUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoId}&key=${API_KEY}`;
        const videoRes = await fetch(videoUrl);
        const videoData = await videoRes.json();

        if (!videoData.items || videoData.items.length === 0) return null;

        const item = videoData.items[0];
        const snip = item.snippet;
        const stats = item.statistics;

        // 2. Fetch Top Comments
        let comments: YoutubeComment[] = [];
        try {
            const commentUrl = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&maxResults=5&order=relevance&key=${API_KEY}`;
            const commentRes = await fetch(commentUrl);
            const commentData = await commentRes.json();
            
            if (commentData.items) {
                comments = commentData.items.map((c: any) => ({
                    author: c.snippet.topLevelComment.snippet.authorDisplayName,
                    text: c.snippet.topLevelComment.snippet.textDisplay,
                    likeCount: c.snippet.topLevelComment.snippet.likeCount
                }));
            }
        } catch (e) {
            console.warn("Failed to fetch comments, continuing with basic metadata.");
        }

        return {
            id: videoId,
            title: snip.title,
            description: snip.description,
            publishedAt: snip.publishedAt,
            channelTitle: snip.channelTitle,
            tags: snip.tags || [],
            viewCount: stats.viewCount,
            likeCount: stats.likeCount,
            commentCount: stats.commentCount,
            topComments: comments,
            thumbnailUrl: snip.thumbnails.high?.url || snip.thumbnails.default?.url
        };
    } catch (e) {
        console.error("[Akasha] Deep YouTube Scan Failed:", e);
        return null;
    }
};
