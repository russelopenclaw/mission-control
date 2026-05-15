import { NextResponse } from 'next/server';

const PLEX_HOST = 'server:32400';
const PLEX_TOKEN = 'z7Bh1q4cqgmNEzfF6EFW';

export async function GET() {
  try {
    // Fetch accounts for user ID mapping
    const accountsRes = await fetch(`http://${PLEX_HOST}/accounts?X-Plex-Token=${PLEX_TOKEN}`, {
      headers: { Accept: 'application/json' },
    });
    const accountsData = await accountsRes.json();
    const accountMap: Record<number, string> = {};
    for (const acct of accountsData.MediaContainer?.Account || []) {
      if (acct.id && acct.name) accountMap[acct.id] = acct.name;
    }

    // Now Playing
    const sessionsRes = await fetch(`http://${PLEX_HOST}/status/sessions?X-Plex-Token=${PLEX_TOKEN}`, {
      headers: { Accept: 'application/json' },
    });
    const sessionsData = await sessionsRes.json();
    const nowPlaying = (sessionsData.MediaContainer?.Metadata || []).map((item: any) => ({
      title: item.type === 'episode' ? item.title : item.title,
      show: item.grandparentTitle || null, // Show name for episodes
      season: item.parentTitle || null,
      type: item.type,
      user: item.User?.title || accountMap[item.AccountID] || 'Unknown',
      player: item.Player?.title || 'Unknown',
      progress: item.viewOffset && item.duration ? Math.round((item.viewOffset / item.duration) * 100) : 0,
      thumb: item.thumb ? `http://${PLEX_HOST}${item.thumb}?X-Plex-Token=${PLEX_TOKEN}` : null,
      year: item.year,
      duration: item.duration || 0,
      summary: (item.summary || '').slice(0, 150),
    }));

    // Recent History
    const historyRes = await fetch(
      `http://${PLEX_HOST}/status/sessions/history/all?X-Plex-Token=${PLEX_TOKEN}&limit=50&sort=viewedAt:desc`,
      { headers: { Accept: 'application/json' } }
    );
    const historyData = await historyRes.json();
    const recentWatches = (historyData.MediaContainer?.Metadata || []).map((item: any) => ({
      id: `${item.ratingKey || ''}-${item.viewedAt || ''}`,
      title: item.title || 'Unknown',
      show: item.grandparentTitle || null, // Show name for episodes
      type: item.type,
      username: accountMap[item.accountID] || `User ${item.accountID}`,
      viewedAt: item.viewedAt,
      duration: item.duration || 0,
      thumb: item.thumb ? `http://${PLEX_HOST}${item.thumb}?X-Plex-Token=${PLEX_TOKEN}` : null,
    }));

    // Top shows this week
    const weekAgo = Math.floor(Date.now() / 1000) - 7 * 86400;
    const weekViews = recentWatches.filter((item: any) => item.viewedAt > weekAgo && item.type === 'episode');
    const showCounts: Record<string, { count: number; lastWatched: number }> = {};
    for (const view of weekViews) {
      const show = view.show || view.title;
      if (!showCounts[show]) showCounts[show] = { count: 0, lastWatched: 0 };
      showCounts[show].count++;
      if (view.viewedAt > showCounts[show].lastWatched) showCounts[show].lastWatched = view.viewedAt;
    }
    const topShowsThisWeek = Object.entries(showCounts)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([show, data]) => ({ show, ...data }));

    // User summary
    const userViews: Record<string, { totalViews: number; lastActivity: number }> = {};
    for (const view of recentWatches) {
      const user = view.username;
      if (!userViews[user]) userViews[user] = { totalViews: 0, lastActivity: 0 };
      userViews[user].totalViews++;
      if (view.viewedAt > userViews[user].lastActivity) userViews[user].lastActivity = view.viewedAt;
    }
    const userSummary = Object.entries(userViews)
      .sort((a, b) => b[1].totalViews - a[1].totalViews)
      .map(([username, data]) => ({
        username,
        totalViews: data.totalViews,
        lastActivity: data.lastActivity ? new Date(data.lastActivity * 1000).toISOString() : null,
      }));

    // Library stats
    const librariesRes = await fetch(`http://${PLEX_HOST}/library/sections?X-Plex-Token=${PLEX_TOKEN}`, {
      headers: { Accept: 'application/json' },
    });
    const librariesData = await librariesRes.json();
    let totalShows = 0;
    let totalMovies = 0;
    
    // Fetch each library's size
    for (const lib of librariesData.MediaContainer?.Directory || []) {
      try {
        const libRes = await fetch(`http://${PLEX_HOST}/library/sections/${lib.key}/all?X-Plex-Token=${PLEX_TOKEN}&X-Plex-Container-Start=0&X-Plex-Container-Size=0`, {
          headers: { Accept: 'application/json' },
        });
        const libData = await libRes.json();
        const totalSize = libData.MediaContainer?.totalSize || 0;
        if (lib.type === 'show') totalShows += totalSize;
        if (lib.type === 'movie') totalMovies += totalSize;
      } catch {
        // skip if individual library fetch fails
      }
    }

    const response = NextResponse.json({
      nowPlaying,
      recentWatches,
      topShowsThisWeek,
      userSummary,
      libraryStats: { totalShows, totalMovies },
      error: false,
      errorMessage: null,
    });
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch (error) {
    console.error('[API /plex/activity] Error:', error);
    return NextResponse.json(
      {
        nowPlaying: [],
        recentWatches: [],
        topShowsThisWeek: [],
        userSummary: [],
        libraryStats: { totalShows: 0, totalMovies: 0 },
        error: true,
        errorMessage: (error as Error).message,
      },
      { status: 200 }
    );
  }
}