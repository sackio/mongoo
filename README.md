# mongoo

A collection of essential plugins and utilities for working with [MongoDB](http://mongodb.org) and [Mongoose](http://mongoosejs.com/).

## Getting Started
Install the module with: `npm install mongoo`

```javascript
var mongoo = require('mongoo');
```

## Documentation
Currently includes the following plugins:

* **encrypt_path** - create a path encrypted on save
* **confirm_path** - create a path that requires a matching virtual confirmation path before being set
* **timestamps** - add created and updated timestamps to a model
* **path_token** - require an expiring token to update a path (i.e. password reset)
* **start_end** - add validator to ensure one date path does not follow another
* **min_max** - add validator to ensure one numeric path is lte another
* **require_together** - add validator to require several paths to be set, if any of them are set
* **set_predicate** - expands on Mongoose's array operators, providing atomic array operations using iterators
* **set_save** - update path(s) and save with all validations
* **url_path** - validate that a path is a valid URL
* **email_path** - validate that a path is a valid email
* **phone_path** - validate that a path is a valid phone number
* **location_path** - combines with [locup](https://github.com/sackio/locup) to create a geolocation. Path includes geocoding and reverse geocoding methods to populate coordinate and human-readable location information
* **file_path** - combines with [fstk](https://github.com/sackio/fstk) to represent system files as Mongoose paths. Paths acquire helpful methods for file manipulation, while including middelware to keep the target file in sync with Mongoose.
* **solr** - combines with [solrdex](https://github.com/sackio/solrdex) to add blazing-fast and powerful Solr full-text searching to any Mongoose model.
* **schedule** - represents a chronological schedule and all the fun validations that entails (still in progress)
* **access_control** - combines with [rol](https://github.com/sackio/rol) to provide powerful access control and scoping for models and their documents -- drop this in to create an instant API
* **payment** - combines with [pa1d](https://github.com/sackio/pa1d) to provide payment processing in Mongoose. Create payment accounts and store payment methods using common payment gateways, then perform transactions, keeping records in Mongo.

Utilities include:

* **clearModels** - remove all documents from MongoDB, without changing the schema

More to come, along with usage documentation. For now, review the test suite for usage. 

## License
Copyright (c) 2014 Ben Sack
Licensed under the MIT license.
