import Acl from 'acl'

import {promisifyAll} from 'bluebird'

import debugMod from 'debug'
const debug = debugMod('koa-acl-swagger:acl')

promisifyAll(Acl.prototype)

class AclExt extends Acl {
  // 获取所有的roles
  async allRolesAsync() {
    return await new Promise((resolve, reject)=> {
      this.backend.getAsync(this.options.buckets.meta, 'roles').nodeify(
        (error, result)=> {
          if (error) {
            return reject(error)
          }
          resolve(result)
        }
      )
    })
  }

  /**
   * 删除指定用户所有roles
   * @param  {[type]} userId 用户ID
   * @return {Boolean}        [description]
   */
  async removeUserAllRolesAsync(userId) {
    debug(`removeUserAllRoles ${userId}`)

    try {
      const roles = await this.allRolesAsync()
      if (!roles || roles.length === 0) {
        return true
      }

      await this.removeUserRolesAsync(userId, roles)
      return true

    } catch (error) {
      debug(`removeUserAllRoles fail ${error}`)
      return false
    }
  }
}


export default AclExt
