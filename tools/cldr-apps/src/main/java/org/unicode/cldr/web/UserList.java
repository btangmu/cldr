package org.unicode.cldr.web;

import java.io.PrintWriter;
import java.net.URLEncoder;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

import javax.servlet.http.HttpServletRequest;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import org.unicode.cldr.util.Organization;
import org.unicode.cldr.util.TransliteratorUtilities;
import org.unicode.cldr.util.VoteResolver;
import org.unicode.cldr.web.SurveyAjax.JSONWriter;
import org.unicode.cldr.web.SurveyException.ErrorCode;
import org.unicode.cldr.web.UserRegistry.InfoType;

public class UserList {

    public static void getJson(PrintWriter out, JSONWriter r, HttpServletRequest request,
            CookieSession mySession, SurveyMain sm) throws JSONException, SurveyException {
        if (!mySession.user.isAdminForOrg(mySession.user.org)) {
            r.put("err", "You do not have permission to list users.");
            out.print(r.toString());
            return;
        }
        try {
            Connection conn = null;
            ResultSet rs = null;
            PreparedStatement ps = null;
            JSONArray users = new JSONArray();
            final String forOrg = (UserRegistry.userIsAdmin(mySession.user)) ? null : mySession.user.org;
            try {
                conn = DBUtils.getInstance().getDBConnection();
                ps = sm.reg.list(forOrg, conn);
                rs = ps.executeQuery();
                // id,userlevel,name,email,org,locales,intlocs,lastlogin
                while (rs.next()) {
                    int id = rs.getInt("id");
                    UserRegistry.User them = sm.reg.getInfo(id);
                    users.put(JSONWriter.wrap(them)
                        .put("locales", rs.getString("locales"))
                        .put("lastlogin", rs.getTimestamp("lastlogin"))
                        .put("intlocs", rs.getString("intlocs")));
                }
            } finally {
                DBUtils.close(rs, ps, conn);
            }
            r.put("what", SurveyAjax.WHAT_USER_LIST);
            r.put("users", users);
            r.put("org", forOrg);
            JSONObject userPerms = new JSONObject();
            final boolean userCanCreateUsers = UserRegistry.userCanCreateUsers(mySession.user);
            userPerms.put("canCreateUsers", userCanCreateUsers);
            if (userCanCreateUsers) {
                final org.unicode.cldr.util.VoteResolver.Level myLevel = mySession.user.getLevel();
                final Organization myOrganization = mySession.user.getOrganization();
                JSONObject forLevel = new JSONObject();
                for (VoteResolver.Level v : VoteResolver.Level.values()) {
                    JSONObject jo = new JSONObject();
                    jo.put("canCreateOrSetLevelTo", myLevel.canCreateOrSetLevelTo(v));
                    jo.put("isManagerFor", myLevel.isManagerFor(myOrganization, v, myOrganization));
                    forLevel.put(v.name(), jo);
                }
                userPerms.put("forLevel", forLevel);
            }
            r.put("userPerms", userPerms);
            out.print(r.toString());
        } catch (SQLException e) {
            SurveyLog.logException(e, "listing users for " + mySession.user.toString());
            throw new SurveyException(ErrorCode.E_INTERNAL, "Internal error listing users: " + e.toString());
        }
    }

    private static final String LIST_ACTION_SETLEVEL = "set_userlevel_";
    private static final String LIST_ACTION_NONE = "-";
    private static final String LIST_ACTION_SHOW_PASSWORD = "showpassword_";
    private static final String LIST_ACTION_SEND_PASSWORD = "sendpassword_";
    private static final String LIST_ACTION_SETLOCALES = "set_locales_";
    private static final String LIST_ACTION_DELETE0 = "delete0_";
    private static final String LIST_ACTION_DELETE1 = "delete_";
    private static final String LIST_JUST = "justu";
    private static final String LIST_MAILUSER = "mailthem";
    private static final String LIST_MAILUSER_WHAT = "mailthem_t";
    private static final String LIST_MAILUSER_CONFIRM = "mailthem_c";
    private static final String LIST_MAILUSER_CONFIRM_CODE = "confirm";

    private static final String PREF_SHOWLOCKED = "p_showlocked";

