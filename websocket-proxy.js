// websocket-proxy.js
// Run with: node websocket-proxy.js

const WebSocket = require('ws');
const net = require('net');

// Create a WebSocket server
const wss = new WebSocket.Server({ port: 9100 });

console.log('WebSocket server started on port 9100');

wss.on('connection', function connection(ws) {
  console.log('Browser connected to WebSocket server');
  
  let tcpClient = null;
  
  ws.on('message', function incoming(data) {
    // Parse printer IP and port from the first message
    if (!tcpClient) {
      try {
        // Extract connection info from first message
        const connectionInfo = JSON.parse(data.toString());
        if (connectionInfo.type === 'connect' && connectionInfo.ip && connectionInfo.port) {
          connectToPrinter(connectionInfo.ip, parseInt(connectionInfo.port, 10));
          return;
        }
      } catch (e) {
        // Not a connection message, proceed to send data
      }
    }
    
    // Forward data to TCP printer if connected
    if (tcpClient && tcpClient.writable) {
      tcpClient.write(data);
      console.log(`Data forwarded to printer: ${data.length} bytes`);
    } else {
      console.error('Cannot forward data: TCP client not connected');
      ws.send(JSON.stringify({ status: 'error', message: 'Printer not connected' }));
    }
  });
  
  ws.on('close', function() {
    console.log('WebSocket connection closed');
    if (tcpClient) {
      tcpClient.end();
      tcpClient = null;
    }
  });
  
  function connectToPrinter(ip, port) {
    console.log(`Connecting to printer at ${ip}:${port}`);
    
    tcpClient = new net.Socket();
    
    tcpClient.connect(port, ip, function() {
      console.log(`Connected to printer at ${ip}:${port}`);
      ws.send(JSON.stringify({ status: 'connected' }));
    });
    
    tcpClient.on('data', function(data) {
      // Forward any data from printer back to browser
      ws.send(data);
    });
    
    tcpClient.on('close', function() {
      console.log('Printer connection closed');
      ws.send(JSON.stringify({ status: 'disconnected' }));
      tcpClient = null;
    });
    
    tcpClient.on('error', function(err) {
      console.error('TCP connection error:', err.message);
      ws.send(JSON.stringify({ status: 'error', message: err.message }));
      tcpClient = null;
    });
  }
});