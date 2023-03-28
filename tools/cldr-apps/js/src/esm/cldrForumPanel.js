/*
 * cldrForumPanel: encapsulate Survey Tool Forum Info Panel code.
 */
import * as cldrAjax from "./cldrAjax.js";
import * as cldrDom from "./cldrDom.js";
import * as cldrEvent from "./cldrEvent.js";
import * as cldrForum from "./cldrForum.js";
import * as cldrInfo from "./cldrInfo.js";
import * as cldrLruCache from "./cldrLruCache.mjs";
import * as cldrRetry from "./cldrRetry.js";
import * as cldrStatus from "./cldrStatus.js";
import * as cldrSurvey from "./cldrSurvey.js";
import * as cldrTable from "./cldrTable.js";
import * as cldrText from "./cldrText.js";

const forumCache = new cldrLruCache.LRU();

function makeCacheKey(theRow) {
  return cldrStatus.getCurrentLocale() + "-" + theRow.xpstrid;
}

function clearCache() {
  forumCache.clear();
}

/**
 * Called when showing the Info Panel each time
 *
 * @param {Node} frag the fragment node to which we should append
 * @param {Node} tr the node for the row currently displayed in the DOM, plus associated data
 *                  -- unfortunately due to tech debt it's hard to tell for this tr object,
 *                  what (if anything) comes from, or corresponds to (1) the current DOM,
 *                  (2) the latest json, (3) DOM fragments under construction, (4) miscellaneous
 *                  data items attached to tr although they don't correspond directly to the DOM...
 *                  Seemingly tr.theRow is from json; tr.forumDiv is from current DOM;
 *                  tr.xpstrid and tr.theTable.session are miscellaneous data...
 * @param {Object} theRow data for the row, based (partly) on latest json
 *
 * Pretend we don't know that theRow === tr.theRow, since the DOM shouldn't be used as a database
 *
 * Called by cldrInfo.show
 */
function loadInfo(frag, tr, theRow) {
  if (!frag || !tr || !theRow) {
    return;
  }
  if (!tr.forumDiv) {
    tr.forumDiv = document.createElement("div");
    tr.forumDiv.className = "forumDiv";
  }
  const forumDivClone = tr.forumDiv.cloneNode(true);
  cldrForum.setUserCanPost(tr.theTable.json.canModify);
  setForumUrl(tr, theRow, tr.forumDiv);
  const cacheKey = makeCacheKey(theRow);
  const cachedPosts = forumCache.get(cacheKey);
  if (cachedPosts) {
    console.log("cldrForumPanel.loadInfo using CACHE, key = " + cacheKey);
    const content = getForumContent(cachedPosts, theRow.xpstrid);
    forumDivClone.appendChild(content);
    frag.appendChild(forumDivClone);
  } else {
    console.log("cldrForumPanel.loadInfo NOT using cache");
    /// cldrDom.removeAllChildNodes(forumDivClone);
    addTopButtons(theRow, frag);
    const loader2 = cldrDom.createChunk(cldrText.get("loading"), "i");
    frag.appendChild(loader2);
    frag.appendChild(forumDivClone);
    scheduleForumCountFetch(tr, forumDivClone, loader2);
  }
}

function scheduleForumCountFetch(tr, forumDivClone, loader2) {
  const ourUrl = tr.forumDiv.url + "&what=forum_count" + cldrSurvey.cacheKill();
  window.setTimeout(function () {
    const xhrArgs = {
      url: ourUrl,
      handleAs: "json",
      load: function (json) {
        if (json && json.forum_count !== undefined) {
          const nrPosts = parseInt(json.forum_count);
          havePosts(nrPosts, forumDivClone, tr, loader2);
        } else {
          console.log("Some error loading post count??");
        }
      },
    };
    cldrAjax.sendXhr(xhrArgs);
  }, 1900);
}

function addTopButtons(theRow, frag) {
  const couldFlag =
    theRow.canFlagOnLosing &&
    theRow.voteVhash !== theRow.winningVhash &&
    theRow.voteVhash !== "" &&
    !theRow.rowFlagged;
  const myValue = theRow.hasVoted ? getUsersValue(theRow) : null;
  cldrForum.addNewPostButtons(
    frag,
    cldrStatus.getCurrentLocale(),
    couldFlag,
    theRow.xpstrid,
    theRow.code,
    myValue
  );
}

function getUsersValue(theRow) {
  const surveyUser = cldrStatus.getSurveyUser();
  if (surveyUser && surveyUser.id) {
    if (theRow.voteVhash && theRow.voteVhash !== "") {
      const item = theRow.items[theRow.voteVhash];
      if (item && item.votes && item.votes[surveyUser.id]) {
        if (item.value === cldrSurvey.INHERITANCE_MARKER) {
          return theRow.inheritedValue;
        }
        return item.value;
      }
    }
  }
  return null;
}

