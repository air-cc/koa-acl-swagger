import path from 'path'
import ioredis from 'ioredis'

import Acl from '../../lib'

const aclStore = new ioredis()
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

export default acl
