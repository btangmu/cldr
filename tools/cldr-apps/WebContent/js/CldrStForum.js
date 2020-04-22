'use strict';

/**
 * cldrStForum: encapsulate main Survey Tool Forum code.
 *
 * Use an IIFE pattern to create a namespace for the public functions,
 * and to hide everything else, minimizing global scope pollution.
 * Ideally this should be a module (in the sense of using import/export),
 * but not all Survey Tool JavaScript code is capable yet of being in modules
 * and running in strict mode.
 *
 * Dependencies on external code:
 * 	window.surveyCurrentLocale, window.surveySessionId, window.locmap, createGravitar, surveyUser, stui.str, listenFor, ...
 *
 * TODO: possibly move these functions here from survey.js: showForumStuff, havePosts, updateInfoPanelForumPosts, appendForumStuff;
 * also some/all code from forum.js
 */
const cldrStForum = (function() {

	let FORUM_DEBUG = true;

	function forumDebug(s) {
		if (FORUM_DEBUG) {
			console.log(s);
		}
	}

	let formDidChange = false;

	function didFormChange() {
		return formDidChange;
	}

	/**
	 * Open a thread of posts concerning this xpath
	 *
	 * Called only from review.js, for Dashboard
	 *
	 * Strangely, the non-Dashboard "New Forum Post" button (e.g., see http://localhost:8080/cldr-apps/v#forum/aa//)
	 * does NOT call openPost()! It calls openReply(), even though the resulting post gets parent = -1 = SurveyForum.NO_PARENT.
	 *
	 * NOTE: this function uses JQuery (not Dojo) for ajax ($.get)
	 */
	function openPost() {
		var path = $(this).closest(".data-review").data('path');
		var choice = $(this).closest(".table-wrapper").data('type');
		var postModal = $('#post-modal');
		var locale = surveyCurrentLocale;
		var url = contextPath + "/SurveyAjax?what=forum_fetch&s=" + surveySessionId + "&xpath=" +
			$(this).closest('tr').data('path') + "&voteinfo&_=" + locale;

		showPost(postModal, null);

		$.get(url, function(data) {
			var post = data.ret;
			var content = '';
			content += '<form role="form" id="post-form">';
			content += '<div class="form-group">' +
				'<textarea name="text" class="form-control" placeholder="Write your post here"></textarea>' +
				'</div>\n';

			content += postStatusMenu();

			/*
			 * This Submit button differs from the one in openReply() by having data-path and data-choice
			 */
			content += '<button data-path="' + path +
				'" data-choice="' + choice + '" class="btn btn-success submit-post btn-block">Submit</button>';

			content += '<input type="hidden" name="forum" value="true">';
			content += '<input type="hidden" name="_" value="' + surveyCurrentLocale + '">';
			content += '<input type="hidden" name="replyTo" value="-1">';
			content += '<input type="hidden" name="data-path" value="' + path + '">';
			content += '<input type="hidden" name="xpath" value="#' + path + '">'; // numeric
			content += '<label class="post-subj"><input name="subj" type="hidden" value="Review"></label>';
			content += '<input name="post" type="hidden" value="Post">';
			content += '<input name="isReview" type="hidden" value="1">';
			content += '</form>';

			content += '<div class="post"></div>';
			content += '<div class="forumDiv"></div>';

			postModal.find('.modal-body').html(content);

			if (post) {
				var forumDiv = parseContent({
					ret: post,
					noItemLink: true
				});
				var postHolder = postModal.find('.modal-body').find('.forumDiv');
				postHolder[0].appendChild(forumDiv);
			}

			postModal.find('textarea').autosize();
			postModal.find('.submit-post').click(submitPost);
			setTimeout(function() {
				postModal.find('textarea').focus();
			}, 1000 /* one second */ );
		}, 'json');
	}

	/**
	 * Allow an in-line reply to a forum post.
	 *
	 * Strangely, this function is also used for the non-Dashboard "New Forum Post" button,
	 * which is not a reply; see openPost comments
	 *
	 * Called from forum.js and survey.js
	 *
	 * @param params the object containing various parameters: onReplyClose, locale, xpath, replyTo, replyData, ...
	 */
	function openReply(params) {
		var postModal = $('#post-modal');
		showPost(postModal, params.onReplyClose);

		var content = '';
		content += '<form role="form" id="post-form">';
		content += '<div class="form-group">';
		content += '<div class="input-group"><span class="input-group-addon">Subject:</span>';
		content += '<input class="form-control" name="subj" type="text" value="Re: "></div>';
		content += '<textarea name="text" class="form-control" placeholder="Write your post here"></textarea></div>';

		content += postStatusMenu();

		content += '<button class="btn btn-success submit-post btn-block">Submit</button>';
		content += '<input type="hidden" name="forum" value="true">';
		content += '<input type="hidden" name="_" value="' + params.locale + '">';

		if (params.xpath) {
			content += '<input type="hidden" name="xpath" value="' + params.xpath + '">';
		} else {
			content += '<input type="hidden" name="xpath" value="">';
		}
		if (params.replyTo) {
			content += '<input type="hidden" name="replyTo" value="' + params.replyTo + '">';
		} else {
			content += '<input type="hidden" name="replyTo" value="-1">';
		}
		content += '</form>';

		content += '<div class="post"></div>';
		content += '<div class="forumDiv"></div>';

		postModal.find('.modal-body').html(content);

		if (params.replyTo && params.replyTo >= 0 && params.replyData) {
			var subj = post2text(params.replyData.subject);
			if (subj.substring(0,3) != 'Re:') {
				subj = 'Re: '+subj;
			}
			postModal.find('input[name=subj]')[0].value = (subj);
		} else if (params.subject) {
			postModal.find('input[name=subj]')[0].value = (params.subject);
		}

		if (params.replyData) {
			var forumDiv = parseContent({ret: [params.replyData], noItemLink: true});
			var postHolder = postModal.find('.modal-body').find('.forumDiv');
			postHolder[0].appendChild(forumDiv);
		}

		postModal.find('textarea').autosize();
		postModal.find('.submit-post').click(submitPost);
		setTimeout(function() {
			postModal.find('textarea').focus();
		}, 1000 /* one second */);
	}

	/**
	 * Show a modal window displaying a forum post
	 *
	 * @param postModal the mysterious object related to bootstrap.js
	 * @param onClose the callback function
	 *
	 * Called only by openPost and openReply, in this file
	 */
	function showPost(postModal, onClose) {
		formDidChange = false;
		// fire when the post window closes. Can reload posts, etc.
		postModal.on('hidden.bs.modal', function(e) {
			if (onClose) {
				let form = $('#post-form');
				let modal = $('#post-modal');
				onClose(modal, form, formDidChange);
			}
		});
		postModal.modal();
	}

	/**
	 * Get the html content for the Status menu
	 *
	 * @return the html
	 *
	 * Called only by openPost and openReply, in this file
	 *
	 * Work in progress, reference: https://unicode-org.atlassian.net/browse/CLDR-13695
	 * and https://unicode-org.atlassian.net/browse/CLDR-13610
	 */
	function postStatusMenu() {
		let content = '<p>Status: ';
		content += '<select>\n';
		content += '<option value="" disabled selected>Select one</option>\n';
		content += '<option value="0">Open</option>\n';
		content += '<option value="1">Agree</option>\n';
		content += '<option value="2">Disagree</option>\n';
		content += '<option value="3">Information needed</option>\n';
		content += '<option value="4">Action needed</option>\n';
		content += '<option value="5">Close</option>\n';
		content += '</select></p>\n';
		return content;
	}

	/**
	 * Submit a forum post
	 *
	 * @param event
	 *
	 * Called by openPost and openReply, in this file
	 *
	 * NOTE: this function uses JQuery (not Dojo) for ajax
	 */
	function submitPost(event) {
		var locale = surveyCurrentLocale;
		var url = contextPath + "/SurveyAjax";
		var form = $('#post-form');
		formDidChange = true;
		if ($('#post-form textarea[name=text]').val()) {
			$('#post-form button').fadeOut();
			$('#post-form .input-group').fadeOut(); // subject line
			var xpath = $('#post-form input[name=xpath]').val();
			var ajaxParams = {
				data: {
					s: surveySessionId,
					"_": surveyCurrentLocale,
					replyTo: $('#post-form input[name=replyTo]').val(),
					xpath: xpath,
					text: $('#post-form textarea[name=text]').val(),
					subj: $('#post-form input[name=subj]').val(), // "Review"
					what: "forum_post"
				},
				type: "POST",
				url: url,
				contentType: "application/x-www-form-urlencoded;",
				dataType: 'json',
				success: function(data) {
					var post = $('.post').first();
					if (data.err) {
						post.before("<p class='warn'>error: " + data.err + "</p>");
					} else if (data.ret && data.ret.length > 0) {
						var postModal = $('#post-modal');
						var postHolder = postModal.find('.modal-body').find('.post');
						let firstPostHolder = postHolder[0];
						firstPostHolder.insertBefore(parseContent({
							ret: data.ret,
							noItemLink: true
						}), firstPostHolder.firstChild);
						// reset
						post = $('.post').first();
						post.hide();
						post.show('highlight', {
							color: "#d9edf7"
						});
						$('#post-form textarea').val('');
						$('#post-form textarea').fadeOut();
						updateInfoPanelForumPosts(null);
					} else {
						post.before("<i>Your post was added, #" + data.postId + " but could not be shown.</i>");
					}
				},
				error: function(err) {
					var post = $('.post').first();
					post.before("<p class='warn'>error! " + err + "</p>");
				}
			};
			$.ajax(ajaxParams);
		}
		event.preventDefault();
		event.stopPropagation();
	}

	/**
	 * Create a DOM object referring to this forum post
	 *
	 * @param {Object} json - options
	 * @param {Array} j.ret - forum post data
	 * @return {Object} new DOM object
	 *
	 * TODO: shorten this function by moving code into subroutines. Also, postpone creating
	 * DOM elements until finished constructing the filtered list of threads, to make the code
	 * cleaner, faster, and more testable.
	 *
	 * Threading has been revised, so that the same locale+path can have multiple distinct threads,
	 * rather than always combining posts with the same locale+path into a single "thread".
	 * Reference: https://unicode-org.atlassian.net/browse/CLDR-13695
	 */
	function parseContent(json) {

		// json.ret has posts in reverse order (newest first).
		var postDivs = {}; //  postid -> div
		var topicDivs = {}; // xpath -> div or "#123" -> div
		var postHash = {}; // postid -> item

		// first, collect the posts.
		for (let num in json.ret) {
			postHash[json.ret[num].id] = json.ret[num];
		}

		// next, add threadIds and create the topic divs
		for (let num in json.ret) {
			var post = json.ret[num];
			post.threadId = getThreadId(post, postHash);

			if (!topicDivs[post.threadId]) {
				// add the topic div
				var topicDiv = document.createElement('div');
				topicDiv.className = 'well well-sm postTopic';
				var topicInfo = forumCreateChunk("", "h4", "postTopicInfo");
				if (!json.noItemLink) {
					topicDiv.appendChild(topicInfo);
					if (post.locale) {
						var localeLink = forumCreateChunk(locmap.getLocaleName(post.locale), "a", "localeName");
						if (post.locale != surveyCurrentLocale) {
							localeLink.href = linkToLocale(post.locale);
						}
						topicInfo.appendChild(localeLink);
					}
				}
				if (!post.xpath) {
					topicInfo.appendChild(forumCreateChunk(post2text(post.subject), "span", "topicSubject"));
				} else {
					if (!json.noItemLink) {
						var itemLink = forumCreateChunk(forumStr("forum_item"), "a", "pull-right postItem glyphicon glyphicon-zoom-in");
						itemLink.href = "#/" + post.locale + "//" + post.xpath;
						topicInfo.appendChild(itemLink);
						(function(topicInfo) {
							var loadingMsg = forumCreateChunk(forumStr("loading"), "i", "loadingMsg");
							topicInfo.appendChild(loadingMsg);
							xpathMap.get({
								hex: post.xpath
							}, function(o) {
								if (o.result) {
									topicInfo.removeChild(loadingMsg);
									var itemPh = forumCreateChunk(xpathMap.formatPathHeader(o.result.ph), "span", "topicSubject");
									itemPh.title = o.result.path;
									topicInfo.appendChild(itemPh);
								}
							});
						})(topicInfo);
					}
				}
				topicDivs[post.threadId] = topicDiv;
				topicDiv.id = "fthr_" + post.threadId;
			}
		}
		// Now, top to bottom, just create the post divs
		for (let num in json.ret) {
			var post = json.ret[num];

			var subpost = forumCreateChunk("", "div", "post"); // was: subpost
			postDivs[post.id] = subpost;
			subpost.id = "fp" + post.id;

			var headingLine = forumCreateChunk("", "h4", "selected");

			// If post.posterInfo is undefined, don't crash; insert "[Poster no longer active]".
			if (!post.posterInfo) {
				headingLine.appendChild(forumCreateChunk("[Poster no longer active]", "span", ""));
			} else {
				/*
				 * TODO: encapsulate "createGravitar" dependency
				 */
				var gravitar;
				if (typeof createGravitar !== 'undefined') {
					gravitar = createGravitar(post.posterInfo);
				} else {
					gravitar = document.createTextNode('');
				}
				gravitar.className = "gravitar pull-left";
				subpost.appendChild(gravitar);
				/*
				 * TODO: encapsulate "surveyUser" dependency
				 */
				if (typeof surveyUser !== 'undefined' && post.posterInfo.id == surveyUser.id) {
					headingLine.appendChild(forumCreateChunk(forumStr("user_me"), "span", "forum-me"));
				} else {
					var usera = forumCreateChunk(post.posterInfo.name + ' ', "a", "");
					if (post.posterInfo.email) {
						usera.appendChild(forumCreateChunk("", "span", "glyphicon glyphicon-envelope"));
						usera.href = "mailto:" + post.posterInfo.email;
					}
					headingLine.appendChild(usera);
					headingLine.appendChild(document.createTextNode(' (' + post.posterInfo.org + ') '));
				}
				var userLevelChunk = forumCreateChunk(forumStr("userlevel_" + post.posterInfo.userlevelName), "span", "userLevelName label-info label");
				userLevelChunk.title = forumStr("userlevel_" + post.posterInfo.userlevelName + "_desc");
				headingLine.appendChild(userLevelChunk);
			}
			var date = fmtDateTime(post.date_long);
			if (post.version) {
				date = "[v" + post.version + "] " + date;
			}
			var dateChunk = forumCreateChunk(date, "span", "label label-primary pull-right forumLink");
			(function(post) {
				/*
				 * TODO: encapsulate "listenFor" dependency
				 */
				if (typeof listenFor === 'undefined') {
					return;
				}
				listenFor(dateChunk, "click", function(e) {
					if (post.locale && locmap.getLanguage(surveyCurrentLocale) != locmap.getLanguage(post.locale)) {
						surveyCurrentLocale = locmap.getLanguage(post.locale);
					}
					surveyCurrentPage = '';
					surveyCurrentId = post.id;
					replaceHash(false);
					if (surveyCurrentSpecial != 'forum') {
						surveyCurrentSpecial = 'forum';
						reloadV();
					}
					return stStopPropagation(e);
				});
			})(post);
			headingLine.appendChild(dateChunk);
			subpost.appendChild(headingLine);

			var subSubChunk = forumCreateChunk("", "div", "postHeaderInfoGroup");
			subpost.appendChild(subSubChunk); {
				var subChunk = forumCreateChunk("", "div", "postHeaderItem");
				subSubChunk.appendChild(subChunk);
				subChunk.appendChild(forumCreateChunk(post2text(post.subject), "b", "postSubject"));
			}

			// actual text
			var postText = post2text(post.text);
			var postContent;
			subpost.appendChild(postContent = forumCreateChunk(postText, "div", "postContent"));
			if (json.replyButton) {
				var replyButton = forumCreateChunk(forumStr("forum_reply"), "button", "btn btn-default btn-sm");
				(function(post) {
					/*
					 * TODO: encapsulate "listenFor" dependency
					 */
					if (typeof listenFor === 'undefined') {
						return;
					}
					listenFor(replyButton, "click", function(e) {
						openReply({
							locale: surveyCurrentLocale,
							//xpath: '',
							replyTo: post.id,
							replyData: post,
							onReplyClose: json.onReplyClose
						});
						stStopPropagation(e);
						return false;
					});
				})(post);
				subpost.appendChild(replyButton);
			}

			// reply link
			if (json.replyStub) {
				var replyChunk = forumCreateChunk("Reply (leaves this page)", "a", "postReply");
				replyChunk.href = json.replyStub + post.id;
				subpost.appendChild(replyChunk);
			}
		}
		// reparent any nodes that we can
		for (let num in json.ret) {
			var post = json.ret[num];
			if (post.parent != -1) {
				forumDebug("reparenting " + post.id + " to " + post.parent);
				if (postDivs[post.parent]) {
					if (!postDivs[post.parent].replies) {
						// add the "replies" area
						forumDebug("Adding replies area to " + post.parent);
						postDivs[post.parent].replies = forumCreateChunk("", "div", "postReplies");
						postDivs[post.parent].appendChild(postDivs[post.parent].replies);
					}
					// add to new location
					postDivs[post.parent].replies.appendChild(postDivs[post.id]);
				} else {
					// The parent of this post was deleted.
					forumDebug("The parent of post #" + post.id + " is " + post.parent + " but it was deleted or not visible");
					// link it in somewhere
					topicDivs[post.threadId].appendChild(postDivs[post.id]);
				}
			} else {
				// 'top level' post
				topicDivs[post.threadId].appendChild(postDivs[post.id]);
			}
		}
		return filterAndAssembleForumThreads(json.ret, topicDivs);
	}

	/**
	 * Convert the given text by replacing some html with plain text
	 *
	 * @param the plain text
	 */
	function post2text(text) {
		if (text === undefined || text === null) {
			text = "(empty)";
		}
		var out = text;
		out = out.replace(/<p>/g, '\n');
		out = out.replace(/&quot;/g, '"');
		out = out.replace(/&lt;/g, '<');
		out = out.replace(/&gt;/g, '>');
		out = out.replace(/&amp;/g, '&');
		return out;
	}

	/**
	 * Create a DOM object with the specified text, tag, and HTML class.
	 *
	 * @param text textual content of the new object, or null for none
	 * @param tag which element type to create, or null for "span"
	 * @param className CSS className, or null for none.
	 * @return new DOM object
	 *
	 * This duplicated a function in survey.js; copied here to avoid the dependency, at least while testing/refactoring
	 */
	function forumCreateChunk(text, tag, className) {
		if (!tag) {
			tag = "span";
		}
		var chunk = document.createElement(tag);
		if (className) {
			chunk.className = className;
		}
		if (text) {
			chunk.appendChild(document.createTextNode(text));
		}
		return chunk;
	}

	/**
	 * Get the "thread id" for the given post.
	 *
	 * For a post with a parent, the thread id is the same as the thread id of the parent.
	 *
	 * For post without a parent, the thread id is like "aa|1234", where aa is the locale and 1234 is the post id.
	 *
	 * @param post the post object
	 * @param postHash the map indexed by all posts
	 * @return the thread id string
	 */
	function getThreadId(post, postHash) {
		if (post.parent >= 0 && postHash[post.parent]) {
			// if the parent exists
			return getThreadId(postHash[post.parent], postHash); // recursive
		}
		return post.locale + "|" + post.id;
	}

	/**
	 * Filter the forum threads and assemble them into a new document fragment,
	 * ordering threads from newest to oldest, determining the time of each thread
	 * by the newest post it contains
	 *
	 * @param posts the array of post objects, from newest to oldest
	 * @param topicDivs the array of thread elements, indexed by threadId
	 * @return the new document fragment
	 */
	function filterAndAssembleForumThreads(posts, topicDivs) {

		let filteredArray = cldrStForumFilter.getFilteredThreadIds(posts);

		const forumDiv = document.createDocumentFragment();

		posts.forEach(function(post) {
			if (filteredArray.includes(post.threadId)) {
				/*
				 * Append the div for this threadId, then remove this threadId
				 * from filteredArray to prevent appending the same div again
				 * (which would move the div to the bottom, not duplicate it).
				 */
				forumDiv.append(topicDivs[post.threadId]);
				filteredArray = filteredArray.filter(id => (id !== post.threadId));
			}		
		});
		return forumDiv;
	}

	/**
	 * Convert the given short string into a human-readable string.
	 *
	 * TODO: encapsulate "stui" dependency better
	 *
	 * @param s the short string, like "forum_item" or "forum_reply"
	 * @return the human-readable string like "Item" or "Reply"
	 */
	function forumStr(s) {
		var gravitar;
		if (typeof stui !== 'undefined') {
			return stui.str(s);
		}
		return s;
	}

	/**
	 * Format a date and time for display in a forum post.
	 *
	 * @param x the number of seconds since 1970-01-01
	 * @returns the formatted date and time as a string
	 *
	 * Like "2018-05-16 13:45" per cldr-dev@unicode.org.
	 */
	function fmtDateTime(x) {
		const d = new Date(x);

		function pad(n) {
			return (n < 10) ? '0' + n : n;
		}
		return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
			' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
	}

	/*
	 * Make only these functions accessible from other files:
	 */
	return {
		openPost: openPost,
		openReply: openReply,
		didFormChange: didFormChange,
		parseContent: parseContent,
	};
})();
