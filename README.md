# Simperium Syncing Server

Stores all syncing operations in memory.

There is no auth. Any token is accepted and data will be partitioned under that token.

## Running

Too boot the server:

`npm start`

Then connect with a simperium client to `ws://localhost:5331/`