const fs = require('fs')
const path = require('path')
const readline = require('readline');

const pool_path = '../storage/pool.csv'

module.exports = class Transactions {

    constructor(){
        this.hash
        this.inputs
        this.outputs
        this.locktime
    }

    static getTransactionsPool(block_size){
        return new Promise((resolve, reject) => {
            try {
                const instream = fs.createReadStream(path.join(__dirname, pool_path));
                const rl = readline.createInterface(instream);
                let transactions = []
                let ignored = []
                rl.on('line', (line) => {
                    
                    if(transactions.length >= block_size){
                        ignored.push(line)
                    }else
                        transactions.push(line)
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
}
