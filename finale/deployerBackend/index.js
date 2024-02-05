const express = require('express');
const cors = require('cors');
const { ethers } = require("ethers");
require('dotenv').config();
const { generateProofAndCallInputs } = require('/home/adanlg2/zero-knowledge/NFTA-Tornado-Resources/finale/frontend/components/createZKProof.js');
const wc = require("/home/adanlg2/zero-knowledge/NFTA-Tornado-Resources/finale/circuit/deposit_js/witness_calculator.js"); 
const fs = require('fs').promises; 
const app = express();

// Enable CORS for all requests
app.use(cors());

app.use(express.json());

// The rest of your backend code...


// Hardhat Network Configuration
const provider = new ethers.providers.JsonRpcProvider("http://localhost:8545");

// Contract details 
const contractAddress = "0x66Db6d191cd163F56197b767928A507dF8b47AA7";
const contractABI = [{"inputs":[{"internalType":"address","name":"_hasher","type":"address"},{"internalType":"address","name":"_verifier","type":"address"},{"internalType":"address","name":"_owner","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"root","type":"uint256"},{"indexed":false,"internalType":"uint256[10]","name":"hashPairings","type":"uint256[10]"},{"indexed":false,"internalType":"uint8[10]","name":"pairDirection","type":"uint8[10]"}],"name":"Deposit","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"nullifierHash","type":"uint256"}],"name":"Withdrawal","type":"event"},{"inputs":[{"internalType":"uint256[2]","name":"a","type":"uint256[2]"},{"internalType":"uint256[2][2]","name":"b","type":"uint256[2][2]"},{"internalType":"uint256[2]","name":"c","type":"uint256[2]"},{"internalType":"uint256[2]","name":"input","type":"uint256[2]"}],"name":"canWithdraw","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"commitments","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"_commitment","type":"uint256"}],"name":"deposit","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"nextLeafIdx","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"nullifierHashes","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"roots","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"treeLevel","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"verifier","outputs":[{"internalType":"contract IVerifier","name":"","type":"address"}],"stateMutability":"view","type":"function"}];



const contract = new ethers.Contract(contractAddress, contractABI, provider);

// Using the private key from .env
const privateKey = process.env.PRIVATE_KEY;
const wallet = new ethers.Wallet(privateKey, provider);

const utils = {
    moveDecimalLeft: (str, count) => {
        let start = str.length - count;
        let prePadding = "";

        while(start < 0){
            prePadding += "0";
            start += 1;
        }

        str = prePadding + str;
        let result = str.slice(0, start) + "." + str.slice(start);
        if(result[0] == "."){
            result = "0" + result;
        }

        return result;
    },
    BN256ToBin: (str) => {
        let r = BigInt(str).toString(2);
        let prePadding = "";
        let paddingAmount = 256 - r.length;
        for(var i = 0; i < paddingAmount; i++){
            prePadding += "0";
        }
        return prePadding + r;
    },
    BN256ToHex: (n) => {
        let nstr = BigInt(n).toString(16);
        while(nstr.length < 64){ nstr = "0" + nstr; }
        nstr = `0x${nstr}`;
        return nstr;
    },
    BNToDecimal: (bn) => {
        return ethers.BigNumber.from(bn).toString();
    },
    reverseCoordinate: (p) => {
        let r = [0, 0];
        r[0] = p[1];
        r[1] = p[0];
        return r;
    }
};

app.post('/api/deposit', async (req, res) => {
    try {
        
        const secret = ethers.BigNumber.from(ethers.utils.randomBytes(32)).toString();
        const nullifier = ethers.BigNumber.from(ethers.utils.randomBytes(32)).toString();
        console.log("Secret generated:", secret.endsWith('n') ? secret.slice(0, -1) : secret);
        console.log("Nullifier generated:", nullifier.endsWith('n') ? nullifier.slice(0, -1) : nullifier);

        const input = {
            secret: utils.BN256ToBin(secret).split(""),
            nullifier: utils.BN256ToBin(nullifier).split("")
        };

        var buffer = await fs.readFile("/home/adanlg2/zero-knowledge/NFTA-Tornado-Resources/finale/circuit/deposit_js/deposit.wasm");
        var depositWC = await wc(buffer);

        const r = await depositWC.calculateWitness(input, 0);

        // Convert to string and then check for 'n'
        const commitmentStr = r[1].toString();
        formatedCommitment = commitmentStr.endsWith('n') ? commitmentStr.slice(0, -1) : commitmentStr;
        console.log(formatedCommitment)
        // Convert to string and then check for 'n'
        const nullifierHashStr = r[2].toString();
        console.log("NullifierHash:", nullifierHashStr.endsWith('n') ? nullifierHashStr.slice(0, -1) : nullifierHashStr);
        formatedNullifierHash = nullifierHashStr.endsWith('n') ? nullifierHashStr.slice(0, -1) : nullifierHashStr;


        const transactionResponse = await contract.connect(wallet).deposit(formatedCommitment, { gasLimit: ethers.utils.hexlify(3000000) });
        await transactionResponse.wait();
        
        console.log('Transaction response:', transactionResponse);
        console.log('Transaction transactionResponse.txHash)response:', transactionResponse.txHash);
        console.log('Transaction transactionResponse.hash response:', transactionResponse.hash);

        const txHash = transactionResponse.hash;


        const zkProof = await generateProofAndCallInputs(formatedNullifierHash, secret, nullifier, formatedCommitment, txHash);
        console.log(zkProof)
        // Return the transaction hash and callInputs to the frontend
        res.json({ zkProof });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Internal server error');
    }
});


// POST Endpoint
// POST Endpoint
app.post('/receive-data', async (req, res) => {
    try {
        const data = req.body;
        console.log('Data received:', data);

        // Assuming the deposit function takes some parameters, adjust these accordingly
        const depositParam1 = data.param1; // Example: could be an amount, a token address, etc.
        // Add more parameters as required by your contract's deposit function
        console.log('Ddeposit param:', depositParam1);

        // Interacting with the contract using a wallet
        const transactionResponse = await contract.connect(wallet).deposit(depositParam1, { gasLimit: ethers.utils.hexlify(3000000) });
        await transactionResponse.wait();
        
        console.log('Transaction response:', transactionResponse);

        res.status(200).json({txHash: transactionResponse.hash });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Server error');
    }
});

// Server Configuration
const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});



