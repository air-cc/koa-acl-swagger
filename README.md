# Koa-ACL-Swagger (Preview)

**NOTICE: can not be used in production**

a role base access controller and working with swagger (named OpenAPI now)

In YAML file, add `x-resource` option to each path. when a user visit this url, the middleware will check the permission based on resource name and HTTP method. like "user `test-user` have the permission `post` of the resource `pets`". so you should set role-base permission before.

see demo in `examples/app`


## Install
> Node.js >= 6.x && Koa >= 2.x

`npm install koa-acl-swagger`

## Usage

```javascript
import Koa from 'koa'
import Acl from 'koa-acl-swagger'

const app = new Koa()

const acl = new Acl({
  store: {
    type: 'redis',
    client: aclStore,
    prefix: 'examples:app:'
  },
  getUserId: async (ctx)=> {
    return 'test'
  },
  api: {
    dir: path.join(__dirname, './api.yaml'),
    skip: 1
  }
})

// init permissions by acl
// ....

app.use(acl.getMiddleware())

app.listen(3000)
```

## Class

### AclSwagger

**params**

``` javascript
store
  {
    type    {string}          database type. redis | mongodb | memory can be used, default: memory
    client  {object}          database client
    prefix  {string}          saved prefix
  }
getUserId   {async-function}  return user id for check permission
                              , the arguments include current koa context object
api
  {
    dir     {string}          api.yaml file direction
    skip    {number}          number of components in the url to be ignored for checking
    filter  {function}        return false when you don't want this url be checked
                              , the arguments include current `url` and `method`
  }
error       {json-object}     replace the default error message
                              , default:
                              {
                                "NO_PERMISSION": "no permission",
                                "NO_AUTH": "no auth",
                                "UNKNOWN": 'unknown error'
                              }
```

## Methods


### getMiddleware()

  return a middleware for koa@2.x

### [acl module](https://github.com/OptimalBits/node_acl) Async function

  convert [acl module](https://github.com/OptimalBits/node_acl) functions to async style (translate by [bulebird](https://github.com/petkaantonov/bluebird)). like `addUserRolesAsync` `allowAsync` `isAllowedAsync` ...

### allRolesAsync()

  return all roles (async style)

### removeUserAllRolesAsync(userId)

  remove all roles from a given user (async style), and return true if removed

