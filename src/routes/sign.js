const Router = require('express').Router

const f = af => (req, res, next) => af(req, res).then(x => x, next)

module.exports = (service) => {
  const router = Router()
  router.post('/', (req, res) => {
    service.registByCsr(req.body, (err, data) => {
      err ? res.status(500).json(err) : res.status(200).json(data)
    })
  })

  return router
}