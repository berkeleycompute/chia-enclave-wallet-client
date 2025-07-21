import { ChiaCloudWalletClient, type Coin } from '../client/ChiaCloudWalletClient.ts';
export interface TransactionRecord {
    id: string;
    type: 'outgoing' | 'incoming';
    amount: number;
    recipient?: string;
    sender?: string;
    fee: number;
    timestamp: number;
    status: 'pending' | 'confirmed' | 'failed';
    transactionId?: string;
    blockchainStatus?: string;
}
export interface UseChiaTransactionsResult {
    transactions: TransactionRecord[];
    isSending: boolean;
    sendError: string | null;
    sendXCH: (recipientAddress: string, amountXCH: number, feeXCH?: number) => Promise<boolean>;
    addTransaction: (transaction: TransactionRecord) => void;
    clearTransactions: () => void;
    validateChiaAddress: (address: string) => {
        isValid: boolean;
        error?: string;
    };
}
export declare function useChiaTransactions(client: ChiaCloudWalletClient, unspentCoins: Coin[]): UseChiaTransactionsResult;
