const nodemailer = require("nodemailer");
var i18next = require("i18next");
const { getOptionValue } = require("larsa-common-microservices-files");

class EH {
  fetchSMTConfig = async (headersOrReq) => {
    // Create mock request object if headers is a plain object (not a request object)
    let req = headersOrReq;
    if (headersOrReq && typeof headersOrReq === 'object' && !headersOrReq.header) {
      // It's a plain headers object, create a mock request
      req = {
        headers: headersOrReq,
        header: function (name) {
          // Case-insensitive header lookup like Express does
          const lowerName = name.toLowerCase();
          const headers = this.headers;

          // Check direct match first
          if (headers[name]) return headers[name];

          // Check lowercase match
          if (headers[lowerName]) return headers[lowerName];

          // Check all headers with case-insensitive comparison
          for (const key in headers) {
            if (key.toLowerCase() === lowerName) {
              return headers[key];
            }
          }

          return undefined;
        },
      };
    }
    
    var SMTP_HOST = await getOptionValue("SMTP_HOST", req);
    var SMTP_PORT = await getOptionValue("SMTP_PORT", req);
    var SMTP_SECURE = await getOptionValue("SMTP_SECURE", req);
    var SMTP_AUTH_USERNAME = await getOptionValue(
      "SMTP_AUTH_USERNAME",
      req
    );
    var SMTP_AUTH_PASSWORD = await getOptionValue(
      "SMTP_AUTH_PASSWORD",
      req
    );
    var SMTP_FROM_NAME = await getOptionValue("SMTP_FROM_NAME", req);
    var SMTP_FROM_EMAIL = await getOptionValue("SMTP_FROM_EMAIL", req);
    var SMTP_REPLYTO_EMAIL = await getOptionValue(
      "SMTP_REPLYTO_EMAIL",
      req
    );
    return {
      SMTP_HOST,
      SMTP_PORT,
      SMTP_SECURE,
      SMTP_AUTH_USERNAME,
      SMTP_AUTH_PASSWORD,
      SMTP_FROM_NAME,
      SMTP_FROM_EMAIL,
      SMTP_REPLYTO_EMAIL,
    };
  };
  sendMail = async (to, subject, message, headers, others = {}) => {
    try {
      var {
        SMTP_HOST,
        SMTP_PORT,
        SMTP_SECURE,
        SMTP_AUTH_USERNAME,
        SMTP_AUTH_PASSWORD,
        SMTP_FROM_NAME,
        SMTP_FROM_EMAIL,
        SMTP_REPLYTO_EMAIL,
      } = await this.fetchSMTConfig(headers);

      if (!SMTP_HOST || !SMTP_PORT || !SMTP_AUTH_USERNAME) {
        console.log("the headers", headers);
        console.log("the SMTP_HOST", SMTP_HOST);
        console.log("the SMTP_PORT", SMTP_PORT);
        console.log("the SMTP_AUTH_USERNAME", SMTP_AUTH_USERNAME);
        console.log(
          `Email settings incomplete, the message did not send to ${to}، one of the following settings is missing: SMTP_HOST, SMTP_PORT, SMTP_AUTH_USERNAME`
        );
        return null;
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
          rejectUnauthorized: true,
          minVersion: "TLSv1.2",
        },
        pool: true, // Enable connection pooling
        maxConnections: 2, // Limit max connections
        maxMessages: 50, // Max messages per connection
        rateLimit: 3, // Max messages per second
        rateDelta: 1000, // Time window for rate limiting
      });

      let otherOptions = {};
      if (
        typeof others === "object" &&
        !Array.isArray(others) &&
        others != null
      ) {
        Object.assign(otherOptions, others);
      }

      const mailOptions = {
        from: SMTP_FROM_NAME + " " + "<" + SMTP_FROM_EMAIL + ">",
        to: to,
        replyTo: SMTP_REPLYTO_EMAIL,
        subject: subject,
        html: message,
        ...otherOptions,
      };

      // Add small delay to prevent concurrent connection issues
      await new Promise((resolve) => setTimeout(resolve, 500));

