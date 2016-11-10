import Koa from 'koa'
import acl from './acl'

const app = new Koa()

app.use(acl.getMiddleware())

app.listen(3000)

console.log('server running at 3000')
console.log('try http://127.0.0.1:3000/v2/pets')
