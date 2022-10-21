import * as cldrTest from "./TestCldrTest.js";

import * as cldrAccount from "../src/esm/cldrAccount.js";
import * as cldrOrganizations from "../src/esm/cldrOrganizations.js";

export const TestCldrAccount = "ok";

const assert = chai.assert;

const json = {
  visitors: "",
  isBusted: "0",
  what: "user_list",
  err: "",
  org: "surveytool",
  preset_do: "",
  SurveyOK: "1",
  preset_fromint: -1,
  userPerms: {
    canCreateUsers: true,
    canModifyUsers: true,
  },
  shownUsers: [
    {
      voteCountMenu: [4, 100],
      votecount: 100,
      org: "surveytool",
      lastlogin: "2021-02-04 17:12:04.0",
      userCanDeleteUser: false,
      userlevelName: "admin",
      active: "0 sec.",
      seen: "19 sec.",
      locales: "*",
      userlevel: 0,
      emailHash: "f8450a97cc7e38e6d109425c87b41634",
      name: "admin",
      havePermToChange: true,
      id: 1,
      actions: {},
      email: "admin@",
    },
  ],
  uptime: "",
  isSetup: "1",
};

const levelsJson = {
  0: {
    string: "0: (ADMIN)",
    isManagerFor: true,
    name: "admin",
    canCreateOrSetLevelTo: true,
  },
  1: {
    string: "1: (TC)",
    isManagerFor: true,
    name: "tc",
    canCreateOrSetLevelTo: true,
  },
  2: {
    string: "2: (MANAGER)",
    isManagerFor: true,
    name: "manager",
    canCreateOrSetLevelTo: true,
  },
  5: {
    string: "5: (VETTER)",
    isManagerFor: true,
    name: "vetter",
    canCreateOrSetLevelTo: true,
  },
  8: {
    string: "8: (ANONYMOUS)",
    isManagerFor: true,
    name: "anonymous",
    canCreateOrSetLevelTo: true,
  },
  999: {
    string: "999: (LOCKED)",
    isManagerFor: true,
    name: "locked",
    canCreateOrSetLevelTo: true,
  },
  10: {
    string: "10: (GUEST)",
    isManagerFor: true,
    name: "guest",
    canCreateOrSetLevelTo: true,
  },
};

const orgsJson = {
  map: {
    Adobe: "adobe",
    "Afghan CSA": "afghan_csa",
    "Afghan MCIT": "afghan_mcit",
    Afrigen: "afrigen",
    Apple: "apple",
    Bangladesh: "bangladesh",
    "Bangor Univ.": "bangor_univ",
    "Bhutan DDC": "bhutan",
    "Cherokee Nation": "cherokee",
    Cldr: "cldr",
    "Foras na Gaeilge": "gaeilge",
    "Georgia ISI": "georgia_isi",
    "Gnome Foundation": "gnome",
    Google: "google",
    "High Coverage and Generated": "special",
    IBM: "ibm",
    "Il-Kunsill Nazzjonali tal-Ilsien Malti": "kunsill_malti",
    "India MIT": "india",
    "Iran HCI": "iran_hci",
    "Kendra (Nepal)": "kendra",
    "Kotoistus (Finnish IT Ctr)": "kotoistus",
    "Lakota LC": "lakota_lc",
    "Lao Posts/Telecom??": "lao_dpt",
    "Lia Rumantscha": "rumantscha",
    Meta: "meta",
    Microsoft: "microsoft",
    Mozilla: "mozilla",
    Netflix: "netflix",
    "Nyiakeng Puachue Hmong": "nyiakeng_puachue_hmong",
    "Office of Breton Lang": "breton",
    "Open Inst (Cambodia)": "openinstitute",
    "Open Office": "openoffice_org",
    Oracle: "oracle",
    Pakistan: "pakistan",
    Rodakych: "rodakych",
    "Rohingya Language Council": "rohingyazuban",
    SIL: "sil",
    Sardware: "sardware",
    "Sri Lanka ICTA": "srilanka",
    "Survey Tool": "surveytool",
    "The Long Now Foundation": "longnow",
    Unaffiliated: "unaffiliated",
    "VeC - Lengua Veneta": "venetian",
    "WOD N’ko": "wod_nko",
    "Welsh LC": "welsh_lc",
    "Wikimedia Foundation": "wikimedia",
    "Winden Jangen Adlam": "adlam",
    Yahoo: "yahoo",
  },
};

cldrAccount.setMockLevels(levelsJson);
const orgs = cldrOrganizations.loadOrgs(orgsJson);
cldrAccount.setMockOrgs(orgs);

describe("cldrAccount.getTable", function () {
  const html = cldrAccount.getTable(json);

  it("should not return null or empty", function () {
    assert(html != null && html !== "", "html is neither null nor empty");
  });

  const xml = "<div>" + html + "</div>";
  const xmlStr = cldrTest.parseAsMimeType(xml, "application/xml");
  it("should return valid xml when in div element", function () {
    assert(xmlStr || false, "parses OK as xml when in div element");
  });

  const htmlStr = cldrTest.parseAsMimeType(html, "text/html");
  it("should return good html", function () {
    assert(htmlStr || false, "parses OK as html");
  });

  it("should contain angle brackets", function () {
    assert(
      htmlStr.indexOf("<") !== -1 && htmlStr.indexOf(">") !== -1,
      "does contain angle brackets"
    );
  });
});

describe("cldrAccount.getHtml", function () {
  const html = cldrAccount.getHtml(json);

  it("should not return null or empty", function () {
    assert(html != null && html !== "", "html is neither null nor empty");
  });

  const xml = "<div>" + html + "</div>";
  const xmlStr = cldrTest.parseAsMimeType(xml, "application/xml");
  it("should return valid xml when in div element", function () {
    assert(xmlStr || false, "parses OK as xml when in div element");
  });

  const htmlStr = cldrTest.parseAsMimeType(html, "text/html");
  it("should return good html", function () {
    assert(htmlStr || false, "parses OK as html");
  });

  it("should contain angle brackets", function () {
    assert(
      htmlStr.indexOf("<") !== -1 && htmlStr.indexOf(">") !== -1,
      "does contain angle brackets"
    );
  });
});
