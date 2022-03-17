// noinspection JSUnresolvedVariable
// window.ethereum object dependent

import './App.css';
import TokenContract from './token_contract';
import DefaultTokenParams from './token_params';
import {ethers} from "ethers";
import {useEffect, useState} from "react";

export default App;

function App() {
    const [connection, setConnection] = useState(null);

    return (
        <div className="App">
            <header className="App-header">
                <ConnectionController connection={connection} setConnection={setConnection}/>
                <DeploymentController connection={connection}/>
            </header>
        </div>
    );
}

function ConnectionController({connection, setConnection}) {
    const connect = async () => {
        // A Web3Provider wraps a standard Web3 provider, which is
        // what MetaMask injects as window.ethereum into each page
        const provider = new ethers.providers.Web3Provider(window.ethereum)

        // MetaMask requires requesting permission to connect users accounts
        const accounts = await provider.send("eth_requestAccounts", []);

        // The MetaMask plugin also allows signing transactions to
        // send ether and pay to change state within the blockchain.
        // For this, you need the account signer...
        const signer = provider.getSigner();

        if (accounts.length === 0) {
            setConnection(null);
        }
        setConnection({
            provider: provider,
            signer: signer,
            accounts: accounts
        });
    };

    useEffect(() => {
        if (connection) {
            window.ethereum.on('accountsChanged', (newAccounts) => {
                if (newAccounts.length === 0) {
                    setConnection(null);
                }
            });
        }
    }, [connection, setConnection]);

    if (!window.ethereum) {
        return <>
            <h1>Uh oh, you don't have Metamask integration in your browser</h1>
            <p>Metamask onboard should start here...</p>
        </>;
    }

    if (connection) {
        return null; // connection obtained
    }

    return <button onClick={connect}>Connect Metamask</button>;
}

const OWNER = "owner";
const NAME = "name";
const SYMBOL = "symbol";
const INITIAL_SUPPLY = "initialSupply";

function DeploymentController({connection}) {
    const [tokenParams, setTokenParams] = useState(DefaultTokenParams);

    const onTokenParamChanged = (name, value) => {
        setTokenParams(prev => {
            return Object.assign({}, prev, {[name]: value});
        })
    };

    useEffect(() => onTokenParamChanged(OWNER, connection?.accounts[0]), [connection]);

    const makeInput = (label, name, type) => {
        return <><label>{label} </label><input type={type}
                                               onChange={(e) => onTokenParamChanged(name, e.target.value)}
                                               value={tokenParams[name] ?? ""}/></>;
    }

    const [deploymentStatus, setDeploymentStatus] = useState(null);

    const deploy = async ({accounts, signer}, {name, symbol, initialSupply, owner}) => {
        const factory = new ethers.ContractFactory(TokenContract.abi, TokenContract.bytecode, signer)
        setDeploymentStatus({isFinite: false, msg: "Releasing you token", details: "Please be patient"});
        try {
            const contract = await factory.deploy(name, symbol, initialSupply, owner);
            // The contract is not currently live on the network yet, however
            // its address is ready for us
            // '0x84C86C4E213449E65aF2274E5E2ce137631B9796'
            // Wait until the contract has been deployed before interacting
            // with it; returns the receipt for the deployment transaction
            await contract.deployTransaction.wait();
            setDeploymentStatus({
                isFinite: true, msg: "Token has been released!",
                details: `Token's smart contract address: ${contract.address}`
            });
        } catch (e) {
            setDeploymentStatus({isFinite: true, msg: "Uh oh, error occurred", details: e.message});
        }
    }

    if (!connection) {
        return null;
    }

    if (deploymentStatus) {
        return <DeploymentStatusController deploymentStatus={deploymentStatus}
                                           setDeploymentStatus={setDeploymentStatus}/>;
    }

    return <>
        {makeInput("Token name", NAME)}
        {makeInput("Token symbol", SYMBOL)}
        {makeInput("Initial supply", INITIAL_SUPPLY, "number")}
        {makeInput("Token owner", OWNER)}
        <button onClick={() => deploy(connection, tokenParams)}>Release!</button>
    </>;
}

function DeploymentStatusController({deploymentStatus, setDeploymentStatus}) {
    if (!deploymentStatus) {
        return null;
    }

    return (
        <div className="App">
            <header className="App-header">
                <h2>{deploymentStatus.msg}</h2>
                <p>{deploymentStatus.details}</p>
                {deploymentStatus.isFinite && <button onClick={() => setDeploymentStatus(null)}>Try again?</button>}
            </header>
        </div>
    );
}