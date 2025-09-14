This is supposed to be a client wrapper enabling you to connect to the Realtime server :

## Initialization :
this is the main function that enables you to create a websocket and set up reconnect, heartbeatDelay and reconnectinDelay options :
### Example
```javascript
import Realtime from 'src/app/'
const realtime = Realtime("ws://localhost:8080", {reconnect : true, reconnectMaxDelays: 20_000 /*20s*/, heartbeatIntervalMs: 30_000 /*30s*/})
```

## Publish :
enables you to send a message to specific a channel :
### Example
```javascript
realtime.publish("GameChannel", { ball : {x : 10, y : 10} }, true);
```

## Subscribe :
Notifies the server that you're interested in messages from a specific channel :
### Example
```javascript
const ChannelName = "GameChannel";
realtime.subscribe(ChannelName, (data) => {
    console.log(`Received a new message ${data}`)
})
```

## Unsubscribe :
Notifies the server for lost of interest in a specific channel :
### Example
```javascript
const ChannelName = "GameChannel";
realtime.unsubscribe(ChannelName);
```

## Available Scripts

In the project directory, you can run:

### `npm run tsc`

Compile the ts files in src dir.

