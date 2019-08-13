const crypto = require('crypto')

class SHA256{
    static hashit(it) {
        return crypto.createHmac('sha256', 'my secret')
        .update(it)
        .digest('hex');
    }
}

module.exports.SHA256 = SHA256