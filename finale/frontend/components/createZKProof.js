const { ethers } = require("ethers");
const $u = require('../utils/$u.js'); // Make sure the path is correct
const wc = require("../circuit/witness_calculator.js"); // Adjust the path if needed
const fs = require('fs').promises; // Node.js File System module for reading files
const snarkjs = require("snarkjs");

// nullifierHash = '16337345868667358249181887308266756927486050092633507510339340407386611673820';
// secret = '34841130713434685204308838876991871864736698047812707106078584156671720914872';
// nullifier = '68887688016891638822722118362034648298874705978437001572542038763343964673546';
// commitment = '359965166896242645977470468570901420414295221297617347605882214646535461999';
// txHash = '0x3b363fd87de7e46efefc27395a0366247aefe60c97bf2cfcedbc003273f88f55';

// const nullifierHash = 16337345868667358249181887308266756927486050092633507510339340407386611673820;
// const secret = 34841130713434685204308838876991871864736698047812707106078584156671720914872;
// const nullifier = 68887688016891638822722118362034648298874705978437001572542038763343964673546;
// const commitment = 359965166896242645977470468570901420414295221297617347605882214646535461999;
// const txHash = '0x3b363fd87de7e46efefc27395a0366247aefe60c97bf2cfcedbc003273f88f55';

const tornadoJSON = require("../json/Tornado.json");
const tornadoABI = tornadoJSON.abi;
const tornadoInterface = new ethers.utils.Interface(tornadoABI);

async function generateProofAndCallInputs(nullifierHash, secret, nullifier, commitment, txHash) {
    console.log("Starting proof generation and formatting call inputs");

    // nullifierHash = '2700696352482512780661509130555567277777767623351577937633015573501557166624';
    // secret = '68756676178404549789360184176440390039714343509120953069065740418239263933562';
    // nullifier = '3817496630803188941691738042967106848519066761534974342029062845705951538944';
    // commitment = '11634418715097060984421157763866574867021249587077492418604459716271739661089';
    // txHash = '0x907d3f85149f191a00cd00ee664214fbd08c42fe76a2d3b54d13b0eea4cea468';

    try {
        const provider = new ethers.providers.JsonRpcProvider('http://localhost:8545');


        const proofElements = {
            nullifierHash: `${nullifierHash}`,
            secret: secret,
            nullifier: nullifier,
            commitment: `${commitment}`,
            txHash: txHash
        };

        console.log(proofElements);

        const proofString = btoa(JSON.stringify(proofElements));
        console.log("Encoded proof string:", proofString);

        const decodedProofElements = JSON.parse(atob(proofString));
        console.log("Decoded proof elements:", decodedProofElements);

        console.log("Requesting transaction receipt for txHash:", decodedProofElements.txHash);
        const receipt = await provider.getTransactionReceipt(txHash);

        if (!receipt) {
            throw new Error("Empty receipt");
        }

        console.log("Receipt obtained:", receipt);
        const log = receipt.logs[0];
        console.log(log);
        const decodedData = tornadoInterface.decodeEventLog("Deposit", log.data, log.topics);
        console.log("Decoded log data:", decodedData);
        Aaddress = '0x976EA74026E726554dB657fA54763abd0C3a0aa9';

        const proofInput = {
            "root": $u.BNToDecimal(decodedData.root),
            "nullifierHash": decodedProofElements.nullifierHash,
            "recipient": $u.BNToDecimal(Aaddress), 
            "secret": $u.BN256ToBin(decodedProofElements.secret).split(""),
            "nullifier": $u.BN256ToBin(decodedProofElements.nullifier).split(""),
            "hashPairings": decodedData.hashPairings.map((n) => ($u.BNToDecimal(n))),
            "hashDirections": decodedData.pairDirection
        };
        console.log("Proof input prepared:", proofInput);

        console.log("Generating zk-SNARK proof using groth16");
        const { proof, publicSignals } = await snarkjs.groth16.fullProve(proofInput, "/home/adanlg2/zero-knowledge/NFTA-Tornado-Resources/finale/circuit/withdraw_js/withdraw.wasm", "/home/adanlg2/zero-knowledge/NFTA-Tornado-Resources/finale/circuit/setup_final.zkey");
        console.log("Proof generated:", proof);

        const callInputs = [
            proof.pi_a.slice(0, 2).map($u.BN256ToHex),
            proof.pi_b.slice(0, 2).map((row) => ($u.reverseCoordinate(row.map($u.BN256ToHex)))),
            proof.pi_c.slice(0, 2).map($u.BN256ToHex),
            publicSignals.slice(0, 2).map($u.BN256ToHex)
        ];
        console.log("Formatted call inputs for smart contract:", callInputs);

        console.log("Copia y pega tu ZK Proof")
        function transformAndFormatArray(inputArray) {
            // Transform the array into a string and remove the first and last characters (which are [ and ])
            let result = JSON.stringify(inputArray).slice(1, -1);
        
            // Replace all instances of '],' with '],\n  ' for formatting (to add a new line and indentation after each array closing)
            result = result.replace(/\],/g, '],\n  ');
        
            return result;
        }

        const formattedOutput = transformAndFormatArray(callInputs);
        console.log(formattedOutput);
        return formattedOutput

    } catch (e) {
        console.error("An error occurred:", e);
    }
}

// Example usage
// You need to replace 'yourValuesHere' with actual values for nullifierHash, secret, etc.
generateProofAndCallInputs('yourNullifierHashHere', 'yourSecretHere', 'yourNullifierHere', 'yourCommitmentHere', 'yourTxHashHere');

module.exports = { generateProofAndCallInputs };
