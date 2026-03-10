const fs = require('fs')
const path = require('path')

const LOG_FILE = path.resolve(__dirname, '..', 'console-errors.log')

module.exports = function (app) {
    app.post('/__console_log', (req, res) => {
        let body = ''
        req.on('data', (chunk) => {
            body += chunk
        })
        req.on('end', () => {
            try {
                const entries = JSON.parse(body)
                const lines = entries.map((e) => `[${new Date().toISOString()}] [${e.level}] ${e.message}`).join('\n')
                fs.appendFileSync(LOG_FILE, lines + '\n')
            } catch {}
            res.status(200).end()
        })
    })
}
