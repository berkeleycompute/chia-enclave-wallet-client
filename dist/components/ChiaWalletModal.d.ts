import React from 'react';
import { UseChiaWalletResult } from '../hooks/useChiaWallet.ts';
export interface ChiaWalletModalProps {
    isOpen: boolean;
    onClose: () => void;
    wallet: UseChiaWalletResult;
}
export declare const ChiaWalletModal: React.FC<ChiaWalletModalProps>;
