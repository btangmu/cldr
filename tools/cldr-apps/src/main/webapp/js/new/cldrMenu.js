"use strict";

/**
 * cldrMenu: encapsulate functions for Survey Tool menus, especially the left sidebar
 * for choosing locales, reports, specials, data sections; also for the Coverage menu
 * in the top navigation bar, and other kinds of "menu" -- TODO: separation of concerns!
 *
 * This is the non-dojo version. For dojo, see CldrDojoLoad.js
 *
 * Use an IIFE pattern to create a namespace for the public functions,
 * and to hide everything else, minimizing global scope pollution.
 */
const cldrMenu = (function () {
  /**
   * "_thePages": menu data -- mostly (or exclusively?) for the left sidebar
   *
   * a.k.a. "menuMap" or "menus"; TODO: name consistently
   */
  let _thePages = null;

  function getThePages() {
    return _thePages;
  }

  /**
   * List of buttons/titles to set. This is not for the left sidebar; it's for
   * headers such as "-/Locale Display Names/Languages (A-D)" in the main window.
   */
  const menubuttons = {
    locale: "title-locale", // cf. id='title-locale-container'
    section: "title-section", // cf. id='title-section-container'
    page: "title-page", // cf. id='title-page-container'
    dcontent: "title-dcontent", // cf. id='title-dcontent-container'

    /**
     * Set the innerHTML of an element, and display or hide it
     * Called as menubuttons.set(id, html) to show or menubuttons.set(id) to hide
     *
     * @param {string} id - one of the id strings above (title-locale/section/page/dcontent)
     * @param {string} html - text (html) to show, or undefined to hide
     */
    set: function (id, html) {
      let cnode = document.getElementById(id + "-container");
      if (!cnode) {
        // for Elements that do their own stunts -- in fact there are none currently (2021-01-04)
        cnode = document.getElementById(id);
      }
      if (html && html !== "-") {
        // Here "updateIf" seems to have no effect; if the element with id exists, it already has html for innerHTML.
        // Commenting it out seems to make no difference. But I haven't confirmed yet that's ALWAYS true.
        cldrDom.updateIf(id, html);
        cldrDom.setDisplayed(cnode, true);
      } else {
        cldrDom.setDisplayed(cnode, false);
        cldrDom.updateIf(id, "-");
      }
    },
  };

  function getInitialMenusEtc(sessionId) {
    let theLocale = cldrStatus.getCurrentLocale();
    if (!theLocale) {
      theLocale = "root"; // Default.
    }
    const xurl =
      cldrStatus.getContextPath() +
      "/SurveyAjax?what=menus&_=" +
      theLocale +
      "&locmap=" +
      true +
      "&s=" +
      sessionId +
      cldrSurvey.cacheKill();

    cldrLoad.myLoad(xurl, "initial menus for " + theLocale, function (json) {
      loadInitialMenusFromJson(json, theLocale);
    });
  }

  function loadInitialMenusFromJson(json, theLocale) {
    if (!cldrLoad.verifyJson(json, "locmap")) {
      return;
    }
    const locmap = new LocaleMap(json.locmap);
    cldrLoad.setTheLocaleMap(locmap);

    if (cldrStatus.getCurrentLocale() === "USER" && json.loc) {
      cldrStatus.setCurrentLocale(json.loc);
    }
    setupCanModify(json); // json.canmodify

    // update left sidebar with locale data
    const theDiv = document.createElement("div");
    theDiv.className = "localeList";

    // TODO: avoid duplication of some of this code here and in cldrLocales.js
    addTopLocale("root", theDiv);
    for (let n in locmap.locmap.topLocales) {
      const topLoc = locmap.locmap.topLocales[n];
      addTopLocale(topLoc, theDiv);
    }
    $("#locale-list").html(theDiv.innerHTML);

    if (cldrStatus.isVisitor()) {
      $("#show-read").prop("checked", true);
    }

    $("a.locName").tooltip();

    cldrEvent.filterAllLocale();

    setupCoverageLevels(json);

    cldrLoad.continueInitializing(json.canAutoImport);
  }

  function setupCoverageLevels(json) {
    cldrSurvey.updateCovFromJson(json);

    const surveyLevels = json.menus.levels;
    cldrSurvey.setSurveyLevels(surveyLevels);

    let levelNums = []; // numeric levels
    for (let k in surveyLevels) {
      levelNums.push({
        num: parseInt(surveyLevels[k].level),
        level: surveyLevels[k],
      });
    }
    levelNums.sort(function (a, b) {
      return a.num - b.num;
    });

    let store = [];
    store.push({
      label: "Auto",
      value: "auto",
      title: cldrText.get("coverage_auto_desc"),
    });
    store.push({
      type: "separator",
    });

    for (let j in levelNums) {
      // use given order
      if (levelNums[j].num == 0) {
        continue; // none - skip
      }
      if (levelNums[j].num < cldrSurvey.covValue("minimal")) {
        continue; // don't bother showing these
      }
      if (cldrStatus.getIsUnofficial() === false && levelNums[j].num == 101) {
        continue; // hide Optional in production
      }
      const level = levelNums[j].level;
      store.push({
        label: cldrText.get("coverage_" + level.name),
        value: level.name,
        title: cldrText.get("coverage_" + level.name + "_desc"),
      });
    }
    // coverage menu
    let patternCoverage = $("#title-coverage .dropdown-menu");
    if (store[0].value) {
      $("#coverage-info").text(store[0].label);
    }
    for (let index = 0; index < store.length; ++index) {
      const data = store[index];
      if (data.value) {
        var html =
          '<li><a class="coverage-list" data-value="' +
          data.value +
          '"href="#">' +
          data.label +
          "</a></li>";
        patternCoverage.append(html);
      }
    }
    patternCoverage.find("li a").click(function (event) {
      patternCoverageClick(event, theLocale, $(this));
    });
  }

  function patternCoverageClick(event, theLocale, clickedElement) {
    event.stopPropagation();
    event.preventDefault();
    const newValue = clickedElement.data("value");
    let setUserCovTo = null;
    if (newValue == "auto") {
      setUserCovTo = null; // auto
    } else {
      setUserCovTo = newValue;
    }
    if (setUserCovTo === cldrSurvey.getSurveyUserCov()) {
      console.log("No change in user cov: " + setUserCovTo);
    } else {
      cldrSurvey.setSurveyUserCov(setUserCovTo);
      const updurl =
        cldrStatus.getContextPath() +
        "/SurveyAjax?what=pref&_=" +
        theLocale +
        "&pref=p_covlev&_v=" +
        cldrSurvey.getSurveyUserCov() +
        "&s=" +
        cldrStatus.getSessionId() +
        cldrSurvey.cacheKill(); // SurveyMain.PREF_COVLEV
      cldrLoad.myLoad(
        updurl,
        "updating covlev to  " + cldrSurvey.getSurveyUserCov(),
        function (json) {
          if (cldrLoad.verifyJson(json, "pref")) {
            cldrEvent.unpackMenuSideBar(json);
            if (
              cldrStatus.getCurrentSpecial() &&
              isReport(cldrStatus.getCurrentSpecial())
            ) {
              cldrLoad.reloadV();
            }
            console.log("Server set covlev successfully.");
          }
        }
      );
    }
    // still update these.
    cldrLoad.coverageUpdate();
    cldrLoad.updateHashAndMenus(false);
    $("#coverage-info").text(ucFirst(newValue));
    clickedElement.parents(".dropdown-menu").dropdown("toggle");
    if (!cldrStatus.isDashboard()) {
      cldrSurvey.refreshCounterVetting();
    }
    return false;
  }

  /**
   * Uppercase the first letter of a sentence
   * @return {String} string with first letter uppercase
   */
  function ucFirst(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function addTopLocale(topLoc, theDiv) {
    const locmap = cldrLoad.getTheLocaleMap();
    const topLocInfo = locmap.getLocaleInfo(topLoc);

    const topLocRow = document.createElement("div");
    topLocRow.className = "topLocaleRow";

    const topLocDiv = document.createElement("div");
    topLocDiv.className = "topLocale";
    cldrLoad.appendLocaleLink(topLocDiv, topLoc, topLocInfo);

    const topLocList = document.createElement("div");
    topLocList.className = "subLocaleList";

    addSubLocales(topLocList, topLocInfo);

    topLocRow.appendChild(topLocDiv);
    topLocRow.appendChild(topLocList);
    theDiv.appendChild(topLocRow);
  }

  function addSubLocales(parLocDiv, subLocInfo) {
    if (subLocInfo.sub) {
      for (let n in subLocInfo.sub) {
        const subLoc = subLocInfo.sub[n];
        addSubLocale(parLocDiv, subLoc);
      }
    }
  }

  function addSubLocale(parLocDiv, subLoc) {
    const locmap = cldrLoad.getTheLocaleMap();
    const subLocInfo = locmap.getLocaleInfo(subLoc);
    const subLocDiv = cldrDom.createChunk(null, "div", "subLocale");
    cldrLoad.appendLocaleLink(subLocDiv, subLoc, subLocInfo);
    parLocDiv.appendChild(subLocDiv);
  }

  function addFlagIcon(el) {
    // forum may need images attached to it
    const img = document.createElement("img");
    img.setAttribute("src", "flag.png");
    img.setAttribute("alt", "flag");
    img.setAttribute("title", "flag.png");
    img.setAttribute("border", 0);
    el.appendChild(img);
  }

  function unpackMenus(json) {
    if (_thePages) {
      unpackSections(json);
    } else {
      initializeThePages(json);
    }
    setSectionMinimumLevels(_thePages.sectionMap, json);
    _thePages.haveLocs[json.loc] = true;
  }

  function initializeThePages(json) {
    // Make a deep copy of json rather than directly modifying the json we got from the server.
    // Treat json as read-only, for modularity, separation of concerns.
    // Formerly we had menus = json.menus, then effectively modified json itself -- for example,
    // creating json.menus.sectionMap, which could be problematic, for example, if we ever
    // cache json as part of a better client-side data model. Maybe also problematic for
    // garbage collection, and for unit-testing where we wouldn't want json to be modified.
    const menus = JSON.parse(JSON.stringify(json.menus));
    menus.haveLocs = {};
    menus.sectionMap = {};
    menus.pageToSection = {};
    for (let k in menus.sections) {
      menus.sectionMap[menus.sections[k].id] = menus.sections[k];
      menus.sections[k].pageMap = {};
      menus.sections[k].minLev = {};
      for (let j in menus.sections[k].pages) {
        menus.sections[k].pageMap[menus.sections[k].pages[j].id] =
          menus.sections[k].pages[j];
        menus.pageToSection[menus.sections[k].pages[j].id] = menus.sections[k];
      }
    }
    _thePages = menus;
  }

  function unpackSections(json) {
    const menus = json.menus;
    for (let k in menus.sections) {
      const oldSection = _thePages.sectionMap[menus.sections[k].id];
      for (let j in menus.sections[k].pages) {
        const oldPage = oldSection.pageMap[menus.sections[k].pages[j].id];

        // copy over levels
        oldPage.levs[json.loc] = menus.sections[k].pages[j].levs[json.loc];
      }
    }
  }

  function setSectionMinimumLevels(sectionMap, json) {
    for (let k in sectionMap) {
      let min = 200;
      for (let j in sectionMap[k].pageMap) {
        const thisLev = parseInt(sectionMap[k].pageMap[j].levs[json.loc]);
        if (min > thisLev) {
          min = thisLev;
        }
      }
      sectionMap[k].minLev[json.loc] = min;
    }
  }

  function update() {
    updateLocaleMenu();

    const curLocale = cldrStatus.getCurrentLocale();
    if (curLocale == null) {
      /* Do this for null, but not for empty string ""; it's originally null, later may be "".
         Note that ("" == null) is false. */
      menubuttons.set(menubuttons.section);
      const curSpecial = cldrStatus.getCurrentSpecial();
      if (curSpecial != null) {
        const specialId = "special_" + curSpecial;
        menubuttons.set(menubuttons.page, cldrText.get(specialId));
      } else {
        menubuttons.set(menubuttons.page);
      }
    } else {
      const gearMenuItems = makeGearMenuArray();
      if (_thePages == null || _thePages.loc != curLocale) {
        getMenusFromServer(gearMenuItems);
      } else {
        // go ahead and update
        updateMenus(_thePages, gearMenuItems);
      }
    }
  }

  function getMenusFromServer(gearMenuItems) {
    // show the raw IDs while loading.
    // TODO: clarify whether it's necessary -- the code would be cleaner without null here
    updateMenuTitles(null, gearMenuItems);
    const curLocale = cldrStatus.getCurrentLocale();
    if (!curLocale) {
      return;
    }
    const url =
      cldrStatus.getContextPath() +
      "/SurveyAjax?what=menus&_=" +
      curLocale +
      "&locmap=" +
      false +
      "&s=" +
      cldrStatus.getSessionId() +
      cldrSurvey.cacheKill();
    cldrLoad.myLoad(url, "menus", function (json) {
      if (!cldrLoad.verifyJson(json, "menus")) {
        console.log("JSON verification failed for menus in cldrLoad");
        return; // busted?
      }
      // Note: since the url has "locmap=false", we never get json.locmap or json.canmodify here
      cldrSurvey.updateCovFromJson(json);
      updateCoverageMenuTitle();
      cldrLoad.coverageUpdate();
      unpackMenus(json);
      cldrEvent.unpackMenuSideBar(json);
      updateMenus(_thePages, gearMenuItems);
    });
  }

  function updateCoverageMenuTitle() {
    const cov = cldrSurvey.getSurveyUserCov();
    if (cov) {
      $("#cov-info").text(cldrText.get("coverage_" + cov));
    } else {
      $("#coverage-info").text(
        cldrText.sub("coverage_auto_msg", {
          surveyOrgCov: cldrText.get(
            "coverage_" + cldrSurvey.getSurveyOrgCov()
          ),
        })
      );
    }
  }

  // TODO: always called with menuMap = _thePages so don't pass as parameter;
  // "menuMap" ALMOST always a synonym for _thePages in this file? Name it consistently...
  // CAUTION: exception, updateMenuTitles can be called with null instead of menuMap
  function updateMenus(menuMap, gearMenuItems) {
    updateMenuTitles(menuMap, gearMenuItems);

    let myPage = null;
    let mySection = null;
    const curSpecial = cldrStatus.getCurrentSpecial();
    if (!curSpecial) {
      // first, update display names
      const curPage = cldrStatus.getCurrentPage();
      if (menuMap.sectionMap[curPage]) {
        // page is really a section
        mySection = menuMap.sectionMap[curPage];
        myPage = null;
      } else if (menuMap.pageToSection[curPage]) {
        mySection = menuMap.pageToSection[curPage];
        myPage = mySection.pageMap[curPage];
      }
      if (mySection) {
        const titlePageContainer = document.getElementById(
          "title-page-container"
        );

        // update menus under 'page' - peer pages
        if (!titlePageContainer.menus) {
          titlePageContainer.menus = {};
        }

        const showMenu = titlePageContainer.menus[mySection.id];

        if (!showMenu) {
          titlePageContainer.menus[mySection.id] = mySection.pagesMenu = null;
        }

        if (myPage !== null) {
          $("#title-page-container")
            .html("<h1>" + myPage.name + "</h1>")
            .show();
        } else {
          $("#title-page-container").html("").hide();
        }
        cldrDom.setDisplayed(titlePageContainer, true); // will fix title later
      }
    }
    cldrEvent.resizeSidebar();
  }

  function updateMenuTitles(menuMap, gearMenuItems) {
    updateGearMenu(gearMenuItems);
    updateLocaleMenu();
    updateTitleAndSection(menuMap);
  }

  function updateLocaleMenu() {
    const curLocale = cldrStatus.getCurrentLocale();
    if (curLocale != null && curLocale != "" && curLocale != "-") {
      const locmap = cldrLoad.getTheLocaleMap();
      cldrStatus.setCurrentLocaleName(locmap.getLocaleName(curLocale));
      var bund = locmap.getLocaleInfo(curLocale);
      if (bund) {
        if (bund.readonly) {
          cldrDom.addClass(
            document.getElementById(menubuttons.locale),
            "locked"
          );
        } else {
          cldrDom.removeClass(
            document.getElementById(menubuttons.locale),
            "locked"
          );
        }

        if (bund.dcChild) {
          menubuttons.set(
            menubuttons.dcontent,
            cldrText.sub("defaultContent_header_msg", {
              info: bund,
              locale: cldrStatus.getCurrentLocale(),
              dcChild: locmap.getLocaleName(bund.dcChild),
            })
          );
        } else {
          menubuttons.set(menubuttons.dcontent);
        }
      } else {
        cldrDom.removeClass(
          document.getElementById(menubuttons.locale),
          "locked"
        );
        menubuttons.set(menubuttons.dcontent);
      }
    } else {
      cldrStatus.setCurrentLocaleName("");
      cldrDom.removeClass(
        document.getElementById(menubuttons.locale),
        "locked"
      );
      menubuttons.set(menubuttons.dcontent);
    }
    menubuttons.set(menubuttons.locale, cldrStatus.getCurrentLocaleName());
  }

  /**
   * Update the header such as "-/Locale Display Names/Languages (A-D)" (Title and Section),
   * or "-/Datetime" (Report), or "-/Forum Posts", etc.
   * Note that the hyphen in "-/..." is clickable. But there is no hyphen in "/About Survey Tool".
   *
   * @param {*} menuMap
   */
  function updateTitleAndSection(menuMap) {
    const curSpecial = cldrStatus.getCurrentSpecial();
    const titlePageContainer = document.getElementById("title-page-container");

    if (curSpecial != null && curSpecial != "") {
      const specialId = "special_" + curSpecial;
      $("#section-current").html(cldrText.get(specialId));
      cldrDom.setDisplayed(titlePageContainer, false);
    } else if (!menuMap) {
      cldrDom.setDisplayed(titlePageContainer, false);
    } else {
      const curPage = cldrStatus.getCurrentPage();
      if (menuMap.sectionMap[curPage]) {
        const curSection = curPage; // section = page
        cldrStatus.setCurrentSection(curSection);
        $("#section-current").html(menuMap.sectionMap[curSection].name);
        cldrDom.setDisplayed(titlePageContainer, false); // will fix title later
      } else if (menuMap.pageToSection[curPage]) {
        const mySection = menuMap.pageToSection[curPage];
        cldrStatus.setCurrentSection(mySection.id);
        $("#section-current").html(mySection.name);
        cldrDom.setDisplayed(titlePageContainer, false); // will fix title later
      } else {
        $("#section-current").html(cldrText.get("section_general"));
        cldrDom.setDisplayed(titlePageContainer, false);
      }
    }
  }

  // TODO: move this and updateGearMenu to a new file cldrGear.js
  function makeGearMenuArray() {
    const aboutMenu = {
      title: "About",
      special: "about",
      level: 2, // TODO: no indent if !surveyUser; refactor to obviate "level"; make valid html
    };
    const surveyUser = cldrStatus.getSurveyUser();
    if (!surveyUser) {
      return [aboutMenu]; // TODO: enable more menu items when not logged in, e.g., browse
    }
    const sessionId = cldrStatus.getSessionId();
    const surveyUserPerms = cldrStatus.getPermissions();
    // TODO: eliminate surveyUserURL, make these all "specials" like #about -- no url or jsp here
    const surveyUserURL = {
      myAccountSetting: "survey?do=listu",
      disableMyAccount: "lock.jsp",
      xmlUpload: "upload.jsp?a=/cldr-apps/survey&s=" + sessionId,
      manageUser: "survey?do=list",
      flag: "tc-flagged.jsp?s=" + sessionId,
      browse: "browse.jsp",
    };
    return [
      {
        title: "Admin Panel",
        special: "admin",
        display: surveyUser && surveyUser.userlevelName === "ADMIN",
      },
      {
        divider: true,
        display: surveyUser && surveyUser.userlevelName === "ADMIN",
      },

      {
        title: "My Account",
      }, // My Account section

      {
        title: "Settings",
        level: 2,
        url: surveyUserURL.myAccountSetting,
        display: surveyUser && true,
      },
      {
        title: "Lock (Disable) My Account",
        level: 2,
        url: surveyUserURL.disableMyAccount,
        display: surveyUser && true,
      },

      {
        divider: true,
      },
      {
        title: "My Votes",
      }, // My Votes section

      /*
       * This indirectly references "special_oldvotes" in cldrText.js
       */
      {
        special: "oldvotes",
        level: 2,
        display: surveyUserPerms && surveyUserPerms.userCanImportOldVotes,
      },
      {
        special: "recent_activity",
        level: 2,
      },
      {
        title: "Upload XML",
        level: 2,
        url: surveyUserURL.xmlUpload,
      },

      {
        divider: true,
      },
      {
        title: "My Organization(" + cldrStatus.getOrganizationName() + ")",
      }, // My Organization section

      {
        special: "vsummary" /* Cf. special_vsummary */,
        level: 2,
        display: surveyUserPerms && surveyUserPerms.userCanUseVettingSummary,
      },
      {
        title: "List " + cldrStatus.getOrganizationName() + " Users",
        level: 2,
        url: surveyUserURL.manageUser,
        display:
          surveyUserPerms &&
          (surveyUserPerms.userIsTC || surveyUserPerms.userIsVetter),
      },
      {
        special: "forum_participation" /* Cf. special_forum_participation */,
        level: 2,
        display: surveyUserPerms && surveyUserPerms.userCanMonitorForum,
      },
      {
        special:
          "vetting_participation" /* Cf. special_vetting_participation */,
        level: 2,
        display:
          surveyUserPerms &&
          (surveyUserPerms.userIsTC || surveyUserPerms.userIsVetter),
      },
      {
        title: "LOCKED: Note: your account is currently locked.",
        level: 2,
        display: surveyUserPerms && surveyUserPerms.userIsLocked,
        bold: true,
      },

      {
        divider: true,
      },
      {
        title: "Forum",
      }, // Forum section

      {
        special: "flagged",
        level: 2,
        hasFlag: true,
      },
      {
        special: "mail",
        level: 2,
        display: cldrStatus.getIsUnofficial(),
      },
      {
        special: "bulk_close_posts" /* Cf. special_bulk_close_posts */,
        level: 2,
        display: surveyUser && surveyUser.userlevelName === "ADMIN",
      },

      {
        divider: true,
      },
      {
        title: "Informational",
      }, // Informational section

      {
        special: "statistics",
        level: 2,
      },

      aboutMenu,

      {
        title: "Lookup a code or xpath",
        level: 2,
        url: surveyUserURL.browse,
      },
      {
        title: "Error Subtypes",
        level: 2,
        url: "./tc-all-errors.jsp",
        display: surveyUserPerms && surveyUserPerms.userIsTC,
      },
    ];
  }

  function updateGearMenu(gearMenuItems) {
    // TODO: menubuttons.lastspecial is never accessed outside this function;
    // what does it have to do with menubuttons??? And it never has any value
    // other than undefined or null
    if (menubuttons.lastspecial === undefined) {
      menubuttons.lastspecial = null;
      const parMenu = document.getElementById("manage-list");
      for (let k = 0; k < gearMenuItems.length; k++) {
        const item = gearMenuItems[k];
        (function (item) {
          if (item.display != false) {
            var subLi = document.createElement("li");
            if (item.special) {
              // special items so look up in cldrText.js
              item.title = cldrText.get("special_" + item.special);
              item.url = "#" + item.special;
              item.blank = false;
            }
            if (item.url) {
              let subA = document.createElement("a");

              if (item.hasFlag) {
                addFlagIcon(subA);
              }
              subA.appendChild(document.createTextNode(item.title + " "));
              subA.href = item.url;

              if (item.blank != false) {
                subA.target = "_blank";
                subA.appendChild(
                  cldrDom.createChunk(
                    "",
                    "span",
                    "glyphicon glyphicon-share manage-list-icon"
                  )
                );
              }

              if (item.level) {
                // append it to appropriate levels
                const level = item.level;
                for (let i = 0; i < level - 1; i++) {
                  /*
                   * Indent by creating lists within lists, each list containing only one item.
                   * TODO: indent by a better method. Note that for valid html, ul should contain li;
                   * ul directly containing element other than li is generally invalid.
                   */
                  const ul = document.createElement("ul");
                  const li = document.createElement("li");
                  ul.setAttribute("style", "list-style-type:none");
                  ul.appendChild(li);
                  li.appendChild(subA);
                  subA = ul;
                }
              }
              subLi.appendChild(subA);
            }
            if (!item.url && !item.divider) {
              // if it is pure text/html & not a divider
              if (!item.level) {
                subLi.appendChild(document.createTextNode(item.title + " "));
              } else {
                let subA = null;
                if (item.bold) {
                  subA = document.createElement("b");
                } else if (item.italic) {
                  subA = document.createElement("i");
                } else {
                  subA = document.createElement("span");
                }
                subA.appendChild(document.createTextNode(item.title + " "));

                const level = item.level;
                for (let i = 0; i < level - 1; i++) {
                  const ul = document.createElement("ul");
                  const li = document.createElement("li");
                  ul.setAttribute("style", "list-style-type:none");
                  ul.appendChild(li);
                  li.appendChild(subA);
                  subA = ul;
                }
                subLi.appendChild(subA);
              }
              if (item.divider) {
                subLi.className = "nav-divider";
              }
              parMenu.appendChild(subLi);
            }
            if (item.divider) {
              subLi.className = "nav-divider";
            }
            parMenu.appendChild(subLi);
          }
        })(item);
      }
    }
    if (menubuttons.lastspecial) {
      // TODO: dead code?
      cldrDom.removeClass(menubuttons.lastspecial, "selected");
    }
  }

  /**
   * TODO: document and encapsulate "canmodify"
   */
  let canmodify = {};

  function setupCanModify(json) {
    if (json.canmodify) {
      for (let k in json.canmodify) {
        canmodify[json.canmodify[k]] = true;
      }
    }
  }

  function canModifyLoc(subLoc) {
    if (canmodify && subLoc in canmodify) {
      return true;
    } else {
      return false;
    }
  }

  /*
   * Make only these functions accessible from other files:
   */
  return {
    addTopLocale,
    canModifyLoc,
    getInitialMenusEtc,
    getThePages,
    update,

    /*
     * The following are meant to be accessible for unit testing only:
     */
    // test: {
    //   f: f,
    // },
  };
})();
