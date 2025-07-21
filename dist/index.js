'use strict';

var React = require('react');
var jsxRuntime = require('react/jsx-runtime');

var dist = {};

Object.defineProperty(dist, "__esModule", { value: true });
var bech32m = dist.bech32m = dist.bech32 = void 0;
const ALPHABET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
const ALPHABET_MAP = {};
for (let z = 0; z < ALPHABET.length; z++) {
    const x = ALPHABET.charAt(z);
    ALPHABET_MAP[x] = z;
}
function polymodStep(pre) {
    const b = pre >> 25;
    return (((pre & 0x1ffffff) << 5) ^
        (-((b >> 0) & 1) & 0x3b6a57b2) ^
        (-((b >> 1) & 1) & 0x26508e6d) ^
        (-((b >> 2) & 1) & 0x1ea119fa) ^
        (-((b >> 3) & 1) & 0x3d4233dd) ^
        (-((b >> 4) & 1) & 0x2a1462b3));
}
function prefixChk(prefix) {
    let chk = 1;
    for (let i = 0; i < prefix.length; ++i) {
        const c = prefix.charCodeAt(i);
        if (c < 33 || c > 126)
            return 'Invalid prefix (' + prefix + ')';
        chk = polymodStep(chk) ^ (c >> 5);
    }
    chk = polymodStep(chk);
    for (let i = 0; i < prefix.length; ++i) {
        const v = prefix.charCodeAt(i);
        chk = polymodStep(chk) ^ (v & 0x1f);
    }
    return chk;
}
function convert(data, inBits, outBits, pad) {
    let value = 0;
    let bits = 0;
    const maxV = (1 << outBits) - 1;
    const result = [];
    for (let i = 0; i < data.length; ++i) {
        value = (value << inBits) | data[i];
        bits += inBits;
        while (bits >= outBits) {
            bits -= outBits;
            result.push((value >> bits) & maxV);
        }
    }
    if (pad) {
        if (bits > 0) {
            result.push((value << (outBits - bits)) & maxV);
        }
    }
    else {
        if (bits >= inBits)
            return 'Excess padding';
        if ((value << (outBits - bits)) & maxV)
            return 'Non-zero padding';
    }
    return result;
}
function toWords(bytes) {
    return convert(bytes, 8, 5, true);
}
function fromWordsUnsafe(words) {
    const res = convert(words, 5, 8, false);
    if (Array.isArray(res))
        return res;
}
function fromWords(words) {
    const res = convert(words, 5, 8, false);
    if (Array.isArray(res))
        return res;
    throw new Error(res);
}
function getLibraryFromEncoding(encoding) {
    let ENCODING_CONST;
    if (encoding === 'bech32') {
        ENCODING_CONST = 1;
    }
    else {
        ENCODING_CONST = 0x2bc830a3;
    }
    function encode(prefix, words, LIMIT) {
        LIMIT = LIMIT || 90;
        if (prefix.length + 7 + words.length > LIMIT)
            throw new TypeError('Exceeds length limit');
        prefix = prefix.toLowerCase();
        // determine chk mod
        let chk = prefixChk(prefix);
        if (typeof chk === 'string')
            throw new Error(chk);
        let result = prefix + '1';
        for (let i = 0; i < words.length; ++i) {
            const x = words[i];
            if (x >> 5 !== 0)
                throw new Error('Non 5-bit word');
            chk = polymodStep(chk) ^ x;
            result += ALPHABET.charAt(x);
        }
        for (let i = 0; i < 6; ++i) {
            chk = polymodStep(chk);
        }
        chk ^= ENCODING_CONST;
        for (let i = 0; i < 6; ++i) {
            const v = (chk >> ((5 - i) * 5)) & 0x1f;
            result += ALPHABET.charAt(v);
        }
        return result;
    }
    function __decode(str, LIMIT) {
        LIMIT = LIMIT || 90;
        if (str.length < 8)
            return str + ' too short';
        if (str.length > LIMIT)
            return 'Exceeds length limit';
        // don't allow mixed case
        const lowered = str.toLowerCase();
        const uppered = str.toUpperCase();
        if (str !== lowered && str !== uppered)
            return 'Mixed-case string ' + str;
        str = lowered;
        const split = str.lastIndexOf('1');
        if (split === -1)
            return 'No separator character for ' + str;
        if (split === 0)
            return 'Missing prefix for ' + str;
        const prefix = str.slice(0, split);
        const wordChars = str.slice(split + 1);
        if (wordChars.length < 6)
            return 'Data too short';
        let chk = prefixChk(prefix);
        if (typeof chk === 'string')
            return chk;
        const words = [];
        for (let i = 0; i < wordChars.length; ++i) {
            const c = wordChars.charAt(i);
            const v = ALPHABET_MAP[c];
            if (v === undefined)
                return 'Unknown character ' + c;
            chk = polymodStep(chk) ^ v;
            // not in the checksum?
            if (i + 6 >= wordChars.length)
                continue;
            words.push(v);
        }
        if (chk !== ENCODING_CONST)
            return 'Invalid checksum for ' + str;
        return { prefix, words };
    }
    function decodeUnsafe(str, LIMIT) {
        const res = __decode(str, LIMIT);
        if (typeof res === 'object')
            return res;
    }
    function decode(str, LIMIT) {
        const res = __decode(str, LIMIT);
        if (typeof res === 'object')
            return res;
        throw new Error(res);
    }
    return {
        decodeUnsafe,
        decode,
        encode,
        toWords,
        fromWordsUnsafe,
        fromWords,
    };
}
dist.bech32 = getLibraryFromEncoding('bech32');
bech32m = dist.bech32m = getLibraryFromEncoding('bech32m');

// Chia Cloud Wallet API Client for React
// Add bech32m import for address conversion
/**
 * Utility function to normalize coin objects from snake_case to camelCase format
 * Handles both API response format (snake_case) and client format (camelCase)
 */
function normalizeCoin(coin) {
    return {
        parentCoinInfo: coin.parentCoinInfo || coin.parent_coin_info,
        puzzleHash: coin.puzzleHash || coin.puzzle_hash,
        amount: coin.amount
    };
}
/**
 * Utility function to normalize an array of coins
 */
