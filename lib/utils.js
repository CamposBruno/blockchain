class Utils {
    static humanTime(milisenconds) {
        return (milisenconds / 1000).toFixed(1) + 's'
    }
}

module.exports.Utils = Utils