import { server as WebSocketServer } from 'websocket'
import { Connection } from 'simperium/server'
import express from 'express'
import DataStore from './lib/datastore'
import path from 'path'

const datastore = new DataStore( path.resolve( path.join( __dirname, 'data' ) ) )

const server = express().use( express.static( './public' ) ).listen( process.env.PORT || 5331, () => {
	const { port, family, address } = server.address()
	console.log( 'Listening on %s %s:%s', family, address, port )
} )

const websocket = new WebSocketServer( {
	httpServer: server,
	autoAcceptConnections: false
} )

websocket.on( 'request', ( request ) => {
	console.log( 'received request', request.origin, request.requestedProtocols )
	const conn = request.accept( null, request.origin )
	const simperumConnection = new Connection()
	simperumConnection.authorizer = datastore.authorize.bind( datastore )

	conn.on( 'message', ( msg ) => {
		console.log( '<=', msg.utf8Data )
		simperumConnection.receive( msg.utf8Data )
	} )

	simperumConnection.on( 'send', ( msg ) => {
		console.log( '=>', msg )
		conn.send( msg )
	} )
} );
