import React, { useState, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { injectModalStyles } from './modal-styles';
import { useWalletConnection } from '../hooks/useChiaWalletSDK';
import { useChiaWalletSDK } from '../providers/ChiaWalletSDKProvider';
import { useTransferAssets } from '../hooks/useTransferAssets';
import type { HydratedCoin } from '../client/ChiaCloudWalletClient';
import { convertIpfsUrl } from '../utils/ipfs';
import { PiListBullets, PiPaperPlaneTilt, PiCopy, PiCheck, PiArrowSquareOut } from 'react-icons/pi';

interface NFTDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  // New: closes the entire wallet modal (parent)
  onCloseWallet?: () => void;
  nft: HydratedCoin | null;
  // Show back to assets button when coming from ViewAssetsModal
  showBackToAssets?: boolean;
}

export interface NFTDetailsModalRef {
  handleBack: () => boolean; // Returns true if handled, false if parent should close
}

export const NFTDetailsModal = forwardRef<NFTDetailsModalRef, NFTDetailsModalProps>(({
  isOpen,
  onClose,
  onCloseWallet,
  nft,
  showBackToAssets = false,
}, ref) => {
  // Ensure shared modal styles are available
  useEffect(() => {
    injectModalStyles();
  }, []);
  const sdk = useChiaWalletSDK();
  const { isConnected } = useWalletConnection();
  const { transferNFT, isTransferring, transferError } = useTransferAssets({
    sdk,
    enableLogging: true
  });
  const [activeTab, setActiveTab] = useState<'details' | 'transfer'>('details');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [transferFee, setTransferFee] = useState('0.0001'); // Store as XCH
  const [transferSuccess, setTransferSuccess] = useState(false);
  const [nftMetadata, setNftMetadata] = useState<any>(null);
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [copiedValue, setCopiedValue] = useState<string | null>(null);

  // Helper function to copy to clipboard
  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedValue(label);
      setTimeout(() => setCopiedValue(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Helper to detect if value is a URL
  const isUrl = (value: string): boolean => {
    if (typeof value !== 'string') return false;

    // Already has protocol
    if (value.startsWith('http://') || value.startsWith('https://')) {
      return true;
    }

    // Check for common URL patterns
    const urlPattern = /^(?:www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?$/;
    return urlPattern.test(value) ||
      value.startsWith('www.') ||
      value.includes('.com/') ||
      value.includes('.net/') ||
      value.includes('.org/') ||
      value.includes('.io/');
  };

  // Helper to make URL clickable - adds https:// if missing
  const makeUrlClickable = (value: string): string => {
    // Already has protocol
    if (value.startsWith('http://') || value.startsWith('https://')) {
      return value;
    }

    // Add https:// to any URL without protocol
    return `https://${value}`;
  };

  // Fetch NFT metadata from metadataUris
  const fetchNftMetadata = useCallback(async (metadataUri: string): Promise<any> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(metadataUri, {
        method: 'GET',
        redirect: 'follow',
        mode: 'cors',
        cache: 'default',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json, */*'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Failed to fetch metadata (${response.status})`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        const text = await response.text();
        try {
          return JSON.parse(text);
        } catch {
          console.warn('Metadata response is not valid JSON');
          return null;
        }
      }
    } catch (error) {
      console.error('Error fetching NFT metadata:', error);
      return null;
    }
  }, []);

  // Load NFT metadata when modal opens or NFT changes
  useEffect(() => {
    if (!isOpen || !nft) {
      setNftMetadata(null);
      return;
    }

    const driverInfo = nft.parentSpendInfo?.driverInfo;
    if (driverInfo?.type !== 'NFT' || !driverInfo.info?.metadata?.metadataUris || driverInfo.info.metadata.metadataUris.length === 0) {
      return;
    }

    const metadataUri = driverInfo.info.metadata.metadataUris[0];

    const loadMetadata = async () => {
      setMetadataLoading(true);
      const metadata = await fetchNftMetadata(metadataUri);
      setNftMetadata(metadata);
      setMetadataLoading(false);
    };

    loadMetadata();
  }, [isOpen, nft, fetchNftMetadata]);

  // Reset to details tab when modal is closed
  useEffect(() => {
    if (!isOpen) {
      setActiveTab('details');
    }
  }, [isOpen]);

  // Expose handleBack method to parent components via ref
  useImperativeHandle(ref, () => ({
    handleBack: () => {
      if (activeTab !== 'details') {
        setActiveTab('details');
        return true; // Handled internally - went back to details tab
      }
      // If we're showing the "Back to Assets" button, close this modal (return to assets)
      if (showBackToAssets) {
        onClose();
        return true; // Handled - closing to show assets
      }
      return false; // Not handled - parent should close modal completely
    }
  }), [activeTab, showBackToAssets, onClose]);


  const handleTransferNFT = async () => {
    if (!nft || !recipientAddress.trim()) return;

    const nftInfo = nft.parentSpendInfo?.driverInfo?.info;
    const launcherId = nftInfo?.launcherId || nft.coinId;

    // Convert XCH to mojos (1 XCH = 1,000,000,000,000 mojos)
    const feeInMojos = Math.floor(parseFloat(transferFee || '0.0001') * 1000000000000);

    console.log('🔄 Transferring NFT:', {
      coinId: nft.coinId,
      launcherId,
      recipient: recipientAddress,
      feeXCH: transferFee,
      feeMojos: feeInMojos
    });

    const result = await transferNFT(
      nft.coinId,
      launcherId,
      recipientAddress,
      feeInMojos
    );

    if (result.success) {
      setTransferSuccess(true);
      setRecipientAddress('');
      setTimeout(() => {
        onClose();
      }, 2000);
    }
  };

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setActiveTab('details');
      setRecipientAddress('');
      setTransferFee('0.0001');
      setTransferSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen || !nft) return null;

  const driverInfo = nft.parentSpendInfo?.driverInfo;
  const nftInfo = driverInfo?.info;
  const onChainMetadata = nftInfo?.metadata as any; // Cast to any for flexible metadata access

  // Get image URL from downloaded metadata or fallback to on-chain data
  const getImageUrl = () => {
    // Try downloaded metadata first
    if (nftMetadata?.image) {
      return convertIpfsUrl(nftMetadata.image);
    }
    if (nftMetadata?.data_uris && nftMetadata.data_uris.length > 0) {
      return convertIpfsUrl(nftMetadata.data_uris[0]);
    }

    // Fallback to on-chain metadata
    if (onChainMetadata?.dataUris && onChainMetadata.dataUris.length > 0) {
      return convertIpfsUrl(onChainMetadata.dataUris[0]);
    }

    return undefined;
  };

  const imageUrl = getImageUrl();

  // Get NFT display name from metadata
  const getNftName = () => {
    if (nftMetadata?.name) {
      return nftMetadata.name;
    }
    if (onChainMetadata?.name) {
      return onChainMetadata.name;
    }
    if (onChainMetadata?.editionNumber && onChainMetadata?.editionTotal) {
      return `NFT Edition ${onChainMetadata.editionNumber}/${onChainMetadata.editionTotal}`;
    }
    return nftInfo?.launcherId?.substring(0, 16) + '...' || 'NFT';
  };

  // Get NFT description from metadata
  const getNftDescription = () => {
    return nftMetadata?.description || onChainMetadata?.description || null;
  };

  // Get collection name
  const getCollectionName = () => {
    return nftMetadata?.collection?.name || onChainMetadata?.collection?.name || null;
  };

  // Get collection family
  const getCollectionFamily = () => {
    return nftMetadata?.collection?.family || onChainMetadata?.collection?.family || null;
  };

  return (
    <>
      <div
        className=""
        style={{
          maxHeight: '70vh',
          overflowY: 'auto',
          overflowX: 'hidden'
        }}
      >
        <div className="flex gap-2 px-4 border-b" style={{ borderColor: '#272830' }}>
          {[{ name: "Details", icon: <PiListBullets size={16} color="#888" />, active: activeTab === 'details' }, { name: "Transfer", icon: <PiPaperPlaneTilt size={16} color="#888" />, active: activeTab === 'transfer' }].map((item) => (
            <button
              key={item.name}
              className={`w-full px-4 py-2.5 text-sm font-medium transition-colors relative flex items-center justify-center gap-2 ${item.active
                ? 'text-white'
                : 'text-gray-400 hover:text-gray-300'
                }`}
              onClick={() => setActiveTab(item.name.toLowerCase() as "details" | "transfer")}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: item.active ? '2px solid #2C64F8' : 'none',
              }}
            >
              {item.icon}
              <span>{item.name}</span>
            </button>
          ))}
        </div>

        {/* Back to Assets button */}
        {showBackToAssets && (
          <button
            onClick={onClose}
            className="px-4 pt-3flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
            style={{ background: 'none', border: 'none', padding: '0' }}
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12.5 5L7.5 10L12.5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="font-medium">Back to Assets</span>
          </button>
        )}

        <div className="py-4">
          {activeTab === 'details' && (
            <div className="flex flex-col gap-3" style={{ overflowY: 'auto', backgroundColor: '#1B1C22', borderRadius: '8px', padding: '14px', margin: '0 14px' }}>
              {metadataLoading && (
                <div className="text-center py-12" style={{ color: '#888' }}>
                  <div className="w-8 h-8 border-2 rounded-full animate-spin mx-auto mb-4" style={{ borderColor: '#272830', borderTopColor: '#2C64F8' }} />
                  <p className="text-sm">Loading metadata...</p>
                </div>
              )}

              {/* NFT Header Section */}
              <h2 className="text-white text-left text-lg mb-1 break-words w-full">
                {getNftName()}
              </h2>

              {/* Asset Details Section */}
              <div className="rounded-lg flex flex-col gap-1 items-start">
                <span className="text-white text-lg tracking-wide">Asset Details</span>

                {getCollectionName() && (
                  <div className="flex flex-row items-center justify-between gap-4 w-full">
                    <span className="text-gray-400 text-sm uppercase tracking-wide">Collection</span>
                    <div className="text-white font-semibold text-sm">{getCollectionName()}</div>
                  </div>
                )}

                {getCollectionFamily() && (
                  <div className="flex flex-row items-center justify-between gap-4 w-full">
                    <span className="text-gray-400 text-sm uppercase tracking-wide">Family</span>
                    <div className="text-white font-semibold text-sm">{getCollectionFamily()}</div>
                  </div>
                )}

                <div className="flex flex-row items-center justify-between gap-4 w-full">
                  <span className="text-gray-400 text-sm uppercase tracking-wide">Edition</span>
                  <div className="text-white font-semibold text-sm">
                    {onChainMetadata?.editionNumber && onChainMetadata?.editionTotal
                      ? `${onChainMetadata.editionNumber} / ${onChainMetadata.editionTotal}`
                      : (nftMetadata?.edition_number && nftMetadata?.edition_total)
                        ? `${nftMetadata.edition_number} / ${nftMetadata.edition_total}`
                        : 'N/A'}
                  </div>
                </div>

                <div className="flex flex-row items-center justify-between gap-4 w-full">
                  <span className="text-gray-400 text-sm uppercase tracking-wide">Royalty</span>
                  <div className="text-white font-semibold text-sm">
                    {nftInfo?.royaltyTenThousandths
                      ? `${(nftInfo.royaltyTenThousandths / 100).toFixed(2)}%`
                      : '0%'}
                  </div>
                </div>

                {nftInfo?.launcherId && (
                  <div className="flex flex-row items-center justify-between gap-4 w-full">
                    <span className="text-gray-400 text-sm uppercase tracking-wide">Launcher ID</span>
                    <div className="text-white font-semibold text-sm flex items-center gap-2">
                      {nftInfo.launcherId.substring(0, 8)}...{nftInfo.launcherId.substring(nftInfo.launcherId.length - 8)}
                      <div className="ml-auto cursor-pointer flex-shrink-0">
                        {copiedValue === 'launcherId' ? (
                          <PiCheck size={16} style={{ color: '#22C55E' }} />
                        ) : (
                          <PiCopy
                            size={16}
                            style={{ color: '#7C7A85' }}
                            onMouseEnter={(e) => e.currentTarget.style.color = '#FFFFFF'}
                            onMouseLeave={(e) => e.currentTarget.style.color = '#7C7A85'}
                            onClick={() => nftInfo.launcherId && copyToClipboard(nftInfo.launcherId, 'launcherId')}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {nftInfo?.currentOwner && (
                  <div className="flex flex-row items-center justify-between gap-4 w-full">
                    <span className="text-gray-400 text-sm uppercase tracking-wide">Current Owner</span>
                    <div className="text-white font-semibold text-sm flex items-center gap-2">
                      {nftInfo.currentOwner.substring(0, 8)}...{nftInfo.currentOwner.substring(nftInfo.currentOwner.length - 8)}
                      <div className="ml-auto cursor-pointer flex-shrink-0">
                        {copiedValue === 'currentOwner' ? (
                          <PiCheck size={16} style={{ color: '#22C55E' }} />
                        ) : (
                          <PiCopy
                            size={16}
                            style={{ color: '#7C7A85' }}
                            onMouseEnter={(e) => e.currentTarget.style.color = '#FFFFFF'}
                            onMouseLeave={(e) => e.currentTarget.style.color = '#7C7A85'}
                            onClick={() => nftInfo.currentOwner && copyToClipboard(nftInfo.currentOwner, 'currentOwner')}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-row items-center justify-between gap-4 w-full">
                  <span className="text-gray-400 text-sm uppercase tracking-wide">Coin ID</span>
                  <div className="text-white font-semibold text-sm flex items-center gap-2">
                    {nft.coinId.substring(0, 8)}...{nft.coinId.substring(nft.coinId.length - 8)}
                    <div className="ml-auto cursor-pointer flex-shrink-0">
                      {copiedValue === 'coinId' ? (
                        <PiCheck size={16} style={{ color: '#22C55E' }} />
                      ) : (
                        <PiCopy
                          size={16}
                          style={{ color: '#7C7A85' }}
                          onMouseEnter={(e) => e.currentTarget.style.color = '#FFFFFF'}
                          onMouseLeave={(e) => e.currentTarget.style.color = '#7C7A85'}
                          onClick={() => copyToClipboard(nft?.coinId, 'coinId')}
                        />
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-row items-center justify-between gap-4 w-full">
                  <span className="text-gray-400 text-sm uppercase tracking-wide">Amount</span>
                  <div className="text-white font-semibold text-sm">{nft?.coin?.amount} mojos</div>
                </div>
              </div>

              {/* Description */}
              {getNftDescription() && (
                <div className="rounded-lg flex flex-col gap-1 items-start w-full">
                  <span className="text-white text-lg tracking-wide">Description</span>
                  <p className="text-gray-400 text-sm text-left w-full" style={{ wordBreak: 'break-word', overflowWrap: 'break-word', wordWrap: 'break-word' }}>{getNftDescription()}</p>
                </div>
              )}

              {/* Attributes */}
              {nftMetadata?.attributes && nftMetadata.attributes.length > 0 && (
                <div className="rounded-lg flex flex-col gap-1 items-start">
                  <span className="text-white text-lg tracking-wide">Attributes</span>
                  {nftMetadata.attributes.map((attr: any, index: number) => {
                    const valueStr = String(attr.value);
                    const isUrlValue = isUrl(valueStr);
                    const attributeKey = `${attr.trait_type || attr.type}-${index}`;

                    return (
                      <div key={index} className={`flex flex-row items-center gap-4 justify-between w-full`}>
                        <span className="text-gray-400 text-sm uppercase tracking-wide">{attr.trait_type || attr.type}</span>
                        <div className={`text-white font-semibold text-sm flex items-center gap-2`}>
                          {isUrlValue ? (
                            <>
                              <span
                                style={{ cursor: 'pointer' }}
                                title="Click to open link"
                                onClick={() => window.open(makeUrlClickable(valueStr), '_blank', 'noopener,noreferrer')}
                              >
                                {valueStr.length > 30 ? attributeKey?.toLowerCase().includes("url") ? "" : valueStr.substring(0, 6) + '...' + valueStr.substring(valueStr.length - 4) : valueStr}
                              </span>
                              <PiArrowSquareOut
                                size={16}
                                style={{ color: '#7C7A85', cursor: 'pointer' }}
                                onMouseEnter={(e) => e.currentTarget.style.color = '#FFFFFF'}
                                onMouseLeave={(e) => e.currentTarget.style.color = '#7C7A85'}
                                onClick={() => window.open(makeUrlClickable(valueStr), '_blank', 'noopener,noreferrer')}
                                title={valueStr}
                              />
                            </>
                          ) : (
                            <>
                              <span
                                style={{ cursor: 'pointer' }}
                                title={copiedValue === attributeKey ? 'Copied!' : 'Click to copy'}
                                onClick={() => copyToClipboard(valueStr, attributeKey)}
                              >
                                {valueStr.length > 30 ? valueStr.substring(0, 6) + '...' + valueStr.substring(valueStr.length - 6) : valueStr}
                              </span>
                              {valueStr.length > 30 && copiedValue !== attributeKey ? (<PiCopy
                                size={16}
                                style={{ color: '#7C7A85', cursor: 'pointer' }}
                                onMouseEnter={(e) => e.currentTarget.style.color = '#FFFFFF'}
                                onMouseLeave={(e) => e.currentTarget.style.color = '#7C7A85'}
                                onClick={() => copyToClipboard(valueStr, attributeKey)}
                              />
                              ) : null}
                              {copiedValue === attributeKey && (
                                <PiCheck size={16} style={{ color: '#22C55E' }} />
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* External Links */}
              {nftInfo?.launcherId && (
                <div className="rounded-lg flex flex-col gap-1 items-start">
                  <span className="text-white text-lg tracking-wide">View on Explorers</span>
                  <div className="flex flex-col gap-1 w-full">
                    <div className="flex items-center gap-2 text-sm">
                      <span
                        style={{ cursor: 'pointer', color: 'white' }}
                        title="Click to open MintGarden"
                        onClick={() => window.open(`https://mintgarden.io/nfts/${nftInfo.launcherId}`, '_blank', 'noopener,noreferrer')}
                      >
                        MintGarden
                      </span>
                      <PiArrowSquareOut
                        size={16}
                        style={{ color: '#7C7A85', cursor: 'pointer' }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#FFFFFF'}
                        onMouseLeave={(e) => e.currentTarget.style.color = '#7C7A85'}
                        onClick={() => window.open(`https://mintgarden.io/nfts/${nftInfo.launcherId}`, '_blank', 'noopener,noreferrer')}
                        title={`https://mintgarden.io/nfts/${nftInfo.launcherId}`}
                      />
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span
                        style={{ cursor: 'pointer', color: 'white' }}
                        title="Click to open Spacescan"
                        onClick={() => window.open(`https://spacescan.io/nft/${nftInfo.launcherId}`, '_blank', 'noopener,noreferrer')}
                      >
                        Spacescan
                      </span>
                      <PiArrowSquareOut
                        size={16}
                        style={{ color: '#7C7A85', cursor: 'pointer' }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#FFFFFF'}
                        onMouseLeave={(e) => e.currentTarget.style.color = '#7C7A85'}
                        onClick={() => window.open(`https://spacescan.io/nft/${nftInfo.launcherId}`, '_blank', 'noopener,noreferrer')}
                        title={`https://spacescan.io/nft/${nftInfo.launcherId}`}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Technical Information */}
              <div className="rounded-lg flex flex-col gap-1 items-start">
                <span className="text-white text-lg tracking-wide">Technical Information</span>

                <div className="flex flex-row items-center justify-between gap-4 w-full">
                  <span className="text-gray-400 text-sm uppercase tracking-wide">Parent Coin Info</span>
                  <div className="text-white font-semibold text-sm flex items-center gap-2">
                    {nft.coin.parentCoinInfo.substring(0, 8)}...{nft.coin.parentCoinInfo.substring(nft.coin.parentCoinInfo.length - 8)}
                    <div className="ml-auto cursor-pointer flex-shrink-0">
                      {copiedValue === 'parentCoinInfo' ? (
                        <PiCheck size={16} style={{ color: '#22C55E' }} />
                      ) : (
                        <PiCopy
                          size={16}
                          style={{ color: '#7C7A85' }}
                          onMouseEnter={(e) => e.currentTarget.style.color = '#FFFFFF'}
                          onMouseLeave={(e) => e.currentTarget.style.color = '#7C7A85'}
                          onClick={() => copyToClipboard(nft.coin.parentCoinInfo, 'parentCoinInfo')}
                        />
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-row items-center justify-between gap-4 w-full">
                  <span className="text-gray-400 text-sm uppercase tracking-wide">Puzzle Hash</span>
                  <div className="text-white font-semibold text-sm flex items-center gap-2">
                    {nft.coin.puzzleHash.substring(0, 8)}...{nft.coin.puzzleHash.substring(nft.coin.puzzleHash.length - 8)}
                    <div className="ml-auto cursor-pointer flex-shrink-0">
                      {copiedValue === 'puzzleHash' ? (
                        <PiCheck size={16} style={{ color: '#22C55E' }} />
                      ) : (
                        <PiCopy
                          size={16}
                          style={{ color: '#7C7A85' }}
                          onMouseEnter={(e) => e.currentTarget.style.color = '#FFFFFF'}
                          onMouseLeave={(e) => e.currentTarget.style.color = '#7C7A85'}
                          onClick={() => copyToClipboard(nft.coin.puzzleHash, 'puzzleHash')}
                        />
                      )}
                    </div>
                  </div>
                </div>

                {onChainMetadata?.dataHash && (
                  <div className="flex flex-row items-center justify-between gap-4 w-full">
                    <span className="text-gray-400 text-sm uppercase tracking-wide">Data Hash</span>
                    <div className="text-white font-semibold text-sm flex items-center gap-2">
                      {onChainMetadata.dataHash.substring(0, 8)}...{onChainMetadata.dataHash.substring(onChainMetadata.dataHash.length - 8)}
                      <div className="ml-auto cursor-pointer flex-shrink-0">
                        {copiedValue === 'dataHash' ? (
                          <PiCheck size={16} style={{ color: '#22C55E' }} />
                        ) : (
                          <PiCopy
                            size={16}
                            style={{ color: '#7C7A85' }}
                            onMouseEnter={(e) => e.currentTarget.style.color = '#FFFFFF'}
                            onMouseLeave={(e) => e.currentTarget.style.color = '#7C7A85'}
                            onClick={() => copyToClipboard(onChainMetadata.dataHash, 'dataHash')}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {onChainMetadata?.metadataHash && (
                  <div className="flex flex-row items-center justify-between gap-4 w-full">
                    <span className="text-gray-400 text-sm uppercase tracking-wide">Metadata Hash</span>
                    <div className="text-white font-semibold text-sm flex items-center gap-2">
                      {onChainMetadata.metadataHash.substring(0, 8)}...{onChainMetadata.metadataHash.substring(onChainMetadata.metadataHash.length - 8)}
                      <div className="ml-auto cursor-pointer flex-shrink-0">
                        {copiedValue === 'metadataHash' ? (
                          <PiCheck size={16} style={{ color: '#22C55E' }} />
                        ) : (
                          <PiCopy
                            size={16}
                            style={{ color: '#7C7A85' }}
                            onMouseEnter={(e) => e.currentTarget.style.color = '#FFFFFF'}
                            onMouseLeave={(e) => e.currentTarget.style.color = '#7C7A85'}
                            onClick={() => copyToClipboard(onChainMetadata.metadataHash, 'metadataHash')}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {onChainMetadata?.licenseHash && (
                  <div className="flex flex-row items-center justify-between gap-4 w-full">
                    <span className="text-gray-400 text-sm uppercase tracking-wide">License Hash</span>
                    <div className="text-white font-semibold text-sm flex items-center gap-2">
                      {onChainMetadata.licenseHash.substring(0, 8)}...{onChainMetadata.licenseHash.substring(onChainMetadata.licenseHash.length - 8)}
                      <div className="ml-auto cursor-pointer flex-shrink-0">
                        {copiedValue === 'licenseHash' ? (
                          <PiCheck size={16} style={{ color: '#22C55E' }} />
                        ) : (
                          <PiCopy
                            size={16}
                            style={{ color: '#7C7A85' }}
                            onMouseEnter={(e) => e.currentTarget.style.color = '#FFFFFF'}
                            onMouseLeave={(e) => e.currentTarget.style.color = '#7C7A85'}
                            onClick={() => copyToClipboard(onChainMetadata.licenseHash, 'licenseHash')}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* URIs Section */}
              {((onChainMetadata?.dataUris && onChainMetadata.dataUris.length > 0) || 
                (onChainMetadata?.metadataUris && onChainMetadata.metadataUris.length > 0)) && (
                <div className="rounded-lg flex flex-col gap-1 items-start">
                  <span className="text-white text-lg tracking-wide">URIs</span>
                  
                  {onChainMetadata.dataUris && onChainMetadata.dataUris.length > 0 && (
                    <div className="flex flex-col gap-1 w-full">
                      <span className="text-gray-400 text-sm uppercase tracking-wide text-left">Data URIs</span>
                      {onChainMetadata.dataUris.map((uri: string, index: number) => {
                        const uriKey = `dataUri-${index}`;
                        const displayUri = uri.length > 30 ? uri.substring(0, 6) + '...' + uri.substring(uri.length - 4) : uri;
                        return (
                          <div key={index} className="flex flex-row flex-wrap items-center justify-between gap-4 w-full">
                            <div className="text-white font-semibold text-sm flex items-center gap-2">
                              <span
                                style={{ cursor: 'pointer' }}
                                title={uri}
                                onClick={() => window.open(convertIpfsUrl(uri), '_blank', 'noopener,noreferrer')}
                              >
                                {displayUri}
                              </span>
                              <PiArrowSquareOut
                                size={16}
                                style={{ color: '#7C7A85', cursor: 'pointer' }}
                                onMouseEnter={(e) => e.currentTarget.style.color = '#FFFFFF'}
                                onMouseLeave={(e) => e.currentTarget.style.color = '#7C7A85'}
                                onClick={() => window.open(convertIpfsUrl(uri), '_blank', 'noopener,noreferrer')}
                                title={uri}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  
                  {onChainMetadata.metadataUris && onChainMetadata.metadataUris.length > 0 && (
                    <div className="flex flex-col gap-1 w-full">
                      <span className="text-gray-400 text-sm uppercase tracking-wide text-left">Metadata URIs</span>
                      {onChainMetadata.metadataUris.map((uri: string, index: number) => {
                        const uriKey = `metadataUri-${index}`;
                        const displayUri = uri.length > 30 ? uri.substring(0, 6) + '...' + uri.substring(uri.length - 4) : uri;
                        return (
                          <div key={index} className="flex flex-row flex-wrap items-center justify-between gap-4 w-full">
                            <div className="text-white font-semibold text-sm flex items-center gap-2">
                              <span
                                style={{ cursor: 'pointer' }}
                                title={uri}
                                onClick={() => window.open(convertIpfsUrl(uri), '_blank', 'noopener,noreferrer')}
                              >
                                {displayUri}
                              </span>
                              <PiArrowSquareOut
                                size={16}
                                style={{ color: '#7C7A85', cursor: 'pointer' }}
                                onMouseEnter={(e) => e.currentTarget.style.color = '#FFFFFF'}
                                onMouseLeave={(e) => e.currentTarget.style.color = '#7C7A85'}
                                onClick={() => window.open(convertIpfsUrl(uri), '_blank', 'noopener,noreferrer')}
                                title={uri}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'transfer' && (
            <div className=" px-4">
              {!isConnected ? (
                <div className="text-center text-sm" style={{ padding: '40px' }}>
                  <p style={{ color: '#ef4444' }}>Wallet not connected. Please connect your wallet to transfer NFTs.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {/* Transfer Form */}
                  <form onSubmit={(e) => { e.preventDefault(); handleTransferNFT(); }} className="flex flex-col gap-4">
                    {/* Recipient Address */}
                    <div className="flex flex-col gap-1">
                      <label htmlFor="recipientAddress" className="text-white text-sm font-medium text-left">Recipient address</label>
                      <div className="relative flex items-center">
                        <input
                          id="recipientAddress"
                          type="text"
                          value={recipientAddress}
                          onChange={(e) => setRecipientAddress(e.target.value)}
                          placeholder="xch1..."
                          className="w-full px-4 py-2 rounded text-sm focus:outline-none placeholder-gray-300"
                          style={{ backgroundColor: '#1B1C22', border: '1px solid #272830', color: '#EEEEF0' }}
                          onFocus={(e) => e.currentTarget.style.borderColor = '#2C64F8'}
                          onBlur={(e) => e.currentTarget.style.borderColor = '#272830'}
                          required
                        />
                      </div>
                    </div>

                    {/* Network Fee */}
                    <div className="flex flex-col gap-1">
                      <label htmlFor="transferFee" className="text-white text-sm font-medium text-left">Network fee</label>
                      <div className="relative flex items-center">
                        <input
                          id="transferFee"
                          type="number"
                          step="0.000000000001"
                          min="0"
                          value={transferFee}
                          onChange={(e) => setTransferFee(e.target.value)}
                          placeholder="0.0001"
                          className="w-full px-4 py-2 rounded text-sm focus:outline-none placeholder-gray-300"
                          style={{ backgroundColor: '#1B1C22', border: '1px solid #272830', color: '#EEEEF0' }}
                          onFocus={(e) => e.currentTarget.style.borderColor = '#2C64F8'}
                          onBlur={(e) => e.currentTarget.style.borderColor = '#272830'}
                          required
                        />
                      </div>
                      <small className="text-xs" style={{ color: '#888', marginTop: '4px' }}>
                        Recommended: 0.0001 XCH ({Math.floor(parseFloat(transferFee || '0.0001') * 1000000000000).toLocaleString()} mojos)
                      </small>
                    </div>

                    {/* Transaction Summary */}
                    <div className="flex flex-col gap-1">
                      <label className="text-white text-sm font-medium text-left">Transaction summary</label>
                      <div className="rounded-lg border-l-0 p-3 flex flex-col gap-3" style={{ backgroundColor: '#1B1C22' }}>
                        <div className="flex items-center text-sm">
                          <span className="text-white font-medium">{getNftName()}</span>
                        </div>
                        <div className="flex items-center text-sm">
                          <span className="text-white font-medium">{transferFee || '0'} XCH</span>
                        </div>

                      </div>
                    </div>

                    {/* Messages */}
                    {transferError && (
                      <div className="p-3 rounded border border-red-300 text-red-500 bg-red-500/10 text-sm my-2">
                        <p>{transferError}</p>
                      </div>
                    )}

                    {transferSuccess && (
                      <div className="p-3 rounded border border-green-300 text-green-500 bg-green-500/10 text-sm my-2">
                        <p>NFT transferred successfully!</p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2 mb-2">
                      <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2 bg-transparent border rounded font-medium w-1/4"
                        style={{ borderColor: '#333', color: 'white' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#262626'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isTransferring || !recipientAddress.trim()}
                        className="flex items-center justify-center gap-2 px-5 py-2 rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed w-3/4"
                        style={{ backgroundColor: '#2C64F8', color: 'white' }}
                        onMouseEnter={(e) => !isTransferring && !(!recipientAddress.trim()) && (e.currentTarget.style.backgroundColor = '#1e56e8')}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2C64F8'}
                      >
                        {isTransferring ? (
                          <>
                            <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(255, 255, 255, 0.3)', borderTopColor: 'white' }}></div>
                            Transferring...
                          </>
                        ) : (
                          'Transfer NFT'
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
          /* Scrollbar styling */
          .::-webkit-scrollbar {
            width: 8px;
          }

          .::-webkit-scrollbar-track {
            background: #1a1a1a;
            border-radius: 4px;
          }

          .::-webkit-scrollbar-thumb {
            background: #333;
            border-radius: 4px;
          }

          .::-webkit-scrollbar-thumb:hover {
            background: #6bc36b;
          }

          . {
            scrollbar-width: thin;
            scrollbar-color: #333 #1a1a1a;
          }
        `}</style>
    </>
  );
});

NFTDetailsModal.displayName = 'NFTDetailsModal';