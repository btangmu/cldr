"use strict";

/**
 * cldrOldVotes: encapsulate the Import Old Votes feature.
 *
 * Use an IIFE pattern to create a namespace for the public functions,
 * and to hide everything else, minimizing global scope pollution.
 * Ideally this should be a module (in the sense of using import/export),
 * but not all Survey Tool JavaScript code is capable yet of being in modules
 * and running in strict mode.
 */
const cldrOldVotes = (function () {
  // TODO: shorten this function by means of subroutines
  function load() {
    const curLocale = cldrStatus.getCurrentLocale();
    const url =
      cldrStatus.getContextPath() +
      "/SurveyAjax?what=oldvotes&_=" +
      curLocale +
      "&s=" +
      cldrStatus.getSessionId() +
      "&" +
      cldrSurvey.cacheKill();
    cldrLoad.myLoad(
      url,
      "(loading oldvotes " + curLocale + ")",
      function (json) {
        setLoading(false);
        cldrSurvey.showLoader(cldrText.get("loading2"));
        if (!cldrLoad.verifyJson(json, "oldvotes")) {
          return;
        } else {
          cldrSurvey.showLoader("loading..");
          if (json.dataLoadTime) {
            cldrSurvey.updateIf("dynload", json.dataLoadTime);
          }
          // clean slate, and proceed
          const theDiv = cldrLoad.flippityDoDahEmptyOther();
          cldrSurvey.removeAllChildNodes(theDiv);

          const h2txt = cldrText.get("v_oldvotes_title");
          theDiv.appendChild(cldrSurvey.createChunk(h2txt, "h2", "v-title"));

          if (!json.oldvotes.locale) {
            cldrStatus.setCurrentLocale("");
            cldrLoad.COUNTupdateHashAndMenus(false);

            const ul = document.createElement("div");
            ul.className = "oldvotes_list";
            const data = json.oldvotes.locales.data;
            const header = json.oldvotes.locales.header;

            if (data.length > 0) {
              data.sort((a, b) =>
                a[header.LOCALE].localeCompare(b[header.LOCALE])
              );
              for (let k in data) {
                var li = document.createElement("li");

                var link = cldrSurvey.createChunk(
                  data[k][header.LOCALE_NAME],
                  "a"
                );
                link.href = "#" + data[k][header.LOCALE];
                (function (loc, link) {
                  return function () {
                    var clicky;
                    cldrSurvey.listenFor(
                      link,
                      "click",
                      (clicky = function (e) {
                        cldrStatus.setCurrentLocale(loc);
                        cldrLoad.reloadV();
                        cldrSurvey.stStopPropagation(e);
                        return false;
                      })
                    );
                    link.onclick = clicky;
                  };
                })(data[k][header.LOCALE], link)();
                li.appendChild(link);
                li.appendChild(cldrSurvey.createChunk(" "));
                li.appendChild(
                  cldrSurvey.createChunk("(" + data[k][header.COUNT] + ")")
                );

                ul.appendChild(li);
              }

              theDiv.appendChild(ul);

              theDiv.appendChild(
                cldrSurvey.createChunk(
                  cldrText.get("v_oldvotes_locale_list_help_msg"),
                  "p",
                  "helpContent"
                )
              );
            } else {
              theDiv.appendChild(
                cldrSurvey.createChunk(cldrText.get("v_oldvotes_no_old"), "i")
              ); // TODO fix
            }
          } else {
            cldrStatus.setCurrentLocale(json.oldvotes.locale);
            cldrLoad.updateHashAndMenus(false);
            var loclink;
            theDiv.appendChild(
              (loclink = cldrSurvey.createChunk(
                cldrText.get("v_oldvotes_return_to_locale_list"),
                "a",
                "notselected"
              ))
            );
            cldrSurvey.listenFor(loclink, "click", function (e) {
              cldrStatus.setCurrentLocale("");
              cldrLoad.reloadV();
              cldrSurvey.stStopPropagation(e);
              return false;
            });
            theDiv.appendChild(
              cldrSurvey.createChunk(
                json.oldvotes.localeDisplayName,
                "h3",
                "v-title2"
              )
            );
            var oldVotesLocaleMsg = document.createElement("p");
            oldVotesLocaleMsg.className = "helpContent";
            oldVotesLocaleMsg.innerHTML = cldrText.sub(
              "v_oldvotes_locale_msg",
              {
                version: surveyLastVoteVersion,
                locale: json.oldvotes.localeDisplayName,
              }
            );
            theDiv.appendChild(oldVotesLocaleMsg);
            if (
              (json.oldvotes.contested && json.oldvotes.contested.length > 0) ||
              (json.oldvotes.uncontested &&
                json.oldvotes.uncontested.length > 0)
            ) {
              var frag = document.createDocumentFragment();
              const oldVoteCount =
                (json.oldvotes.contested ? json.oldvotes.contested.length : 0) +
                (json.oldvotes.uncontested
                  ? json.oldvotes.uncontested.length
                  : 0);
              var summaryMsg = cldrText.sub("v_oldvotes_count_msg", {
                count: oldVoteCount,
              });
              frag.appendChild(cldrSurvey.createChunk(summaryMsg, "div", ""));

              var navChunk = document.createElement("div");
              navChunk.className = "v-oldVotes-nav";
              frag.appendChild(navChunk);

              var uncontestedChunk = null;
              var contestedChunk = null;

              function addOldvotesType(type, jsondata, frag, navChunk) {
                var content = cldrSurvey.createChunk(
                  "",
                  "div",
                  "v-oldVotes-subDiv"
                );
                content.strid = "v_oldvotes_title_" + type; // v_oldvotes_title_contested or v_oldvotes_title_uncontested

                /* Normally this interface is for old "losing" (contested) votes only, since old "winning" (uncontested) votes
                 * are imported automatically. An exception is for TC users, for whom auto-import is disabled. The server-side
                 * code leaves json.oldvotes.uncontested undefined except for TC users.
                 * Show headings for "Winning/Losing" only if json.oldvotes.uncontested is defined and non-empty.
                 */
                if (
                  json.oldvotes.uncontested &&
                  json.oldvotes.uncontested.length > 0
                ) {
                  var title = cldrText.get(content.strid);
                  content.title = title;
                  content.appendChild(
                    cldrSurvey.createChunk(title, "h2", "v-oldvotes-sub")
                  );
                }

                content.appendChild(
                  cldrSurvey.showVoteTable(jsondata /* voteList */, type, json)
                );

                var submit = dojoxBusyButton({
                  label: cldrText.get("v_submit_msg"),
                  busyLabel: cldrText.get("v_submit_busy"),
                });

                submit.on("click", function (e) {
                  cldrSurvey.setDisplayed(navChunk, false);
                  var confirmList = []; // these will be revoted with current params

                  // explicit confirm list -  save us desync hassle
                  for (var kk in jsondata) {
                    if (jsondata[kk].box.checked) {
                      confirmList.push(jsondata[kk].strid);
                    }
                  }

                  var saveList = {
                    locale: cldrStatus.getCurrentLocale(),
                    confirmList: confirmList,
                  };

                  console.log(saveList.toString());
                  console.log(
                    "Submitting " +
                      type +
                      " " +
                      confirmList.length +
                      " for confirm"
                  );
                  const curLocale = cldrStatus.getCurrentLocale();
                  var url =
                    cldrStatus.getContextPath() +
                    "/SurveyAjax?what=oldvotes&_=" +
                    curLocale +
                    "&s=" +
                    cldrStatus.getSessionId() +
                    "&doSubmit=true&" +
                    cldrSurvey.cacheKill();
                  cldrLoad.myLoad(
                    url,
                    "(submitting oldvotes " + curLocale + ")",
                    function (json) {
                      cldrSurvey.showLoader(cldrText.get("loading2"));
                      if (!cldrLoad.verifyJson(json, "oldvotes")) {
                        cldrSurvey.handleDisconnect(
                          "Error submitting votes!",
                          json,
                          "Error"
                        );
                        return;
                      } else {
                        cldrLoad.reloadV();
                      }
                    },
                    JSON.stringify(saveList),
                    {
                      "Content-Type": "application/json",
                    }
                  );
                });

                submit.placeAt(content);
                // hide by default
                cldrSurvey.setDisplayed(content, false);

                frag.appendChild(content);
                return content;
              }

              if (
                json.oldvotes.uncontested &&
                json.oldvotes.uncontested.length > 0
              ) {
                uncontestedChunk = addOldvotesType(
                  "uncontested",
                  json.oldvotes.uncontested,
                  frag,
                  navChunk
                );
              }
              if (
                json.oldvotes.contested &&
                json.oldvotes.contested.length > 0
              ) {
                contestedChunk = addOldvotesType(
                  "contested",
                  json.oldvotes.contested,
                  frag,
                  navChunk
                );
              }

              if (contestedChunk == null && uncontestedChunk != null) {
                cldrSurvey.setDisplayed(uncontestedChunk, true); // only item
              } else if (contestedChunk != null && uncontestedChunk == null) {
                cldrSurvey.setDisplayed(contestedChunk, true); // only item
              } else {
                // navigation
                navChunk.appendChild(
                  cldrSurvey.createChunk(cldrText.get("v_oldvotes_show"))
                );
                navChunk.appendChild(
                  cldrSurvey.createLinkToFn(
                    uncontestedChunk.strid,
                    function () {
                      cldrSurvey.setDisplayed(contestedChunk, false);
                      cldrSurvey.setDisplayed(uncontestedChunk, true);
                    },
                    "button"
                  )
                );
                navChunk.appendChild(
                  cldrSurvey.createLinkToFn(
                    contestedChunk.strid,
                    function () {
                      cldrSurvey.setDisplayed(contestedChunk, true);
                      cldrSurvey.setDisplayed(uncontestedChunk, false);
                    },
                    "button"
                  )
                );

                contestedChunk.appendChild(
                  cldrSurvey.createLinkToFn(
                    "v_oldvotes_hide",
                    function () {
                      cldrSurvey.setDisplayed(contestedChunk, false);
                    },
                    "button"
                  )
                );
                uncontestedChunk.appendChild(
                  cldrSurvey.createLinkToFn(
                    "v_oldvotes_hide",
                    function () {
                      cldrSurvey.setDisplayed(uncontestedChunk, false);
                    },
                    "button"
                  )
                );
              }
              theDiv.appendChild(frag);
            } else {
              theDiv.appendChild(
                cldrSurvey.createChunk(
                  cldrText.get("v_oldvotes_no_old_here"),
                  "i",
                  ""
                )
              );
            }
          }
        }
        cldrSurvey.hideLoader();
      }
    );
  }

  /*
   * Make only these functions accessible from other files:
   */
  return {
    load: load,

    /*
     * The following are meant to be accessible for unit testing only:
     */
    test: {
      // getHtml: getHtml,
    },
  };
})();
