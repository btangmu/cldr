"use strict";

/**
 * cldrAccount: Survey Tool feature for My Account Settings
 * This is the new non-dojo version. For dojo, see special/users.js.
 *
 * Use an IIFE pattern to create a namespace for the public functions,
 * and to hide everything else, minimizing global scope pollution.
 */
const cldrAccount = (function () {

  /**
   * Load the "My Account, Settings" page
   * -- called as special.load
   */
  function load() {
    cldrInfo.showNothing();
    const me = cldrStatus.getSurveyUser();
    if (me && me.email) {
      cldrListUsers.loadJustMe(me.email);
    } else {
      pleaseLogIn();
    }
  }

  function pleaseLogIn() {
    const ourDiv = document.createElement("div");
    ourDiv.innerHTML = "Please log in to access your account settings";
    cldrSurvey.hideLoader();
    cldrLoad.flipToOtherDiv(ourDiv);
  }

  /**
   * Confirm this file compiles and runs
   */
  function ping() {
    return "pong";
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
      ping,
    },
  };
})();
