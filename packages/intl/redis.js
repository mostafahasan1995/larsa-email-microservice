var Redis = require('ioredis')

function initRedis() {
    var redis;
    var AventumCache;

    if (process.env.REDIS_CLUSTER) {
        redis = new Redis.Cluster(
            [
                {
                    port: process.env.REDIS_PORT,
                    host: process.env.REDIS_HOST,
                    family: parseInt(process.env.REDIS_FAMILY) || 4,
                    password: process.env.REDIS_PASSWORD,
                    db: process.env.REDIS_DB
                }
            ],
            {
                scaleReads: "slave", //Send write queries to masters and read queries to slaves
                dnsLookup: (address, callback) => callback(null, address),
                enableAutoPipelining: true
            },

        );

        redis.on("connect", (...args) => {
            console.log("redis,connection is established to the Redis server")
        })
        redis.on("ready", (...args) => {
            console.log("ready,connection is established to the Redis server")
        })
        redis.on("error", (err) => {
            console.log(`redis,error occurs while connecting: ${err}`)
        })

        redis.on("-node", (...args) => {
            console.log("redis,node is disconnected:")
            //console.log(args)
        })
        redis.on("+node", (...args) => {
            console.log("redis,new node is connected:")
            //console.log(args)
        })

        AventumCache = require('./../NOScache/cluster')

    } else {
            if (process.env.VALKEY_SENTINEL_HOST) {
            const sentinelHosts = process.env.VALKEY_SENTINEL_HOST.split(", ").map(
                (host) => {
                const [hostname, port] = host.split(":");
                return { host: hostname, port: parseInt(port) };
                }
            );
            redis = new Redis({
                sentinels: sentinelHosts,
                name: process.env.VALKEY_MASTER_NAME,
            });
            } else {
            redis = new Redis({
                port: process.env.REDIS_PORT,
                host: process.env.REDIS_HOST,
                family: parseInt(process.env.REDIS_FAMILY) || 4,
                password: process.env.REDIS_PASSWORD,
                db: process.env.REDIS_DB,
                enableAutoPipelining: true,
            });
            }
        redis.on("connect", (...args) => {
            console.log("connection is established to the Redis server")
        })
        redis.on("ready", (...args) => {
            console.log("ready,connection is established to the Redis server")
        })
        redis.on("error", (err) => {
            console.log(`redis,error occurs while connecting: ${err}`)
        })
        redis.on("end", (...args) => {
            console.log(`redis,no more reconnections will be made, or the connection is failed to establish.`)
        })

        AventumCache = require('./../NOScache')
    }

    global.redis = redis
    aventum.cache = AventumCache
}

module.exports = initRedis