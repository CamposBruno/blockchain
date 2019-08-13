const fs = require('fs')
const path = require('path')
const readline = require('readline');

const file_path = '../storage/chain.json'
const pool_path = '../storage/pool.json'

module.exports = class Persist{

    constructor(){         
    }

    appendBlock(block){
        fs.appendFileSync(path.join(__dirname, file_path), '\n' + JSON.stringify(block))
    }

    getLastHash(){
        return new Promise((resolve, reject) => {
            try {
                const instream = fs.createReadStream(path.join(__dirname, file_path));
                const rl = readline.createInterface(instream);
                let lastLine = ''
                rl.on('line', (line) => lastLine = line)

                rl.on('error', reject)

                rl.on('close', () => {
                    return resolve(lastLine)
                })
            } catch (error) {
                return reject(error)
            }
        })        
    }

    getChain(){
        return new Promise((resolve, reject) => {
            const instream = fs.createReadStream(path.join(__dirname, file_path));
            const rl = readline.createInterface(instream);
            let chain = []
            rl.on('line', (line) => chain.push(JSON.parse(line)))

            rl.on('error', reject)

            rl.on('close', () => {
                return resolve(chain)
            })
        })
    }

    static getTransactionsPool(block_size){
        return new Promise((resolve, reject) => {
            try {
                const instream = fs.createReadStream(path.join(__dirname, pool_path));
                const rl = readline.createInterface(instream);
                let transactions = []
                let ignored = []
                rl.on('line', (line) => {
                    if(line.length){
                        if(transactions.length >= block_size){
                            ignored.push(line)
                        }else
                            transactions.push(JSON.parse(line))
                    }
                })

                rl.on('error', reject)

                rl.on('close', () => {
                    if(ignored.length){                        
                        const left_over = ignored.map((p) => p.toString().trim()).reduce((p, c) => p+'\n'+c )
                        //console.log(left_over)

                        fs.writeFileSync(path.join(__dirname, pool_path), left_over);
                    }else {
                        fs.writeFileSync(path.join(__dirname, pool_path), '');
                    }

                    return resolve(transactions)
                })
            } catch (error) {
                return reject(error)
            }
        })
    }

    static putTransactionPool(transaction) {        
        fs.appendFileSync(path.join(__dirname, pool_path),  JSON.stringify(transaction) + '\n')    
    }
}