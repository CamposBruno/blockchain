const config = require('config')
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
app.use(bodyParser.json());

const reqPromise = require('request-promise')

const EC = require('elliptic').ec
const ec = new EC('secp256k1')


const {Blockchain, Transaction, Block} = require('../lib/blockchain')


const _blockchain = new Blockchain()
_blockchain.init()


app.get('/chain', async (req, res) => {
    await _blockchain.init()
    res.status(200).json(_blockchain)
})

app.get('/balanceOf/:address', async (req, res) => {
    const balance = await _blockchain.getBalanceOfAddress(req.params.address)
    res.status(200).json({balance})
})

app.get('/isValid', async (req, res) => {
    try {
        const valid = await _blockchain.isChainValid()    
        res.status(200).json({valid})
    } catch (error) {
        res.status(500).json({
            error : 'Blockchain Exception',
            message : error.message,
        })
    }
    
    
})

app.get('/sync', async (req, res) => {
    // find node
    // request chunk of block to sync from node passing the last block hash
    // verify blocks
    // persist to my chain

    try {
        const longestNodeUrl = await longestChainNode()

        console.log('sync with ' + longestNodeUrl)
        const blocksSync = await sync(longestNodeUrl)    

        return res.status(200).json({
            message : 'Sucessfuly sync',
            blocksSync
        })
        
    } catch (error) {
        return res.status(400).json({
            message : error.message
        })
    }
    
})

app.get('/broadcast-chain/:lastBlockHash', async (req, res) => {
    console.log('hey! send me all blocks after ' + req.params.lastBlockHash)
    const chain = _blockchain.chain
    const lastBlockHash = _blockchain.getLatestBlock().hash
    const limit = 100

    const start = (chain.map(block => block.hash).indexOf(req.params.lastBlockHash) + 1)
    const latestBlocks = chain.slice(start , start + limit)

    res.status(200).json({
        latestHash : lastBlockHash,
        blocks : latestBlocks
    })
})

app.post('/incoming-block', async (req, res) => {
    const block = req.body.block
    try {

        if(!block || !block.timestamp || !block.transactions || !block.previousHash || !block.nonce || !block.hash )
            throw new Exception('Invalid block')

        const new_block = new Block(block.timestamp, block.transactions, block.previousHash, block.nonce)                

        _blockchain.incomingBlock(new_block, block.hash)
        
        return res.status(200).json({
            message : 'Block accepted'
        })
        
    } catch (error) {
        return res.status(400).json({
            message : error.message
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
            
        const balance = await _blockchain.getBalanceOfAddress(fromAddress)

        if(balance < amount)
            throw new Error('from address has not enough balance')

        const signingkey = ec.keyFromPrivate(privateKey)

        const new_transaction = new Transaction(fromAddress, toAddress, amount)
        new_transaction.signTransaction(signingkey)

        _blockchain.addTransaction(new_transaction)
        
        res.status(200).json(new_transaction)
        
    } catch (error) {
        res.status(400).json({
            error : 'Blockchain Exception',
            message : error.message
        })
    }
    

})

app.post('/register-node', (req, res) => {
    const nodeUrl = req.body.nodeUrl
    try {
        if(_blockchain.networkNodes.indexOf(nodeUrl) >= 0)
            throw new Error('Node already registered')
    
        if(_blockchain.nodeUrl === nodeUrl)
            throw new Error('Self registered is not permited')

        _blockchain.networkNodes.push(nodeUrl)    

        return res.status(200).json({
            message : 'A node registers successfully!'
        })

    } catch (error) {
        return res.status(400).json({
            message : error.message
        })
    }
    
})

app.post('/register-bulk-nodes', (req, res) => {
    const networkNodes = req.body.networkNodes;

    console.log('Register this nodes ', networkNodes)
    try {

        networkNodes.forEach(nodeUrl => {
            if(_blockchain.networkNodes.indexOf(nodeUrl) >= 0)
                throw new Error('Node already registered')
    
            if(_blockchain.nodeUrl === nodeUrl)
                throw new Error('Self register is not permited')

            _blockchain.networkNodes.push(nodeUrl);
        })

        return res.status(200).json({
            message : 'A node registers successfully!'
        })

        
    } catch (error) {
        return res.status(400).json({
            message : error.message
        })
    }
})

app.post('/register-and-broadcast-node', async (req, res) => {
    const nodeUrl = req.body.nodeUrl;
    try {

        if(_blockchain.networkNodes.indexOf(nodeUrl) >= 0)
            throw new Error('Node already registered')

        if(_blockchain.nodeUrl === nodeUrl)
            throw new Error('Self registered is not permited')
        

        const registerNodes = [];

        _blockchain.networkNodes.forEach(networkNode => {
            const requestOptions = {
                uri: networkNode + '/register-node',
                method: 'POST',
                body: { nodeUrl: nodeUrl },
                json: true
            }
     
            registerNodes.push(reqPromise(requestOptions));
        });

        await Promise.all(registerNodes)        

        const bulkRegisterOptions = {
            uri: nodeUrl + '/register-bulk-nodes',
            method: 'POST',
            body: { networkNodes: [..._blockchain.networkNodes, _blockchain.nodeUrl] },
            json: true  
        }

        _blockchain.networkNodes.push(nodeUrl);

        await reqPromise(bulkRegisterOptions);

        return res.status(200).json({
            message : 'A node registers with network successfully!'
        })

        

    } catch (error) {
        return res.status(400).json({
            message : error.message
        })
    }
    
})

async function sync(nodeUrl){
    const requestOptions = {
        uri: nodeUrl + '/broadcast-chain/' + _blockchain.getLatestBlock().hash,
        method: 'GET',
        json: true
    }

    const response = await reqPromise(requestOptions);
    
    // {latestHash : 'HASH', blocks : [{}, {}, {}]}

    response.blocks.forEach((block) => {
        const new_block = new Block(block.timestamp, block.transactions, block.previousHash, block.nonce)        

        if(block.hash !== new_block.calculateHash())
            throw new Error(`block ${block.hash} is invalid`)
        
        if(!new_block.hasValidTransaction())
            throw new Error(`block ${block.hash} has is invalid transactions`)
        
        _blockchain.appendBlock(new_block)
        
    })

    if(_blockchain.getLatestBlock().hash !== response.latestHash)
        sync(nodeUrl)
    
        

}


async function longestChainNode(){
    const requests = [];
    console.log(_blockchain.networkNodes)
    _blockchain.networkNodes.forEach(nodeUrl => {
        const requestOptions = {
            uri: nodeUrl + '/chain',
            method: 'GET',
            json: true
        }

        requests.push(reqPromise(requestOptions));

    })

    const blockchains = await Promise.all(requests)
    const currentChainLength = _blockchain.chain.length;
    let maxChainLength = currentChainLength;
    let nodeWithlongestChain = null;

    blockchains.forEach(blockchain => {
        if (blockchain.chain.length >= maxChainLength) {
            maxChainLength = blockchain.chain.length;
            nodeWithlongestChain = blockchain.nodeUrl;            
        }
    });

    return nodeWithlongestChain
    
}

const port = process.argv[2];

app.listen(port, function () {
    console.log(`> listening on port ${port}`);
});
