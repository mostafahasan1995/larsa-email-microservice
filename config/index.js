const fs = require('fs')
var resolve = require('path').resolve

var config
if (fs.existsSync(resolve('config/config.local.json'))) {
  config = require('./config.local.json')
} else {
  config = require('./config.json')
}

var env = process.env.NODE_ENV || config.env

var envConfig = config[env]

Object.keys(envConfig).forEach((key) => {
  if (!(key in process.env)) {
    process.env[key] = envConfig[key]
  }
})

process.env.NODE_ENV = process.env.NODE_ENV || env
