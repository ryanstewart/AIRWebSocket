var CONTINUATION = '0000';
var TEXT_FRAME = '0001';
var BINARY_FRAME = '0010';
var CONNECTION_CLOSE = '1000';
var PING = '1001';
var PONG = '1010';

$( document ).ready( function() {
	
	var connections = new Array();
	var socket = new air.ServerSocket();	
	var config = null;
	var clients = null;
	var numbers = null;
	var last = null;
	var states = new Array();
	
	numbers = setInterval( function() {
		last = Math.floor( Math.random() * 99 );
	}, 50 );
	
	clients = setInterval( function() {
		for( var c = 0; c < connections.length; c++ )
		{
			if( states[c].state == 'START' )
			{
								// '1000 0001 0000 0011 100'
				message = last.toString();

				connections[c].writeByte( 129 );
				connections[c].writeByte( message.length );
				connections[c].writeUTFBytes( message );
				connections[c].flush();
			}
		}
	}, 50 );
	
	socket.addEventListener( air.ServerSocketConnectEvent.CONNECT, function( evt ) {
		
		var client = evt.socket;
		
		client.addEventListener( air.ProgressEvent.SOCKET_DATA, function( evt ) {
			var available = evt.target.bytesAvailable;
			var bits = null;
			var buffer = null;
			var bytes = new air.ByteArray();
			var file = air.File.desktopDirectory.resolvePath( 'headers.txt' );
			var mask = null;
			var message = null;
			var output = null;
			var response = null;
			var start = null;
			var stream = new air.FileStream();			
			
			// Read incoming bytes
			evt.currentTarget.readBytes( bytes, 0, available );
		
			// Persist bytes for debugging
			bytes.position = 0;
			stream.open( file, air.FileMode.WRITE );
			stream.writeBytes( bytes, 0, bytes.length );
			stream.close();
			bytes.position = 0;
			
			// Capture first byte
			start = bytes.readUnsignedByte();
			air.trace( start );
		
			// HTTP GET means opening a socket
			if( start == 71 )
			{
				bytes.position = 0;
				response = handshake( bytes );
				
				air.trace( response );
				
				output = 
					'HTTP/1.1 101 Switching Protocols\r\n' +
					'Upgrade: websocket\r\n' +					
					'Connection: Upgrade\r\n' +
					'Sec-WebSocket-Accept: ' + response + '\r\n' +
					'\r\n';
				
				air.trace( output );
				evt.currentTarget.writeUTFBytes( output );	
				evt.currentTarget.flush();						
			} else {
				air.trace( start.toString( 2 ).substr( 4, 4 ) );				
				
				// Determine action based on message frame
				switch( start.toString( 2 ).substr( 4, 4 ) )
				{
					case CONNECTION_CLOSE:
						air.trace( 'Connection close' );
	
						for( var c = 0; c < connections.length; c++ )
						{
							if( connections[c] == evt.currentTarget )
							{
								connections.splice( c, 1 );
								states.splice( c, 1 );
								break;
							}
						}	
						
						evt.currentTarget.close();											
						break;
					
					case TEXT_FRAME:
						air.trace( 'Text message' );
						
						// Message length
						available = bytes.readUnsignedByte();
						available = parseInt( available.toString( 2 ).substr( 1, 7 ), 2 );
						
						if( available == 126 ) {
							available = bytes.readUnsignedShort();	
						} else if( available == 127 ) {
							available = bytes.readDouble();
						}
						
						air.trace( 'Length: ' + available );						
						
						// Mask
						mask = new Array();
						mask[0] = bytes.readUnsignedByte();
						mask[1] = bytes.readUnsignedByte();
						mask[2] = bytes.readUnsignedByte();
						mask[3] = bytes.readUnsignedByte();
						
						// Payload
						buffer = new Array();
						
						for( var d = bytes.position; d < bytes.length; d++ )
						{
							buffer.push( bytes.readUnsignedByte() );
						}

						air.trace( 'Payload: ' + buffer.length );

						// Unmask
						message = new String();
						
  						for( var i = 0; i < buffer.length; i++ ) 
						{
      						buffer[i] ^= mask[i % 4];
							message = message + String.fromCharCode( buffer[i] );
    					}
						
						air.trace( 'Message: ' + message );						
						
						if( message == 'START' )
						{
							for( var c = 0; c < connections.length; c++ ) 
							{
								if( connections[c] == evt.currentTarget )
								{
									air.trace( 'Found start match' );
									states[c].state = 'START';
									break;
								}
							}
						} else if( message == 'STOP' ) {
							for( var c = 0; c < connections.length; c++ ) 
							{
								if( connections[c] == evt.currentTarget )
								{
									air.trace( 'Found stop match' );
									states[c].state = 'STOP';
									break;
								}
							}
						}

						break;
				}
			}
		} );	
		
		// Track client connections
		states.push( {
			client: connections.length,
			state: 'STOP'
		} );
		connections.push( client );
		air.trace( connections.length );
		
	} );
	
	// Configuration file
	config = air.File.applicationDirectory.resolvePath( 'configuration.xml' );
	
	// Load configuration
	$.ajax( {
		url: config.url,
		dataType: 'xml',
		success: function( data, status, xhr ) {
			var address = $( data ).find( 'address' ).text();
			var port = new Number( $( data ).find( 'port' ).text() );
			
			// Start listening on desired port and address
			socket.bind( port, address );
			socket.listen();
		
			// Display in application for information
			$( 'body' ).append( 'Local address: ' + socket.localAddress + '<br/>' );
			$( 'body' ).append( 'Local port: ' + socket.localPort + '<br/>' );			
		}
	} );

} );