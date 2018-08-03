const Koa = require('koa')
const logger = require('koa-logger')
const app = new Koa()

app.use(logger())

app.listen(3000)