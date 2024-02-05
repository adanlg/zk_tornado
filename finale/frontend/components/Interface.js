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
    const [zkProof, setZkProof] = useState(null);
    const [copySuccess, setCopySuccess] = useState('');


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
        updateDepositButtonState(ButtonState.Loading);
    
        try {
            const response = await fetch('http://localhost:3001/api/deposit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                // Include any necessary data in the body, if required by your backend
            });
    
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
    
            const responseData = await response.json();
            console.log("zkProof:", responseData.zkProof);
    
            // Update state or UI here with txHash or zkProof as needed
            setZkProof(responseData.zkProof);
    
            updateDepositButtonState(ButtonState.Normal);
        } catch (error) {
            console.error('There was a problem with the deposit operation:', error);
            updateDepositButtonState(ButtonState.Normal);
        }
    };
    const copyProof = () => {
        navigator.clipboard.writeText(zkProof)
            .then(() => {
                setCopySuccess('Successfully copied!');
                setTimeout(() => setCopySuccess(''), 2000); // Reset the message after 2 seconds
            })
            .catch(err => console.error('Error in copying text: ', err));
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
            {/* Navigation Bar */}
            <nav className="navbar navbar-nav fixed-top bg-dark text-light">
                {account ? (
                    <div className="container">
                        <div className="navbar-left">
                            <span><strong>ChainId:</strong> {account.chainId}</span>
                        </div>
                        <div className="navbar-right">
                            <span><strong>{account.address.slice(0, 12) + "..."}</strong></span><br/>
                            <span className="small">{account.balance} ETH</span>
                        </div>
                    </div>
                ) : (
                    <div className="container">
                        <div className="navbar-left"><h5>NFTA-Tornado</h5></div>
                        <div className="navbar-right">
                            <button className="btn btn-primary" onClick={connectMetamask} disabled={metamaskButtonState === ButtonState.Disabled}>Connect Metamask</button>
                        </div>
                    </div>
                )}
            </nav>
    
            <div style={{ height: "60px" }}></div>
    
            {/* Main Content */}
            <div className="container" style={{ marginTop: 60 }}>
                <div className="card mx-auto" style={{ maxWidth: 450 }}>
                    {/* Image Section */}
                    <img className="card-img-top" src={section === "Deposit" ? "/img/+18.png" : "/img/+18.png"} alt="Section Top"/>
    
                    {/* Card Body */}
                    <div className="card-body">
                        {/* Button Group for Toggling Sections */}
                        <div className="btn-group" style={{ marginBottom: 20 }}>
                            <button onClick={() => updateSection("Deposit")} className={`btn ${section === "Deposit" ? "btn-primary" : "btn-outline-primary"}`}>Obtén tu clave +18</button>
                            <button onClick={() => updateSection("Withdraw")} className={`btn ${section !== "Deposit" ? "btn-primary" : "btn-outline-primary"}`}>Obtenerla de forma manual</button>
                        </div>
    
                        {/* Deposit Section */}
                        {section === "Deposit" && !!account && (
                            <div>
                                {!zkProof ? (
                                    <div>
                                        <p className="text-secondary">Nota: Las claves son totalmente anónimas por lo que nadie podrá identificarte.</p>
                                        <button className="btn btn-success" onClick={depositEther} disabled={depositButtonState === ButtonState.Disabled}>Reclamar clave</button>
                                    </div>
                                ) : (
                                    <div className="alert alert-success">
                                        <h3>ZK Proof:</h3>
                                        <pre>{zkProof}</pre>
                                        <button className="btn btn-success" onClick={copyProof}>
                                            {copySuccess || 'Copy ZK Proof'}
                                        </button>
                                        {copySuccess && <span className="text-success"> </span>}
                                    </div>
                                )}
                            </div>
                        )}
    
                        {/* Withdraw Section */}
                        {section !== "Deposit" && !!account && (
                            <div>
                                {withdrawalSuccessful ? (
                                    <div className="alert alert-success p-3">
                                        <span><strong>Success!</strong> Withdrawal successful.</span>
                                    </div>
                                ) : (
                                    <div>
                                        <p className="text-secondary">Nota: Para realizar esta prueba necesitas conocimiento técnico.</p>
                                        <textarea className="form-control" ref={textAreaRef} style={{ resize: "none" }}></textarea>
                                        <button className="btn btn-primary" onClick={withdraw} disabled={withdrawButtonState === ButtonState.Disabled}>Incluir commitment</button>
                                    </div>
                                )}
                            </div>
                        )}
    
                        {/* Fallback Message */}
                        {!account && (
                            <p>Please connect your wallet to use the sections.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );}
    

export default Interface;