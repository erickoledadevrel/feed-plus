/**
 * Adds a feed to the server.
 * @param {string} userId The ID of the user that this feed belongs to.
 * @param {string} type The type of feed.
 * @param {string} intput The feed input.
 * @param {string} name The name of the feed.
 * @returns {string} The new feed's ID.
 */
function addFeed(userId, type, input, name) {
  var now = new Date().getTime();
  var feed;
  try {
    feed = getDb_().save({
      type_: 'feed',
      user: userId,
      created: now,
      type: type,
      input: input,
      name: name
    });
  } catch (e) {
    logError_(e, 'addFeed', arguments);
    throw 'Unexpected error.';
  }
  return feed.getId();
}

/**
 * Deletes a feed from the server.
 * @param {string} userId The ID of the user that is deleting the feed.
 * @param {string} feedId The ID of the feed.
 * @throws If the feed cannot be found or is not owned by the user.
 */
function deleteFeed(userId, feedId) {
  var db = getDb_();
  var feed;
  try {
    feed = db.load(feedId);
  } catch (e) {
    logError_(e, 'deleteFeed');
    throw 'Unexpected error.';
  }
  if (!feed || feed.user != userId) {
    throw 'Feed not found.';
  }
  try {
    db.remove(feed);
  } catch (e) {
    logError_(e, 'deleteFeed', arguments);
    throw 'Unexpected error.';
  }
}

/**
 * Gets the feeds owned by a specific user.
 * @param {string} userId The ID of the user.
 * @returns {Array.<Object>} The feeds.
 */
function getFeeds(userId) {
  var db = getDb_();
  var feeds = [];
  try {
    var results = db.query({
      type_: 'feed',
      user: userId
    }).sortBy('created', db.DESCENDING).limit(100);
    while (results.hasNext()) {
      feeds.push(results.next());
    }
  } catch (e) {
    logError_(e, 'getFeeds', arguments);
    throw 'Unexpected error.';
  }
  return feeds;
}

/**
 * Gets the URL of the feed server.
 * @returns {string} The URL of the server.
 */
function getUrl() {
  return getStaticScriptProperty_('self.url');
}

/**
 * Gets the total number of feeds.
 * @returns {Number} The number of feeds.
 */
function getNumFeeds() {
  var db = getDb_();
  return db.query({
    type_: 'feed'
  }).getSize();
}
