const nodemailer = require('nodemailer')
const { getOptionValue } = require('larsa-common-microservices-files')

class EH {
  sendMail = async (to, subject, message = '', req, others = {}) => {
    try {
      var SMTP_HOST = await getOptionValue('SMTP_HOST', req)
      var SMTP_PORT = await getOptionValue('SMTP_PORT', req)
      var SMTP_SECURE = await getOptionValue('SMTP_SECURE', req)
      var SMTP_AUTH_USERNAME = await getOptionValue('SMTP_AUTH_USERNAME', req)
      var SMTP_AUTH_PASSWORD = await getOptionValue('SMTP_AUTH_PASSWORD', req)
      var SMTP_FROM_NAME = await getOptionValue('SMTP_FROM_NAME', req)
      var SMTP_FROM_EMAIL = await getOptionValue('SMTP_FROM_EMAIL', req)
      var SMTP_REPLYTO_EMAIL = await getOptionValue('SMTP_REPLYTO_EMAIL', req)

      if (!SMTP_HOST || !SMTP_PORT || !SMTP_AUTH_USERNAME) {
        console.log(
          `Email settings incomplete, the message did not send to ${to}`
        )
        return null
      }

      const transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_SECURE,
        auth: {
          user: SMTP_AUTH_USERNAME,
          pass: SMTP_AUTH_PASSWORD,
        },
        tls: {
          rejectUnauthorized: false,
        },
      })


      let otherOptions = {}
      if (typeof others === "object" && !Array.isArray(others) && others != null) {
        Object.assign(otherOptions, others)
      }

      const mailOptions = {
        from: SMTP_FROM_NAME + ' ' + '<' + SMTP_FROM_EMAIL + '>',
        to: to,
        replyTo: SMTP_REPLYTO_EMAIL,
        subject: subject,
        html: message,
        ...otherOptions
      }

      const info = await new Promise(async (resolve, reject) => {
        transporter.sendMail(mailOptions, (error, results) => {
          if (error) {
            reject(error)
          }

          resolve(results)
        })
      })

