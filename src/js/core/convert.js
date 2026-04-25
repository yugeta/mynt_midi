/**
 * テンプレート文字列置換
 */

export class Convert{
  constructor(str){
    this.str = str
  }

  double_bracket = function(data){
    if(!this.str || typeof this.str !== 'string'){return null}
    let str = this.str
    if(data){
      const reg = new RegExp('{{(.*?)}}','g')
      const arr = []
      let res = []
      while ((res = reg.exec(str)) !== null) {
        arr.push(res[1])
      }
      for(let key of arr){
        const val = this.get_data_value(data , key)
        str = str.split('{{'+String(key)+'}}').join(val)
      }
    }
    return str
  }

  get_data_value(data , key){
    if(typeof data[key] === 'undefined'){return ''}
    if(key === '' || key === undefined || key === null){return ''}
    if(key.indexOf('.') === -1){return data[key]}
    const keys = key.split('.')
    let d = data
    for(const k of keys){
      if(d[k] === undefined || d[k] === null){return ''}
      else if(typeof d[k] === 'object'){d = d[k]; continue}
      else{return d[k]}
    }
  }
}
