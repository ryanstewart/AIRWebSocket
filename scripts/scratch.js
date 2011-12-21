			if( start == 0x00 )
			{
				command = bytes.readUTFBytes( available - 2 );
				
				switch( command )
				{
					case 'START':
						if( interval == null )
						{
							interval = setInterval( function() {
								var value = Math.round( Math.random() * maximum );
								
								$( 'body' ).append( 'Sending: ' + value + '<br/>' );
								
								for( var c = 0; c < connections.length; c++ )
								{
									connections[c].writeByte( 0x00 );
									connections[c].writeUTFBytes( value );
									connections[c].writeByte( 0xFF );
								}
							}, rate );
						} else {
							evt.currentTarget.writeByte( 0x00 );							
							evt.currentTarget.writeUTFBytes( 'Already started...' );	
							evt.currentTarget.writeByte( 0xFF );						
						}
						
						break;
						
					case 'STOP':
						if( interval == null )
						{
							evt.currentTarget.writeByte( 0x00 );							
							evt.currentTarget.writeUTFBytes( 'Not running...' );
							evt.currentTarget.writeByte( 0xFF );
						} else {
							clearInterval( interval );
							interval = null;													
						}						

						break;	

					case 'STATUS':
						evt.currentTarget.writeByte( 0x00 );											
						
						if( interval == null )
						{	
							evt.currentTarget.writeUTFBytes( 'Not running...' );
						} else {
							evt.currentTarget.writeUTFBytes( 'Already started...' );
						}
						
						evt.currentTarget.writeByte( 0xFF );				
						break;

				}
			} else if( start == 136 ) {
				air.trace( 'Closing' );
				
				for( var c = 0; c < connections.length; c++ )
				{
					if( connections[c] == evt.currentTarget )
					{
						connections.splice( c, 1 );
						break;
					}
				}	
				
				evt.currentTarget.close();
				air.trace( 'Closed' );											
			} else {
				bytes.position = 0;
				response = handshake( bytes );
				
				air.trace( response );
				
				var output = 
					'HTTP/1.1 101 Switching Protocols\r\n' +
					'Upgrade: websocket\r\n' +					
					'Connection: Upgrade\r\n' +
					'Sec-WebSocket-Accept: ' + response + '\r\n' +
					'\r\n';
				
				air.trace( output );
				evt.currentTarget.writeUTFBytes( output );	
				evt.currentTarget.flush();		
			}	
			