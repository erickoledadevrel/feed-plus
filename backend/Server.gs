// The maximum amount of time that raw feed data should be cached for.
var CACHE_TIME_MINUTES = 60;

var CACHE_TIME_SETTINGS_MINUTES = 360;

// The maximum size of an item that can be stored in the cache (100KB).
var MAX_CACHE_ITEM_SIZE = 100 * 1024;

// Loads the Underscore.js library server side.
var _ = Underscore.load();

/**
 * Serves a feed in response to an HTTP GET reqeust. The following query parameters are supported:
 * - feedId (required): The ID of the feed to retrieve.
 * - mimeType: The mime-type to return the feed with, either "atom" or "xml".
 * - disableCache: To disable the caching of feeds, for testing.
 * @param {Object} event The event object, which contains parameter values, etc.
 * @returns {TextOutput} The ATOM feed.
 */
function doGet(event) {
  // Load parameters.
  var queryString = event.queryString;
  var feedId = event.parameter.feedId;
  var mimeType = event.parameter.mimeType == 'xml' ? ContentService.MimeType.XML : ContentService.MimeType.ATOM;
  var disableCache = event.parameter.disableCache;

  // Ensure the feed ID is valid.
  if (!feedId) {
    throw "The query parameter 'feedId' is required.";
  }

  var xmlString = null;

  // Check the cache.
  if (!disableCache) {
    var cache = CacheService.getPublicCache();
    xmlString = cache.get(feedId);
  }

  if (!xmlString) {
    // Load the feed.
    var feed = getFeedSettings(feedId);
    if (!feed) {
      throw "Invalid feed ID: " + feedId;
    }

    // Get Google+ activities.
    var activities = null;
    var googlePlusUrl = null;
    if (feed.type == 'user') {
      activities = getActivitiesByUser(feed.input);
      googlePlusUrl = 'https://plus.google.com/u/0/' + encodeURIComponent(feed.input);
    } else if (feed.type == 'query') {
      activities = getActivitiesByQuery(feed.input);
      googlePlusUrl = 'https://plus.google.com/u/0/s/' + encodeURIComponent(feed.input);
    } else {
      throw 'Unknown feed type: ' + feed.type;
    }

    // Convert to atom feed.
    var selfUrl = ScriptProperties.getProperty('self.url') + '?' + queryString;
    var atom = convertActivitiesToAtom_(activities, selfUrl, feed.name, googlePlusUrl);
    var xmlString = Xml.parseJS(atom).toXmlString();

    // Store in the cache.
    if (!disableCache && (xmlString.length < MAX_CACHE_ITEM_SIZE)) {
      var cache = CacheService.getPublicCache();
      cache.put(feedId, xmlString, CACHE_TIME_MINUTES * 60);
    }
  }

  // Return feed.
  return ContentService.createTextOutput(xmlString).setMimeType(mimeType);
}

function getFeedSettings(feedId) {
  var cache = CacheService.getPublicCache();
  var key = feedId + '-settings';
  var entry = cache.get(key);
  if (entry) {
    return JSON.parse(entry);
  } else {
    var db = getDb_();
    var feed = db.load(feedId);
    if (!feed) {
      var results = db.query({
        id: feedId
      });
      if (results.hasNext()) {
        feed = results.next();
      }
    }
    if (!feed) {
      feed = null;
    }
    cache.put(key, JSON.stringify(feed), CACHE_TIME_SETTINGS_MINUTES * 60);
    return feed;
  }
}

/**
 * Gets the Google+ activities for a user.
 * @param {string} userId The ID of the user.
 * @returns {Object} The activities feed.
 */
function getActivitiesByUser(userId) {
  var urlFormat = 'https://www.googleapis.com/plus/v1/people/%s/activities/public?key=%s';
  var apiKey = getStaticScriptProperty_('api.key');
  var url = _.sprintf(urlFormat, encodeURIComponent(userId), encodeURIComponent(apiKey));
  return getActivities_(url);
}

/**
 * Gets the Google+ activities for a search query.
 * @param {string} query The search query.
 * @returns {Object} The activities feed.
 */
function getActivitiesByQuery(query) {
  var urlFormat = 'https://www.googleapis.com/plus/v1/activities?key=%s&query=%s&maxResults=20';
  var apiKey = getStaticScriptProperty_('api.key');
  var url = _.sprintf(urlFormat, encodeURIComponent(apiKey), encodeURIComponent(query));
  return getActivities_(url);
}

/**
 * Gets the Google+ activities using the given Google+ API URL.
 * @param {string} url The Google+ API URL.
 * @returns {Object} The activities feed.
 */
function getActivities_(url) {
  var response = UrlFetchApp.fetch(url);
  var result = JSON.parse(response.getContentText());
  return result;
}

