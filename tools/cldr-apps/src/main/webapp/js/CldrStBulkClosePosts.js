'use strict';

/**
 * cldrStBulkClosePosts: Survey Tool feature for bulk-closing forum posts
 *
 * Use an IIFE pattern to create a namespace for the public functions,
 * and to hide everything else, minimizing global scope pollution.
 * Ideally this should be a module (in the sense of using import/export),
 * but not all Survey Tool JavaScript code is capable yet of being in modules
 * and running in strict mode.
 */
const cldrStBulkClosePosts = (function() {
	const tableId = "bulkClosePostsTable";
	const fileName = "bulkClosePosts.csv";
	const onclick = "cldrStCsvFromTable.downloadCsv("
		+ "\"" + tableId + "\""
		+ ", "
		+ "\"" + fileName + "\""
		+ ")";

	/**
	 * Fetch the Bulk Close Posts data from the server, and "load" it
	 *
	 * @param params an object with various properties; see SpecialPage.js
	 */
	function load(params) {
		/*
		 * Set up the 'right sidebar'; cf. forum_participationGuidance
		 */
		showInPop2(stui.str(params.name + "Guidance"), null, null, null, true);

		const userId = (surveyUser && surveyUser.id) ? surveyUser.id : 0;
		const url = getBulkClosePostsUrl();
		const errorHandler = function(err) {
			const responseText = cldrStAjax.errResponseText(err);
			params.special.showError(params, null, {err: err, what: "Loading Forum Bulk Close Posts data" + responseText});
		};
		const loadHandler = function(json) {
			if (json.err) {
				if (params.special) {
					params.special.showError(params, json, {what: "Loading Forum Bulk Close Posts data"});
				}
				return;
			}
			const html = makeHtmlFromJson(json);
			const ourDiv = document.createElement("div");
			ourDiv.innerHTML = html;

			// No longer loading
			hideLoader(null);
			params.flipper.flipTo(params.pages.other, ourDiv);
		};
		const xhrArgs = {
			url: url,
			handleAs: 'json',
			load: loadHandler,
			error: errorHandler
		};
		cldrStAjax.sendXhr(xhrArgs);
	}

	/**
	 * Get the URL to use for loading the Forum Bulk Close Posts page
	 */
	function getBulkClosePostsUrl() {
		if (typeof surveySessionId === 'undefined') {
			console.log('Error: surveySessionId undefined in s');
			return '';
		}
		return 'SurveyAjax?what=bulk_close_posts&s=' + surveySessionId;
	}

	/**
	 * Make the html, given the json for Forum Bulk Close Posts
	 * 
	 * @param json
	 * @return the html 
	 */
	function makeHtmlFromJson(json) {
		let html = '<div>\n';
		if (json.headers && json.rows) {
			html += "<h4><a onclick='" + onclick + "'>Download CSV</a></h4>\n";
			html += "<table border='1' id='" + tableId + "'>\n";
			html += "<tr>\n";
			for (let header of json.headers) {
				html += "<th>" + header + "</th>\n";
			}
			html += "</tr>\n";
			for (let row of json.rows) {
				html += "<tr>\n";
				for (let cell of row) {
					html += "<td>" + cell + "</td>\n";
				}
				html += "</tr>\n";
			}
			html += "</table>\n";
		}
		html += '</div>';
		return html;
	}

	/*
	 * Make only these functions accessible from other files
	 */
	return {
		load: load,
		/*
		 * The following are meant to be accessible for unit testing only:
		 */
		test: {
			makeHtmlFromJson: makeHtmlFromJson,
		}
	};
})();
