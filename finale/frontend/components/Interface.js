import $u from '../utils/$u.js';
import { ethers } from "ethers";
import React, { useState, useRef } from 'react';



const wc = require("../circuit/witness_calculator.js");

// const tornadoAddress = "0x06DB9c2856Eab779B2794E98c769a2e6aDA4D4b6";
const tornadoAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"

const tornadoJSON = require("../json/Tornado.json");
const tornadoABI = tornadoJSON.abi;
const tornadoInterface = new ethers.utils.Interface(tornadoABI);

const ButtonState = { Normal: 0, Loading: 1, Disabled: 2 };

const Interface = () => {
    const [txHash, setTxHash] = useState(null);
    const [account, updateAccount] = useState(null);
    const [proofElements, updateProofElements] = useState(null);
    const [proofStringEl, updateProofStringEl] = useState(null);
    const [textArea, updateTextArea] = useState(null);
    const textAreaRef = useRef(null); // This is how you correctly initialize a ref


    // interface states
    const [section, updateSection] = useState("Deposit");
    const [displayCopiedMessage, updateDisplayCopiedMessage] = useState(false);
    const [withdrawalSuccessful, updateWithdrawalSuccessful] = useState(false);
    const [metamaskButtonState, updateMetamaskButtonState] = useState(ButtonState.Normal);
    const [depositButtonState, updateDepositButtonState] = useState(ButtonState.Normal);
    const [withdrawButtonState, updateWithdrawButtonState] = useState(ButtonState.Normal);


    const connectMetamask = async () => {
        try{
            updateMetamaskButtonState(ButtonState.Disabled);
            if(!window.ethereum){
                alert("Please install Metamask to use this app.");
                throw "no-metamask";
            }

            var accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
            var chainId = window.ethereum.networkVersion;

            // if(chainId != "31337"){
            //     alert("Please switch to Goerli Testnet");
            //     throw "wrong-chain";
            // }

            var activeAccount = accounts[0];
            var balance = await window.ethereum.request({ method: "eth_getBalance", params: [activeAccount, "latest"] });
            balance = $u.moveDecimalLeft(ethers.BigNumber.from(balance).toString(), 18);

            var newAccountState = {
                chainId: chainId,
                address: activeAccount,
                balance: balance
            };
            updateAccount(newAccountState);
        }catch(e){
            console.log(e);
        }

        updateMetamaskButtonState(ButtonState.Normal);
    };
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

    const withdraw = async () => {
        const userInput = textAreaRef.current ? textAreaRef.current.value : '';
    
        try {
            const response = await fetch('http://localhost:3001/receive-data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ param1: userInput })
            });
    
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
    
            const responseData = await response.json();
            console.log(responseData);
            setTxHash(responseData.txHash); // Assuming responseData.txHash contains the transaction hash
        } catch (error) {
            console.error('There was a problem with the fetch operation:', error);
        }
    };
    

    const flashCopiedMessage = async () => {
        updateDisplayCopiedMessage(true);
        setTimeout(() => {
            updateDisplayCopiedMessage(false);
        }, 1000);
    }

    return (
        <div>

            <nav className="navbar navbar-nav fixed-top bg-dark text-light">
                {
                    !!account ? (
                        <div className="container">
                            <div className="navbar-left">
                                <span><strong>ChainId:</strong></span>
                                <br/>
                                <span>{account.chainId}</span>
                            </div>
                            <div className="navbar-right">
                                <span><strong>{account.address.slice(0, 12) + "..."}</strong></span>
                                <br/>
                                <span className="small">{account.balance.slice(0, 10) + ((account.balance.length > 10) ? ("...") : (""))} ETH</span>
                            </div>
                        </div>
                    ) : (
                        <div className="container">
                            <div className="navbar-left"><h5>NFTA-Tornado</h5></div>
                            <div className="navbar-right">
                                <button 
                                    className="btn btn-primary" 
                                    onClick={connectMetamask}
                                    disabled={metamaskButtonState == ButtonState.Disabled}    
                                >Connect Metamask</button>
                            </div>
                        </div>
                    )
                }

                
            </nav>

            <div style={{ height: "60px" }}></div>

            <div className="container" style={{ marginTop: 60 }}>
                <div className="card mx-auto" style={{ maxWidth: 450 }}>
                    {
                        (section == "Deposit") ? (
                            <img className="card-img-top" src="/img/+18.png" />
                        ) : (
                            <img className="card-img-top" src="/img/+18.png" />
                        )
                    }
                    <div className="card-body">

                        <div className="btn-group" style={{ marginBottom: 20 }}>
                            {
                                (section == "Deposit") ? (
                                    <button className="btn btn-primary">Obtén tu clave +18</button>
                                ) : (
                                    <button onClick={() => { updateSection("Deposit"); }} className="btn btn-outline-primary">Obtén tu clave +18</button>   
                                )
                            }
                            {
                                (section == "Deposit") ? (
                                    <button onClick={() => { updateSection("Withdraw"); }} className="btn btn-outline-primary">Obtenerla de forma manual</button> 
                                ) : (
                                    <button className="btn btn-primary">Obtenerla de forma manual</button>
                                )
                            }
                        </div>

                        {
                            (section == "Deposit" && !!account) && (
                                <div>
                                    {
                                        (!!proofElements) ? (
                                            <div>
                                                <div className="alert alert-success">
                                                    <span><strong>Proof of Deposit:</strong></span>
                                                    <div className="p-1" style={{ lineHeight: "12px" }}>
                                                        <span style={{ fontSize: 10 }} ref={(callInputs) => { updateProofStringEl(callInputs); }}>{callInputs}</span>
                                                    </div>

                                                </div>

                                                <div>
                                                    <button className="btn btn-success" onClick={copyProof}><span className="small">Copy Proof String</span></button>
                                                    {
                                                        (!!displayCopiedMessage) && (
                                                            <span className="small" style={{ color: 'green' }}><strong> Copied!</strong></span>
                                                        )
                                                    }
                                                </div>
                                                
                                            </div>
                                        ) : (
                                            <div>
                                                <p className="text-secondary">Nota: Las claves son totalmente anónimas por lo que nadie podrá identificarte.</p>
                                                <button 
                                                    className="btn btn-success" 
                                                    onClick={depositEther}
                                                    disabled={depositButtonState == ButtonState.Disabled}
                                                ><span className="small">Reclamar clave</span></button>
                                            </div>
                                            
                                        )
                                    }
                                </div>
                            )
                        }

                        {
                            (section != "Deposit" && !!account) && (
                                <div>
                                    {
                                        (withdrawalSuccessful) ? (
                                            <div>
                                                <div className="alert alert-success p-3">
                                                    <div><span><strong>Success!</strong></span></div>
                                                    <div style={{ marginTop: 5 }}>
                                                        <span className="text-secondary">Withdrawal successful. You can check your wallet to verify your funds.</span>
                                                    </div>

                                                </div>
                                            </div>
                                        ) : (
                                            <div>
                                                <p className="text-secondary">Nota: Para realizar esta prueba necesitas conocimiento técnico y se recomienda seguir x tutorial.</p>
                                                <div className="form-group">
                                                    <textarea className="form-control" style={{ resize: "none" }} ref={textAreaRef}></textarea>
                                                </div>
                                                {
                                                txHash ? (
                                                    <div>
                                                        <span>Your transaction hash is: {txHash}</span>
                                                    </div>
                                                ) : (
                                                <button 
                                                    className="btn btn-primary" 
                                                    onClick={withdraw}
                                                    disabled={withdrawButtonState == ButtonState.Disabled}
                                                ><span className="small">Incluir commitment</span></button>
                                                )
                                                } 
                                            </div>                  
                                        )
                                    }
                                </div>
                            )
                        }

                        {
                            (!account) && (
                                <div>
                                    <p>Please connect your wallet to use the sections.</p>
                                </div>
                            )
                        }


                    </div>


                </div>
            </div>
        </div>
    )
};

export default Interface;