async function ackOrRetry(canAck, msg) {
  if (natsJetStream) {
    // TODO fix ackOrRetry here for natsJetStream
  } else {
    const msgTimeStamp = msg.getTimestampRaw();
    const key = `n:t:${msgTimeStamp}`;

    if (canAck) {
      msg.ack();
      //remove redis cache if exist
      aventum.cache.deleteKey(key);
    } else {
      const numOfRedeliver = 100;

      try {
        let num = await aventum.cache.getByKey(key);

        if (num < numOfRedeliver) {
          aventum.cache.cacheByKey(key, num + 1);
        } else {
          console.log("end or retry ack");
          msg.ack();
          aventum.cache.deleteKey(key);
        }
      } catch (e) {
        aventum.cache.cacheByKey(key, 1);
      }
    }
  }
}

function ack(result, msg) {
  try {
    if (redis && redis.status === "ready") {
      if (result instanceof Error) {
        if (result.responseCode === 451) {
          //this means  all recipients were rejected - ack
          console.log("error 451 ack");
          ackOrRetry(true, msg);
          return;
        }
        ackOrRetry(false, msg);
      } else {
        if (result && result.messageId != undefined) {
          ackOrRetry(true, msg);
        } else {
          ackOrRetry(false, msg);
        }
      }
    }
  } catch (e) {
    console.log(e);
  }
}

module.exports = {
  ack,
  ackOrRetry
};
