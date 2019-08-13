const express = require('express');
const app = express();
const bodyParser = require('body-parser');
app.use(bodyParser.json());

const EC = require('elliptic').ec
const ec = new EC('secp256k1')


const {Blockchain, Transaction} = require('../lib/blockchain')

const Persist = require('../lib/persist')

const BytehubCoin = new Blockchain()
BytehubCoin.init()


app.get('/chain', async (req, res) => {
    const chain = await new Persist().getChain()
    res.status(200).json(chain)
})

app.get('/balanceOf/:address', async (req, res) => {
    const balance = await BytehubCoin.getBalanceOfAddress(req.params.address)
    res.status(200).json({balance})
})

app.get('/isValid', async (req, res) => {
    try {
        const valid = await BytehubCoin.isChainValid()    
        res.status(200).json({valid})
    } catch (error) {
        res.status(500).json({
            error : 'Blockchain Exception',
            message : error.message,
        })
    }
    
    
})

app.post('/transaction', async (req, res) => {
    const fromAddress = req.body.from.address
    const privateKey = req.body.from.privkey        

    const toAddress = req.body.toAddress
    const amount = req.body.amount
    try {
        if(!fromAddress || !fromAddress.length)
            throw new Error('From address must be informed')
        if(!toAddress || !toAddress.length)
            throw new Error('To address must be informed')
        if(!amount)
            throw new Error('Amount must be informed')  
            
        const balance = await BytehubCoin.getBalanceOfAddress(fromAddress)

        if(balance < amount)
            throw new Error('from address has not enough balance')

        const signingkey = ec.keyFromPrivate(privateKey)

        const new_transaction = new Transaction(fromAddress, toAddress, amount)
        new_transaction.signTransaction(signingkey)

        BytehubCoin.addTransaction(new_transaction)
        
        res.status(200).json(new_transaction)
        
    } catch (error) {
        res.status(400).json({
            error : 'Blockchain Exception',
            message : error.message
        })
    }
    

})


app.listen(3001, function () {
    console.log('> listening on port 3001...');
});
