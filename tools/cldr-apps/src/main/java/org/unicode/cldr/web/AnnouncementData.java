package org.unicode.cldr.web;

import java.sql.*;
import java.sql.Timestamp;
import java.util.List;
import org.unicode.cldr.util.LocaleNormalizer;
import org.unicode.cldr.util.LocaleSet;
import org.unicode.cldr.util.VoteResolver;
import org.unicode.cldr.web.api.Announcements;

public class AnnouncementData {
    private static final java.util.logging.Logger logger =
            SurveyLog.forClass(AnnouncementData.class);

    static boolean dbIsSetUp = false;

    static boolean DEBUG_FAKE_DATA = false;

    public static void get(
            UserRegistry.User user, List<Announcements.Announcement> announcementList) {
        makeSureDbSetup();
        if (DEBUG_FAKE_DATA) {
            String body1 =
                    "<p>This is a test including some html.<p>Paragraph.<p><i>Italic.</i> <b>Bold.</b> <a href='https://unicode.org'>Link to unicode.org</a>";
            String body2 = "This is a test \uD83D\uDC40 and it's generated on the back end";
            announcementList.add(
                    new Announcements.Announcement(
                            123, 2222, "2023-01-17 12:30:03.0", "Wow!", body1));
            Announcements.Announcement a =
                    new Announcements.Announcement(
                            456,
                            3333,
                            "2022-12-31 01:22:22.0",
                            "This is really so important",
                            body2);
            a.setChecked(true);
            announcementList.add(a);
            return;
        }
        AnnouncementFilter aFilter = new AnnouncementFilter(user);
        final String sql = "SELECT * FROM " + DBUtils.Table.ANNOUNCE + " ORDER BY last_time DESC";
        try {
            Connection conn = null;
            try {
                conn = CookieSession.sm.dbUtils.getAConnection();
                Object[][] o = DBUtils.sqlQueryArrayArrayObj(conn, sql);
                for (Object[] objects : o) {
                    Announcements.Announcement a = makeAnnouncementFromDbObject(objects);
                    if (aFilter.passes(a)) {
                        a.setChecked(getChecked(a.id, user.id));
                        announcementList.add(a);
                    }
                }
            } finally {
                DBUtils.close(conn);
            }
        } catch (SQLException se) {
            String complaint =
                    "Error getting announcments from database - " + DBUtils.unchainSqlException(se);
            logger.severe(complaint);
            throw new RuntimeException(complaint);
        }
    }

    private static Announcements.Announcement makeAnnouncementFromDbObject(Object[] objects) {
        int id = (Integer) objects[0];
        int poster = (Integer) objects[1];
        String subject = (String) objects[2];
        String body = (String) objects[3];
        Timestamp lastDate = (Timestamp) objects[4];
        String locales = (String) objects[5];
        Boolean orgsAll = (Boolean) objects[6];
        String audience = (String) objects[7];

        String date = lastDate.toString();
        // long date_long = lastDate.getTime();
        Announcements.Announcement a =
                new Announcements.Announcement(id, poster, date, subject, body);
        a.setFilters(locales, orgsAll, audience);
        return a;
    }

    public static void submit(
            Announcements.AnnouncementSubmissionRequest request,
            Announcements.AnnouncementSubmissionResponse response,
            UserRegistry.User user)
            throws SurveyException {
        makeSureDbSetup();
        try {
            int announcementId = savePostToDb(request, user);
            logger.fine("Saved announcement, id = " + announcementId);
            response.id = announcementId;
            response.ok = true;
        } catch (SurveyException e) {
            response.err = "An exception occured: " + e;
            logger.severe(e.getMessage());
        }
    }

    private static int savePostToDb(
            Announcements.AnnouncementSubmissionRequest request, UserRegistry.User user)
            throws SurveyException {
        int announcementId;
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
                announcementId = DBUtils.getLastId(pAdd);
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
        return announcementId;
    }

    private static PreparedStatement prepare_pAdd(Connection conn) throws SQLException {
        String sql =
                "INSERT INTO "
                        + DBUtils.Table.ANNOUNCE
                        + " (poster,subj,text,loc,orgsAll,audience)"
                        + " values (?,?,?,?,?,?)";
        return DBUtils.prepareStatement(conn, "pAddAnnouncement", sql);
    }

    private static boolean getChecked(int announcementId, int userId) {
        String table = DBUtils.Table.ANNOUNCE_READ.toString();
        String sql = "SELECT COUNT(*) FROM " + table + " WHERE announce_id=? AND user_id=?";

        Connection conn = null;
        PreparedStatement ps = null;
        int count;
        try {
            conn = DBUtils.getInstance().getAConnection();
            if (conn == null) {
                logger.severe("Connection failed in getChecked");
                return false;
            }
            ps = DBUtils.prepareForwardReadOnly(conn, sql);
            ps.setInt(1, announcementId);
            ps.setInt(2, userId);
            count = DBUtils.sqlCount(ps);
        } catch (SQLException e) {
            logger.severe("getChecked: " + e);
            return false;
        } finally {
            DBUtils.close(ps, conn);
        }
        return count >= 1;
    }

