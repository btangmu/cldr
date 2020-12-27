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
  let panelLast = null;
  let panels = {};
  let panelFirst = null;

  /**
   * Load the Admin Panel
   */
  function loadAdminPanel() {
    if (!vap) {
      return;
    }
    var adminStuff = document.getElementById("adminStuff");
    if (!adminStuff) {
      return;
    }

    var content = document.createDocumentFragment();

    var list = document.createElement("ul");
    list.className = "adminList";
    content.appendChild(list);
    addAdminPanel("admin_users", adminUsers);
    addAdminPanel("admin_threads", adminThreads);
    addAdminPanel("admin_exceptions", adminExceptions);
    addAdminPanel("admin_settings", adminSettings);
    addAdminPanel("admin_ops", adminOps);

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

  function addAdminPanel(type, fn) {
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

  function adminThreads(div) {
    var frag = document.createDocumentFragment();

    div.className = "adminThreads";
    var u = createChunk("Loading...", "div", "adminThreadList");
    var stack = createChunk(null, "div", "adminThreadStack");
    frag.appendChild(u);
    frag.appendChild(stack);
    var c2s = createChunk(
      cldrText.get("clickToSelect"),
      "button",
      "clickToSelect"
    );
    clickToSelect(c2s, stack);

    removeAllChildNodes(div);
    div.appendChild(c2s);
    var clicked = null;

    div.appendChild(frag);
    loadOrFail("do=threads", u, function (json) {
      if (!json || !json.threads || Object.keys(json.threads.all) == 0) {
        removeAllChildNodes(u);
        u.appendChild(document.createTextNode(cldrText.get("No threads.")));
      } else {
        var frag2 = document.createDocumentFragment();
        removeAllChildNodes(stack);
        stack.innerHTML = cldrText.get("adminClickToViewThreads");
        deadThreads = {};
        if (json.threads.dead) {
          var header = createChunk(
            cldrText.get("adminDeadThreadsHeader"),
            "div",
            "adminDeadThreadsHeader"
          );
          var deadul = createChunk("", "ul", "adminDeadThreads");
          for (var jj = 0; jj < json.threads.dead.length; jj++) {
            var theThread = json.threads.dead[jj];
            var deadLi = createChunk("#" + theThread.id, "li");
            //deadLi.appendChild(createChunk(theThread.text,"pre"));
            deadThreads[theThread.id] = theThread.text;
            deadul.appendChild(deadLi);
          }
          header.appendChild(deadul);
          stack.appendChild(header);
        }
        for (id in json.threads.all) {
          var t = json.threads.all[id];
          var thread = createChunk(null, "div", "adminThread");
          var tid;
          thread.appendChild((tid = createChunk(id, "span", "adminThreadId")));
          if (deadThreads[id]) {
            tid.className = tid.className + " deadThread";
          }
          thread.appendChild(createChunk(t.name, "span", "adminThreadName"));
          thread.appendChild(
            createChunk(
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
                  createChunk(deadThreads[id], "pre", "deadThreadInfo")
                );
              }
              stack.appendChild(createChunk("\n\n```\n", "pre", "textForTrac"));
              for (var q in t.stack) {
                stack.innerHTML = stack.innerHTML + t.stack[q] + "\n";
              }
              stack.appendChild(createChunk("```\n\n", "pre", "textForTrac"));
            };
          })(t, id);
          frag2.appendChild(thread);
        }

        removeAllChildNodes(u);
        u.appendChild(frag2);
      }
    });
  }

  function adminExceptions(div) {
    var frag = document.createDocumentFragment();

    div.className = "adminThreads";
    var v = createChunk(null, "div", "adminExceptionList");
    var stack = createChunk(null, "div", "adminThreadStack");
    frag.appendChild(v);
    var u = createChunk(null, "div");
    v.appendChild(u);
    frag.appendChild(stack);

    var c2s = createChunk(
      cldrText.get("clickToSelect"),
      "button",
      "clickToSelect"
    );
    clickToSelect(c2s, stack);

    removeAllChildNodes(div);
    div.appendChild(c2s);

    var exceptions = [];

    var exceptionNames = {};

    div.appendChild(frag);
    var more = createChunk(
      cldrText.get("more_exceptions"),
      "p",
      "adminExceptionMore adminExceptionFooter"
    );
    var loading = createChunk(
      cldrText.get("loading"),
      "p",
      "adminExceptionFooter"
    );

    v.appendChild(loading);
    var loadNext = function (from) {
      var append = "do=exceptions";
      if (from) {
        append = append + "&before=" + from;
      }
      console.log("Loading: " + append);
      loadOrFail(append, u, function (json) {
        if (!json || !json.exceptions || !json.exceptions.entry) {
          if (!from) {
            v.appendChild(
              createChunk(
                cldrText.get("no_exceptions"),
                "p",
                "adminExceptionFooter"
              )
            );
          } else {
            v.removeChild(loading);
            v.appendChild(
              createChunk(
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
            return; //
          }
          var frag2 = document.createDocumentFragment();
          if (!from) {
            removeAllChildNodes(stack);
            stack.innerHTML = cldrText.get("adminClickToViewExceptions");
          }
          // TODO: if(json.threads.dead) frag2.appendChunk(json.threads.dead.toString(),"span","adminDeadThreads");
          if (json.exceptions.entry) {
            var e = json.exceptions.entry;
            exceptions.push(json.exceptions.entry);
            var exception = createChunk(null, "div", "adminException");
            if (e.header && e.header.length < 80) {
              exception.appendChild(
                createChunk(e.header, "span", "adminExceptionHeader")
              );
            } else {
              var t;
              exception.appendChild(
                (t = createChunk(
                  e.header.substring(0, 80) + "...",
                  "span",
                  "adminExceptionHeader"
                ))
              );
              t.title = e.header;
            }
            exception.appendChild(
              createChunk(e.DATE, "span", "adminExceptionDate")
            );
            var clicky = (function (e) {
              return function (ee) {
                var frag3 = document.createDocumentFragment();
                frag3.appendChild(
                  createChunk(e.header, "span", "adminExceptionHeader")
                );
                frag3.appendChild(
                  createChunk(e.DATE, "span", "adminExceptionDate")
                );

                if (e.UPTIME) {
                  frag3.appendChild(
                    createChunk(e.UPTIME, "span", "adminExceptionUptime")
                  );
                }
                if (e.CTX) {
                  frag3.appendChild(
                    createChunk(e.CTX, "span", "adminExceptionUptime")
                  );
                }
                for (var q in e.fields) {
                  var f = e.fields[q];
                  var k = Object.keys(f);
                  frag3.appendChild(createChunk(k[0], "h4", "textForTrac"));
                  frag3.appendChild(createChunk("\n```", "pre", "textForTrac"));
                  frag3.appendChild(
                    createChunk(f[k[0]], "pre", "adminException" + k[0])
                  );
                  frag3.appendChild(createChunk("```\n", "pre", "textForTrac"));
                }

                if (e.LOGSITE) {
                  frag3.appendChild(
                    createChunk("LOGSITE\n", "h4", "textForTrac")
                  );
                  frag3.appendChild(createChunk("\n```", "pre", "textForTrac"));
                  frag3.appendChild(
                    createChunk(e.LOGSITE, "pre", "adminExceptionLogsite")
                  );
                  frag3.appendChild(createChunk("```\n", "pre", "textForTrac"));
                }
                removeAllChildNodes(stack);
                stack.appendChild(frag3);
                stStopPropagation(ee);
                return false;
              };
            })(e);
            listenFor(exception, "click", clicky);
            var head = exceptionNames[e.header];
            if (head) {
              if (!head.others) {
                head.others = [];
                head.count = document.createTextNode("");
                var countSpan = document.createElement("span");
                countSpan.appendChild(head.count);
                countSpan.className = "adminExceptionCount";
                listenFor(countSpan, "click", function (e) {
                  // prepare div
                  if (!head.otherdiv) {
                    head.otherdiv = createChunk(
                      null,
                      "div",
                      "adminExceptionOtherList"
                    );
                    head.otherdiv.appendChild(
                      createChunk(cldrText.get("adminExceptionDupList"), "h4")
                    );
                    for (k in head.others) {
                      head.otherdiv.appendChild(head.others[k]);
                    }
                  }
                  removeAllChildNodes(stack);
                  stack.appendChild(head.otherdiv);
                  stStopPropagation(e);
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
      });
    };
    loadNext(); // load the first exception
  }

  function adminSettings(div) {
    var frag = document.createDocumentFragment();

    div.className = "adminSettings";
    var u = createChunk("Loading...", "div", "adminSettingsList");
    frag.appendChild(u);
    loadOrFail("do=settings", u, function (json) {
      if (!json || !json.settings || Object.keys(json.settings.all) == 0) {
        removeAllChildNodes(u);
        u.appendChild(document.createTextNode(cldrText.get("nosettings")));
      } else {
        var frag2 = document.createDocumentFragment();
        for (id in json.settings.all) {
          var t = json.settings.all[id];

          var thread = createChunk(null, "div", "adminSetting");

          thread.appendChild(createChunk(id, "span", "adminSettingId"));
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
                          updateSpecialHeader(setHeader.value);
                        }
                      } else {
                        setHeader.value = "";
                        if (theHeader == "CLDR_HEADER") {
                          updateSpecialHeader(null);
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
              updateSpecialHeader(t);
            }
          } else {
            thread.appendChild(createChunk(t, "span", "adminSettingValue"));
          }
          frag2.appendChild(thread);
        }
        removeAllChildNodes(u);
        u.appendChild(frag2);
      }
    });

    removeAllChildNodes(div);
    div.appendChild(frag);
  }

  function adminOps(div) {
    var frag = document.createDocumentFragment();

    div.className = "adminThreads";

    var baseUrl =
      cldrStatus.getContextPath() + "/AdminPanel.jsp?vap=" + vap + "&do=";
    var hashSuff = ""; //  "#" + window.location.hash;

    var actions = ["rawload"];
    for (var k in actions) {
      var action = actions[k];
      var newUrl = baseUrl + action + hashSuff;
      var b = createChunk(cldrText.get(action), "button");
      b.onclick = function () {
        window.location = newUrl;
        return false;
      };
      frag.appendChild(b);
    }
    removeAllChildNodes(div);
    div.appendChild(frag);
  }

  function adminUsers(div) {
    var frag = document.createDocumentFragment();

    var u = document.createElement("div");
    u.appendChild(document.createTextNode("Loading..."));
    frag.appendChild(u);

    removeAllChildNodes(div);
    div.appendChild(frag);
    loadOrFail("do=users", u, function (json) {
      var frag2 = document.createDocumentFragment();

      if (!json || !json.users || Object.keys(json.users) == 0) {
        frag2.appendChild(document.createTextNode(cldrText.get("No users.")));
      } else {
        for (sess in json.users) {
          var cs = json.users[sess];
          var user = createChunk(null, "div", "adminUser");
          user.appendChild(
            createChunk("Session: " + sess, "span", "adminUserSession")
          );
          if (cs.user) {
            user.appendChild(createUser(cs.user));
          } else {
            user.appendChild(
              createChunk("(anonymous)", "div", "adminUserUser")
            );
          }
          /*
           * cs.lastBrowserCallMillisSinceEpoch = time elapsed in millis since server heard from client
           * cs.lastActionMillisSinceEpoch = time elapsed in millis since user did active action
           * cs.millisTillKick = how many millis before user will be kicked if inactive
           */
          user.appendChild(
            createChunk(
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

          var unlinkButton = createChunk(
            cldrText.get("admin_users_action_kick"),
            "button",
            "admin_users_action_kick"
          );
          user.appendChild(unlinkButton);
          unlinkButton.onclick = function (e) {
            unlinkButton.className = "deactivated";
            unlinkButton.onclick = null;
            loadOrFail("do=unlink&s=" + cs.id, unlinkButton, function (json) {
              removeAllChildNodes(unlinkButton);
              if (json.removing == null) {
                unlinkButton.appendChild(
                  document.createTextNode("Already Removed")
                );
              } else {
                unlinkButton.appendChild(document.createTextNode("Removed."));
              }
            });
            return stStopPropagation(e);
          };
          frag2.appendChild(user);
          frag2.appendChild(document.createElement("hr"));
        }
      }
      removeAllChildNodes(u);
      u.appendChild(frag2);
    });
  }

  function loadOrFail(urlAppend, theDiv, loadHandler, postData) {
    let ourUrl =
      cldrStatus.getContextPath() +
      "/AdminAjax.jsp?vap=" +
      vap +
      "&" +
      urlAppend;
    var errorHandler = function (err) {
      console.log("adminload " + urlAppend + " Error: " + err);
      theDiv.className = "ferrbox";
      theDiv.innerHTML =
        "Error while loading: <div style='border: 1px solid red;'>" +
        err +
        "</div>";
    };
    var xhrArgs = {
      url: ourUrl + cacheKill(),
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
      window.location.hash = "#!" + name;
    }
  }

  /*
   * Make only these functions accessible from other files:
   */
  return {
    loadAdminPanel: loadAdminPanel,
  };
})();
