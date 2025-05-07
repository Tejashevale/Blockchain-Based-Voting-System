// Global variables
let web3;
let contract;
let account;

// Initialize Web3 and contract
async function init() {
    try {
        // Check if MetaMask is installed
        if (typeof window.ethereum === 'undefined') {
            throw new Error('MetaMask is not installed. Please install MetaMask to continue.');
        }

        // Initialize Web3
        web3 = new Web3(window.ethereum);
        console.log('Web3 initialized');

        // Get network ID
        const networkId = await web3.eth.net.getId();
        console.log('Network ID:', networkId);

        // Load contract ABI
        try {
            const response = await fetch('./build/contracts/Election.json');
            if (!response.ok) {
                throw new Error('Failed to load contract ABI');
            }
            const data = await response.json();
            const contractABI = data.abi;
            console.log('Contract ABI loaded:', contractABI);

            // Initialize contract
            contract = new web3.eth.Contract(
                contractABI,
                config.contractAddress
            );
            console.log('Contract initialized at:', config.contractAddress);

            // Verify contract
            const code = await web3.eth.getCode(config.contractAddress);
            console.log('Contract code:', code);
            
            if (code === '0x' || code === '0x0') {
                throw new Error('No contract found at the specified address');
            }

            // Test contract connection
            const admin = await contract.methods.admin().call();
            console.log('Contract admin:', admin);

            return true;
        } catch (error) {
            console.error('Error loading contract:', error);
            throw new Error('Failed to load contract. Please make sure the contract is deployed: ' + error.message);
        }
    } catch (error) {
        console.error('Initialization error:', error);
        showError(error.message);
        return false;
    }
}

// Connect wallet and verify admin
async function connectWallet() {
    try {
        showStatus('Initializing...', 'info');

        // Initialize if not already initialized
        if (!web3 || !contract) {
            const initialized = await init();
            if (!initialized) {
                throw new Error('Failed to initialize Web3 and contract');
            }
        }

        showStatus('Connecting to MetaMask...', 'info');

        // Request account access
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        account = accounts[0];
        console.log('Connected account:', account);

        showStatus('Verifying admin credentials...', 'info');

        try {
            // Get admin address from contract
            const adminAddress = await contract.methods.admin().call();
            console.log('Contract admin address:', adminAddress);
            console.log('Connected address:', account);

            if (adminAddress.toLowerCase() !== account.toLowerCase()) {
                throw new Error('This address is not authorized as an admin');
            }

            // Store admin info in localStorage
            const adminInfo = {
                address: account,
                role: 'admin'
            };
            localStorage.setItem('adminInfo', JSON.stringify(adminInfo));
            localStorage.setItem('votingContractAddress', config.contractAddress);

            showStatus('Verified successfully! Redirecting...', 'success');

            // Add a small delay before redirect
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Redirect to admin dashboard
            window.location.href = 'admin_dashboard.html';
        } catch (error) {
            console.error('Error verifying admin:', error);
            throw new Error(error.message || 'Failed to verify admin credentials');
        }
    } catch (error) {
        console.error('Error in connectWallet:', error);
        showError(error.message);
    }
}

// Show status message
function showStatus(message, type = 'info') {
    const statusDiv = document.getElementById('statusMessage');
    if (statusDiv) {
        statusDiv.innerHTML = `
            <div class="alert alert-${type} alert-dismissible fade show">
                ${type === 'info' ? '<div class="spinner-border spinner-border-sm me-2"></div>' : ''}
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
    }
}

// Show error message
function showError(message) {
    showStatus(message, 'danger');
}

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    // Add click handler to connect wallet button
    const connectButton = document.getElementById('connectWallet');
    if (connectButton) {
        connectButton.addEventListener('click', connectWallet);
    }

    // Check if MetaMask is installed
    if (typeof window.ethereum === 'undefined') {
        connectButton.disabled = true;
        showError('MetaMask is not installed. Please install MetaMask to continue.');
    }
}); 