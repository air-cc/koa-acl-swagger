'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _acl = require('./acl');

var _acl2 = _interopRequireDefault(_acl);

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

var _swaggerParser = require('swagger-parser');

var _swaggerParser2 = _interopRequireDefault(_swaggerParser);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _swaggerPathParser = require('./swagger-path-parser');

var _swaggerPathParser2 = _interopRequireDefault(_swaggerPathParser);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; } /**
                                                                                                                                                                                                                                                                                                                                                                                                                                                                             其基本思想是，对系统操作的各种权限不是直接授予具体的用户，而是在用户集合与权限集合之间建立一个角色集合。
                                                                                                                                                                                                                                                                                                                                                                                                                                                                             每一种角色对应一组相应的权限。
                                                                                                                                                                                                                                                                                                                                                                                                                                                                             一旦用户被分配了适当的角色后，该用户就拥有此角色的所有操作权限。
                                                                                                                                                                                                                                                                                                                                                                                                                                                                             这样做的好处是，不必在每次创建用户时都进行分配权限的操作，只要分配用户相应的角色即可，而且角色的权限变更比用户的权限变更要少得多，这样将简化用户的权限管理，减少系统的开销。
                                                                                                                                                                                                                                                                                                                                                                                                                                                                            */

/**
 * 目前策略：
 * 事先定义好 role 对应资源的 crud 操作，在 Router 中标记该 url 所代表的资源属性
 */

const debug = (0, _debug2.default)('koa-acl-swagger:middleware');

const { redisBackend, mongodbBackend, memoryBackend } = _acl2.default;

const ERROR = {
  "NO_PERMISSION": "no permission",
  "NO_AUTH": "no auth",
  "UNKNOWN": 'unknown error'
};

class AclMidware extends _acl2.default {

  /**
   * AclMidware 构造函数
   * @param  {Object} opts.store        存储角色信息的数据库客户端 如：{type: 'redis', client: '', prefix}
   * @param  {Object} opts.error        错误警告信息 如：{"NO_PERMISSION": "no permission"}
   * @param  {String} opts.api.dir      api: router 中 router与source的对应关系
   * @param  {number} opts.api.skip     url 匹配时跳过前面的级数 默认 0
   * @param  {number} opts.api.filter   url 匹配时跳过对该 url 的权限判定
   * @param  {Array} opts.hooks         对于非通用资源权限的管理
   * @param  {Function} opts.getUserId  获取用户ID的function
   * @return {Function|Object}          koa async 中间件 || acl 实例
   */
  constructor(opts = {}) {

    const storeType = opts.store && opts.store.type || 'memory';
    const dbInstance = opts.store && opts.store.client || null;
    const prefix = opts.store && opts.store.prefix || null;
    const backEnd = {
      'redis': redisBackend,
      'mongodb': mongodbBackend,
      'memory': memoryBackend
    }[storeType] || memoryBackend;

    super(new backEnd(dbInstance, prefix));

    opts.api = opts.api || { dir: '', skip: 0 };
    if (!_fs2.default.existsSync(opts.api.dir)) {
      throw new Error('api file not exists');
      return;
    }

    _swaggerParser2.default.validate(opts.api.dir, { validate: { schema: false, spec: false } }).then(api => {
      this.apiDir = opts.api.dir;
      this.api = api;
      debug('get api', this.apiDir, this.api);

      this.apiPaths = new _swaggerPathParser2.default(Object.keys(api.paths));

      debug('get api paths', this.apiPaths);
    }).catch(error => {
      throw new Error(error);
    });

    this.getUserId = opts.getUserId;
    this.apiSkip = (opts.api.skip || 0) + 1;
    this.filter = typeof opts.api.filter === 'function' ? opts.api.filter : null;
    this.ERROR = Object.assign({}, ERROR, opts.error || {});
  }

  /**
   * middleware for koa
   */
  middleware_koa(ctx, next) {
    var _this = this;

    return _asyncToGenerator(function* () {
      let { url, method } = ctx;
      method = method.toLowerCase();

      if (_this.filter && !_this.filter(url, method)) return next();

      url = "/" + url.split('?')[0].split('/').slice(_this.apiSkip).join('/');

      const resource = _this.getURLItem(url, method, 'x-resource');
      debug(`get resource ${ resource } type`, typeof resource);
      if (!resource) {
        return resource === null ? ctx.throw(_this.ERROR.UNKNOWN_PATH, 404) : next();
      }

      const userId = typeof _this.getUserId === 'function' ? yield _this.getUserId(ctx, next) : _this.userId || null;
      debug(`get userId ${ userId }`);
      if (!userId) // haven't login
        return ctx.throw(_this.ERROR.NO_AUTH, 401);

      debug(`Check -- userId: ${ userId } resource: ${ resource } method: ${ method } | - | url: ${ url }`);

      let ret = null;
      try {
        ret = yield _this.isAllowedAsync(userId, resource, method);
      } catch (error) {
        debug(`Check permission Error: ${ error }`);
        return ctx.throw(_this.ERROR.UNKNOWN, 404);
      }

      if (!ret) {
        // have no permission
        debug(`Not allowed -- userId: ${ userId } resource: ${ resource } method: ${ method } | - | url: ${ url }`);
        return ctx.throw(_this.ERROR.NO_PERMISSION, 403);
      }

      debug(`Allowed -- userId: ${ userId } resource: ${ resource } method: ${ method } | - | url: ${ url }`);
      return next();
    })();
  }

  getMiddleware() {
    return this.middleware_koa.bind(this);
  }

  /**
   * 用于 特殊权限的处理
   * @param  {[type]}   ctx  [description]
   * @param  {Function} next [description]
   * @return {[type]}        [description]
   */
  hooks(ctx, next) {
    return _asyncToGenerator(function* () {})();
  }

  /**
   * 获取 API 配置信息
   * @return {API} API 配置信息
   */
  getAPI() {
    var _this2 = this;

    return _asyncToGenerator(function* () {
      return _this2.api || _swaggerParser2.default.validate(_this2.apiDir);
    })();
  }

  getPathItem(path, method, item) {
    const info = this.api.paths[path] || {};
    return info[method] ? info[method][item] || '' : null;
  }

  getURLItem(url, method, item) {
    const { path } = this.apiPaths.match(url) || {};
    if (!path) return null;

    return this.getPathItem(path, method, item);
  }
}
exports.default = AclMidware;