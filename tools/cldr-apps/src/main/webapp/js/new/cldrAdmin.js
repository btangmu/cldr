"use strict";

/**
 * cldrAdmin: encapsulate the Admin Panel.
 *
 * Use an IIFE pattern to create a namespace for the public functions,
 * and to hide everything else, minimizing global scope pollution.
 * Ideally this should be a module (in the sense of using import/export),
 * but not all Survey Tool JavaScript code is capable yet of being in modules
 * and running in strict mode.
 */
const cldrAdmin = (function () {
  const ADMIN_DEBUG = true;

  let panelLast = null;
  let panels = {};
  let panelFirst = null;

  let exceptions = [];
  let exceptionNames = {};

  function load() {
    cldrSurvey.showInPop2("", null, null, null, true);

    const ourDiv = document.createElement("div");
    ourDiv.innerHTML = getHtml();
    // caution: ourDiv isn't added to DOM until we call flipflop
    cldrSurvey.hideLoader();
    cldrLoad.flipflop(ourDiv);
    loadAdminPanel();
  }

  function getHtml() {
    let html = cldrStatus.logoIcon();
    html +=
      "<h2>Survey Tool Administration | " +
      window.location.hostname +
      "</h2>\n";
    // TODO: "raw SQL"

    html += "<a href='#createAndLogin'>CreateAndLogin</a>\n";

    html +=
      "<div style='float: right; font-size: x-small;'>" +
      "<span id='visitors'></span></div>\n";

    html += "<hr />";

    html +=
      "<div class='fnotebox'>" +
      "For instructions, see <a href='http://cldr.unicode.org/index/survey-tool/admin'>Admin Docs</a>.<br />" +
      "Tabs do not (currently) auto update. Click a tab again to update.</div>\n";

    html += "<div id='adminStuff'></div>\n";
    return html;
  }

  function loadAdminPanel() {
    const adminStuff = document.getElementById("adminStuff");
    if (!adminStuff) {
      return;
    }

    const content = document.createDocumentFragment();

    const list = document.createElement("ul");
    list.className = "adminList";
    content.appendChild(list);
    addAdminPanel("admin_users", adminUsers, list, content);
    addAdminPanel("admin_threads", adminThreads, list, content);
    addAdminPanel("admin_exceptions", adminExceptions, list, content);
    addAdminPanel("admin_settings", adminSettings, list, content);
    addAdminPanel("admin_ops", adminOps, list, content);

    // last panel loaded.
    // If it's in the hashtag, use it, otherwise first.
    if (window.location.hash && window.location.hash.indexOf("#!") == 0) {
      panelSwitch(window.location.hash.substring(2));
    }
    if (!panelLast) {
      // not able to load anything.
      panelSwitch(panelFirst.type);
    }
    adminStuff.appendChild(content);
  }

  function addAdminPanel(type, fn, list, content) {
    var panel = (panels[type] = {
      type: type,
      name: cldrText.get(type) || type,
      desc:
        cldrText.get(type + "_desc") ||
        "(no description - missing from cldrText)",
      fn: fn,
    });
    panel.div = document.createElement("div");
    panel.div.style.display = "none";
    panel.div.className = "adminPanel";

    var h = document.createElement("h3");
    h.className = "adminTitle";
    h.appendChild(document.createTextNode(panel.desc || type));
    panel.div.appendChild(h);

    panel.udiv = document.createElement("div");
    panel.div.appendChild(panel.udiv);

    panel.listItem = document.createElement("li");
    panel.listItem.appendChild(document.createTextNode(panel.name || type));
    panel.listItem.title = panel.desc || type;
    panel.listItem.className = "notselected";
    panel.listItem.onclick = function (e) {
      panelSwitch(panel.type);
      return false;
    };
    list.appendChild(panel.listItem);

    content.appendChild(panel.div);

    if (!panelFirst) {
      panelFirst = panel;
    }
  }

  function adminUsers(div) {
    const frag = document.createDocumentFragment();
    const u = document.createElement("div");
    u.appendChild(document.createTextNode("Loading..."));
    frag.appendChild(u);
    cldrSurvey.removeAllChildNodes(div);
    div.appendChild(frag);
    loadOrFail("do=users", u, function (json) {
      loadAdminUsers(json, u);
    });
  }

  function adminThreads(div) {
    const frag = document.createDocumentFragment();
    div.className = "adminThreads";
    const u = cldrSurvey.createChunk("Loading...", "div", "adminThreadList");
    const stack = cldrSurvey.createChunk(null, "div", "adminThreadStack");
    frag.appendChild(u);
    frag.appendChild(stack);
    const c2s = cldrSurvey.createChunk(
      cldrText.get("clickToSelect"),
      "button",
      "clickToSelect"
    );
    cldrSurvey.clickToSelect(c2s, stack);

    cldrSurvey.removeAllChildNodes(div);
    div.appendChild(c2s);
    div.appendChild(frag);
    loadOrFail("do=threads", u, function (json) {
      loadAdminThreads(json, u, stack);
    });
  }

  function adminSettings(div) {
    const frag = document.createDocumentFragment();
    div.className = "adminSettings";
    const u = cldrSurvey.createChunk("Loading...", "div", "adminSettingsList");
    frag.appendChild(u);
    loadOrFail("do=settings", u, function (json) {
      loadAdminSettings(json, u);
    });
    cldrSurvey.removeAllChildNodes(div);
    div.appendChild(frag);
  }

  function loadAdminUsers(json, u) {
    var frag2 = document.createDocumentFragment();

    if (!json || !json.users || Object.keys(json.users) == 0) {
      frag2.appendChild(document.createTextNode(cldrText.get("No users.")));
    } else {
      for (let sess in json.users) {
        var cs = json.users[sess];
        var user = cldrSurvey.createChunk(null, "div", "adminUser");
        user.appendChild(
          cldrSurvey.createChunk("Session: " + sess, "span", "adminUserSession")
        );
        if (cs.user) {
          user.appendChild(cldrSurvey.createUser(cs.user));
        } else {
          user.appendChild(
            cldrSurvey.createChunk("(anonymous)", "div", "adminUserUser")
          );
        }
        /*
         * cs.lastBrowserCallMillisSinceEpoch = time elapsed in millis since server heard from client
         * cs.lastActionMillisSinceEpoch = time elapsed in millis since user did active action
         * cs.millisTillKick = how many millis before user will be kicked if inactive
         */
        user.appendChild(
          cldrSurvey.createChunk(
            "LastCall: " +
              cs.lastBrowserCallMillisSinceEpoch +
              ", LastAction: " +
              cs.lastActionMillisSinceEpoch +
              ", IP: " +
              cs.ip +
              ", ttk:" +
              (parseInt(cs.millisTillKick) / 1000).toFixed(1) +
              "s",
            "span",
            "adminUserInfo"
          )
        );

        var unlinkButton = cldrSurvey.createChunk(
          cldrText.get("admin_users_action_kick"),
          "button",
          "admin_users_action_kick"
        );
        user.appendChild(unlinkButton);
        unlinkButton.onclick = function (e) {
          unlinkButton.className = "deactivated";
          unlinkButton.onclick = null;
          loadOrFail("do=unlink&s=" + cs.id, unlinkButton, function (json) {
            cldrSurvey.removeAllChildNodes(unlinkButton);
            if (json.removing == null) {
              unlinkButton.appendChild(
                document.createTextNode("Already Removed")
              );
            } else {
              unlinkButton.appendChild(document.createTextNode("Removed."));
            }
          });
          return cldrSurvey.stStopPropagation(e);
        };
        frag2.appendChild(user);
        frag2.appendChild(document.createElement("hr"));
      }
    }
    cldrSurvey.removeAllChildNodes(u);
    u.appendChild(frag2);
  }

  function loadAdminThreads(json, u, stack) {
    if (!json || !json.threads || Object.keys(json.threads.all) == 0) {
      cldrSurvey.removeAllChildNodes(u);
      u.appendChild(document.createTextNode(cldrText.get("No threads.")));
    } else {
      var frag2 = document.createDocumentFragment();
      cldrSurvey.removeAllChildNodes(stack);
      stack.innerHTML = cldrText.get("adminClickToViewThreads");
      let deadThreads = {};
      if (json.threads.dead) {
        var header = cldrSurvey.createChunk(
          cldrText.get("adminDeadThreadsHeader"),
          "div",
          "adminDeadThreadsHeader"
        );
        var deadul = cldrSurvey.createChunk("", "ul", "adminDeadThreads");
        for (var jj = 0; jj < json.threads.dead.length; jj++) {
          var theThread = json.threads.dead[jj];
          var deadLi = cldrSurvey.createChunk("#" + theThread.id, "li");
          deadThreads[theThread.id] = theThread.text;
          deadul.appendChild(deadLi);
        }
        header.appendChild(deadul);
        stack.appendChild(header);
      }
      for (let id in json.threads.all) {
        var t = json.threads.all[id];
        var thread = cldrSurvey.createChunk(null, "div", "adminThread");
        var tid;
        thread.appendChild(
          (tid = cldrSurvey.createChunk(id, "span", "adminThreadId"))
        );
        if (deadThreads[id]) {
          tid.className = tid.className + " deadThread";
        }
        thread.appendChild(
          cldrSurvey.createChunk(t.name, "span", "adminThreadName")
        );
        thread.appendChild(
          cldrSurvey.createChunk(
            cldrText.get(t.state),
            "span",
            "adminThreadState_" + t.state
          )
        );
        thread.onclick = (function (t, id) {
          return function () {
            stack.innerHTML = "<b>" + id + ":" + t.name + "</b>\n";
            if (deadThreads[id]) {
              stack.appendChild(
                cldrSurvey.createChunk(deadThreads[id], "pre", "deadThreadInfo")
              );
            }
            stack.appendChild(
              cldrSurvey.createChunk("\n\n```\n", "pre", "textForTrac")
            );
            for (var q in t.stack) {
              stack.innerHTML = stack.innerHTML + t.stack[q] + "\n";
            }
            stack.appendChild(
              cldrSurvey.createChunk("```\n\n", "pre", "textForTrac")
            );
          };
        })(t, id);
        frag2.appendChild(thread);
      }

      cldrSurvey.removeAllChildNodes(u);
      u.appendChild(frag2);
    }
  }
  function adminExceptions(div) {
    const frag = document.createDocumentFragment();

    div.className = "adminThreads";
    const v = cldrSurvey.createChunk(null, "div", "adminExceptionList");
    v.setAttribute("id", "admin_v");
    const stack = cldrSurvey.createChunk(null, "div", "adminThreadStack");
    stack.setAttribute("id", "admin_stack");

    frag.appendChild(v);
    const u = cldrSurvey.createChunk(null, "div");
    u.setAttribute("id", "admin_u");
    v.appendChild(u);
    frag.appendChild(stack);

    const c2s = cldrSurvey.createChunk(
      cldrText.get("clickToSelect"),
      "button",
      "clickToSelect"
    );
    cldrSurvey.clickToSelect(c2s, stack);

    cldrSurvey.removeAllChildNodes(div);
    div.appendChild(c2s);

    exceptions = [];
    exceptionNames = {};

    div.appendChild(frag);
    const more = cldrSurvey.createChunk(
      cldrText.get("more_exceptions"),
      "p",
      "adminExceptionMore adminExceptionFooter"
    );
    const loading = cldrSurvey.createChunk(
      cldrText.get("loading"),
      "p",
      "adminExceptionFooter"
    );
    more.setAttribute("id", "admin_more");
    loading.setAttribute("id", "admin_loading");
    v.appendChild(loading);
    loadNext(null); // load the first exception
  }

function loadNext(from) {
    let append = "do=exceptions";
    if (from) {
      append = append + "&before=" + from;
    }
    console.log("Loading: " + append);
    const u = document.getElementById("admin_u");
    loadOrFail(append, u, function (json) {
      loadAdminExceptions(
        json,
        u,
        from
      );
    });
  };

  function loadAdminExceptions(json, u, from) {
    const v = document.getElementById("admin_v");
    const more = document.getElementById("admin_more");
    const loading = document.getElementById("admin_loading");
    const stack = document.getElementById("admin_stack");

    if (!json || !json.exceptions || !json.exceptions.entry) {
      if (!from) {
        v.appendChild(
          cldrSurvey.createChunk(
            cldrText.get("no_exceptions"),
            "p",
            "adminExceptionFooter"
          )
        );
      } else {
        v.removeChild(loading);
        v.appendChild(
          cldrSurvey.createChunk(
            cldrText.get("last_exception"),
            "p",
            "adminExceptionFooter"
          )
        );
        // just the last one.
      }
    } else {
      if (json.exceptions.entry.time == from) {
        console.log("Asked for <" + from + " but got =" + from);
        v.removeChild(loading);
        return;
      }
      var frag2 = document.createDocumentFragment();
      if (!from) {
        cldrSurvey.removeAllChildNodes(stack);
        stack.innerHTML = cldrText.get("adminClickToViewExceptions");
      }
      // TODO: if(json.threads.dead) frag2.appendChunk(json.threads.dead.toString(),"span","adminDeadThreads");
      if (json.exceptions.entry) {
        var e = json.exceptions.entry;
        exceptions.push(json.exceptions.entry);
        var exception = cldrSurvey.createChunk(null, "div", "adminException");
        if (e.header && e.header.length < 80) {
          exception.appendChild(
            cldrSurvey.createChunk(e.header, "span", "adminExceptionHeader")
          );
        } else {
          var t;
          exception.appendChild(
            (t = cldrSurvey.createChunk(
              e.header.substring(0, 80) + "...",
              "span",
              "adminExceptionHeader"
            ))
          );
          t.title = e.header;
        }
        exception.appendChild(
          cldrSurvey.createChunk(e.DATE, "span", "adminExceptionDate")
        );
        var clicky = (function (e) {
          return function (ee) {
            var frag3 = document.createDocumentFragment();
            frag3.appendChild(
              cldrSurvey.createChunk(e.header, "span", "adminExceptionHeader")
            );
            frag3.appendChild(
              cldrSurvey.createChunk(e.DATE, "span", "adminExceptionDate")
            );

            if (e.UPTIME) {
              frag3.appendChild(
                cldrSurvey.createChunk(e.UPTIME, "span", "adminExceptionUptime")
              );
            }
            if (e.CTX) {
              frag3.appendChild(
                cldrSurvey.createChunk(e.CTX, "span", "adminExceptionUptime")
              );
            }
            for (var q in e.fields) {
              var f = e.fields[q];
              var k = Object.keys(f);
              frag3.appendChild(
                cldrSurvey.createChunk(k[0], "h4", "textForTrac")
              );
              frag3.appendChild(
                cldrSurvey.createChunk("\n```", "pre", "textForTrac")
              );
              frag3.appendChild(
                cldrSurvey.createChunk(f[k[0]], "pre", "adminException" + k[0])
              );
              frag3.appendChild(
                cldrSurvey.createChunk("```\n", "pre", "textForTrac")
              );
            }

            if (e.LOGSITE) {
              frag3.appendChild(
                cldrSurvey.createChunk("LOGSITE\n", "h4", "textForTrac")
              );
              frag3.appendChild(
                cldrSurvey.createChunk("\n```", "pre", "textForTrac")
              );
              frag3.appendChild(
                cldrSurvey.createChunk(
                  e.LOGSITE,
                  "pre",
                  "adminExceptionLogsite"
                )
              );
              frag3.appendChild(
                cldrSurvey.createChunk("```\n", "pre", "textForTrac")
              );
            }
            cldrSurvey.removeAllChildNodes(stack);
            stack.appendChild(frag3);
            cldrSurvey.stStopPropagation(ee);
            return false;
          };
        })(e);
        cldrSurvey.listenFor(exception, "click", clicky);
        var head = exceptionNames[e.header];
        if (head) {
          if (!head.others) {
            head.others = [];
            head.count = document.createTextNode("");
            var countSpan = document.createElement("span");
            countSpan.appendChild(head.count);
            countSpan.className = "adminExceptionCount";
            cldrSurvey.listenFor(countSpan, "click", function (e) {
              // prepare div
              if (!head.otherdiv) {
                head.otherdiv = cldrSurvey.createChunk(
                  null,
                  "div",
                  "adminExceptionOtherList"
                );
                head.otherdiv.appendChild(
                  cldrSurvey.createChunk(
                    cldrText.get("adminExceptionDupList"),
                    "h4"
                  )
                );
                for (k in head.others) {
                  head.otherdiv.appendChild(head.others[k]);
                }
              }
              cldrSurvey.removeAllChildNodes(stack);
              stack.appendChild(head.otherdiv);
              cldrSurvey.stStopPropagation(e);
              return false;
            });
            head.appendChild(countSpan);
          }
          head.others.push(exception);
          head.count.nodeValue = cldrText.sub("adminExceptionDup", [
            head.others.length,
          ]);
          head.otherdiv = null; // reset
        } else {
          frag2.appendChild(exception);
          exceptionNames[e.header] = exception;
        }
      }
      u.appendChild(frag2);

      if (json.exceptions.entry && json.exceptions.entry.time) {
        if (exceptions.length > 0 && exceptions.length % 8 == 0) {
          v.removeChild(loading);
          v.appendChild(more);
          more.onclick = more.onmouseover = function () {
            v.removeChild(more);
            v.appendChild(loading);
            loadNext(json.exceptions.entry.time);
            return false;
          };
        } else {
          setTimeout(function () {
            loadNext(json.exceptions.entry.time);
          }, 500);
        }
      }
    }
  }

  function loadAdminSettings(json, u) {
    if (!json || !json.settings || Object.keys(json.settings.all) == 0) {
      cldrSurvey.removeAllChildNodes(u);
      u.appendChild(document.createTextNode(cldrText.get("nosettings")));
    } else {
      var frag2 = document.createDocumentFragment();
      for (let id in json.settings.all) {
        var t = json.settings.all[id];

        var thread = cldrSurvey.createChunk(null, "div", "adminSetting");

        thread.appendChild(
          cldrSurvey.createChunk(id, "span", "adminSettingId")
        );
        if (id == "CLDR_HEADER") {
          (function (theHeader, theValue) {
            var setHeader = null;
            setHeader = appendInputBox(thread, "adminSettingsChangeTemp");
            setHeader.value = theValue;
            setHeader.stChange = function (onOk, onErr) {
              loadOrFail(
                "do=settings_set&setting=" + theHeader,
                u,
                function (json) {
                  if (!json || !json.settings_set || !json.settings_set.ok) {
                    onErr(cldrText.get("failed"));
                    onErr(json.settings_set.err);
                  } else {
                    if (json.settings_set[theHeader]) {
                      setHeader.value = json.settings_set[theHeader];
                      if (theHeader == "CLDR_HEADER") {
                        cldrSurvey.updateSpecialHeader(setHeader.value);
                      }
                    } else {
                      setHeader.value = "";
                      if (theHeader == "CLDR_HEADER") {
                        cldrSurvey.updateSpecialHeader(null);
                      }
                    }
                    onOk(cldrText.get("changed"));
                  }
                },
                setHeader.value
              );
              return false;
            };
          })(id, t); // call it

          if (id == "CLDR_HEADER") {
            cldrSurvey.updateSpecialHeader(t);
          }
        } else {
          thread.appendChild(
            cldrSurvey.createChunk(t, "span", "adminSettingValue")
          );
        }
        frag2.appendChild(thread);
      }
      cldrSurvey.removeAllChildNodes(u);
      u.appendChild(frag2);
    }
  }
  function adminOps(div) {
    const frag = document.createDocumentFragment();

    div.className = "adminThreads";

    const sessionId = cldrStatus.getSessionId();

    let baseUrl =
      cldrStatus.getContextPath() +
      "/SurveyAjax?what=admin_panel&s=" +
      sessionId +
      "&do=";

    var hashSuff = ""; //  "#" + window.location.hash;

    var actions = ["rawload"];
    for (var k in actions) {
      var action = actions[k];
      var newUrl = baseUrl + action + hashSuff;
      var b = cldrSurvey.createChunk(cldrText.get(action), "button");
      b.onclick = function () {
        window.location = newUrl;
        return false;
      };
      frag.appendChild(b);
    }
    cldrSurvey.removeAllChildNodes(div);
    div.appendChild(frag);
  }

  function loadOrFail(urlAppend, theDiv, loadHandler, postData) {
    const ourUrl =
      cldrStatus.getContextPath() +
      "/SurveyAjax?what=admin_panel&" +
      urlAppend +
      "&s=" +
      cldrStatus.getSessionId() +
      cldrSurvey.cacheKill();
    const errorHandler = function (err) {
      console.log("adminload " + urlAppend + " Error: " + err);
      theDiv.className = "ferrbox";
      theDiv.innerHTML =
        "Error while loading: <div style='border: 1px solid red;'>" +
        err +
        "</div>";
    };
    const xhrArgs = {
      url: ourUrl,
      handleAs: "json",
      load: loadHandler,
      error: errorHandler,
      postData: postData,
    };
    if (!loadHandler) {
      xhrArgs.handleAs = "text";
      xhrArgs.load = function (text) {
        theDiv.innerHTML = text;
      };
    }
    if (xhrArgs.postData) {
      /*
       * Make a POST request
       */
      console.log("admin post: ourUrl: " + ourUrl + " data:" + postData);
      xhrArgs.headers = {
        "Content-Type": "text/plain",
      };
    } else {
      /*
       * Make a GET request
       */
      console.log("admin get: ourUrl: " + ourUrl);
    }
    cldrAjax.sendXhr(xhrArgs);
  }

  function panelSwitch(name) {
    if (panelLast) {
      panelLast.div.style.display = "none";
      panelLast.listItem.className = "notselected";
      panelLast = null;
    }
    if (name && panels[name]) {
      panelLast = panels[name];
      panelLast.listItem.className = "selected";
      panelLast.fn(panelLast.udiv);
      panelLast.div.style.display = "block";
      //// window.location.hash = "#!" + name;
    }
  }

  function appendInputBox(parent, which) {
    var label = cldrSurvey.createChunk(cldrText.get(which), "div", which);
    var input = document.createElement("input");
    input.stChange = function (onOk, onErr) {};
    var change = cldrSurvey.createChunk(
      cldrText.get("appendInputBoxChange"),
      "button",
      "appendInputBoxChange"
    );
    var cancel = cldrSurvey.createChunk(
      cldrText.get("appendInputBoxCancel"),
      "button",
      "appendInputBoxCancel"
    );
    var notify = document.createElement("div");
    notify.className = "appendInputBoxNotify";
    input.className = "appendInputBox";
    label.appendChild(change);
    label.appendChild(cancel);
    label.appendChild(notify);
    label.appendChild(input);
    parent.appendChild(label);
    input.label = label;

    var doChange = function () {
      addClass(label, "d-item-selected");
      removeAllChildNodes(notify);
      notify.appendChild(cldrSurvey.createChunk(cldrText.get("loading"), "i"));
      var onOk = function (msg) {
        removeClass(label, "d-item-selected");
        removeAllChildNodes(notify);
        notify.appendChild(
          hideAfter(cldrSurvey.createChunk(msg, "span", "okayText"))
        );
      };
      var onErr = function (msg) {
        removeClass(label, "d-item-selected");
        removeAllChildNodes(notify);
        notify.appendChild(cldrSurvey.createChunk(msg, "span", "stopText"));
      };

      input.stChange(onOk, onErr);
    };

    var changeFn = function (e) {
      doChange();
      cldrSurvey.stStopPropagation(e);
      return false;
    };
    var cancelFn = function (e) {
      input.value = "";
      doChange();
      cldrSurvey.stStopPropagation(e);
      return false;
    };
    var keypressFn = function (e) {
      if (!e || !e.keyCode) {
        return true; // not getting the point here.
      } else if (e.keyCode == 13) {
        doChange();
        return false;
      } else {
        return true;
      }
    };
    cldrSurvey.listenFor(change, "click", changeFn);
    cldrSurvey.listenFor(cancel, "click", cancelFn);
    cldrSurvey.listenFor(input, "keypress", keypressFn);
    return input;
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
      getHtml: getHtml,
    },
  };
})();
