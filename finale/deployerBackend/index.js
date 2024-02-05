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






//-------------------------------------------------------------
/*
    const depositEther = async () => {
        let proofString;
        updateDepositButtonState(ButtonState.Disabled);
// ------------------------PASO 1 - GENERAR SECRET Y NULLIFIER------------------------------------------------------------
        const secret = ethers.BigNumber.from(ethers.utils.randomBytes(32)).toString();
        const nullifier = ethers.BigNumber.from(ethers.utils.randomBytes(32)).toString();
        console.log("Secret generated:", secret);
        console.log("Nullifier generated:", nullifier);

        const input = {
            secret: $u.BN256ToBin(secret).split(""),
            nullifier: $u.BN256ToBin(nullifier).split("")
        };
        console.log("Input prepared:", input);

        var res = await fetch("/deposit.wasm");
        var buffer = await res.arrayBuffer();
        var depositWC = await wc(buffer);

        const r = await depositWC.calculateWitness(input, 0);
        console.log("Witness calculated:", r);

        const commitment = r[1];
        console.log("Commitment:", commitment);

        const nullifierHash = r[2];
        console.log("NullifierHash:", nullifierHash);


        const value = ethers.BigNumber.from("100000000000000000").toHexString();
//----------------------------------------------------------------------------------
        const tx = {
            to: tornadoAddress,
            from: account.address,
            value: value,
            data: tornadoInterface.encodeFunctionData("deposit", [commitment])
        };
        console.log("Transaction prepared:", tx);


        try{
            const txHash = await window.ethereum.request({ method: "eth_sendTransaction", params: [tx] });

            const proofElements = {
                nullifierHash: `${nullifierHash}`,
                secret: secret,
                nullifier: nullifier,
                commitment: `${commitment}`,
                txHash: txHash
            };

            console.log(proofElements);

            // proofString = updateProofElements(btoa(JSON.stringify(proofElements)));
            proofString = btoa(JSON.stringify({
                nullifierHash: `${nullifierHash}`,
                secret: secret,
                nullifier: nullifier,
                commitment: `${commitment}`,
                txHash: txHash
            }));
        }catch(e){
            console.log(e);
        }

        updateDepositButtonState(ButtonState.Normal);
    // };
    // const copyProof = () => {
    //     if(!!proofStringEl){
    //         flashCopiedMessage();
    //         navigator.clipboard.writeText(proofStringEl.innerHTML);
    //     }  
    // };
    // const withdraw = async () => {
        console.log("Starting withdrawal process");
        console.log(tornadoAddress)
        updateWithdrawButtonState(ButtonState.Disabled);
    
    
        try {
            // console.log("Retrieving proof string from text area");
            // const proofString = textArea.value;
            // console.log("Decoding proof string");
            const proofElements = JSON.parse(atob(proofString));
            console.log("proofelements:", proofElements);

            console.log("Requesting transaction receipt for txHash:", proofElements.txHash);
            receipt = await window.ethereum.request({ method: "eth_getTransactionReceipt", params: [proofElements.txHash] });
    
            if (!receipt) {
                throw "empty-receipt";
            }
    
            console.log("Receipt obtained:", receipt);
            const log = receipt.logs[0];
            console.log(log)
            const decodedData = tornadoInterface.decodeEventLog("Deposit", log.data, log.topics);
            console.log("Decoded log data:", decodedData);
    
            const proofInput = {
                "root": $u.BNToDecimal(decodedData.root),
                "nullifierHash": proofElements.nullifierHash,
                "recipient": $u.BNToDecimal(account.address),
                "secret": $u.BN256ToBin(proofElements.secret).split(""),
                "nullifier": $u.BN256ToBin(proofElements.nullifier).split(""),
                "hashPairings": decodedData.hashPairings.map((n) => ($u.BNToDecimal(n))),
                "hashDirections": decodedData.pairDirection
            };
            console.log("Proof input prepared:", proofInput);
    
            console.log("Generating zk-SNARK proof using groth16");
            const { proof, publicSignals } = await window.snarkjs.groth16.fullProve(proofInput, "/withdraw.wasm", "/setup_final.zkey");
            console.log("Proof generated:", proof);
    
            const callInputs = [
                proof.pi_a.slice(0, 2).map($u.BN256ToHex),
                proof.pi_b.slice(0, 2).map((row) => ($u.reverseCoordinate(row.map($u.BN256ToHex)))),
                proof.pi_c.slice(0, 2).map($u.BN256ToHex),
                publicSignals.slice(0, 2).map($u.BN256ToHex)
            ];
            console.log("aqui ya puede terminaaaaaar")
            console.log("Formatted call inputs for smart contract:", callInputs);
    
            const callData = tornadoInterface.encodeFunctionData("withdraw", callInputs);
            const tx = {
                to: tornadoAddress,
                from: account.address,
                data: callData
            };
            console.log("Prepared transaction:", tx);
    
            console.log("Sending transaction");
            const txHash = await window.ethereum.request({ method: "eth_sendTransaction", params: [tx] });
            console.log("Transaction sent, txHash:", txHash);
    
            var receipt;
            console.log("Waiting for transaction receipt");
            while (!receipt) {
                receipt = await window.ethereum.request({ method: "eth_getTransactionReceipt", params: [txHash] });
                await new Promise((resolve) => { setTimeout(resolve, 1000); });
            }
    
            console.log("Transaction receipt received:", receipt);
            if (!!receipt) {
                updateWithdrawalSuccessful(true);
            }
        } catch (e) {
            console.log("Error during withdrawal process:", e);
        }
    
        updateWithdrawButtonState(ButtonState.Normal);
        console.log("Withdrawal process completed");
    };
    */