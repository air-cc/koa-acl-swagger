# Koa-ACL-Swagger (Preview)

**NOTICE: can not be used in production**

a role base access controller and working with swagger

## Install

`npm install koa-acl-swagger`

## Usage

```
import Koa from 'koa'
import Acl from 'koa-acl-swagger'

const app = new Koa()

const acl = new Acl({
  store: {
    type: 'redis',
    client: aclStore,
    prefix: 'examples:app:'
  },
  getUserId: async (ctx, next)=> {
    return 'test'
  },
  api: {
    dir: path.join(__dirname, './api.yaml'),
    skip: 1
  }
})

app.use(acl.getMiddleware())

app.listen(3000)
```

## Class

### AclSwagger

params:

- store
- getUserId
- api
- error
- hooks


## Methods

- **getMiddleware**: return a middleware for koa
