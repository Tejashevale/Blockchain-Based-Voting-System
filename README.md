# Blockchain Voting System

A decentralized voting system built with Ethereum smart contracts and web3.js.

## Prerequisites

- Node.js and npm installed
- MetaMask browser extension
- Ganache running locally (or access to an Ethereum network)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start Ganache and ensure it's running on port 7545

3. Deploy the smart contract:
- Open `contracts/VotingSystem.sol` in Remix IDE
- Compile and deploy to Ganache
- Copy the deployed contract address

4. Set the contract address:
- Open your browser console
- Run: `localStorage.setItem('votingContractAddress', 'YOUR_CONTRACT_ADDRESS')`

5. Start the server:
```bash
npm start
```

6. Access the application:
- Open http://localhost:3000 in your browser
- Connect MetaMask to Ganache network (Network ID: 5777)

## Features

- Admin Dashboard:
  - Manage elections
  - Add/view candidates
  - Add/view voters
  - Monitor voting
  - Verify votes

- Voter Dashboard:
  - View active elections
  - Cast votes
  - View vote history
  - Verify vote status

## Security

- Only admin can create elections and add candidates
- Voters can only vote once per election
- Votes are recorded on the blockchain
- Vote verification through transaction hashes

## Troubleshooting

1. MetaMask Connection Issues:
   - Ensure Ganache is running
   - Check network ID matches (5777)
   - Verify account is unlocked

2. Contract Interaction Issues:
   - Verify contract address is correct
   - Check console for error messages
   - Ensure account has sufficient ETH

3. Voting Issues:
   - Verify voter is registered
   - Check if election is active
   - Ensure voter hasn't already voted

