'use client';

import { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createAppKit } from '@reown/appkit/react';
import { WagmiProvider } from 'wagmi';
import { appkitProjectId, metadata, networks, projectId, wagmiAdapter, wagmiConfig } from '@/lib/reown';

const queryClient = new QueryClient();

let initialized = false;

if (!projectId) {
    console.warn('NEXT_PUBLIC_REOWN_PROJECT_ID is not set. Wallet connect is disabled.');
}

if (!initialized) {
    createAppKit({
        adapters: [wagmiAdapter],
        projectId: appkitProjectId,
        networks,
        defaultNetwork: networks[0],
        metadata,
        features: {
            analytics: true,
        },
    });
    initialized = true;
}

type ReownProviderProps = {
    children: ReactNode;
};

export default function ReownProvider({ children }: ReownProviderProps) {
    return (
        <WagmiProvider config={wagmiConfig}>
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        </WagmiProvider>
    );
}