/**
 * Converts an activities feed to an ATOM feed.
 * @param {Object} activities The activities feed.
 * @param {string} selfUrl The URL this feed is being served from.
 * @param {string} name The name of the feed.
 * @param {string} googlePlusUrl The Google+ URL that corresponds to the feed.
 * @returns {Array} A shorthand XML Array of the ATOM feed.
 */
function convertActivitiesToAtom_(activities, selfUrl, name, googlePlusUrl) {
  var feed = ['feed', {
    xmlns: 'http://www.w3.org/2005/Atom'
  }];
  feed.push(['title', name]);
  feed.push(['link', {
    rel: 'self',
    type: 'application/atom+xml',
    href: selfUrl
  }]);
  feed.push(['link', {
    href: googlePlusUrl
  }]);
  feed.push(['updated', activities.updated]);
  feed.push(['id', activities.selfLink]);

  _.each(activities.items, function(item) {
    var entry = ['entry'];
    entry.push(['id', item.url]);

    var title = item.title;
    if (!title) {
      _.each(item.object.attachments, function(attachment) {
        if (attachment.displayName) {
          title = attachment.displayName;
        }
      });
    }
    entry.push(['title', title, {
      'type': 'text'
    }]);

    var author = ['author'];
    author.push(['name', item.actor.displayName]);
    author.push(['uri', item.actor.url]);
    entry.push(author);

    entry.push(['link', {
      rel: 'alternate',
      type: 'text/html',
      href: item.url,
    }]);
    entry.push(['published', item.published]);
    entry.push(['updated', item.updated]);
    try {
      entry.push(['summary', getContentFromItem(item), {
        type: 'html'
      }]);
    } catch (e) {
      entry.push(['summary', 'Error generating HTML content.']);
    }
    feed.push(entry);
  });
  return feed;
}

/**
 * Gets the HTML content for an activity item.
 * @param {Object} item The item to render.
 * @param {Object} opt_options An optional map of options to use when rendering.
 * @returns {string} The rendered content.
 */
function getContentFromItem(item, opt_options) {
  var options = opt_options || {};
  item.object.attachmentsMap = {};
  item.object.attachmentsMultiMap = {};
  _.each(item.object.attachments, function(attachment) {
    if (!item.object.attachmentsMap[attachment.objectType]) {
      item.object.attachmentsMap[attachment.objectType] = attachment;
    }
    if (!item.object.attachmentsMultiMap[attachment.objectType]) {
      item.object.attachmentsMultiMap[attachment.objectType] = [];
    }
    item.object.attachmentsMultiMap[attachment.objectType].push(attachment);
  });
  try {
    return renderTemplate_('Item', {
      'item': item,
      'options': options
    });
  } catch (e) {
    logError_(e, 'getContentFromItem', arguments);
    throw 'Unable to get content for feed item.';
  }
}

/**
 * Renders a template using the parameters provided.
 * @param {string} name The name of the template.
 * @param {Object.<string, ?>} params A map of parameters to provide to the template.
 * @returns {string} The rendered HTML.
*/
function renderTemplate_(name, params) {
  var template = HtmlService.createTemplateFromFile(name);
  _.each(params, function(value, key) {
    template[key] = value;
  });
  return template.evaluate().getContent();
}

/**
 * Logs an error to a persistent store for later analysis.
 * @param {string} error The error message.
 * @param {string} opt_functionName The name of the function that encountered the error.
 * @param {Array} opt_args The arguments to the function.
 */
function logError_(error, opt_functionName, opt_args) {
  var spreadsheetId = getStaticScriptProperty_('error.log.spreadsheet.id');
  var spreadsheetName = getStaticScriptProperty_('error.log.sheet.name');
  var functionName = opt_functionName ? opt_functionName : null;
  var args = opt_args ? Array.prototype.slice.call(opt_args) : [];
  for (var i = 0; i < args.length; i++) {
    if (args[i] instanceof Object) {
      args[i] = JSON.stringify(args[i]);
    }
  }
  try {
    SpreadsheetApp.openById(spreadsheetId).getSheetByName(spreadsheetName).appendRow([
      new Date(),
      error,
      functionName,
      args.join(', ')
    ]);
  } catch (e) {
    // Do nothing.
  }
}

/**
 * Gets a static script property, using long term caching.
 * @param {string} key The property key.
 * @returns {string} The property value.
 */
function getStaticScriptProperty_(key) {
  var value = CacheService.getPublicCache().get(key);
  if (!value) {
    value = ScriptProperties.getProperty(key);
    CacheService.getPublicCache().put(key, value, 21600);
  }
  return value;
}

function getDb_() {
  var applicationId = getStaticScriptProperty_('parse.application_id'),
      restApiKey = getStaticScriptProperty_('parse.rest_api_key');
  return ParseDb.getMyDb(applicationId, restApiKey, 'feed');
}
