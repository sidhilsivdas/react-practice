// Implement on, off, emit (returns true if there were listeners) and once.
class EventEmitter {
  on(event, listener) {
    // your code here
  }

  off(event, listener) {
    // your code here
  }

  emit(event, ...args) {
    // your code here
  }

  once(event, listener) {
    // your code here
  }
}

const emitter = new EventEmitter()
emitter.on('greet', (name) => console.log('Hello', name))
emitter.emit('greet', 'Sam')
