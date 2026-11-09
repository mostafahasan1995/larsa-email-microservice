#!/usr/bin/env node
require("./config");
global.aventum = {};

require("dotenv-flow").config();
const { natsWrapper } = require("./util/nats");

var path = require("path");
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
var i18next = require("i18next");
const i18nextMiddleware = require("i18next-express-middleware");
const i18nextBackend = require("i18next-node-fs-backend");
const initRedis = require("./packages/intl/redis");

const { randomBytes } = require("crypto");

const {
  callService,
  getOptionValue,
  getStringID,
} = require("larsa-common-microservices-files");
global.callService = callService;
global.getStringID = getStringID;
global.getOptionValue = getOptionValue;

const { listeners } = require("./nats/listeners");

i18next
  .use(i18nextBackend)
  .use(i18nextMiddleware.LanguageDetector)
  .init({
    backend: {
      loadPath: path.join(__dirname, "./locales/{{lng}}/{{ns}}.json"),
      addPath: path.join(__dirname, "./locales/{{lng}}/{{ns}}.missing.json"),
    },
    fallbackLng: "en",
    preload: ["en", "ar"],
    saveMissing: true,
  });

i18next.on("languageChanged", function (lng) {
  if (lng === "ar") {
    var { arSA } = require("date-fns/locale");
    global.dateLocale = arSA;
  } else {
    var { enUS } = require("date-fns/locale");
    global.dateLocale = enUS;
  }
});

aventum.i18n = i18next;

var server = express();

initRedis();
// NATS Streaming
(async () => {
  global.natsJetStream = process.env.NATS_JETSTREAM === "true" ? true : false;
  if (process.env.NATS_JETSTREAM === "true") {
    const servers =
      process.env.NATS_HOST?.split(",").map(
        (s) => `${s}:${process.env.NATS_PORT}`
      ) || [];
    await natsWrapper.jetStreamconnect(servers);
  } else {
    await natsWrapper.connect(
      "microservices",
      randomBytes(4).toString("hex"),
      `nats://${process.env.NATS_HOST}:${process.env.NATS_PORT}`
    );
  }
  await listeners();
})();

server.use(bodyParser.json());
server.use(
  cors({
    exposedHeaders: [
      "x-client",
      "x-access-token",
      "x-service",
      "x-service-token",
      "x-user-id",
    ],
  })
);
server.use(i18nextMiddleware.handle(i18next));

var emailsRoutes = require("./routes/emails");
var testRoutes = require("./routes/test");

server.use("/", emailsRoutes);
server.use("/test", testRoutes);

var service = server.listen(process.env.PORT, () => {
  console.log(
    `Hi there! I'm listening on port ${service.address().port} in ${server.get(
      "env"
    )} mode.
    Deployment Date 7/20
    `
  );
});
