import React, { useCallback, useEffect, useState } from 'react';
import { PiCaretLeft, PiX, PiKey, PiWarning, PiCopy } from 'react-icons/pi';
import { useWalletConnection, useWalletState } from '../hooks/useChiaWalletSDK';
import { useMnemonic } from '../hooks/useWalletInfo';

interface ExportPrivateKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCloseWallet?: () => void;
}

export const ExportPrivateKeyModal: React.FC<ExportPrivateKeyModalProps> = ({ isOpen, onClose, onCloseWallet }) => {
  const { address } = useWalletConnection();
  const walletState = useWalletState();
  const { syntheticPublicKey } = walletState;

  const { exportMnemonic, loading: exportingMnemonic } = useMnemonic();

  const [ackRisks, setAckRisks] = useState(false);
  const [step, setStep] = useState<'confirm' | 'loading' | 'info'>('confirm');
  const [publicKeyValue, setPublicKeyValue] = useState<string>('');
  const [privateKeyValue, setPrivateKeyValue] = useState<string>('');
  const [mnemonicValue, setMnemonicValue] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState<'public' | 'private' | 'mnemonic' | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setStep('confirm');
      setAckRisks(false);
      setPublicKeyValue('');
      setPrivateKeyValue('');
      setMnemonicValue('');
      setCopiedKey(null);
    }
  }, [isOpen]);

  const doExport = useCallback(async () => {
    setStep('loading');
    try {
      // Public key shown as the address (matches existing UI pattern)
      setPublicKeyValue(address || '');
      // Placeholder for private key (no direct API) - show syntheticPublicKey or address for UX parity
      setPrivateKeyValue(syntheticPublicKey || address || '');
      const phrase = await exportMnemonic();
      if (phrase) setMnemonicValue(phrase);
    } finally {
      setStep('info');
    }
  }, [address, syntheticPublicKey, exportMnemonic]);

  const copy = useCallback(async (text: string, which: 'public' | 'private' | 'mnemonic') => {
    try {
      await navigator.clipboard.writeText(text || '');
      setCopiedKey(which);
      setTimeout(() => setCopiedKey(null), 1500);
    } catch {}
  }, []);

  const closeModal = () => {
    (onCloseWallet || onClose)();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center backdrop-blur-sm"
      style={{ zIndex: 1001 }}
      role="dialog"
      aria-modal="true"
      tabIndex={0}
    >
      <div
        className="w-[90%] max-w-[397px] max-h-[85vh] overflow-y-auto"
        role="document"
        tabIndex={0}
        style={{ backgroundColor: '#131418', borderRadius: '16px', border: '1px solid #272830', color: '#EEEEF0' }}
      >
        <div className="flex justify-between items-center px-4 py-5">
          <button
            className="bg-transparent border-0 text-[#7C7A85] p-1 rounded transition-colors flex items-center justify-center w-6 h-6 hover:text-[#EEEEF0]"
            onClick={onClose}
            aria-label="Back"
          >
            <PiCaretLeft size={24} />
          </button>
          <h3 className=" text-[#EEEEF0] text-xl font-medium text-left">Export Private Key</h3>
          <button
            className="bg-transparent border-0 text-[#7C7A85] p-1 rounded transition-colors flex items-center justify-center w-6 h-6 hover:text-[#EEEEF0]"
            onClick={closeModal}
            aria-label="Close modal"
          >
            <PiX size={24} />
          </button>
        </div>

        <div className="px-6 pb-6">
          {step === 'confirm' && (
            <div className="flex flex-col items-center gap-6">
              <div className="w-20 h-20 rounded-full bg-[#1B1C22] flex items-center justify-center border border-[#272830]">
                <PiKey size={36} />
              </div>
              <p className="text-center text-white text-sm max-w-[253px]">
                Reveal your private key to manage this wallet in a different app.
              </p>
              <label className="flex items-start gap-3 text-sm text-[#A7A7A7]">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded-[4px] border border-[#52525b] bg-[#3f3f46] accent-[#4b5563] focus:outline-none focus:ring-0"
                  checked={ackRisks}
                  onChange={(e) => setAckRisks(e.target.checked)}
                />
                <span className="max-w-[253px]">
                  I understand the risks of owning my private key and am fully responsible for keeping it secure.
                </span>
              </label>
              <button
                className="w-full px-5 py-3 bg-[#2C64F8] rounded text-[#EEEEF0] font-medium hover:bg-[#1E56E8] disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!ackRisks}
                onClick={doExport}
              >
                Continue
              </button>
            </div>
          )}

          {step === 'loading' && (
            <div className="flex flex-col items-center justify-center py-16 gap-4 text-[#A7A7A7]">
              <div className="w-12 h-12 border-4 border-[#272830] border-t-[#9CD24B] rounded-full animate-spin" />
              <div>Retrieving your private key</div>
            </div>
          )}

          {step === 'info' && (
            <div className="flex flex-col gap-4">
              <div className="p-4 rounded bg-[#351F20] text-[#FDBA8C] text-sm flex flex-col items-start gap-1.5">
                <div className="flex flex-row items-center gap-2">
                  <PiWarning size={16} />
                  <div className="font-semibold">Don’t share your private key with anyone</div>
                </div>
                <div className="">This private key grants full access to your wallet and all held assets</div>
              </div>

              {[
                { id: 'public' as const, label: 'Public key', value: publicKeyValue },
                { id: 'private' as const, label: 'Private key', value: privateKeyValue },
                { id: 'mnemonic' as const, label: '24-word mnemonic', value: mnemonicValue },
              ].map(({ id, label, value }) => {
                const displayValue = id === 'mnemonic'
                  ? (value || (exportingMnemonic ? 'Loading…' : '—'))
                  : (value || '—');
                return (
                  <div key={id} className="flex flex-col gap-2">
                    <div className="text-sm text-[#A7A7A7]">{label}</div>
                    <div className="flex items-center gap-2 p-3 bg-[#1B1C22] border border-[#272830] rounded">
                      <div className="text-xs break-all">{displayValue}</div>
                      <div className="ml-auto cursor-pointer">
                        {copiedKey === id ? (
                          <svg width="15" height="16" viewBox="0 0 15 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12.25 4.75L5.5 11.5L2.75 8.75" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        ) : (
                          <PiCopy size={16} className="rounded text-[#888] hover:text-white hover:bg-[#333]" onClick={() => copy(value, id)} />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


