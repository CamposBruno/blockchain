const config = require('config')
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
app.use(bodyParser.json());

const reqPromise = require('request-promise')

const EC = require('elliptic').ec
const ec = new EC('secp256k1')


const {Blockchain, Transaction, Block} = require('../lib/blockchain')


const BytehubCoin = new Blockchain()
BytehubCoin.init()


app.get('/chain', async (req, res) => {
    //const chain = await new Persist().getChain() 
    res.status(200).json(BytehubCoin)
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

app.get('/sync', async (req, res) => {
    // find node
    // request chunk of block to sync from node passing the last block hash
    // verify blocks
    // persist to my chain

    try {
        const longestNodeUrl = await longestChainNode()
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
    const chain = BytehubCoin.chain
    const lastBlockHash = BytehubCoin.getLatestBlock().hash
    const limit = 100

    const start = (chain.map(block => block.hash).indexOf(req.params.lastBlockHash) + 1)
    const latestBlocks = chain.slice(start , start + limit)

    res.status(200).json({
        latestHash : lastBlockHash,
        blocks : latestBlocks
    })
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

app.post('/register-node', (req, res) => {
    const nodeUrl = req.body.nodeUrl
    try {
        if(BytehubCoin.networkNodes.indexOf(nodeUrl) >= 0)
            throw new Error('Node already registered')
    
        if(BytehubCoin.nodeUrl === nodeUrl)
            throw new Error('Self registered is not permited')

        BytehubCoin.networkNodes.push(nodeUrl)    

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
            if(BytehubCoin.networkNodes.indexOf(nodeUrl) >= 0)
                throw new Error('Node already registered')
    
            if(BytehubCoin.nodeUrl === nodeUrl)
                throw new Error('Self register is not permited')

            BytehubCoin.networkNodes.push(nodeUrl);
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

        if(BytehubCoin.networkNodes.indexOf(nodeUrl) >= 0)
            throw new Error('Node already registered')

        if(BytehubCoin.nodeUrl === nodeUrl)
            throw new Error('Self registered is not permited')
        

        const registerNodes = [];

        BytehubCoin.networkNodes.forEach(networkNode => {
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
            body: { networkNodes: [...BytehubCoin.networkNodes, BytehubCoin.nodeUrl] },
            json: true  
        }

        BytehubCoin.networkNodes.push(nodeUrl);

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
        uri: nodeUrl + '/broadcast-chain/' + BytehubCoin.getLatestBlock().hash,
        method: 'GET',
        json: true
    }

    const response = await reqPromise(requestOptions);
    
    // {latestHash : 'HASH', blocks : [{}, {}, {}]}

    response.blocks.forEach((block) => {
        const new_block = new Block(block.timestamp, block.transactions, block.previousHash)
        new_block.nonce = block.nonce

        if(block.hash !== new_block.calculateHash())
            throw new Exception(`block ${new_block.hash} is invalid`)
        
        if(!new_block.hasValidTransaction())
            throw new Exception(`block ${new_block.hash} has is invalid transactions`)
        
        BytehubCoin.appendBlock(block)
        
    })

    if(BytehubCoin.getLatestBlock().hash !== response.latestHash)
        sync(nodeUrl)
    
        

}


async function longestChainNode(){
    const requests = [];
    BytehubCoin.networkNodes.forEach(nodeUrl => {
        const requestOptions = {
            uri: nodeUrl + '/chain',
            method: 'GET',
            json: true
        }

        requests.push(reqPromise(requestOptions));

    })

    const blockchains = await Promise.all(requests)
    const currentChainLength = BytehubCoin.chain.length;
    let maxChainLength = currentChainLength;
    let nodeWithlongestChain = null;

    blockchains.forEach(blockchain => {
        if (blockchain.chain.length > maxChainLength) {
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
