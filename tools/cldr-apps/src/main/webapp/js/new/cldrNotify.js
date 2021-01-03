"use strict";

/**
 * cldrNotify: encapsulate notification (errors, etc.) functions for Survey Tool
 * This is the non-dojo version.
 *
 * Use an IIFE pattern to create a namespace for the public functions,
 * and to hide everything else, minimizing global scope pollution.
 */
const cldrNotify = (function () {
  /**
   * Show a notification message
   *
   * @param {string} why - a message
   * @param {Object} json - if present, used for json.session_err
   * @param {HTMLElement} p - document.createElement("div")
   * @param {string} what - what we were doing
   *
   * This was formerly known as showARIDialog; "ARI" probably stands for "Abort, Retry, Ignore".
   *
   * Called only by cldrSurvey.handleDisconnect
   */
  function show(why, json, p, what) {
    /*
     * TODO: make this work!
     */
    p.parentNode.removeChild(p);
    if (cldrSurvey.getDidUnbust()) {
      why += "\n\n" + cldrText.get("ari_force_reload");
    }
    let ari_message;
    if (json && json.session_err) {
      ari_message = cldrText.get("ari_sessiondisconnect_message");
    } else {
      ari_message = cldrText.get("ari_message");
    }
    const ari_submessage = format(json, what);
    const scrollerMessage =
      window.location + "<br>" + why.replace(/\n/g, "<br>");
    cldrDom.updateIf("ariMessage", ari_message.replace(/\n/g, "<br>"));
    cldrDom.updateIf("ariSubMessage", ari_submessage.replace(/\n/g, "<br>"));
    cldrDom.updateIf("ariScroller", scrollerMessage);

    cldrEvent.hideOverlayAndSidebar();

    // ariDialogShow();
    // TODO: implement a replacement for dijit/Dialog
    // https://dojotoolkit.org/reference-guide/1.10/dijit/Dialog.html
    // "<div data-dojo-type='dijit/Dialog' data-dojo-id='ariDialog' title=...
    // console.log("cldrNotify.show not implemented yet! why=" + why);
    reallyShow();

    const oneword = document.getElementById("progress_oneword");
    oneword.onclick = function () {
      if (cldrStatus.isDisconnected()) {
        reallyShow();
      }
    };
  }

  function reallyShow() {
    const ariContent = document.getElementById("ariContent");
    if (ariContent) {
      ariContent.style.display = "block";
    }
  }
  // TODO: make this work. ariRetry is referenced only by this hidden button in cldrGui.js:
  // "    <button id='ariRetryBtn' data-dojo-type='dijit/form/Button' type='button' onClick='cldrNotify.retry()' ...
  // This was formerly known as ariRetry()
  function retry() {
    hide();
    window.location.reload(true); // '(forcedReload: boolean): void' is deprecated
  }

  // formerly known as ariDialogHide
  function hide() {
    // console.log("ariDialogHide not implemented yet!");
    const ariContent = document.getElementById("ariContent");
    if (ariContent) {
      ariContent.style.display = "none";
    }
  }

  // formerly known as formatErrMsg
  function format(json, subkey) {
    if (!subkey) {
      subkey = "unknown";
    }
    let theCode = "E_UNKNOWN";
    if (json && json.session_err) {
      theCode = "E_SESSION_DISCONNECTED";
    }
    let msg_str = theCode;
    if (json && json.err_code) {
      msg_str = theCode = json.err_code;
      if (cldrText.get(json.err_code) == json.err_code) {
        console.log("** Unknown error code: " + json.err_code);
        msg_str = "E_UNKNOWN";
      }
    }
    if (json === null) {
      json = {}; // handle cases with no input data
    }
    return cldrText.sub(msg_str, {
      /* Possibilities include: err_what_section, err_what_locmap, err_what_menus,
			err_what_status, err_what_unknown, err_what_oldvotes, err_what_vote */
      what: cldrText.get("err_what_" + subkey),
      code: theCode,
      message:
        json.err_data && json.err_data.message ? json.err_data.message : "",
      surveyCurrentLocale: cldrStatus.getCurrentLocale(),
    });
  }

  /*
   * Make only these functions accessible from other files:
   */
  return {
    format,
    hide,
    retry,
    show,
    /*
     * The following are meant to be accessible for unit testing only:
     */
    // test: {
    //   f: f,
    // },
  };
})();
