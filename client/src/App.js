import React, { Component } from "react";
import AtomicSwapContract from "./contracts/AtomicSwap.json";
import getWeb3 from "./getWeb3";
import {Community, Tupelo, EcdsaKey, defaultNotaryGroup, p2p, ChainTree, setOwnershipTransaction} from 'tupelo-wasm-sdk'
import debug from 'debug';
import "./App.css";
import abi from 'ethereumjs-abi'
import {Ownership, PublicKey} from 'tupelo-messages/signatures/signatures_pb'
// import EthTx from 'ethereumjs-tx'

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
      const { web3, accounts, contract, community } = this.state;

      const secret = Buffer.from('secret12')

      const tupeloAliceKey = await EcdsaKey.generate()
      // bob creates a new tupelo key
      const tupeloBobKey = await EcdsaKey.generate()
      log("key created")    

      const aliceEthAccount = web3.eth.accounts.privateKeyToAccount(Buffer.from(tupeloAliceKey.privateKey).toString('hex'))
      console.log('after eth account')

      const addr = await tupeloAliceKey.address()      

      // alice has a valuable chaintree
      // bob's got eth      


      // in the example we're creating a new tree, but it would probabl
      // pre-exist
      const tree = await ChainTree.newEmptyTree(this.state.community.blockservice, tupeloAliceKey)
      log("tree created")
  
  
      const tupeloHash = await Tupelo.hash(secret)
      
      // alice escrows her chaintree
      const ownership = new Ownership()
      console.log("tupelo bob key: ", tupeloBobKey.publicKey)
      const pubKey = new PublicKey()
      pubKey.setPublicKey(tupeloBobKey.publicKey)
      pubKey.setType(PublicKey.Type.KEYTYPESECP256K1)
      ownership.setPublicKey(pubKey)
      ownership.setConditions('(== (hashed-preimage) "' + "0x" + Buffer.from(tupeloHash).toString('hex') +'")')
      
      const newAddr = await Tupelo.ownershipToAddress(ownership)

      await community.playTransactions(tree, [setOwnershipTransaction([newAddr])])

      log("alice's chaintree is escrowed!")
      // alice sends bob the conditions
      
      // bob checks on the chaintree to make sure that it's escrowed
      // then escrows 10 eth into the smart contract
  
      const ethHash = abi.soliditySHA3(["bytes32"], [secret])
  
      let resp = await contract.methods.initiate(7200, ethHash, addr).send({from: accounts[0], value: web3.utils.toWei("0.5", "ether")})
      console.log("resp: ", resp)     
      // now bob has escrowed his eth to the hash as well.
      // he'll listen for the redeem:
      contract.once('Redeemed', (err,evt)=> {
        console.log('err: ', err, ' evt: ', evt)
      })

      // in this example bob's gonna give alice a little eth for her transaction, this wouldn't happen in real life.
      const bobToAliceResp = await web3.eth.sendTransaction({
        from: accounts[0],
        to: aliceEthAccount.address,
        value: web3.utils.toWei("0.1", "ether"),
      })
      console.log(bobToAliceResp)
      // now alice claims the eth

      let redeemData = contract.methods.redeem.getData(secret, ethHash)
      
      let rawTransaction = web3.accounts.signTransaction({
        from: aliceEthAccount.address,
        data: redeemData,
      }, tupeloAliceKey.privateKey)


      let redeemResp = await web3.eth.sendRawTransaction(rawTransaction.raw)
      console.log('redeemResp: ', redeemResp)
      // and bob now knows the secret, so he can claim the chaintree

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