      console.log('success')
      return info
    } catch (error) {
      console.error(error)
      return error
    }
  }

  sendRegistrationEmail = async (to, link, req) => {
    try {
      const dir = req.i18n.dir()

      const BUSINESS_NAME = await getOptionValue('BUSINESS_NAME', req)

      const subject = req.t('emailConfirmation')

      const message = `
          <p dir="${dir}">${req.t('Hi')}</p>
          <p dir="${dir}">${req.t('thanksForReg', {
        appName: BUSINESS_NAME,
      })}</p>
          <p dir="${dir}">${req.t('clickOnLink')}</p>
          <p><a href="${link}">${link}</a></p>
          <p dir="${dir}">${req.t('ifNotWork')}</p>
          <p dir="${dir}">${req.t('KindRegards')}</p>
          <p dir="${dir}">${BUSINESS_NAME}</p>
          `

      const info = await this.sendMail(to, subject, message, req)

      return info
    } catch (error) {
      console.error(error)
    }
  }

  resendConfirmationEmail = async (to, link, req) => {
    try {
      const dir = req.i18n.dir()

      const BUSINESS_NAME = await getOptionValue('BUSINESS_NAME', req)

      const subject = req.t('emailConfirmation')

      const message = `
                    <p dir="${dir}">${req.t('Hi')}</p>
                    <p dir="${dir}">${req.t('receivedBecauseResendReq')}</p>
                    <p dir="${dir}">${req.t('clickOnLink')}</p>
                    <p><a href="${link}">${link}</a></p>
                    <p dir="${dir}">${req.t('ifNotWork')}</p>
                    <p dir="${dir}">${req.t('KindRegards')}</p>
                    <p dir="${dir}">${BUSINESS_NAME}</p>
                        `

      const info = await this.sendMail(to, subject, message, req)

      return info
    } catch (error) {
      console.error(error)
    }
  }

  newEmailConfirmation = async (to, link, req) => {
    try {
      const dir = req.i18n.dir()

      const BUSINESS_NAME = await getOptionValue('BUSINESS_NAME', req)

      const subject = req.t('emailConfirmation')

      const message = `
              <p dir="${dir}">${req.t('Hi')}</p>
              <p dir="${dir}">${req.t('receivedBecauseChangeEmailReq')}</p>
              <p dir="${dir}">${req.t('clickOnLink')}</p>
              <p><a href="${link}">${link}</a></p>
              <p dir="${dir}">${req.t('ifNotWork')}</p>
              <div dir="${dir}">
              <div>${req.t('ifNotYou')}</div>
              </div>
              <p dir="${dir}">${req.t('KindRegards')}</p>
              <p dir="${dir}">${BUSINESS_NAME}</p>
                                  `
      const info = await this.sendMail(to, subject, message, req)

      return info
    } catch (error) {
      console.error(error)
    }
  }

  sendForgotPasswordEmail = async (to, link, req, code) => {
    try {
      const dir = req.i18n.dir()

      const BUSINESS_NAME = await getOptionValue('BUSINESS_NAME', req)

      const subject = req.t('resetPassword')

      let message = ''

      if (code) {
        message = `
            <p dir="${dir}">${req.t('Hi')}</p>
            <p dir="${dir}">${req.t('resetPassReq')}</p>
            <p dir="${dir}">${req.t('toChangePasswordWithCode')}</p>
            <p><pre>${code}</pre></p>
            <p dir="${dir}">${req.t('ifNotReqResPass')}</p>
            <p dir="${dir}">${req.t('KindRegards')}</p>
            <p dir="${dir}">${BUSINESS_NAME}</p>
            `
      } else {
        message = `
            <p dir="${dir}">${req.t('Hi')}</p>
            <p dir="${dir}">${req.t('resetPassReq')}</p>
            <p dir="${dir}">${req.t('toChangePassword')}</p>
            <p><a href="${link}">${link}</a></p>
            <p dir="${dir}">${req.t('ifNotReqResPass')}</p>
            <p dir="${dir}">${req.t('KindRegards')}</p>
            <p dir="${dir}">${BUSINESS_NAME}</p>
            `
      }

      const info = await this.sendMail(to, subject, message, req)

      return info
    } catch (error) {
      console.error(error)
    }
  }

  sendCertificationEmail = async (to, link, courseName, req) => {
    try {
      const dir = req.i18n.dir()

      const BUSINESS_NAME = await getOptionValue('BUSINESS_NAME', req)

      const subject = req.t('courseCompletion')

      const message = `
          <p dir="${dir}">${req.t('Hi')}</p>
          <p dir="${dir}">${req.t('cetCongrats')} ${courseName}</p>
          <p dir="${dir}">${req.t('difh')}</p>
          <p><a href="${link}">${link}</a></p>
          <p dir="${dir}">${req.t('KindRegards')}</p>
          <p dir="${dir}">${BUSINESS_NAME}</p>
          `
      const info = await this.sendMail(to, subject, message, req)

      return info
    } catch (error) {
      console.error(error)
    }
  }
  sendBulkMail = async (recipients, subject, message = '', req, others = {}) => {
    try {
      // Validate recipients array
      if (!Array.isArray(recipients) || recipients.length === 0) {
        throw new Error('Recipients must be a non-empty array')
      }

      // Filter out invalid email addresses
      const validRecipients = recipients.filter(
        (email) => email && typeof email === 'string' && email.trim().length > 0
      )

      if (validRecipients.length === 0) {
        throw new Error('No valid recipients found')
      }

      // Get SMTP configuration once
      var SMTP_HOST = await getOptionValue('SMTP_HOST', req)
      var SMTP_PORT = await getOptionValue('SMTP_PORT', req)
      var SMTP_SECURE = await getOptionValue('SMTP_SECURE', req)
      var SMTP_AUTH_USERNAME = await getOptionValue('SMTP_AUTH_USERNAME', req)
      var SMTP_AUTH_PASSWORD = await getOptionValue('SMTP_AUTH_PASSWORD', req)
      var SMTP_FROM_NAME = await getOptionValue('SMTP_FROM_NAME', req)
      var SMTP_FROM_EMAIL = await getOptionValue('SMTP_FROM_EMAIL', req)
      var SMTP_REPLYTO_EMAIL = await getOptionValue('SMTP_REPLYTO_EMAIL', req)

      // Log SMTP configuration for debugging (mask sensitive data)
      console.log('SMTP Configuration retrieved:', {
        SMTP_HOST: SMTP_HOST || 'NOT SET',
        SMTP_PORT: SMTP_PORT || 'NOT SET',
        SMTP_AUTH_USERNAME: SMTP_AUTH_USERNAME || 'NOT SET',
        SMTP_FROM_NAME: SMTP_FROM_NAME || 'NOT SET',
        SMTP_FROM_EMAIL: SMTP_FROM_EMAIL || 'NOT SET',
        SMTP_REPLYTO_EMAIL: SMTP_REPLYTO_EMAIL || 'NOT SET',
        hasPassword: !!SMTP_AUTH_PASSWORD,
        reqHeaders: req.headers ? Object.keys(req.headers) : 'NO HEADERS',
      })

      if (!SMTP_HOST || !SMTP_PORT || !SMTP_AUTH_USERNAME) {
        console.log(
          `Email settings incomplete, bulk message did not send to ${validRecipients.length} recipients`
        )
        return {
          success: false,
          total: validRecipients.length,
          successCount: 0,
          failedCount: validRecipients.length,
          results: validRecipients.map((email) => ({
            email,
            success: false,
            error: 'SMTP configuration incomplete',
          })),
        }
      }

      // Create transporter once (reusable for all emails)
      const transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_SECURE,
        auth: {
          user: SMTP_AUTH_USERNAME,
          pass: SMTP_AUTH_PASSWORD,
        },
        tls: {
          rejectUnauthorized: false,
        },
        pool: true, // Use connection pooling to maintain connection
        maxConnections: 1, // Process one email at a time
        maxMessages: Infinity, // No limit on messages per connection
      })

      // Verify SMTP connection before sending
      try {
        await transporter.verify()
        console.log('SMTP connection verified successfully')
      } catch (error) {
        console.error('SMTP connection verification failed:', error)
        return {
          success: false,
          total: validRecipients.length,
          successCount: 0,
          failedCount: validRecipients.length,
          error: 'SMTP connection failed: ' + error.message,
          results: validRecipients.map((email) => ({
            email: email.trim(),
            success: false,
            error: 'SMTP connection verification failed',
          })),
        }
      }

      // Prepare other options
      let otherOptions = {}
      if (typeof others === "object" && !Array.isArray(others) && others != null) {
        Object.assign(otherOptions, others)
      }

      // Send emails sequentially to ensure reliable delivery
      const results = []
      for (const email of validRecipients) {
        try {
          const mailOptions = {
            from: SMTP_FROM_NAME + ' ' + '<' + SMTP_FROM_EMAIL + '>',
            to: email.trim(),
            replyTo: SMTP_REPLYTO_EMAIL,
            subject: subject,
            html: message,
            ...otherOptions,
          }

          const info = await new Promise((resolve, reject) => {
            transporter.sendMail(mailOptions, (error, results) => {
              if (error) {
                reject(error)
              } else {
                resolve(results)
              }
            })
          })

          results.push({
            email: email.trim(),
            success: true,
            messageId: info.messageId,
          })
          
          console.log(`Email sent successfully to: ${email.trim()}`)
        } catch (error) {
          console.error(`Failed to send email to ${email}:`, error.message)
          results.push({
            email: email.trim(),
            success: false,
            error: error.message || 'Unknown error',
          })
        }
      }

      // Calculate summary
      const successCount = results.filter((r) => r.success).length
      const failedCount = results.filter((r) => !r.success).length

      console.log(
        `Bulk email completed: ${successCount} successful, ${failedCount} failed out of ${validRecipients.length} total`
      )

      // Close the transporter connection pool
      try {
        transporter.close()
      } catch (closeError) {
        console.error('Error closing transporter:', closeError)
      }

      return {
        success: true,
        total: validRecipients.length,
        successCount,
        failedCount,
        results,
      }
    } catch (error) {
      console.error('Bulk email error:', error)
      return {
        success: false,
        total: 0,
        successCount: 0,
        failedCount: 0,
        error: error.message || 'Unknown error occurred',
        results: [],
      }
    }
  }
}

var EmailHelper = new EH()

module.exports = { EmailHelper }
