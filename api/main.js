import './modules/mynt-api.js'

class Main{
  constructor(){

  }
}

switch(document.readyState) {
  case "loading":
    document.addEventListener("", () => {
      // Your code here
    });
    break;
  case "interactive":
  case "complete":
    new Main();break;
  default:
    window.addEventListener("DOMContentLoaded", (()=>new Main))
}
