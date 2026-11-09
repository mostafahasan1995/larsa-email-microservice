var crypto = require('crypto')
//var uniq = require('lodash/fp/uniq')

class AventumCache {
  // 2419200 seconds is one month
  cacheByKey(key, value, expiration = 2419200) {
      redis.set(key, JSON.stringify(value), 'EX', expiration)
  }

  // key example "prefix*"
  getKeysByPattern(key) {
    return new Promise((resolve, reject) => {
        if(redis.status === "ready"){
            var stream = redis.scanStream({
                // only returns keys following the pattern of "key"
                match: key,
                // returns approximately 100 elements per call
                count: 100
              })
      
              var keys = []
              stream.on('data', function (resultKeys) {
                // `resultKeys` is an array of strings representing key names
                // for (var i = 0; i < resultKeys.length; i++) {
                //   keys.push(resultKeys[i])
                // }
                keys = resultKeys
              })
              stream.on('end', function () {
                resolve(keys)
              })
        }else{
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
      var stream = redis.scanStream({
        // only returns keys following the pattern of "key"
        match: key,
        // returns approximately 100 elements per call
        count: 100
      })

      var keys = []
      stream.on('data', function (resultKeys) {
        // `resultKeys` is an array of strings representing key names
        // for (var i = 0; i < resultKeys.length; i++) {
        //   keys.push(resultKeys[i])
        // }
        keys = resultKeys
      })
      stream.on('end', function () {
        redis.unlink(keys)
      })
    
  }

  /**
     * key example "prefix*"
     * @param {*} key
     * @param {*} keysPerBatch the number of keys to be deleted each deletion process
     */
  batchDeletionKeysByPattern(key, keysPerBatch = 100) {
      var stream = redis.scanStream({
        // only returns keys following the pattern of "key"
        match: key,
        // returns approximately 100 elements per call
        count: keysPerBatch
      })
  
      stream.on('data', function (resultKeys) {
        if (resultKeys.length) {
          redis.unlink(resultKeys)
        }
      })
    
    
  }

  getByKey(key) {
    return new Promise((resolve, reject) => {
        if(redis.status === "ready"){
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
        }else{
            reject("Redis not ready")
        }
        
    })
  }

  hashKey(data) {
    var hash = crypto.createHash('md5').update(JSON.stringify(data)).digest('hex')
    return hash
  }

  deleteKey(key) {
      redis.del(key)
  }

  flushDB() {
    var self = this
    return new Promise((resolve, reject) => {
        redis.flushdb(function (err, succeeded) {
          if (succeeded) {
            self.keys = []
            resolve(succeeded)
            // console.log(succeeded); // will be true if successfull
          } else if (err) {
            reject(err)
          }
        })
      
      
    })
  }

  flushAll() {
    var self = this
    return new Promise((resolve, reject) => {
        redis.flushall(function (err, succeeded) {
          if (succeeded) {
            self.keys = []
            resolve(succeeded)
            // console.log(succeeded); // will be true if successfull
          } else if (err) {
            reject(err)
          }
        })
      
    })
  }
}

module.exports = new AventumCache()
