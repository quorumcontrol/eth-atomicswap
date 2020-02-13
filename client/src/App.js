import React, { Component } from "react";
import AtomicSwapContract from "./contracts/AtomicSwap.json";
import getWeb3 from "./getWeb3";
import {Community, Tupelo, EcdsaKey, defaultNotaryGroup, p2p, ChainTree} from 'tupelo-wasm-sdk'
import debug from 'debug';
import "./App.css";
import abi from 'ethereumjs-abi'

const log = debug("atomicswap:main")

window.Tupelo = Tupelo
window.Community = Community
window.defaultNotaryGroup = defaultNotaryGroup
window.p2p = p2p
window.sdk = require('tupelo-wasm-sdk')

class App extends Component {
  state = { storageValue: 0, web3: null, accounts: null, contract: null, community:null };

  componentDidMount = async () => {
    try {

      const communityPromise = Community.getDefault()
      // Get network provider and web3 instance.
      const web3 = await getWeb3();

      // Use web3 to get the user's accounts.
      const accounts = await web3.eth.getAccounts();

      // Get the contract instance.
      const networkId = await web3.eth.net.getId();
      const deployedNetwork = AtomicSwapContract.networks[networkId];
      const instance = new web3.eth.Contract(
        AtomicSwapContract.abi,
        deployedNetwork && deployedNetwork.address,
      );

      let c = await communityPromise

      // Set web3, accounts, and contract to the state, and then proceed with an
      // example of interacting with the contract's methods.
      this.setState({ web3, accounts, contract: instance, community: c }, this.exampleSetup);
      // this.setState({ web3, accounts, contract: instance });
    } catch (error) {
      // Catch any errors for any of the above operations.
      alert(
        `Failed to load web3, accounts, or contract. Check console for details.`,
      );
      console.error(error);
    }
  };

  exampleSetup = async () => {
    try {
      const { web3, accounts, contract } = this.state;

      const tupeloAliceKey = await EcdsaKey.generate()
      console.log("insecure, just generated private key for alice: ", Buffer.from(tupeloAliceKey.privateKey).toString('hex'))
      const addr = await tupeloAliceKey.address()
      log("key created")    
      const tree = await ChainTree.newEmptyTree(this.state.community.blockservice, tupeloAliceKey)
      log("tree created")
  
      const secret = Buffer.from('secret')
  
      const tupeloHash = await Tupelo.hash(secret)
      
      // tupelo parts - 
      const ownership = new Ownership()
      ownership.setPublicKey(accounts[0].toString())
      ownership.setConditions('(== (hashed-preimage) "' + "0x" + Buffer.from(tupeloHash).toString('hex') +'")')
      
      const newAddr = await Tupelo.ownershipToAddress(ownership)

      // 
  
      const ethHash = abi.soliditySHA3(["bytes32"], [secret])
  
  
      let resp = await contract.methods.initiate(7200, ethHash, addr).send({from: accounts[0], value: 1000000000})
      console.log("resp: ", resp)
      // // Stores a given value, 5 by default.
      // await contract.methods.set(5).send({ from: accounts[0] });
  
      // // Get the value from the contract to prove it worked.
      // const response = await contract.methods.get().call();
  
      // // Update state with the result.
      // this.setState({ storageValue: response });
    } catch(e) {
      console.error(e)
    }
   
  };

  render() {
    if (!this.state.web3) {
      return <div>Loading Web3, accounts, and contract...</div>;
    }
    return (
      <div className="App">
        <h1>Good to Go!</h1>
        
      </div>
    );
  }
}

export default App;

