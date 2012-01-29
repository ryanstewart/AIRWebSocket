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
	
	
	socket.addEventListener( air.ServerSocketConnectEvent.CONNECT, function( evt ) {
		
		var client = evt.socket;
		
		client.addEventListener( air.ProgressEvent.SOCKET_DATA, function( evt ) {
			var available = evt.target.bytesAvailable;
			var bits = null;
			var buffer = null;
			var bytes = new air.ByteArray();
			var file = air.File.desktopDirectory.resolvePath( 'headers.bin' );
			var fileafterunmask = air.File.desktopDirectory.resolvePath( 'aftermask.bin' );
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
			air.trace('start: ' + start );
		
			// HTTP GET means opening a socket
			if( start == 71 )
			{
				bytes.position = 0;
				response = handshake( bytes );
				
				air.trace('response: ' + response );
				
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

						for( var c = 0; c < connections.length; c++ )
						{

								connections[c].writeByte( 129 );
								connections[c].writeByte( message.length );
								connections[c].writeUTFBytes( message );
								connections[c].flush();
						}

						break;
						
					case BINARY_FRAME:
							air.trace( 'Binary message' );
								
							air.trace('bytelength: ' + bytes.length);

							// This was really helpful.
							// http://stackoverflow.com/questions/8125507/how-can-i-send-and-receive-websocket-messages-on-the-server-side

							
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
							buffer = new air.ByteArray();

							// buffer = new Array();

							air.trace('position: ' + bytes.position);

							for( var d = bytes.position; d < bytes.length; d++ )
							{
								buffer[d] = bytes.readUnsignedByte();
							}
							


							air.trace( 'Payload: ' + buffer.length );

							// Unmask
							for( var i = 0; i < buffer.length; i++ ) 
							{
								buffer[i] ^= mask[i % 4];
							}


	    					// var message = btoa(buffer);
	    					// var tostringmessage = buffer.toString();

	    					// air.trace('messagelength: ' + message.length);
	    					// air.trace('tostringmessage: ' + tostringmessage);

							buffer.position = 0;
							stream.open( fileafterunmask, air.FileMode.WRITE );
							stream.writeBytes( buffer, 0, buffer.length );
							stream.close();
							buffer.position = 0;


							// TODO: Make this more robust, right now it's hardcoded at 126.
							// 	I need to also support 127 and what I think will be writeInt()

							for( var c = 0; c < connections.length; c++ )
							{							
								connections[c].writeByte(130);
								connections[c].writeByte(126);
								connections[c].writeShort(buffer.length);
								connections[c].writeBytes( buffer );
								connections[c].flush();
								// connections[c].writeByte(130);
								// connections[c].writeDouble(buffer.length);
								// connections[c].writeBytes( buffer );
								// connections[c].flush();
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