    /**
     * Update the ANNOUNCE_READ table to indicate whether the user has read a particular
     * announcement.
     *
     * <p>If id+user is present in the table, that means the user has read (checked) it -- absent
     * means the user has not read it
     *
     * @param announcementId the id for the announcement
     * @param checked true if the user has read the announcement
     * @param response the CheckReadResponse
     * @param user the current user (not necessarily the poster)
     */
    public static void checkRead(
            int announcementId,
            boolean checked,
            Announcements.CheckReadResponse response,
            UserRegistry.User user) {
        makeSureDbSetup();
        response.ok =
                checked
                        ? addCheckRow(announcementId, user.id)
                        : deleteCheckRow(announcementId, user.id);
        if (!response.ok) {
            response.err = "Failure to update database with checkmark; log has details";
        }
    }

    private static boolean addCheckRow(int announcementId, int userId) {
        String table = DBUtils.Table.ANNOUNCE_READ.toString();
        String sql = "INSERT INTO " + table + " VALUES (?,?)";

        Connection conn = null;
        PreparedStatement ps = null;
        try {
            conn = DBUtils.getInstance().getAConnection();
            if (conn == null) {
                logger.severe("Connection failed in addCheckRow");
                return false;
            }
            ps = DBUtils.prepareStatementWithArgs(conn, sql);
            ps.setInt(1, announcementId);
            ps.setInt(2, userId);
            int count = ps.executeUpdate();
            conn.commit();
            if (count < 1) {
                logger.severe("Update failed in addCheckRow");
                return false;
            }
        } catch (SQLException e) {
            logger.severe("addCheckRow: " + e);
            return false;
        } finally {
            DBUtils.close(ps, conn);
        }
        return true;
    }

    private static boolean deleteCheckRow(int announcementId, int userId) {
        String table = DBUtils.Table.ANNOUNCE_READ.toString();
        String sql = "DELETE FROM " + table + " WHERE announce_id=? AND user_id=?";

        Connection conn = null;
        PreparedStatement ps = null;
        try {
            conn = DBUtils.getInstance().getAConnection();
            if (conn == null) {
                logger.severe("Connection failed in deleteCheckRow");
                return false;
            }
            ps = DBUtils.prepareStatementWithArgs(conn, sql);
            ps.setInt(1, announcementId);
            ps.setInt(2, userId);
            int count = ps.executeUpdate();
            conn.commit();
            if (count < 1) {
                logger.severe("Delete failed in deleteCheckRow");
                return false;
            }
        } catch (SQLException e) {
            logger.severe("deleteCheckRow: " + e);
            return false;
        } finally {
            DBUtils.close(ps, conn);
        }
        return true;
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
        Connection conn = null;
        try {
            if (!DBUtils.hasTable(DBUtils.Table.ANNOUNCE.toString())) {
                conn = DBUtils.getInstance().getDBConnection();
                if (conn == null) {
                    logger.severe("Connection failed in setupDB");
                    return;
                }
                sql = createAnnounceTable(conn);
            }
            if (!DBUtils.hasTable(DBUtils.Table.ANNOUNCE_READ.toString())) {
                if (conn == null) {
                    conn = DBUtils.getInstance().getDBConnection();
                    if (conn == null) {
                        logger.severe("Connection failed in setupDB (2)");
                        return;
                    }
                }
                sql = createAnnounceReadTable(conn);
            }
        } catch (SQLException se) {
            se.printStackTrace();
            System.err.println("SQL err: " + DBUtils.unchainSqlException(se));
            System.err.println("Last SQL run: " + sql);
            throw se;
        } finally {
            if (conn != null) {
                DBUtils.close(conn);
            }
        }
    }

    private static String createAnnounceTable(Connection conn) throws SQLException {
        Statement s = conn.createStatement();
        String sql =
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
        s.close();
        conn.commit();
        return sql;
    }

    private static String createAnnounceReadTable(Connection conn) throws SQLException {
        Statement s = conn.createStatement();
        String sql =
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
        return sql;
    }

    private static class AnnouncementFilter {
        private final UserRegistry.User user;
        private final LocaleSet intLoc, authLoc;
        private final VoteResolver.Level userLevel;

        public AnnouncementFilter(UserRegistry.User user) {
            this.user = user;
            this.userLevel = user.getLevel();
            this.intLoc = user.getInterestLocales();
            this.authLoc = user.getAuthorizedLocaleSet();
        }

        public boolean passes(Announcements.Announcement a) {
            return matchOrg(a.orgsAll, a.poster)
                    && inAudience(a.audience)
                    && matchLocales(a.locales);
        }

        private boolean matchOrg(boolean orgsAll, int posterId) {
            if (orgsAll) {
                return true;
            }
            UserRegistry.User posterUser = CookieSession.sm.reg.getInfo(posterId);
            return posterUser != null && posterUser.isSameOrg(user);
        }

        private boolean matchLocales(String locales) {
            if (locales == null || locales.isEmpty()) {
                return true;
            }
            locales = LocaleNormalizer.normalizeQuietly(locales);
            LocaleSet set = LocaleNormalizer.setFromStringQuietly(locales, null);
            return set.intersectionNonEmpty(intLoc) || set.intersectionNonEmpty(authLoc);
        }

        private boolean inAudience(String audience) {
            if ("Everyone".equals(audience)) {
                return true;
            } else if ("Vetters".equals(audience)) {
                return userLevel.isVetter();
            } else if ("Managers".equals(audience)) {
                return userLevel.isManagerOrStronger();
            } else if ("TC".equals(audience)) {
                return userLevel.isTC();
            } else {
                logger.severe("Unrecognized audience description: " + audience);
                return false;
            }
        }
    }
}