function normalizeCoins(coins) {
    return coins.map(normalizeCoin);
}
class ChiaCloudWalletApiError extends Error {
    constructor(message, statusCode, response) {
        super(message);
        this.statusCode = statusCode;
        this.response = response;
        this.name = 'ChiaCloudWalletApiError';
    }
}
class ChiaCloudWalletClient {
    constructor(config = {}) {
        this.baseUrl = config.baseUrl || 'https://chia-enclave.silicon-dev.net';
        this.jwtToken = config.jwtToken;
        this.enableLogging = config.enableLogging ?? true;
    }
    /**
     * Log errors if logging is enabled
     */
    logError(message, error) {
        if (this.enableLogging) {
            console.error(`[ChiaCloudWalletClient] ${message}`, error);
        }
    }
    /**
     * Log info messages if logging is enabled
     */
    logInfo(message, data) {
        if (this.enableLogging) {
            console.info(`[ChiaCloudWalletClient] ${message}`, data);
        }
    }
    /**
     * Set the JWT token for authentication
     */
    setJwtToken(token) {
        this.jwtToken = token;
    }
    /**
     * Get the current JWT token
     */
    getJwtToken() {
        return this.jwtToken;
    }
    /**
     * Make an authenticated API request with enhanced error handling
     */
    async makeRequest(endpoint, options = {}, requireAuth = true) {
        const url = `${this.baseUrl}${endpoint}`;
        try {
            const headers = {
                'Content-Type': 'application/json',
                ...options.headers,
            };
            if (requireAuth) {
                if (!this.jwtToken) {
                    throw new ChiaCloudWalletApiError('JWT token is required for this request');
                }
                headers['Authorization'] = `Bearer ${this.jwtToken}`;
            }
            this.logInfo(`Making request to ${endpoint}`, { method: options.method || 'GET' });
            const response = await fetch(url, {
                ...options,
                headers,
            });
            if (!response.ok) {
                const errorText = await response.text();
                const error = new ChiaCloudWalletApiError(`HTTP ${response.status}: ${response.statusText}`, response.status, errorText);
                this.logError(`Request failed for ${endpoint}`, error);
                throw error;
            }
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const result = await response.json();
                this.logInfo(`Request successful for ${endpoint}`);
                return result;
            }
            else {
                const result = await response.text();
                this.logInfo(`Request successful for ${endpoint}`);
                return result;
            }
        }
        catch (error) {
            if (error instanceof ChiaCloudWalletApiError) {
                throw error;
            }
            const networkError = new ChiaCloudWalletApiError(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`, undefined, error);
            this.logError(`Network error for ${endpoint}`, networkError);
            throw networkError;
        }
    }
    /**
     * Health check endpoint with error handling
     */
    async healthCheck() {
        try {
            const result = await this.makeRequest('/health', {
                method: 'GET',
            }, false);
            return { success: true, data: result };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Health check failed',
                details: error
            };
        }
    }
    /**
     * Get public key from JWT token with error handling
     */
    async getPublicKey() {
        try {
            const result = await this.makeRequest('/public-key', {
                method: 'POST',
                body: JSON.stringify({}),
            });
            return { success: true, data: result };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get public key',
                details: error
            };
        }
    }
    /**
     * Export mnemonic phrase with error handling
     */
    async exportMnemonic() {
        try {
            const result = await this.makeRequest('/mnemonic', {
                method: 'POST',
                body: JSON.stringify({}),
            });
            return { success: true, data: result };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to export mnemonic',
                details: error
            };
        }
    }
    /**
     * Sign a spend bundle with error handling
     */
    async signSpendBundle(request) {
        try {
            if (!request.spend_bundle_hex && (!request.coin_spends || request.coin_spends.length === 0)) {
                throw new ChiaCloudWalletApiError('Either spend_bundle_hex or coin_spends are required for signing');
            }
            // Normalize coin spends if provided
            let normalizedRequest = request;
            if (request.coin_spends && request.coin_spends.length > 0) {
                normalizedRequest = {
                    ...request,
                    coin_spends: request.coin_spends.map(coinSpend => ({
                        ...coinSpend,
                        coin: normalizeCoin(coinSpend.coin)
                    }))
                };
            }
            const result = await this.makeRequest('/wallet/transaction/sign', {
                method: 'POST',
                body: JSON.stringify(normalizedRequest),
            });
            return { success: true, data: result };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to sign spend bundle',
                details: error
            };
        }
    }
    /**
     * Create and sign a send XCH transaction with error handling
     */
    async sendXCH(request) {
        try {
            if (!request.selected_coins || request.selected_coins.length === 0) {
                throw new ChiaCloudWalletApiError('Selected coins are required for sending XCH');
            }
            if (!request.payments || request.payments.length === 0) {
                throw new ChiaCloudWalletApiError('Payments are required for sending XCH');
            }
            // Normalize all selected coins to ensure consistent format
            const normalizedRequest = {
                ...request,
                selected_coins: normalizeCoins(request.selected_coins)
            };
            const result = await this.makeRequest('/wallet/transaction/send-xch', {
                method: 'POST',
                body: JSON.stringify(normalizedRequest),
            });
            return { success: true, data: result };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to send XCH',
                details: error
            };
        }
    }
    /**
     * Get unspent hydrated coins for a given public key (includes additional metadata)
     */
    async getUnspentHydratedCoins(publicKey) {
        try {
            if (!publicKey || publicKey.trim() === '') {
                throw new ChiaCloudWalletApiError('Public key is required');
            }
            const result = await this.makeRequest(`/wallet/unspent-hydrated-coins/${publicKey}`, {
                method: 'GET',
            }, false);
            return { success: true, data: result };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get unspent hydrated coins',
                details: error
            };
        }
    }
    /**
     * Sign an offer with error handling
     */
    async signOffer(request) {
        try {
            if (!request.offer || request.offer.trim() === '') {
                throw new ChiaCloudWalletApiError('Offer string is required for signing');
            }
            // Validate offer format (should start with "offer1")
            if (!request.offer.startsWith('offer1')) {
                throw new ChiaCloudWalletApiError('Invalid offer format: offer must start with "offer1"');
            }
            this.logInfo('Signing offer', {
                offerLength: request.offer.length,
                offerPrefix: request.offer.substring(0, 20) + '...'
            });
            const result = await this.makeRequest('/wallet/transaction/sign-offer', {
                method: 'POST',
                body: JSON.stringify(request),
            });
            return { success: true, data: result };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to sign offer',
                details: error
            };
        }
    }
    /**
     * Create an unsigned NFT offer with error handling
     */
    async makeUnsignedNFTOffer(request) {
        try {
            // Validate required fields
            if (!request.synthetic_public_key || request.synthetic_public_key.trim() === '') {
                throw new ChiaCloudWalletApiError('Synthetic public key is required');
            }
            if (!request.requested_payments ||
                (!request.requested_payments.cats?.length) &&
                    (!request.requested_payments.xch?.length)) {
                throw new ChiaCloudWalletApiError('Requested payments with CAT tokens or XCH are required');
            }
            if (!request.nft_data) {
                throw new ChiaCloudWalletApiError('NFT data is required');
            }
            // Ensure NFT data coin format is normalized
            const normalizedNFTData = {
                ...request.nft_data,
                coin: normalizeCoin(request.nft_data.coin)
            };
            // Prepare the request with normalized data
            const normalizedRequest = {
                ...request,
                nft_data: normalizedNFTData
            };
            this.logInfo('Making unsigned NFT offer request', {
                publicKey: request.synthetic_public_key.substring(0, 10) + '...',
                catPaymentsCount: request.requested_payments.cats?.length || 0,
                xchPaymentsCount: request.requested_payments.xch?.length || 0
            });
            const result = await this.makeRequest('/wallet/offer/make-unsigned-nft', {
                method: 'POST',
                body: JSON.stringify(normalizedRequest),
            });
            // Return the unsigned offer - signing should be done separately
            return { success: true, data: result };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to make unsigned NFT offer',
                details: error
            };
        }
    }
    /**
     * Broadcast a signed spend bundle with error handling
     */
    async broadcastSpendBundle(request) {
        try {
            if (!request.coinSpends || request.coinSpends.length === 0) {
                throw new ChiaCloudWalletApiError('Coin spends are required for broadcasting');
            }
            if (!request.signature) {
                throw new ChiaCloudWalletApiError('Signature is required for broadcasting');
            }
            // Normalize all coins in the coin spends
            const normalizedCoinSpends = request.coinSpends.map(coinSpend => ({
                ...coinSpend,
                coin: normalizeCoin(coinSpend.coin)
            }));
            const result = await this.makeRequest('/wallet/transaction/broadcast', {
                method: 'POST',
                body: JSON.stringify({
                    coinSpends: normalizedCoinSpends,
                    signature: request.signature
                }),
            });
            return { success: true, data: result };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to broadcast spend bundle',
                details: error
            };
        }
    }
    /**
     * Convenience method to broadcast a signed spend bundle from a SignedSpendBundleResponse or SendXCHResponse
     */
    async broadcastSignedSpendBundle(signedBundle) {
        try {
            if (!signedBundle.success) {
                throw new ChiaCloudWalletApiError('Cannot broadcast failed transaction');
            }
            const { coin_spends, aggregated_signature } = signedBundle.signed_spend_bundle;
            return await this.broadcastSpendBundle({
                coinSpends: coin_spends,
                signature: aggregated_signature
            });
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to broadcast signed spend bundle',
                details: error
            };
        }
    }
    /**
     * Complete transaction flow: create, sign, and broadcast XCH transaction
     */
    async sendAndBroadcastXCH(request) {
        try {
            // First, create and sign the transaction
            const signedResult = await this.sendXCH(request);
            if (!signedResult.success) {
                return {
                    success: false,
                    error: `Failed to sign transaction: ${signedResult.error}`,
                    details: signedResult.details
                };
            }
            // Then broadcast the signed transaction
            const broadcastResult = await this.broadcastSignedSpendBundle(signedResult.data);
            if (!broadcastResult.success) {
                return {
                    success: false,
                    error: `Failed to broadcast transaction: ${broadcastResult.error}`,
                    details: broadcastResult.details
                };
            }
            return broadcastResult;
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to send and broadcast XCH',
                details: error
            };
        }
    }
    /**
     * Utility method to convert a Chia address to puzzle hash using bech32m decoding
     */
    static convertAddressToPuzzleHash(address) {
        try {
            // Basic validation
            if (!address || typeof address !== 'string') {
                return {
                    success: false,
                    error: 'Address must be a non-empty string'
                };
            }
            // Decode bech32m address
            const decoded = bech32m.decode(address);
            // Validate prefix
            if (decoded.prefix !== 'xch') {
                return {
                    success: false,
                    error: 'Invalid address prefix: must be "xch"'
                };
            }
            // Validate word length (52 5-bit words for a 32-byte puzzle hash)
            if (decoded.words.length !== 52) {
                return {
                    success: false,
                    error: `Invalid address data length: expected 52 words, got ${decoded.words.length}`
                };
            }
            // Convert 5-bit words to 8-bit bytes
            const bytes = bech32m.fromWords(decoded.words);
            // Convert bytes to hex string
            const puzzleHash = Array.from(bytes)
                .map(b => {
                const hex = b.toString(16);
                return hex.length === 1 ? '0' + hex : hex;
            })
                .join('');
            return {
                success: true,
                data: puzzleHash
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to convert address to puzzle hash',
                details: error
            };
        }
    }
    /**
     * Utility function to extract simple coins from hydrated coins
     * This helps with migration from getUnspentCoins to getUnspentHydratedCoins
     */
    static extractCoinsFromHydratedCoins(hydratedCoins) {
        return hydratedCoins.map(hydratedCoin => hydratedCoin.coin);
    }
    /**
     * Get wallet balance using hydrated coins (enhanced version)
     */
    async getWalletBalanceEnhanced(publicKey) {
        try {
            const hydratedResult = await this.getUnspentHydratedCoins(publicKey);
            if (!hydratedResult.success) {
                return {
                    success: false,
                    error: `Failed to get enhanced balance: ${hydratedResult.error}`
                };
            }
            let totalBalance = 0;
            const xchCoins = [];
            const catCoins = [];
            const nftCoins = [];
            for (const hydratedCoin of hydratedResult.data.data) {
                try {
                    totalBalance += parseInt(hydratedCoin.coin.amount);
                    // Categorize coins by type
                    const driverInfo = hydratedCoin.parentSpendInfo.driverInfo;
                    if (driverInfo?.type === 'CAT') {
                        catCoins.push(hydratedCoin);
                    }
                    else if (driverInfo?.type === 'NFT') {
                        nftCoins.push(hydratedCoin);
                    }
                    else {
                        xchCoins.push(hydratedCoin);
                    }
                }
                catch (error) {
                    this.logError(`Invalid coin amount in enhanced balance calculation: ${hydratedCoin.coin.amount}`, error);
                    // Continue with other coins instead of failing entirely
                }
            }
            return {
                success: true,
                data: {
                    totalBalance,
                    coinCount: hydratedResult.data.data.length,
                    xchCoins,
                    catCoins,
                    nftCoins
                }
            };
        }
        catch (error) {
            this.logError('Error in getWalletBalanceEnhanced', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get enhanced wallet balance',
                details: error
            };
        }
    }
    /**
     * Utility method to convert XCH to mojos with error handling
     */
    static xchToMojos(xchAmount) {
        try {
            if (typeof xchAmount !== 'number' || isNaN(xchAmount) || xchAmount < 0) {
                return {
                    success: false,
                    error: 'Invalid XCH amount'
                };
            }
            const MOJOS_PER_XCH = 1000000000000; // 1 XCH = 1 trillion mojos
            const mojos = Math.round(xchAmount * MOJOS_PER_XCH);
            return { success: true, data: mojos.toString() };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to convert XCH to mojos',
                details: error
            };
        }
    }
    /**
     * Utility method to convert mojos to XCH with error handling
     */
    static mojosToXCH(mojos) {
        try {
            const MOJOS_PER_XCH = 1000000000000;
            const mojosAmount = typeof mojos === 'string' ? parseInt(mojos) : mojos;
            const xchAmount = mojosAmount / MOJOS_PER_XCH;
            if (isNaN(xchAmount)) {
                return {
                    success: false,
                    error: 'Invalid mojos amount'
                };
            }
            return { success: true, data: xchAmount };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to convert mojos to XCH',
                details: error
            };
        }
    }
    /**
     * Safe version of the original utility methods for backward compatibility
     */
    static xchToMojosUnsafe(xchAmount) {
        const MOJOS_PER_XCH = 1000000000000;
        const mojos = Math.round(xchAmount * MOJOS_PER_XCH);
        return mojos.toString();
    }
    static mojosToXCHUnsafe(mojos) {
        const MOJOS_PER_XCH = 1000000000000;
        const mojosAmount = typeof mojos === 'string' ? parseInt(mojos) : mojos;
        return mojosAmount / MOJOS_PER_XCH;
    }
    /**
     * Statically calculate a coin's ID
     * Coin ID = SHA256(parent_coin_info + puzzle_hash + amount)
     * @param coin The coin to calculate the ID for
     * @returns Promise<Result<string>> The coin ID as a hex string
     */
    static async calculateCoinId(coin) {
        try {
            // Normalize the coin to ensure consistent format
            const normalizedCoin = normalizeCoin(coin);
            // Extract normalized fields
            const parentCoinInfo = normalizedCoin.parentCoinInfo;
            const puzzleHash = normalizedCoin.puzzleHash;
            const amount = normalizedCoin.amount;
            // Validate inputs
            if (!parentCoinInfo || !puzzleHash || !amount) {
                return {
                    success: false,
                    error: 'Invalid coin: missing required fields (parent_coin_info/parentCoinInfo, puzzle_hash/puzzleHash, amount) ' + JSON.stringify(coin)
                };
            }
            // Remove '0x' prefix if present
            const cleanParentCoinInfo = parentCoinInfo.replace(/^0x/, '');
            const cleanPuzzleHash = puzzleHash.replace(/^0x/, '');
            // Validate hex strings
            if (!/^[0-9a-fA-F]{64}$/.test(cleanParentCoinInfo)) {
                return {
                    success: false,
                    error: 'Invalid parent_coin_info: must be a 64-character hex string'
                };
            }
            if (!/^[0-9a-fA-F]{64}$/.test(cleanPuzzleHash)) {
                return {
                    success: false,
                    error: 'Invalid puzzle_hash: must be a 64-character hex string'
                };
            }
            // Convert amount to 8-byte big-endian format
            let amountNumber;
            try {
                amountNumber = parseInt(amount);
            }
            catch (error) {
                return {
                    success: false,
                    error: 'Invalid amount: must be a valid number string'
                };
            }
            if (amountNumber < 0) {
                return {
                    success: false,
                    error: 'Invalid amount: must be non-negative'
                };
            }
            // Convert amount to 8-byte big-endian hex string
            const amountHex = ('0000000000000000' + amountNumber.toString(16)).slice(-16);
            // Concatenate all parts
            const concatenated = cleanParentCoinInfo + cleanPuzzleHash + amountHex;
            // Convert hex string to bytes
            const bytes = new Uint8Array(concatenated.length / 2);
            for (let i = 0; i < concatenated.length; i += 2) {
                bytes[i / 2] = parseInt(concatenated.substr(i, 2), 16);
            }
            // Calculate SHA256 hash using Web Crypto API
            const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
            const hashArray = new Uint8Array(hashBuffer);
            // Convert to hex string
            const coinId = Array.from(hashArray)
                .map(b => {
                const hex = b.toString(16);
                return hex.length === 1 ? '0' + hex : hex;
            })
                .join('');
            return {
                success: true,
                data: coinId
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to calculate coin ID',
                details: error
            };
        }
    }
    /**
     * Calculate coin IDs for multiple coins
     * @param coins Array of coins to calculate IDs for
     * @returns Promise<Result<{coin: Coin, coinId: string}[]>> Array of coins with their IDs
     */
    static async calculateCoinIds(coins) {
        try {
            // Normalize all coins to ensure consistent format
            const normalizedCoins = normalizeCoins(coins);
            const results = [];
            for (const coin of normalizedCoins) {
                const result = await ChiaCloudWalletClient.calculateCoinId(coin);
                if (!result.success) {
                    const parentInfo = coin.parentCoinInfo || 'unknown';
                    return {
                        success: false,
                        error: `Failed to calculate coin ID for coin with parent ${parentInfo}: ${result.error}`
                    };
                }
                results.push({ coin, coinId: result.data });
            }
            return {
                success: true,
                data: results
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to calculate coin IDs',
                details: error
            };
        }
    }
    /**
     * Utility method to validate a coin ID format
     * @param coinId The coin ID to validate
     * @returns boolean Whether the coin ID is valid
     */
    static isValidCoinId(coinId) {
        // Remove '0x' prefix if present
        const id = coinId.replace(/^0x/, '');
        // Must be exactly 64 hex characters (32 bytes)
        return /^[0-9a-fA-F]{64}$/.test(id);
    }
}
// Export a default instance for convenience
const chiaCloudWalletClient = new ChiaCloudWalletClient();

const STORAGE_KEY = 'chia_wallet_state';
const BACKGROUND_UPDATE_INTERVAL = 60000; // 1 minute
function useChiaWallet(config = {}) {
    const clientRef = React.useRef(null);
    const backgroundUpdateRef = React.useRef(null);
    // Initialize client
    if (!clientRef.current) {
        clientRef.current = new ChiaCloudWalletClient({
            baseUrl: config.baseUrl,
            enableLogging: config.enableLogging,
        });
    }
    const client = clientRef.current;
    // Wallet state
    const [state, setState] = React.useState({
        isConnected: false,
        isConnecting: false,
        jwtToken: null,
        publicKey: null,
        publicKeyData: null,
        syntheticPublicKey: null,
        balance: 0,
        coinCount: 0,
        unspentCoins: [],
        hydratedCoins: [],
        balanceLoading: false,
        error: null,
        balanceError: null,
        lastSuccessfulRefresh: 0,
    });
    // Load persisted state on mount
    React.useEffect(() => {
        const loadPersistedState = () => {
            try {
                const stored = localStorage.getItem(STORAGE_KEY);
                if (stored) {
                    const parsedState = JSON.parse(stored);
                    // Validate that the stored state is not too old (24 hours)
                    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
                    if (Date.now() - parsedState.timestamp < maxAge) {
                        setState(prevState => ({
                            ...prevState,
                            isConnected: parsedState.isConnected || false,
                            jwtToken: parsedState.jwtToken || null,
                            publicKey: parsedState.publicKey || null,
                            publicKeyData: parsedState.publicKeyData || null,
                            syntheticPublicKey: parsedState.syntheticPublicKey || null,
                            balance: parsedState.balance ? parseInt(parsedState.balance) : 0,
                            coinCount: parsedState.coinCount || 0,
                            unspentCoins: parsedState.unspentCoins?.map((coin) => ({
                                ...coin,
                                amount: coin.amount.toString()
                            })) || [],
                            hydratedCoins: parsedState.hydratedCoins?.map((coin) => ({
                                ...coin,
                                coin: {
                                    ...coin.coin,
                                    amount: coin.coin.amount.toString()
                                }
                            })) || [],
                            lastSuccessfulRefresh: parsedState.lastSuccessfulRefresh || 0,
                        }));
                        // Set JWT token on client if available
                        if (parsedState.jwtToken && client) {
                            client.setJwtToken(parsedState.jwtToken);
                        }
                    }
                }
            }
            catch (error) {
                console.error('Failed to load persisted wallet state:', error);
            }
        };
        loadPersistedState();
    }, [client]);
    // Save state to localStorage whenever it changes
    const saveState = React.useCallback((currentState) => {
        try {
            const stateToSave = {
                ...currentState,
                balance: currentState.balance.toString(), // Convert BigInt to string
                unspentCoins: currentState.unspentCoins.map(coin => ({
                    ...coin,
                    amount: coin.amount.toString()
                })),
                hydratedCoins: currentState.hydratedCoins.map(coin => ({
                    ...coin,
                    coin: {
                        ...coin.coin,
                        amount: coin.coin.amount.toString()
                    }
                })),
                timestamp: Date.now(),
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
        }
        catch (error) {
            console.error('Failed to save wallet state:', error);
        }
    }, []);
    // Setup background updates when connected
    React.useEffect(() => {
        if (state.isConnected && state.publicKey && !state.balanceLoading) {
            backgroundUpdateRef.current = window.setInterval(() => {
                refreshWallet();
            }, BACKGROUND_UPDATE_INTERVAL);
        }
        else {
            if (backgroundUpdateRef.current) {
                clearInterval(backgroundUpdateRef.current);
                backgroundUpdateRef.current = null;
            }
        }
        return () => {
            if (backgroundUpdateRef.current) {
                clearInterval(backgroundUpdateRef.current);
                backgroundUpdateRef.current = null;
            }
        };
    }, [state.isConnected, state.publicKey, state.balanceLoading]);
    // Set JWT token
    const setJwtToken = React.useCallback((token) => {
        setState(prevState => {
            const newState = { ...prevState, jwtToken: token };
            saveState(newState);
            return newState;
        });
        if (token && client) {
            client.setJwtToken(token);
            // Auto-connect if enabled
            if (config.autoConnect !== false) {
                connectWallet();
            }
        }
        else {
            disconnectWallet();
        }
    }, [client, config.autoConnect]);
    // Connect wallet
    const connectWallet = React.useCallback(async () => {
        if (!client || !state.jwtToken) {
            setState(prevState => ({
                ...prevState,
                error: 'JWT token is required for wallet connection'
            }));
            return;
        }
        setState(prevState => ({ ...prevState, isConnecting: true, error: null }));
        try {
            // Get public key first
            const pkResponse = await client.getPublicKey();
            if (!pkResponse.success) {
                throw new Error(pkResponse.error);
            }
            const newState = {
                isConnected: true,
                isConnecting: false,
                publicKeyData: pkResponse.data,
                publicKey: pkResponse.data.address,
                syntheticPublicKey: pkResponse.data.synthetic_public_key,
                error: null,
            };
            setState(prevState => {
                const updatedState = { ...prevState, ...newState };
                saveState(updatedState);
                return updatedState;
            });
            // Load wallet balance
            await refreshWallet();
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to connect wallet';
            setState(prevState => ({
                ...prevState,
                isConnecting: false,
                error: errorMessage,
                isConnected: false,
                publicKey: null,
                publicKeyData: null,
                syntheticPublicKey: null,
            }));
        }
    }, [client, state.jwtToken]);
    // Disconnect wallet
    const disconnectWallet = React.useCallback(() => {
        // Clear background updates
        if (backgroundUpdateRef.current) {
            clearInterval(backgroundUpdateRef.current);
            backgroundUpdateRef.current = null;
        }
        const newState = {
            isConnected: false,
            isConnecting: false,
            jwtToken: null,
            publicKey: null,
            publicKeyData: null,
            syntheticPublicKey: null,
            balance: 0,
            coinCount: 0,
            unspentCoins: [],
            hydratedCoins: [],
            balanceLoading: false,
            error: null,
            balanceError: null,
            lastSuccessfulRefresh: 0,
        };
        setState(newState);
        // Clear persisted state
        try {
            localStorage.removeItem(STORAGE_KEY);
        }
        catch (error) {
            console.error('Failed to clear wallet state:', error);
        }
        // Reset client
        if (client) {
            client.setJwtToken(undefined);
        }
    }, [client]);
    // Refresh wallet data
    const refreshWallet = React.useCallback(async () => {
        if (!client || !state.publicKey) {
            return;
        }
        setState(prevState => ({ ...prevState, balanceLoading: true, balanceError: null }));
        try {
            const hydratedResult = await client.getUnspentHydratedCoins(state.publicKey);
            if (!hydratedResult.success) {
                throw new Error(hydratedResult.error);
            }
            // Extract simple coins from hydrated coins for backward compatibility
            const coins = ChiaCloudWalletClient.extractCoinsFromHydratedCoins(hydratedResult.data.data);
            let totalBalance = 0;
            // Calculate balance from coins
            for (const coin of coins) {
                try {
                    totalBalance += parseInt(coin.amount);
                }
                catch (coinError) {
                    console.warn('Invalid coin amount:', coin.amount, coinError);
                    // Continue with other coins
                }
            }
            const newState = {
                balance: totalBalance,
                coinCount: coins.length,
                hydratedCoins: hydratedResult.data.data,
                unspentCoins: coins,
                lastSuccessfulRefresh: Date.now(),
                balanceLoading: false,
                balanceError: null,
            };
            setState(prevState => {
                const updatedState = { ...prevState, ...newState };
                saveState(updatedState);
                return updatedState;
            });
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to load wallet balance';
            setState(prevState => ({
                ...prevState,
                balanceLoading: false,
                balanceError: errorMessage,
            }));
        }
    }, [client, state.publicKey]);
    // Utility functions
    const formatBalance = React.useCallback((balance) => {
        const result = ChiaCloudWalletClient.mojosToXCH(balance);
        if (!result.success)
            return '0';
        // Format to remove trailing zeros
        let formatted = result.data.toFixed(13);
        formatted = formatted.replace(/\.?0+$/, '');
        return formatted;
    }, []);
    const formatAddress = React.useCallback((address) => {
        if (!address)
            return '';
        return `${address.substring(0, 10)}...${address.substring(address.length - 10)}`;
    }, []);
    // Auto-connect on mount if JWT token is available
    React.useEffect(() => {
        if (state.jwtToken && !state.isConnected && !state.isConnecting && config.autoConnect !== false) {
            connectWallet();
        }
    }, [state.jwtToken, state.isConnected, state.isConnecting, config.autoConnect, connectWallet]);
    return {
        ...state,
        client,
        setJwtToken,
        connectWallet,
        disconnectWallet,
        refreshWallet,
        formatBalance,
        formatAddress,
    };
}

const TRANSACTIONS_STORAGE_KEY = 'chia_transactions';
function useChiaTransactions(client, unspentCoins) {
    const [transactions, setTransactions] = React.useState([]);
    const [isSending, setIsSending] = React.useState(false);
    const [sendError, setSendError] = React.useState(null);
    // Load transactions from localStorage on initialization
    const loadTransactions = React.useCallback(() => {
        try {
            const stored = localStorage.getItem(TRANSACTIONS_STORAGE_KEY);
            if (stored) {
                const parsedTransactions = JSON.parse(stored);
                // Convert amount and fee strings back to numbers
                const convertedTransactions = parsedTransactions.map((tx) => ({
                    ...tx,
                    amount: parseInt(tx.amount),
                    fee: parseInt(tx.fee || '0'),
                }));
                // Filter out transactions older than 30 days
                const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
                const recentTransactions = convertedTransactions.filter((tx) => tx.timestamp > thirtyDaysAgo);
                setTransactions(recentTransactions);
                // Save cleaned transactions back if we filtered any
                if (recentTransactions.length !== convertedTransactions.length) {
                    saveTransactions(recentTransactions);
                }
            }
        }
        catch (error) {
            console.error('Failed to load transactions from localStorage:', error);
        }
    }, []);
    // Save transactions to localStorage
    const saveTransactions = React.useCallback((txs) => {
        try {
            // Convert numbers to string for consistent JSON serialization
            const serializableTransactions = txs.map(tx => ({
                ...tx,
                amount: tx.amount.toString(),
                fee: tx.fee.toString(),
            }));
            localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(serializableTransactions));
        }
        catch (error) {
            console.error('Failed to save transactions to localStorage:', error);
        }
    }, []);
    // Validate Chia address using bech32m
    const validateChiaAddress = React.useCallback((address) => {
        try {
            if (!address || typeof address !== 'string') {
                return { isValid: false, error: 'Address must be a non-empty string' };
            }
            const decoded = bech32m.decode(address);
            if (decoded.prefix !== 'xch') {
                return { isValid: false, error: 'Invalid address prefix: must be "xch"' };
            }
            if (decoded.words.length !== 52) {
                return { isValid: false, error: 'Invalid address data length' };
            }
            return { isValid: true };
        }
        catch (err) {
            return {
                isValid: false,
                error: err instanceof Error ? `Invalid address encoding: ${err.message}` : 'Invalid address encoding',
            };
        }
    }, []);
    // Select coins for a transaction amount
    const selectCoinsForAmount = React.useCallback((totalNeededMojos) => {
        if (!unspentCoins || unspentCoins.length === 0) {
            return null;
        }
        // Sort coins by amount descending (largest first)
        const sortedCoins = [...unspentCoins].sort((a, b) => {
            const amountA = parseInt(a.amount);
            const amountB = parseInt(b.amount);
            return amountB - amountA;
        });
        const selectedCoins = [];
        let totalSelected = 0;
        // Greedy selection: pick coins until we have enough
        for (const coin of sortedCoins) {
            selectedCoins.push(coin);
            totalSelected += parseInt(coin.amount);
            if (totalSelected >= totalNeededMojos) {
                break;
            }
        }
        // Check if we have enough
        if (totalSelected < totalNeededMojos) {
            return null;
        }
        return selectedCoins;
    }, [unspentCoins]);
    // Send XCH transaction
    const sendXCH = React.useCallback(async (recipientAddress, amountXCH, feeXCH = 0.00001) => {
        if (!client) {
            setSendError('Wallet client not available');
            return false;
        }
        setIsSending(true);
        setSendError(null);
        try {
            // Validate recipient address
            const addressValidation = validateChiaAddress(recipientAddress);
            if (!addressValidation.isValid) {
                throw new Error(addressValidation.error || 'Invalid Chia address format');
            }
            // Validate amounts
            if (amountXCH <= 0) {
                throw new Error('Amount must be greater than zero');
            }
            if (feeXCH < 0) {
                throw new Error('Fee cannot be negative');
            }
            // Convert amounts to mojos
            const amountResult = ChiaCloudWalletClient.xchToMojos(amountXCH);
            const feeResult = ChiaCloudWalletClient.xchToMojos(feeXCH);
            if (!amountResult.success) {
                throw new Error(`Invalid amount: ${amountResult.error}`);
            }
            if (!feeResult.success) {
                throw new Error(`Invalid fee: ${feeResult.error}`);
            }
            const totalNeededMojos = parseInt(amountResult.data) + parseInt(feeResult.data);
            // Select coins
            const selectedCoins = selectCoinsForAmount(totalNeededMojos);
            if (!selectedCoins) {
                const availableBalance = unspentCoins.reduce((sum, coin) => sum + parseInt(coin.amount), 0);
                const availableXCH = ChiaCloudWalletClient.mojosToXCHUnsafe(availableBalance);
                const neededXCH = ChiaCloudWalletClient.mojosToXCHUnsafe(totalNeededMojos);
                throw new Error(`Insufficient balance. Need ${neededXCH.toFixed(6)} XCH, have ${availableXCH.toFixed(6)} XCH`);
            }
            // Create transaction request
            const request = {
                payments: [{
                        address: recipientAddress,
                        amount: amountResult.data,
                    }],
                selected_coins: selectedCoins,
                fee: feeResult.data,
            };
            // Send and broadcast transaction
            const result = await client.sendAndBroadcastXCH(request);
            if (!result.success) {
                throw new Error(result.error);
            }
            // Create transaction record
            const transactionRecord = {
                id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                type: 'outgoing',
                amount: parseInt(amountResult.data),
                recipient: recipientAddress,
                fee: parseInt(feeResult.data),
                timestamp: Date.now(),
                status: 'pending',
                transactionId: result.data.transaction_id,
                blockchainStatus: result.data.status,
            };
            // Add transaction to list
            const updatedTransactions = [...transactions, transactionRecord];
            setTransactions(updatedTransactions);
            saveTransactions(updatedTransactions);
            // Start confirmation checking (simplified - in a real app you'd want more sophisticated checking)
            setTimeout(() => {
                setTransactions(prevTransactions => prevTransactions.map(tx => tx.id === transactionRecord.id ? { ...tx, status: 'confirmed' } : tx));
            }, 30000); // Mark as confirmed after 30 seconds (placeholder)
            return true;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to send transaction';
            setSendError(errorMessage);
            return false;
        }
        finally {
            setIsSending(false);
        }
    }, [client, unspentCoins, transactions, validateChiaAddress, selectCoinsForAmount, saveTransactions]);
    // Add a transaction record (for external transactions)
    const addTransaction = React.useCallback((transaction) => {
        const updatedTransactions = [...transactions, transaction];
        setTransactions(updatedTransactions);
        saveTransactions(updatedTransactions);
    }, [transactions, saveTransactions]);
    // Clear all transactions
    const clearTransactions = React.useCallback(() => {
        setTransactions([]);
        try {
            localStorage.removeItem(TRANSACTIONS_STORAGE_KEY);
        }
        catch (error) {
            console.error('Failed to clear transactions from localStorage:', error);
        }
    }, []);
    // Load transactions on mount
    React.useEffect(() => {
        loadTransactions();
    }, [loadTransactions]);
    return {
        transactions,
        isSending,
        sendError,
        sendXCH,
        addTransaction,
        clearTransactions,
        validateChiaAddress,
    };
}

const ChiaWalletModal = ({ isOpen, onClose, wallet, }) => {
    if (!isOpen)
        return null;
    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };
    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            onClose();
        }
    };
    return (jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [jsxRuntime.jsx("div", { className: "modal-overlay", onClick: handleOverlayClick, onKeyDown: handleKeyDown, role: "dialog", "aria-modal": "true", tabIndex: 0, children: jsxRuntime.jsxs("div", { className: "modal-content", role: "document", tabIndex: 0, children: [jsxRuntime.jsxs("div", { className: "modal-header", children: [jsxRuntime.jsxs("div", { className: "wallet-info", children: [jsxRuntime.jsx("div", { className: "wallet-icon", children: jsxRuntime.jsx("div", { className: "chia-logo", children: "\uD83C\uDF31" }) }), jsxRuntime.jsxs("div", { className: "wallet-details", children: [jsxRuntime.jsx("h3", { children: wallet.publicKey ? wallet.formatAddress(wallet.publicKey) : 'Chia Wallet' }), jsxRuntime.jsx("p", { className: "connection-status", children: wallet.isConnecting ? 'Connecting...' :
                                                        wallet.isConnected ? 'Connected' : 'Not connected' })] })] }), jsxRuntime.jsx("button", { className: "close-btn", onClick: onClose, "aria-label": "Close modal", children: jsxRuntime.jsxs("svg", { width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [jsxRuntime.jsx("line", { x1: "18", y1: "6", x2: "6", y2: "18" }), jsxRuntime.jsx("line", { x1: "6", y1: "6", x2: "18", y2: "18" })] }) })] }), jsxRuntime.jsx("div", { className: "modal-body", children: wallet.isConnecting ? (jsxRuntime.jsxs("div", { className: "loading-state", children: [jsxRuntime.jsx("div", { className: "spinner" }), jsxRuntime.jsx("p", { children: "Connecting to wallet..." })] })) : wallet.error ? (jsxRuntime.jsxs("div", { className: "error-state", children: [jsxRuntime.jsx("p", { className: "error-message", children: wallet.error }), jsxRuntime.jsx("button", { className: "retry-btn", onClick: wallet.connectWallet, children: "Retry" })] })) : wallet.isConnected ? (jsxRuntime.jsxs("div", { className: "wallet-info-section", children: [jsxRuntime.jsx("div", { className: "balance-section", children: jsxRuntime.jsxs("div", { className: "balance-item", children: [jsxRuntime.jsx("div", { className: "balance-icon", children: "\uD83C\uDF31" }), jsxRuntime.jsxs("div", { className: "balance-details", children: [jsxRuntime.jsx("h4", { children: "Chia (XCH)" }), wallet.balanceLoading ? (jsxRuntime.jsxs("div", { className: "balance-loading", children: [jsxRuntime.jsx("div", { className: "balance-spinner" }), jsxRuntime.jsx("p", { className: "balance-amount syncing", children: "Syncing..." })] })) : wallet.balanceError ? (jsxRuntime.jsxs("div", { className: "balance-error", children: [jsxRuntime.jsx("p", { className: "balance-amount error", children: "Failed to load" }), jsxRuntime.jsx("button", { className: "balance-retry", onClick: wallet.refreshWallet, children: "Retry" })] })) : (jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [jsxRuntime.jsxs("p", { className: "balance-amount", children: [wallet.formatBalance(wallet.balance), " XCH"] }), jsxRuntime.jsxs("p", { className: "balance-subtitle", children: [wallet.coinCount, " coins"] })] }))] })] }) }), jsxRuntime.jsxs("div", { className: "action-buttons", children: [jsxRuntime.jsxs("button", { className: "action-btn primary", children: [jsxRuntime.jsxs("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [jsxRuntime.jsx("line", { x1: "7", y1: "17", x2: "17", y2: "7" }), jsxRuntime.jsx("polyline", { points: "7,7 17,7 17,17" })] }), "Send"] }), jsxRuntime.jsxs("button", { className: "action-btn secondary", children: [jsxRuntime.jsxs("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [jsxRuntime.jsx("line", { x1: "17", y1: "7", x2: "7", y2: "17" }), jsxRuntime.jsx("polyline", { points: "17,17 7,17 7,7" })] }), "Receive"] })] }), jsxRuntime.jsxs("button", { className: "disconnect-btn", onClick: wallet.disconnectWallet, children: [jsxRuntime.jsxs("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [jsxRuntime.jsx("path", { d: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" }), jsxRuntime.jsx("polyline", { points: "16,17 21,12 16,7" }), jsxRuntime.jsx("line", { x1: "21", y1: "12", x2: "9", y2: "12" })] }), jsxRuntime.jsx("span", { children: "Disconnect Wallet" })] })] })) : (jsxRuntime.jsxs("div", { className: "connect-state", children: [jsxRuntime.jsx("p", { children: "Connect your Chia wallet to get started" }), jsxRuntime.jsx("button", { className: "connect-btn", onClick: wallet.connectWallet, children: "Connect Wallet" })] })) })] }) }), jsxRuntime.jsx("style", { children: `
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          backdrop-filter: blur(4px);
        }

        .modal-content {
          background: #1a1a1a;
          border-radius: 16px;
          width: 90%;
          max-width: 400px;
          max-height: 90vh;
          overflow-y: auto;
          border: 1px solid #333;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
          color: white;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid #333;
        }

        .wallet-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .wallet-icon {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: linear-gradient(45deg, #6bc36b, #4a9f4a);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .chia-logo {
          font-size: 24px;
        }

        .wallet-details h3 {
          margin: 0;
          color: white;
          font-size: 16px;
          font-weight: 600;
        }

        .connection-status {
          margin: 0;
          color: #888;
          font-size: 14px;
        }

        .close-btn {
          background: none;
          border: none;
          color: #888;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          transition: all 0.2s;
        }

        .close-btn:hover {
          color: white;
          background: #333;
        }

        .modal-body {
          padding: 20px;
        }

        .loading-state, .error-state, .connect-state {
          text-align: center;
          padding: 40px 20px;
        }

        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #333;
          border-top: 3px solid #6bc36b;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 16px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .error-message {
          color: #ef4444;
          margin-bottom: 16px;
        }

        .retry-btn, .connect-btn {
          background: #6bc36b;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s;
        }

        .retry-btn:hover, .connect-btn:hover {
          background: #4a9f4a;
          transform: translateY(-1px);
        }

        .balance-section {
          margin-bottom: 24px;
        }

        .balance-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          background: #262626;
          border-radius: 12px;
          border: 1px solid #333;
        }