      const info = await new Promise(async (resolve, reject) => {
        transporter.sendMail(mailOptions, (error, results) => {
          if (error) {
            reject(error);
          }

          resolve(results);
        });
      });
      console.log(to, "success");
      return info;
    } catch (error) {
      console.log("the error", error);
      //we need the error to decide to ack the message or not
      return error;
    }
  };
  sendMailBulk = async (tos, subject, message, headers, others) => {
    try {
      console.log("sendMailBulk called with:", {
        tosCount: Array.isArray(tos) ? tos.length : 0,
        subject: subject,
        messageLength: message ? message.length : 0,
        headersType: typeof headers,
        headersCount: headers && typeof headers === 'object' ? Object.keys(headers).length : 0,
        headerKeys: headers && typeof headers === 'object' ? Object.keys(headers).slice(0, 10) : [],
      });
      
      var {
        SMTP_HOST,
        SMTP_PORT,
        SMTP_SECURE,
        SMTP_AUTH_USERNAME,
        SMTP_AUTH_PASSWORD,
        SMTP_FROM_NAME,
        SMTP_FROM_EMAIL,
        SMTP_REPLYTO_EMAIL,
      } = await this.fetchSMTConfig(headers);

      // Log SMTP configuration for debugging (mask sensitive data)
      console.log("SMTP Configuration retrieved in sendMailBulk:", {
        SMTP_HOST: SMTP_HOST || 'NOT SET',
        SMTP_PORT: SMTP_PORT || 'NOT SET',
        SMTP_AUTH_USERNAME: SMTP_AUTH_USERNAME || 'NOT SET',
        SMTP_FROM_NAME: SMTP_FROM_NAME || 'NOT SET',
        SMTP_FROM_EMAIL: SMTP_FROM_EMAIL || 'NOT SET',
        SMTP_REPLYTO_EMAIL: SMTP_REPLYTO_EMAIL || 'NOT SET',
        hasPassword: !!SMTP_AUTH_PASSWORD,
      });

      if (!SMTP_HOST || !SMTP_PORT || !SMTP_AUTH_USERNAME) {
        console.log(
          `Email settings incomplete, the message did not send to ${tos}`
        );
        return null;
      }
      const transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_SECURE,
        auth: {
          user: SMTP_AUTH_USERNAME,
          pass: SMTP_AUTH_PASSWORD,
        },
        pool: true,
        maxConnections: 2, // Increased from 1
        maxMessages: 50,
        rateLimit: 3, // Max messages per second
        rateDelta: 1000,
        tls: {
          rejectUnauthorized: true,
          minVersion: "TLSv1.2",
        },
      });

      let otherOptions = {};
      if (
        typeof others === "object" &&
        !Array.isArray(others) &&
        others != null
      ) {
        Object.assign(otherOptions, others);
      }
      const batchSize = 20;
      const delayBetweenBatches = 1000;
      let allResults = [];
      let successCount = 0;
      let failureCount = 0;
      
      for (let i = 0; i < tos.length; i += batchSize) {
        const batch = tos.slice(i, i + batchSize);
        console.log(`Processing batch ${i / batchSize + 1} with ${batch.length} emails`);
        
        // Use Promise.all with manual error catching to ensure compatibility and that one failure doesn't stop others
        const results = await Promise.all(
          batch.map(async (to) => {
            try {
              const mailOptions = {
                from: SMTP_FROM_NAME + " " + "<" + SMTP_FROM_EMAIL + ">",
                to: to,
                replyTo: SMTP_REPLYTO_EMAIL,
                subject: subject,
                html: message,
                ...otherOptions,
              };
              
              const result = await new Promise((resolve, reject) => {
                transporter.sendMail(mailOptions, (error, result) => {
                  if (error) {
                    reject(error);
                  } else {
                    resolve(result);
                  }
                });
              });
              
              console.log(`✅ Email sent to ${to}`);
              return { status: 'fulfilled', value: result, email: to };
            } catch (error) {
              console.error(`❌ Error sending to ${to}:`, error.message || error);
              return { status: 'rejected', reason: error, email: to };
            }
          })
        );
        
        // Process results
        results.forEach((result) => {
          if (result.status === 'fulfilled') {
            allResults.push(result.value);
            successCount++;
          } else {
            failureCount++;
            allResults.push({ error: result.reason, email: result.email });
          }
        });
        
        if (i + batchSize < tos.length) {
          await new Promise((r) => setTimeout(r, delayBetweenBatches));
        }
      }
      
      console.log(`Bulk email batch completed: ${successCount} successful, ${failureCount} failed out of ${tos.length} total`);
      
      // Return first successful result, or null if all failed
      const firstSuccess = allResults.find(r => r && !r.error);
      return firstSuccess || (allResults.length > 0 ? allResults[0] : null);
    } catch (error) {
      console.log("the error", error);
      //we need the error to decide to ack the message or not
      return error;
    }
  };

  sendRegistrationEmail = async (to, link, headers) => {
    try {
      let lang = headers["accept-language"];
      if (lang && lang != i18next.language) {
        await i18next.changeLanguage(lang);
      }

      const dir = i18next.dir();
      const BUSINESS_NAME = await getOptionValue(
        "BUSINESS_NAME",
        null,
        headers
      );

      const subject = i18next.t("emailConfirmation");

      const message = `
          <p dir="${dir}">${i18next.t("Hi")}</p>
          <p dir="${dir}">${i18next.t("thanksForReg", {
        appName: BUSINESS_NAME,
      })}</p>
          <p dir="${dir}">${i18next.t("clickOnLink")}</p>
          <p><a href="${link}">${link}</a></p>
          <p dir="${dir}">${i18next.t("ifNotWork")}</p>
          <p dir="${dir}">${i18next.t("KindRegards")}</p>
          <p dir="${dir}">${BUSINESS_NAME}</p>
          `;

      const info = await this.sendMail(to, subject, message, headers);

      return info;
    } catch (error) {
      console.error(error);
      return error;
    }
  };

  resendConfirmationEmail = async (to, link, headers) => {
    try {
      let lang = headers["accept-language"];
      if (lang && lang != i18next.language) {
        await i18next.changeLanguage(lang);
      }
      const dir = i18next.dir();
      const BUSINESS_NAME = await getOptionValue(
        "BUSINESS_NAME",
        null,
        headers
      );

      const subject = i18next.t("emailConfirmation");

      const message = `
                    <p dir="${dir}">${i18next.t("Hi")}</p>
                    <p dir="${dir}">${i18next.t("receivedBecauseResendReq")}</p>
                    <p dir="${dir}">${i18next.t("clickOnLink")}</p>
                    <p><a href="${link}">${link}</a></p>
                    <p dir="${dir}">${i18next.t("ifNotWork")}</p>
                    <p dir="${dir}">${i18next.t("KindRegards")}</p>
                    <p dir="${dir}">${BUSINESS_NAME}</p>
                        `;

      const info = await this.sendMail(to, subject, message, headers);

      return info;
    } catch (error) {
      console.error(error);
      return error;
    }
  };

  newEmailConfirmation = async (to, link, headers) => {
    try {
      let lang = headers["accept-language"];
      if (lang && lang != i18next.language) {
        await i18next.changeLanguage(lang);
      }
      const dir = i18next.dir();
      const BUSINESS_NAME = await getOptionValue(
        "BUSINESS_NAME",
        null,
        headers
      );

      const subject = i18next.t("emailConfirmation");

      const message = `
              <p dir="${dir}">${i18next.t("Hi")}</p>
              <p dir="${dir}">${i18next.t("receivedBecauseChangeEmailReq")}</p>
              <p dir="${dir}">${i18next.t("clickOnLink")}</p>
              <p><a href="${link}">${link}</a></p>
              <p dir="${dir}">${i18next.t("ifNotWork")}</p>
              <div dir="${dir}">
              <div>${i18next.t("ifNotYou")}</div>
              </div>
              <p dir="${dir}">${i18next.t("KindRegards")}</p>
              <p dir="${dir}">${BUSINESS_NAME}</p>
                                  `;
      const info = await this.sendMail(to, subject, message, headers);

      return info;
    } catch (error) {
      console.error(error);
      return error;
    }
  };

  sendForgotPasswordEmail = async (to, link, headers, code) => {
    try {
      let lang = headers["accept-language"];
      if (lang && lang != i18next.language) {
        await i18next.changeLanguage(lang);
      }
      const dir = i18next.dir();
      const BUSINESS_NAME = await getOptionValue(
        "BUSINESS_NAME",
        null,
        headers
      );

      const subject = i18next.t("resetPassword");

      let message = "";

      if (code) {
        message = `
            <p dir="${dir}">${i18next.t("Hi")}</p>
            <p dir="${dir}">${i18next.t("resetPassReq")}</p>
            <p dir="${dir}">${i18next.t("toChangePasswordWithCode")}</p>
            <p><pre>${code}</pre></p>
            <p dir="${dir}">${i18next.t("ifNotReqResPass")}</p>
            <p dir="${dir}">${i18next.t("KindRegards")}</p>
            <p dir="${dir}">${BUSINESS_NAME}</p>
            `;
      } else {
        message = `
            <p dir="${dir}">${i18next.t("Hi")}</p>
            <p dir="${dir}">${i18next.t("resetPassReq")}</p>
            <p dir="${dir}">${i18next.t("toChangePassword")}</p>
            <p><a href="${link}">${link}</a></p>
            <p dir="${dir}">${i18next.t("ifNotReqResPass")}</p>
            <p dir="${dir}">${i18next.t("KindRegards")}</p>
            <p dir="${dir}">${BUSINESS_NAME}</p>
            `;
      }

      const info = await this.sendMail(to, subject, message, headers);

      return info;
    } catch (error) {
      console.error(error);
      return error;
    }
  };

  sendCertificationEmail = async (to, link, courseName, headers) => {
    try {
      let lang = headers["accept-language"];
      if (lang && lang != i18next.language) {
        await i18next.changeLanguage(lang);
      }

      const dir = i18next.dir();
      const BUSINESS_NAME = await getOptionValue(
        "BUSINESS_NAME",
        null,
        headers
      );

      const subject = i18next.t("courseCompletion");

      const message = `
          <p dir="${dir}">${i18next.t("Hi")}</p>
          <p dir="${dir}">${i18next.t("cetCongrats")} ${courseName}</p>
          <p dir="${dir}">${i18next.t("difh")}</p>
          <p dir="${dir}"><a href="${link}">${i18next.t("certLink")}</a></p>
          <p dir="${dir}">${i18next.t("KindRegards")}</p>
          <p dir="${dir}">${BUSINESS_NAME}</p>
          `;
      const info = await this.sendMail(to, subject, message, headers);

      return info;
    } catch (error) {
      console.error(error);
      return error;
    }
  };
  //journal
}

var EmailHelper = new EH();

module.exports = { EmailHelper };
