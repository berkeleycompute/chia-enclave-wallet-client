import React from 'react';
import { PiArrowSquareOut } from 'react-icons/pi';
import { useWalletConnection, useRawSDK } from '../hooks/useChiaWalletSDK';
import {
  useSpacescanXCHTransactions,
  useSpacescanNFTTransactions,
  useSpacescanTokenTransactions,
  getTokenDisplayName
} from '../client/SpacescanClient';

interface TransactionsModalProps {
  isOpen: boolean;
}

export const TransactionsModal: React.FC<TransactionsModalProps> = ({
  isOpen,
}) => {
  const { isConnected, address } = useWalletConnection();
  const sdk = useRawSDK();
  
  // Pass wallet client to Spacescan hooks to ensure correct environment (production vs dev)
  const xchTx = useSpacescanXCHTransactions(address, 100, 0, 500, sdk?.client);
  const nftTx = useSpacescanNFTTransactions(address, 100, 0, 500, sdk?.client);
  const tokenTx = useSpacescanTokenTransactions(address, 100, 0, 500, sdk?.client);

  const allTransactions = React.useMemo(() => {
    const normalize = (items: any[], type: 'XCH' | 'NFT' | 'TOKEN', direction: 'in' | 'out') =>
      (items || []).map((t: any) => ({ ...t, type, direction }));
    const items = [
      ...normalize(xchTx.receivedTransactions || [], 'XCH', 'in'),
      ...normalize(xchTx.sentTransactions || [], 'XCH', 'out'),
      ...normalize(nftTx.receivedTransactions || [], 'NFT', 'in'),
      ...normalize(nftTx.sentTransactions || [], 'NFT', 'out'),
      ...normalize(tokenTx.receivedTransactions || [], 'TOKEN', 'in'),
      ...normalize(tokenTx.sentTransactions || [], 'TOKEN', 'out'),
    ];
    // Sort by time desc if available
    const toMs = (t: any) => {
      if (!t) return 0;
      if (typeof t === 'string') {
        const ms = Date.parse(t);
        return isNaN(ms) ? 0 : ms;
      }
      if (typeof t === 'number') {
        return t > 1e12 ? t : t * 1000;
      }
      return 0;
    };
    return items.sort((a: any, b: any) => (toMs(b.time || b.confirmed_at_time || b.created_at_time || b.spent_at_time) - toMs(a.time || a.confirmed_at_time || a.created_at_time || a.spent_at_time)));
  }, [
    xchTx.receivedTransactions, xchTx.sentTransactions,
    nftTx.receivedTransactions, nftTx.sentTransactions,
    tokenTx.receivedTransactions, tokenTx.sentTransactions
  ]);

  const loading = xchTx.loading || nftTx.loading || tokenTx.loading;
  const error = xchTx.error || nftTx.error || tokenTx.error;

  const formatTime = (t?: any): string => {
    if (t === undefined || t === null) return '';
    let ms: number | undefined;
    if (typeof t === 'string') {
      const parsed = Date.parse(t);
      ms = isNaN(parsed) ? undefined : parsed;
    } else if (typeof t === 'number') {
      ms = t > 1e12 ? t : t * 1000;
    }
    if (ms === undefined) return '';
    
    return new Date(ms).toLocaleString();
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

  const [copied, setCopied] = React.useState<{ key: string; field: 'details' | 'direction'; index: number } | null>(null);
  const copyWithFeedback = (text: string, key: string, field: 'details' | 'direction', index: number) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied({ key, field, index });
    window.setTimeout(() => {
      setCopied((prev) => (prev && prev.key === key && prev.field === field && prev.index === index ? null : prev));
    }, 1200);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="px-2 border-b border-t" style={{ borderColor: '#272830' }}>
        {!isConnected ? (
          <div className="text-center" style={{ padding: '40px' }}>
            <p className="text-red-500">Wallet not connected. Please connect your wallet first.</p>
          </div>
        ) : loading ? (
          <div className="text-center" style={{ padding: '40px' }}>
            <div className="w-8 h-8 border-2 rounded-full animate-spin mx-auto mb-4" style={{ borderColor: '#272830', borderTopColor: '#2C64F8' }}></div>
            <p>Loading transactions...</p>
          </div>
        ) : error ? (
          <div className="text-center" style={{ padding: '40px' }}>
            <p className="text-red-500">Error loading transactions: {error}</p>
          </div>
        ) : allTransactions.length === 0 ? (
          <div className="text-center" style={{ padding: '40px' }}>
            <p className="">No transactions yet</p>
          </div>
        ) : (
          <div
            className="flex flex-col gap-3 my-2 px-4"
            style={{ maxHeight: '500px', overflowY: 'auto', overscrollBehavior: 'contain' as any }}
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
          >
            {allTransactions.map((tx: any, index: number) => {
              const isOutgoing = tx.direction === 'out';
              const txDetails = tx.type === 'XCH' ? 'XCH Transaction' : tx.type === 'NFT' ? `NFT ${tx.nft_id ? tx.nft_id.slice(0, 8)+ '...' + tx.nft_id.slice(-8) : ''}` : `Token ${getTokenDisplayName(tx.asset_id || '', (tx.data as any)?.token_id)} ${tx.data?.token_id ? tx.data.token_id.slice(0, 8)+ '...' + tx.data.token_id.slice(-8) : ''}`;
              const txDirection = isOutgoing ? (tx.to ? `To ${String(tx.to).trim().slice(0, 8)}...${String(tx.to).trim().slice(-8)}` : '') : (tx.from ? `From ${String(tx.from).trim().slice(0, 8)}...${String(tx.from).trim().slice(-8)}` : '');
              const detailsCopyKey = String(tx.type === 'XCH' ? tx.id : tx.nft_id || tx.asset_id || tx.data?.token_id || '');
              const directionCopyKey = String(isOutgoing ? tx.to || '' : tx.from || '');

              return (
                <div key={tx.id} style={{ padding: '14px', borderColor: isOutgoing ? '#1b1c22' : '#27352a', backgroundColor: isOutgoing ? '#1b1c22' : '#1d241f' }} className={`flex flex-col justify-between rounded-lg border`}>
                  <div className="flex flex-row justify-between items-end">
                    <span style={{ color: '#FFFFFF' }} className="text-left">
                    {isOutgoing ? '-' : '+'}{formatAmount(tx)}
                  </span>
                  <span style={{ color: '#7C7A85' }} className="text-xs">
                    {formatTime(tx.time || tx.confirmed_at_time || tx.created_at_time || tx.spent_at_time)}
                  </span>
                  </div>
                  <div className="flex flex-row justify-between">
                    <div style={{ color: '#7C7A85', cursor: 'pointer' }}
                      onMouseEnter={(e) => e.currentTarget.style.color = '#FFFFFF'}
                      onMouseLeave={(e) => e.currentTarget.style.color = '#7C7A85'}
                      onClick={() => copyWithFeedback(detailsCopyKey, detailsCopyKey, 'details', index)}
                      className="text-xs">
                      {copied?.key === detailsCopyKey && copied.field === 'details' && copied.index === index ? 'Copied!' : txDetails}
                    </div>
                    <div style={{ color: '#7C7A85', cursor: 'pointer' }}
                      onMouseEnter={(e) => e.currentTarget.style.color = '#FFFFFF'}
                      onMouseLeave={(e) => e.currentTarget.style.color = '#7C7A85'}
                      onClick={() => copyWithFeedback(directionCopyKey, directionCopyKey, 'direction', index)}
                      className="text-xs">
                      {copied?.key === directionCopyKey && copied.field === 'direction' && copied.index === index ? 'Copied!' : txDirection}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ padding: '14px' }}>
        <button className="w-full rounded-lg py-2.5 px-5 items-center justify-center gap-2 border flex flex-row gap-2" style={{ color: '#EEEEF0', borderColor: '#272830' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#333'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          onClick={() => window.open(`https://www.spacescan.io/address/${address}`, '_blank')}
        >
          View on Explorer <PiArrowSquareOut size={20} />
        </button>
      </div>
    </>
  );
};


