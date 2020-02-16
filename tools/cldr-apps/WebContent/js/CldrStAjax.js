'use strict';

/*
 * Use an IIFE module pattern to create a namespace for the public functions,
 * and to hide everything else, minimizing global scope pollution.
 */
const cldrStAjax = (function() {

	const ST_AJAX_DEBUG = true;

	const ST_AJAX_MODERNIZE = true;

	/**
	 * Queue of XHR requests waiting to go out
	 */
	var queueOfXhr = [];

	/**
	 * The current timeout for processing XHRs
	 * (Returned by setTimer: a number, representing the ID value of the timer that is set.
	 * Use this value with the clearTimeout() method to cancel the timer.)
	 */
	var queueOfXhrTimeout = null;

	/**
	 * Queue the XHR request. It will be a GET *unless* either postData or content are set.
	 *
	 * @param xhr the object, generally like:
	 * {
	 *   url: url,
	 *   handleAs: "json",
	 *   load: loadHandler,
	 *   error: errorHandler,
	 *   postData: postData, (or sometimes "content" instead of "postData")
	 *   content: ourContent,
	 *   timeout: ajaxTimeout,
	 *   headers: headers, (rarely used, but in loadOrFail it's {"Content-Type": "text/plain"})
	 * }
	 */
	function queueXhr(xhr) {
		queueOfXhr.push(xhr);
		if (ST_AJAX_DEBUG) {
			console.log("pushed: PXQ=" + queueOfXhr.length + ", postData: " + xhr.postData);			
		}
		if (!queueOfXhrTimeout) {
			queueOfXhrTimeout = setTimeout(processXhrQueue, xhrQueueTimeout);
		}
	}

	function clearXhr() {
		queueOfXhr = []; // clear queue
		clearTimeout(queueOfXhrTimeout);
		queueOfXhrTimeout = null;
	}

	function processXhrQueue() {
		/*
		 * TODO: getter/setter for global variable "disconnected" in survey.js 
		 */
		if (disconnected) {
			return;
		}
		if (!queueOfXhr || queueOfXhr.length == 0) {
			queueOfXhr = [];
			if (ST_AJAX_DEBUG) {
				console.log("PXQ: 0");
			}
			queueOfXhrTimeout = null;
			return; // nothing to do, reset.
		}

		var top = queueOfXhr.shift();

		top.load2 = top.load;
		
		/*
		 * Note: old code in survey.js had "top.err" (bug?), changed here to "top.error".
		 * dojo.xhrGet looks for "error" in the object passed as an argument to it.
		 * The callers of queueXhr all set "error" (or omit it, but never set "err")
		 *
		 * Reference: https://unicode-org.atlassian.net/browse/CLDR-13588
		 */
		top.err2 = top.error;

		/*
		 * The two parameters for myLoad0 and myErr0 ("top", "args") are very different from
		 * the parameters dojo sends to top.load and top.err.
		 *
		 * Here, "top" is the original request-parameters object we send to dojo (typically
		 * named "xhrArgs" in dojo documentation). We also send it as the first parameter to
		 * myLoad0 and myErr0.
		 *
		 * For the actual handler functions like we've now assigned to "top.load2" and "top.err2",
		 * the first parameter is the data, typically json. A typical cldr-apps loadHandler has only
		 * one parameter, for the data. A typical cldr-apps errorHandler has two parameters: "err" =
		 * the error object (with err.name and err.message), and "ioargs", a.k.a. "ioArgs", which
		 * is only ever used for ioArgs.xhr.responseText.
		 *
		 * "A second parameter is always passed to the ‘load’, ‘error’, and ‘handle’ functions.
		 * This parameter is the ‘ioargs’ parameter. It contains a lot of detail about the xhr
		 * request, including a reference to the actual native xhr object."
		 * https://dojotoolkit.org/reference-guide/1.10/dojo/xhrGet.html
		 *
		 * NOTE: changed to use rest parameters (...args) instead of "arguments" here.
		 * "A function's last parameter can be prefixed with ... which will cause all remaining
		 * (user supplied) arguments to be placed within a "standard" Javascript array."
		 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/rest_parameters
		 * "arguments" is a keyword in JavaScript, but best avoided:
		 * "arguments is an Array-like object accessible inside functions that contains the values
		 * of the arguments passed to that function... useful for functions called with more arguments
		 * than they are formally declared to accept. ... rest parameters should be preferred."
		 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/arguments
		 */
		top.load = function(...args) {
			myLoad0(top, args);
		};
		top.error = function(...args) {
			myErr0(top, args);
		};
		top.startTime = new Date().getTime();

		if (ST_AJAX_MODERNIZE) {
			/*
			 * Newer way
			 * https://dojotoolkit.org/reference-guide/1.10/dojo/request.html#dojo-request
			 */
			require(["dojo/request"], function(request) {
				let options = {};
				if (top.handleAs)
					options.handleAs = top.handleAs;
				}
				if (top.postData || top.content) {
					options.method = 'POST';
					options.data = top.postData ? top.postData : top.content;
				}
				request(top.url, options).then(function(data) {
					top.load(data);
				}, function(err) {
					top.error(err);
				}, function(evt) {
					// handle a progress event
				});
			});
		} else {
			/*
			 * Old, deprecated way
			 * https://dojotoolkit.org/reference-guide/1.10/dojo/xhrGet.html
			 */
			if (top.postData || top.content) {
				if (ST_AJAX_DEBUG) {
					console.log("PXQ(" + queueOfXhr.length + "): dispatch POST " + top.url);
				}
				dojo.xhrPost(top);
			} else {
				if (ST_AJAX_DEBUG) {
					console.log("PXQ(" + queueOfXhr.length + "): dispatch GET " + top.url);
				}
				dojo.xhrGet(top);
			}
		}
	}

	/**
	 * xhrQueueTimeout is a constant, 3 milliseconds, used only by
	 * myLoad0, myErr0, and queueXhr, in calls to setTimeout for processXhrQueue.
	 * TODO: explain, why 3 milliseconds?
	 */
	const xhrQueueTimeout = 3;

	/**
	 * Run the load handler (load2) and schedule the next request
	 *
	 * @param top the dojo request parameters plus such things as top.load2
	 * @param args an Array-like object = "arguments" (keyword) of caller, from dojo;
	 * 			args[0] = data (often json)
	 * 			args[1] = ioargs (ignored by typical loadHander) -- none if ST_AJAX_MODERNIZE
	 */
	function myLoad0(top, args) {
		if (ST_AJAX_DEBUG) {
			top.stopTime = new Date().getTime();
			top.tookTime = top.stopTime - top.startTime;
			console.log("PXQ(" + queueOfXhr.length + "): time took= " + top.tookTime);
			console.log("myLoad0!:" + top.url + " - a=" + args.length + " " + args.toString());
		}
		let data = args[0];
		top.load2(data);
		queueOfXhrTimeout = setTimeout(processXhrQueue, xhrQueueTimeout);
	}

	/**
	 * Run the error handler (err2) and schedule the next request
	 *
	 * @param top the dojo request parameters plus such things as top.err2
	 * @param args an Array-like object = "arguments" of caller, from dojo;
	 * 			args[0] = err = error message
	 * 			args[1] = ioargs see https://dojotoolkit.org/reference-guide/1.10/dojo/xhrGet.html
	 *             -- but no args[1] if ST_AJAX_MODERNIZE
	 */
	function myErr0(top, args) {
		if (ST_AJAX_DEBUG) {
			console.log("myErr0!:" + top.url + " - a=" + args.toString());
		}
		let err = args[0];
		/*
		 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error
		 * Standard properties
		 * 	Error.prototype.message
		 * 	Error.prototype.name
		 * Some ST errorHandler functions do access err.name (e.g., "RequestError") and/or err.message.
		 * This appears to work OK both for ST_AJAX_MODERNIZE and !ST_AJAX_MODERNIZE.
		 *
		 * err.response seems to be a dojo thing, not defined by JavaScript itself.
		 */
		if (ST_AJAX_MODERNIZE) {
			let responseText = (err && err.response && err.response.text) ? err.response.text : '';
			/*
			 * TODO: rename from ioArgs to responseText in all errorHandler functions
			 * Or, possibly just one arg "err" and let errorHandler get err.response.text
			 */
			top.err2(err, responseText);
		} else {
			let ioargs = args[1];
			let responseText = ioargs.xhr.responseText;
			top.err2.call(err, responseText);
		}
		queueOfXhrTimeout = setTimeout(processXhrQueue, xhrQueueTimeout);
	}

	/*
	 * Make only these functions accessible from other files:
	 */
	return { queueXhr: queueXhr, clearXhr: clearXhr };
})();
