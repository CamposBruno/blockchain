const config = require('config')
const { SHA256 } = require('./sha256')
const { Utils } = require('./utils')
const EC = require('elliptic').ec
const ec = new EC('secp256k1')
const Persist = require('./persist')

const nodeUrl = process.argv[3]

const new_block_mined = false

class Blockchain{
    constructor(){
        this.chain = []
        this.difficulty = 5
        this.pendingTransactions = []
        this.miningRewards = 100
        this.blocksize = 1
        this.networkNodes = []
        this.nodeUrl = nodeUrl
    }

    async init(){
        this.chain = await new Persist().getChain()
    }

    getLatestBlock(){
        return this.chain[this.chain.length - 1]
    }

    async minePendingTransactions(miningRewardAddress){

        this.pendingTransactions = []
        // First Transaction of the Block is the coinbase transaction
        // it`s the reward of the miner
        const reward_transaction = new Transaction(null, miningRewardAddress, this.miningRewards)
        this.pendingTransactions.push(reward_transaction)

        try {
            const transactions = await Persist.getTransactionsPool(this.blocksize)    
            //console.log(transactions)
            this.pendingTransactions = this.pendingTransactions.concat(transactions)
        } catch (error) {
            console.log(error)
        }
        

        

        // We then, create the Block with all pending transactions
        // passing alongside with timestamp and the hash of the previous block,
        // that is what made the chain part of a block chain
        const timestamp = new Date().getTime()
        const previousHash = this.getLatestBlock().hash
        let block = new Block(timestamp, this.pendingTransactions, previousHash)

        // Then mine the block
        const mined = block.mineBlock(this.difficulty)

        if(mined) {
            console.log('block sucessfuly mined!')
            // if block was mined sucessfully, push it into the chain
            this.chain.push(block)        
            new Persist().appendBlock(block)

            await this.broadcastBlock(block)
        }
        else console.log('Block already mined by other node')
        
        // and then we repeat the process
        this.minePendingTransactions(miningRewardAddress)
    }

    async getBalanceOfAddress(address){

        this.chain = await new Persist().getChain()

        let balance = 0

        for(const block of this.chain){
            for(const transaction of block.transactions){
                if(transaction.fromAddress === address){
                    balance -= transaction.amount
                }

                if(transaction.toAddress === address){
                    balance += transaction.amount
                }
            }
        }

        return balance
    }

    addTransaction(transaction){        
        if(!transaction.fromAddress || !transaction.toAddress)
            throw new Error('Transaction must include from and to address')

        if(!transaction.isValid())
            throw new Error('Cannot add invalid transaction to chain')


        this.pendingTransactions.push(transaction)
        Persist.putTransactionPool(transaction)
    }

    async isChainValid(){

        this.chain = await new Persist().getChain()

        for(let i = 1; i < this.chain.length; i++){
            const currentBlock = new Block(this.chain[i].timestamp, this.chain[i].transactions, this.chain[i].previousHash)
            currentBlock.hash = this.chain[i].hash
            currentBlock.nonce = this.chain[i].nonce

            const previousBlock = new Block(this.chain[i-1].timestamp, this.chain[i-1].transactions, this.chain[i-1].previousHash)
            previousBlock.hash = this.chain[i-1].hash
            previousBlock.nonce = this.chain[i-1].nonce

            if(!currentBlock.hasValidTransaction()){                
                console.log('invalid transactions')
                return false
            }

            if(currentBlock.hash !== currentBlock.calculateHash()){
                console.log('invalid hash')
                return false
            }

            if(currentBlock.previousHash !== previousBlock.hash){
                console.log('invalid previous hash')
                return false
            }
        }
        return true
    }

    appendBlock(block){        
        this.chain.push(block)        
        new Persist().appendBlock(block)
    }

    async broadcastBlock(block){
        const requests = [];
        this.networkNodes.forEach(node => {
            const requestOptions = {
                uri: node + '/incoming-block',
                method: 'POST',
                body: { block: JSON.stringify(block) },
                json: true
            }
    
            requests.push(reqPromise(requestOptions));
        })

        await Promise.all(requests)
    }

    incomingBlock(block, hash){
        if(this.getLatestBlock().hash != block.previousHash)
            throw new Exception('Invalid previous block hash')       
        
        if(hash !== block.calculateHash())
            throw new Exception('Invalid block hash')

        if(!block.hasValidTransaction())
            throw new Exception('Invalid transactions')

        new_block_mined = true

        this.appendBlock(block)

    }   

}

class Block {
    constructor( timestamp, transactions, previousHash = '', nonce = 0){
        
        this.timestamp = timestamp
        this.transactions = transactions
        this.previousHash = previousHash
        this.nonce = nonce
        this.hash = this.calculateHash()
    }

    calculateHash(){
        return SHA256.hashit(this.previousHash + this.timestamp + JSON.stringify(this.transactions) + this.nonce)
    }

    mineBlock(difficulty){
        const startTime = new Date().getTime()
        while(this.hash.substring(0, difficulty) !== Array(difficulty + 1).join('0')){
            this.nonce++
            this.hash = this.calculateHash();
            
            if(new_block_mined){
                new_block_mined = false
                return false                                        
            }
                
        }
        const endTime = new Date().getTime()
        const minedTime = Utils.humanTime(endTime - startTime)
        
        console.log(this.hash, ' in ', minedTime)
        return true
    }

    hasValidTransaction(){
        for (let tx of this.transactions) {
            const t = new Transaction(tx.fromAddress, tx.toAddress, tx.amount)
            t.signature = tx.signature
            if(!t.isValid()){
                return false
            }            
        }

        return true
    }
}

class Transaction{
    constructor(fromAddress, toAddress, amount){
        this.fromAddress = fromAddress
        this.toAddress = toAddress
        this.amount = amount
    }
    
    calculateHash(){
        return SHA256.hashit(this.fromAddress + this.toAddress + this.amount)
    }

    signTransaction(signinkey){

        if(this.fromAddress != signinkey.getPublic('hex'))
            throw new Error('Connot sign transactions for other wallets')

        const hashTX = this.calculateHash()
        const sig = signinkey.sign(hashTX, 'base64')
        this.signature = sig.toDER('hex')
    }

    isValid(){
        if(this.fromAddress == null) return true

        if(!this.signature || this.signature.length === 0)
            throw new Error('No signature for this transaction')

        const publicKey = ec.keyFromPublic(this.fromAddress, 'hex')
        return publicKey.verify(this.calculateHash(), this.signature)

    }
}

module.exports.Blockchain = Blockchain
module.exports.Transaction = Transaction
module.exports.Block = Block


