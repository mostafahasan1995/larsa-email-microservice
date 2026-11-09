var express = require('express')
var router = express.Router()
const { EmailHelper } = require('../emailHelper')
const { publish } = require('../util/nats/natsActions')
const subjects = require('../nats/subjects')

router.get("/", async (req, res) => {

    try {
        aventum.cache.cacheByKey("test123", 1)
        const data = await aventum.cache.getByKey("test123")
        res.status(200).send(`redis ok ${data}`)

    } catch (e) {
        console.log(e)

        res.status(400).send()
    }

    res.status(200).send()
})

// New NATS email test endpoint
router.post("/nats-email", async (req, res) => {
    try {
        const emailData = {
            to: req.body.to || "test@example.com",
            subject: req.body.subject || "NATS Test Email",
            message: req.body.message || "<h1>Hello from NATS!</h1><p>This is a test email sent via NATS.</p>",
            headers: req.headers,
            others: req.body.others || {}
        }

        // Publish to NATS using the general email subject
        publish(subjects.send, emailData, () => {
            console.log(`Published email message to NATS: ${subjects.send}`)
        })

        res.status(200).json({
            success: true,
            message: "Email message published to NATS successfully",
            subject: subjects.send,
            data: emailData
        })

    } catch (error) {
        console.error("Error publishing to NATS:", error)
        res.status(500).json({
            success: false,
            error: error.message
        })
    }
})


module.exports = router
