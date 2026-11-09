var express = require("express");
var router = express.Router();
const { EmailHelper } = require("../email-helper");

router.post("/send", async (req, res) => {
  try {
    await EmailHelper.sendMail(
      req.body.to,
      req.body.subject,
      req.body.message,
      req,
      req.body.others
    );

    res.status(200).send();
  } catch (e) {
    res.status(400).send();
  }
});

router.post("/send-registration-email", async (req, res) => {
  try {
    await EmailHelper.sendRegistrationEmail(req.body.to, req.body.link, req);

    res.status(200).send();
  } catch (e) {
    res.status(400).send();
  }
});

router.post("/send-certification-email", async (req, res) => {
  try {
    await EmailHelper.sendCertificationEmail(
      req.body.to,
      req.body.link,
      req.body.courseName,
      req
    );

    res.status(200).send();
  } catch (e) {
    res.status(400).send();
  }
});

router.post("/resend-confirmation-email", async (req, res) => {
  try {
    await EmailHelper.resendConfirmationEmail(req.body.to, req.body.link, req);

    res.status(200).send();
  } catch (e) {
    res.status(400).send();
  }
});

router.post("/new-email-confirmation", async (req, res) => {
  try {
    await EmailHelper.newEmailConfirmation(req.body.to, req.body.link, req);

    res.status(200).send();
  } catch (e) {
    res.status(400).send();
  }
});

router.post("/send-forget-password-email", async (req, res) => {
  try {
    await EmailHelper.sendForgotPasswordEmail(
      req.body.to,
      req.body.link,
      req,
      req.body.code
    );

    res.status(200).send();
  } catch (e) {
    res.status(400).send();
  }
});

router.post("/send-set-password-via-email", async (req, res) => {
  try {
    await EmailHelper.sendNewPasswordEmail(
      req.body.to,
      req.body.link,
      req,
      req.body.code
    );

    res.status(200).send();
  } catch (e) {
    res.status(400).send();
  }
});
router.post('/send-bulk', async (req, res) => {
  try {
    const result = await EmailHelper.sendBulkMail(
      req.body.recipients,
      req.body.subject,
      req.body.message,
      req,
      req.body.others
    )

    // Return 200 with result details even if some emails failed
    // This allows client to see which emails succeeded/failed
    res.status(200).json({
      success: result.success,
      total: result.total,
      successCount: result.successCount,
      failedCount: result.failedCount,
      results: result.results,
      ...(result.error && { error: result.error }),
    })
  } catch (e) {
    res.status(400).json({
      success: false,
      error: e.message || 'Failed to send bulk emails',
    })
  }
})
module.exports = router;
