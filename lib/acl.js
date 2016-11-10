'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _acl = require('acl');

var _acl2 = _interopRequireDefault(_acl);

var _bluebird = require('bluebird');

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const debug = (0, _debug2.default)('koa-acl-swagger:acl');

(0, _bluebird.promisifyAll)(_acl2.default.prototype);

class AclExt extends _acl2.default {
  // 获取所有的roles
  allRolesAsync() {
    var _this = this;

    return _asyncToGenerator(function* () {
      return yield new Promise(function (resolve, reject) {
        _this.backend.getAsync(_this.options.buckets.meta, 'roles').nodeify(function (error, result) {
          if (error) {
            return reject(error);
          }
          resolve(result);
        });
      });
    })();
  }

  /**
   * 删除指定用户所有roles
   * @param  {[type]} userId 用户ID
   * @return {Boolean}        [description]
   */
  removeUserAllRolesAsync(userId) {
    var _this2 = this;

    return _asyncToGenerator(function* () {
      debug(`removeUserAllRoles ${ userId }`);

      try {
        const roles = yield _this2.allRolesAsync();
        if (!roles || roles.length === 0) {
          return true;
        }

        yield _this2.removeUserRolesAsync(userId, roles);
        return true;
      } catch (error) {
        debug(`removeUserAllRoles fail`, error);
        return false;
      }
    })();
  }
}

exports.default = AclExt;