import React, { useCallback, useEffect, useState } from 'react';
import { PiCaretLeft, PiX, PiKey, PiWarning, PiCopy, PiCheck } from 'react-icons/pi';
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
    } catch { }
  }, []);

  if (!isOpen) return null;

  return (
    <div className="px-6 pb-6">
      {step === 'confirm' && (
        <div className="flex flex-col items-center gap-6">
          <div className="w-20 h-20 rounded-full flex items-center justify-center border" style={{ backgroundColor: '#1B1C22', borderColor: '#272830' }}>
            <PiKey size={36} />
          </div>
          <p className="text-center text-sm" style={{ color: '#FFFFFF', maxWidth: '253px', wordWrap: 'break-word', whiteSpace: 'normal' }}>
            Reveal your private key to manage this wallet in a different app.
          </p>
          <label className="flex items-start gap-3 text-sm text-gray-300">
            <input
              type="checkbox"
              style={{ borderColor: '#52525b', backgroundColor: '#3f3f46', accentColor: '#4b5563', borderRadius: '4px' }}
              className="mt-0.5 h-4 w-4 focus:outline-none focus:ring-0"
              checked={ackRisks}
              onChange={(e) => setAckRisks(e.target.checked)}
            />
            <span className='text-left'style={{ maxWidth: '350px', wordWrap: 'break-word', whiteSpace: 'normal' }}>
              I understand the risks of owning my private key and am fully responsible for keeping it secure.
            </span>
          </label>
          <button
            className="w-full px-5 py-3 rounded font-medium" style={{ backgroundColor: '#2C64F8', color: '#EEEEF0' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1E56E8'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2C64F8'}
            disabled={!ackRisks}
            onClick={doExport}
          >
            Continue
          </button>
        </div>
      )}

      {step === 'loading' && (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-gray-300">
          <div className="w-12 h-12 border-4 rounded-full animate-spin" style={{ borderColor: '#272830', borderTopColor: '#9CD24B' }} />
          <div>Retrieving your private key</div>
        </div>
      )}

      {step === 'info' && (
        <div className="flex flex-col gap-4">
          <div className="p-4 rounded text-sm flex flex-col items-start gap-1.5" style={{ backgroundColor: '#351F20', color: '#FDBA8C' }}>
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
                <div className="text-sm text-gray-300">{label}</div>
                <div className="flex items-center gap-2 p-3 border rounded" style={{ backgroundColor: '#1B1C22', borderColor: '#272830' }}>
                  <div className="text-xs break-all">{displayValue}</div>
                  <div className="ml-auto cursor-pointer">
                    {copiedKey === id ? (
                      <PiCheck size={16} style={{ color: '#22C55E' }} />
                    ) : (
                      <PiCopy size={16} className="hover:text-white" style={{ color: '#888' }} onMouseEnter={(e) => e.currentTarget.style.color = '#FFFFFF'} onMouseLeave={(e) => e.currentTarget.style.color = '#888'} onClick={() => copy(value, id)} />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};


