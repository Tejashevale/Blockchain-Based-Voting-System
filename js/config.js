// Contract address configuration
const contractAddress = '0x909050547042e1858B0970cA5d5B2C201750d452';

// Network configurations
const networks = {
    ganache: {
        name: 'Ganache',
        rpcUrl: 'http://127.0.0.1:7545',
        chainId: '5777',
        currencySymbol: 'ETH',
        contractAddress: '0x909050547042e1858B0970cA5d5B2C201750d452'
    },
    5777: {
        name: 'Ganache',
        contractAddress: '0x909050547042e1858B0970cA5d5B2C201750d452'
    }
};

// Contract configuration
const config = {
    contractAddress: "0x909050547042e1858B0970cA5d5B2C201750d452",
    networks: networks
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = config;
} else {
    window.config = config;
}