    private void doList(WebContext ctx) {
        int n = 0;
        String just = ctx.field(LIST_JUST);
        String doWhat = ctx.field(SurveyMain.QUERY_DO);
        boolean justme = false; // "my account" mode
        String listName = "list";
        if (just.length() == 0) {
            just = null;
        } else {
            justme = ctx.session.user.email.equals(just);
        }
        if (doWhat.equals("listu")) {
            listName = "listu";
            just = ctx.session.user.email;
            justme = true;
        }
        WebContext subCtx = new WebContext(ctx);
        subCtx.setQuery(SurveyMain.QUERY_DO, doWhat);

        /*** TODO
        if (justme) {
            printHeader(ctx, "My Account");
        } else {
            printHeader(ctx, "List Users" + ((just == null) ? "" : (" - " + just)));
        }
        printUserTableWithHelp(ctx, "/AddModifyUser");
        // see usermenu.jsp
        ***/

        if (UserRegistry.userIsTC(ctx.session.user)) {
            ctx.println("| <a class='notselected' href='v#tc-emaillist'>Email Address of Users Who Participated</a>");
            ctx.print(" | ");
        }

        if (UserRegistry.userCanCreateUsers(ctx.session.user)) {
            /*** TODO
            showAddUser(ctx);
            ***/
        }
        ctx.print("<br>");
        ctx.println("<a href='" + ctx.url() + "'><b>SurveyTool main</b></a><hr>");
        String org = ctx.session.user.org;
        if (just != null) {
            ctx.println("<a href='" + ctx.url() + ctx.urlConnector() + "do=list&p_justorg='>\u22d6 Show all users</a><br>");
        }
        if (UserRegistry.userIsAdmin(ctx.session.user)) {
            if (just == null) { // show a filter
                String list0[] = UserRegistry.getOrgList();
                String list1[] = new String[list0.length + 1];
                System.arraycopy(list0, 0, list1, 1, list0.length);
                list1[0] = "Show All";
                /*** TODO
                org = showListSetting(subCtx, "p_justorg", "Filter Organization", list1, true);
                if (org.equals(list1[0])) {
                    org = null;
                }
                ***/
            } else {
                org = null; // all
            }
        }
        String sendWhat = ctx.field(LIST_MAILUSER_WHAT);
        boolean areSendingMail = false;
        boolean didConfirmMail = false;
        boolean showLocked = ctx.prefBool(PREF_SHOWLOCKED);
        // sending a dispute note?
        boolean areSendingDisp = (ctx.field(LIST_MAILUSER + "_d").length()) > 0;
        String mailBody = null;
        String mailSubj = null;
        boolean hideUserList = false;
        if (UserRegistry.userCanEmailUsers(ctx.session.user)) {
            if (ctx.field(LIST_MAILUSER_CONFIRM).equals(LIST_MAILUSER_CONFIRM_CODE)) {
                ctx.println("<h1>sending mail to users...</h4>");
                didConfirmMail = true;
                mailBody = "SurveyTool Message ---\n" + sendWhat
                    + "\n--------\n\nSurvey Tool: http://st.unicode.org" + ctx.base() + "\n\n";
                mailSubj = "CLDR SurveyTool message from " + ctx.session.user.name;
                if (!areSendingDisp) {
                    areSendingMail = true; // we are ready to go ahead and mail..
                }
            } else if (ctx.hasField(LIST_MAILUSER_CONFIRM)) {
                ctx.println("<h1 class='ferrbox'>" + ctx.iconHtml("stop", "emails did not match")
                    + " not sending mail - you did not confirm the email address. See form at bottom of page." + "</h1>");
            }

            if (!areSendingMail && !areSendingDisp && ctx.hasField(LIST_MAILUSER)) {
                hideUserList = true; // hide the user list temporarily.
            }
        }
        Connection conn = null;
        PreparedStatement ps = null;
        java.sql.ResultSet rs = null;

        SurveyMain sm = CookieSession.sm;
        UserRegistry reg = sm.reg;

        try {
            conn = sm.dbUtils.getDBConnection();
            synchronized (reg) {
                ps = reg.list(org, conn);
                rs = ps.executeQuery();
                if (rs == null) {
                    ctx.println("<i>No results...</i>");
                    return;
                }
                if (org == null) {
                    org = "ALL"; // all
                }
                if (justme) {
                    ctx.println("<h2>My Account</h2>");
                } else {
                    ctx.println("<h2>Users for " + org + "</h2>");
                    if (UserRegistry.userIsTC(ctx.session.user)) {
                        /*** TODO
                        showTogglePref(subCtx, PREF_SHOWLOCKED, "Show locked users:");
                        ***/
                    }
                    ctx.println("<br>");
                    if (UserRegistry.userCanModifyUsers(ctx.session.user)) {
                        ctx.println("<div class='fnotebox'>"
                            + "Changing user level or locales while a user is active will result in  "
                            + " destruction of their session. Check if they have been working recently.</div>");
                    }
                }
                // Preset box
                boolean preFormed = false;

                if (hideUserList) {
                    String warnHash = "userlist";
                    ctx.println("<div id='h_" + warnHash + "'><a href='javascript:show(\"" + warnHash + "\")'>"
                        + "<b>+</b> Click here to show the user list...</a></div>");
                    ctx.println("<!-- <noscript>Warning: </noscript> -->" + "<div style='display: none' id='" + warnHash + "'>");
                    ctx.println("<a href='javascript:hide(\"" + warnHash + "\")'>" + "(<b>- hide userlist</b>)</a><br>");

                }

                if ((just == null) && UserRegistry.userCanModifyUsers(ctx.session.user) && !justme) {
                    ctx.println("<div class='pager' style='align: right; float: right; margin-left: 4px;'>");
                    ctx.println("<form method=POST action='" + ctx.base() + "'>");
                    ctx.printUrlAsHiddenFields();
                    ctx.println("Set menus:<br><label>all ");
                    ctx.println("<select name='preset_from'>");
                    ctx.println("   <option>" + LIST_ACTION_NONE + "</option>");
                    for (int i = 0; i < UserRegistry.ALL_LEVELS.length; i++) {
                        ctx.println("<option class='user" + UserRegistry.ALL_LEVELS[i] + "' ");
                        ctx.println(" value='" + UserRegistry.ALL_LEVELS[i] + "'>"
                            + UserRegistry.levelToStr(ctx, UserRegistry.ALL_LEVELS[i]) + "</option>");
                    }
                    ctx.println("</select></label> <br>");
                    ctx.println(" <label>to");
                    ctx.println("<select name='preset_do'>");
                    ctx.println("   <option>" + LIST_ACTION_NONE + "</option>");

                    ctx.println("   <option value='" + LIST_ACTION_SHOW_PASSWORD + "'>Show password URL...</option>");
                    ctx.println("   <option value='" + LIST_ACTION_SEND_PASSWORD + "'>Resend password...</option>");
                    ctx.println("</select></label> <br>");
                    ctx.println("<input type='submit' name='do' value='" + listName + "'></form>");
                    if ((ctx.field("preset_from").length() > 0) && !ctx.field("preset_from").equals(LIST_ACTION_NONE)) {
                        ctx.println("<hr><i><b>Menus have been pre-filled. <br> Confirm your choices and click Change.</b></i>");
                        ctx.println("<form method=POST action='" + ctx.base() + "'>");
                        ctx.println("<input type='submit' name='doBtn' value='Change'>");
                        preFormed = true;
                    }
                    ctx.println("</div>");
                }
                int preset_fromint = ctx.fieldInt("preset_from", -1);
                String preset_do = ctx.field("preset_do");
                if (preset_do.equals(LIST_ACTION_NONE)) {
                    preset_do = "nothing";
                }
                if (/* (just==null)&& */((UserRegistry.userCanModifyUsers(ctx.session.user))) && !preFormed) { // form
                    // was
                    // already
                    // started,
                    // above
                    ctx.println("<form method=POST action='" + ctx.base() + "'>");
                }
                if (just != null) {
                    ctx.print("<input type='hidden' name='" + LIST_JUST + "' value='" + just + "'>");
                }
                if (justme || UserRegistry.userCanModifyUsers(ctx.session.user)) {
                    ctx.printUrlAsHiddenFields();
                    ctx.println("<input type='hidden' name='do' value='" + listName + "'>");
                    ctx.println("<input type='submit' name='doBtn' value='Do Action'>");
                }
                ctx.println("<table id='userListTable' summary='User List' class='userlist' border='2'>");
                ctx.println(
                    "<thead> <tr><th></th><th>Organization / Level</th><th>Name/Email</th><th>Action</th><th>Locales</th><th>Seen</th></tr></thead><tbody>");
                String oldOrg = null;
                int locked = 0;
                JSONArray shownUsers = new JSONArray();
                while (rs.next()) {
                    int theirId = rs.getInt(1);
                    int theirLevel = rs.getInt(2);
                    /*
                     * In this context always silently skip anonymous users. Don't send email to anon20@example.org.
                     * This interface could be changed to treat anonymous users more like locked users, if there is
                     * ever motivation; but anonymous users should never be sent email.
                     * Reference: https://unicode.org/cldr/trac/ticket/11517
                     */
                    if (theirLevel == UserRegistry.ANONYMOUS) {
                        continue;
                    }
                    if (!showLocked
                        && theirLevel >= UserRegistry.LOCKED
                        && just == null /* if only one user, show regardless of lock state. */) {
                        locked++;
                        continue;
                    }
                    String theirName = DBUtils.getStringUTF8(rs, 3);// rs.getString(3);
                    String theirEmail = rs.getString(4);
                    String theirOrg = rs.getString(5);
                    String theirLocales = rs.getString(6);
                    java.sql.Timestamp theirLast = rs.getTimestamp(8);
                    boolean havePermToChange = ctx.session.user.isAdminFor(reg.getInfo(theirId));

                    String theirTag = theirId + "_" + theirEmail; // ID+email -
                    // prevents
                    // stale
                    // data.
                    // (i.e.
                    // delete of
                    // user 3 if
                    // the rows
                    // change..)
                    String action = ctx.field(theirTag);
                    CookieSession theUser = CookieSession.retrieveUserWithoutTouch(theirEmail);

                    if (just != null && !just.equals(theirEmail)) {
                        continue;
                    }
                    n++;

                    shownUsers.put(reg.getInfo(theirId));

                    if ((just == null) && (!justme) && (!theirOrg.equals(oldOrg))) {
                        ctx.println("<tr class='heading' ><th class='partsection' colspan='6'><a name='" + theirOrg + "'><h4>"
                            + theirOrg + "</h4></a></th></tr>");
                        oldOrg = theirOrg;
                    }

                    ctx.println("  <tr id='u@" + theirId + "' class='user" + theirLevel + "'>");

                    if (areSendingMail && (theirLevel < UserRegistry.LOCKED)) {
                        ctx.print("<td class='framecell'>");
                        MailSender.getInstance().queue(ctx.userId(), theirId, mailSubj, mailBody);
                        ctx.println("(queued)</td>");
                    }
                    // first: DO.

                    if (havePermToChange) { // do stuff

                        String msg = null;
                        if (ctx.field(LIST_ACTION_SETLOCALES + theirTag).length() > 0) {
                            ctx.println("<td class='framecell' >");
                            String newLocales = ctx.field(LIST_ACTION_SETLOCALES + theirTag);
                            msg = reg.setLocales(ctx, theirId, theirEmail, newLocales);
                            ctx.println(msg);
                            theirLocales = newLocales; // MODIFY
                            if (theUser != null) {
                                ctx.println("<br/><i>Logging out user session " + theUser.id
                                    + " and deleting all unsaved changes</i>");
                                theUser.remove();
                            }
                            UserRegistry.User newThem = reg.getInfo(theirId);
                            if (newThem != null) {
                                theirLocales = newThem.locales; // update
                            }
                            ctx.println("</td>");
                        } else if ((action != null) && (action.length() > 0) && (!action.equals(LIST_ACTION_NONE))) { // other
                            // actions
                            ctx.println("<td class='framecell'>");

                            // check an explicit list. Don't allow random levels
                            // to be set.
                            for (int i = 0; i < UserRegistry.ALL_LEVELS.length; i++) {
                                if (action.equals(LIST_ACTION_SETLEVEL + UserRegistry.ALL_LEVELS[i])) {
                                    if ((just == null) && (UserRegistry.ALL_LEVELS[i] <= UserRegistry.TC)) {
                                        ctx.println("<b>Must be zoomed in on a user to promote them to TC</b>");
                                    } else {
                                        msg = reg.setUserLevel(ctx, theirId, theirEmail, UserRegistry.ALL_LEVELS[i]);
                                        ctx.println("Set user level to "
                                            + UserRegistry.levelToStr(ctx, UserRegistry.ALL_LEVELS[i]));
                                        ctx.println(": " + msg);
                                        theirLevel = UserRegistry.ALL_LEVELS[i];
                                        if (theUser != null) {
                                            ctx.println("<br/><i>Logging out user session " + theUser.id + "</i>");
                                            theUser.remove();
                                        }
                                    }
                                }
                            }

                            if (action.equals(LIST_ACTION_SHOW_PASSWORD)) {
                                String pass = reg.getPassword(ctx, theirId);
                                if (pass != null) {
                                    UserRegistry.printPasswordLink(ctx, theirEmail, pass);
                                    ctx.println(" <tt class='winner'>" + pass + "</tt>");
                                }
                            } else if (action.equals(LIST_ACTION_SEND_PASSWORD)) {
                                String pass = reg.getPassword(ctx, theirId);
                                if (pass != null && theirLevel < UserRegistry.LOCKED) {
                                    UserRegistry.printPasswordLink(ctx, theirEmail, pass);
                                    /*** TODO
                                    notifyUser(ctx, theirEmail, pass);
                                    ***/
                                }
                            } else if (action.equals(LIST_ACTION_DELETE0)) {
                                ctx.println("Ensure that 'confirm delete' is chosen at right and click Do Action to delete..");
                            } else if ((UserRegistry.userCanDeleteUser(ctx.session.user, theirId, theirLevel))
                                && (action.equals(LIST_ACTION_DELETE1))) {
                                msg = reg.delete(ctx, theirId, theirEmail);
                                ctx.println("<strong style='font-color: red'>Deleting...</strong><br>");
                                ctx.println(msg);
                            } else if ((UserRegistry.userCanModifyUser(ctx.session.user, theirId, theirLevel))
                                && (action.equals(LIST_ACTION_SETLOCALES))) {
                                if (theirLocales == null) {
                                    theirLocales = "";
                                }
                                ctx.println("<label>Locales: (space separated) <input id='" + LIST_ACTION_SETLOCALES + theirTag + "' name='"
                                    + LIST_ACTION_SETLOCALES + theirTag
                                    + "' value='" + theirLocales + "'></label>");
                                ctx.println("<button onclick=\"{document.getElementById('" + LIST_ACTION_SETLOCALES + theirTag
                                    + "').value='*'; return false;}\" >All Locales</button>");
                            } else if (UserRegistry.userCanDeleteUser(ctx.session.user, theirId, theirLevel)) {
                                // change of other stuff.
                                UserRegistry.InfoType type = UserRegistry.InfoType.fromAction(action);

                                if (UserRegistry.userIsAdmin(ctx.session.user) && type == UserRegistry.InfoType.INFO_PASSWORD) {
                                    String what = "password";

                                    String s0 = ctx.field("string0" + what);
                                    String s1 = ctx.field("string1" + what);
                                    if (s0.equals(s1) && s0.length() > 0) {
                                        ctx.println("<h4>Change " + what + " to <tt class='codebox'>" + s0 + "</tt></h4>");
                                        action = ""; // don't popup the menu
                                        // again.

                                        msg = reg.updateInfo(ctx, theirId, theirEmail, type, s0);
                                        ctx.println("<div class='fnotebox'>" + msg + "</div>");
                                        ctx.println("<i>click Change again to see changes</i>");
                                    } else {
                                        ctx.println("<h4>Change " + what + "</h4>");
                                        if (s0.length() > 0) {
                                            ctx.println("<p class='ferrbox'>Both fields must match.</p>");
                                        }
                                        ctx.println(
                                            "<p role='alert' style='font-size: 1.5em;'><em>PASSWORDS MAY BE VISIBLE AS PLAIN TEXT. USE OF A RANDOM PASSWORD (as suggested) IS STRONGLY RECOMMENDED.</em></p>");
                                        ctx.println("<label><b>New " + what + ":</b><input type='password' name='string0" + what
                                            + "' value='" + s0 + "'></label><br>");
                                        ctx.println("<label><b>New " + what + ":</b><input type='password' name='string1" + what
                                            + "'> (confirm)</label>");

                                        ctx.println("<br><br>");
                                        ctx.println("(Suggested random password: <tt>" + UserRegistry.makePassword(theirEmail)
                                            + "</tt> )");
                                    }
                                } else if (type != null) {
                                    String what = type.toString();

                                    String s0 = ctx.field("string0" + what);
                                    String s1 = ctx.field("string1" + what);
                                    if (type == InfoType.INFO_ORG)
                                        s1 = s0; /* ignore */
                                    if (s0.equals(s1) && s0.length() > 0) {
                                        ctx.println("<h4>Change " + what + " to <tt class='codebox'>" + s0 + "</tt></h4>");
                                        action = ""; // don't popup the menu
                                        // again.

                                        msg = reg.updateInfo(ctx, theirId, theirEmail, type, s0);
                                        ctx.println("<div class='fnotebox'>" + msg + "</div>");
                                        ctx.println("<i>click Change again to see changes</i>");
                                    } else {
                                        ctx.println("<h4>Change " + what + "</h4>");
                                        if (s0.length() > 0) {
                                            ctx.println("<p class='ferrbox'>Both fields must match.</p>");
                                        }
                                        if (type == InfoType.INFO_ORG) {
                                            ctx.println("<select name='string0" + what + "'>");
                                            ctx.println("<option value='' >Choose...</option>");
                                            for (String o : UserRegistry.getOrgList()) {
                                                ctx.print("<option value='" + o + "' ");
                                                if (o.equals(theirOrg)) {
                                                    ctx.print(" selected='selected' ");
                                                }
                                                ctx.println(">" + o + "</option>");
                                            }
                                            ctx.println("</select>");
                                        } else {
                                            ctx.println("<label><b>New " + what + ":</b><input name='string0" + what
                                                + "' value='" + s0 + "'></label><br>");
                                            ctx.println("<label><b>New " + what + ":</b><input name='string1" + what
                                                + "'> (confirm)</label>");
                                        }
                                    }
                                }
                            } else if (theirId == ctx.session.user.id) {
                                ctx.println("<i>You can't change that setting on your own account.</i>");
                            } else {
                                ctx.println("<i>No changes can be made to this user.</i>");
                            }
                            // ctx.println("Change to " + action);
                        } else {
                            ctx.print("<td>");
                        }
                    } else {
                        ctx.print("<td>");
                    }

                    if (just == null) {
                        /*** TODO
                        printUserZoomLink(ctx, theirEmail, "");
                        ***/
                    }

                    ctx.println("</td>");

                    // org, level
                    ctx.println("    <td>" + theirOrg + "<br>" + "&nbsp; <span style='font-size: 80%' align='right'>"
                        + UserRegistry.levelToStr(ctx, theirLevel).replaceAll(" ", "&nbsp;") + "</span></td>");

                    ctx.println("    <td valign='top'><font size='-1'>#" + theirId + " </font> <a name='u_" + theirEmail + "'>"
                        + theirName + "</a>");
                    ctx.println("    <a href='mailto:" + theirEmail + "'>" + theirEmail + "</a>");
                    ctx.print("</td><td>");
                    if (havePermToChange) {
                        // Was something requested?

                        { // PRINT MENU
                            ctx.print("<select name='" + theirTag + "'  ");
                            if (just != null) {
                                ctx.print(" onchange=\"this.form.submit()\" ");
                            }
                            ctx.print(">");

                            // set user to VETTER
                            ctx.println("   <option value=''>" + LIST_ACTION_NONE + "</option>");
                            for (int i = 0; i < UserRegistry.ALL_LEVELS.length; i++) {
                                int lev = UserRegistry.ALL_LEVELS[i];
                                if (just == null && lev != UserRegistry.LOCKED) {
                                    continue; // only allow mass LOCK (for now)
                                }
                                /*** TODO
                                doChangeUserOption(ctx, lev, theirLevel, false);
                                ***/
                            }
                            ctx.println("   <option disabled>" + LIST_ACTION_NONE + "</option>");
                            ctx.println("   <option ");
                            if ((preset_fromint == theirLevel) && preset_do.equals(LIST_ACTION_SHOW_PASSWORD)) {
                                ctx.println(" SELECTED ");
                            }
                            ctx.println(" value='" + LIST_ACTION_SHOW_PASSWORD + "'>Show password...</option>");
                            ctx.println("   <option ");
                            if ((preset_fromint == theirLevel) && preset_do.equals(LIST_ACTION_SEND_PASSWORD)) {
                                ctx.println(" SELECTED ");
                            }
                            ctx.println(" value='" + LIST_ACTION_SEND_PASSWORD + "'>Send password...</option>");

                            if (just != null) {
                                if (havePermToChange) {
                                    ctx.println("   <option ");
                                    ctx.println(" value='" + LIST_ACTION_SETLOCALES + "'>Set locales...</option>");
                                }
                                if (UserRegistry.userCanDeleteUser(ctx.session.user, theirId, theirLevel)) {
                                    ctx.println("   <option>" + LIST_ACTION_NONE + "</option>");
                                    if ((action != null) && action.equals(LIST_ACTION_DELETE0)) {
                                        ctx.println("   <option value='" + LIST_ACTION_DELETE1
                                            + "' SELECTED>Confirm delete</option>");
                                    } else {
                                        ctx.println("   <option ");
                                        if ((preset_fromint == theirLevel) && preset_do.equals(LIST_ACTION_DELETE0)) {
                                            // ctx.println(" SELECTED ");
                                        }
                                        ctx.println(" value='" + LIST_ACTION_DELETE0 + "'>Delete user..</option>");
                                    }
                                }
                                if (just != null) { // only do these in 'zoomin'
                                    // view.
                                    ctx.println("   <option disabled>" + LIST_ACTION_NONE + "</option>");

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
                            }
                            ctx.println("    </select>");
                        } // end menu
                    }
                    if (ctx.session.user.isAdminFor(reg.getInfo(theirId))) {
                        ctx.println("<br><a href='" + ctx.context("upload.jsp?s=" + ctx.session.id + "&email=" + theirEmail)
                            + "'>Upload XML...</a>");
                    }
                    ctx.println("<br><a class='recentActivity' href='" + ctx.context("myvotes.jsp?user=" + theirId) + "'>User Activity</a>");
                    ctx.println("</td>");

                    if (theirLevel <= UserRegistry.MANAGER) {
                        ctx.println(" <td>" + UserRegistry.prettyPrintLocale(null) + "</td> ");
                    } else {
                        ctx.println(" <td>" + UserRegistry.prettyPrintLocale(theirLocales) + "</td>");
                    }

                    // are they logged in?
                    if ((theUser != null) && UserRegistry.userCanModifyUsers(ctx.session.user)) {
                        ctx.println("<td>");
                        ctx.println("<b>active: " + SurveyMain.timeDiff(theUser.getLastBrowserCallMillisSinceEpoch()) + " ago</b>");
                        if (UserRegistry.userIsAdmin(ctx.session.user)) {
                            ctx.print("<br/>");
                            /** TODO
                            printLiveUserMenu(ctx, theUser);
                            **/
                        }
                        ctx.println("</td>");
                    } else if (theirLast != null) {
                        ctx.println("<td>");
                        ctx.println("<b>seen: " + SurveyMain.timeDiff(theirLast.getTime()) + " ago</b>");
                        ctx.print("<br/><font size='-2'>");
                        ctx.print(theirLast.toString());
                        ctx.println("</font></td>");
                    }

                    ctx.println("  </tr>");
                }
                ctx.println("</tbody></table>");

                // now, serialize the list..

                ctx.println("<script>var shownUsers = " + shownUsers.toString() + ";\n" +
                        "cldrSurvey.showUserActivity(shownUsers, 'userListTable');\n</script>\n");
                if (hideUserList) {
                    ctx.println("</div>");
                }
                if (!justme) {
                    ctx.println("<div style='font-size: 70%'>Number of users shown: " + n + "</div><br>");

                    if (n == 0 && just != null && !just.isEmpty()) {
                        UserRegistry.User u = reg.get(just);
                        if (u == null) {
                            ctx.println("<h3 class='ferrbox'>" + ctx.iconHtml("stop", "Not Found Error") + " User '" + just
                                + "' does not exist.</h3>");
                        } else {
                            ctx.println("<h3 class='ferrbox'>" + ctx.iconHtml("stop", "Not Found Error") + " User '" + just
                                + "' from organization " + u.org + " is not visible to you. Ask an administrator.</h3>");
                        }
                    }

                    if ((UserRegistry.userIsExactlyManager(ctx.session.user) || UserRegistry.userIsTC(ctx.session.user))
                        && locked > 0) {
                        sm.showTogglePref(subCtx, PREF_SHOWLOCKED, "Show " + locked + " locked users:");
                    }
                }
                if (!justme && UserRegistry.userCanModifyUsers(ctx.session.user)) {
                    if ((n > 0) && UserRegistry.userCanEmailUsers(ctx.session.user)) {
                        /*
                         * send a mass email to users
                         */
                        if (ctx.field(LIST_MAILUSER).length() == 0) {
                            ctx.println("<label><input type='checkbox' value='y' name='" + LIST_MAILUSER
                                + "'>Check this box to compose a message to these " + n
                                + " users (excluding LOCKED users).</label>");
                        } else {
                            ctx.println("<p><div class='pager'>");
                            ctx.println("<h4>Mailing " + n + " users</h4>");
                            if (didConfirmMail) {
                                if (areSendingDisp) {
                                    throw new InternalError("Not implemented - see DisputePageManager");
                                } else {
                                    ctx.println("<b>Mail sent.</b><br>");
                                }
                            } else { // dont' allow resend option
                                ctx.println("<input type='hidden' name='" + LIST_MAILUSER + "' value='y'>");
                            }
                            ctx.println("From: <b>(depends on recipient organization)</b><br>");
                            if (sendWhat.length() > 0) {
                                ctx.println("<div class='odashbox'>"
                                    + TransliteratorUtilities.toHTML.transliterate(sendWhat).replaceAll("\n", "<br>")
                                    + "</div>");
                                if (!didConfirmMail) {
                                    ctx.println("<input type='hidden' name='" + LIST_MAILUSER_WHAT + "' value='"
                                        + sendWhat.replaceAll("&", "&amp;").replaceAll("'", "&quot;") + "'>");
                                    if (!ctx.field(LIST_MAILUSER_CONFIRM).equals(LIST_MAILUSER_CONFIRM_CODE)
                                        && (ctx.field(LIST_MAILUSER_CONFIRM).length() > 0)) {
                                        ctx.println("<strong>" + ctx.iconHtml("stop", "confirmation did not match")
                                            + "That confirmation didn't match. Try again.</strong><br>");
                                    }
                                    ctx.println("To confirm sending, type the confirmation code <tt class='codebox'>"
                                        + LIST_MAILUSER_CONFIRM_CODE
                                        + "</tt> in this box : <input name='" + LIST_MAILUSER_CONFIRM + "'>");
                                }
                            } else {
                                ctx.println("<textarea NAME='" + LIST_MAILUSER_WHAT
                                    + "' id='body' ROWS='15' COLS='85' style='width:100%'></textarea>");
                            }
                            ctx.println("</div>");
                        }

                    }
                }
                // #level $name $email $org

                // more 'My Account' stuff
                if (justme) {
                    ctx.println("<hr>");
                    // Is the 'interest locales' list relevant?
                    if (ctx.session.user.userlevel <= UserRegistry.EXPERT) {
                        boolean intlocs_change = (ctx.field("intlocs_change").length() > 0);

                        ctx.println("<h4>Notify me about these locale groups (just the language names, no underscores or dashes):</h4>");

                        if (intlocs_change) {
                            if (ctx.field("intlocs_change").equals("t")) {
                                String newIntLocs = ctx.field("intlocs");

                                String msg = reg.setLocales(ctx, ctx.session.user.id, ctx.session.user.email, newIntLocs, true);

                                if (msg != null) {
                                    ctx.println(msg + "<br>");
                                }
                                UserRegistry.User newMe = reg.getInfo(ctx.session.user.id);
                                if (newMe != null) {
                                    ctx.session.user.intlocs = newMe.intlocs; // update
                                }
                            }

                            ctx.println("<input type='hidden' name='intlocs_change' value='t'>");
                            ctx.println("<label>Locales: <input name='intlocs' ");
                            if (ctx.session.user.intlocs != null) {
                                ctx.println("value='" + ctx.session.user.intlocs.trim() + "' ");
                            }
                            ctx.println("</input></label>");
                            if (ctx.session.user.intlocs == null) {
                                ctx.println(
                                    "<br><i>List languages only, separated by spaces.  Example: <tt class='codebox'>en fr zh</tt>. leave blank for 'all locales'.</i>");
                            }                            // ctx.println("<br>Note: changing interest locales is currently unimplemented. Check back later.<br>");
                        }

                        ctx.println("<ul><tt class='codebox'>" + UserRegistry.prettyPrintLocale(ctx.session.user.intlocs)
                            + "</tt>");
                        if (!intlocs_change) {
                            ctx.print("<a href='" + ctx.url() + ctx.urlConnector() + "do=listu&" + LIST_JUST + "="
                                + URLEncoder.encode(ctx.session.user.email) + "&intlocs_change=b' >[Change this]</a>");
                        }
                        ctx.println("</ul>");

                    } // end intlocs
                    ctx.println("<br>");
                }
                if (justme || UserRegistry.userCanModifyUsers(ctx.session.user)) {
                    ctx.println("<br>");
                    ctx.println("<input type='submit' name='doBtn' value='Do Action'>");
                    ctx.println("</form>");

                    if (!justme && UserRegistry.userCanModifyUsers(ctx.session.user)) {
                        WebContext subsubCtx = new WebContext(ctx);
                        subsubCtx.addQuery("s", ctx.session.id);
                        if (org != null) {
                            subsubCtx.addQuery("org", org);
                        }
                        subsubCtx.addQuery("do", "list");
                        subsubCtx.println("<hr><form method='POST' action='" + subsubCtx.context("DataExport.jsp") + "'>");
                        subsubCtx.printUrlAsHiddenFields();
                        subsubCtx.print("<input type='submit' class='csvDownload' value='Download .csv (including LOCKED)'>");
                        subsubCtx.println("</form>");
                    }
                }
            } /* end synchronized(reg) */
        } catch (SQLException se) {
            SurveyLog.logger.log(java.util.logging.Level.WARNING,
                "Query for org " + org + " failed: " + DBUtils.unchainSqlException(se), se);
            ctx.println("<i>Failure: " + DBUtils.unchainSqlException(se) + "</i><br>");
        } finally {
            DBUtils.close(conn, ps, rs);
        }
        if (just != null) {
            ctx.println("<a href='" + ctx.url() + ctx.urlConnector() + "do=list'>\u22d6 Show all users</a><br>");
        }
        /*** TODO
        printFooter(ctx);
        ***/
    }
}
