"use strict";

/**
 * cldrMenu: encapsulate functions for Survey Tool menus
 * This is the non-dojo version. For dojo, see CldrDojoLoad.js
 *
 * Use an IIFE pattern to create a namespace for the public functions,
 * and to hide everything else, minimizing global scope pollution.
 */

const cldrMenu = (function () {
  // TODO: implement things like these without using dojo/dijit
  const dijitMenuSeparator = null;

  let canmodify = {};

  /**
   * copy of menu data
   */
  let _thePages = null;

  /**
   * List of buttons/titles to set.
   */
  const menubuttons = {
    locale: "title-locale",
    section: "title-section",
    page: "title-page",
    dcontent: "title-dcontent",

    // menubuttons.set is called by updateLocaleMenu and updateHashAndMenus
    set: function (x, y) {
      let cnode = document.getElementById(x + "-container");
      let wnode = pseudoDijitRegistryById(x);
      let dnode = document.getElementById(x);
      if (!cnode) {
        cnode = dnode; // for Elements that do their own stunts
      }
      if (y && y !== "-") {
        if (wnode) {
          wnode.set("label", y);
        } else {
          cldrDom.updateIf(x, y); // non widget
        }
        cldrDom.setDisplayed(cnode, true);
      } else {
        cldrDom.setDisplayed(cnode, false);
        if (wnode) {
          wnode.set("label", "-");
        } else {
          cldrDom.updateIf(x, "-"); // non widget
        }
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
    console.log("🕰 loadInitialMenusFromJson");
    if (!cldrLoad.verifyJson(json, "locmap")) {
      console.log("🕰🕰🕰 verifyJson failed in loadInitialMenusFromJson");
      return;
    }
    const locmap = new LocaleMap(json.locmap);
    cldrLoad.setTheLocaleMap(locmap);

    if (cldrStatus.getCurrentLocale() === "USER" && json.loc) {
      cldrStatus.setCurrentLocale(json.loc);
    }
    // make this into a hashmap.
    setupCanModify(json); // json.canmodify

    // update left sidebar with locale data
    const theDiv = document.createElement("div");
    theDiv.className = "localeList";

    addTopLocale("root", theDiv);
    // top locales
    for (let n in locmap.locmap.topLocales) {
      const topLoc = locmap.locmap.topLocales[n];
      addTopLocale(topLoc, theDiv);
    }
    $("#locale-list").html(theDiv.innerHTML);

    if (cldrStatus.isVisitor()) {
      $("#show-read").prop("checked", true);
    }
    // tooltip locale
    $("a.locName").tooltip();

    cldrEvent.filterAllLocale();
    // end of adding the locale data

    cldrSurvey.updateCovFromJson(json);
    // setup coverage level
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
    //coverage menu
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
    if (json.canAutoImport) {
      doAutoImport();
    }

    cldrLoad.reloadV();

    // watch for hashchange to make other changes; cf. old "/dojo/hashchange"
    window.addEventListener("hashchange", cldrLoad.doHashChange);
  }

  function patternCoverageClick(event, theLocale, clickedElement) {
    event.stopPropagation();
    event.preventDefault();
    var newValue = clickedElement.data("value");
    var setUserCovTo = null;
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
          if (verifyJson(json, "pref")) {
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

  function addTopLocale(topLoc, theDiv) {
    const locmap = cldrLoad.getTheLocaleMap();
    var topLocInfo = locmap.getLocaleInfo(topLoc);

    var topLocRow = document.createElement("div");
    topLocRow.className = "topLocaleRow";

    var topLocDiv = document.createElement("div");
    topLocDiv.className = "topLocale";
    cldrLoad.appendLocaleLink(topLocDiv, topLoc, topLocInfo);

    var topLocList = document.createElement("div");
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

  function getMenusFromServer(specialItems) {
    console.log("💎 getMenusFromServer");
    // show the raw IDs while loading.
    updateMenuTitles(null, specialItems);
    const curLocale = cldrStatus.getCurrentLocale();
    if (!curLocale) {
      console.log("💎💎 getMenusFromServer -- !curLocale, returning");
      return;
    }
    console.log("💎💎💎💎 getMenusFromServer -- got curLocale, continuing");
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
      if (json.locmap) {
        // overwrite with real data
        cldrLoad.setTheLocaleMap(new LocaleMap(json.locmap));
      }
      // make this into a hashmap.
      setupCanModify(json);
      cldrSurvey.updateCovFromJson(json);
      updateCoverageMenuTitle();
      cldrLoad.coverageUpdate();
      unpackMenus(json);
      cldrEvent.unpackMenuSideBar(json);
      updateMenus(_thePages, specialItems);
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

  function setupCanModify(json) {
    if (json.canmodify) {
      for (let k in json.canmodify) {
        canmodify[json.canmodify[k]] = true;
      }
    }
  }

  /**
   * Update the menus
   */
  function updateMenus(menuMap, specialItems) {
    if (!menuMap) {
      console.log("❌ menuMap is FALSY in updateMenus!");
    }
    if (!specialItems) {
      console.log("❌ specialItems is FALSY in updateMenus!");
    }
    // initialize menus
    if (!menuMap.menusSetup) {
      menuMap.menusSetup = true;
      menuMap.setCheck = function (menu, checked, disabled) {
        if (menu) {
          menu.set(
            "iconClass",
            checked ? "dijitMenuItemIcon menu-x" : "dijitMenuItemIcon menu-o"
          );
          menu.set("disabled", disabled);
        }
      };
      var menuSection = pseudoDijitRegistryById("menu-section");
      menuMap.section_general = newPseudoDijitMenuItem({
        label: cldrText.get("section_general"),
        iconClass: "dijitMenuItemIcon ",
        disabled: true,
        onClick: function () {
          if (
            cldrStatus.getCurrentPage() != "" ||
            (cldrStatus.getCurrentSpecial() != "" &&
              cldrStatus.getCurrentSpecial() != null)
          ) {
            cldrStatus.setCurrentId(""); // no id if jumping pages
            cldrStatus.setCurrentPage("");
            cldrStatus.setCurrentSection("");
            cldrStatus.setCurrentSpecial("");
            updateMenuTitles(menuMap, specialItems);
            cldrLoad.reloadV();
          }
        },
      });
      if (menuSection) {
        menuSection.addChild(menuMap.section_general);
      }
      for (let j in menuMap.sections) {
        (function (aSection) {
          aSection.menuItem = newPseudoDijitMenuItem({
            label: aSection.name,
            iconClass: "dijitMenuItemIcon",
            onClick: function () {
              cldrStatus.setCurrentId("!"); // no id if jumping pages
              cldrStatus.setCurrentPage(aSection.id);
              cldrStatus.setCurrentSpecial("");
              updateMenus(menuMap, specialItems);
              updateMenuTitles(menuMap, specialItems);
              cldrLoad.reloadV();
            },
            disabled: true,
          });
          if (menuSection) {
            menuSection.addChild(aSection.menuItem);
            console.log("☎️ updateMenus: menuItem = " + aSection.menuItem); // never happens
          }
        })(menuMap.sections[j]);
      }

      if (menuSection) {
        menuSection.addChild(new dijitMenuSeparator());
      }
      menuMap.forumMenu = newPseudoDijitMenuItem({
        label: cldrText.get("section_forum"),
        iconClass: "dijitMenuItemIcon", // menu-chat
        disabled: true,
        onClick: function () {
          cldrStatus.setCurrentId("!"); // no id if jumping pages
          cldrStatus.setCurrentPage("");
          cldrStatus.setCurrentSpecial("forum");
          updateMenus(menuMap, specialItems);
          updateMenuTitles(menuMap, specialItems);
          cldrLoad.reloadV();
        },
      });
      if (menuSection) {
        menuSection.addChild(menuMap.forumMenu);
      }
    }

    updateMenuTitles(menuMap, specialItems);

    var myPage = null;
    var mySection = null;
    const curSpecial = cldrStatus.getCurrentSpecial();
    if (curSpecial == null || curSpecial == "") {
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
      if (mySection !== null) {
        const titlePageContainer = document.getElementById(
          "title-page-container"
        );

        // update menus under 'page' - peer pages
        if (!titlePageContainer.menus) {
          titlePageContainer.menus = {};
        }

        // hide all. TODO use a foreach model?
        for (var zz in titlePageContainer.menus) {
          var aMenu = titlePageContainer.menus[zz];
          if (aMenu) {
            aMenu.set("label", "-");
          } else {
            console.log("warning: aMenu is falsy in updateMenus");
          }
        }

        var showMenu = titlePageContainer.menus[mySection.id];

        if (!showMenu) {
          // doesn't exist - add it.
          var menuPage = newPseudoDijitDropDownMenu();
          for (var k in mySection.pages) {
            // use given order
            (function (aPage) {
              var pageMenu = (aPage.menuItem = newPseudoDijitMenuItem({
                label: aPage.name,
                iconClass:
                  aPage.id == cldrStatus.getCurrentPage()
                    ? "dijitMenuItemIcon menu-x"
                    : "dijitMenuItemIcon menu-o",
                onClick: function () {
                  cldrStatus.setCurrentId(""); // no id if jumping pages
                  cldrStatus.setCurrentPage(aPage.id);
                  updateMenuTitles(menuMap, specialItems);
                  cldrLoad.reloadV();
                },
                disabled:
                  cldrSurvey.effectiveCoverage() <
                  parseInt(aPage.levs[cldrStatus.getCurrentLocale()]),
              }));
            })(mySection.pages[k]);
          }

          showMenu = newPseudoDijitDropDownButton({
            label: "-",
            dropDown: menuPage,
          });

          titlePageContainer.menus[
            mySection.id
          ] = mySection.pagesMenu = showMenu;
        }

        if (myPage !== null) {
          $("#title-page-container")
            .html("<h1>" + myPage.name + "</h1>")
            .show();
        } else {
          $("#title-page-container").html("").hide();
        }
        cldrDom.setDisplayed(showMenu, true);
        cldrDom.setDisplayed(titlePageContainer, true); // will fix title later
      }
    }

    menuMap.setCheck(
      menuMap.section_general,
      cldrStatus.getCurrentPage() == "" &&
        (cldrStatus.getCurrentSpecial() == "" ||
          cldrStatus.getCurrentSpecial() == null),
      false
    );

    // Update the status of the items in the Section menu
    for (var j in menuMap.sections) {
      var aSection = menuMap.sections[j];
      console.log("📟 updateMenus: aSection = " + aSection);
      // need to see if any items are visible @ current coverage
      const curLocale = cldrStatus.getCurrentLocale();
      const curSection = cldrStatus.getCurrentSection();
      menuMap.setCheck(
        aSection.menuItem,
        curSection == aSection.id,
        cldrSurvey.effectiveCoverage() < aSection.minLev[curLocale]
      );

      // update the items in that section's Page menu
      if (curSection == aSection.id) {
        for (var k in aSection.pages) {
          var aPage = aSection.pages[k];
          if (!aPage.menuItem) {
            console.log("Odd - " + aPage.id + " has no menuItem");
          } else {
            menuMap.setCheck(
              aPage.menuItem,
              aPage.id == cldrStatus.getCurrentPage(),
              cldrSurvey.effectiveCoverage() < parseInt(aPage.levs[curLocale])
            );
          }
        }
      }
    }
    menuMap.setCheck(
      menuMap.forumMenu,
      cldrStatus.getCurrentSpecial() == "forum",
      cldrStatus.getSurveyUser() === null
    );
    cldrEvent.resizeSidebar();
  }

  /**
   * Just update the titles of the menus
   */
  function updateMenuTitles(menuMap, specialItems) {
    if (menubuttons.lastspecial === undefined) {
      menubuttons.lastspecial = null;

      // Set up the menu here?
      var parMenu = document.getElementById("manage-list");
      for (var k = 0; k < specialItems.length; k++) {
        var item = specialItems[k];
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
              var subA = document.createElement("a");

              if (item.hasFlag) {
                // forum may need images attached to it
                var Img = document.createElement("img");
                Img.setAttribute("src", "flag.png");
                Img.setAttribute("alt", "flag");
                Img.setAttribute("title", "flag.png");
                Img.setAttribute("border", 0);

                subA.appendChild(Img);
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
                var level = item.level;
                for (var i = 0; i < level - 1; i++) {
                  /*
                   * Indent by creating lists within lists, each list containing only one item.
                   * TODO: indent by a better method. Note that for valid html, ul should contain li;
                   * ul directly containing element other than li is generally invalid.
                   */
                  let ul = document.createElement("ul");
                  let li = document.createElement("li");
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
                var subA = null;
                if (item.bold) {
                  subA = document.createElement("b");
                } else if (item.italic) {
                  subA = document.createElement("i");
                } else {
                  subA = document.createElement("span");
                }
                subA.appendChild(document.createTextNode(item.title + " "));

                var level = item.level;
                for (var i = 0; i < level - 1; i++) {
                  let ul = document.createElement("ul");
                  let li = document.createElement("li");
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
      cldrDom.removeClass(menubuttons.lastspecial, "selected");
    }

    updateLocaleMenu(menuMap);

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

  function unpackMenus(json) {
    const menus = json.menus;

    if (_thePages) {
      for (let k in menus.sections) {
        const oldSection = _thePages.sectionMap[menus.sections[k].id];
        for (let j in menus.sections[k].pages) {
          const oldPage = oldSection.pageMap[menus.sections[k].pages[j].id];

          // copy over levels
          oldPage.levs[json.loc] = menus.sections[k].pages[j].levs[json.loc];
        }
      }
    } else {
      // set up some hashes
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
          menus.pageToSection[menus.sections[k].pages[j].id] =
            menus.sections[k];
        }
      }
      _thePages = menus;
    }

    for (let k in _thePages.sectionMap) {
      let min = 200;
      for (let j in _thePages.sectionMap[k].pageMap) {
        const thisLev = parseInt(
          _thePages.sectionMap[k].pageMap[j].levs[json.loc]
        );
        if (min > thisLev) {
          min = thisLev;
        }
      }
      _thePages.sectionMap[k].minLev[json.loc] = min;
    }

    _thePages.haveLocs[json.loc] = true;
  }

  function update() {
    cldrMenu.updateLocaleMenu();

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
      const specialItems = makeMenuArray();
      if (!_thePages || _thePages.loc != curLocale) {
        getMenusFromServer(specialItems);
      } else {
        // go ahead and update
        updateMenus(_thePages, specialItems);
      }
    }
  }

  function makeMenuArray() {
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
    const surveyUserURL = {
      // TODO: make these all like #about -- no url or jsp here
      myAccountSetting: "survey?do=listu",
      disableMyAccount: "lock.jsp",
      xmlUpload: "upload.jsp?a=/cldr-apps/survey&s=" + sessionId,
      manageUser: "survey?do=list",
      flag: "tc-flagged.jsp?s=" + sessionId,
      browse: "browse.jsp",
    };

    /**
     * 'name' - the js/special/___.js name
     * 'hidden' - true to hide the item
     * 'title' - override of menu name
     */
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

  function canModifyLoc(subLoc) {
    if (canmodify && subLoc in canmodify) {
      return true;
    } else {
      return false;
    }
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

  function getThePages() {
    return _thePages;
  }

  function pseudoDijitRegistryById(id) {
    // TODO: implement a replacement for dijit/Registry byId()
    // https://dojotoolkit.org/reference-guide/1.10/dijit/registry.html
    console.log("pseudoDijitRegistryById not implemented yet! id = " + id);
    return null;
  }

  function newPseudoDijitMenuItem(args) {
    // TODO: implement a replacement for dijit/MenuItem (or something simpler)
    console.log("newPseudoDijitMenuItem not implemented yet! args = " + args);
    return null;
  }

  function newPseudoDijitDropDownMenu(args) {
    // TODO: implement a replacement for dijit/DropDownMenu (or something simpler)
    console.log(
      "newPseudoDijitDropDownMenu not implemented yet! args = " + args
    );
    return null;
  }

  function newPseudoDijitDropDownButton(args) {
    // TODO: implement a replacement for dijit/DropDownButton (or something simpler)
    console.log(
      "newPseudoDijitDropDownButton not implemented yet! args = " + args
    );
    return null;
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
    updateLocaleMenu,

    /*
     * The following are meant to be accessible for unit testing only:
     */
    // test: {
    //   f: f,
    // },
  };
})();
