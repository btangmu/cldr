package org.unicode.cldr.web;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;

import org.unicode.cldr.util.VoteResolver;

/**
 * "Permanent" Voting. There are situations in which we’d like TC to have the ability to vote
 * for an item in such a way that its value will be “locked” forever (this release and subsequent),
 * until and unless countermanded by another TC vote.
 * Only certain voters (TC) are allowed to make "Permanent" votes.
 * If two voters make permanent votes for the same locale, path, and value, and there is
 * a forum entry by one of those voters, the locale+path becomes "locked".
 * If two voters make permanent votes to Abstain for the same locale and path, the locale+path becomes "unlocked".
 *
 * Reference: https://docs.google.com/document/d/1VsJ2y7dp2kq_Iu-zLTjOvCooX4kRfVPui6WO51aFGzE/edit?skip_itp2_check=true#heading=h.trc1g4nsvdb8 
 *
 * This class could be moved elsewhere. Currently it uses locale from its parent class PerLocaleData.
 *
 * TODO: IMPLEMENT THE ENFORCEMENT OF THE LOCK -- as it stands, the TC votes are not imported
 * into the next vetting session, so the item may no longer be winning even though it has an
 * entry in the table!
 * How to enforce? Basically, cldr_locked_xpaths needs to be part of vote resolution, and it
 * overrides any other votes...
 */
public class PermanentVote {
    String localeName;
    int xpathId;
    String value;

    /**
     * A voter has just made a "Permanent" vote for an item, or to abstain.
     *
     * @param localeName the locale name
     * @param xpathId the path id
     * @param value the value voted for, or null for Abstain
     */
    PermanentVote(String localeName, int xpathId, String value) {
        this.localeName = localeName;
        this.xpathId = xpathId;
        this.value = value;
        if (value == null) {
            if (isLocked() && gotTwo()) {
                unlock();
                cleanSlate();
            }
        } else {
            if (!isLocked() && gotTwo()) {
                lock();
                cleanSlate();
            }
        }
    }

    /**
     * Does a lock exist for this locale+path?
     *
     * @return true or false
     */
    private boolean isLocked() {
        String tableName = DBUtils.Table.LOCKED_XPATHS.toString();
        String sql = "SELECT COUNT(*) FROM " + tableName
            + " WHERE locale = '" + localeName + "'"
            + " AND xpath = " + xpathId;
        int count = DBUtils.sqlCount(sql);
        return count >= 1;
    }

    /**
     * Do at least two permanent votes exist for this locale+path+value?
     *
     * These are Abstain votes if value is null.
     *
     * @return true or false
     */
    private boolean gotTwo() {
        /*
         * Example:
         * SELECT COUNT(*) FROM cldr_vote_value_37 WHERE vote_override = 1000 AND locale = 'fr' AND xpath = 683828 AND value = 'signe de la main'
         */
        String tableName = DBUtils.Table.VOTE_VALUE.toString();
        String sql = "SELECT COUNT(*) FROM " + tableName
            + " WHERE vote_override = " + VoteResolver.VC.PERMANENT
            + " AND locale = '" + localeName + "'"
            + " AND xpath = " + xpathId
            + " AND value "
            + ((value == null) ? "is null" : "= '" + value + "'");
        int count = DBUtils.sqlCount(sql);
        return count >= 2;
    }

    /**
     * Add a "lock" to the locked_xpaths table for this locale+path
     */
    private void lock() {
        String tableName = DBUtils.Table.LOCKED_XPATHS.toString();
        Connection conn = null;
        PreparedStatement ps = null;
        String sql = "INSERT INTO " + tableName
            + "(locale,xpath,value,last_mod) VALUES(?,?,?,CURRENT_TIMESTAMP)";
        try {
            conn = DBUtils.getInstance().getDBConnection();
            ps = DBUtils.prepareForwardReadOnly(conn, sql);
            ps.setString(1, localeName);
            ps.setInt(2, xpathId);
            ps.setString(3, value);
            ps.executeUpdate();
            conn.commit();
        } catch (SQLException e) {
            SurveyLog.logException(e);
        } finally {
            DBUtils.close(ps, conn);
        }
    }

    /**
     * Remove a "lock" from the locked_xpaths table for this locale+path
     */
    private void unlock() {
        String tableName = DBUtils.Table.LOCKED_XPATHS.toString();
        Connection conn = null;
        PreparedStatement ps = null;
        String sql = "DELETE FROM " + tableName
            + " WHERE locale = '" + localeName + "'"
            + " AND xpath = " + xpathId;
        try {
            conn = DBUtils.getInstance().getDBConnection();
            ps = DBUtils.prepareForwardReadOnly(conn, sql);
            ps.setString(1, localeName);
            ps.setInt(2, xpathId);
            ps.executeUpdate();
            conn.commit();
        } catch (SQLException e) {
            SurveyLog.logException(e);
        } finally {
            DBUtils.close(ps, conn);
        }
    }

    /**
     * Clean slate for TC “permanent” votes when lock or unlock
     *
     * Remove all permanent votes for this locale+path 
     * 
     * @param xpathId
     */
    private void cleanSlate() {
        String tableName = DBUtils.Table.VOTE_VALUE.toString();
        Connection conn = null;
        PreparedStatement ps = null;
        String sql = "DELETE FROM " + tableName
            + " WHERE locale = " + localeName
            + " AND xpath = " + xpathId
            + " AND vote_override = " + VoteResolver.VC.PERMANENT;
        try {
            conn = DBUtils.getInstance().getDBConnection();
            ps = DBUtils.prepareForwardReadOnly(conn, sql);
            ps.setString(1, localeName);
            ps.setInt(2, xpathId);
            ps.executeUpdate();
            conn.commit();
        } catch (SQLException e) {
            SurveyLog.logException(e);
        } finally {
            DBUtils.close(ps, conn);
        }
    }
}


