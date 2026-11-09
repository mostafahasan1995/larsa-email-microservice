const { connect } = require("nats");
const nodeNatsStreaming = require("node-nats-streaming");
const subjects = require("../../nats/subjects");

class NatsWrapper {
  _client = null;
  _jetStreamClient = null;

  get client() {
    if (!this._client) {
      throw new Error("Cannot access NATS client before connecting.");
    }
    return this._client;
  }

  get jetStreamClient() {
    if (!this._jetStreamClient) {
      throw new Error(
        "Cannot access NATS and JetStream client before connecting."
      );
    }
    return this._jetStreamClient;
  }

  async jetStreamconnect(servers) {
    let attempts = 0;
    while (this._client === null) {
      attempts++;
      try {
        console.log("🚀 ~ [NATS CONNECT] servers:", servers);
        const nc = await connect({
          servers,
          maxReconnectAttempts: -1,
          reconnect: true,
          reconnectTimeWait: 5000,
          connectTimeout: 10000,
          pingInterval: 5000,
          maxPingOut: 5,
        });

        console.log("🚀 ~ [NATS CONNECT] Connected to NATS and JetStream 🚀");
        const jsm = await nc.jetstreamManager();
        try {
          const info = await jsm.streams.info("email");
        } catch (e) {
          await jsm.streams.add({
            name: "email",
            subjects: Object.values(subjects),
          });
        }
        this._client = nc;
        this._jetStreamClient = nc.jetstream();

        nc.closed().then((err) => {
          if (err) {
            console.error(
              `🚀 ~ [NATS CONNECT] NATS connection closed with error: ${err.message}`
            );
          } else {
            console.log(
              "🚀 ~ [NATS CONNECT] NATS connection closed gracefully"
            );
          }
        });

        (async () => {
          for await (const status of nc.status()) {
            switch (status.type) {
              case "disconnect":
                console.log(
                  `🚀 ~ [NATS CONNECT] Disconnected from NATS server - ${new Date().toISOString()} - 🚀`
                );
                break;
              case "reconnect":
                console.log(
                  `🚀 ~ [NATS CONNECT] Reconnected to NATS and JetStream - ${new Date().toISOString()} - 🚀`
                );
                break;
              case "reconnecting":
                console.log(
                  `🚀 ~ [NATS CONNECT] Reconnecting to NATS and JetStream - ${new Date().toISOString()} - 🚀`
                );
                break;
              case "update":
                console.log(
                  `🚀 ~ [NATS CONNECT] NATS and JetStream Updated - ${new Date().toISOString()} - 🚀`
                );
                break;
              case "error":
                console.log(
                  `🚀 ~ [NATS CONNECT] NATS Error: ${
                    status.data
                  } - ${new Date().toISOString()} - 🚀`
                );
                break;
              default:
                console.log(`🚀 New NATS Status Update: ${status.type} 🚀`);
                break;
            }
          }
        })();

        return;
      } catch (error) {
        console.log(
          "🚀 ~ [NATS CONNECT] ~ NatsWrapper ~ jetStreamconnect ~ error:",
          error
        );
        console.log(
          `🚀 ~ [NATS CONNECT] Attempt ${attempts} - Failed to connect to NATS and JetStream - ${new Date().toISOString()} - 🚀`
        );
        await new Promise((resolve) => setTimeout(resolve, 0.3 * 60 * 1000)); // Retry delay
      }
    }
  }

  async connect(clusterId, clientId, url) {
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        console.log(
          `🚀 ~ [NATS CONNECT] Attempting to connect to NATS (attempt ${attempts}/${maxAttempts}): ${url}`
        );

        this._client = nodeNatsStreaming.connect(clusterId, clientId, {
          url,
          maxReconnectAttempts: -1,
          waitOnFirstConnect: true,
          connectTimeout: 10000,
          ackTimeout: 30000,
          pingInterval: 5000,
          pingMaxOut: 5,
          reconnectTimeWait: 5000,
          stanMaxPingOut: 5,
          stanPingInterval: 5000,
        });

        return new Promise((resolve, reject) => {
          this.client.on("connect", () => {
            console.log("🚀 NATS Connected 🚀");
            console.log(`Connected to NATS server: ${url}`);
            this.client.on("connection_lost", (err) => {
              console.log(`NATS connection_lost: - ${new Date()} - `, err);
              console.log(`Connection lost to: ${url}`);
            });
            this.client.on("disconnect", () => {
              console.log(`NATS disconnect: - ${new Date()} - `);
              console.log(`Disconnected from: ${url}`);
            });
            resolve();
          });
          this.client.on("error", (err) => {
            console.log(`NATS Error: - ${new Date()} - `, err);
            console.log(`Error connecting to: ${url}`);
            reject(err);
          });

          this.client.on("close", () => {
            console.log("NATS connection closed!");
            console.log(`Connection closed to: ${url}`);
            process.exit();
          });
          process.on("SIGINT", () => this.client.close());
          process.on("SIGTERM", () => this.client.close());
        });
      } catch (error) {
        console.log(
          `🚀 Attempt ${attempts} - Failed to connect to NATS - ${new Date()} - 🚀`
        );
        console.log(`Error: ${error.message}`);

        if (attempts >= maxAttempts) {
          throw error;
        }

        // Exponential backoff: 2^attempts * 1000ms
        const delay = Math.min(Math.pow(2, attempts) * 1000, 30000);
        console.log(`Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
}

module.exports = { natsWrapper: new NatsWrapper() };
