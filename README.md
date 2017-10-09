# kubernetes-stream

This package provides a Node.js Streams API around Kubernetes events.

## Install

```
npm install kubernetes-stream
```

## Usage

```javascript
const Transform = require('stream').Transform
const KubernetesStream = require('kubernetes-stream')

// pipe the k8s events into a storage fifo
new KubernetesStream().pipe(
  new Transform({
    transform (event, encoding, callback) {
      const { type, object } = event
      const objectName = object.metadata.name

      if (!this.store) {
        this.store = {}
      }

      switch (type) {
        case 'Added':
        case 'Updated':
          this.store[objectName] = object
          break
        case 'Deleted':
          delete this.store[objectName]
          break
        default:
          return callback(new Error(`Can't handle ${type} event`))
      }

      return callback(null, event)
    }
  })
)
```