        .balance-icon {
          font-size: 24px;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #333;
          border-radius: 50%;
        }

        .balance-details h4 {
          margin: 0;
          color: white;
          font-size: 16px;
          font-weight: 600;
        }

        .balance-amount {
          margin: 4px 0;
          color: #22c55e;
          font-size: 18px;
          font-weight: 700;
        }

        .balance-amount.syncing {
          color: #fb923c;
        }

        .balance-amount.error {
          color: #ef4444;
        }

        .balance-subtitle {
          margin: 0;
          color: #888;
          font-size: 14px;
        }

        .balance-loading {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .balance-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid #333;
          border-top: 2px solid #fb923c;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .balance-error {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .balance-retry {
          background: #ef4444;
          color: white;
          border: none;
          padding: 4px 8px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          transition: all 0.2s;
        }

        .balance-retry:hover {
          background: #dc2626;
        }

        .action-buttons {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
        }

        .action-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 16px;
          border-radius: 12px;
          border: none;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s;
        }

        .action-btn.primary {
          background: #6bc36b;
          color: white;
        }

        .action-btn.primary:hover {
          background: #4a9f4a;
          transform: translateY(-1px);
        }

        .action-btn.secondary {
          background: #333;
          color: white;
        }

        .action-btn.secondary:hover {
          background: #404040;
          transform: translateY(-1px);
        }

        .disconnect-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 16px;
          background: none;
          border: 1px solid #333;
          color: #888;
          cursor: pointer;
          border-radius: 8px;
          transition: all 0.2s;
        }

        .disconnect-btn:hover {
          background: #333;
          color: white;
        }
      ` })] }));
};

const ChiaWalletButton = ({ jwtToken = null, variant = 'primary', size = 'medium', disabled = false, baseUrl, enableLogging, autoConnect = true, onWalletUpdate, className = '', style, }) => {
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const wallet = useChiaWallet({
        baseUrl,
        enableLogging,
        autoConnect,
    });
    // Set JWT token when it changes
    React.useEffect(() => {
        if (jwtToken !== wallet.jwtToken) {
            wallet.setJwtToken(jwtToken);
        }
    }, [jwtToken, wallet]);
    // Call onWalletUpdate when wallet state changes
    React.useEffect(() => {
        if (onWalletUpdate) {
            onWalletUpdate({
                isConnected: wallet.isConnected,
                publicKey: wallet.publicKey,
                publicKeyData: wallet.publicKeyData,
                balance: wallet.balance,
                coinCount: wallet.coinCount,
                error: wallet.error,
            });
        }
    }, [
        wallet.isConnected,
        wallet.publicKey,
        wallet.publicKeyData,
        wallet.balance,
        wallet.coinCount,
        wallet.error,
        onWalletUpdate,
    ]);
    const openModal = () => {
        if (!disabled) {
            setIsModalOpen(true);
        }
    };
    const closeModal = () => {
        setIsModalOpen(false);
    };
    const formatAddress = (address) => {
        if (!address)
            return '';
        return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
    };
    const formatBalance = (balance) => {
        return wallet.formatBalance(balance);
    };
    const getButtonClasses = () => {
        const baseClasses = 'chia-wallet-btn';
        const variantClass = variant;
        const sizeClass = size;
        const stateClasses = [
            wallet.isConnected ? 'connected' : '',
            wallet.isConnecting ? 'connecting' : '',
            disabled ? 'disabled' : '',
        ].filter(Boolean).join(' ');
        return [baseClasses, variantClass, sizeClass, stateClasses, className]
            .filter(Boolean)
            .join(' ');
    };
    return (jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [jsxRuntime.jsx("button", { className: getButtonClasses(), onClick: openModal, disabled: disabled, "aria-label": "Open Chia wallet", style: style, children: jsxRuntime.jsxs("div", { className: "btn-content", children: [jsxRuntime.jsx("div", { className: "chia-icon", children: "\uD83C\uDF31" }), jsxRuntime.jsx("div", { className: "btn-text-content", children: wallet.isConnecting ? (jsxRuntime.jsx("span", { className: "btn-text", children: "Connecting..." })) : wallet.isConnected && wallet.publicKey ? (jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [jsxRuntime.jsx("span", { className: "btn-text connected-text", children: formatAddress(wallet.publicKey) }), wallet.balance > 0 ? (jsxRuntime.jsxs("span", { className: "btn-balance", children: [formatBalance(wallet.balance), " XCH"] })) : (jsxRuntime.jsx("span", { className: "btn-balance", children: "Click to view balance" }))] })) : (jsxRuntime.jsx("span", { className: "btn-text", children: jwtToken ? 'Chia Wallet' : 'Connect Chia' })) })] }) }), jsxRuntime.jsx(ChiaWalletModal, { isOpen: isModalOpen, onClose: closeModal, wallet: wallet }), jsxRuntime.jsx("style", { children: `
        .chia-wallet-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s ease;
          position: relative;
          overflow: hidden;
          font-family: inherit;
          min-width: 120px;
        }

        .chia-wallet-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(45deg, #6bc36b, #4a9f4a);
          opacity: 0;
          transition: opacity 0.2s ease;
        }

        .chia-wallet-btn:hover::before {
          opacity: 0.1;
        }

        .chia-wallet-btn.primary {
          background: linear-gradient(45deg, #6bc36b, #4a9f4a);
          color: white;
        }

        .chia-wallet-btn.primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(107, 195, 107, 0.3);
        }

        .chia-wallet-btn.secondary {
          background: transparent;
          color: #6bc36b;
          border: 2px solid #6bc36b;
        }

        .chia-wallet-btn.secondary:hover {
          background: #6bc36b;
          color: white;
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(107, 195, 107, 0.3);
        }

        /* Connected state styling */
        .chia-wallet-btn.connected {
          background: linear-gradient(45deg, #22c55e, #16a34a) !important;
          color: white !important;
          border-color: #22c55e !important;
        }

        .chia-wallet-btn.connected:hover {
          background: linear-gradient(45deg, #16a34a, #15803d) !important;
          box-shadow: 0 8px 25px rgba(34, 197, 94, 0.3) !important;
        }

        /* Connecting state styling */
        .chia-wallet-btn.connecting {
          background: linear-gradient(45deg, #f59e0b, #d97706) !important;
          color: white !important;
          cursor: not-allowed !important;
        }

        .chia-wallet-btn.small {
          padding: 8px 16px;
          font-size: 14px;
          border-radius: 8px;
          min-width: 100px;
        }

        .chia-wallet-btn.medium {
          padding: 12px 24px;
          font-size: 16px;
          min-width: 140px;
        }

        .chia-wallet-btn.large {
          padding: 16px 32px;
          font-size: 18px;
          border-radius: 16px;
          min-width: 160px;
        }

        .chia-wallet-btn.disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none !important;
          box-shadow: none !important;
        }

        .btn-content {
          display: flex;
          align-items: center;
          gap: 8px;
          position: relative;
          z-index: 1;
        }

        .btn-text-content {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 2px;
        }

        .chia-icon {
          font-size: 1.2em;
          flex-shrink: 0;
        }

        .btn-text {
          white-space: nowrap;
          line-height: 1;
        }

        .connected-text {
          font-weight: 600;
          font-family: monospace;
        }

        .btn-balance {
          font-size: 0.8em;
          opacity: 0.9;
          font-weight: 500;
          line-height: 1;
          white-space: nowrap;
        }

        /* Responsive adjustments */
        @media (max-width: 640px) {
          .chia-wallet-btn.medium {
            padding: 10px 20px;
            font-size: 14px;
            min-width: 120px;
          }
          
          .chia-wallet-btn.large {
            padding: 14px 28px;
            font-size: 16px;
            min-width: 140px;
          }

          .btn-content {
            gap: 6px;
          }

          .btn-balance {
            font-size: 0.75em;
          }
        }
      ` })] }));
};

exports.ChiaCloudWalletApiError = ChiaCloudWalletApiError;
exports.ChiaCloudWalletClient = ChiaCloudWalletClient;
exports.ChiaWalletButton = ChiaWalletButton;
exports.ChiaWalletModal = ChiaWalletModal;
exports.chiaCloudWalletClient = chiaCloudWalletClient;
exports.normalizeCoin = normalizeCoin;
exports.normalizeCoins = normalizeCoins;
exports.useChiaTransactions = useChiaTransactions;
exports.useChiaWallet = useChiaWallet;
//# sourceMappingURL=index.js.map
