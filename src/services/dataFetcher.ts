import axios from 'axios';
import axiosRetry from 'axios-retry';

//axios retry logic 
axiosRetry(axios, { 
    retries: 3,
    retryDelay: (retryCount) => {
      console.log(`Retrying request: Attempt ${retryCount}`);
      return retryCount * 2000; // 2s, 4s, 6s
    },
    retryCondition: (error) => {
      // Retry on network errors or "Too Many Requests" (429)
      return (
        axiosRetry.isNetworkOrIdempotentRequestError(error) ||
        error.response?.status === 429
      );
    }
  });


// --- CONSTANTS ---
const WSOL_MINT_ADDRESS = 'So11111111111111111111111111111111111111112';
const USDC_MINT_ADDRESS = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

// This is our app's final, clean data structure
interface AppToken {
  token_address: string;
  token_name: string;
  token_ticker: string;
  price_sol: number;
  market_cap_sol: number;
  volume_sol: number;
  liquidity_sol: number;
  transaction_count: number;
  price_1hr_change: number;
  protocol: string;
}

// Defines the shape of a token from DexScreener
interface ApiTokenInfo {
  address: string;
  name: string;
  symbol: string;
}

// Defines the shape of a pair for getSolPriceInUsd
interface DexPricePair {
  priceUsd: string;
  quoteToken: {
    address: string;
  };
}

// Defines the shape of a pair from DexScreener's search
interface ApiDexPair {
  chainId: string;
  baseToken: ApiTokenInfo;
  quoteToken: ApiTokenInfo;
  priceUsd: string;
  priceNative: string;
  volume: { h24: number };
  fdv: number;
  liquidity?: { usd: number }; // Marked as optional
  txns?: { h24: { buys: number; sells: number } }; // Marked as optional
  priceChange?: { h1: number }; // Marked as optional
  dexId: string;
}

// Defines the shape of a token from Jupiter's search
interface ApiJupiterToken {
  id: string;
  name: string;
  symbol: string;
  usdPrice: number;
  mcap: number;
  liquidity: number;
  stats24h: {
    buyVolume: number;
    sellVolume: number;
    numBuys: number;
    numSells: number;
  };
  stats1h: {
    priceChange: number;
  };
}

async function getSolPriceInUsd(): Promise<number> {
  const url = `https://api.dexscreener.com/latest/dex/tokens/${WSOL_MINT_ADDRESS}`;
  try {
    const { data } = await axios.get(url);
    if (!data.pairs || data.pairs.length === 0) {
      throw new Error('No pairs found for WSOL');
    }
    const usdc_pair = data.pairs.find(
      (pair: DexPricePair) => pair.quoteToken.address === USDC_MINT_ADDRESS
    );
    if (usdc_pair && usdc_pair.priceUsd) {
      return parseFloat(usdc_pair.priceUsd);
    }
    if (data.pairs[0] && data.pairs[0].priceUsd) {
      return parseFloat(data.pairs[0].priceUsd);
    }
    throw new Error('Could not find any pair with a USD price');
  } catch (error) {
    console.error('Error fetching SOL price:', error);
    throw new Error('Could not fetch SOL to USD conversion rate.');
  }
}

async function fetchDexScreenerData(): Promise<ApiDexPair[]> {
  const url = 'https://api.dexscreener.com/latest/dex/search?q=sol';
  try {
    const { data } = await axios.get(url);
    return data.pairs || [];
  } catch (error) {
    console.error('Error fetching DexScreener Data: ', error);
    return [];
  }
}

async function fetchJupiterData(): Promise<ApiJupiterToken[]> {
  const url = 'https://lite-api.jup.ag/tokens/v2/search?query=sol';
  try {
    const { data } = await axios.get(url);
    return data || [];
  } catch (error) {
    console.error('Error fetching Jupiter Data: ', error);
    return [];
  }
}

export async function fetchAndMergeData(): Promise<AppToken[]> {
  console.log('Starting data fetch...');

  const SolPriceInUsd = await getSolPriceInUsd();
  console.log(`Current SOL Price: $${SolPriceInUsd}`);

  const [dexScreenerResults, jupiterResults] = await Promise.all([
    fetchDexScreenerData(),
    fetchJupiterData(),
  ]);

  console.log(`Fetched ${dexScreenerResults.length} pairs from Dex Screener`);
  console.log(`Fetched ${jupiterResults.length} tokens from Jupiter`);

  const mergedTokens = new Map<string, AppToken>();

  for (const pair of dexScreenerResults) {
    if (pair.chainId !== 'solana') {
      continue;
    }

    if (
      pair.quoteToken.address === WSOL_MINT_ADDRESS &&
      pair.baseToken &&
      pair.priceNative &&
      pair.volume.h24 &&
      pair.fdv
    ) {
      const liquidityInUsd = pair.liquidity?.usd ?? 0;
      const priceChange1h = pair.priceChange?.h1 ?? 0;
      const txns24h_buys = pair.txns?.h24?.buys ?? 0;
      const txns24h_sells = pair.txns?.h24?.sells ?? 0;

      const token: AppToken = {
        token_address: pair.baseToken.address,
        token_name: pair.baseToken.name,
        token_ticker: pair.baseToken.symbol,
        price_sol: parseFloat(pair.priceNative),
        market_cap_sol: pair.fdv / SolPriceInUsd,
        volume_sol: pair.volume.h24 / SolPriceInUsd,
        liquidity_sol: liquidityInUsd / SolPriceInUsd,
        price_1hr_change: priceChange1h,
        transaction_count: txns24h_buys + txns24h_sells,
        protocol: pair.dexId,
      };
      mergedTokens.set(token.token_address, token);
    }
  }

  // --- JUPITER LOGIC (This is now active again) ---
  for (const token of jupiterResults) {
    if (
      !token.id ||
      !token.usdPrice ||
      !token.mcap ||
      !token.stats24h?.buyVolume ||
      !token.stats24h?.sellVolume
    ) {
      continue;
    }

    // "Intelligent Merge" check:
    if (!mergedTokens.has(token.id)) {
      const totalVolume =
        token.stats24h.buyVolume + token.stats24h.sellVolume;
      const totalTxns =
        (token.stats24h.numBuys || 0) + (token.stats24h.numSells || 0);

      const appToken: AppToken = {
        token_address: token.id,
        token_name: token.name,
        token_ticker: token.symbol,
        price_sol: token.usdPrice / SolPriceInUsd,
        volume_sol: totalVolume / SolPriceInUsd,
        market_cap_sol: token.mcap / SolPriceInUsd,
        price_1hr_change: token.stats1h.priceChange || 0,
        liquidity_sol: token.liquidity / SolPriceInUsd || 0,
        transaction_count: totalTxns,
        protocol: 'Jupiter',
      };
      
      if (token.id !== WSOL_MINT_ADDRESS) {
        mergedTokens.set(appToken.token_address, appToken);
      }
    }
  }

  console.log(`Fetch Complete. Total Unique Size: ${mergedTokens.size}`);
  return Array.from(mergedTokens.values());

}