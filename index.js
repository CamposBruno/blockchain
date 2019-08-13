const crypto = require('crypto')
const Persist  = require('./lib/persist')
const Transactions = require('./lib/transact')

class Blockchain {
    constructor(){
        this.blocktime
        this.last_nonce
        this.last_block_hash = '0x0'        
        this.secret = 'T3MNDBTBrasil21@'
        this.zeros = 5
        this.blocksize = 5
    }

    async init(){
        this.last_block_hash = await new Persist().getLastHash()
    }

    async getTransactions(){
        const transactions = await Transactions.getTransactionsPool(this.blocksize)
        if(transactions.length)
            return transactions.reduce((p, c) => p + c + '')
        else
            return ''
        //return new Block(this.last_nonce, transactions, this.last_block_hash)         
    }

    async mine(){
        const start_time = new Date().getTime()
        const transactions = await this.getTransactions()
        let nonce = 0
        let nonce_hash
        let loop = true
        while(loop) {
            nonce_hash = this.hashit(transactions + nonce)
            //console.log(hash)
            if(this.guessTheHash(nonce_hash)) {     
                this.last_nonce = nonce         
                loop = false
            }
            else nonce++
        }
        
        const end_time = new Date().getTime()
        this.blocktime = end_time - start_time
        
        const block = new Block(nonce_hash, transactions, this.last_block_hash)         
        const sblock_hash = this.hashit(nonce_hash + transactions + this.last_block_hash)
        
        this.last_block_hash = sblock_hash

        const p = new Persist()
        p.appendHistory(this.last_block_hash + "\n")        

        console.log("===================")
        console.log("BLOCK HASH : " + this.last_block_hash)
        console.log("PREVIOUS BLOCK HASH : " + block.previous_hash)
        console.log("BLOCK NONCE : " + block.nonce)
        console.log("BLOCK MSG : " + block.msg)
        console.log("BLOCK TIME : " + this.humanTime(blockchain.blocktime))        
        console.log("===================")        

        this.mine()
    }

    guessTheHash(hash){
        const zerofill = '0'.padStart((this.zeros), '0')

        const slice = hash.slice(0, this.zeros)

        //console.log(slice , '==', zerofill)

        return hash.slice(0, this.zeros) === zerofill ? true : false
    }

    hashit(it) {
        return crypto.createHmac('sha256', this.secret)
        .update(it)
        .digest('hex');
    }

    humanTime(milisenconds) {
        return (milisenconds / 1000).toFixed(1) + 's'
    }
}

class Block extends Blockchain {
    constructor(nonce, msg, previous_hash){
        super()
        this.nonce = nonce
        this.msg = msg
        this.previous_hash = previous_hash
    }
}

const blockchain = new Blockchain()

blockchain.init().then(() => {
    blockchain.mine()
})



