const fs = require('fs')
const path = require('path')
const readline = require('readline');

const file_path = '../storage/history.csv'

module.exports = class Persist{

    constructor(){         
    }

    appendHistory(string){
        fs.appendFileSync(path.join(__dirname, file_path), string)
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
}