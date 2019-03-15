let loadedGameplayCriticalContent = 0
let totalGameplayCriticalContent = 1

function generateLoadingMessage(): null | string {
  if (loadedGameplayCriticalContent < totalGameplayCriticalContent) {
    return `Now loading... (${loadedGameplayCriticalContent}/${totalGameplayCriticalContent})`
  } else {
    return null
  }
}
