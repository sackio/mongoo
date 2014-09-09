/*
 * mongoo
 * https://github.com/sackio/mongoo
 *
 * Copyright (c) 2014 Ben Sack
 * Licensed under the MIT license.
 */

'use strict';

module.exports = {

  'plugins': {
    'virtual_path': require('./plugins/virtual_path.js')
  , 'encrypt_path': require('./plugins/encrypt_path.js')
  , 'confirm_path': require('./plugins/confirm_path.js')
  , 'timestamps': require('./plugins/timestamps.js')
  , 'path_token': require('./plugins/path_token.js')
  , 'start_end': require('./plugins/start_end.js')
  , 'min_max': require('./plugins/min_max.js')
  , 'require_together': require('./plugins/require_together.js')
  , 'set_predicate': require('./plugins/set_predicate.js')
  , 'url_path': require('./plugins/url_path.js')
  , 'email_path': require('./plugins/email_path.js')
  , 'phone_path': require('./plugins/phone_path.js')
  , 'location_path': require('./plugins/location_path.js')
  }

, 'utils': new require('./utils.js')()

};

