$( document ).ready( function() {
	
	var socket = null;
	var data = new Array();

	for( var d = 0; d < 50; d++ )
	{
		data.push( 0 );	
	}

	$( '#conn' ).click( function( evt ) {
		if( socket == null )
		{
			socket = new WebSocket( 'ws://127.0.0.1:4000' );
	
			socket.onopen = function() {
				alert( 'Open' );
				$( '#conn' ).html( 'Close Connection' );
			};
			
			socket.onmessage = function( evt ) {
				console.log( 'Data: ' + evt.data );
				console.log( parseInt( evt.data ) );
				
				data.splice( 0, 1 );
				data.push( parseInt( evt.data ) );

				RGraph.Clear( document.getElementById( 'graph' ) );				
				
				line = new RGraph.Line( 'graph', data );
				line.Set( 'chart.background.grid.color', 'rgba( 238, 238, 238, 1 )' );
				line.Set( 'chart.colors', ['rgba( 51, 102, 255, 1 )'] );
				line.Set( 'chart.linewidth', 1 );
				line.Set( 'chart.filled', true );
				line.Set( 'chart.ylabels', false );
				line.Set( 'chart.gutter', 0 );
				line.Set( 'chart.noaxes', true );	
				line.Set( 'chart.background.grid.autofit', true );
				line.Set( 'chart.tickmarks', 'circle' );
				line.Set( 'chart.filled', 'true' );
				line.Set( 'chart.fillstyle', 'rgba( 51, 102, 255, 0.40 )' );
				line.Set( 'chart.ymax', 100 );
				line.Draw();					
			};
				
			socket.onclose = function() {
				alert( 'Closed' );
				$( '#conn' ).html( 'Open Connection' );
				socket = null;				
			};			
		} else {
			socket.close();
		}
	} );
	
	$( '#control' ).click( function( evt ) {
		if( socket == null )
		{
			return;	
		}
		
		if( $( this ).html() == 'Start Feed' )
		{
			socket.send( 'START' );
			$( this ).html( 'Stop Feed' );			
		} else {
			socket.send( 'STOP' );
			$( this ).html( 'Start Feed' );						
		}
	} );	
	
} );