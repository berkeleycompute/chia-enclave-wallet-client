import React from 'react';
import { PiArrowSquareOut, PiCaretLeft, PiX } from 'react-icons/pi';
import { useWalletConnection } from '../hooks/useChiaWalletSDK';
import {
  useSpacescanXCHTransactions,
  useSpacescanNFTTransactions,
  useSpacescanTokenTransactions,
  getTokenDisplayName
} from '../client/SpacescanClient';

interface TransactionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCloseWallet?: () => void;
}

export const TransactionsModal: React.FC<TransactionsModalProps> = ({
  isOpen,
  onClose,
  onCloseWallet
}) => {
  const { isConnected, address } = useWalletConnection();

  const xchTx = useSpacescanXCHTransactions(address, 100, 0);
  const nftTx = useSpacescanNFTTransactions(address, 100, 0);
  const tokenTx = useSpacescanTokenTransactions(address, 100, 0);

  const allTransactions = React.useMemo(() => {
    return [
      ...xchTx.transactions.map(t => ({ ...t, type: 'XCH' as const })),
      ...nftTx.transactions.map(t => ({ ...t, type: 'NFT' as const })),
      ...tokenTx.transactions.map(t => ({ ...t, type: 'TOKEN' as const })),
    ];
  }, [xchTx.transactions, nftTx.transactions, tokenTx.transactions]);

  const loading = xchTx.loading || nftTx.loading || tokenTx.loading;
  const error = xchTx.error || nftTx.error || tokenTx.error;

  const formatTime = (timestamp?: number): string => {
    if (!timestamp) return '';
    const now = Date.now();
    const diff = now - timestamp * 1000; // spacescan uses seconds
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 2592000000) return `${Math.floor(diff / 86400000)}d ago`;
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  const formatAmount = (tx: any): string => {
    if (tx.type === 'XCH') {
      const amount = (Math.abs(tx.amount || 0) / 1_000_000_000_000).toFixed(6);
      return `${amount} XCH`;
    }
    if (tx.type === 'TOKEN') {
      const display = getTokenDisplayName(tx.asset_id || '', (tx.data as any)?.token_id);
      const amount = (Math.abs(tx.amount || 0) / 1_000_000_000_000).toFixed(6);
      return `${amount} ${display}`;
    }
    if (tx.type === 'NFT') {
      return '1 NFT';
    }
    return '';
  };

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay fixed inset-0 bg-black/70 flex items-center justify-center backdrop-blur-sm"
      style={{ zIndex: 1001 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      tabIndex={0}
    >
      <div className="modal-content bg-[#131418] rounded-2xl w-[90%] max-w-[640px] max-h-[90vh] overflow-y-auto border border-[#272830] text-[#EEEEF0]" role="document" tabIndex={0}>
        <div className="flex justify-between items-center px-4 py-5">
          <button className="bg-transparent border-0 text-[#7C7A85] p-1 rounded transition-colors flex items-center justify-center w-6 h-6 hover:text-[#EEEEF0]" onClick={onClose} aria-label="Back">
            <PiCaretLeft size={24} />
          </button>
          <h3 className="m-0 text-[#EEEEF0] text-xl font-medium leading-[1.5] text-left">Transactions</h3>
          <button className="bg-transparent border-0 text-[#7C7A85] p-1 rounded transition-colors flex items-center justify-center w-6 h-6 hover:text-[#EEEEF0]" onClick={onCloseWallet || onClose} aria-label="Close modal">
            <PiX size={24} />
          </button>
        </div>

        <div className="px-6 border-b border-t border-[#272830]">
          {!isConnected ? (
            <div className="text-center py-10">
              <p className="text-[#ef4444]">Wallet not connected. Please connect your wallet first.</p>
            </div>
          ) : loading ? (
            <div className="text-center py-10">
              <div className="w-8 h-8 border-2 border-[#272830] border-t-[#2C64F8] rounded-full animate-spin mx-auto mb-4"></div>
              <p>Loading transactions...</p>
            </div>
          ) : error ? (
            <div className="text-center py-10">
              <p className="text-[#ef4444]">Error loading transactions: {error}</p>
            </div>
          ) : allTransactions.length === 0 ? (
            <div className="text-center py-10">
              <p className="">No transactions yet</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {allTransactions.map((tx: any, index: number) => {
                const isOutgoing = tx.spent_at_time !== undefined; // spent -> outgoing
                return (
                  <div key={tx.id} className={`max-h-[330px] overflow-y-scroll flex flex-col items-center justify-between p-2 rounded-lg border 
                    ${isOutgoing ? 'border-[#3a2a2a] bg-[#241d1d]' : 'border-[#27352a] bg-[#1d241f]'}
                    ${index === allTransactions.length - 1 ? 'mb-2' : 'mb-0'}
                    ${index === 0 ? 'mt-2' : 'mt-0'}`
                  }>
                    <div className="flex flex-col items-center p-3.5">
                      <div className="text-white">
                        {isOutgoing ? '-' : '+'}{formatAmount(tx)}
                      </div>
                      <div className="flex flex-row justify-between">
                        <div className="text-[#7C7A85] text-xs">
                          {tx.type === 'XCH' ? 'XCH Transaction' : tx.type === 'NFT' ? `NFT ${tx.nft_id ? tx.nft_id.slice(0, 8) + '...' : ''}` : `Token ${getTokenDisplayName(tx.asset_id || '', (tx.data as any)?.token_id)}`}
                        </div>
                        <div className="text-[#7C7A85] text-xs">{formatTime(tx.confirmed_at_time || tx.created_at_time || tx.spent_at_time)}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-3.5">
          <button className="w-full text-[#EEEEF0] rounded-lg py-2.5 px-5 items-center justify-center gap-2 hover:bg-[#333] border border-[#272830] flex flex-row gap-2"
            onClick={() => window.open(`https://www.spacescan.io/address/${address}`, '_blank')}
          >
            View on Explorer <PiArrowSquareOut size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};


