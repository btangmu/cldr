'use strict';

/**
 * cldrStatus: encapsulate data defining the current status of SurveyTool.
 * Use an IIFE pattern to create a namespace for the public functions,
 * and to hide everything else, minimizing global scope pollution.
 * Ideally this should be a module (in the sense of using import/export),
 * but not all Survey Tool JavaScript code is capable yet of being in modules
 * and running in strict mode.
 */
const cldrStatus = (function() {

	/**
	 * When this changes from one non-null value to another, the server has restarted
	 * a.k.a. org.unicode.cldr.web.SurveyMain.surveyRunningStamp
	 * a.k.a. json.status.surveyRunningStamp
	 */
	let runningStamp = null;

	/**
	 * Get the running stamp, or 0 if not initialized
	 *
	 * @return an integer
	 */
	function getRunningStamp() {
		if (runningStamp === null) {
			return 0;
		}
		return runningStamp;
	}

	/**
	 * Has runningStamp changed from one truthy value to another?
	 * While answering this question, also initialize runningStamp if not already initialized
	 * and the given stamp is truthy.
	 *
	 * @param stamp the given stamp, should be a truthy integer, else we return false
	 * @return true if runningStamp is initialized and the given stamp is truthy and differs; else false
	 */
	function runningStampChanged(stamp) {
		if (!stamp) {
			return false;
		}
		if (runningStamp === null) {
			runningStamp = stamp;
		}
		return (stamp !== runningStamp);
	}

	//---//

	/**
	 * A string such as '/cldr-apps'
	 * It may be set from (on the server) HttpServletRequest.getContextPath()
	 * a.k.a. json.status.contextPath
	 */
	let contextPath = '/cldr-apps';

	/**
	 * Get the context path
	 *
	 * @return a string such as '/cldr-apps'
	 */
	function getContextPath() {
		return contextPath;
	}

	/**
	 * Set the context path
	 *
	 * @param path a string such as '/cldr-apps'
	 */
	function setContextPath(path) {
		if (path || path === '') {
			contextPath = path;
		}
	}

	//---//

	/**
	 * A string such as '' (empty), or '821c2a2fc5c206d' (identifying a path)
	 * a.k.a. surveyCurrentId
	 */
	let currentId = '';

	/**
	 * Get the current id
	 *
	 * @return a string such as '821c2a2fc5c206d'
	 */
	function getCurrentId() {
		return currentId;
	}

	/**
	 * Set the current id
	 *
	 * @param path a string such as '821c2a2fc5c206d'
	 */
	function setCurrentId(id) {
		if (id || id === '') {
			currentId = id;
		}
	}

	//---//

	/**
	 * A string such as '' (empty), 'Gregorian', 'Languages_K_N'
	 * a.k.a. surveyCurrentPage
	 */
	let currentPage = '';

	/**
	 * Get the current page
	 *
	 * @return a string such as 'Gregorian'
	 */
	function getCurrentPage() {
		return currentPage;
	}

	/**
	 * Set the current page
	 *
	 * @param page a string such as 'Gregorian'
	 */
	function setCurrentPage(page) {
		if (page || page === '') {
			currentPage = page;
		}
	}

	//---//

	/**
	 * A string such as null, '' (empty), 'forum', 'search', 'r_vetting_json', etc.
	 * sometimes identifying a js module such as special/forum.js, but not always;
	 * 'r_vetting_json' identifies the Dashboard.
	 * a.k.a. surveyCurrentSpecial
	 */
	let currentSpecial = null;

	/**
	 * Get the current special
	 *
	 * @return a string such as 'forum'
	 */
	function getCurrentSpecial() {
		return currentSpecial;
	}

	/**
	 * Set the current special
	 *
	 * @param special a string such as 'forum', or null
	 */
	function setCurrentSpecial(special) {
		currentSpecial = special;
	}

	//---//

	/**
	 * A string such as 'en', 'fr', etc., identifying a locale
	 * a.k.a. surveyCurrentLocale
	 */
	let currentLocale = null;

	/**
	 * Get the current locale
	 *
	 * @return a string such as 'fr'
	 */
	function getCurrentLocale() {
		return currentLocale;
	}

	/**
	 * Set the current locale
	 *
	 * @param loc a string such as 'fr'
	 */
	function setCurrentLocale(loc) {
		currentLocale = loc;
	}

	//---//

	/*
	 * Make only these functions accessible from other files:
	 */
	return {
		getRunningStamp: getRunningStamp,
		runningStampChanged: runningStampChanged,
		getContextPath: getContextPath,
		setContextPath: setContextPath,
		getCurrentId: getCurrentId,
		setCurrentId: setCurrentId,
		getCurrentPage: getCurrentPage,
		setCurrentPage: setCurrentPage,
		getCurrentSpecial: getCurrentSpecial,
		setCurrentSpecial: setCurrentSpecial,
		getCurrentLocale: getCurrentLocale,
		setCurrentLocale: setCurrentLocale,
	};
})();
