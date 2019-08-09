const request = require('superagent')
const EventEmitter = require('events')
const charm = require('charm')
class State {
  constructor (ctx, ...args) {
    this.ctx = ctx
    this.ctx.state = this
    this.enter(...args)
  }

  setState (State, ...args) {
    this.exit()
    new State(this.ctx, ...args)
  }

  enter (...args) {

  }

  exit (...args) {

  }

  resetWindow () {
    let c = charm()
    c.pipe(process.stdout)
    c.reset()
    c.end()
  }
}

class Pending extends State {
  
  enter() {
    this.resetWindow()
    setImmediate(() => {
      console.log('进入等待状态...')
      process.stdout.write('请输入KEY：')
      process.stdin.on('data', chunk => {
        let key = chunk.toString().trim()
        this.setState(Checking, key)
      })
    })
  }

  exit() {
    process.stdin.removeAllListeners()
  }
}

class Failed extends State {
  
  enter (error) {
    this.resetWindow()
    console.log('进入失败状态!')
    console.log(error.message)
    this.error = error
    console.log('请重新输入KEY: ')
    process.stdin.on('data', chunk => {
      let key = chunk.toString().trim()
      this.setState(Checking, key)
    })
  }

  exit() {
    process.stdin.removeAllListeners()
  }
}

class Checking extends State {

  enter (key) {
    let url = process.env.NODE_ENV === 'test' ? 'http://ec2-52-81-82-240.cn-north-1.compute.amazonaws.com.cn:12345/test/provisioning/token'
      : 'http://ec2-54-223-41-42.cn-north-1.compute.amazonaws.com.cn:12345/provisioning/token'
    this.req = request
      .get(url)
      .query({ key })
      .then(res => {
        if (res.status !== 200) {
          return this.setState(Failed, res.error)
        }
        let token = res.body.token
        this.setState(Started, token)
      }, error => this.setState(Failed, error))
  }

  exit () {

  }
}

class Started extends State {
  
  enter (token) {
    this.resetWindow()
    console.log('****校验通过****')
    console.log('****系统就绪****')
    this.ctx.token = token
  }

  exit () {

  }
}

class AppService extends EventEmitter {

  constructor(config) {
    super()
    this.conf = config

    this.state = new Pending(this)
  }

  registByCsr (body, callback) {
    let url = process.env.NODE_ENV === 'test'
      ? 'http://ec2-52-81-82-240.cn-north-1.compute.amazonaws.com.cn:12345/test/provisioning/certificate/sign'
      : 'http://ec2-54-223-41-42.cn-north-1.compute.amazonaws.com.cn:12345/provisioning/certificate/sign'
    request
      .post(url)
      .set("Authorization", this.token)
      .send(body)
      .then(res => {
        if (res.status !== 200) return callback(res.error)
        return callback(null, res.body)
      }, err => {
        console.log(err)
        callback(err)
      })
  }

}

module.exports = AppService