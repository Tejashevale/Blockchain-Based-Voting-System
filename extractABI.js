const fs = require('fs');

// Load the compiled contract JSON
const contractJSON = require('./build/contracts/Election.json');

// Extract the ABI
const abi = contractJSON.abi;

// Save it to a file
fs.writeFileSync('ElectionABI.json', JSON.stringify(abi, null, 2));
console.log('ABI extracted to ElectionABI.json');
