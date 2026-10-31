import axios from 'axios';
import { lcuClient } from './client';

// Service routes verified against the current LeagueAkari SGP API definitions:
// https://github.com/LeagueAkari/LeagueAkari/blob/dev/src/main/shards/akari-api/builtin.ts
// Only these Riot/Tencent origins may receive the client's short-lived token.
const TENCENT_SERVERS: Record<string, string> = {
  HN1: 'hn1-k8s',
  HN10: 'hn10-k8s',
  BGP2: 'bgp2-k8s',
  TJ100: 'tj100',
  TJ101: 'tj101',
  NJ100: 'nj100',
  GZ100: 'gz100',
  CQ100: 'cq100',
  PBE: 'pbe',
  PREPBE: 'prepbe',
};
const RIOT_SERVERS: Record<string, string> = {
  NA1: 'usw2',
  BR1: 'usw2',
  LA1: 'usw2',
  LA2: 'usw2',
  PBE1: 'usw2',
  EUW1: 'euc1',
  EUN1: 'euc1',
  RU: 'euc1',
  TR1: 'euc1',
  KR: 'apne1',
  JP1: 'apne1',
  OC1: 'apse1',
  TW2: 'apse1',
  SG2: 'apse1',
  PH2: 'apse1',
  VN2: 'apse1',
  TH2: 'apse1',
};

const clientPlatforms = new WeakMap<object, { token: string; value: Promise<string> }>();

async function getClientPlatform(token: string): Promise<string> {
  const connection = lcuClient.getCredentials();
  if (!connection) throw new Error('客户端登录凭证暂不可用，请重新连接后重试');
  const cached = clientPlatforms.get(connection);
  if (cached?.token === token) return cached.value;
  // Tencent tokens omit lol.cpid. The current-summoner response supplies platformId
  // even when the client ignores page offsets. Only this metadata is retained.
  const value = lcuClient
    .get<{
      platformId?: string;
      games?: { games?: { platformId?: string }[] };
    }>('/lol-match-history/v1/products/lol/current-summoner/matches?begIndex=0&endIndex=0')
    .then((raw) => {
      const platform = raw.platformId || raw.games?.games?.[0]?.platformId;
      if (!platform) throw new Error('客户端暂未提供大区信息，请登录完成后重试');
      return platform;
    })
    .catch((error) => {
      if (clientPlatforms.get(connection)?.value === value) clientPlatforms.delete(connection);
      throw error;
    });
  // Credentials and tokens stay in main-process memory and change on reconnect/login.
  clientPlatforms.set(connection, { token, value });
  return value;
}

export function resolveSgpOrigin(platform: string, region = ''): string {
  const id = platform.toUpperCase().replace(/^TENCENT_/, '');
  if (TENCENT_SERVERS[id] && (region === 'TENCENT' || !RIOT_SERVERS[id])) {
    return `https://${TENCENT_SERVERS[id]}-sgp.lol.qq.com:21019`;
  }
  const cluster = RIOT_SERVERS[id];
  if (cluster) return `https://${cluster}-red.pp.sgp.pvp.net`;
  throw new Error('当前大区尚未配置备用战绩服务，请重新连接客户端后重试');
}

async function getContext(platformHint?: string) {
  const [entitlements, locale] = await Promise.all([
    lcuClient.get<{ accessToken?: string }>('/entitlements/v1/token'),
    lcuClient.get<{ region?: string }>('/riotclient/region-locale').catch(() => ({})),
  ]);
  const token = entitlements.accessToken;
  if (!token) throw new Error('客户端登录凭证暂不可用，请等待登录完成后重试');
  let platform = platformHint;
  if (!platform) {
    try {
      // Claims select an allowlisted service only; no token is logged or persisted.
      const claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
      platform = claims.lol?.cpid ?? claims['lol.cpid'];
    } catch {
      /* Non-JWT token: use the client's platform config below. */
    }
  }
  if (!platform) {
    platform = await getClientPlatform(token);
  }
  return {
    token,
    origin: resolveSgpOrigin(platform ?? '', 'region' in locale ? locale.region : ''),
  };
}

/** SGP returns full games inside games[].json, unlike LCU's single-player page. */
export async function getSgpMatchPage(
  puuid: string,
  startIndex: number,
  count: number,
  platform?: string,
  queue?: number,
) {
  const { token, origin } = await getContext(platform);
  try {
    const response = await axios.get(
      `${origin}/match-history-query/v1/products/lol/player/${encodeURIComponent(puuid)}/SUMMARY`,
      {
        params: { startIndex, count, ...(queue === undefined ? {} : { tag: `q_${queue}` }) },
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
        maxRedirects: 0,
      },
    );
    if (!Array.isArray(response.data?.games)) throw new Error('invalid response');
    const games = response.data.games.map((entry: { json?: unknown }) => entry.json);
    if (games.some((game: unknown) => !game || typeof game !== 'object')) {
      throw new Error('invalid game');
    }
    if (
      games.some(
        (game: { participants?: { puuid?: string }[] }) =>
          !Array.isArray(game.participants) ||
          !game.participants.some((player) => player.puuid === puuid),
      )
    ) {
      throw new Error('requested player missing');
    }
    if (queue !== undefined && games.some((game: { queueId?: number }) => game.queueId !== queue)) {
      throw new Error('queue filter was ignored');
    }
    return games as Record<string, unknown>[];
  } catch (error) {
    // Axios errors contain request headers; never propagate or log that object.
    const status = axios.isAxiosError(error) ? error.response?.status : undefined;
    throw new Error(`备用战绩服务请求失败${status ? `（HTTP ${status}）` : ''}，请稍后重试`);
  }
}
