"use strict";

/**
 * cldrListUsers: Survey Tool feature for listing users
 * This is the new non-dojo version. For dojo, see special/users.js.
 *
 * Use an IIFE pattern to create a namespace for the public functions,
 * and to hide everything else, minimizing global scope pollution.
 */
const cldrListUsers = (function () {
  // cf. UserList.java for these constants
  const LIST_ACTION_SETLEVEL = "set_userlevel_";
  const LIST_ACTION_NONE = "-";
  const LIST_ACTION_SHOW_PASSWORD = "showpassword_";
  const LIST_ACTION_SEND_PASSWORD = "sendpassword_";
  const LIST_ACTION_SETLOCALES = "set_locales_";
  const LIST_ACTION_DELETE0 = "delete0_";
  const LIST_ACTION_DELETE1 = "delete_";
  const LIST_JUST = "justu";
  const LIST_MAILUSER = "mailthem";
  const LIST_MAILUSER_WHAT = "mailthem_t";
  const LIST_MAILUSER_CONFIRM = "mailthem_c";
  const LIST_MAILUSER_CONFIRM_CODE = "confirm";
  const PREF_SHOWLOCKED = "p_showlocked";

  // called as special.load
  function load() {
    cldrInfo.showMessage(cldrText.get("users_guidance"));
    const xhrArgs = {
      url: getUrl(),
      handleAs: "json",
      load: loadHandler,
      error: errorHandler,
    };
    cldrAjax.sendXhr(xhrArgs);
  }

  function getUrl() {
    if (false) {
      // allow cache
      return (
        cldrStatus.getContextPath() +
        "/SurveyAjax?what=user_list&s=" +
        cldrStatus.getSessionId()
      );
    } else {
      // bust/disallow/kill cache
      return (
        cldrStatus.getContextPath() +
        "/SurveyAjax?what=user_list&s=" +
        cldrStatus.getSessionId() +
        "&" +
        cldrSurvey.cacheKill()
      );
    }
  }

  function loadHandler(json) {
    const ourDiv = document.createElement("div");
    ourDiv.innerHTML = getHtml(json);
    cldrSurvey.hideLoader();
    cldrLoad.flipToOtherDiv(ourDiv);
    showUserActivity(json.shownUsers, "userListTable");
  }

  function errorHandler(err) {
    const ourDiv = document.createElement("div");
    ourDiv.innerHTML = err;
    cldrSurvey.hideLoader();
    cldrLoad.flipToOtherDiv(ourDiv);
  }

  function getHtml(json) {
    let html = "Under construction... here is json:";
    html += "<pre>" + JSON.stringify(json) + "</pre>\n";

    html +=
      "<a class='notselected' href='v#tc-emaillist'>[TODO:] Email Address of Users Who Participated</a><br />\n";
    html += "<a href='/cldr-apps/adduser.jsp'>[TODO:] Add User</a><br />\n";
    html += "<h2>Users for " + json.org + "</h2>\n";
    html += "<a href='...'>[TODO:] Show locked users: is currently</a><br />\n";
    html +=
      "<div class='fnotebox'>Changing user level or locales while a user is active will result in destruction of their session. Check if they have been working recently.</div>\n";

    html += getPager();

    html += getTable(json);

    return html;
  }

  function getPager() {
    return `<div class="pager" style="align: right; float: right; margin-left: 4px;">
<form method="POST" action="/cldr-apps/survey">
Set menus:<br><label>all 
<select name="preset_from">
   <option>-</option>
<option class="user0" value="0">0: (ADMIN)</option>
<option class="user1" value="1">1: (TC)</option>
<option class="user2" value="2">2: (MANAGER)</option>
<option class="user3" value="3">3: (EXPERT)</option>
<option class="user5" value="5">5: (VETTER)</option>
<option class="user10" value="10">10: (STREET)</option>
<option class="user999" value="999">999: (LOCKED)</option>
</select></label> <br>
 <label>to
<select name="preset_do">
   <option>-</option>
   <option value="showpassword_">Show password URL...</option>
   <option value="sendpassword_">Resend password...</option>
</select></label> <br>
<input type="submit" name="do" value="list"></form>
</div>
<form method="POST" action="/cldr-apps/survey">
<input type="hidden" name="do" value="list">
<input type="submit" name="doBtn" value="Do Action">`;
  }

  const tableStart =
    '<table id="userListTable" summary="User List" class="userlist" border="2">\n' +
    '<thead> <tr><th></th><th style="display: none;">Organization / Level</th><th>Name/Email</th><th>Action</th><th>Locales</th><th>Seen</th></tr></thead>\n' +
    '<tbody><tr class="heading"><th class="partsection" colspan="6"><a name="Breton"><h4>Breton</h4></a></th></tr>\n';

  const tableEnd = "</tbody></table>\n";

  let byEmail = {};

  function getTable(json) {
    byEmail = {};
    let html = tableStart;
    let lastHead = "";
    for (let k in json.shownUsers) {
      const u = {
        data: json.users[k],
      };
      byEmail[u.data.email] = u;
      if (lastHead !== u.data.org) {
        html += "<h1>" + u.data.org + "</h1>\n";
        lastHead = u.data.org;
      }
      html += getUserHtml(u, json);
    }
    html += tableEnd;
    return html;
  }

  // cf. cldrSurvey.showUserActivity
  function getUserHtml(u, json) {
    /* A typical row will look like this:
    <tr id="u@2505" class="noActivity user1">
      <td><a href="/cldr-apps/survey?do=list&amp;justu=manuahuser.vw9b9aarv%40klfx.breton.example.com"><img alt="[zoom]" style="width: 16px; height: 16px; border: 0;" src="/cldr-apps/zoom.png" title="More on this user.."></a></td>
      <td style="display: none;"></td>
      <td valign="top"><div class="adminUserUser"><img src="https://www.gravatar.com/avatar/e24f24109689640a291a206ff0994f4d?d=identicon&amp;r=g&amp;s=32" title="gravatar - http://www.gravatar.com"><i class="userlevel_tc">TC</i><span class="adminUserName">ManuaHUser_TESTER_</span><span class="adminOrgName">Office of Breton Lang #2505</span><address class="adminUserAddress">manuahuser.vw9b9aarv@klfx.breton.example.com</address></div></td>
      <td><select name="2505_manuahuser.vw9b9aarv@klfx.breton.example.com">   <option value="">-</option>
      <option value="set_userlevel_999">Make 999: (LOCKED)</option>
     <option disabled="">-</option>
     <option value="showpassword_">Show password...</option>
     <option value="sendpassword_">Send password...</option>
      </select>
  <br><a href="/cldr-apps/upload.jsp?s=C43F6E4EC4D020208D950F7E9BA1C616&amp;email=manuahuser.vw9b9aarv@klfx.breton.example.com">Upload XML...</a>
  <br><a class="recentActivity" href="/cldr-apps/myvotes.jsp?user=2505">User Activity</a>
  </td>
   <td><i title="null">all locales</i></td> 
  <td>
  <b>seen: 32 days ago</b>
  <br><font size="-2">2020-12-12 19:50:01.0</font></td>
    </tr>
    */
    let html = "";
    html += "<tr id='u@" + u.data.id + "'>\n";
    // console.log("Wrote tr for u@" + u.data.id);
    // 1st row (no header): "zoom" icon
    html +=
      "<td><a href='" +
      getJustuUrl(u.data.email) +
      "'>" +
      "<img alt='[zoom]' style='width: 16px; height: 16px; border: 0;' src='/cldr-apps/zoom.png' title='More on this user...'></a></td>" +
      // 2nd row is hidden -- what's it for? Maybe "org", per showUserActivity?
      "<td style='display: none;'></td>" +
      // 3rd row: "Name/Email"; has gravatar icon, etc., filled in by showUserActivity
      "<td valign='top'></td>" +
      // 4th row: "Action"; menu, links to Upload XMl and User Activity
      "<td>" +
      getUserActions(u, json) +
      "</td>" +
      // 5th row: "Locales"
      "<td>" +
      getUserLocales(u, json) +
      "</td>" +
      // 6th row: "Seen"
      "<td>" +
      getUserSeen(u, json) +
      "</td>\n";
    html += "</tr>\n";
    return html;
  }

  function getJustuUrl(email) {
    return (
      cldrStatus.getContextPath() +
      "/SurveyAjax?what=user_list&justu=" +
      email +
      "&s=" +
      cldrStatus.getSessionId()
    );
  }

  function getUserActions(u, json) {
    return (
      getUserActionMenu(u, json) +
      "<br />\n" +
      getXmlUploadLink(u) +
      "<br />\n" +
      getUserActivityLink(u)
    );
  }

  function getUserActionMenu(u, json) {
    const forLevel = json.userPerms.forLevel;
    const theirLevel = u.data.userlevel;
    const theirTag = u.data.id + "_" + u.data.email;
    const just = null; // TODO: "just"

    let html = "<select name='" + theirTag + "'  ";
    if (just) {
      html += " onchange='this.form.submit()' ";
    }
    html += ">\n";

    html += "  <option value=''>" + LIST_ACTION_NONE + "</option>\n";

    for (let i in forLevel) {
      const lev = forLevel[i];
      if (just === null && lev !== "locked") {
        continue; // only allow mass LOCK (for now)
      }
      doChangeUserOption(u, forLevel, lev, theirLevel, false);
    }
    html += " <option disabled>" + LIST_ACTION_NONE + "</option>";
    html += " <option ";
    if (
      json.preset_fromint == theirLevel &&
      json.preset_do.equals(LIST_ACTION_SHOW_PASSWORD)
    ) {
      html += " SELECTED ";
    }
    html +=
      " value='" + LIST_ACTION_SHOW_PASSWORD + "'>Show password...</option>";
    html += " <option ";
    if (
      json.preset_fromint == theirLevel &&
      json.preset_do.equals(LIST_ACTION_SEND_PASSWORD)
    ) {
      html += " SELECTED ";
    }
    html +=
      " value='" + LIST_ACTION_SEND_PASSWORD + "'>Send password...</option>";

    if (just !== null) {
      /***
        if (havePermToChange) {
            ctx.println(" <option ");
            ctx.println(" value='" + LIST_ACTION_SETLOCALES + "'>Set locales...</option>");
        }
        if (UserRegistry.userCanDeleteUser(ctx.session.user, theirId, theirLevel)) {
            ctx.println(" <option>" + LIST_ACTION_NONE + "</option>");
            if ((action != null) && action.equals(LIST_ACTION_DELETE0)) {
                ctx.println("   <option value='" + LIST_ACTION_DELETE1
                    + "' SELECTED>Confirm delete</option>");
            } else {
                ctx.println(" <option ");
                if ((json.preset_fromint == theirLevel) && preset_do.equals(LIST_ACTION_DELETE0)) {
                    // ctx.println(" SELECTED ");
                }
                ctx.println(" value='" + LIST_ACTION_DELETE0 + "'>Delete user..</option>");
            }
        }
        if (just != null) { // only do these in 'zoomin'
            // view.
            ctx.println(" <option disabled>" + LIST_ACTION_NONE + "</option>");

            InfoType current = InfoType.fromAction(action);
            for (InfoType info : InfoType.values()) {
                if (info == InfoType.INFO_ORG && !(ctx.session.user.userlevel == UserRegistry.ADMIN)) {
                    continue;
                }
                ctx.print(" <option ");
                if (info == current) {
                    ctx.print(" SELECTED ");
                }
                ctx.println(" value='" + info.toAction() + "'>Change " + info.toString() + "...</option>");
            }
        }
        ***/
    }
    html += "  </select>";
    return html;
  }

  function getXmlUploadLink(u) {
    return (
      // TODO: not jsp
      "<a href='/cldr-apps/upload.jsp?s=" +
      cldrStatus.getSessionId() +
      "&email=" +
      u.data.email +
      "'>Upload XML...</a>"
    );
  }

  function getUserActivityLink(u) {
    return (
      // TODO: not jsp
      "<a class='recentActivity' href='/cldr-apps/myvotes.jsp?user=" +
      u.data.id +
      "'>User Activity</a>"
    );
  }

  function getUserLocales(u, json) {
    const UserRegistry_MANAGER = 2; // TODO -- get from json?
    const forLevel = json.userPerms.forLevel;
    const theirLevel = u.data.userlevel;
    if (theirLevel <= UserRegistry_MANAGER) {
      return "<i>all locales</i>";
    } else {
      return u.data.locales; // UserRegistry.prettyPrintLocale(theirLocales);
    }
  }

  function getUserSeen(u) {
    let html = "";
    let when = 0;
    if (u.data.active) {
      when = html += "<b>active: " + u.data.active + "</b>";
    } else {
    }
    html += "<b>seen: " + u.data.lastlogin + "</b>";

    /*
                      // are they logged in?
                      if ((theUser != null) && UserRegistry.userCanModifyUsers(ctx.session.user)) {
                        ctx.println("<td>");
                        ctx.println("<b>active: " + SurveyMain.timeDiff(theUser.getLastBrowserCallMillisSinceEpoch()) + " ago</b>");
                        if (UserRegistry.userIsAdmin(ctx.session.user)) {
                            ctx.print("<br/>");
                            printLiveUserMenu(ctx, theUser);
                        }
                        ctx.println("</td>");
                    } else if (theirLast != null) {
                        ctx.println("<td>");
                        ctx.println("<b>seen: " + SurveyMain.timeDiff(theirLast.getTime()) + " ago</b>");
                        ctx.print("<br/><font size='-2'>");
                        ctx.print(theirLast.toString());
                        ctx.println("</font></td>");
                    }
    */

    return html;
  }

  function timeAgo(a) {
    return timeDiff(a, new Date().getMilliseconds());
  }

  function timeDiff(a, b) {
    const ONE_DAY = 86400 * 1000;
    const A_LONG_TIME = ONE_DAY * 3;
    if (b - a > A_LONG_TIME) {
      const days = (b - a) / ONE_DAY;
      return days + " days";
    } else {
      // round to even second
      a -= a % 1000;
      b -= b % 1000;
      return ElapsedTimer.elapsedTime(a, b);
    }
  }

  /***
    const label = $("<label />");
    const showLocked = $("<input />", {
      type: "checkbox",
      checked: true,
    });
    label.text("Hide locked");
    showLocked.prependTo(label);
    label.appendTo(addto);

  let locked = [];
  let byEmail = {}; // email -> u:{}
  let byId = {}; // id -> u:{}

  showLocked.on("change", function () {
    for (let k in locked) {
      if (showLocked.is(":checked")) {
        locked[k].hide();
      } else {
        locked[k].show();
      }
    }
  });

  let lastHead;

  for (let k in data.users) {
    const u = {
      data: data.users[k],
    };
    byEmail[u.data.email] = u;
    byId[u.data.id] = u;
    if (!lastHead || lastHead !== u.data.org) {
      $("<h1>", { text: u.data.org }).appendTo(this);
      lastHead = u.data.org;
    }

    u.div = createUser(u.data);
    u.obj = $(u.div);
    if (u.data.userlevelName === "locked") {
      u.obj.hide();
      locked.push(u.obj);
    }
    $(this).append(u.obj);

    u.infoSpan = $("<span />");
    u.infoSpan.appendTo(u.obj);

    u.infoButton = $("<button />", {
      text: cldrText.get("users_infoVotesButton"),
    });
    u.infoButton.appendTo(u.obj);

    u.infoButton.on(
      "click",
      {
        u: u, // break closure
      },
      function (event) {
        var u = event.data.u;
        var xurl2 =
          cldrStatus.getContextPath() +
          "/SurveyAjax?&s=" +
          cldrStatus.getSessionId() +
          "&what=user_oldvotes&old_user_id=" +
          u.data.id;
        console.log(xurl2);
        $(u.infoSpan).removeClass("ferrbox");
        u.infoSpan.text("loading..");
        $.ajax({
          context: u.infoSpan,
          url: xurl2,
        })
          .done(function (data2) {
            if (
              !data2.user_oldvotes.data ||
              data2.user_oldvotes.data.length == 0
            ) {
              $(u.infoSpan).text("no old votes.");
            } else {
              // Crudely display the data. For now, just simplify slightly to make more legible.
              $(u.infoSpan).text(
                "old votes: " +
                  JSON.stringify(data2.user_oldvotes.data).replace(
                    /[\\\"]/g,
                    ""
                  )
              );
            }
          })
          .fail(function (err) {
            $(u.infoSpan).addClass("ferrbox");
            $(u.infoSpan).text(
              "Error loading users: Status " + JSON.stringify(err.status)
            );
          });
      }
    );

    u.loadOldVotes = $("<button />", {
      text: cldrText.get("users_loadVotesButton"),
    });
    u.loadOldVotes.appendTo(u.obj);

    u.loadOldVotes.on(
      "click",
      {
        u: u, // break closure
      },
      function (event) {
        var u = event.data.u;
        var oldUserEmail = prompt(
          "First, pardon the modality.\nNext, do you want to import votes to '#" +
            u.data.id +
            " " +
            u.data.email +
            "' FROM another user's old votes? Enter their email address below:"
        );
        if (!oldUserEmail) {
          return;
        }

        var oldUser = byEmail[oldUserEmail];

        if (!oldUser) {
          alert(
            "Could not find user " +
              oldUserEmail +
              " - double check the address."
          );
          return;
        }

        var oldLocale = prompt(
          "Enter the locale id to import FROM " +
            oldUser.data.name +
            " <" +
            oldUser.data.email +
            "> #" +
            oldUser.data.id
        );
        if (!oldLocale) {
          alert("Cancelled.");
          return;
        }
        if (!locmap.getLocaleInfo(oldLocale)) {
          alert("Not a valid locale id: " + oldLocale);
          return;
        }

        var newLocale = prompt(
          "Enter the locale id to import TO " + u.data.email,
          oldLocale
        );
        if (!newLocale) {
          alert("Cancelled.");
          return;
        }

        if (!locmap.getLocaleInfo(newLocale)) {
          alert("Not a valid locale id: " + newLocale);
          return;
        }

        if (
          !confirm(
            "Sure? Import FROM " +
              locmap.getLocaleName(oldLocale) +
              " @ " +
              oldUser.data.email +
              " TO " +
              locmap.getLocaleName(newLocale) +
              " @ " +
              u.data.email
          )
        ) {
          return;
        }

        var xurl3 =
          cldrStatus.getContextPath() +
          "/SurveyAjax?&s=" +
          cldrStatus.getSessionId() +
          "&what=user_xferoldvotes&from_user_id=" +
          oldUser.data.id +
          "&from_locale=" +
          oldLocale +
          "&to_user_id=" +
          u.data.id +
          "&to_locale=" +
          newLocale;
        console.log(xurl3);
        $(u.infoSpan).removeClass("ferrbox");
        u.infoSpan.text(
          "TRANSFER FROM " +
            locmap.getLocaleName(oldLocale) +
            " @ " +
            oldUser.data.email +
            " TO " +
            locmap.getLocaleName(newLocale) +
            " @ " +
            u.data.email
        );
        $.ajax({
          context: u.infoSpan,
          url: xurl3,
        })
          .done(function (data3) {
            if (data3.user_xferoldvotes) {
              $(u.infoSpan).text(JSON.stringify(data3.user_xferoldvotes));
            } else if (data3.err) {
              $(u.infoSpan).addClass("ferrbox");
              $(u.infoSpan).text("Error : " + data3.err);
            } else {
              $(u.infoSpan).addClass("ferrbox");
              $(u.infoSpan).text("Error : " + JSON.stringify(data3));
            }
          })
          .fail(function (err) {
            $(u.infoSpan).addClass("ferrbox");
            $(u.infoSpan).text(
              "Error transferring data: Status " +
                JSON.stringify(err.status)
            );
          });
      }
    );
  }
})
***/

  function doChangeUserOption(u, forLevel, newLevel, theirLevel, selected) {
    let html = "";
    if (forLevel[u.data.level].canCreateOrSetLevelTo) {
      html +=
        "  <option value='" +
        LIST_ACTION_SETLEVEL +
        newLevel +
        "'>Make " +
        newLevel +
        "</option>";
    } else {
      html += "  <option disabled>Make " + newLevel + "</option>";
    }
  }

  function showUserActivity(list, tableRef) {
    const table = document.getElementById(tableRef);

    const rows = [];
    const theadChildren = cldrSurvey.getTagChildren(
      table.getElementsByTagName("thead")[0].getElementsByTagName("tr")[0]
    );

    cldrDom.setDisplayed(theadChildren[1], false);
    const rowById = [];

    for (let k in list) {
      const user = list[k];
      const tr = document.getElementById("u@" + user.id);
      if (!tr) {
        console.log("Missing tr for id " + user.id);
        continue;
      }
      rowById[user.id] = parseInt(k); // ?!

      let rowChildren = cldrSurvey.getTagChildren(tr);

      cldrDom.removeAllChildNodes(rowChildren[1]); // org
      cldrDom.removeAllChildNodes(rowChildren[2]); // name

      let theUser;
      if (!rowChildren[1]) {
        console.log("Missing rowChildren[1] for id " + user.id);
      } else {
        cldrDom.setDisplayed(rowChildren[1], false);
        rowChildren[2].appendChild((theUser = createUser(user)));
      }

      rows.push({
        user: user,
        tr: tr,
        userDiv: theUser,
        seen: rowChildren[5],
        stats: [],
        total: 0,
      });
    }

    let loc2name = {};

    const actLoadHandler = function (json) {
      /* COUNT: 1120,  DAY: 2013-04-30, LOCALE: km, LOCALE_NAME: khmer, SUBMITTER: 2 */
      var stats = json.stats_bydayuserloc;
      var header = stats.header;
      for (var k in stats.data) {
        var row = stats.data[k];
        var submitter = row[header.SUBMITTER];
        var submitterRow = rowById[submitter];
        if (submitterRow !== undefined) {
          var userRow = rows[submitterRow];
          userRow.stats.push({
            day: row[header.DAY],
            count: row[header.COUNT],
            locale: row[header.LOCALE],
          });
          userRow.total = userRow.total + row[header.COUNT];
          loc2name[row[header.LOCALE]] = row[header.LOCALE_NAME];
        }
      }

      function appendMiniChart(userRow, count) {
        if (count > userRow.stats.length) {
          count = userRow.stats.length;
        }
        cldrDom.removeAllChildNodes(userRow.seenSub);
        for (var k = 0; k < count; k++) {
          var theStat = userRow.stats[k];
          var chartRow = cldrDom.createChunk("", "div", "chartRow");

          var chartDay = cldrDom.createChunk(theStat.day, "span", "chartDay");
          var chartLoc = cldrDom.createChunk(
            theStat.locale,
            "span",
            "chartLoc"
          );
          chartLoc.title = loc2name[theStat.locale];
          var chartCount = cldrDom.createChunk(
            // dojoNumber.format(theStat.count),
            theStat.count,
            "span",
            "chartCount"
          );

          chartRow.appendChild(chartDay);
          chartRow.appendChild(chartLoc);
          chartRow.appendChild(chartCount);

          userRow.seenSub.appendChild(chartRow);
        }
        if (count < userRow.stats.length) {
          chartRow.appendChild(document.createTextNode("..."));
        }
      }

      for (var k in rows) {
        var userRow = rows[k];
        if (userRow.total > 0) {
          cldrDom.addClass(userRow.tr, "hadActivity");
          userRow.tr.getElementsByClassName("recentActivity")[0].appendChild(
            document.createTextNode(
              // " (" + dojoNumber.format(userRow.total) + ")"
              " (" + userRow.total + ")"
            )
          );

          userRow.seenSub = document.createElement("div");
          userRow.seenSub.className = "seenSub";
          userRow.seen.appendChild(userRow.seenSub);

          appendMiniChart(userRow, 3);
          if (userRow.stats.length > 3) {
            var chartMore, chartLess;
            chartMore = cldrDom.createChunk("+", "span", "chartMore");
            chartLess = cldrDom.createChunk("-", "span", "chartMore");
            chartMore.onclick = (function (chartMore, chartLess, userRow) {
              return function () {
                cldrDom.setDisplayed(chartMore, false);
                cldrDom.setDisplayed(chartLess, true);
                appendMiniChart(userRow, userRow.stats.length);
                return false;
              };
            })(chartMore, chartLess, userRow);
            chartLess.onclick = (function (chartMore, chartLess, userRow) {
              return function () {
                cldrDom.setDisplayed(chartMore, true);
                cldrDom.setDisplayed(chartLess, false);
                appendMiniChart(userRow, 3);
                return false;
              };
            })(chartMore, chartLess, userRow);
            userRow.seen.appendChild(chartMore);
            cldrDom.setDisplayed(chartLess, false);
            userRow.seen.appendChild(chartLess);
          }
        } else {
          cldrDom.addClass(userRow.tr, "noActivity");
        }
      }
    };

    const xhrArgs = {
      url: cldrStatus.getContextPath() + "/SurveyAjax?what=stats_bydayuserloc",
      handleAs: "json",
      load: actLoadHandler,
      err: actErrHandler,
    };

    cldrAjax.sendXhr(xhrArgs);
  }

  function actErrHandler(err) {
    console.log("Error getting user activity: " + err);
  }

  /**
   * Create a DOM object referring to a user.
   *
   * @param {JSON} user - user struct
   * @return {Object} new DOM object
   */
  function createUser(user) {
    var userLevelLc = user.userlevelName.toLowerCase();
    var userLevelClass = "userlevel_" + userLevelLc;
    var userLevelStr = cldrText.get(userLevelClass);
    var div = cldrDom.createChunk(null, "div", "adminUserUser");
    div.appendChild(cldrSurvey.createGravatar(user));
    div.userLevel = cldrDom.createChunk(userLevelStr, "i", userLevelClass);
    div.appendChild(div.userLevel);
    div.appendChild(
      (div.userName = cldrDom.createChunk(user.name, "span", "adminUserName"))
    );
    if (!user.orgName) {
      user.orgName = user.org;
    }
    div.appendChild(
      (div.userOrg = cldrDom.createChunk(
        user.orgName + " #" + user.id,
        "span",
        "adminOrgName"
      ))
    );
    div.appendChild(
      (div.userEmail = cldrDom.createChunk(
        user.email,
        "address",
        "adminUserAddress"
      ))
    );
    return div;
  }

  /*
   * Make only these functions accessible from other files
   */
  return {
    createUser,
    load,
    /*
     * The following are meant to be accessible for unit testing only:
     */
    test: {
      getHtml,
    },
  };
})();
