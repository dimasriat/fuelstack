interface CoinGeckoPriceResponse {
  bitcoin: { usd: number };
  blockstack: { usd: number };
}

interface PriceData {
  btcUsd: number;
  stxUsd: number;
  timestamp: number;
}

class PriceService {
  private static COINGECKO_API = 'https://api.coingecko.com/api/v3/simple/price?vs_currencies=usd&ids=bitcoin,blockstack';
  private static CACHE_KEY = 'fuelstack_prices';
  private static CACHE_TTL = 60000; // 1 minute cache

  /**
   * Fetch current BTC and STX prices from CoinGecko
   */
  static async fetchPrices(): Promise<PriceData> {
    // Check cache first
    const cached = this.getCachedPrices();
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached;
    }

    try {
      const response = await fetch(this.COINGECKO_API);
      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`);
      }

      const data: CoinGeckoPriceResponse = await response.json();

      const priceData: PriceData = {
        btcUsd: data.bitcoin.usd,
        stxUsd: data.blockstack.usd,
        timestamp: Date.now(),
      };

      // Cache the result
      this.setCachedPrices(priceData);

      return priceData;
    } catch (error) {
      console.error('Error fetching prices:', error);

      // Return cached data if available, even if expired
      if (cached) {
        console.warn('Using expired cached prices due to API error');
        return cached;
      }

      // Fallback to default prices if no cache available
      throw error;
    }
  }

  /**
   * Calculate output amount based on input token, amount, and output type
   */
  static calculateOutputAmount(
    inputToken: 'USDC' | 'WBTC',
    inputAmount: number, // In human-readable units (e.g., 100 USDC)
    outputType: 'STX' | 'sBTC',
    prices: PriceData
  ): number {
    const { btcUsd, stxUsd } = prices;

    // USDC → STX: amountIn / stxUsdPrice
    if (inputToken === 'USDC' && outputType === 'STX') {
      return inputAmount / stxUsd;
    }

    // USDC → sBTC: amountIn / btcUsdPrice
    if (inputToken === 'USDC' && outputType === 'sBTC') {
      return inputAmount / btcUsd;
    }

    // WBTC → STX: (amountIn * btcUsdPrice) / stxUsdPrice
    if (inputToken === 'WBTC' && outputType === 'STX') {
      return (inputAmount * btcUsd) / stxUsd;
    }

    // WBTC → sBTC: 1:1 ratio
    if (inputToken === 'WBTC' && outputType === 'sBTC') {
      return inputAmount;
    }

    return 0;
  }

  /**
   * Convert output amount to contract format (with proper decimals)
   */
  static toContractAmount(amount: number, outputType: 'STX' | 'sBTC'): bigint {
    // STX: 18 decimals (EVM format, solver converts to 6 on Stacks)
    // sBTC: 8 decimals
    const decimals = outputType === 'STX' ? 18 : 8;
    return BigInt(Math.floor(amount * Math.pow(10, decimals)));
  }

  /**
   * Format amount for display
   */
  static formatAmount(amount: number, maxDecimals = 6): string {
    if (amount === 0) return '0';
    if (amount < 0.000001) return amount.toExponential(2);

    // Remove trailing zeros
    return amount.toFixed(maxDecimals).replace(/\.?0+$/, '');
  }

  // Cache helpers
  private static getCachedPrices(): PriceData | null {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  }

  private static setCachedPrices(data: PriceData): void {
    try {
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to cache prices:', error);
    }
  }
}

export { PriceService };
export type { PriceData };
