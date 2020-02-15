'use strict';

dojo.require("dojo.string"); // shouldn't be needed...

/*
 * Use an IIFE module pattern to create a namespace for the public functions,
 * and to hide everything else, minimizing global scope pollution.
 */
const cldrStAjax = (function() {

	const ST_DEBUG_AJAX = true;

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
	 *   postData: postData,
	 *   headers: headers (rarely used, but in loadOrFail it's {"Content-Type": "text/plain"})
	 * }
	 */
	function queueXhr(xhr) {
		queueOfXhr.push(xhr);
		if (ST_DEBUG_AJAX) {
			console.log("pushed:  PXQ=" + queueOfXhr.length + ", postData: " + xhr.postData);			
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
			if (ST_DEBUG_AJAX) {
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
		 */
		top.err2 = top.error;
		top.load = function() { // why not simply top.load = myLoad0?
			/*
			 * "A second parameter is always passed to the ‘load’, ‘error’, and ‘handle’ functions.
			 * This parameter is the ‘ioargs’ parameter. It contains a lot of detail about the xhr request,
			 * including a reference to the actual native xhr object."
			 * https://dojotoolkit.org/reference-guide/1.10/dojo/xhrGet.html 
			 */
			myLoad0(top, ioargs);
		};
		top.error = function() { // why not simply top.error = myErr0?
			myErr0(top, ioargs);
		};
		top.startTime = new Date().getTime();

		if (true) {
			/*
			 * Old, deprecated way
			 */
            if (top.postData || top.content) {
            	if (ST_DEBUG_AJAX) {
            		console.log("PXQ(" + queueOfXhr.length + "): dispatch POST " + top.url);
            	}
            	dojo.xhrPost(top);
            } else {
            	if (ST_DEBUG_AJAX) {
            		console.log("PXQ(" + queueOfXhr.length + "): dispatch GET " + top.url);
            	}
            	dojo.xhrGet(top);
            }
		} else {
			/*
			 * Newer way
			 */
			if (top.postData || top.content) {
				top.method = 'POST';
			}
			require(["dojo/request"], function(request) {
				request(top.url).then(function(data) {
					top.load(data);
				}, function(err) {
					top.error(err);
				}, function(evt) {
				    // handle a progress event
				});
			});
		}
	}

	/**
	 * xhrQueueTimeout is a constant, 3 milliseconds, used only by
	 * myLoad0, myErr0, and queueXhr, in calls to setTimeout for processXhrQueue.
	 * TODO: explain, why 3 milliseconds?
	 */
	const xhrQueueTimeout = 3;

	function myLoad0(top, args) {
		if (ST_DEBUG_AJAX) {
			top.stopTime = new Date().getTime();
			top.tookTime = top.stopTime - top.startTime;
			console.log("PXQ(" + queueOfXhr.length + "): time took= " + top.tookTime);
			console.log("myLoad0!:" + top.url + " - a=" + args.length + " " + args.toString());
		}
		top.load2(args[0], args[1]);
		queueOfXhrTimeout = setTimeout(processXhrQueue, xhrQueueTimeout);
	}

	function myErr0(top, args) {
		if (ST_DEBUG_AJAX) {
			console.log("myErr0!:" + top.url + " - a=" + args.toString());
		}
		top.err2.call(args[0], args[1]);
		queueOfXhrTimeout = setTimeout(processXhrQueue, xhrQueueTimeout);
	};

	/*
	 * Make only these functions accessible from other files:
	 */
	return { queueXhr: queueXhr, clearXhr: clearXhr };
})();
