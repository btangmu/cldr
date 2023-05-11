package org.unicode.cldr.web;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.List;
import org.unicode.cldr.util.LocaleSet;
import org.unicode.cldr.web.api.Announcements;

public class AnnouncementData {
    private static final java.util.logging.Logger logger =
            SurveyLog.forClass(AnnouncementData.class);

    static boolean dbIsSetUp = false;

    public static void get(
            UserRegistry.User user, List<Announcements.Announcement> announcementList) {
        makeSureDbSetup();
        String body1 =
                "<p>This is a test including some html.<p>Paragraph.<p><i>Italic.</i> <b>Bold.</b> <a href='https://unicode.org'>Link to unicode.org</a>";
        String body2 = "This is a test \uD83D\uDC40 and it's generated on the back end";
        announcementList.add(
                new Announcements.Announcement(
                        123, 2222, "2023-01-17 12:30:03.0", "Wow!", body1, false));
        announcementList.add(
                new Announcements.Announcement(
                        456,
                        3333,
                        "2022-12-31 01:22:22.0",
                        "This is really so important",
                        body2,
                        true));
        LocaleSet intLoc = user.getInterestLocales();
        LocaleSet authLoc = user.getAuthorizedLocaleSet();
        System.out.println(
                "AnnouncementData.get not implemented yet; intLoc = "
                        + intLoc
                        + " authLoc = "
                        + authLoc);
    }

    public static void submit(
            Announcements.AnnouncementSubmissionRequest request,
            Announcements.AnnouncementSubmissionResponse response,
            UserRegistry.User user)
            throws SurveyException {
        makeSureDbSetup();
        try {
            int postId = savePostToDb(request, user);
            logger.fine("Saved announcement, id = " + postId);
            response.ok = true;
            response.err = "";
        } catch (SurveyException e) {
            response.ok = false;
            response.err = "An exception occured: " + e;
            logger.severe(e.getMessage());
        }
    }

    private static int savePostToDb(
            Announcements.AnnouncementSubmissionRequest request, UserRegistry.User user)
            throws SurveyException {
        int postId;
        try {
            Connection conn = null;
            PreparedStatement pAdd = null;
            try {
                conn = CookieSession.sm.dbUtils.getDBConnection();
                pAdd = prepare_pAdd(conn);
                pAdd.setInt(1, user.id); // "poster"
                DBUtils.setStringUTF8(pAdd, 2, request.subject); // "subj"
                DBUtils.setStringUTF8(pAdd, 3, request.body); // "text"
                pAdd.setString(4, request.locales); // "loc"
                pAdd.setBoolean(5, request.orgsAll); // "orgsAll"
                pAdd.setString(6, request.audience); // "audience"
                int n = pAdd.executeUpdate();
                if (conn != null) {
                    conn.commit();
                }
                postId = DBUtils.getLastId(pAdd);
                if (n != 1) {
                    throw new RuntimeException("Couldn't post announcement, update failed.");
                }
            } finally {
                DBUtils.close(pAdd, conn);
            }
        } catch (SQLException se) {
            String complaint =
                    "Couldn't post announcement - "
                            + DBUtils.unchainSqlException(se)
                            + " - pAddAnnouncement";
            SurveyLog.logException(logger, se, complaint);
            throw new SurveyException(SurveyException.ErrorCode.E_INTERNAL, complaint);
        }
        return postId;
    }

    private static PreparedStatement prepare_pAdd(Connection conn) throws SQLException {
        return DBUtils.prepareStatement(
                conn,
                "pAddAnnouncement",
                "INSERT INTO "
                        + DBUtils.Table.ANNOUNCE
                        + " (poster,subj,text,loc,orgsAll,audience)"
                        + " values (?,?,?,?,?,?)");
    }

    /**
     * Update the ANNOUNCE_READ table to indicate whether the user has read a particular
     * announcement.
     *
     * <p>If id+user is present in the table, that means the user has read (checked) it -- absent
     * means the user has not read it
     *
     * @param postId the id for the announcement
     * @param checked true if the user has read the announcement
     * @param response the CheckReadResponse
     */
    public static void checkRead(
            int postId, boolean checked, Announcements.CheckReadResponse response) {
        makeSureDbSetup();
        if (checked) {
            // add a row to ANNOUNCE_READ
        } else {
            // remove a row from ANNOUNCE_READ
        }
        System.out.println("checkRead got: id=" + postId + " checked=" + checked);
        response.ok = false;
        response.err = "End of the world: checkRead not implemented yet";
    }

    private static void makeSureDbSetup() {
        if (!dbIsSetUp) {
            dbIsSetUp = true;
            try {
                setupDB();
            } catch (SQLException e) {
                throw new RuntimeException(e);
            }
        }
    }

    private static synchronized void setupDB() throws SQLException {
        String sql = null;
        Connection conn = DBUtils.getInstance().getDBConnection();
        if (conn == null) {
            return;
        }
        try {
            if (!DBUtils.hasTable(DBUtils.Table.ANNOUNCE.toString())) {
                conn = DBUtils.getInstance().getDBConnection();
                Statement s = conn.createStatement();
                sql =
                        "CREATE TABLE "
                                + DBUtils.Table.ANNOUNCE
                                + " ( "
                                + " id INT NOT NULL "
                                + DBUtils.DB_SQL_IDENTITY
                                + ", "
                                + " poster INT NOT NULL, "
                                + " subj "
                                + DBUtils.DB_SQL_UNICODE
                                + " NOT NULL, "
                                + " text "
                                + DBUtils.DB_SQL_UNICODE
                                + " NOT NULL, "
                                + " last_time TIMESTAMP NOT NULL "
                                + DBUtils.DB_SQL_WITHDEFAULT
                                + " CURRENT_TIMESTAMP, "
                                + " loc VARCHAR(122), "
                                + " orgsAll BOOLEAN, "
                                + " audience VARCHAR(122)"
                                + " )";
                s.execute(sql);
                sql =
                        "CREATE UNIQUE INDEX "
                                + DBUtils.Table.ANNOUNCE
                                + "_id ON "
                                + DBUtils.Table.ANNOUNCE
                                + " (id) ";
                s.execute(sql);
                s.close();
                conn.commit();
            }
            if (!DBUtils.hasTable(DBUtils.Table.ANNOUNCE_READ.toString())) {
                Statement s = conn.createStatement();
                sql =
                        "CREATE TABLE "
                                + DBUtils.Table.ANNOUNCE_READ
                                + " ( "
                                + " announce_id INT NOT NULL "
                                + DBUtils.DB_SQL_IDENTITY
                                + ", "
                                + " user_id INT NOT NULL "
                                + " )";
                s.execute(sql);
                s.close();
                conn.commit();
            }
        } catch (SQLException se) {
            se.printStackTrace();
            System.err.println("SQL err: " + DBUtils.unchainSqlException(se));
            System.err.println("Last SQL run: " + sql);
            throw se;
        } finally {
            DBUtils.close(conn);
        }
    }
}
