/**
 * CSS変数の動的読み書き
 */

export class Css{
  static set_css(selector , property , value){
    const rule = Css.get_last_rule(selector)
    if(rule){
      rule.style.setProperty(property , value , '')
    }
    else{
      Css.create_rule(selector , property , value)
    }
  }

  static get_last_rule(selector){
    const rules = Css.get_rules(selector)
    return rules && rules.length ? rules[rules.length-1] : null
  }

  static create_rule(selector , property , value){
    const stylesheet = Css.get_last_stylesheet() || Css.create_stylesheet()
    stylesheet.insertRule(`${selector}{${property}:${value}}` , 0)
  }

  static get_last_stylesheet(){
    const stylesheets = Css.get_stylesheets()
    return stylesheets && stylesheets.length ? stylesheets[stylesheets.length-1] : null
  }

  static create_stylesheet(){
    const style = document.createElement('style')
    document.querySelector('head').appendChild(style)
    return Css.get_last_stylesheet()
  }

  static get_css(selector , property){
    const rules = Css.get_rules(selector)
    let value = null
    for(const rule of rules){
      value = rule.style.getPropertyValue(property) || value
    }
    return value
  }

  static get_stylesheets(){
    return Array.from(document.styleSheets).filter((styleSheet) => !styleSheet.href || styleSheet.href.startsWith(window.location.origin))
  }

  static get_rules(selector){
    const styleSheets = Css.get_stylesheets()
    let arr = []
    for(const ss of styleSheets){
      try{
        if(!ss.cssRules){continue}
      }catch(e){
        continue
      }
      const res = this.get_rule(ss.cssRules , selector)
      if(!res || !res.length){continue}
      arr = arr.concat(res)
    }
    return arr
  }

  static get_rule(rules , selector){
    if(!rules){return}
    let arr = []
    for(const rule of rules){
      if(rule.selectorText === selector){
        arr.push(rule)
      }
      try{
        if(rule.styleSheet && rule.styleSheet.cssRules){
          const res = Css.get_rule(rule.styleSheet.cssRules , selector)
          if(!res || !res.length){continue}
          arr = arr.concat(res)
        }
      }catch(e){
        continue
      }
    }
    return arr
  }
}
