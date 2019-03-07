// Uncomment this file to enable random WebGL context losses.

// let kill = true
// let lose: null | WEBGL_lose_context = null
// setInterval(() => {
//   if (!lose) {
//     lose = getGl().getExtension(`WEBGL_lose_context`)
//   }
//   if (!lose) {
//     return
//   }
//   if (kill) {
//     lose.loseContext()
//   } else {
//     lose.restoreContext()
//   }
//   kill = !kill
// }, 1500)
