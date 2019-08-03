const crypto = require('crypto')
const Persist  = require('./lib/persist')

class Blockchain {
    constructor(){
        this.blocktime
        this.last_nonce
        this.last_block_hash = '0x0'        
        this.secret = 'T3MNDBTBrasil21@'
    }

    async init(){
        this.last_block_hash = await new Persist().getLastHash()
    }

    async mine(){
        const start_time = new Date().getTime()
        const nonce = Math.floor(Math.random() * 10000000000)
        let i = 0
        while(i != nonce){
            i++
        }        
        const end_time = new Date().getTime()
        
        this.last_nonce = i
        this.blocktime = end_time - start_time

        const block = new Block(this.last_nonce, 'MSG', this.last_block_hash) 
        this.last_block_hash = this.hashit(JSON.stringify(block))
        const p = new Persist()
        p.appendHistory(this.last_block_hash + "\n")

        console.log("===================")
        console.log("BLOCK HASH : " + this.hashit(JSON.stringify(block)))
        console.log("PREVIOUS BLOCK HASH : " + block.previous_hash)
        console.log("BLOCK NONCE : " + block.nonce)
        console.log("BLOCK MSG : " + block.msg)
        console.log("BLOCK TIME : " + this.humanTime(blockchain.blocktime))        
        console.log("===================")        

        this.mine()
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



