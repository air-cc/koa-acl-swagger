import path from 'path'
import Koa from 'koa'
import Acl from '../lib'
import supertest from 'supertest'

describe('base usage', ()=> {
  let app
  let request
  let acl

  before((done)=> {
    app = new Koa()
    acl = new Acl({
      getUserId: async ()=> {
        return 'user-1'
      },
      api: {
        dir: path.join(__dirname, './support/api.yaml'),
        skip: 1
      }
    })

    ;(async function () {
      await acl.allowAsync('role-1', ['user'], ['get', 'post', 'put', 'delete'])
      await acl.addUserRolesAsync('user-1', 'role-1')
    })()

    app.use(acl.getMiddleware())

    app.use(async (ctx) => {
      ctx.body = {name: 'cc', age: '100'}
      ctx.status = 200
    })

    request = supertest.agent(app.listen(done))
  })


  it('have permission', (done)=> {
    request.get('/api/users/use-1')
      .expect(200)
      .end(done)
  })


  it('no permission', (done)=> {
    request.get('/api/users')
      .expect(403)
      .end(done)
  })
})



