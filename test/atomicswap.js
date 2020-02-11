const AtomicSwap = artifacts.require("./AtomicSwap.sol");
const abi = require('ethereumjs-abi')
const crypto = require('crypto');
const BN = web3.utils.BN;

contract("AtomicSwap", accounts => {
    it("...initiate", async () => {

      const alice = accounts[0]
      const aliceInitialBalance = new BN(await web3.eth.getBalance(alice))
      const bob = accounts[1]
      const bobInitialBalance = new BN(await web3.eth.getBalance(bob))

      console.log("alice: ", aliceInitialBalance, " bob: ", bobInitialBalance)

      const escrowAmount = new BN(10)

      const secretBuffer = crypto.randomBytes(32);
      const secret = secretBuffer // to explore other options here
    
      const hashedSecret = abi.soliditySHA3(["bytes32"], [secret])
    //   console.log("hashedSecret: ", hashedSecret.toString('hex'), " secret: ", secret.toString('hex'))

      const atomicSwapInstance = await AtomicSwap.deployed();
  
      await atomicSwapInstance.initiate(7200, hashedSecret, alice, {from: bob, value: 10})

      // redeeming by bob works
      await atomicSwapInstance.redeem(secret, hashedSecret, {from:bob})

      let aliceBalance = new BN(await web3.eth.getBalance(alice))
      let bobBalance = new BN(await web3.eth.getBalance(bob))

        console.log("bob initial: ", bobInitialBalance, "bob expected: ", bobInitialBalance.sub(escrowAmount))

    //   assert.equal(bobBalance.toString(10), bobInitialBalance.sub(escrowAmount).toString(10), "bob's balance not right")
      assert.equal(aliceBalance.toString(10), aliceInitialBalance.add(escrowAmount).toString(10), "alice's balance not right")
    });
  });