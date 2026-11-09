const { createInbox } = require("nats");
const { natsWrapper } = require("./index");

const parseMessage = (msg) => {
  const data = msg.getData();
  return typeof data === "string"
    ? JSON.parse(data)
    : JSON.parse(data.toString("utf8"));
};

module.exports.listen = async (durableName, subject, queueGroupName, cb) => {
  if (natsJetStream) {
    try {
      const deliverSubject = createInbox();
      const subscription = await natsWrapper.client.subscribe(subject, {
        queue: queueGroupName,
        durable: durableName,
        config: {
          ack_policy: "explicit",
          deliver_policy: "all",
          deliver_subject: deliverSubject,
        },
      });

      for await (const msg of subscription) {
        // Decode and parse the message data inline.
        const dataStr = Buffer.from(msg.data).toString("utf-8");
        const parsedData = JSON.parse(dataStr);
        cb(parsedData, msg);
      }
    } catch (err) {
      console.error("Error in subscription:", err);
    }
  } else {
    const options = natsWrapper.client
      .subscriptionOptions()
      .setManualAckMode(true)
      .setDeliverAllAvailable()
      .setDurableName(durableName);

    const subscription = natsWrapper.client.subscribe(
      subject,
      queueGroupName,
      options
    );

    subscription.on("message", (msg) => {
      const parsedData = parseMessage(msg);
      cb(parsedData, msg);
    });
  }
};

module.exports.publish = (subject, data, cb = null) => {
  natsWrapper.client.publish(subject, JSON.stringify(data));
  if (cb) {
    cb();
  }
};
