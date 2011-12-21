function handshake( bytes )
{
	var joined = null;
	var header = null;
	var lines = null;	
	var parsed = null;	
	var result = {
		host: null,
		origin: null,
		key1: null,
		key2: null,
		hash: null,
		digits1: null,
		digits2: null,
		spaces1: 0,
		spaces2: 0,
		div1: 0,
		div2: 0,
		sum: null
	};
	var value = null;

	lines = bytes.readUTFBytes( bytes.length );
	lines = lines.split( '\r\n' );
				
	for( var h = 0; h < lines.length; h++ )
	{
		if( lines[h].indexOf( ':' ) >= 0 )
		{
			header = lines[h].substring( 0, lines[h].indexOf( ':' ) );
			value = lines[h].substring( header.length + 2, lines[h].length );
						
			switch( header )
			{
				case 'Origin':
					result.origin = value;
					break;
					
				case 'Host':
					result.host = value;
					break;	
					
				case 'Sec-WebSocket-Key1':
					result.key1 = value;
					break;
					
				case 'Sec-WebSocket-Key2':
					result.key2 = value;
					break;							
			}
		}
	}
				
	if( result.key1 != null )
	{
		// Test case as in specification
		// result.key1 = '18x 6]8vM;54 *(5:  {   U1]8  z [  8';
		// result.key2 = '1_ tx7X d  <  nw  334J702) 7]o}` 0';
		// result.hash = 'Tm[K T2u';
		
		bytes.position = bytes.length - 8;
		result.hash = bytes.readUTFBytes( 8 );
				
		parsed = getDigits( result.key1 );
		result.digits1 = parseInt( parsed.digits );
		result.spaces1 = parsed.spaces;
		result.div1 = result.digits1 / result.spaces1;
					
		parsed = getDigits( result.key2 );
		result.digits2 = parseInt( parsed.digits );
		result.spaces2 = parsed.spaces;
		result.div2 = result.digits2 / result.spaces2;		

		joined = new air.ByteArray();
		joined.writeUnsignedInt( result.div1 );
		joined.writeUnsignedInt( result.div2 );
		joined.writeUTFBytes( result.hash );
		joined.position = 0;

		result.sum = rstr_md5( joined.readUTFBytes( 16 ) );
	}
	
	return result;
}

function getDigits( value )
{	
	var result = {digits: '', spaces: 0};
	
	for( var d = 0; d < value.length; d++ )
	{
		if( value.charAt( d ) == ' ' )
		{
			result.spaces += 1;
		} else if( isDigit( value.charAt( d ) ) ) {
			result.digits += value.charAt( d );
		}
	}
	
	return result;
}

function isDigit( value )
{
	var result = false;
	
	switch( value )
	{
		case '0':	
		case '1':	
		case '2':	
		case '3':	
		case '4':	
		case '5':	
		case '6':	
		case '7':	
		case '8':	
		case '9':	
			result = true;
			break;
	}
	
	return result;
}

var MAX_DUMP_DEPTH = 10;

function dump( obj, name, indent, depth ) 
{
	if( depth > MAX_DUMP_DEPTH ) 
	{
		return indent + name + ': <Maximum Depth Reached>\n';
	}

	if( typeof obj == 'object' ) 
	{
		var child = null;
		var output = indent + name + '\n';

		indent += '\t';

		for( var item in obj )
		{
			try {
				child = obj[item];
			} catch( e ) {
				child = '<Unable to Evaluate>';
			}

			if ( typeof child == 'object' ) 
			{
				output += dump( child, item, indent, depth + 1 );
			} else {
				output += indent + item + ': ' + child + '\n';
			}
		}

		return output;
	} else {
		return obj;
	}
}