function havePosts(nrPosts, forumDivClone, tr, loader2) {
  cldrDom.setDisplayed(loader2, false); // not needed
  tr.forumDiv.forumPosts = nrPosts;

  if (nrPosts == 0) {
    return; // nothing to do
  }

  const showButton = cldrDom.createChunk(
    "Show " + tr.forumDiv.forumPosts + " posts",
    "button",
    "forumShow"
  );

  forumDivClone.appendChild(showButton);

  const theListen = function (e) {
    cldrDom.setDisplayed(showButton, false);
    updatePosts(tr);
    cldrEvent.stopPropagation(e);
    return false;
  };
  cldrDom.listenFor(showButton, "click", theListen);
  cldrDom.listenFor(showButton, "mouseover", theListen);
}

/**
 * Update the forum posts in the Info Panel
 *
 * @param tr the table-row element with which the forum posts are associated,
 *		and whose info is shown in the Info Panel; or null, to get the
 *		tr from surveyCurrentId
 */
function updatePosts(tr) {
  if (!tr) {
    if (cldrStatus.getCurrentId() !== "") {
      const rowId = cldrTable.makeRowId(cldrStatus.getCurrentId());
      tr = document.getElementById(rowId);
    } else {
      /*
       * This is normal when adding a post in the main forum interface, which has no Info Panel.
       */
      return;
    }
  }
  if (!tr || !tr.forumDiv || !tr.forumDiv.url) {
    return;
  }
  const ourUrl = tr.forumDiv.url + "&what=forum_fetch";

  function errorHandler(err) {
    console.log("Error in updatePosts: " + err);
    const message =
      cldrStatus.stopIcon() +
      " Couldn't load forum post for this row- please refresh the page. <br>Error: " +
      err +
      "</td>";
    cldrInfo.showWithRow(message, tr);
    cldrRetry.handleDisconnect("Could not load for updatePosts:" + err, null);
  }

  function loadHandler(json) {
    try {
      if (json && json.ret && json.ret.length > 0) {
        const posts = json.ret;
        forumCache.set(makeCacheKey(tr.theRow), posts);
        const content = getForumContent(posts, tr.xpstrid);

        /*
         * Update the element whose class is 'forumDiv'.
         */
        $(".forumDiv").first().html(content);
      }
    } catch (e) {
      console.log("Error in ajax forum read ", e.message);
      console.log(" response: " + json);
      const message =
        cldrStatus.stopIcon() + " exception in ajax forum read: " + e.message;
      cldrInfo.showWithRow(message, tr);
    }
  }

  const xhrArgs = {
    url: ourUrl,
    handleAs: "json",
    load: loadHandler,
    error: errorHandler,
  };
  cldrAjax.sendXhr(xhrArgs);
}

function getForumContent(posts, xpstridExpected) {
  let content = cldrForum.parseContent(posts, "info");
  /*
   * Reality check: the json should refer to the same path as tr, which in practice
   * always matches cldrStatus.getCurrentId(). If not, log a warning and substitute "Please reload"
   * for the content.
   */
  const xpstrid = posts[0].xpath;
  if (xpstrid !== xpstridExpected || xpstrid !== cldrStatus.getCurrentId()) {
    console.log("Warning: xpath strid mismatch in updatePosts loadHandler:");
    console.log("posts[0].xpath = " + posts[0].xpath);
    console.log("xpstridExpected = " + xpstridExpected);
    console.log("surveyCurrentId = " + cldrStatus.getCurrentId());
    content = "Please reload";
  }
  return content;
}

/**
 * Called when initially setting up the section.
 *
 * @param {Node} tr
 * @param {Object} theRow
 * @param {Node} forumDiv
 */
function setForumUrl(tr, theRow, forumDiv) {
  /*
   * Note: SurveyAjax requires a "what" parameter for SurveyAjax.
   * It is not supplied here, but may be added later with code such as:
   *	let ourUrl = tr.forumDiv.url + "&what=forum_count" + cacheKill() ;
   *	let ourUrl = tr.forumDiv.url + "&what=forum_fetch";
   * Unfortunately that means "what" is not the first argument, as it would
   * be ideally for human readability of request urls.
   */
  forumDiv.url =
    cldrStatus.getContextPath() +
    "/SurveyAjax?xpath=" +
    theRow.xpathId +
    "&_=" +
    cldrStatus.getCurrentLocale() +
    "&fhash=" +
    theRow.rowHash +
    "&vhash=" +
    "&s=" +
    tr.theTable.session +
    "&voteinfo=t";
}

export { clearCache, loadInfo, setForumUrl, updatePosts };
