/**
  其基本思想是，对系统操作的各种权限不是直接授予具体的用户，而是在用户集合与权限集合之间建立一个角色集合。
  每一种角色对应一组相应的权限。
  一旦用户被分配了适当的角色后，该用户就拥有此角色的所有操作权限。
  这样做的好处是，不必在每次创建用户时都进行分配权限的操作，只要分配用户相应的角色即可，而且角色的权限变更比用户的权限变更要少得多，这样将简化用户的权限管理，减少系统的开销。
 */

/**
 * 目前策略：
 * 事先定义好 role 对应资源的 crud 操作，在 Router 中标记该 url 所代表的资源属性
 */

import Acl from './acl'
import debugMod from 'debug'
import SwaggerParser from 'swagger-parser'
import fs from 'fs'

const debug = debugMod('koa-acl-swagger:main')

const {redisBackend, mongodbBackend, memoryBackend} = Acl

const ERROR = {
  "NO_PERMISSION": "no permission",
  "NO_AUTH": "no auth",
  "UNKNOWN": 'unknown error'
}


export default class AclSwagger extends Acl {

  /**
   * AclMidware 构造函数
   * @param  {Object} opts.store        存储角色信息的数据库客户端 如：{type: 'redis', client: '', prefix}
   * @param  {Object} opts.error        错误警告信息 如：{"NO_PERMISSION": "no permission"}
   * @param  {String} opts.api.dir      api: router 中 router与source的对应关系
   * @param  {number} opts.api.skip     url 匹配时跳过前面的级数 默认 0
   * @param  {Array} opts.hooks         对于非通用资源权限的管理
   * @param  {Function} opts.getUserId  获取用户ID的function
   * @return {Function|Object}          koa async 中间件 || acl 实例
   */
  constructor(opts={}) {

    const storeType = opts.store && opts.store.type || 'memory'
    const dbInstance = opts.store && opts.store.client || null
    const prefix = opts.store && opts.store.prefix || null
    const backEnd = {
      'redis': redisBackend,
      'mongodb': mongodbBackend,
      'memory': memoryBackend
    }[storeType] || memoryBackend

    super(new backEnd(dbInstance, prefix))

    opts.api = opts.api || {dir: '', skip: 0}
    if (!fs.existsSync(opts.api.dir)) {
      throw new Error('api file not exists')
      return
    }

    SwaggerParser.validate(opts.api.dir, { validate: { schema: false, spec: false } } )
      .then((api)=> {
        this.apiDir = opts.api.dir
        this.apiSkip = (opts.api.skip || 0) + 1
        this.api = api
        debug('get api', this.api)
        debug('get api skip', this.apiSkip)
      })
      .catch( (error)=> {
        throw new Error(error)
      })

    this.getUserId = opts.getUserId
    this.ERROR = Object.assign({}, ERROR, opts.error || {})
  }

  /**
   * middleware for koa
   */
  async middleware_koa (ctx, next) {
    let {url, method, parmas={}} = ctx
    method = method.toLowerCase()
    url = "/" + url.split('?')[0].split('/').slice(this.apiSkip).join('/')

    const resource = this.getResource(url, method, parmas)
    debug(`getResource url: ${url} method: ${method} resource: ${resource}`)
    if (resource === null)
      return ctx.throw(this.ERROR.UNKNOWN_PATH, 404)
    if (!resource === '')  // no permission need
      return next()

    const userId = (typeof this.getUserId === 'function') ? await this.getUserId(ctx, next) : (ctx.session && ctx.session.userId) || null
    debug(`get userId ${userId}`)
    if (!userId) // haven't login
      return ctx.throw(this.ERROR.NO_AUTH, 401)

    debug(`Check -- userId: ${userId} resource: ${resource} method: ${method} | - | url: ${url}`)

    let ret = null
    try {
      ret = await this.isAllowedAsync(userId, resource, method)
    } catch (error) {
        debug(`Check permission Error: ${error}`)
        return ctx.throw(this.ERROR.UNKNOWN, 404)
    }

    if (!ret) {   // have no permission
      debug(`Not allowed -- userId: ${userId} resource: ${resource} method: ${method} | - | url: ${url}`)
      return ctx.throw(this.ERROR.NO_PERMISSION, 403)
    }

    debug(`Allowed -- userId: ${userId} resource: ${resource} method: ${method} | - | url: ${url}`)
    return next()
  }


  getMiddleware() {
    return this.middleware_koa.bind(this)
  }

  /**
   * 用于 特殊权限的处理
   * @param  {[type]}   ctx  [description]
   * @param  {Function} next [description]
   * @return {[type]}        [description]
   */
  async hooks(ctx, next) {

  }

  /**
   * 获取 API 配置信息
   * @return {API} API 配置信息
   */
  async getAPI() {
    return this.api || SwaggerParser.validate(this.apiDir)
  }

  /**
   * 根据 url method 获取对应 resource
   * @param  {String} url
   * @return {String}     资源名
   */
  getResource(url, method, params) {
    const paths = this.api && this.api.paths
    if (!paths) {
      debug('get api paths fail')
      throw new Error('get api paths fail')
      return
    }


    const _getResource = (paths, path, method)=> {
      var methodObj = paths[path][method] || {}
      return methodObj['x-resource'] || ''
    }

    if ( paths.hasOwnProperty(url) )
      return _getResource(paths, url, method)

    const pathsArr = Object.keys(paths)
    for (let path of pathsArr) {
      if (this._openAPIFormat(path, params) === url)
        return _getResource(paths, path, method)
    }

    return null
  }

  /**
   * 根据既定的 url 和对应 path 参数 得到真实的 url
   * @param  {String} url 既定的 url
   * @param  {Object} obj url params
   * @return {String}     真实的 url
   */
  _openAPIFormat(url, obj) {
    var arr = url.split('/')

    arr.forEach( function (value, index){
      if (value.match( /^\{\w+\}$/g )) {
        value = value.replace(/\{|\}/g, '')

        if ( obj.hasOwnProperty(value) )
          arr[index] = obj[value]
      }
    })

    return arr.join('/')
  }
}
