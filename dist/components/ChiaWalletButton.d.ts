import React from 'react';
export interface ChiaWalletButtonProps {
    jwtToken?: string | null;
    variant?: 'primary' | 'secondary';
    size?: 'small' | 'medium' | 'large';
    disabled?: boolean;
    baseUrl?: string;
    enableLogging?: boolean;
    autoConnect?: boolean;
    onWalletUpdate?: (walletState: any) => void;
    className?: string;
    style?: React.CSSProperties;
}
export declare const ChiaWalletButton: React.FC<ChiaWalletButtonProps>;
