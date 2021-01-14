"use strict";

/**
 * cldrListUsers: Survey Tool feature for listing users
 * This is the new non-dojo version. For dojo, see special/users.js.
 *
 * Use an IIFE pattern to create a namespace for the public functions,
 * and to hide everything else, minimizing global scope pollution.
 */
const cldrListUsers = (function () {
  // called as special.load
  function load() {
    cldrInfo.showNothing();
    const xhrArgs = {
      url: cldrStatus.getContextPath() + "/SurveyAjax?what=user_list",
      handleAs: "json",
      load: loadHandler,
      error: errorHandler,
    };
    cldrAjax.sendXhr(xhrArgs);
  }

  function loadHandler(json) {
    const ourDiv = document.createElement("div");
    ourDiv.innerHTML = getHtml(json);
    cldrSurvey.hideLoader();
    cldrLoad.flipToOtherDiv(ourDiv);
  }

  function errorHandler(err) {
    const ourDiv = document.createElement("div");
    ourDiv.innerHTML = err;
    cldrSurvey.hideLoader();
    cldrLoad.flipToOtherDiv(ourDiv);
  }

  function getHtml(json) {
    let html = "Not implemented yet";
    return html;
  }

  /*
   * Make only these functions accessible from other files
   */
  return {
    load,
    /*
     * The following are meant to be accessible for unit testing only:
     */
    test: {
      getHtml,
    },
  };
})();
