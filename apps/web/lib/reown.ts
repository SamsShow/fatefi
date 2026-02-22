import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { base, baseSepolia } from '@reown/appkit/networks';
import { cookieStorage, createStorage, http } from 'wagmi';

export const projectId =
    process.env.NEXT_PUBLIC_REOWN_PROJECT_ID || process.env.NEXT_PUBLIC_PROJECT_ID || '';

export const appkitProjectId = projectId || '00000000000000000000000000000000';

export const networks = [base, baseSepolia] as [typeof base, typeof baseSepolia];

export const metadata = {
    name: 'FateFi',
    description: 'Tarot-powered market predictions',
    url: 'https://fatefi.fun',
    icons: ['https://fatefi.fun/icon.png'],
};

export const wagmiAdapter = new WagmiAdapter({
    storage: createStorage({ storage: cookieStorage }),
    ssr: true,
    projectId: appkitProjectId,
    networks,
    transports: {
        [base.id]: http(),
        [baseSepolia.id]: http(),
    },
});

export const wagmiConfig = wagmiAdapter.wagmiConfig;
