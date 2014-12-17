// Load the Underscore library server-side.
var _ = Underscore.load();

/**
 * Serves the user interface in response to an HTTP GET reqeust.
 * @param {Object} event The event object, which contains parameter values, etc.
 * @returns {HtmlOutput} The HTML output to display.
 */
function doGet(event) {
  var template = HtmlService.createTemplateFromFile('Index');
  return template.evaluate().setTitle('Feed+').setSandboxMode(HtmlService.SandboxMode.IFRAME);
}

/**
 * A helper function to include an HTML file, for use within HtmlTemplates.
 * @param {HtmlOutput} output The current output object.
 * @param {string} name The name of the HTML file, extension optional.
 * @private
 */
function includeFile_(output, name) {
  output.append(HtmlService.createTemplateFromFile(name).evaluate().getContent());
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
