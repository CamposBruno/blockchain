const {Blockchain, Transaction} = require('./lib/blockchain')
const EC = require('elliptic').ec
const ec = new EC('secp256k1')

const myKey = ec.keyFromPrivate('c6eaf0b71b2ea35fdb6437549653bfe43f9a612c8c0ff54dbc062f5adf17a1de')
const myWalletAddress = myKey.getPublic('hex')

let bhCoin = new Blockchain()

//const t1 = new Transaction(myWalletAddress, 'pub random', 10)

try {
    //t1.signTransaction(myKey)

    //bhCoin.addTransaction(t1)

    console.log('starting miner...')
    bhCoin.init().then(() => {
        bhCoin.minePendingTransactions(myWalletAddress)
    })
    
    

    //console.log('balance of bruno-address is...', bhCoin.getBalanceOfAddress(myWalletAddress))
    //console.log('is Valid blockchain? ', bhCoin.isChainValid())

    //console.log()
    //console.log(JSON.stringify(bhCoin.chain, null, 4))
    
} catch (error) {
    console.log(error.message)    
}


//console.log(bhCoin)
//console.log('is Valid blockchain? ', bhCoin.isChainValid())