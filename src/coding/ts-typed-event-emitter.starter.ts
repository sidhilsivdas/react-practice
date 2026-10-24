// A type-safe event emitter. You describe the events once, as name → payload type:
//   type AppEvents = { login: { userId: number }; logout: undefined }
//   const events = new Emitter<AppEvents>()
//
// 1. Make the class generic over its Events map
// 2. on(event, listener): add a listener; returns a function that removes it again
// 3. emit(event, payload): call every listener of that event with the payload
// Event names and payload types should all be checked.
class Emitter {
  private listeners: any = {}

  on(event: any, listener: any): () => void {
    // your code here
    return () => {}
  }

  emit(event: any, payload: any): void {
    // your code here
  }
}

type AppEvents = { login: { userId: number }; logout: undefined }
const events = new Emitter()
events.on('login', (payload: any) => console.log('Logged in:', payload.userId))
events.emit('login', { userId: 1 })
