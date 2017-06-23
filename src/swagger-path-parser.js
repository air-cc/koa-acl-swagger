export default class swaggerPathParser {
  constructor(paths) {
    this.pathsDe = []
    paths.forEach((path)=> {
      const {reArr, keys} = this.decompose(path)
      this.pathsDe.push({path, reArr, keys})
    })
  }

  decompose(path) {
    const arr = path.split('/').slice(1)

    const len = arr.length
    const keyRe = '\\/[\\w|\\-|%]+'
    const strRe = '\\/?$'
    let reArr = []
    let keys = []
    let courrRe = ''
    let isPureStr = true

    arr.forEach(function (item, index) {
      if (item.match(/^\{[\w|\\-|%]+?\}$/ig)) {
        isPureStr = false
        courrRe += keyRe
        const key = item.replace(/[\{|\}]/ig, '')
        keys.push(key)
      } else {
        courrRe += '\\/' + item
      }

      if (index == len-1) {
        courrRe += strRe
        isPureStr = false
      }

      if (!isPureStr) {
        const re = new RegExp(courrRe, 'ig')
        reArr.push(re)
        isPureStr = true
      }
    })

    return {
      reArr: reArr,
      keys: keys
    }
  }

  _match(url, reArr) {
    for (let re of reArr) {
      if (!url.match(re))
        return false
    }
    return true
  }

  match(url) {
    const pathsDe = this.pathsDe
    for (let {path, reArr, keys} of pathsDe) {
      if (this._match(url, reArr))
        return {path, keys}
    }
    return null
  }

  parse(url) {
    url = url.split('?')[0]
    const {path, keys} = this.match(url) || {}
    if (!path)
      return null

    const pathArr = path.split('/')
    const urlArr = url.split('/')
    let params = {}

    for ( let index in urlArr ) {
      if (urlArr[index] !== pathArr[index]) {
        const key = keys.shift()
        params[key] = urlArr[index]
      }
    }

    return {
      path: path,
      params: params
    }
  }

  compile(path, obj) {
    var arr = path.split('/')

    arr.forEach( (value, index) =>{
      if (value.match( /^\{\w+\}$/g )) {
        value = value.replace(/\{|\}/g, '')

        if ( obj.hasOwnProperty(value) )
          arr[index] = obj[value]
      }
    })

    return arr.join('/')
  }
}
