var crypto = require('crypto');
var uniq = require('lodash/fp/uniq');

class AventumCache {
  // 2419200 seconds is one month
  cacheByKey(key, value, expiration = 2419200) {
      redis.set(key, JSON.stringify(value), 'EX', expiration)
  }

  // key example "prefix*"
  //pass
  getKeysByPattern(key) {

    return new Promise((resolve, reject) => {

      if (redis.status === "ready") {
        let keys = [];
        let nodes = redis.nodes(),
          scanNode = (nodeIndex) => {
            let node = nodes[nodeIndex];
            node.scanStream({
              match: key,
              count: 100
            }).on('data', rs => {

              keys = keys.concat(rs);
            }).on('end', () => {

              if (++nodeIndex < nodes.length) {
                scanNode(nodeIndex);
              } else {
                
                resolve(uniq(keys))
              }
            });

          };
        if (nodes.length) {
          scanNode(0)
        } else {
          //reject('Redis cluster error,no nodes available')
          console.log("getKeysByPattern: Redis cluster ,no nodes available")
          resolve([])
        }
      } else {
        console.log("getKeysByPattern: Redis cluster not ready")
        resolve([])

      }

    })
  }

  /**
     * Find the keys then delete them all together
     * key example "prefix*"
     * @param {*} key
     */
  deleteKeysByPattern(key) {
      let nodes = redis.nodes(),
        scanNode = (nodeIndex) => {
          let node = nodes[nodeIndex];
          let pipeline = node.pipeline();
          node.scanStream({
            match: key,
            count: 100
          }).on('data', rs => {

            rs.forEach(function (key) {
              pipeline.del(key);
            });

          }).on('end', () => {
            pipeline.exec();
            if (++nodeIndex < nodes.length) {
              scanNode(nodeIndex);
            } else {
              console.info("scan finished");

            }
          });
        };

      if (nodes.length) {
        scanNode(0)
      } else {
        console.log('Redis cluster error,no nodes available')
      }

  }

  /**
     * key example "prefix*"
     * @param {*} key
     * @param {*} keysPerBatch the number of keys to be deleted each deletion process
     */
  //pass
  batchDeletionKeysByPattern(key, keysPerBatch = 100) {

      let nodes = redis.nodes(),
        scanNode = (nodeIndex) => {
          let node = nodes[nodeIndex];
          let pipeline = node.pipeline();
          node.scanStream({
            match: key,
            count: keysPerBatch
          }).on('data', rs => {

            rs.forEach(function (key) {
              pipeline.del(key);
            });

          }).on('end', () => {
            pipeline.exec();
            if (++nodeIndex < nodes.length) {
              scanNode(nodeIndex);
            } else {
              console.info("scan finished");
            }
          });

        };
      if (nodes.length) {
        scanNode(0)
      } else {
        console.log('Redis cluster error,no nodes available')
      }

  }

  //pass
  getByKey(key) {
    return new Promise((resolve, reject) => {

      if (redis.status === "ready") {
        redis.get(key, function (error, result) {
          if (error) {
            // we couldn't find the key in our cache
            reject(aventum.i18n.t('NoCacheFound'))
          }
          if (result) {
            // the result exists in our cache - return it immediately
            resolve(JSON.parse(result))
          } else {
            // we couldn't find the key in our cache
            reject(aventum.i18n.t('NoCacheFound'))

          }
        })
      } else {
        reject("Redis not ready")
      }

    })
  }

  //pass
  hashKey(data) {
    var hash = crypto.createHash('md5').update(JSON.stringify(data)).digest('hex')
    return hash
  }

  //pass
  deleteKey(key) {

      let nodes = redis.nodes(),
        scanNode = (nodeIndex) => {
          let node = nodes[nodeIndex];
          let pipeline = node.pipeline()
          pipeline.del(key)
          pipeline.exec()
          if (++nodeIndex < nodes.length) {
            scanNode(nodeIndex)
          }
        };
      if (nodes.length) {
        scanNode(0)
      } else {
        console.log('Redis cluster error,no nodes available')
      }
    

  }

  //PASS
  flushDB() {
    var self = this
    return new Promise((resolve, reject) => {
        let nodes = redis.nodes(),
          scanNode = (nodeIndex) => {
            let node = nodes[nodeIndex];
            node.flushdb(function (err, succeeded) {
              if (++nodeIndex < nodes.length) {
                scanNode(nodeIndex)
              } else {
                self.keys = []
                resolve(true)
              }
            })

          };

        if (nodes.length) {
          scanNode(0)
        } else {
          reject('Redis cluster error,no nodes available')
        }
      

    })
  }

  //PASS
  flushAll() {
    var self = this
    return new Promise((resolve, reject) => {

        let nodes = redis.nodes(),
          scanNode = (nodeIndex) => {
            let node = nodes[nodeIndex];
            node.flushall(function (err, succeeded) {
              if (++nodeIndex < nodes.length) {
                scanNode(nodeIndex)
              } else {
                self.keys = []
                resolve(true)
              }
            })

          };

        if (nodes.length) {
          scanNode(0)
        } else {
          reject('Redis cluster error,no nodes available')
        }

    })
  }

}

module.exports = new AventumCache()
