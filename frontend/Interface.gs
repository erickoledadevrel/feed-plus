/**
 * Gets an HTML preview for a feed.
 * @param {string} type The type of feed, either "user" or "query".
 * @param {string} intput The feed's input, either the user ID or search terms.
 * @param {number} numResults The number of items to include in the preview.
 * @returns {Object} An object with the properties "title" and "items", where
 *     items is an array of HTML snippets.
 * @throws If the input is invalid or the feed couldn't be previewed.
 */
function getPreview(type, input, numResults) {
  input = validateInput_(type, input);
  var activities = null;
  if (type == 'user') {
    try {
      activities = FeedServer.getActivitiesByUser(input);
    } catch (e) {
      logError_(e, 'getPreview', arguments);
      throw 'Invalid profile ID or URL.';
    }
  } else if (type == 'query') {
    try {
      activities = FeedServer.getActivitiesByQuery(input);
    } catch (e) {
      logError_(e, 'getPreview', arguments);
      throw 'Invalid search query.';
    }
  } else {
    throw 'Unknown feed type: ' + type;
  }
  var items = _.map(activities.items, function(item) {
    try {
      return FeedServer.getContentFromItem(item, {disableEmbed: true});
    } catch (e) {
      return 'Error generating preview.';
    }
  });
  return {
    title: activities.title,
    items: items.slice(0, numResults)
  };
}

/**
 * Add a feed to the user's library.
 * @param {string} type The type of feed, either "user" or "query".
 * @param {string} intput The feed's input, either the user ID or search terms.
 * @param {string} name The name of the feed.
 * @returns {string} The URL of the new feed.
 * @throws If the input is invalid or the feed couldn't be added.
 */
function addFeed(type, input, name) {
  var userId = Session.getActiveUser().getUserLoginId();
  input = validateInput_(type, input);
  var feedId = FeedServer.addFeed(userId, type, input, name);
  return getFeedUrl_(feedId);
}

/**
 * Deletes a feed from the user's library.
 * @param {string} feedId The ID of the feed to delete.
 * @throws If the feed could not be found, doesn't belong to the user, or couldn't be deleted.
 */
function deleteFeed(feedId) {
  var userId = Session.getActiveUser().getUserLoginId();
  FeedServer.deleteFeed(userId, feedId);
}

/**
 * Returns information about the feeds a user has in their library.
 * @returns {Object} A map with the keys "id", "created", "type", "input", and "url".
 */
function getFeeds() {
  var userId = Session.getActiveUser().getUserLoginId();
  var feeds = FeedServer.getFeeds(userId);
  return _.map(feeds, function(feed) {
    return {
      id: feed.getId(),
      created: feed.created,
      type: feed.type,
      input: feed.input,
      name: feed.name,
      url: getFeedUrl_(feed.getId())
    };
  });
}

/**
 * Gets the URL for a given feed ID.
 * @param {string} feedId The ID of the feed.
 * @returns {string} The URL of the feed.
 * @private
 */
function getFeedUrl_(feedId) {
  var serverUrl = FeedServer.getUrl();
  return _.sprintf('%s?feedId=%s', serverUrl, encodeURIComponent(feedId));
}

/**
 * Lightly validates the feed's input, making sure the input isn't way off.
 * @param {string} type The type of feed, either "user" or "query".
 * @param {string} intput The feed's input, either the user ID or search terms.
 * @return {string} The validated input.
 * @throws If the input is invalid.
 * @private
 */
function validateInput_(type, input) {
  if (type == 'user') {
    // Get profile ID from URL.
    var profileUrlRegex = new RegExp('https://plus.google.com/(?:u/\\d+/)?(\\d+|\\+[^/]+)(?:$|/.*)');
    var matches = input.match(profileUrlRegex);
    if (matches) {
      input = matches[1];
    }
    if (!input.match(/\d+|\+[a-zA-Z0-9]/)) {
      throw 'Invalid profile ID or URL.';
    }
  }
  return input;
}

/**
 * Gets the total number of feeds.
 * @returns {Number} The number of feeds.
 */
function getNumFeeds() {
  return FeedServer.getNumFeeds();
}
