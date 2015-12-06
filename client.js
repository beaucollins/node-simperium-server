import Simperium from 'simperium'

window.Simperium = Simperium

const client = window.client = new Simperium( 'app-id', 'token', {
	url: 'ws://' + location.host
} );

window.notes = client.bucket( 'note' )
