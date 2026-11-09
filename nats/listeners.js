const { callService } = require("larsa-common-microservices-files");
const { EmailHelper } = require("../emailHelper");
const { EmailHelper: EmailHelperV2 } = require("../email-helper");
const subjects = require("./subjects");
const { ack, ackOrRetry } = require("./../util/helper");
const { listen } = require("../util/nats/natsActions");

module.exports.listeners = () => {
  listen("email", subjects.send, "email", async (parsedData, msg) => {
    console.log("Received email message from NATS :", parsedData);
    const req = createMockRequest(parsedData.headers);
    console.log("req", req);
    let result = await EmailHelper.sendMail(
      parsedData.to,
      parsedData.subject,
      parsedData.message,
      req,
      parsedData.others
    );

    ack(result, msg);

    //console.log("the result",result)

    //msg.ack()

    // if (result && result.messageId != undefined){
    //     msg.ack()
    // }
  });

  listen("email", subjects.sendBulk, "email", async (parsedData, msg) => {
    console.log("Received bulk email message from NATS (sendBulk):", {
      recipientsCount: (parsedData.tos || parsedData.Tos || []).length,
      subject: parsedData.subject || parsedData.Subject,
      hasHeaders: !!(parsedData.headers || parsedData.Headers),
    });
    
    // Log received data structure for debugging
    console.log("Parsed data structure:", {
      hasTos: !!parsedData.tos,
      hasTosCapital: !!parsedData.Tos,
      hasSubject: !!parsedData.subject,
      hasSubjectCapital: !!parsedData.Subject,
      hasMessage: !!parsedData.message,
      hasMessageCapital: !!parsedData.Message,
      hasHeaders: !!parsedData.headers,
      hasHeadersCapital: !!parsedData.Headers,
      hasOthers: !!parsedData.others,
      hasOthersCapital: !!parsedData.Others,
      headersType: typeof (parsedData.headers || parsedData.Headers),
      headersKeys: (parsedData.headers || parsedData.Headers) && typeof (parsedData.headers || parsedData.Headers) === 'object' && !Array.isArray(parsedData.headers || parsedData.Headers) 
        ? Object.keys(parsedData.headers || parsedData.Headers) 
        : [],
    });
    
    // Todo: check ack time
    ackOrRetry(true, msg);
    
    // Handle both lowercase and capitalized field names (for crm-service compatibility)
    // Map crm-service structure (Tos, Subject, Message, Headers, Others) to expected structure
    const tos = parsedData.tos || parsedData.Tos || [];
    const subject = parsedData.subject || parsedData.Subject || "";
    const message = parsedData.message || parsedData.Message || "";
    const others = parsedData.others || parsedData.Others || {};
    
    // Headers can be passed directly to sendMailBulk (it uses fetchSMTConfig which expects headers object)
    let headers = {};
    if (parsedData.headers) {
      if (typeof parsedData.headers === 'object' && !Array.isArray(parsedData.headers)) {
        headers = parsedData.headers;
      }
    } else if (parsedData.Headers) {
      if (typeof parsedData.Headers === 'object' && !Array.isArray(parsedData.Headers)) {
        headers = parsedData.Headers;
      }
    }
    
    console.log("Using data for sendMailBulk:", {
      tosCount: tos.length,
      subject: subject,
      messageLength: message.length,
      headersCount: Object.keys(headers).length,
      headerKeys: Object.keys(headers).slice(0, 10), // Show first 10 header keys
      hasOthers: Object.keys(others).length > 0,
    });
    
    try {
      let result = await EmailHelper.sendMailBulk(
        tos,
        subject,
        message,
        headers, // sendMailBulk expects headers object directly, not req
        others
      );

      console.log("Bulk email sendMailBulk result:", {
        success: result !== null && result !== undefined,
        resultType: typeof result,
        hasError: result instanceof Error,
      });

      //console.log("the result",result)

      //msg.ack()

      // if (result && result.messageId != undefined){
      //     msg.ack()
      // }
    } catch (error) {
      console.error("Error in sendBulk listener:", error);
    }
  });

  listen("email", subjects.sendBulkToUsers, "email", async (parsedData, msg) => {
    console.log("Received bulk email message from NATS (crm-service):", {
      recipientsCount: parsedData.Tos?.length || 0,
      subject: parsedData.Subject,
    });
    
    // Log received data structure for debugging
    console.log("Parsed data structure:", {
      hasTos: !!parsedData.Tos,
      hasSubject: !!parsedData.Subject,
      hasMessage: !!parsedData.Message,
      hasHeaders: !!parsedData.Headers,
      hasOthers: !!parsedData.Others,
      headersType: typeof parsedData.Headers,
      headersIsArray: Array.isArray(parsedData.Headers),
      headersValue: parsedData.Headers,
      headersKeys: parsedData.Headers && typeof parsedData.Headers === 'object' && !Array.isArray(parsedData.Headers) ? Object.keys(parsedData.Headers) : [],
    });
    
    ackOrRetry(true, msg);
    
    // Create mock request from headers (crm-service sends Headers field)
    // Handle both Headers (capital) and headers (lowercase) for compatibility
    // Headers might be null, undefined, or an object
    let headers = {};
    if (parsedData.Headers) {
      if (typeof parsedData.Headers === 'object' && !Array.isArray(parsedData.Headers)) {
        headers = parsedData.Headers;
      }
    } else if (parsedData.headers) {
      if (typeof parsedData.headers === 'object' && !Array.isArray(parsedData.headers)) {
        headers = parsedData.headers;
      }
    }
    
    console.log("Using headers for SMTP config:", {
      headersCount: Object.keys(headers).length,
      headerKeys: Object.keys(headers),
      sampleHeaders: Object.keys(headers).slice(0, 5).reduce((acc, key) => {
        acc[key] = headers[key];
        return acc;
      }, {}),
    });
    
    const req = createMockRequest(headers);
    
    // Map crm-service structure to endpoint structure:
    // Tos -> recipients
    // Subject -> subject
    // Message -> message
    // Headers -> req (already handled above)
    // Others -> others
    try {
      const result = await EmailHelperV2.sendBulkMail(
        parsedData.Tos || parsedData.tos || [],
        parsedData.Subject || parsedData.subject || "",
        parsedData.Message || parsedData.message || "",
        req,
        parsedData.Others || parsedData.others || {}
      );

      console.log("Bulk email result:", {
        success: result.success,
        total: result.total,
        successCount: result.successCount,
        failedCount: result.failedCount,
      });
    } catch (error) {
      console.error("Error processing bulk email from crm-service:", error);
    }
  });

  listen(
    "email",
    subjects.sendRegistrationEmail,
    "email",
    async (parsedData, msg) => {
      let result = await EmailHelper.sendRegistrationEmail(
        parsedData.to,
        parsedData.link,
        parsedData.headers
      );

      ack(result, msg);

      // if (result && result.messageId != undefined){
      //     msg.ack()
      // }
    }
  );

  listen(
    "email",
    subjects.sendCertificationEmail,
    "email",
    async (parsedData, msg) => {
      let result = await EmailHelper.sendCertificationEmail(
        parsedData.to,
        parsedData.link,
        parsedData.courseName,
        parsedData.headers
      );

      ack(result, msg);

      // if (result && result.messageId != undefined){
      //     msg.ack()
      // }
    }
  );

  listen(
    "email",
    subjects.resendConfirmationEmail,
    "email",
    async (parsedData, msg) => {
      let result = await EmailHelper.resendConfirmationEmail(
        parsedData.to,
        parsedData.link,
        parsedData.headers
      );

      ack(result, msg);

      // if (result && result.messageId != undefined){
      //     msg.ack()
      // }
    }
  );

  listen(
    "email",
    subjects.newEmailConfirmation,
    "email",
    async (parsedData, msg) => {
      let result = await EmailHelper.newEmailConfirmation(
        parsedData.to,
        parsedData.link,
        parsedData.headers
      );

      ack(result, msg);

      // if (result && result.messageId != undefined){
      //     msg.ack()
      // }
    }
  );

  listen(
    "email",
    subjects.sendForgetPasswordEmail,
    "email",
    async (parsedData, msg) => {
      let result = await EmailHelper.sendForgotPasswordEmail(
        parsedData.to,
        parsedData.link,
        parsedData.headers,
        parsedData.code
      );

      ack(result, msg);

      msg.ack();
    }
  );

  // journal

  listen("email", subjects.journalEmail, "email", async (parsedData, msg) => {
    console.log(
      "Received email message from NATS to:",
      parsedData.to,
      "subject:",
      subjects.journalEmail
    );

    const req = createMockRequest(parsedData.headers);

    let result = await EmailHelper.sendMail(
      parsedData.to,
      parsedData.subject,
      parsedData.message,
      req,
      parsedData.others
    );

    msg.ack();
  });
};

module.exports.getOptionValue = async (optionName, req, headers = {}) => {
  try {
    if (!optionName) {
      return null;
    }

    // Check environment variables first as fallback
    if (process.env[optionName]) {
      return process.env[optionName];
    }

    const response = await callService(
      { name: "options", path: `/${optionName}` },
      req,
      {},
      headers
    );

    if (response.status === 200) {
      return response.data.option.value;
    }

    return null;
  } catch (error) {
    // If external service fails, try environment variables again
    if (process.env[optionName]) {
      return process.env[optionName];
    }
    return null;
  }
};
// Helper function to create mock Express request object
const createMockRequest = (headers = {}) => {
  return {
    headers: headers,
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
};
