import { EventEmitter } from 'events'
import { inherits } from 'util'
import { change_utils } from 'simperium/server'
import uuid from 'node-uuid'

export default function DataStore( dataDir ) {
	console.log( 'Reading data from: ' + dataDir )
	this.dataDir = dataDir
}

inherits( DataStore, EventEmitter )

DataStore.prototype.authorize = function( initParams, cb ) {
	const { token, app_id, name } = initParams

	if ( !app_id || app_id === '' ) {
		return cb( new Error( 'invaid app_id' ) )
	}

	if ( !token || token === '' ) {
		return cb( new Error( 'invalid token' ) )
	}

	if ( !name || name === '' ) {
		return cb( new Error( 'invalid bucket name' ) )
	}

	const hash = [ app_id, token, name ].join( '-' )
	const bucketStore = this.fetchStore( hash )
	cb( null, 'user@example.com', bucketStore.makeBucket( initParams ) )
}

DataStore.prototype.fetchStore = function( hash ) {
	if ( !this.stores ) {
		this.stores = {}
	}

	if ( !this.stores[hash] ) {
		this.stores[hash] = new BucketStore()
	}

	return this.stores[hash];
}

function Bucket( store, params ) {
	this.store = store
	this.params = params
	this.clientid = params.clientid
	this.queryIndex = store.queryIndex.bind( store, this )
	this.changesSince = store.changesSince.bind( store, this )
	this.applyChange = store.applyChange.bind( store, this )
	EventEmitter.call( this )
}

inherits( Bucket, EventEmitter )

function BucketStore() {
	// list of keys
	this.objects = []
	// objects stored by key with array of versions, current version number and data for each version
	this.index = {}
	// changes referenced by ccid
	this.changes = new ChangeLog();
}

BucketStore.prototype.makeBucket = function( initParams ) {
	const bucket = new Bucket( this, initParams )
	this.changes.on( 'change', bucket.emit.bind( bucket, 'change' ) )
	return bucket
}

BucketStore.prototype.queryIndex = function( bucket, mark, count, fn ) {
	var nextMark = null;

	count = parseInt( count );

	if ( isNaN( count ) ) {
		count = this.objects.length
	}

	mark = parseInt( mark );

	if ( isNaN( mark ) ) {
		mark = 0;
	}

	if ( mark + count < this.objects.length ) {
		nextMark = mark + count;
	}

	fn( this.changes.cv, nextMark, this.objects.slice( mark, mark + count ).map( ( id ) => {
		return this.index[id].current()
	} ) );
}

BucketStore.prototype.changesSince = function( bucket, cv, fn ) {
	// TODO: get the changes
	const changes = this.changes.changesSince( cv )
	if ( !changes ) {
		return fn( new Error( 'cv not known: ' + cv ) )
	}
	fn( null, changes )
}

BucketStore.prototype.applyChange = function( bucket, change, fn ) {
	const { o, id, ccid, v, sv } = change

	if ( !this.index[id] && o === '-' ) {
		// TODO: valid error codes
		return fn( new Error( '404' ) )
	}

	if ( !this.index[id] && ( !sv || sv === 0 ) ) {
		this.index[id] = new VersionedObject( id )
		this.objects.push( id )
	}

	try {
		this.index[id].applyChange( change )
	} catch ( e ) {
		return fn( e )
	}

	this.changes.log( {
		o, id, v, sv,
		cv: uuid.v4(),
		ev: this.index[id].version,
		ccids: [ccid],
		clientid: bucket.clientid
	} )
}

function VersionedObject( key ) {
	this.key = key
	this.version = 0
	this.versions = {0: {}}
}

VersionedObject.prototype.update = function( version, data ) {
	if ( version <= this.version ) {
		return false
	}
	this.version = version
	this.versions[version] = data
}

VersionedObject.prototype.get = function( version ) {
	if ( version === undefined ) {
		version = this.version;
	}
	return this.versions[this.version];
}

VersionedObject.prototype.applyChange = function( change ) {
	const { sv, v } = change
	if ( this.version !== ( sv || 0 ) ) {
		throw new Error( 'out of date sv' )
	}

	const next = change_utils.apply( v, this.get() )
	const nv = this.version + 1
	this.version = nv
	this.versions[nv] = next
}

VersionedObject.prototype.current = function() {
	return { id: this.key, v: this.version, d: this.get() }
}

function ChangeLog() {
	this.cv = uuid.v4()
	this.index = {}
	this.changes = []
	EventEmitter.call( this )
}

inherits( ChangeLog, EventEmitter )

ChangeLog.prototype.log = function( change ) {
	this.changes = [change.cv].concat( this.log )
	this.index[change.cv] = change
	this.cv = change.cv
	this.emit( 'change', change )
}

ChangeLog.prototype.changesSince = function( cv ) {
	var i
	var changes = []

	if ( !this.index[cv] ) {
		return null;
	}

	for ( i = 0; i < this.index.length; i++ ) {
		if ( cv === this.index[i] ) {
			break;
		}
		changes.unshift( this.changes[this.index[i]] )
	}
	return changes;
}
